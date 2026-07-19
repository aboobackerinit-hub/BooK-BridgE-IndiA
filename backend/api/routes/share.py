"""
Social sharing API routes.

Generates Open Graph metadata and shareable card images
for book listings.
"""
import logging
from fastapi import APIRouter, HTTPException
from backend.core.database import get_db

router = APIRouter(prefix="/share", tags=["share"])
logger = logging.getLogger("bookbridge.routes.share")


@router.get("/book/{book_id}/og")
def get_og_metadata(book_id: str):
    """
    Get Open Graph metadata for a book.

    Returns title, description, image URL, and formatted share URLs
    for WhatsApp, Facebook, Telegram, and X.
    """
    db = get_db()

    doc = db.collection("books").document(book_id).get()
    if not doc.exists:
        raise HTTPException(404, "Book not found")

    book = doc.to_dict()
    title = book.get("title", "")
    author = book.get("author", "")
    price = book.get("price", 0)
    image_url = book.get("image_url", "")
    description = book.get("description", "")
    listing_type = book.get("listing_type", "sell")

    # Format price display
    if listing_type == "donate":
        price_text = "Free (Donation)"
    elif listing_type == "exchange":
        price_text = "Exchange"
    else:
        price_text = f"₹{price:.0f}"

    # Build share text
    share_text = f"📚 {title} by {author} — {price_text} on BookBridge India"
    if description:
        share_text += f"\n\n{description[:150]}..."

    # Build share URL (frontend route)
    share_url = f"/book/{book_id}"

    # Platform-specific share URLs
    import urllib.parse
    encoded_text = urllib.parse.quote(share_text)
    encoded_url = urllib.parse.quote(share_url)

    return {
        "og": {
            "title": f"{title} by {author}",
            "description": f"{price_text} — {description[:200] if description else 'Available on BookBridge India'}",
            "image": image_url,
            "type": "product",
        },
        "share_text": share_text,
        "share_url": share_url,
        "platforms": {
            "whatsapp": f"https://wa.me/?text={encoded_text}%20{encoded_url}",
            "facebook": f"https://www.facebook.com/sharer/sharer.php?u={encoded_url}&quote={encoded_text}",
            "telegram": f"https://t.me/share/url?url={encoded_url}&text={encoded_text}",
            "x": f"https://x.com/intent/tweet?text={encoded_text}&url={encoded_url}",
        },
    }
