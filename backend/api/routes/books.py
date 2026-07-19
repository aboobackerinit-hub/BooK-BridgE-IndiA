from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks
from backend.core.database import get_db
from firebase_admin import firestore
from backend.core.security import get_user_by_id, clean_user_dict
from backend.api.dependencies import get_current_user
from backend.models.schemas import BookIn, BookUpdateIn
from backend.services.cloudinary_service import upload_base64_image, upload_fastapi_file, delete_image
from backend.services.search_engine import search_books, generate_search_tokens, log_search

router = APIRouter(prefix="/books", tags=["books"])

@router.get("")
def list_books(
    q: Optional[str] = None, 
    category: Optional[str] = None,
    owner_id: Optional[str] = None, 
    listing_type: Optional[str] = None,
    condition: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    district: Optional[str] = None,
    state: Optional[str] = None,
    college_id: Optional[str] = None,
    sort_by: str = "latest",
    limit: int = 60,
    start_after: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    user_location = user.get("location") if user else None
    
    # If search query or advanced filters are provided, route to search service
    if q or listing_type or min_price or max_price or district or state or college_id or sort_by != "latest":
        results = search_books(
            query=q or "",
            category=category,
            owner_id=owner_id,
            listing_type=listing_type,
            condition=condition,
            min_price=min_price,
            max_price=max_price,
            district=district,
            state=state,
            college_id=college_id,
            delivery_options=None,
            sort_by=sort_by,
            limit=limit,
            start_after=start_after,
            user_location=user_location
        )
        # Log search analytics in background
        if q:
            filters = {"category": category, "district": district}
            log_search(user.get("id") if user else None, q, len(results), filters)
        return results
        
    db = get_db()
    
    # Simple list query (no advanced filters)
    try:
        query = db.collection("books")
        
        if not owner_id:
            query = query.where("approved", "==", True)
        if category and category != "All":
            query = query.where("category", "==", category)
        if owner_id:
            query = query.where("owner_id", "==", owner_id)
            
        # Order and pagination
        query = query.order_by("created_at", direction=firestore.Query.DESCENDING)
        
        if start_after:
            cursor_doc = db.collection("books").document(start_after).get()
            if cursor_doc.exists:
                query = query.start_after(cursor_doc)
                
        query = query.limit(limit)
        
        docs = query.stream()
        results = []
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            results.append(d)
            
        return results
    except Exception as e:
        import logging
        logging.getLogger("bookbridge.routes.books").warning(f"Simple query failed: {e}")
        return []

@router.get("/{book_id}")
def get_book(book_id: str):
    db = get_db()
    doc = db.collection("books").document(book_id).get()
    if not doc.exists:
        raise HTTPException(404, "Book not found")
        
    b = doc.to_dict()
    b["id"] = doc.id
    
    # Fetch owner details if not denormalized
    owner = get_user_by_id(b.get("owner_id"))
    b["owner"] = clean_user_dict(owner) if owner else None
    return b

@router.post("")
def create_book(body: BookIn, user: dict = Depends(get_current_user)):
    db = get_db()
    row = body.dict()
    
    # Handle base64 image upload (legacy fallback)
    if row.get("image_url") and row["image_url"].startswith("data:"):
        row["image_url"] = upload_base64_image(row["image_url"], folder="books")
    
    # Set owner details
    row["owner_id"] = user["id"]
    row["owner_role"] = user.get("role")
    row["owner_name"] = user.get("name")
    
    # New fields & defaults
    row["approved"] = True
    row["views_count"] = 0
    row["wishlist_count"] = 0
    row["created_at"] = firestore.SERVER_TIMESTAMP
    
    # Lowercase fields for prefix searching
    row["title_lower"] = row["title"].lower() if row.get("title") else ""
    row["author_lower"] = row["author"].lower() if row.get("author") else ""
    row["subject_lower"] = row["subject"].lower() if row.get("subject") else ""
    
    # Generate search tokens
    row["search_tokens"] = generate_search_tokens(row)
    
    # Add location object based on flat inputs
    loc_fields = ["location_lat", "location_lng", "location_district", "location_state", "location_college_id"]
    if any(row.get(f) for f in loc_fields):
        row["location"] = {
            "lat": row.pop("location_lat", None),
            "lng": row.pop("location_lng", None),
            "district": row.pop("location_district", None),
            "state": row.pop("location_state", None),
            "college_id": row.pop("location_college_id", None)
        }
    else:
        # Fallback to user location
        row["location"] = user.get("location", {})
        for f in loc_fields:
            row.pop(f, None)
    
    # Transaction batch
    batch = db.batch()
    new_book_ref = db.collection("books").document()
    batch.set(new_book_ref, row)
    
    # Update user's book count
    user_ref = db.collection("users").document(user["id"])
    batch.update(user_ref, {"books_count": firestore.Increment(1)})
    
    batch.commit()
    
    row["id"] = new_book_ref.id
    return row

@router.put("/{book_id}")
def update_book(book_id: str, body: BookUpdateIn, user: dict = Depends(get_current_user)):
    db = get_db()
    doc_ref = db.collection("books").document(book_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(404, "Book not found")
        
    b = doc.to_dict()
    if b.get("owner_id") != user["id"] and user.get("role") != "admin":
        raise HTTPException(403, "Not allowed")
        
    row = body.dict(exclude_unset=True)
    
    # Update lowercase fields if changed
    if "title" in row and row["title"]:
        row["title_lower"] = row["title"].lower()
    if "author" in row and row["author"]:
        row["author_lower"] = row["author"].lower()
    if "subject" in row and row["subject"]:
        row["subject_lower"] = row["subject"].lower()
        
    # Generate new search tokens with merged data
    merged_data = {**b, **row}
    row["search_tokens"] = generate_search_tokens(merged_data)
        
    doc_ref.update(row)
    
    updated = doc_ref.get().to_dict()
    updated["id"] = book_id
    return updated

@router.delete("/{book_id}")
def delete_book(book_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    doc_ref = db.collection("books").document(book_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(404, "Book not found")
        
    b = doc.to_dict()
    if b.get("owner_id") != user["id"] and user.get("role") != "admin":
        raise HTTPException(403, "Not allowed")
        
    # Optional: Delete image from Cloudinary
    if b.get("image_url"):
        try:
            delete_image(b["image_url"])
        except Exception:
            pass
        
    # Transactional delete
    batch = db.batch()
    batch.delete(doc_ref)
    
    user_ref = db.collection("users").document(b.get("owner_id"))
    batch.update(user_ref, {"books_count": firestore.Increment(-1)})
    
    batch.commit()
    return {"ok": True}

@router.post("/upload-image")
async def upload_book_image(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload a book image directly (multipart). Returns Cloudinary URL."""
    try:
        url = await upload_fastapi_file(file, folder="books")
        if not url:
            raise HTTPException(500, "Image upload failed")
        return {"url": url}
    except Exception as e:
        raise HTTPException(500, f"Upload error: {e}")

@router.post("/{book_id}/view")
def record_book_view(
    book_id: str, 
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """Record a book view for analytics and recommendations."""
    db = get_db()
    doc_ref = db.collection("books").document(book_id)
    
    try:
        doc_ref.update({"views_count": firestore.Increment(1)})
        
        # Track event for recommendations
        from backend.services.recommendation_engine import track_event
        background_tasks.add_task(
            track_event, user["id"], "view", book_id
        )
        return {"ok": True}
    except Exception:
        return {"ok": False}

