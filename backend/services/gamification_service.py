"""
Gamification service for badges, points, and leaderboards.

Supports:
- Automatic badge awarding based on criteria
- Points system (sales, donations, reviews, helpful votes)
- Leaderboards (global, college, district, state)
- Achievement tracking

Badge definitions are stored in Firestore 'badges' collection.
User gamification data is stored in user document under 'gamification'.
"""
import logging
from typing import Optional

from backend.core.database import get_db
from backend.core import cache

logger = logging.getLogger("bookbridge.gamification")


# ── Badge Definitions ─────────────────────────────────────────────────

BADGE_DEFINITIONS = [
    {
        "id": "first_sale",
        "name": "First Sale",
        "description": "Sold your first book",
        "icon": "🏷️",
        "type": "milestone",
        "criteria": {"books_sold": 1},
    },
    {
        "id": "seller_10",
        "name": "Active Seller",
        "description": "Sold 10 books",
        "icon": "📦",
        "type": "milestone",
        "criteria": {"books_sold": 10},
    },
    {
        "id": "seller_50",
        "name": "Top Seller",
        "description": "Sold 50 books",
        "icon": "🏆",
        "type": "top_seller",
        "criteria": {"books_sold": 50},
    },
    {
        "id": "first_donation",
        "name": "Kind Heart",
        "description": "Donated your first book",
        "icon": "💝",
        "type": "milestone",
        "criteria": {"donations": 1},
    },
    {
        "id": "donor_10",
        "name": "Top Donor",
        "description": "Donated 10 books",
        "icon": "🌟",
        "type": "top_donor",
        "criteria": {"donations": 10},
    },
    {
        "id": "first_review",
        "name": "Reviewer",
        "description": "Wrote your first review",
        "icon": "📝",
        "type": "milestone",
        "criteria": {"reviews_written": 1},
    },
    {
        "id": "helpful_reviewer",
        "name": "Helpful Reviewer",
        "description": "Received 10 helpful votes on reviews",
        "icon": "👍",
        "type": "top_reviewer",
        "criteria": {"helpful_votes_received": 10},
    },
    {
        "id": "trusted_seller",
        "name": "Trusted Seller",
        "description": "Achieved a trust score of 80+",
        "icon": "✅",
        "type": "achievement",
        "criteria": {"trust_score": 80},
    },
    {
        "id": "community_starter",
        "name": "Community Starter",
        "description": "Created 5 posts in the social feed",
        "icon": "💬",
        "type": "achievement",
        "criteria": {"posts_created": 5},
    },
    {
        "id": "book_worm",
        "name": "Book Worm",
        "description": "Purchased 10 books",
        "icon": "📚",
        "type": "milestone",
        "criteria": {"books_purchased": 10},
    },
]

# Points values for different actions
POINTS = {
    "sale": 10,
    "donation": 15,
    "review": 5,
    "helpful_vote": 2,
    "purchase": 3,
    "post": 2,
}


def check_and_award_badges(user_id: str) -> list[str]:
    """
    Check all badge criteria and award any newly earned badges.

    Returns list of newly awarded badge IDs.
    """
    db = get_db()
    if not db:
        return []

    try:
        user_doc = db.collection("users").document(user_id).get()
        if not user_doc.exists:
            return []

        user_data = user_doc.to_dict()
        gamification = user_data.get("gamification", {})
        existing_badges = set(gamification.get("badges", []))
        trust = user_data.get("trust", {})

        # Gather user stats
        stats = {
            "books_sold": trust.get("books_sold", 0),
            "books_purchased": trust.get("books_purchased", 0),
            "trust_score": trust.get("trust_score", 0),
            "donations": _count_donations(db, user_id),
            "reviews_written": _count_reviews_written(db, user_id),
            "helpful_votes_received": _count_helpful_votes(db, user_id),
            "posts_created": _count_posts(db, user_id),
        }

        # Check each badge definition
        new_badges = []
        for badge in BADGE_DEFINITIONS:
            if badge["id"] in existing_badges:
                continue  # Already awarded

            criteria_met = True
            for key, required in badge["criteria"].items():
                if stats.get(key, 0) < required:
                    criteria_met = False
                    break

            if criteria_met:
                new_badges.append(badge["id"])

        # Award new badges
        if new_badges:
            from firebase_admin import firestore as fs
            all_badges = list(existing_badges | set(new_badges))
            db.collection("users").document(user_id).update({
                "gamification.badges": all_badges,
            })
            logger.info(f"Awarded badges to {user_id[:8]}...: {new_badges}")

        return new_badges

    except Exception as e:
        logger.error(f"Badge check failed for {user_id}: {e}")
        return []


