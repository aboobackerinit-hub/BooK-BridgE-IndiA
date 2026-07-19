"""
Wishlist API routes.

Supports price-drop alerts, listing update alerts,
stock availability alerts, and wishlist sharing.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from firebase_admin import firestore
from backend.core.database import get_db
from backend.api.dependencies import get_current_user
from backend.models.schemas import WishlistAlertPrefs

router = APIRouter(prefix="/wishlist", tags=["wishlist"])
logger = logging.getLogger("bookbridge.routes.wishlist")


@router.get("")
def get_wishlist(user: dict = Depends(get_current_user)):
    """Get the current user's wishlist with book details."""
    db = get_db()

    docs = db.collection("wishlist") \
        .where("user_id", "==", user["id"]) \
        .order_by("added_at", direction=firestore.Query.DESCENDING) \
        .stream()

    items = []
    book_ids = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        items.append(d)
        book_ids.append(d["book_id"])

    # Batch fetch book details
    books_map = {}
    if book_ids:
        for i in range(0, len(book_ids), 10):
            chunk = book_ids[i:i + 10]
            bdocs = db.collection("books") \
                .where(firestore.FieldPath.document_id(), "in", chunk) \
                .stream()
            for bdoc in bdocs:
                b = bdoc.to_dict()
                b["id"] = bdoc.id
                books_map[b["id"]] = b

    for item in items:
        item["book"] = books_map.get(item["book_id"])
        # Check for price drop
        book = item.get("book")
        if book and item.get("price_at_add"):
            current_price = float(book.get("price", 0))
            added_price = float(item["price_at_add"])
            if current_price < added_price:
                item["price_dropped"] = True
                item["price_drop_amount"] = round(added_price - current_price, 2)
            else:
                item["price_dropped"] = False

    return items


@router.post("/{book_id}")
def add_to_wishlist(book_id: str, user: dict = Depends(get_current_user)):
    """Add a book to the wishlist."""
    db = get_db()

    # Check book exists
    book_doc = db.collection("books").document(book_id).get()
    if not book_doc.exists:
        raise HTTPException(404, "Book not found")

    book = book_doc.to_dict()

    # Prevent adding own book
    if book.get("owner_id") == user["id"]:
        raise HTTPException(400, "Cannot wishlist your own book")

    # Check if already wishlisted
    existing = db.collection("wishlist") \
        .where("user_id", "==", user["id"]) \
        .where("book_id", "==", book_id) \
        .limit(1).stream()
    if list(existing):
        raise HTTPException(400, "Already in wishlist")

    # Add to wishlist
    item = {
        "user_id": user["id"],
        "book_id": book_id,
        "added_at": firestore.SERVER_TIMESTAMP,
        "price_at_add": float(book.get("price", 0)),
        "notify_price_drop": True,
        "notify_available": True,
        "notify_update": False,
        "shared": False,
    }
    ref = db.collection("wishlist").document()
    ref.set(item)

    # Increment wishlist_count on book
    db.collection("books").document(book_id).update({
        "wishlist_count": firestore.Increment(1)
    })

    item["id"] = ref.id
    return item


@router.delete("/{book_id}")
def remove_from_wishlist(book_id: str, user: dict = Depends(get_current_user)):
    """Remove a book from the wishlist."""
    db = get_db()

    docs = db.collection("wishlist") \
        .where("user_id", "==", user["id"]) \
        .where("book_id", "==", book_id) \
        .stream()

    deleted = False
    batch = db.batch()
    for doc in docs:
        batch.delete(doc.reference)
        deleted = True
    batch.commit()

    if deleted:
        # Decrement wishlist_count on book
        db.collection("books").document(book_id).update({
            "wishlist_count": firestore.Increment(-1)
        })

    return {"ok": True, "removed": deleted}


@router.put("/{book_id}/alerts")
def update_alerts(
    book_id: str,
    body: WishlistAlertPrefs,
    user: dict = Depends(get_current_user),
):
    """Update alert preferences for a wishlisted book."""
    db = get_db()

    docs = db.collection("wishlist") \
        .where("user_id", "==", user["id"]) \
        .where("book_id", "==", book_id) \
        .limit(1).stream()

    doc_list = list(docs)
    if not doc_list:
        raise HTTPException(404, "Book not in wishlist")

    doc_ref = doc_list[0].reference
    doc_ref.update({
        "notify_price_drop": body.notify_price_drop,
        "notify_available": body.notify_available,
        "notify_update": body.notify_update,
    })

    return {"ok": True}


@router.get("/shared/{user_id}")
def get_shared_wishlist(user_id: str):
    """View another user's shared wishlist items."""
    db = get_db()

    docs = db.collection("wishlist") \
        .where("user_id", "==", user_id) \
        .where("shared", "==", True) \
        .order_by("added_at", direction=firestore.Query.DESCENDING) \
        .stream()

    items = []
    book_ids = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        items.append(d)
        book_ids.append(d["book_id"])

    # Batch fetch books
    books_map = {}
    if book_ids:
        for i in range(0, len(book_ids), 10):
            chunk = book_ids[i:i + 10]
            bdocs = db.collection("books") \
                .where(firestore.FieldPath.document_id(), "in", chunk) \
                .stream()
            for bdoc in bdocs:
                b = bdoc.to_dict()
                b["id"] = bdoc.id
                books_map[b["id"]] = b

    for item in items:
        item["book"] = books_map.get(item["book_id"])

    return items


@router.post("/{book_id}/share")
def toggle_share(book_id: str, user: dict = Depends(get_current_user)):
    """Toggle sharing of a wishlisted book."""
    db = get_db()

    docs = db.collection("wishlist") \
        .where("user_id", "==", user["id"]) \
        .where("book_id", "==", book_id) \
        .limit(1).stream()

    doc_list = list(docs)
    if not doc_list:
        raise HTTPException(404, "Book not in wishlist")

    doc_ref = doc_list[0].reference
    current = doc_list[0].to_dict().get("shared", False)
    doc_ref.update({"shared": not current})

    return {"ok": True, "shared": not current}


@router.get("/check/{book_id}")
def check_wishlisted(book_id: str, user: dict = Depends(get_current_user)):
    """Check if a book is in the user's wishlist."""
    db = get_db()

    docs = db.collection("wishlist") \
        .where("user_id", "==", user["id"]) \
        .where("book_id", "==", book_id) \
        .limit(1).stream()

    return {"wishlisted": bool(list(docs))}
