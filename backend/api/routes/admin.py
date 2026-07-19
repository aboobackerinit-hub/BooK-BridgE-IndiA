from fastapi import APIRouter, HTTPException, Depends
from backend.core.database import get_db
from firebase_admin import firestore
from backend.core.security import get_user_by_id, clean_user_dict
from backend.api.dependencies import require_role
from backend.models.schemas import UserUpdateIn, BookUpdateIn, AdminAnnouncementIn

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats")
def admin_stats(user: dict = Depends(require_role("admin"))):
    db = get_db()
    
    # Firestore aggregations
    # Note: If these counts become too large, this should be tracked manually via background triggers
    total_users_res = db.collection("users").count().get()
    total_users = total_users_res[0][0].value if total_users_res else 0
    
    total_books_res = db.collection("books").count().get()
    total_books = total_books_res[0][0].value if total_books_res else 0
    
    total_orders_res = db.collection("orders").count().get()
    total_orders = total_orders_res[0][0].value if total_orders_res else 0
    
    stores_res = db.collection("users").where("role", "==", "store_owner").count().get()
    stores = stores_res[0][0].value if stores_res else 0
    
    pubs_res = db.collection("users").where("role", "==", "publisher").count().get()
    publishers = pubs_res[0][0].value if pubs_res else 0
    
    total_reviews_res = db.collection("reviews").count().get()
    total_reviews = total_reviews_res[0][0].value if total_reviews_res else 0
    
    total_reports_res = db.collection("reports").where("status", "==", "pending").count().get()
    pending_reports = total_reports_res[0][0].value if total_reports_res else 0
    
    # Calculate revenue (for large datasets, this must be cached/aggregated!)
    # We fetch all orders here to sum it up - fine for MVP, bad for scale.
    orders = db.collection("orders").stream()
    revenue = sum(float(o.to_dict().get("total") or 0) for o in orders)
    
    return {
        "total_users": total_users, 
        "total_books": total_books,
        "total_orders": total_orders, 
        "revenue": revenue,
        "stores": stores, 
        "publishers": publishers,
        "total_reviews": total_reviews,
        "pending_reports": pending_reports
    }

@router.get("/users")
def admin_users(user: dict = Depends(require_role("admin"))):
    db = get_db()
    docs = db.collection("users").stream()
    results = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        results.append(clean_user_dict(d))
    return results

@router.put("/users/{user_id}")
def update_user(user_id: str, body: UserUpdateIn, user: dict = Depends(require_role("admin"))):
    updates = {}
    if body.name is not None:
        updates["name"] = body.name
        updates["name_lower"] = body.name.lower()
    if body.role is not None:
        updates["role"] = body.role
        
    if not updates:
        return {"ok": True}
        
    db = get_db()
    db.collection("users").document(user_id).update(updates)
    
    doc = db.collection("users").document(user_id).get()
    d = doc.to_dict()
    d["id"] = doc.id
    return d

@router.put("/users/{user_id}/suspend")
def admin_suspend(user_id: str, user: dict = Depends(require_role("admin"))):
    u = get_user_by_id(user_id)
    if not u:
        raise HTTPException(404, "Not found")
        
    db = get_db()
    db.collection("users").document(user_id).update({"suspended": not u.get("suspended", False)})
    return {"ok": True}

@router.delete("/users/{user_id}")
def admin_delete_user(user_id: str, user: dict = Depends(require_role("admin"))):
    db = get_db()
    db.collection("users").document(user_id).delete()
    # Ideally should delete from Auth too
    return {"ok": True}

@router.put("/books/{book_id}")
def update_book(book_id: str, body: BookUpdateIn, user: dict = Depends(require_role("admin"))):
    updates = {k: v for k, v in body.dict(exclude_unset=True).items() if v is not None}
    
    if "title" in updates: 
        updates["title_lower"] = updates["title"].lower()
    if "author" in updates: 
        updates["author_lower"] = updates["author"].lower()
    if "subject" in updates: 
        updates["subject_lower"] = updates["subject"].lower()
    
    if not updates: 
        return {"ok": True}
    
    db = get_db()
    # Search tokens are not updated here for simplicity, but in a real app, they should be regenerated
    db.collection("books").document(book_id).update(updates)
    
    doc = db.collection("books").document(book_id).get()
    d = doc.to_dict()
    d["id"] = doc.id
    return d

@router.put("/books/{book_id}/feature")
def admin_feature(book_id: str, user: dict = Depends(require_role("admin"))):
    db = get_db()
    doc_ref = db.collection("books").document(book_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(404, "Not found")
    b = doc.to_dict()
    doc_ref.update({"featured": not b.get("featured", False)})
    return {"ok": True}

@router.get("/books")
def admin_books(user: dict = Depends(require_role("admin"))):
    db = get_db()
    docs = db.collection("books").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    results = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        results.append(d)
    return results

@router.delete("/books/{book_id}")
def admin_delete_book(book_id: str, user: dict = Depends(require_role("admin"))):
    db = get_db()
    db.collection("books").document(book_id).delete()
    return {"ok": True}

@router.delete("/orders/{order_id}")
def admin_delete_order(order_id: str, user: dict = Depends(require_role("admin"))):
    db = get_db()
    db.collection("orders").document(order_id).delete()
    return {"ok": True}

@router.post("/announcement")
def create_announcement(body: AdminAnnouncementIn, user: dict = Depends(require_role("admin"))):
    """Create a platform-wide announcement."""
    db = get_db()
    
    announcement = {
        "title": body.title,
        "body": body.body,
        "created_at": firestore.SERVER_TIMESTAMP,
        "author_id": user["id"],
        "author_name": user.get("name")
    }
    
    # Broadcast to all users (in reality, we'd add it to a central 'announcements' collection 
    # and users fetch it, rather than writing a notification to every user)
    ref = db.collection("announcements").document()
    ref.set(announcement)
    
    return {"ok": True, "id": ref.id}
