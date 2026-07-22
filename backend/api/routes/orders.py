import random
import string
import logging
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from backend.core.database import get_db
from firebase_admin import firestore
from backend.core.security import get_user_by_id
from backend.api.dependencies import get_current_user, require_role
from backend.models.schemas import OrderIn, OrderStatusIn

router = APIRouter(prefix="/orders", tags=["orders"])
logger = logging.getLogger("bookbridge.routes.orders")

def _post_order_creation_tasks(order_id: str, seller_ids: list, user: dict, book_titles: list):
    """Background task to send notifications and award points."""
    try:
        from backend.services.notification_service import notify_order_status
        for seller_id in seller_ids:
            seller = get_user_by_id(seller_id)
            if seller:
                title_preview = ", ".join(book_titles[:2])
                notify_order_status(seller_id, seller.get("email"), order_id, "New", title_preview)
    except Exception as e:
        logger.warning(f"Order notification failed: {e}")
        
    try:
        from backend.services.gamification_service import add_points
        add_points(user["id"], "buy")
    except Exception as e:
        logger.warning(f"Gamification update failed: {e}")

def _post_status_update_tasks(order_id: str, status: str, buyer_id: str, seller_ids: list):
    """Background task for status changes."""
    try:
        from backend.services.notification_service import notify_order_status
        buyer = get_user_by_id(buyer_id)
        if buyer:
            notify_order_status(buyer_id, buyer.get("email"), order_id, status, "Your BookBridge order")
    except Exception as e:
        logger.warning(f"Status notification failed: {e}")
        
    if status in ("Delivered", "Completed"):
        try:
            from backend.services.trust_service import recalculate_trust
            from backend.services.gamification_service import add_points, check_and_award_badges
            for seller_id in seller_ids:
                recalculate_trust(seller_id)
                add_points(seller_id, "sell")
                check_and_award_badges(seller_id)
        except Exception as e:
            logger.warning(f"Trust/Gamification update failed: {e}")

from backend.api.routes.chat import _send_internal, thread_id_of

