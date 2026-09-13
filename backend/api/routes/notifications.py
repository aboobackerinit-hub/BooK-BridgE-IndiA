from fastapi import APIRouter, Depends, HTTPException
from backend.core.database import get_db
from firebase_admin import firestore
from backend.api.dependencies import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("")
def get_notifications(user: dict = Depends(get_current_user)):
    db = get_db()
    
    # 1. Unread chat messages in message threads
    count_res = db.collection("messages").where("to_user_id", "==", user["id"]).where("read", "==", False).count().get()
    unread_messages = count_res[0][0].value if count_res else 0
    
    # 2. In-app notifications
    notif_docs = db.collection("notifications").where("user_id", "==", user["id"]).order_by("created_at", direction=firestore.Query.DESCENDING).limit(50).stream()
    
    notifications_list = []
    unread_general = 0
    for doc in notif_docs:
        d = doc.to_dict()
        d["id"] = doc.id
        
        # Serialize timestamp cleanly
        cat = d.get("created_at")
        if hasattr(cat, "isoformat"):
            d["created_at"] = cat.isoformat()
        elif hasattr(cat, "timestamp"):
            d["created_at"] = str(cat)
        elif not cat:
            d["created_at"] = ""
            
        notifications_list.append(d)
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
        "notifications": notifications_list
    }

@router.post("/{notification_id}/read")
def mark_read(notification_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    doc_ref = db.collection("notifications").document(notification_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(404, "Notification not found")
        
    if doc.to_dict().get("user_id") != user["id"]:
        raise HTTPException(403, "Not allowed to modify another user's notification")
        
    doc_ref.update({
        "read": True,
        "read_at": firestore.SERVER_TIMESTAMP
    })
    return {"ok": True}

@router.post("/chat/{sender_id}/read")
def mark_chat_notifications_read(sender_id: str, user: dict = Depends(get_current_user)):
    """Mark all unread in-app notifications from sender_id as read when user views conversation."""
    db = get_db()
    
    # Query unread notifications for recipient from this sender/conversation
    docs = db.collection("notifications") \
        .where("user_id", "==", user["id"]) \
        .where("read", "==", False) \
        .stream()
    
    batch = db.batch()
    count = 0
    for doc in docs:
        d = doc.to_dict()
        notif_sender = d.get("sender_id") or d.get("conversation_id") or d.get("data", {}).get("sender_id")
        if notif_sender == sender_id:
            batch.update(doc.reference, {"read": True, "read_at": firestore.SERVER_TIMESTAMP})
            count += 1
            if count >= 490:
                batch.commit()
                batch = db.batch()
                count = 0
                
    if count > 0:
        batch.commit()
        
    return {"ok": True, "updated": count}

@router.post("/read-all")
def mark_all_read(user: dict = Depends(get_current_user)):
    db = get_db()
    docs = db.collection("notifications").where("user_id", "==", user["id"]).where("read", "==", False).stream()
    
    batch = db.batch()
    count = 0
    for doc in docs:
        batch.update(doc.reference, {"read": True, "read_at": firestore.SERVER_TIMESTAMP})
        count += 1
        if count >= 490:
            batch.commit()
            batch = db.batch()
            count = 0
            
    if count > 0:
        batch.commit()
        
    return {"ok": True, "updated": count}

@router.post("/register-token")
def register_notification_token(body: dict, user: dict = Depends(get_current_user)):
    token = body.get("token")
    user_agent = body.get("user_agent", "unknown")
    if not token or len(token) < 10:
        raise HTTPException(400, "Valid FCM token is required")
        
    db = get_db()
    token_ref = db.collection("users").document(user["id"]).collection("notification_tokens").document(token)
    
    token_data = {
        "token": token,
        "user_id": user["id"],
        "user_agent": user_agent[:200],
        "updated_at": firestore.SERVER_TIMESTAMP
    }
    
    if not token_ref.get().exists:
        token_data["created_at"] = firestore.SERVER_TIMESTAMP
        
    token_ref.set(token_data, merge=True)
    return {"ok": True}

@router.post("/unregister-token")
def unregister_notification_token(body: dict, user: dict = Depends(get_current_user)):
    token = body.get("token")
    if not token:
        raise HTTPException(400, "Token is required")
        
    db = get_db()
    token_ref = db.collection("users").document(user["id"]).collection("notification_tokens").document(token)
    token_ref.delete()
    return {"ok": True}

