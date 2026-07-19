import logging
import random
import string
from typing import Optional
from fastapi import Request, HTTPException, status
import firebase_admin
from firebase_admin import auth
from backend.core.database import get_db

logger = logging.getLogger("bookbridge.security")

def verify_firebase_token(token: str) -> Optional[dict]:
    """
    Verifies a Firebase ID token using the Firebase Admin SDK.
    Returns the decoded token dictionary if valid, or raises an exception.
    """
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error(f"Failed to verify Firebase token: {e}")
        return None

def gen_bbid(name: str) -> str:
    """Generates a unique BookBridge ID based on user name."""
    prefix = "".join([c for c in (name or "").upper() if c.isalpha()])[:3] or "BBU"
    return f"BB-{prefix}{''.join(random.choices(string.digits, k=6))}"

def clean_user_dict(u: dict) -> dict:
    """Removes sensitive fields from user dictionary before returning to frontend."""
    if not u:
        return u
    u.pop("password_hash", None)
    return u

def get_user_by_id(uid: str) -> Optional[dict]:
    """Fetches a user profile from Firestore by UID."""
    if not uid:
        return None
    try:
        db = get_db()
        doc = db.collection("users").document(uid).get()
        if doc.exists:
            user_data = doc.to_dict()
            user_data["id"] = doc.id
            return user_data
    except Exception as e:
        logger.error(f"Error fetching user by id: {e}")
    return None

# ==========================================
# Future-proofing: Security Utilities
# ==========================================

def enforce_rate_limit(request: Request):
    """
    Placeholder for API rate limiting.
    Can be expanded using Redis or Firestore to prevent abuse.
    """
    pass

def validate_csrf_token(request: Request):
    """
    Placeholder for CSRF validation for mutating requests.
    """
    pass
