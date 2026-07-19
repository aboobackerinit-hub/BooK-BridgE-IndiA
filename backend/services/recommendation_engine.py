"""
Recommendation engine for personalized book suggestions.

Provides multiple recommendation strategies:
- Recommended For You (collaborative + content-based)
- Similar Books
- Recently Viewed
- Trending Books
- Popular Near You
- Recently Added
- Most Wishlisted

Uses the strategy pattern for future ML model integration.
Results are cached with TTL for performance.
"""
import time
import logging
from typing import Optional

from backend.core.database import get_db
from backend.core import cache

logger = logging.getLogger("bookbridge.recommendations")


# ── Event Tracking ────────────────────────────────────────────────────

def track_event(user_id: str, event_type: str, book_id: str = None,
                category: str = None, extra: dict = None):
    """
    Track a user interaction event for recommendation learning.

    Args:
        user_id: The user performing the action.
        event_type: One of 'view', 'search', 'purchase', 'wishlist', 'cart'.
        book_id: Related book ID (if applicable).
        category: Book category (for content-based filtering).
        extra: Additional metadata.
    """
    try:
        from firebase_admin import firestore as fs
        db = get_db()
        if not db:
            return

        event = {
            "user_id": user_id,
            "event_type": event_type,
            "book_id": book_id,
            "category": category,
            "timestamp": fs.SERVER_TIMESTAMP,
        }
        if extra:
            event.update(extra)

        db.collection("user_events").add(event)

        # Also update user's recently_viewed if it's a view event
        if event_type == "view" and book_id:
            _update_recently_viewed(db, user_id, book_id)

    except Exception as e:
        logger.warning(f"Failed to track event: {e}")


def _update_recently_viewed(db, user_id: str, book_id: str):
    """Add book to user's recently_viewed array (max 50, LIFO)."""
    from firebase_admin import firestore as fs
    try:
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()
        if not user_doc.exists:
            return

        user_data = user_doc.to_dict()
        recently = user_data.get("recently_viewed", [])

        # Remove if already present (move to front)
        recently = [r for r in recently if r.get("book_id") != book_id]
        recently.insert(0, {"book_id": book_id, "timestamp": time.time()})
        recently = recently[:50]  # Cap at 50

        user_ref.update({"recently_viewed": recently})
    except Exception as e:
        logger.warning(f"Failed to update recently_viewed: {e}")


# ── Recommendation Functions ──────────────────────────────────────────

