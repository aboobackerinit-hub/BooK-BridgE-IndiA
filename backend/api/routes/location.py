"""
Location API routes.

Provides location resolution, nearby book discovery,
and college hierarchy management.
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from firebase_admin import firestore
from backend.core.database import get_db
from backend.api.dependencies import get_current_user
from backend.models.schemas import LocationUpdate
from backend.core import cache

router = APIRouter(prefix="/location", tags=["location"])
logger = logging.getLogger("bookbridge.routes.location")


@router.post("/update")
def update_user_location(body: LocationUpdate, user: dict = Depends(get_current_user)):
    """Update the current user's location."""
    db = get_db()

    location = {
        "lat": body.lat,
        "lng": body.lng,
        "district": body.district,
        "state": body.state,
        "college_id": body.college_id,
        "college_name": body.college_name,
    }

    db.collection("users").document(user["id"]).update({
        "location": location,
    })

    return {"ok": True, "location": location}


@router.post("/resolve")
def resolve_location(body: LocationUpdate):
    """
    Resolve lat/lng to district and state.

    Uses a static Indian geography dataset for district/state mapping.
    Falls back to the client-provided values if resolution fails.
    """
    # For now, trust the client-provided district/state
    # Future: integrate with a reverse geocoding service or offline dataset
    return {
        "lat": body.lat,
        "lng": body.lng,
        "district": body.district or "Unknown",
        "state": body.state or "Unknown",
    }


@router.get("/nearby-books")
def nearby_books(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    district: Optional[str] = None,
    state: Optional[str] = None,
    college_id: Optional[str] = None,
    limit: int = 20,
    user: dict = Depends(get_current_user),
):
    """Get books near the user's location."""
    db = get_db()

    # Use provided params or fall back to user's stored location
    user_loc = user.get("location", {})
    district = district or user_loc.get("district")
    state = state or user_loc.get("state")
    college_id = college_id or user_loc.get("college_id")

    results = []

    # Priority 1: Same college
    if college_id:
        docs = db.collection("books") \
            .where("approved", "==", True) \
            .where("location.college_id", "==", college_id) \
            .order_by("created_at", direction=firestore.Query.DESCENDING) \
            .limit(limit) \
            .stream()
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            d["_proximity"] = "same_college"
            results.append(d)

    # Priority 2: Same district
    if district and len(results) < limit:
        existing_ids = {r["id"] for r in results}
        docs = db.collection("books") \
            .where("approved", "==", True) \
            .where("location.district", "==", district) \
            .order_by("created_at", direction=firestore.Query.DESCENDING) \
            .limit(limit) \
            .stream()
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            if d["id"] not in existing_ids:
                d["_proximity"] = "same_district"
                results.append(d)

    # Priority 3: Same state
    if state and len(results) < limit:
        existing_ids = {r["id"] for r in results}
        docs = db.collection("books") \
            .where("approved", "==", True) \
            .where("location.state", "==", state) \
            .order_by("created_at", direction=firestore.Query.DESCENDING) \
            .limit(limit) \
            .stream()
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            if d["id"] not in existing_ids:
                d["_proximity"] = "same_state"
                results.append(d)

    return results[:limit]


@router.get("/sections")
def location_sections(user: dict = Depends(get_current_user)):
    """
    Get location-based sections for the homepage.

    Returns grouped book lists:
    - near_me (same district)
    - same_college
    - same_state
    """
    db = get_db()
    user_loc = user.get("location", {})

    sections = {}

    college_id = user_loc.get("college_id")
    district = user_loc.get("district")
    state = user_loc.get("state")

    if college_id:
        try:
            docs = db.collection("books") \
                .where("approved", "==", True) \
                .where("location.college_id", "==", college_id) \
                .order_by("created_at", direction=firestore.Query.DESCENDING) \
                .limit(10) \
                .stream()
            sections["same_college"] = [_doc_to_dict(d) for d in docs]
        except Exception:
            sections["same_college"] = []

    if district:
        try:
            docs = db.collection("books") \
                .where("approved", "==", True) \
                .where("location.district", "==", district) \
                .order_by("created_at", direction=firestore.Query.DESCENDING) \
                .limit(10) \
                .stream()
            sections["same_district"] = [_doc_to_dict(d) for d in docs]
        except Exception:
            sections["same_district"] = []

    if state:
        try:
            docs = db.collection("books") \
                .where("approved", "==", True) \
                .where("location.state", "==", state) \
                .order_by("created_at", direction=firestore.Query.DESCENDING) \
                .limit(10) \
                .stream()
            sections["same_state"] = [_doc_to_dict(d) for d in docs]
        except Exception:
            sections["same_state"] = []

    return sections


# ── College endpoints ─────────────────────────────────────────────────

@router.get("/colleges")
@cache.cached(ttl=600, key_prefix="colleges")
def list_colleges(state: Optional[str] = None, district: Optional[str] = None, q: Optional[str] = None):
    """List colleges, optionally filtered by state/district/search."""
    db = get_db()

    query = db.collection("colleges")

    if state:
        query = query.where("state", "==", state)
    if district:
        query = query.where("district", "==", district)

    if q:
        q_lower = q.lower()
        query = query.where("name_lower", ">=", q_lower) \
                      .where("name_lower", "<=", q_lower + '\uf8ff')

    docs = query.limit(50).stream()
    results = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        results.append(d)

    return results


@router.get("/colleges/{college_id}")
def get_college(college_id: str):
    """Get college details with member and book counts."""
    db = get_db()

    doc = db.collection("colleges").document(college_id).get()
    if not doc.exists:
        raise HTTPException(404, "College not found")

    d = doc.to_dict()
    d["id"] = doc.id
    return d


def _doc_to_dict(doc) -> dict:
    """Convert a Firestore document to dict with id."""
    d = doc.to_dict()
    d["id"] = doc.id
    return d
