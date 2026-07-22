import uuid
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from backend.core.database import get_db
from firebase_admin import firestore
from backend.core.security import clean_user_dict
from backend.api.dependencies import get_current_user
from backend.models.schemas import PostIn, CommentIn
from backend.services.cloudinary_service import upload_base64_image, upload_fastapi_file

router = APIRouter(prefix="/posts", tags=["posts"])

@router.get("")
def list_posts(limit: int = 50, start_after: Optional[str] = None):
    db = get_db()
    query = db.collection("posts").order_by("created_at", direction=firestore.Query.DESCENDING)
    
    if start_after:
        cursor_doc = db.collection("posts").document(start_after).get()
        if cursor_doc.exists:
            query = query.start_after(cursor_doc)
            
    docs = query.limit(limit).stream()
    posts = []
    for doc in docs:
        p = doc.to_dict()
        p["id"] = doc.id
        posts.append(p)
        
    return posts

@router.post("")
def create_post(body: PostIn, user: dict = Depends(get_current_user)):
    db = get_db()
    
    image_url = ""
    if body.image_url and body.image_url.startswith("data:"):
        image_url = upload_base64_image(body.image_url, folder="posts")
    elif body.image_url:
        image_url = body.image_url
    
    row = {
        "user_id": user["id"],
        "text": body.text,
        "image_url": image_url,
        "book_id": body.book_id,
        "likes": [],
        "comments": [],
        "created_at": firestore.SERVER_TIMESTAMP,
        # Safe denormalization
        "author": {
            "id": user["id"],
            "name": user.get("name"),
            "role": user.get("role"),
            "avatar_url": user.get("avatar_url")
        }
    }
    
    new_ref = db.collection("posts").document()
    new_ref.set(row)
    
    row["id"] = new_ref.id
    return row

@router.post("/upload-image")
async def upload_post_image(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload a post image directly (multipart). Returns Cloudinary URL."""
    try:
        url = await upload_fastapi_file(file, folder="posts")
        if not url:
            raise HTTPException(500, "Image upload failed")
        return {"url": url}
    except Exception as e:
        raise HTTPException(500, f"Upload error: {e}")

@router.delete("/{post_id}")
def delete_post(post_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    doc_ref = db.collection("posts").document(post_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(404, "Not found")
    p = doc.to_dict()
    if p.get("user_id") != user["id"] and user.get("role") != "admin":
        raise HTTPException(403, "Not allowed")
    
    doc_ref.delete()
    return {"ok": True}

from backend.models.schemas import PostUpdateIn, ReportIn

@router.put("/{post_id}")
def update_post(post_id: str, body: PostUpdateIn, user: dict = Depends(get_current_user)):
    db = get_db()
    doc_ref = db.collection("posts").document(post_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(404, "Not found")
    p = doc.to_dict()
    if p.get("user_id") != user["id"] and user.get("role") != "admin":
        raise HTTPException(403, "Not allowed")
        
    doc_ref.update({
        "text": body.text,
        "image_url": body.image_url if body.image_url is not None else p.get("image_url")
    })
    return {"ok": True}

@router.put("/{post_id}/pin")
def pin_post(post_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") not in ["admin", "publisher", "store_owner"]:
        raise HTTPException(403, "Not allowed to pin posts")
        
    db = get_db()
    doc_ref = db.collection("posts").document(post_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(404, "Not found")
    p = doc.to_dict()
    if p.get("user_id") != user["id"] and user.get("role") != "admin":
        raise HTTPException(403, "Not allowed to pin others posts")
        
    is_pinned = p.get("pinned", False)
    doc_ref.update({"pinned": not is_pinned})
    return {"pinned": not is_pinned}

@router.post("/{post_id}/report")
def report_post(post_id: str, body: ReportIn, user: dict = Depends(get_current_user)):
    db = get_db()
    doc_ref = db.collection("posts").document(post_id)
    if not doc_ref.get().exists:
        raise HTTPException(404, "Not found")
        
    report_ref = db.collection("reports").document()
    report_ref.set({
        "post_id": post_id,
        "reporter_id": user["id"],
        "reason": body.reason,
        "description": body.description,
        "created_at": firestore.SERVER_TIMESTAMP,
        "status": "pending"
    })
    return {"ok": True}

@router.post("/{post_id}/like")
def like_post(post_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    doc_ref = db.collection("posts").document(post_id)
    
    # We can use a transaction or just get+update if we only want to toggle
    # But since we just want to toggle, we read first to see if liked
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(404, "Not found")
        
    p = doc.to_dict()
    likes = p.get("likes") or []
    
    if user["id"] in likes:
        doc_ref.update({"likes": firestore.ArrayRemove([user["id"]])})
        return {"liked": False}
        
    doc_ref.update({"likes": firestore.ArrayUnion([user["id"]])})
    return {"liked": True}

@router.post("/{post_id}/comment")
def comment_post(post_id: str, body: CommentIn, user: dict = Depends(get_current_user)):
    db = get_db()
    doc_ref = db.collection("posts").document(post_id)
    
    comment = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user.get("name"),
        "text": body.text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    doc_ref.update({"comments": firestore.ArrayUnion([comment])})
    return comment
