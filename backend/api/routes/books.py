from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from backend.core.database import get_db
from firebase_admin import firestore
from backend.core.security import get_user_by_id, clean_user_dict
from backend.api.dependencies import get_current_user
from backend.models.schemas import BookIn
from backend.services.cloudinary_service import upload_base64_image
from backend.services.search_engine import search_books

router = APIRouter(prefix="/books", tags=["books"])

@router.get("")
def list_books(
    q: Optional[str] = None, 
    category: Optional[str] = None,
    owner_id: Optional[str] = None, 
    featured: Optional[bool] = None,
    limit: int = 60,
    start_after: Optional[str] = None
):
    db = get_db()
    
    # If search query is provided, route to search service
    if q:
        return search_books(q, category=category, owner_id=owner_id, limit=limit, start_after=start_after)
        
    query = db.collection("books")
    
    if not owner_id:
        query = query.where("approved", "==", True)
    if category and category != "All":
        query = query.where("category", "==", category)
    if owner_id:
        query = query.where("owner_id", "==", owner_id)
    if featured is not None:
        query = query.where("featured", "==", featured)
        
    # Order and pagination
    query = query.order_by("created_at", direction=firestore.Query.DESCENDING)
    
    if start_after:
        # Fetch the cursor document
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
    
    # Handle image upload
    row["image_url"] = upload_base64_image(row.get("image_url") or "", folder="books")
    
    row["owner_id"] = user["id"]
    row["owner_role"] = user.get("role")
    
    # Safe denormalization
    row["owner_name"] = user.get("name")
    
    row["approved"] = True
    row["created_at"] = firestore.SERVER_TIMESTAMP
    
    # Transaction batch
    batch = db.batch()
    new_book_ref = db.collection("books").document()
    batch.set(new_book_ref, row)
    
    # Example of denormalized update
    user_ref = db.collection("users").document(user["id"])
    batch.update(user_ref, {"books_count": firestore.Increment(1)})
    
    batch.commit()
    
    row["id"] = new_book_ref.id
    row.pop("created_at", None)
    return row

@router.put("/{book_id}")
def update_book(book_id: str, body: BookIn, user: dict = Depends(get_current_user)):
    db = get_db()
    doc_ref = db.collection("books").document(book_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(404, "Book not found")
        
    b = doc.to_dict()
    if b.get("owner_id") != user["id"] and user.get("role") != "admin":
        raise HTTPException(403, "Not allowed")
        
    row = body.dict()
    # Only upload if it's a data url
    if row.get("image_url") and row["image_url"].startswith("data:"):
        row["image_url"] = upload_base64_image(row["image_url"], folder="books")
        
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
        
    # Transactional delete
    batch = db.batch()
    batch.delete(doc_ref)
    
    user_ref = db.collection("users").document(b.get("owner_id"))
    batch.update(user_ref, {"books_count": firestore.Increment(-1)})
    
    batch.commit()
    
    return {"ok": True}
