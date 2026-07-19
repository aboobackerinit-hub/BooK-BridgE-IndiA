from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from backend.core.database import get_db
from firebase_admin import firestore
from backend.core.security import get_user_by_id, clean_user_dict
from backend.api.dependencies import get_current_user
from backend.models.schemas import MessageIn, ChatImageIn, ChatBookShareIn, ReportIn

router = APIRouter(prefix="/chat", tags=["chat"])

def thread_id_of(a: str, b: str) -> str:
    return "::".join(sorted([a, b]))

@router.get("/threads")
def chat_threads(user: dict = Depends(get_current_user)):
    db = get_db()
    # Optimized NoSQL approach: Query the chat_threads collection
    docs = db.collection("chat_threads").where("participants", "array_contains", user["id"]).order_by("last_time", direction=firestore.Query.DESCENDING).stream()
    
    result = []
    archived = user.get("archived_threads", [])
    
    for doc in docs:
        if doc.id in archived:
            continue
            
        t = doc.to_dict()
        other_id = t["participants"][0] if t["participants"][1] == user["id"] else t["participants"][1]
        other = get_user_by_id(other_id)
        if other:
            result.append({
                "thread_id": doc.id,
                "other_user": clean_user_dict(other),
                "last_message": t.get("last_message", ""),
                "last_message_type": t.get("last_message_type", "text"),
                "last_time": t.get("last_time"),
                "unread_count": t.get(f"unread_{user['id']}", 0),
                "typing": t.get(f"typing_{other_id}", False)
            })
            
    return result

@router.get("/{other_user_id}")
def chat_messages(other_user_id: str, user: dict = Depends(get_current_user)):
    tid = thread_id_of(user["id"], other_user_id)
    db = get_db()
    docs = db.collection("messages").where("thread_id", "==", tid).order_by("created_at", direction=firestore.Query.ASCENDING).stream()
    
    return [d.to_dict() for d in docs]

@router.post("")
def send_message(body: MessageIn, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    return _send_internal(user, body.to_user_id, body.text, "text", background_tasks)

@router.post("/image")
def send_image(body: ChatImageIn, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    return _send_internal(user, body.to_user_id, body.image_url, "image", background_tasks)

@router.post("/book")
def send_book_share(body: ChatBookShareIn, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    # Fetch book to embed basic details
    db = get_db()
    book_doc = db.collection("books").document(body.book_id).get()
    if not book_doc.exists:
        raise HTTPException(404, "Book not found")
    book = book_doc.to_dict()
    
    text = f"Book: {book.get('title')} - {body.book_id}"
    return _send_internal(user, body.to_user_id, text, "book", background_tasks, metadata={"book_id": body.book_id, "title": book.get("title"), "price": book.get("price")})

def _send_internal(user: dict, to_user_id: str, text: str, msg_type: str, background_tasks: BackgroundTasks, metadata: dict = None):
    if not get_user_by_id(to_user_id):
        raise HTTPException(404, "Recipient not found")
        
    tid = thread_id_of(user["id"], to_user_id)
    db = get_db()
    
    row = {
        "thread_id": tid, 
        "from_user_id": user["id"], 
        "from_user_name": user.get("name"),
        "to_user_id": to_user_id, 
        "text": text, 
        "type": msg_type,
        "read": False,
        "created_at": firestore.SERVER_TIMESTAMP
    }
    if metadata:
        row["metadata"] = metadata
    
    batch = db.batch()
    new_msg_ref = db.collection("messages").document()
    batch.set(new_msg_ref, row)
    
    # Upsert the chat thread metadata
    thread_ref = db.collection("chat_threads").document(tid)
    thread_data = {
        "participants": [user["id"], to_user_id],
        "last_message": text if msg_type == "text" else f"Sent an {msg_type}",
        "last_message_type": msg_type,
        "last_time": firestore.SERVER_TIMESTAMP,
        f"unread_{to_user_id}": firestore.Increment(1),
        f"typing_{user['id']}": False # reset typing status on send
    }
    batch.set(thread_ref, thread_data, merge=True)
    
    # Unarchive for recipient if it was archived
    recipient_ref = db.collection("users").document(to_user_id)
    batch.update(recipient_ref, {"archived_threads": firestore.ArrayRemove([tid])})
    
    batch.commit()
    
    # Trigger notification
    try:
        from backend.services.notification_service import notify_chat_message
        background_tasks.add_task(notify_chat_message, to_user_id, user.get("name"), text if msg_type == "text" else f"Sent you a {msg_type}")
    except Exception:
        pass
    
    row["id"] = new_msg_ref.id
    return row

@router.post("/{other_user_id}/typing")
def set_typing(other_user_id: str, is_typing: bool, user: dict = Depends(get_current_user)):
    tid = thread_id_of(user["id"], other_user_id)
    db = get_db()
    
    # Update thread metadata
    thread_ref = db.collection("chat_threads").document(tid)
    thread_ref.set({f"typing_{user['id']}": is_typing}, merge=True)
    
    return {"ok": True}

@router.post("/{other_user_id}/read")
def mark_thread_read(other_user_id: str, user: dict = Depends(get_current_user)):
    tid = thread_id_of(user["id"], other_user_id)
    db = get_db()
    
    # Reset unread count on thread
    db.collection("chat_threads").document(tid).set({f"unread_{user['id']}": 0}, merge=True)
    
    # Fetch all unread messages to me in this thread
    unread_docs = db.collection("messages").where("thread_id", "==", tid).where("to_user_id", "==", user["id"]).where("read", "==", False).stream()
    
    batch = db.batch()
    count = 0
    for doc in unread_docs:
        batch.update(doc.reference, {"read": True})
        count += 1
        if count >= 490: # Batch limit is 500
            batch.commit()
            batch = db.batch()
            count = 0
            
    if count > 0:
        batch.commit()
        
    return {"ok": True}

@router.post("/{other_user_id}/archive")
def archive_thread(other_user_id: str, user: dict = Depends(get_current_user)):
    tid = thread_id_of(user["id"], other_user_id)
    db = get_db()
    
    user_ref = db.collection("users").document(user["id"])
    user_ref.update({"archived_threads": firestore.ArrayUnion([tid])})
    
    return {"ok": True}

@router.post("/{other_user_id}/report")
def report_user(other_user_id: str, body: ReportIn, user: dict = Depends(get_current_user)):
    db = get_db()
    
    report = {
        "reporter_id": user["id"],
        "reported_id": other_user_id,
        "reason": body.reason,
        "description": body.description,
        "status": "pending",
        "created_at": firestore.SERVER_TIMESTAMP
    }
    
    db.collection("reports").add(report)
    
    # Automatically block the reported user
    me_ref = db.collection("users").document(user["id"])
    me_ref.update({"blocked": firestore.ArrayUnion([other_user_id])})
    
    return {"ok": True, "blocked": True}
