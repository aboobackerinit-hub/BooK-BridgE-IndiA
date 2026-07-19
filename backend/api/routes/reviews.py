"""
Reviews API routes.

Supports star ratings, text reviews, verified purchase badges,
and helpful vote system.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from firebase_admin import firestore
from backend.core.database import get_db
from backend.api.dependencies import get_current_user
from backend.models.schemas import ReviewIn

router = APIRouter(prefix="/reviews", tags=["reviews"])
logger = logging.getLogger("bookbridge.routes.reviews")


@router.get("/{book_id}")
def get_reviews(book_id: str, limit: int = 20, start_after: str = None):
    """Get reviews for a book, sorted by helpful votes then date."""
    db = get_db()

    query = db.collection("reviews") \
        .where("book_id", "==", book_id) \
        .order_by("created_at", direction=firestore.Query.DESCENDING)

    if start_after:
        cursor = db.collection("reviews").document(start_after).get()
        if cursor.exists:
            query = query.start_after(cursor)

    docs = query.limit(limit).stream()
    results = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        results.append(d)

    # Sort by helpful_votes count (descending), then by date
    results.sort(key=lambda r: (len(r.get("helpful_votes", [])), r.get("created_at", "")), reverse=True)
    return results


@router.get("/{book_id}/summary")
def get_review_summary(book_id: str):
    """Get review summary (average rating, count, distribution)."""
    db = get_db()

    docs = db.collection("reviews") \
        .where("book_id", "==", book_id) \
        .stream()

    total = 0
    sum_rating = 0
    distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}

    for doc in docs:
        r = doc.to_dict()
        rating = r.get("rating", 0)
        sum_rating += rating
        total += 1
        if rating in distribution:
            distribution[rating] += 1

    avg = round(sum_rating / total, 1) if total > 0 else 0

    return {
        "average_rating": avg,
        "total_reviews": total,
        "distribution": distribution,
    }


@router.post("/{book_id}")
def create_review(
    book_id: str,
    body: ReviewIn,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Create a review for a book. Auto-detects verified purchase."""
    db = get_db()

    # Check book exists
    book_doc = db.collection("books").document(book_id).get()
    if not book_doc.exists:
        raise HTTPException(404, "Book not found")

    book = book_doc.to_dict()

    # Prevent reviewing own book
    if book.get("owner_id") == user["id"]:
        raise HTTPException(400, "Cannot review your own book")

    # Check for duplicate review
    existing = db.collection("reviews") \
        .where("book_id", "==", book_id) \
        .where("user_id", "==", user["id"]) \
        .limit(1).stream()
    if list(existing):
        raise HTTPException(400, "You already reviewed this book")

    # Check if user has purchased this book (verified purchase)
    verified = False
    orders = db.collection("orders") \
        .where("user_id", "==", user["id"]) \
        .stream()
    for odoc in orders:
        o = odoc.to_dict()
        for item in (o.get("items") or []):
            if item.get("book_id") == book_id:
                verified = True
                break
        if verified:
            break

    review = {
        "book_id": book_id,
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "user_avatar_url": user.get("avatar_url", ""),
        "rating": body.rating,
        "text": body.text,
        "verified_purchase": verified,
        "helpful_votes": [],
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP,
    }

    ref = db.collection("reviews").document()
    ref.set(review)

    review["id"] = ref.id

    # Background: update seller trust, send notification, award badges
    seller_id = book.get("owner_id")
    if seller_id:
        background_tasks.add_task(_post_review_tasks, seller_id, user, book.get("title", ""), body.rating)

    return review


@router.put("/{review_id}")
def update_review(
    review_id: str,
    body: ReviewIn,
    user: dict = Depends(get_current_user),
):
    """Update an existing review (only by the author)."""
    db = get_db()

    doc_ref = db.collection("reviews").document(review_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(404, "Review not found")

    review = doc.to_dict()
    if review.get("user_id") != user["id"]:
        raise HTTPException(403, "Not allowed")

    doc_ref.update({
        "rating": body.rating,
        "text": body.text,
        "updated_at": firestore.SERVER_TIMESTAMP,
    })

    updated = doc_ref.get().to_dict()
    updated["id"] = review_id
    return updated


@router.delete("/{review_id}")
def delete_review(review_id: str, user: dict = Depends(get_current_user)):
    """Delete a review (author or admin)."""
    db = get_db()

    doc_ref = db.collection("reviews").document(review_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(404, "Review not found")

    review = doc.to_dict()
    if review.get("user_id") != user["id"] and user.get("role") != "admin":
        raise HTTPException(403, "Not allowed")

    doc_ref.delete()
    return {"ok": True}


@router.post("/{review_id}/helpful")
def toggle_helpful(review_id: str, user: dict = Depends(get_current_user)):
    """Toggle helpful vote on a review."""
    db = get_db()

    doc_ref = db.collection("reviews").document(review_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(404, "Review not found")

    review = doc.to_dict()

    # Can't vote on own review
    if review.get("user_id") == user["id"]:
        raise HTTPException(400, "Cannot vote on your own review")

    helpful = review.get("helpful_votes", [])
    if user["id"] in helpful:
        doc_ref.update({"helpful_votes": firestore.ArrayRemove([user["id"]])})
        return {"helpful": False, "count": len(helpful) - 1}
    else:
        doc_ref.update({"helpful_votes": firestore.ArrayUnion([user["id"]])})
        return {"helpful": True, "count": len(helpful) + 1}


def _post_review_tasks(seller_id: str, user: dict, book_title: str, rating: int):
    """Background tasks after a review is created."""
    try:
        from backend.services.trust_service import recalculate_trust
        recalculate_trust(seller_id)
    except Exception as e:
        logger.warning(f"Trust recalculation failed: {e}")

    try:
        from backend.services.notification_service import notify_review
        notify_review(seller_id, user.get("name", ""), book_title, rating)
    except Exception as e:
        logger.warning(f"Review notification failed: {e}")

    try:
        from backend.services.gamification_service import check_and_award_badges, add_points
        check_and_award_badges(user["id"])
        add_points(user["id"], "review")
    except Exception as e:
        logger.warning(f"Gamification update failed: {e}")