@cache.cached(ttl=300, key_prefix="rec:for_you")
def get_for_you(user_id: str, limit: int = 20) -> list[dict]:
    """
    Get personalized recommendations based on user's history.

    Strategy: Content-based filtering using category affinity from
    purchase history, wishlist, and browsing history.
    """
    db = get_db()
    if not db:
        return []

    try:
        # 1. Get user's category preferences from events
        events = db.collection("user_events") \
            .where("user_id", "==", user_id) \
            .order_by("timestamp", direction="DESCENDING") \
            .limit(100) \
            .stream()

        # Count category frequency
        category_scores: dict[str, float] = {}
        viewed_book_ids = set()
        for event in events:
            e = event.to_dict()
            cat = e.get("category")
            etype = e.get("event_type", "view")
            bid = e.get("book_id")

            if bid:
                viewed_book_ids.add(bid)

            if cat:
                # Weight by event type
                weights = {"purchase": 5, "wishlist": 3, "cart": 2, "view": 1}
                weight = weights.get(etype, 1)
                category_scores[cat] = category_scores.get(cat, 0) + weight

        if not category_scores:
            # No history — return trending
            return get_trending(limit)

        # 2. Get top categories
        sorted_cats = sorted(category_scores.items(), key=lambda x: -x[1])
        top_cats = [c[0] for c in sorted_cats[:5]]

        # 3. Fetch books from top categories
        results = []
        per_cat = max(limit // len(top_cats), 5)

        for cat in top_cats:
            docs = db.collection("books") \
                .where("approved", "==", True) \
                .where("category", "==", cat) \
                .order_by("created_at", direction="DESCENDING") \
                .limit(per_cat) \
                .stream()

            for doc in docs:
                d = doc.to_dict()
                d["id"] = doc.id
                # Exclude already viewed
                if d["id"] not in viewed_book_ids:
                    results.append(d)

        return results[:limit]

    except Exception as e:
        logger.error(f"get_for_you failed: {e}")
        return get_trending(limit)


def get_similar(book_id: str, limit: int = 10) -> list[dict]:
    """Get books similar to a given book (same category + author)."""
    db = get_db()
    if not db:
        return []

    try:
        book_doc = db.collection("books").document(book_id).get()
        if not book_doc.exists:
            return []

        book = book_doc.to_dict()
        category = book.get("category", "")
        author = book.get("author", "")

        # Fetch books from same category
        docs = db.collection("books") \
            .where("approved", "==", True) \
            .where("category", "==", category) \
            .order_by("created_at", direction="DESCENDING") \
            .limit(limit * 2) \
            .stream()

        results = []
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            if d["id"] != book_id:
                # Boost same-author books
                if d.get("author", "").lower() == author.lower():
                    results.insert(0, d)
                else:
                    results.append(d)

        return results[:limit]

    except Exception as e:
        logger.error(f"get_similar failed: {e}")
        return []


def get_recently_viewed(user_id: str, limit: int = 20) -> list[dict]:
    """Get user's recently viewed books."""
    db = get_db()
    if not db:
        return []

    try:
        user_doc = db.collection("users").document(user_id).get()
        if not user_doc.exists:
            return []

        recently = user_doc.to_dict().get("recently_viewed", [])
        book_ids = [r["book_id"] for r in recently[:limit]]

        if not book_ids:
            return []

        # Batch fetch books (Firestore 'in' limit is 30)
        results = []
        for i in range(0, len(book_ids), 10):
            from firebase_admin import firestore as fs
            chunk = book_ids[i:i + 10]
            docs = db.collection("books") \
                .where(fs.FieldPath.document_id(), "in", chunk) \
                .stream()
            for doc in docs:
                d = doc.to_dict()
                d["id"] = doc.id
                results.append(d)

        # Maintain original order
        id_order = {bid: idx for idx, bid in enumerate(book_ids)}
        results.sort(key=lambda r: id_order.get(r["id"], 999))

        return results

    except Exception as e:
        logger.error(f"get_recently_viewed failed: {e}")
        return []


@cache.cached(ttl=300, key_prefix="rec:trending")
def get_trending(limit: int = 20) -> list[dict]:
    """Get trending books (most viewed recently)."""
    db = get_db()
    if not db:
        return []

    try:
        docs = db.collection("books") \
            .where("approved", "==", True) \
            .order_by("views_count", direction="DESCENDING") \
            .limit(limit) \
            .stream()

        results = []
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            results.append(d)

        return results

    except Exception as e:
        logger.error(f"get_trending failed, using latest: {e}")
        return get_recently_added(limit)


@cache.cached(ttl=120, key_prefix="rec:recent")
def get_recently_added(limit: int = 20) -> list[dict]:
    """Get most recently added books."""
    db = get_db()
    if not db:
        return []

    try:
        from firebase_admin import firestore as fs
        docs = db.collection("books") \
            .where("approved", "==", True) \
            .order_by("created_at", direction=fs.Query.DESCENDING) \
            .limit(limit) \
            .stream()

        results = []
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            results.append(d)

        return results

    except Exception as e:
        logger.error(f"get_recently_added failed: {e}")
        return []


@cache.cached(ttl=300, key_prefix="rec:wishlisted")
def get_most_wishlisted(limit: int = 20) -> list[dict]:
    """Get most wishlisted books."""
    db = get_db()
    if not db:
        return []

    try:
        docs = db.collection("books") \
            .where("approved", "==", True) \
            .order_by("wishlist_count", direction="DESCENDING") \
            .limit(limit) \
            .stream()

        results = []
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            if d.get("wishlist_count", 0) > 0:
                results.append(d)

        return results

    except Exception as e:
        logger.error(f"get_most_wishlisted failed: {e}")
        return []


def get_near_me(user_location: dict, limit: int = 20) -> list[dict]:
    """Get popular books near the user's location."""
    db = get_db()
    if not db or not user_location:
        return []

    try:
        district = user_location.get("district")
        state = user_location.get("state")

        if district:
            docs = db.collection("books") \
                .where("approved", "==", True) \
                .where("location.district", "==", district) \
                .order_by("views_count", direction="DESCENDING") \
                .limit(limit) \
                .stream()
        elif state:
            docs = db.collection("books") \
                .where("approved", "==", True) \
                .where("location.state", "==", state) \
                .order_by("views_count", direction="DESCENDING") \
                .limit(limit) \
                .stream()
        else:
            return []

        results = []
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            results.append(d)

        return results

    except Exception as e:
        logger.error(f"get_near_me failed: {e}")
        return []
