from fastapi import APIRouter
import os
from backend.core.database import get_db

router = APIRouter()

@router.get("/health")
def health():
    """Diagnostic endpoint — safe to expose; does not leak secrets."""
    info = {
        "ok": True,
        "firebase_project_id": os.environ.get("FIREBASE_PROJECT_ID"),
        "python_version": os.sys.version.split()[0],
    }
    # Try a live query
    try:
        db = get_db()
        users_ref = db.collection("users").limit(1).get()
        info["db_reachable"] = True
    except Exception as e:
        info["db_reachable"] = False
        info["db_error"] = str(e)[:200]
    return info