def add_points(user_id: str, action: str, amount: int = None) -> int:
    """
    Add points to a user for an action.

    Args:
        user_id: User ID.
        action: Action type (sale, donation, review, etc.).
        amount: Custom point amount (overrides default).

    Returns:
        New total points.
    """
    from firebase_admin import firestore as fs

    db = get_db()
    if not db:
        return 0

    try:
        pts = amount if amount is not None else POINTS.get(action, 0)
        if pts <= 0:
            return 0

        db.collection("users").document(user_id).update({
            "gamification.points": fs.Increment(pts),
        })

        # Get updated total
        user_doc = db.collection("users").document(user_id).get()
        total = user_doc.to_dict().get("gamification", {}).get("points", 0)

        # Update level (every 100 points = 1 level)
        level = max(1, total // 100 + 1)
        db.collection("users").document(user_id).update({
            "gamification.level": level,
        })

        return total

    except Exception as e:
        logger.warning(f"Failed to add points: {e}")
        return 0


@cache.cached(ttl=300, key_prefix="leaderboard")
def get_leaderboard(
    scope: str = "global",
    metric: str = "trust_score",
    limit: int = 20,
    scope_value: str = None,
) -> list[dict]:
    """
    Get leaderboard data.

    Args:
        scope: 'global', 'college', 'district', 'state'.
        metric: 'sales', 'donations', 'reviews', 'trust_score', 'points'.
        limit: Number of entries.
        scope_value: Filter value for non-global scopes (e.g., college_id).

    Returns:
        List of {user_id, name, avatar_url, score, rank} dicts.
    """
    db = get_db()
    if not db:
        return []

    try:
        # Map metric to Firestore field
        field_map = {
            "trust_score": "trust.trust_score",
            "sales": "trust.books_sold",
            "points": "gamification.points",
        }
        sort_field = field_map.get(metric, "trust.trust_score")

        query = db.collection("users")

        # Scope filtering
        if scope == "college" and scope_value:
            query = query.where("location.college_id", "==", scope_value)
        elif scope == "district" and scope_value:
            query = query.where("location.district", "==", scope_value)
        elif scope == "state" and scope_value:
            query = query.where("location.state", "==", scope_value)

        query = query.order_by(sort_field, direction="DESCENDING").limit(limit)
        docs = query.stream()

        results = []
        for rank, doc in enumerate(docs, 1):
            d = doc.to_dict()
            trust = d.get("trust", {})
            gam = d.get("gamification", {})

            score_map = {
                "trust_score": trust.get("trust_score", 0),
                "sales": trust.get("books_sold", 0),
                "points": gam.get("points", 0),
                "donations": 0,  # Would need separate query
                "reviews": trust.get("total_reviews", 0),
            }

            results.append({
                "rank": rank,
                "user_id": doc.id,
                "name": d.get("name", "Unknown"),
                "avatar_url": d.get("avatar_url", ""),
                "score": score_map.get(metric, 0),
                "badges": gam.get("badges", []),
            })

        return results

    except Exception as e:
        logger.error(f"Leaderboard query failed: {e}")
        return []


def get_user_progress(user_id: str) -> dict:
    """Get a user's current gamification progress."""
    db = get_db()
    if not db:
        return _default_progress()

    try:
        user_doc = db.collection("users").document(user_id).get()
        if not user_doc.exists:
            return _default_progress()

        data = user_doc.to_dict()
        gam = data.get("gamification", {})

        points = gam.get("points", 0)
        level = gam.get("level", 1)
        badges = gam.get("badges", [])

        # Calculate progress to next level
        next_level_points = level * 100
        progress_pct = min(100, round((points % 100) / 100 * 100))

        # Match badge IDs to full definitions
        badge_details = []
        for badge_def in BADGE_DEFINITIONS:
            badge_info = {
                "id": badge_def["id"],
                "name": badge_def["name"],
                "description": badge_def["description"],
                "icon": badge_def["icon"],
                "earned": badge_def["id"] in badges,
            }
            badge_details.append(badge_info)

        return {
            "points": points,
            "level": level,
            "next_level_points": next_level_points,
            "progress_percent": progress_pct,
            "badges": badge_details,
            "badges_earned": len(badges),
            "badges_total": len(BADGE_DEFINITIONS),
        }

    except Exception as e:
        logger.warning(f"Failed to get user progress: {e}")
        return _default_progress()


def get_all_badges() -> list[dict]:
    """Return all badge definitions."""
    return BADGE_DEFINITIONS


# ── Private helpers ───────────────────────────────────────────────────

def _count_donations(db, user_id: str) -> int:
    """Count books listed as donations by user."""
    try:
        count = db.collection("books") \
            .where("owner_id", "==", user_id) \
            .where("listing_type", "==", "donate") \
            .count().get()
        return count[0][0].value if count else 0
    except Exception:
        return 0


def _count_reviews_written(db, user_id: str) -> int:
    """Count reviews written by user."""
    try:
        count = db.collection("reviews") \
            .where("user_id", "==", user_id) \
            .count().get()
        return count[0][0].value if count else 0
    except Exception:
        return 0


def _count_helpful_votes(db, user_id: str) -> int:
    """Count total helpful votes received on user's reviews."""
    try:
        reviews = db.collection("reviews") \
            .where("user_id", "==", user_id) \
            .stream()
        total = 0
        for rdoc in reviews:
            total += len(rdoc.to_dict().get("helpful_votes", []))
        return total
    except Exception:
        return 0


def _count_posts(db, user_id: str) -> int:
    """Count posts created by user."""
    try:
        count = db.collection("posts") \
            .where("user_id", "==", user_id) \
            .count().get()
        return count[0][0].value if count else 0
    except Exception:
        return 0


def _default_progress() -> dict:
    """Return default progress for a new user."""
    return {
        "points": 0,
        "level": 1,
        "next_level_points": 100,
        "progress_percent": 0,
        "badges": [
            {**b, "earned": False} for b in BADGE_DEFINITIONS
        ],
        "badges_earned": 0,
        "badges_total": len(BADGE_DEFINITIONS),
    }
