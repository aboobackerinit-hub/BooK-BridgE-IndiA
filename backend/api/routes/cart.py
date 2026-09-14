from fastapi import APIRouter, HTTPException, Depends
from backend.core.database import get_db
from firebase_admin import firestore
from backend.api.dependencies import get_current_user
from backend.models.schemas import CartItemIn

router = APIRouter(prefix="/cart", tags=["cart"])

@router.get("")
def get_cart(user: dict = Depends(get_current_user)):
    db = get_db()
    docs = db.collection("cart").where("user_id", "==", user["id"]).stream()
    items = []
    
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        items.append(d)
        
    book_ids = [i["book_id"] for i in items]
    books_map = {}
    
    for bid in set(book_ids):
        bdoc = db.collection("books").document(bid).get()
        if bdoc.exists:
            b = bdoc.to_dict()
            b["id"] = bdoc.id
            books_map[b["id"]] = b
                
    for i in items:
        i["book"] = books_map.get(i["book_id"])
        
    total = sum((float(i["book"]["price"]) * i["quantity"]) for i in items if i.get("book"))
    return {"items": items, "total": total}

@router.post("")
def add_cart(body: CartItemIn, user: dict = Depends(get_current_user)):
    db = get_db()
    
    book_doc = db.collection("books").document(body.book_id).get()
    if not book_doc.exists:
        raise HTTPException(404, "Book not found")
        
    b = book_doc.to_dict()
    owner_id = b.get("owner_id") or b.get("user_id")
    if owner_id == user["id"]:
        raise HTTPException(400, "You cannot add your own book to cart")

    current_stock = b.get("stock", 0)
    if current_stock <= 0:
        raise HTTPException(400, f"Book '{b.get('title')}' is currently out of stock")

    docs = db.collection("cart").where("user_id", "==", user["id"]).where("book_id", "==", body.book_id).limit(1).stream()
    existing = list(docs)
    
    if existing:
        doc = existing[0]
        existing_qty = doc.to_dict().get("quantity", 1)
        if body.mode == "add":
            new_qty = existing_qty + body.quantity
            if new_qty > current_stock:
                raise HTTPException(400, f"Only {current_stock} copy(ies) available in stock")
            db.collection("cart").document(doc.id).update({"quantity": new_qty})
            return {"ok": True, "already_in_cart": True, "quantity": new_qty}
        else:
            # Default for Buy/Add to Cart button: Do NOT silently increment quantity!
            return {"ok": True, "already_in_cart": True, "quantity": existing_qty}
    else:
        initial_qty = min(body.quantity, current_stock) if body.quantity > 0 else 1
        new_ref = db.collection("cart").document()
        new_ref.set({
            "user_id": user["id"], 
            "book_id": body.book_id, 
            "quantity": initial_qty,
            "created_at": firestore.SERVER_TIMESTAMP
        })
        return {"ok": True, "already_in_cart": False, "quantity": initial_qty}

@router.put("/{book_id}")
@router.post("/{book_id}")
def update_cart_quantity(book_id: str, payload: dict, user: dict = Depends(get_current_user)):
    db = get_db()
    new_qty = int(payload.get("quantity", 1))
    if new_qty < 1:
        raise HTTPException(400, "Minimum quantity is 1")
        
    book_doc = db.collection("books").document(book_id).get()
    if not book_doc.exists:
        raise HTTPException(404, "Book not found")
        
    b = book_doc.to_dict()
    current_stock = b.get("stock", 0)
    if new_qty > current_stock:
        raise HTTPException(400, f"Only {current_stock} copy(ies) available in stock")
        
    docs = db.collection("cart").where("user_id", "==", user["id"]).where("book_id", "==", book_id).limit(1).stream()
    existing = list(docs)
    if not existing:
        raise HTTPException(404, "Item not in cart")
        
    doc = existing[0]
    db.collection("cart").document(doc.id).update({"quantity": new_qty})
    return {"ok": True, "quantity": new_qty}

@router.delete("/{book_id}")
def remove_cart(book_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    docs = db.collection("cart").where("user_id", "==", user["id"]).where("book_id", "==", book_id).stream()
    
    batch = db.batch()
    for doc in docs:
        batch.delete(doc.reference)
    batch.commit()
    
    return {"ok": True}
