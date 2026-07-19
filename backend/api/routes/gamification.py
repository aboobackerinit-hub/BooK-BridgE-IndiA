"""
Gamification API routes.

Exposes badges, leaderboards, and user progress.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends
from backend.api.dependencies import get_current_user
from backend.services import gamification_service as gam

router = APIRouter(prefix="/gamification", tags=["gamification"])
logger = logging.getLogger("bookbridge.routes.gamification")


@router.get("/badges")
def list_badges():
    """Get all available badge definitions."""
    return gam.get_all_badges()


@router.get("/my-progress")
def my_progress(user: dict = Depends(get_current_user)):
    """Get the current user's gamification progress."""
    return gam.get_user_progress(user["id"])


@router.get("/leaderboard")
def leaderboard(
    scope: str = "global",
    metric: str = "trust_score",
    limit: int = 20,
    scope_value: Optional[str] = None,
):
    """
    Get the leaderboard.

    Args:
        scope: 'global', 'college', 'district', 'state'.
        metric: 'trust_score', 'sales', 'points', 'donations', 'reviews'.
        limit: Number of entries (max 50).
        scope_value: Filter value for non-global scopes.
    """
    limit = min(limit, 50)
    return gam.get_leaderboard(scope, metric, limit, scope_value)
