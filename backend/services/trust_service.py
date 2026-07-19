"""
Seller trust score calculation service.

Computes trust metrics from orders, reviews, and response times.
Called after order completion, new reviews, or profile verification.

Trust Score Formula:
    books_sold * 2 + avg_rating * 20 + successful_txns * 3
    + verified_bonus * 50 - response_time_penalty
    Clamped to 0-100.
"""
import time
import logging
from typing import Optional

from backend.core.database import get_db

logger = logging.getLogger("bookbridge.trust")


def recalculate_trust(user_id: str) -> Optional[dict]:
    """
    Recalculate and update the trust profile for a user.

    Reads from orders, reviews, and messages collections to
    compute all trust metrics. Writes result to user document.

    Returns:
        Updated trust profile dict, or None on failure.
    """
    db = get_db()
    if not db:
        return None

    try:
        from firebase_admin import firestore as fs

        # ── Gather data ──────────────────────────────────────────

        # Books sold (orders where user is a seller)
        orders = db.collection("orders") \
            .where("seller_ids", "array_contains", user_id) \
            .stream()

        books_sold = 0
        books_purchased = 0
        successful_txns = 0

        for odoc in orders:
            o = odoc.to_dict()
            for item in (o.get("items") or []):
                if item.get("seller_id") == user_id:
                    books_sold += item.get("quantity", 1)
            if o.get("status") in ("Delivered", "Completed"):
                successful_txns += 1

        # Books purchased (orders by this user)
        my_orders = db.collection("orders") \
            .where("user_id", "==", user_id) \
            .stream()
        for odoc in my_orders:
            o = odoc.to_dict()
            for item in (o.get("items") or []):
                books_purchased += item.get("quantity", 1)

        # Reviews received (on user's books)
        user_books = db.collection("books") \
            .where("owner_id", "==", user_id) \
            .stream()
        book_ids = [doc.id for doc in user_books]

        avg_rating = 0.0
        total_reviews = 0

        if book_ids:
            for i in range(0, len(book_ids), 10):
                chunk = book_ids[i:i + 10]
                reviews = db.collection("reviews") \
                    .where("book_id", "in", chunk) \
                    .stream()
                for rdoc in reviews:
                    r = rdoc.to_dict()
                    avg_rating += r.get("rating", 0)
                    total_reviews += 1

            if total_reviews > 0:
                avg_rating = round(avg_rating / total_reviews, 2)

        # Response time (average time to first reply in chat threads)
        response_time_mins = _calculate_response_time(db, user_id)

        # Verification status
        user_doc = db.collection("users").document(user_id).get()
        user_data = user_doc.to_dict() if user_doc.exists else {}
        verified = user_data.get("trust", {}).get("verified", False)

        # Last active
        last_active = user_data.get("trust", {}).get("last_active", time.time())

        # ── Compute trust score ──────────────────────────────────

        score = (
            books_sold * 2
            + avg_rating * 20
            + successful_txns * 3
            + (50 if verified else 0)
        )

        # Penalty for slow response time
        if response_time_mins > 0:
            if response_time_mins > 1440:  # > 24 hours
                score -= 20
            elif response_time_mins > 480:  # > 8 hours
                score -= 10
            elif response_time_mins > 120:  # > 2 hours
                score -= 5

        # Clamp to 0-100
        trust_score = max(0, min(100, round(score)))

        # ── Build trust profile ──────────────────────────────────

        trust_profile = {
            "verified": verified,
            "books_sold": books_sold,
            "books_purchased": books_purchased,
            "avg_rating": avg_rating,
            "total_reviews": total_reviews,
            "response_time_mins": response_time_mins,
            "successful_txns": successful_txns,
            "last_active": time.time(),
            "trust_score": trust_score,
        }

        # ── Save to Firestore ────────────────────────────────────

        db.collection("users").document(user_id).update({
            "trust": trust_profile
        })

        logger.info(f"Trust recalculated for {user_id[:8]}...: score={trust_score}")
        return trust_profile

    except Exception as e:
        logger.error(f"Trust recalculation failed for {user_id}: {e}")
        return None


def _calculate_response_time(db, user_id: str) -> int:
    """
    Calculate average first-response time in minutes.

    Looks at chat threads where the user is a participant and
    measures time between incoming and outgoing messages.
    """
    try:
        threads = db.collection("chat_threads") \
            .where("participants", "array_contains", user_id) \
            .limit(20) \
            .stream()

        response_times = []

        for tdoc in threads:
            t = tdoc.to_dict()
            thread_id = tdoc.id

            # Get messages in this thread, sorted by time
            messages = db.collection("messages") \
                .where("thread_id", "==", thread_id) \
                .order_by("created_at") \
                .limit(50) \
                .stream()

            msg_list = [m.to_dict() for m in messages]

            # Find first response from user after an incoming message
            for i, msg in enumerate(msg_list):
                if msg.get("to_user_id") == user_id and i + 1 < len(msg_list):
                    next_msg = msg_list[i + 1]
                    if next_msg.get("from_user_id") == user_id:
                        # Calculate time difference
                        incoming_time = msg.get("created_at")
                        response_time_val = next_msg.get("created_at")
                        if incoming_time and response_time_val:
                            try:
                                diff = (response_time_val.timestamp() - incoming_time.timestamp()) / 60
                                if 0 < diff < 10080:  # Less than a week
                                    response_times.append(diff)
                            except (AttributeError, TypeError):
                                pass
                        break

        if response_times:
            return round(sum(response_times) / len(response_times))
        return 0

    except Exception as e:
        logger.warning(f"Response time calculation failed: {e}")
        return 0


def get_trust_profile(user_id: str) -> dict:
    """
    Get the current trust profile for a user.

    Returns cached profile from user document, or empty defaults.
    """
    db = get_db()
    if not db:
        return _default_trust()

    try:
        doc = db.collection("users").document(user_id).get()
        if not doc.exists:
            return _default_trust()

        trust = doc.to_dict().get("trust")
        if not trust:
            return _default_trust()

        return trust

    except Exception as e:
        logger.warning(f"Failed to get trust profile: {e}")
        return _default_trust()


def verify_user(user_id: str) -> bool:
    """Mark a user as verified (admin action)."""
    db = get_db()
    if not db:
        return False

    try:
        db.collection("users").document(user_id).update({
            "trust.verified": True
        })
        # Recalculate trust score to include verified bonus
        recalculate_trust(user_id)
        return True
    except Exception as e:
        logger.error(f"Failed to verify user: {e}")
        return False


def update_last_active(user_id: str) -> None:
    """Update the user's last active timestamp."""
    db = get_db()
    if not db:
        return

    try:
        db.collection("users").document(user_id).update({
            "trust.last_active": time.time()
        })
    except Exception:
        pass  # Non-critical, don't log noise


def _default_trust() -> dict:
    """Return a default trust profile for users without one."""
    return {
        "verified": False,
        "books_sold": 0,
        "books_purchased": 0,
        "avg_rating": 0.0,
        "total_reviews": 0,
        "response_time_mins": 0,
        "successful_txns": 0,
        "last_active": 0,
        "trust_score": 0,
    }
