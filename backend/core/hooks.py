"""
Plugin hooks system for extensible event handling.

Extension points that services can register into. When an event occurs,
all registered handlers are called. This enables loose coupling between
services (e.g., notification service, trust service, gamification) and
makes it easy to add future consumers (AI recommendations, spam detection).

Usage:
    # Register a handler
    register("on_book_created", handle_new_book_search_tokens)
    register("on_book_created", handle_new_book_notification)

    # Fire an event
    fire("on_book_created", book_data=book, user_data=user)
"""
import logging
from typing import Callable, Any

logger = logging.getLogger("bookbridge.hooks")

# Registry of event hooks
_hooks: dict[str, list[Callable]] = {
    "on_book_created": [],
    "on_book_updated": [],
    "on_book_deleted": [],
    "on_order_created": [],
    "on_order_completed": [],
    "on_order_status_changed": [],
    "on_review_created": [],
    "on_review_updated": [],
    "on_user_registered": [],
    "on_user_updated": [],
    "on_message_sent": [],
    "on_wishlist_added": [],
    "on_wishlist_removed": [],
    "on_book_viewed": [],
    "on_search_performed": [],
}


def register(event: str, handler: Callable) -> None:
    """
    Register a handler for an event.

    Args:
        event: Event name (must be a known event).
        handler: Callable that accepts **kwargs.
    """
    if event not in _hooks:
        _hooks[event] = []
    _hooks[event].append(handler)
    logger.debug(f"Hook registered: {handler.__name__} -> {event}")


def fire(event: str, **kwargs: Any) -> None:
    """
    Fire an event, calling all registered handlers.

    Handlers are called synchronously. Exceptions in one handler
    do not prevent other handlers from running.

    Args:
        event: Event name.
        **kwargs: Data to pass to handlers.
    """
    handlers = _hooks.get(event, [])
    if not handlers:
        return

    for handler in handlers:
        try:
            handler(**kwargs)
        except Exception as e:
            logger.error(
                f"Hook handler {handler.__name__} failed for event {event}: {e}",
                exc_info=True,
            )


def fire_async_background(event: str, background_tasks, **kwargs: Any) -> None:
    """
    Fire an event using FastAPI BackgroundTasks for non-blocking execution.

    Args:
        event: Event name.
        background_tasks: FastAPI BackgroundTasks instance.
        **kwargs: Data to pass to handlers.
    """
    handlers = _hooks.get(event, [])
    for handler in handlers:
        background_tasks.add_task(_safe_call, handler, **kwargs)


def _safe_call(handler: Callable, **kwargs: Any) -> None:
    """Safely call a handler, catching and logging exceptions."""
    try:
        handler(**kwargs)
    except Exception as e:
        logger.error(
            f"Background hook handler {handler.__name__} failed: {e}",
            exc_info=True,
        )


def list_hooks() -> dict[str, list[str]]:
    """List all registered hooks and their handler names (for debugging)."""
    return {
        event: [h.__name__ for h in handlers]
        for event, handlers in _hooks.items()
        if handlers
    }
