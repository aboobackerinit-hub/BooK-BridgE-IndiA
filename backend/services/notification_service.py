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
    doc_id: str = None,
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
        doc_id: Optional deterministic document ID for idempotency/deduplication.

    Returns:
        Notification document ID, or None on failure.
    """
    from firebase_admin import firestore as fs

    db = get_db()
    if not db:
        logger.error("Cannot create notification: database not initialized")
        return None

    try:
        data_dict = data or {}
        notif = {
            "user_id": user_id,
            "type": notif_type,
            "title": title,
            "body": body,
            "data": data_dict,
            "action_url": action_url or "",
            "read": False,
            "created_at": fs.SERVER_TIMESTAMP,
        }

        # Copy key identifiers to top-level if present in data
        if "sender_id" in data_dict:
            notif["sender_id"] = data_dict["sender_id"]
        if "sender_name" in data_dict:
            notif["sender_name"] = data_dict["sender_name"]
        if "conversation_id" in data_dict:
            notif["conversation_id"] = data_dict["conversation_id"]
        if "message_id" in data_dict:
            notif["message_id"] = data_dict["message_id"]
        if "message_preview" in data_dict:
            notif["message_preview"] = data_dict["message_preview"]

        if doc_id:
            ref = db.collection("notifications").document(doc_id)
            # Idempotent write: if doc exists, don't duplicate
            existing = ref.get()
            if existing.exists:
                logger.info(f"Notification {doc_id} already exists, skipping duplicate creation")
                return doc_id
        else:
            ref = db.collection("notifications").document()

        ref.set(notif)
        notif["id"] = ref.id

        logger.info(f"Notification created: {notif_type} for user {user_id[:8]}... (ID: {ref.id})")

        # FCM Push Dispatch (Safe failure wrapper inside dispatch_push)
        try:
            dispatch_push(notif)
        except Exception as push_err:
            logger.warning(f"Push dispatch error: {push_err}")

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
        
        # Fire bulk push notification
        try:
            dispatch_bulk_push(user_ids, title, body, data, action_url)
        except Exception as push_err:
            logger.warning(f"Bulk push dispatch error: {push_err}")
            
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
    Push notification dispatch hook via Firebase Cloud Messaging (FCM).
    Sends FCM Multicast push to all registered active device tokens for the target user.
    Auto-cleans invalid or expired tokens upon FCM error report.
    """
    user_id = notification.get("user_id")
    title = notification.get("title", "BookBridge Notification")
    body = notification.get("body", "")
    action_url = notification.get("action_url", "/chat")
    
    if not user_id:
        return
        
    try:
        import firebase_admin.messaging as messaging
        db = get_db()
        if not db:
            return
            
        tokens_docs = db.collection("users").document(user_id).collection("notification_tokens").stream()
        tokens = [d.to_dict().get("token") for d in tokens_docs if d.to_dict().get("token")]
        
        if not tokens:
            return
            
        notif_data = notification.get("data") or {}
        fcm_data = {
            "notification_id": str(notification.get("id") or ""),
            "conversation_id": str(notif_data.get("conversation_id") or notification.get("conversation_id") or ""),
            "message_id": str(notif_data.get("message_id") or notification.get("message_id") or ""),
            "sender_id": str(notif_data.get("sender_id") or notification.get("sender_id") or ""),
            "action_url": str(action_url),
            "title": str(title),
            "body": str(body),
        }

        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=fcm_data,
            tokens=tokens,
        )
        response = messaging.send_each_for_multicast(message)
        logger.info(f"FCM Push sent to {len(tokens)} tokens for user {user_id[:8]}... (Success: {response.success_count}, Fail: {response.failure_count})")
        
        # Cleanup invalid or unregistered tokens
        if response.failure_count > 0:
            batch = db.batch()
            cleanup_needed = False
            for idx, resp in enumerate(response.responses):
                if not resp.success:
                    err_msg = str(resp.exception).lower() if resp.exception else ""
                    if "invalid" in err_msg or "not-registered" in err_msg or "unregistered" in err_msg:
                        bad_token = tokens[idx]
                        token_ref = db.collection("users").document(user_id).collection("notification_tokens").document(bad_token)
                        batch.delete(token_ref)
                        cleanup_needed = True
            if cleanup_needed:
                batch.commit()
                logger.info(f"Cleaned up invalid FCM tokens for user {user_id[:8]}")
                
    except Exception as e:
        logger.warning(f"Push dispatch error for user {user_id[:8]}: {e}")

def dispatch_bulk_push(user_ids: list[str], title: str, body: str, data: dict = None, action_url: str = None) -> None:
    """
    Push notification dispatch hook for bulk notifications (admin announcements).
    Fetches tokens for all provided users in batches and sends multicast pushes.
    """
    if not user_ids:
        return
        
    try:
        import firebase_admin.messaging as messaging
        db = get_db()
        if not db:
            return
            
        tokens = []
        # Firestore 'in' queries are limited to 30 items. It's better to query the collection group 
        # or fetch tokens per user, but since this is an admin task, we can afford a bit of delay,
        # or query token collection group directly.
        
        # Fetching from collection group requires index, so let's just do sequential/chunked for now if list isn't huge.
        for user_id in user_ids:
            try:
                tokens_docs = db.collection("users").document(user_id).collection("notification_tokens").stream()
                for d in tokens_docs:
                    t = d.to_dict().get("token")
                    if t:
                        tokens.append(t)
            except Exception:
                pass
                
        if not tokens:
            return
            
        fcm_data = {
            "action_url": str(action_url or "/"),
            "title": str(title),
            "body": str(body),
        }
        if data:
            for k, v in data.items():
                fcm_data[k] = str(v)
                
        # Multicast can take up to 500 tokens at once
        chunk_size = 500
        for i in range(0, len(tokens), chunk_size):
            token_chunk = tokens[i:i + chunk_size]
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=fcm_data,
                tokens=token_chunk,
            )
            response = messaging.send_each_for_multicast(message)
            logger.info(f"Bulk FCM Push chunk sent to {len(token_chunk)} tokens. (Success: {response.success_count}, Fail: {response.failure_count})")
            
            # Since we don't map tokens back to user_ids easily here, we let the individual dispatch_push clean up bad tokens later,
            # or we could delete them via a collection group query if we had an index, but it's safe to skip cleanup for bulk admin pushes.

    except Exception as e:
        logger.warning(f"Bulk push dispatch error: {e}")



# ── Convenience helpers for common notification types ─────────────────

def notify_new_message(user_id: str, from_name: str, text_preview: str, from_user_id: str = "", message_id: str = None):
    """Notify a user about a new chat message with idempotency deduplication."""
    if user_id == from_user_id:
        return None
        
    doc_id = f"chat_{message_id}" if message_id else None
    action_url = f"/chat/{from_user_id}" if from_user_id else "/chat"
    
    data = {
        "type": "chat_message",
        "sender_id": from_user_id,
        "sender_name": from_name,
        "recipient_id": user_id,
        "conversation_id": from_user_id,
        "message_id": message_id or "",
        "message_preview": text_preview[:100],
        "action_url": action_url,
    }

    create_notification(
        user_id=user_id,
        notif_type="chat_message",
        title=f"New message from {from_name}",
        body=text_preview[:100],
        data=data,
        action_url=action_url,
        doc_id=doc_id,
    )

notify_chat_message = notify_new_message



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
