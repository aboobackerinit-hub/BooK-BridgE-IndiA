import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from backend.core.database import get_db
from backend.api.dependencies import require_role, get_current_user
from pydantic import BaseModel
from typing import Optional, List

logger = logging.getLogger("bookbridge.promotions")
router = APIRouter(prefix="/promotions", tags=["promotions"])


# ── Schemas ────────────────────────────────────────────────────────────

class LabelIn(BaseModel):
    name: str
    color: str = "green"          # preset: green | teal | amber | blue | red | purple
    bookIds: List[str] = []
    enabled: bool = True
    priority: int = 0
    startAt: Optional[str] = None   # ISO string or null
    endAt: Optional[str] = None


class BannerIn(BaseModel):
    type: str = "banner"            # banner | countdown | special_day | campaign
    title: str
    subtitle: Optional[str] = ""
    imageUrl: Optional[str] = ""
    buttonText: Optional[str] = ""
    buttonAction: Optional[str] = "/store"
    startAt: Optional[str] = None
    endAt: Optional[str] = None
    enabled: bool = True
    priority: int = 0
    countdownTarget: Optional[str] = None   # ISO datetime for countdown type
    featuredBookIds: List[str] = []


# ── Helpers ────────────────────────────────────────────────────────────

def _now_utc():
    return datetime.now(timezone.utc).isoformat()


def _is_date_active(start_at: Optional[str], end_at: Optional[str]) -> bool:
    """Return True if current time is within the configured date range."""
    now = datetime.now(timezone.utc)
    if start_at:
        try:
            start = datetime.fromisoformat(start_at.replace("Z", "+00:00"))
            if now < start:
                return False
        except Exception:
            pass
    if end_at:
        try:
            end = datetime.fromisoformat(end_at.replace("Z", "+00:00"))
            if now > end:
                return False
        except Exception:
            pass
    return True


def _doc_to_dict(doc) -> dict:
    d = doc.to_dict() or {}
    d["id"] = doc.id
    return d


# ══════════════════════════════════════════════════════════════════════
#  LABELS — PUBLIC READ
# ══════════════════════════════════════════════════════════════════════

@router.get("/labels")
def get_active_labels():
    """
    Public endpoint. Returns all enabled, date-valid labels.
    Frontend uses this to map bookId → labels[].
    """
    db = get_db()
    docs = db.collection("store_labels").where("enabled", "==", True).stream()
    results = []
    for doc in docs:
        d = _doc_to_dict(doc)
        if _is_date_active(d.get("startAt"), d.get("endAt")):
            results.append(d)
    # Sort by priority (lower = higher priority displayed first)
    results.sort(key=lambda x: x.get("priority", 0))
    return results


# ══════════════════════════════════════════════════════════════════════
#  LABELS — ADMIN CRUD
# ══════════════════════════════════════════════════════════════════════

@router.get("/admin/labels")
def admin_get_all_labels(user: dict = Depends(require_role("admin"))):
    """Admin: get ALL labels (including disabled/expired)."""
    db = get_db()
    docs = db.collection("store_labels").stream()
    return [_doc_to_dict(d) for d in docs]


@router.post("/admin/labels")
def admin_create_label(data: LabelIn, user: dict = Depends(require_role("admin"))):
    db = get_db()
    now = _now_utc()
    payload = {
        **data.dict(),
        "createdAt": now,
        "updatedAt": now,
    }
    ref = db.collection("store_labels").document()
    ref.set(payload)
    logger.info(f"Admin {user['id']} created label '{data.name}' [{ref.id}]")
    return {"id": ref.id, **payload}


