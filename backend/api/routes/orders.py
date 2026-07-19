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
    if not is_seller and user.get("role") != "admin":
        raise HTTPException(403, "Not allowed")
        
    doc_ref.update({"status": body.status})
    
    background_tasks.add_task(_post_status_update_tasks, order_id, body.status, o.get("user_id"), o.get("seller_ids", []))
    
    return {"ok": True, "status": body.status}
