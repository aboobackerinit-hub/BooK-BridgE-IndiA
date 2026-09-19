import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.core.database import get_db
from backend.api.dependencies import require_role

router = APIRouter(prefix="/legal", tags=["legal"])
logger = logging.getLogger("bookbridge.routes.legal")

class LegalPageUpdateIn(BaseModel):
    content: str

@router.get("/{slug}")
def get_legal_page(slug: str):
    db = get_db()
    doc = db.collection("legal_pages").document(slug).get()
    if not doc.exists:
        # Return a fallback text if not found
        return {"content": "Content not found or being updated."}
    return {"content": doc.to_dict().get("content", "")}

@router.put("/{slug}")
def update_legal_page(slug: str, body: LegalPageUpdateIn, user: dict = Depends(require_role("admin"))):
    db = get_db()
    db.collection("legal_pages").document(slug).set({"content": body.content})
    return {"ok": True, "message": "Updated successfully"}