@router.put("/admin/labels/{label_id}")
def admin_update_label(label_id: str, data: LabelIn, user: dict = Depends(require_role("admin"))):
    db = get_db()
    ref = db.collection("store_labels").document(label_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Label not found")
    payload = {
        **data.dict(),
        "updatedAt": _now_utc(),
    }
    ref.update(payload)
    logger.info(f"Admin {user['id']} updated label {label_id}")
    return {"id": label_id, **payload}


@router.delete("/admin/labels/{label_id}")
def admin_delete_label(label_id: str, user: dict = Depends(require_role("admin"))):
    db = get_db()
    ref = db.collection("store_labels").document(label_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Label not found")
    ref.delete()
    logger.info(f"Admin {user['id']} deleted label {label_id}")
    return {"ok": True}


@router.patch("/admin/labels/{label_id}/toggle")
def admin_toggle_label(label_id: str, user: dict = Depends(require_role("admin"))):
    db = get_db()
    ref = db.collection("store_labels").document(label_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Label not found")
    current = doc.to_dict().get("enabled", True)
    ref.update({"enabled": not current, "updatedAt": _now_utc()})
    return {"id": label_id, "enabled": not current}


# ══════════════════════════════════════════════════════════════════════
#  BANNERS / PROMOTIONS — PUBLIC READ
# ══════════════════════════════════════════════════════════════════════

@router.get("/banners")
def get_active_banners():
    """
    Public endpoint. Returns all enabled, date-valid promotions
    sorted by priority. Frontend displays the top-priority banner.
    """
    db = get_db()
    docs = db.collection("promotions").where("enabled", "==", True).stream()
    results = []
    for doc in docs:
        d = _doc_to_dict(doc)
        if _is_date_active(d.get("startAt"), d.get("endAt")):
            results.append(d)
    results.sort(key=lambda x: x.get("priority", 0))
    return results


# ══════════════════════════════════════════════════════════════════════
#  BANNERS / PROMOTIONS — ADMIN CRUD
# ══════════════════════════════════════════════════════════════════════

@router.get("/admin/banners")
def admin_get_all_banners(user: dict = Depends(require_role("admin"))):
    """Admin: get ALL promotions (including disabled/expired)."""
    db = get_db()
    docs = db.collection("promotions").stream()
    results = []
    for doc in docs:
        d = _doc_to_dict(doc)
        # Compute status for admin display
        now = datetime.now(timezone.utc).isoformat()
        if not d.get("enabled"):
            d["status"] = "draft"
        elif d.get("startAt") and d["startAt"] > now:
            d["status"] = "scheduled"
        elif d.get("endAt") and d["endAt"] < now:
            d["status"] = "expired"
        else:
            d["status"] = "active"
        results.append(d)
    return results


@router.post("/admin/banners")
def admin_create_banner(data: BannerIn, user: dict = Depends(require_role("admin"))):
    db = get_db()
    now = _now_utc()
    payload = {
        **data.dict(),
        "createdAt": now,
        "updatedAt": now,
    }
    ref = db.collection("promotions").document()
    ref.set(payload)
    logger.info(f"Admin {user['id']} created promotion '{data.title}' [{ref.id}]")
    return {"id": ref.id, **payload}


@router.put("/admin/banners/{banner_id}")
def admin_update_banner(banner_id: str, data: BannerIn, user: dict = Depends(require_role("admin"))):
    db = get_db()
    ref = db.collection("promotions").document(banner_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Promotion not found")
    payload = {
        **data.dict(),
        "updatedAt": _now_utc(),
    }
    ref.update(payload)
    logger.info(f"Admin {user['id']} updated promotion {banner_id}")
    return {"id": banner_id, **payload}


@router.delete("/admin/banners/{banner_id}")
def admin_delete_banner(banner_id: str, user: dict = Depends(require_role("admin"))):
    db = get_db()
    ref = db.collection("promotions").document(banner_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Promotion not found")
    ref.delete()
    logger.info(f"Admin {user['id']} deleted promotion {banner_id}")
    return {"ok": True}


@router.patch("/admin/banners/{banner_id}/toggle")
def admin_toggle_banner(banner_id: str, user: dict = Depends(require_role("admin"))):
    db = get_db()
    ref = db.collection("promotions").document(banner_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Promotion not found")
    current = doc.to_dict().get("enabled", True)
    ref.update({"enabled": not current, "updatedAt": _now_utc()})
    return {"id": banner_id, "enabled": not current}
