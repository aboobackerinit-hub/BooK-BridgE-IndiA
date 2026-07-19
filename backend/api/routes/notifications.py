from fastapi import APIRouter, Depends, HTTPException
from backend.core.database import get_db
from firebase_admin import firestore
from backend.api.dependencies import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("")
def get_notifications(user: dict = Depends(get_current_user)):
    db = get_db()
    
    # 1. Unread chat messages
    count_res = db.collection("messages").where("to_user_id", "==", user["id"]).where("read", "==", False).count().get()
    unread_messages = count_res[0][0].value if count_res else 0
    
    # 2. General notifications
    notif_docs = db.collection("notifications").where("user_id", "==", user["id"]).order_by("created_at", direction=firestore.Query.DESCENDING).limit(50).stream()
    
    general = []
    unread_general = 0
    for doc in notif_docs:
        d = doc.to_dict()
        d["id"] = doc.id
        general.append(d)
        if not d.get("read"):
            unread_general += 1
            
    # 3. Pending orders (if seller)
    pending_orders = 0
    if user.get("role") in ("store_owner", "publisher", "admin") or user.get("books_count", 0) > 0:
        order_docs = db.collection("orders").where("seller_ids", "array_contains", user["id"]).stream()
        for odoc in order_docs:
            o = odoc.to_dict()
            if o.get("status") in ("New", "Processing"):
                pending_orders += 1
                
    return {
        "unread_messages": unread_messages,
        "unread_general": unread_general,
        "pending_orders": pending_orders,
        "notifications": general
    }

@router.post("/{notification_id}/read")
def mark_read(notification_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    doc_ref = db.collection("notifications").document(notification_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(404, "Notification not found")
        
    if doc.to_dict().get("user_id") != user["id"]:
        raise HTTPException(403, "Not allowed")
        
    doc_ref.update({"read": True})
    return {"ok": True}

@router.post("/read-all")
def mark_all_read(user: dict = Depends(get_current_user)):
    db = get_db()
    docs = db.collection("notifications").where("user_id", "==", user["id"]).where("read", "==", False).stream()
    
    batch = db.batch()
    count = 0
    for doc in docs:
        batch.update(doc.reference, {"read": True})
        count += 1
        if count >= 490:
            batch.commit()
            batch = db.batch()
            count = 0
            
    if count > 0:
        batch.commit()
        
    return {"ok": True, "updated": count}