@router.post("/chat")
def create_chat_order(body: dict, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    book_id = body.get("book_id")
    if not book_id:
        raise HTTPException(400, "book_id required")
        
    db = get_db()
    book_doc = db.collection("books").document(book_id).get()
    
    if not book_doc.exists:
        raise HTTPException(404, "Book not found")
        
    b = book_doc.to_dict()
    
    if b.get("owner_role") != "user":
        raise HTTPException(400, "Online checkout required for store owners")
        
    if b.get("owner_id") == user["id"]:
        raise HTTPException(400, "Cannot buy your own book")
        
    tid = thread_id_of(user["id"], b.get("owner_id"))
    thread_doc = db.collection("chat_threads").document(tid).get()
    
    # If thread exists, do not create another chat order. Just return the thread_id.
    if thread_doc.exists:
        return {"thread_id": tid, "is_new": False}
        
    # Thread does not exist. Create Chat Order and send initial message.
    order_no = str(uuid.uuid4().int)[:8]
    
    order_data = {
        "order_no": order_no,
        "user_id": user["id"],
        "user_name": user.get("name"),
        "seller_ids": [b.get("owner_id")],
        "items": [{
            "book_id": book_doc.id,
            "title": b.get("title"),
            "price": b.get("price"),
            "quantity": 1,
            "seller_id": b.get("owner_id"),
            "image_url": b.get("image_url"),
            "author": b.get("author")
        }],
        "total": float(b.get("price", 0)),
        "status": "Chat Started",
        "is_chat_order": True,
        "created_at": firestore.SERVER_TIMESTAMP,
        "address": "Chat based delivery",
        "phone": user.get("phone", "")
    }
    
    new_order_ref = db.collection("orders").document()
    new_order_ref.set(order_data)
    
    # Trigger initial chat message
    text = f"I am interested in buying: {b.get('title')}"
    _send_internal(user, b.get("owner_id"), text, "book", background_tasks, metadata={"book_id": book_doc.id, "title": b.get("title"), "price": b.get("price")})
    
    # Send Notification to Seller
    try:
        from backend.services.notification_service import create_notification
        create_notification(
            user_id=b.get("owner_id"),
            notif_type="chat_order",
            title="New Chat Order",
            body=f"{user.get('name')} wants to buy {b.get('title')}",
            action_url="/orders"
        )
        
        # Send email if exists
        from backend.core.security import get_user_by_id
        seller = get_user_by_id(b.get("owner_id"))
        if seller and seller.get("email"):
            from backend.services.email import send_email
            background_tasks.add_task(
                send_email,
                seller.get("email"),
                "New Order Interest on BookBridge",
                f"Hello,\n\n{user.get('name')} is interested in buying your book '{b.get('title')}'. Check your app to respond!\n\nBookBridge Team"
            )
    except Exception as e:
        logger.error(f"Failed to notify seller: {e}")
        
    return {"thread_id": tid, "is_new": True, "order_id": new_order_ref.id}

@router.post("")
def place_order(body: OrderIn, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    db = get_db()
    
    # 1. Fetch Cart
    cart_docs = db.collection("cart").where("user_id", "==", user["id"]).stream()
    cart_items = [c.to_dict() for c in cart_docs]
    if not cart_items:
        raise HTTPException(400, "Cart is empty")
        
    order_items = []
    total = 0.0
    seller_ids = set()
    book_titles = []
    
    # We will use a transaction to safely deduct stock
    transaction = db.transaction()

    @firestore.transactional
    def create_order_in_transaction(transaction, cart_items):
        nonlocal order_items, total, seller_ids, book_titles
        
        order_items.clear()
        total = 0.0
        seller_ids.clear()
        book_titles.clear()
        
        books_to_update = []
        
        for c in cart_items:
            book_ref = db.collection("books").document(c["book_id"])
            book_snapshot = book_ref.get(transaction=transaction)
            
            if not book_snapshot.exists:
                continue
                
            b = book_snapshot.to_dict()
            if b.get("stock", 0) < c["quantity"]:
                raise HTTPException(400, f"Not enough stock for book: {b.get('title')}")
                
            order_items.append({
                "book_id": book_snapshot.id, 
                "title": b.get("title"), 
                "author": b.get("author"),
                "image_url": b.get("image_url") or "", 
                "price": float(b.get("price")),
                "quantity": c["quantity"], 
                "seller_id": b.get("owner_id"),
            })
            total += float(b.get("price")) * c["quantity"]
            seller_ids.add(b.get("owner_id"))
            book_titles.append(b.get("title"))
            
            # Queue the stock decrement
            books_to_update.append((book_ref, b.get("stock", 0) - c["quantity"]))
            
        # Apply stock updates
        for book_ref, new_stock in books_to_update:
            transaction.update(book_ref, {"stock": new_stock})
            
        order_no = "BB" + "".join(random.choices(string.digits, k=8))
        order_row = {
            "order_no": order_no, 
            "user_id": user["id"], 
            "user_name": user.get("name"),
            "items": order_items, 
            "seller_ids": list(seller_ids), 
            "address": body.address, 
            "phone": body.phone,
            "payment_method": body.payment_method, 
            "delivery_method": body.delivery_method,
            "delivery_notes": body.delivery_notes,
            "total": total, 
            "status": "New",
            "created_at": firestore.SERVER_TIMESTAMP
        }
        
        new_order_ref = db.collection("orders").document()
        transaction.set(new_order_ref, order_row)
        
        return order_row, new_order_ref.id

    try:
        order_row, order_id = create_order_in_transaction(transaction, cart_items)
    except Exception as e:
        logger.error(f"Transaction failed: {e}")
        raise HTTPException(400, str(e))
        
    # Delete cart items after successful transaction
    batch = db.batch()
    cart_refs = db.collection("cart").where("user_id", "==", user["id"]).stream()
    for c in cart_refs:
        batch.delete(c.reference)
    batch.commit()
    
    background_tasks.add_task(_post_order_creation_tasks, order_id, list(seller_ids), user, book_titles)
    
    order_row["id"] = order_id
    order_row.pop("created_at", None)
    return order_row

@router.get("")
def my_orders(user: dict = Depends(get_current_user)):
    db = get_db()
    docs = db.collection("orders").where("user_id", "==", user["id"]).order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    results = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        results.append(d)
    return results

@router.get("/seller")
def seller_orders(user: dict = Depends(get_current_user)):
    db = get_db()
    # Using the denormalized array for Firestore
    docs = db.collection("orders").where("seller_ids", "array_contains", user["id"]).order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    results = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        results.append(d)
    return results

@router.get("/all")
def all_orders(user: dict = Depends(require_role("admin"))):
    db = get_db()
    docs = db.collection("orders").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    results = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        results.append(d)
    return results

@router.put("/{order_id}/status")
def update_status(order_id: str, body: OrderStatusIn, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    db = get_db()
    doc_ref = db.collection("orders").document(order_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(404, "Order not found")
        
    o = doc.to_dict()
    is_seller = any(it.get("seller_id") == user["id"] for it in (o.get("items") or []))
    is_buyer = o.get("user_id") == user["id"]
    is_admin = user.get("role") == "admin"
    
    if not (is_seller or is_admin or (is_buyer and body.status == "Completed")):
        raise HTTPException(403, "Not allowed")
        
    if body.status in ["Cancelled", "Refunded"] and o.get("status") not in ["Cancelled", "Refunded"]:
        # Restore stock using a transaction
        transaction = db.transaction()
        
        @firestore.transactional
        def restore_stock_in_transaction(transaction, items):
            for item in items:
                book_ref = db.collection("books").document(item["book_id"])
                transaction.update(book_ref, {"stock": firestore.Increment(item["quantity"])})
                
        try:
            restore_stock_in_transaction(transaction, o.get("items", []))
        except Exception as e:
            logger.error(f"Failed to restore stock for order {order_id}: {e}")
            raise HTTPException(500, "Failed to restore stock")
            
    if o.get("is_chat_order") and body.status == "Sold" and o.get("status") != "Sold":
        transaction = db.transaction()
        
        @firestore.transactional
        def deduct_stock_in_transaction(transaction, items):
            for item in items:
                book_ref = db.collection("books").document(item["book_id"])
                b_doc = book_ref.get(transaction=transaction)
                if b_doc.exists:
                    new_stock = max(0, b_doc.to_dict().get("stock", 0) - item.get("quantity", 1))
                    transaction.update(book_ref, {"stock": new_stock})
                    
        try:
            deduct_stock_in_transaction(transaction, o.get("items", []))
        except Exception as e:
            logger.error(f"Failed to deduct stock for order {order_id}: {e}")
            raise HTTPException(500, "Failed to deduct stock")
            
    doc_ref.update({"status": body.status})
    
    background_tasks.add_task(_post_status_update_tasks, order_id, body.status, o.get("user_id"), o.get("seller_ids", []))
    
    return {"ok": True, "status": body.status}
