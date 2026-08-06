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
    """Fetches a user profile from Firestore by UID with auto-healing fallback."""
    if not uid:
        return None
    try:
        db = get_db()
        if db:
            doc = db.collection("users").document(uid).get()
            if doc.exists:
                user_data = doc.to_dict()
                user_data["id"] = doc.id
                return user_data
    except Exception as e:
        logger.error(f"Error fetching user by id from Firestore: {e}")

    # Fallback / Auto-healing: fetch from Firebase Admin Auth if missing from Firestore
    try:
        fb_user = auth.get_user(uid)
        email = fb_user.email or ""
        name = fb_user.display_name or (email.split("@")[0].capitalize() if email else "User")
        role = "admin" if email.lower() in ("admin@bookbridge.in", "aboobacker.init@gmail.com") else "user"
        bbid = gen_bbid(name)
        
        user_data = {
            "id": uid,
            "email": email,
            "name": name,
            "role": role,
            "bbid": bbid
        }
        
        # Try creating the missing Firestore document for future calls
        try:
            db = get_db()
            if db:
                db.collection("users").document(uid).set({
                    "email": email,
                    "name": name,
                    "role": role,
                    "bbid": bbid
                })
        except Exception as set_err:
            logger.warning(f"Could not auto-heal user doc in Firestore: {set_err}")
            
        return user_data
    except Exception as fb_err:
        logger.error(f"Error auto-healing user profile from Firebase Auth: {fb_err}")
        
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
