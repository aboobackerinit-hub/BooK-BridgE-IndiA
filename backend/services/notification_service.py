"""
Notification service for all in-app notifications.

Designed to be push-ready: the dispatch_push() hook is a no-op now
but can be wired to FCM/OneSignal later without changing any callers.

Notification types:
- message, book_sold, exchange_request, donation_request
- wishlist_price_drop, wishlist_available, wishlist_update
- nearby_listing, review, admin_announcement
"""
import logging
from typing import Optional

from backend.core.database import get_db

logger = logging.getLogger("bookbridge.notifications")


def create_notification(
    user_id: str,
    notif_type: str,
    title: str,
    body: str,
    data: dict = None,
    action_url: str = None,
) -> Optional[str]:
    """
    Create a notification for a user.

    Args:
        user_id: Target user ID.
        notif_type: Notification type (see module docstring).
        title: Short notification title.
        body: Notification body text.
        data: Optional additional data payload.
        action_url: Deep link URL for frontend routing.

    Returns:
        Notification document ID, or None on failure.
    """
    from firebase_admin import firestore as fs

    db = get_db()
    if not db:
        logger.error("Cannot create notification: database not initialized")
        return None

    try:
        notif = {
            "user_id": user_id,
            "type": notif_type,
            "title": title,
            "body": body,
            "data": data or {},
            "action_url": action_url or "",
            "read": False,
            "created_at": fs.SERVER_TIMESTAMP,
        }

        ref = db.collection("notifications").document()
        ref.set(notif)

        logger.info(f"Notification created: {notif_type} for user {user_id[:8]}...")

        # Future: dispatch push notification
        dispatch_push(notif)

        return ref.id

    except Exception as e:
        logger.error(f"Failed to create notification: {e}")
        return None


def create_bulk_notification(
    user_ids: list[str],
    notif_type: str,
    title: str,
    body: str,
    data: dict = None,
    action_url: str = None,
) -> int:
    """
    Create the same notification for multiple users.

    Used for admin announcements and broadcast messages.

    Returns:
        Number of notifications successfully created.
    """
    from firebase_admin import firestore as fs

    db = get_db()
    if not db:
        return 0

    count = 0
    batch = db.batch()

    try:
        for i, user_id in enumerate(user_ids):
            notif = {
                "user_id": user_id,
                "type": notif_type,
                "title": title,
                "body": body,
                "data": data or {},
                "action_url": action_url or "",
                "read": False,
                "created_at": fs.SERVER_TIMESTAMP,
            }
            ref = db.collection("notifications").document()
            batch.set(ref, notif)
            count += 1

            # Firestore batch limit is 500
            if (i + 1) % 490 == 0:
                batch.commit()
                batch = db.batch()

        if count % 490 != 0:
            batch.commit()

        logger.info(f"Bulk notification sent: {notif_type} to {count} users")
        return count

    except Exception as e:
        logger.error(f"Bulk notification failed: {e}")
        return count


def get_unread_count(user_id: str) -> int:
    """Get the count of unread notifications for a user."""
    db = get_db()
    if not db:
        return 0

    try:
        count_res = db.collection("notifications") \
            .where("user_id", "==", user_id) \
            .where("read", "==", False) \
            .count().get()
        return count_res[0][0].value if count_res else 0
    except Exception as e:
        logger.warning(f"Failed to get unread count: {e}")
        return 0


def mark_read(notification_id: str) -> bool:
    """Mark a single notification as read."""
    db = get_db()
    if not db:
        return False

    try:
        db.collection("notifications").document(notification_id).update({"read": True})
        return True
    except Exception as e:
        logger.warning(f"Failed to mark notification read: {e}")
        return False


def mark_all_read(user_id: str) -> int:
    """Mark all notifications as read for a user. Returns count updated."""
    db = get_db()
    if not db:
        return 0

    try:
        unread = db.collection("notifications") \
            .where("user_id", "==", user_id) \
            .where("read", "==", False) \
            .stream()

        batch = db.batch()
        count = 0
        for doc in unread:
            batch.update(doc.reference, {"read": True})
            count += 1
            if count % 490 == 0:
                batch.commit()
                batch = db.batch()

        if count % 490 != 0:
            batch.commit()

        return count
    except Exception as e:
        logger.warning(f"Failed to mark all read: {e}")
        return 0


def dispatch_push(notification: dict) -> None:
    """
    Push notification dispatch hook.

    Currently a no-op. Wire to FCM/OneSignal here when ready.
    The function signature and call sites remain stable.
    """
    # Future implementation:
    # from backend.services.push_provider import send_push
    # send_push(notification["user_id"], notification["title"], notification["body"])
    pass


# ── Convenience helpers for common notification types ─────────────────

def notify_new_message(user_id: str, from_name: str, text_preview: str):
    """Notify a user about a new chat message."""
    create_notification(
        user_id=user_id,
        notif_type="message",
        title=f"New message from {from_name}",
        body=text_preview[:100],
        action_url=f"/chat",
    )


def notify_book_sold(seller_id: str, book_title: str, buyer_name: str, order_id: str):
    """Notify a seller that their book was sold."""
    create_notification(
        user_id=seller_id,
        notif_type="book_sold",
        title="Book Sold!",
        body=f'"{book_title}" was purchased by {buyer_name}.',
        data={"order_id": order_id},
        action_url=f"/orders",
    )


def notify_review(seller_id: str, reviewer_name: str, book_title: str, rating: int):
    """Notify a seller about a new review on their book."""
    stars = "⭐" * rating
    create_notification(
        user_id=seller_id,
        notif_type="review",
        title="New Review",
        body=f'{reviewer_name} rated "{book_title}" {stars}',
        action_url=f"/store-owner",
    )


def notify_price_drop(user_id: str, book_title: str, old_price: float, new_price: float, book_id: str):
    """Notify a user about a price drop on a wishlisted book."""
    create_notification(
        user_id=user_id,
        notif_type="wishlist_price_drop",
        title="Price Drop!",
        body=f'"{book_title}" dropped from ₹{old_price:.0f} to ₹{new_price:.0f}',
        data={"book_id": book_id, "old_price": old_price, "new_price": new_price},
        action_url=f"/book/{book_id}",
    )


def notify_nearby_listing(user_id: str, book_title: str, distance_km: float, book_id: str):
    """Notify a user about a new listing nearby."""
    create_notification(
        user_id=user_id,
        notif_type="nearby_listing",
        title="New Book Nearby",
        body=f'"{book_title}" listed {distance_km:.1f} km from you',
        data={"book_id": book_id},
        action_url=f"/book/{book_id}",
    )
