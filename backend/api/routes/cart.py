from fastapi import APIRouter, HTTPException, Depends
from backend.core.database import get_db
from firebase_admin import firestore
from backend.api.dependencies import get_current_user
from backend.models.schemas import CartItemIn
from backend.services.storage import attach_signed_urls

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
    
    if book_ids:
        # Note: Firestore 'in' has a max of 10 items.
        for i in range(0, len(book_ids), 10):
            chunk = book_ids[i:i+10]
            bdocs = db.collection("books").where(firestore.FieldPath.document_id(), "in", chunk).stream()
            for bdoc in bdocs:
                b = bdoc.to_dict()
                b["id"] = bdoc.id
                attach_signed_urls(b)
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
        
    docs = db.collection("cart").where("user_id", "==", user["id"]).where("book_id", "==", body.book_id).limit(1).stream()
    existing = list(docs)
    
    if existing:
        doc = existing[0]
        new_qty = doc.to_dict().get("quantity", 0) + body.quantity
        db.collection("cart").document(doc.id).update({"quantity": new_qty})
    else:
        new_ref = db.collection("cart").document()
        new_ref.set({
            "user_id": user["id"], 
            "book_id": body.book_id, 
            "quantity": body.quantity,
            "created_at": firestore.SERVER_TIMESTAMP
        })
        
    return {"ok": True}

@router.delete("/{book_id}")
def remove_cart(book_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    docs = db.collection("cart").where("user_id", "==", user["id"]).where("book_id", "==", book_id).stream()
    
    batch = db.batch()
    for doc in docs:
        batch.delete(doc.reference)
    batch.commit()
    
    return {"ok": True}
