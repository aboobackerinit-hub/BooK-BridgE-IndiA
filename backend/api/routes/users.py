from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from backend.core.database import get_db
from firebase_admin import firestore
from backend.core.security import get_user_by_id, clean_user_dict
from backend.api.dependencies import get_current_user
from backend.models.schemas import ProfileUpdate, EmailPrefsIn
from backend.services.cloudinary_service import upload_base64_image, upload_fastapi_file

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/{user_id}")
def get_user(user_id: str):
    u = get_user_by_id(user_id)
    if not u:
        raise HTTPException(404, "User not found")
    u = clean_user_dict(u)
    return u

@router.get("")
def list_users(q: Optional[str] = None, role: Optional[str] = None):
    db = get_db()
    query = db.collection("users")
    
    if role:
        query = query.where("role", "==", role)
        
    # Simple prefix matching for name (fallback since no full text search)
    if q:
        q_lower = q.lower()
        query = query.where("name_lower", ">=", q_lower).where("name_lower", "<=", q_lower + '\uf8ff')
        
    docs = query.limit(50).stream()
    results = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        u = clean_user_dict(d)
        results.append(u)
        
    return results

@router.put("/me")
def update_me(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in body.dict(exclude_unset=True).items() if v is not None}
    
    if update.get("avatar_url") and update["avatar_url"].startswith("data:"):
        update["avatar_url"] = upload_base64_image(update["avatar_url"], folder="avatars")
        
    if update.get("name"):
        update["name_lower"] = update["name"].lower()
        
    if update:
        db = get_db()
        db.collection("users").document(user["id"]).update(update)
        
    updated = get_user_by_id(user["id"])
    updated = clean_user_dict(updated)
    return updated

@router.post("/me/avatar")
async def upload_avatar(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload an avatar image directly (multipart). Returns updated user."""
    try:
        url = await upload_fastapi_file(file, folder="avatars")
        if not url:
            raise HTTPException(500, "Image upload failed")
            
        db = get_db()
        db.collection("users").document(user["id"]).update({"avatar_url": url})
        
        updated = get_user_by_id(user["id"])
        return clean_user_dict(updated)
    except Exception as e:
        raise HTTPException(500, f"Upload error: {e}")

@router.post("/{user_id}/follow")
def toggle_follow(user_id: str, user: dict = Depends(get_current_user)):
    if user_id == user["id"]:
        raise HTTPException(400, "Cannot follow yourself")
        
    target = get_user_by_id(user_id)
    if not target:
        raise HTTPException(404, "User not found")
    
    me_full = get_user_by_id(user["id"])
    following = me_full.get("following") or []
    
    db = get_db()
    batch = db.batch()
    me_ref = db.collection("users").document(user["id"])
    target_ref = db.collection("users").document(user_id)
    
    if user_id in following:
        batch.update(me_ref, {"following": firestore.ArrayRemove([user_id])})
        batch.update(target_ref, {"followers": firestore.ArrayRemove([user["id"]])})
        batch.commit()
        return {"following": False}
    else:
        batch.update(me_ref, {"following": firestore.ArrayUnion([user_id])})
        batch.update(target_ref, {"followers": firestore.ArrayUnion([user["id"]])})
        batch.commit()
        return {"following": True}

@router.post("/{user_id}/block")
def toggle_block(user_id: str, user: dict = Depends(get_current_user)):
    if user_id == user["id"]:
        raise HTTPException(400, "Cannot block yourself")
    if not get_user_by_id(user_id):
        raise HTTPException(404, "User not found")
        
    me_full = get_user_by_id(user["id"])
    blocked = me_full.get("blocked") or []
    
    db = get_db()
    me_ref = db.collection("users").document(user["id"])
    
    if user_id in blocked:
        me_ref.update({"blocked": firestore.ArrayRemove([user_id])})
        return {"blocked": False}
        
    me_ref.update({"blocked": firestore.ArrayUnion([user_id])})
    return {"blocked": True}

@router.get("/me/blocked")
def list_blocked(user: dict = Depends(get_current_user)):
    ids = user.get("blocked") or []
    if not ids:
        return []
        
    db = get_db()
    results = []
    for i in range(0, len(ids), 10):
        chunk = ids[i:i+10]
        docs = db.collection("users").where(firestore.FieldPath.document_id(), "in", chunk).stream()
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            u = clean_user_dict(d)
            results.append(u)
            
    return results

@router.put("/me/email-prefs")
def update_email_prefs(body: EmailPrefsIn, user: dict = Depends(get_current_user)):
    full = get_user_by_id(user["id"])
    prefs = full.get("email_prefs") or {}
    for k, v in body.dict(exclude_unset=True).items():
        if v is not None:
            prefs[k] = v
            
    db = get_db()
    db.collection("users").document(user["id"]).update({"email_prefs": prefs})
    
    updated = get_user_by_id(user["id"])
    return clean_user_dict(updated)

@router.get("/{user_id}/trust")
def get_user_trust(user_id: str):
    """Get the trust profile for a user."""
    from backend.services.trust_service import get_trust_profile
    return get_trust_profile(user_id)

@router.get("/{user_id}/badges")
def get_user_badges(user_id: str):
    """Get the gamification badges and level for a user."""
    from backend.services.gamification_service import get_user_progress
    progress = get_user_progress(user_id)
    return {
        "level": progress.get("level"),
        "badges": progress.get("badges"),
    }

