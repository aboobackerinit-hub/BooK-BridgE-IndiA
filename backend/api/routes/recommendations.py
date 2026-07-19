"""
Recommendations API routes.

Wraps the recommendation engine service to expose
personalized book suggestions via REST endpoints.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, BackgroundTasks
from backend.api.dependencies import get_current_user
from backend.services import recommendation_engine as rec

router = APIRouter(prefix="/recommendations", tags=["recommendations"])
logger = logging.getLogger("bookbridge.routes.recommendations")


@router.get("/for-you")
def for_you(limit: int = 20, user: dict = Depends(get_current_user)):
    """Get personalized book recommendations."""
    return rec.get_for_you(user["id"], limit)


@router.get("/similar/{book_id}")
def similar(book_id: str, limit: int = 10):
    """Get books similar to a given book."""
    return rec.get_similar(book_id, limit)


@router.get("/recently-viewed")
def recently_viewed(limit: int = 20, user: dict = Depends(get_current_user)):
    """Get the user's recently viewed books."""
    return rec.get_recently_viewed(user["id"], limit)


@router.get("/trending")
def trending(limit: int = 20):
    """Get trending books globally."""
    return rec.get_trending(limit)


@router.get("/recently-added")
def recently_added(limit: int = 20):
    """Get most recently added books."""
    return rec.get_recently_added(limit)


@router.get("/most-wishlisted")
def most_wishlisted(limit: int = 20):
    """Get most wishlisted books."""
    return rec.get_most_wishlisted(limit)


@router.get("/near-me")
def near_me(limit: int = 20, user: dict = Depends(get_current_user)):
    """Get popular books near the user's location."""
    user_loc = user.get("location", {})
    return rec.get_near_me(user_loc, limit)


@router.post("/track")
def track_event(
    event_type: str,
    book_id: Optional[str] = None,
    category: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
    user: dict = Depends(get_current_user),
):
    """Track a user interaction event for recommendation learning."""
    if background_tasks:
        background_tasks.add_task(
            rec.track_event, user["id"], event_type, book_id, category
        )
    else:
        rec.track_event(user["id"], event_type, book_id, category)

    return {"ok": True}
