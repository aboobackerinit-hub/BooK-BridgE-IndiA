import logging
import os
import requests
import random
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends
import firebase_admin
from firebase_admin import auth as firebase_auth, firestore
from backend.core.database import get_db
from backend.core.config import FIREBASE_API_KEY
from backend.core.security import gen_bbid, clean_user_dict, get_user_by_id
from backend.models.schemas import (
    RegisterIn, LoginIn, ResetPasswordIn, ResetPasswordConfirmIn, 
    ChangePasswordIn, DeleteAccountIn, RequestOtpIn, VerifyOtpIn
)
from pydantic import BaseModel
class RefreshIn(BaseModel):
    refresh_token: str

class GoogleLoginIn(BaseModel):
    token: str

from backend.api.dependencies import get_current_user, require_role
from backend.services.email import send_email

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("bookbridge.routes.auth")

@router.post("/request-otp")
def request_otp(body: RequestOtpIn):
    email = body.email.strip().lower()
    db = get_db()
    
    # Check if user already exists
    try:
        firebase_auth.get_user_by_email(email)
        raise HTTPException(400, "This email is already registered. Please sign in instead.")
    except firebase_auth.UserNotFoundError:
        pass # Good, user doesn't exist
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error checking email existence: {e}")
        raise HTTPException(500, "Something went wrong. Please try again.")

    # Rate limiting / Check recent OTP
    otps_ref = db.collection("otps")
    recent = otps_ref.where("email", "==", email).order_by("created_at", direction=firestore.Query.DESCENDING).limit(1).get()
    
    if recent:
        doc_data = recent[0].to_dict()
        created_at = doc_data.get("created_at")
        if created_at:
            # Firestore timestamps are DatetimeWithNanoseconds
            if isinstance(created_at, datetime):
                elapsed = (datetime.now(timezone.utc) - created_at).total_seconds()
                if elapsed < 60: # 60 second cooldown
                    raise HTTPException(429, "Too many attempts. Please try again later.")
                    
    # Generate OTP
    otp = str(random.randint(100000, 999999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Store OTP
    otps_ref.add({
        "email": email,
        "otp": otp, # In a strictly secure env, hash this. For now, it's short-lived.
        "created_at": firestore.SERVER_TIMESTAMP,
        "expires_at": expires_at,
        "attempts": 0,
        "verified": False
    })
    
    # Send Email
    try:
        body_text = f"Your BookBridge India verification code is: {otp}\n\nThis code will expire in 10 minutes.\nIf you did not request this, please ignore this email."
        send_email(email, "Verify your BookBridge Account", body_text)
    except Exception as e:
        logger.error(f"Failed to send OTP email: {e}")
        # In a real setup, don't fake the implementation. We fail if email fails.
        raise HTTPException(500, "Could not send verification email. Please check configuration.")

    return {"ok": True, "message": "OTP sent successfully"}

@router.post("/verify-otp")
def verify_otp(body: VerifyOtpIn):
    email = body.email.strip().lower()
    otp_input = body.otp.strip()
    db = get_db()
    
    otps_ref = db.collection("otps")
    recent = otps_ref.where("email", "==", email).where("verified", "==", False).order_by("created_at", direction=firestore.Query.DESCENDING).limit(1).get()
    
    if not recent:
        raise HTTPException(400, "No pending verification found. Please request a new code.")
        
    doc = recent[0]
    data = doc.to_dict()
    doc_id = doc.id
    
    # Check expiration
    expires_at = data.get("expires_at")
    if expires_at and isinstance(expires_at, datetime) and datetime.now(timezone.utc) > expires_at:
        raise HTTPException(400, "This verification code has expired. Please request a new code.")
        
    # Check attempts
    attempts = data.get("attempts", 0)
    if attempts >= 3:
        raise HTTPException(400, "Too many attempts. Please request a new code.")
        
    if data.get("otp") != otp_input:
        otps_ref.document(doc_id).update({"attempts": attempts + 1})
        raise HTTPException(400, "Incorrect verification code. Please try again.")
        
    # Generate a secure verification token for the final register step
    verification_token = str(uuid.uuid4())
    
    otps_ref.document(doc_id).update({
        "verified": True,
        "verification_token": verification_token
    })
    
    return {"ok": True, "verification_token": verification_token}


@router.post("/register")
def register(body: RegisterIn):
    effective_role = "user" if body.role in ("user", "customer", "") else body.role
    if effective_role not in ("user", "store_owner", "publisher", "admin"):
        raise HTTPException(400, "Invalid role")
    body.role = effective_role
    
    email = body.email.strip().lower()
    name = body.name.strip()
    
    # Enforce OTP Verification
    db = get_db()
    if not body.verification_token:
        raise HTTPException(400, "Email verification is required. Please verify your email first.")
        
    verified_docs = db.collection("otps").where("email", "==", email).where("verification_token", "==", body.verification_token).where("verified", "==", True).limit(1).get()
    if not verified_docs:
        raise HTTPException(400, "Invalid verification token. Please verify your email again.")
    try:
        # Create Firebase Auth user
        try:
            fb_user = firebase_auth.create_user(
                email=email,
                password=body.password,
                display_name=name
            )
        except Exception as e:
            err_str = str(e).lower()
            if "already" in err_str or "exists" in err_str:
                raise HTTPException(400, "Email already registered. Please login instead.")
            logger.error(f"Firebase Auth create user error: {e}")
            raise HTTPException(400, "Could not create user account. Check email format and password (min 6 characters).")

        # Save to Firestore
        row = {
            "email": email,
            "name": name,
            "role": body.role,
            "bbid": gen_bbid(name),
        }
        try:
            from firebase_admin import firestore
            db = get_db()
            if db:
                db_row = dict(row)
                db_row["created_at"] = firestore.SERVER_TIMESTAMP
                db.collection("users").document(fb_user.uid).set(db_row)
        except Exception as db_err:
            logger.warning(f"Firestore set user profile warning during register: {db_err}")

        row["id"] = fb_user.uid
        
        # Return a token immediately using REST API
        fallback_key = "AIzaSyC1_gTlEJ_PMmd4GHdbforK7l3R9IcOQ9I"
        api_key = FIREBASE_API_KEY if (FIREBASE_API_KEY and len(FIREBASE_API_KEY) > 10) else fallback_key
        login_payload = {
            "email": email,
            "password": body.password,
            "returnSecureToken": True
        }
        res = requests.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
            json=login_payload
        )
        if res.status_code != 200:
            res = requests.post(
                f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={fallback_key}",
                json=login_payload
            )
        if res.status_code == 200:
            data = res.json()
            token = data.get("idToken")
            refresh_token = data.get("refreshToken")
            return {"token": token, "refreshToken": refresh_token, "user": clean_user_dict(row)}
        
        return {"token": "firebase_token_pending", "refreshToken": "", "user": clean_user_dict(row)}
            
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in register: {str(e)}")
        raise HTTPException(500, "Internal Server Error during registration")

@router.post("/login")
def login(body: LoginIn):
    email = body.email.strip().lower()
    raw_password = body.password
    clean_password = body.password.strip()
    
    fallback_key = "AIzaSyC1_gTlEJ_PMmd4GHdbforK7l3R9IcOQ9I"
    api_key = FIREBASE_API_KEY if (FIREBASE_API_KEY and len(FIREBASE_API_KEY) > 10) else fallback_key
    
    try:
        # First attempt with user provided raw password
        login_payload = {
            "email": email,
            "password": raw_password,
            "returnSecureToken": True
        }
        res = requests.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
            json=login_payload
        )
        
        # If failed and clean_password != raw_password, attempt with trimmed password
        if res.status_code != 200 and clean_password != raw_password:
            login_payload["password"] = clean_password
            res = requests.post(
                f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
                json=login_payload
            )

        # If Vercel env key failed, attempt with fallback key
        if res.status_code != 200 and ("api key not valid" in res.text.lower() or "api_key_invalid" in res.text.lower()):
            api_key = fallback_key
            login_payload["password"] = raw_password
            res = requests.post(
                f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
                json=login_payload
            )
            if res.status_code != 200 and clean_password != raw_password:
                login_payload["password"] = clean_password
                res = requests.post(
                    f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
                    json=login_payload
                )

        if res.status_code != 200:
            error_code = res.json().get("error", {}).get("message", "UNKNOWN")
            logger.error(f"Firebase REST API Error during login: {res.status_code} {res.text}")
            
            friendly_errors = {
                "EMAIL_NOT_FOUND": "No account found with this email address. Please check your email or sign up.",
                "INVALID_PASSWORD": "Incorrect password. Please try again or reset your password.",
                "INVALID_LOGIN_CREDENTIALS": "Incorrect email or password. Please check your credentials.",
                "USER_DISABLED": "This user account has been disabled. Please contact support.",
                "TOO_MANY_ATTEMPTS_TRY_LATER": "Too many failed login attempts. Please try again later.",
                "INVALID_EMAIL": "Invalid email address format.",
            }
            error_message = friendly_errors.get(error_code, f"Login failed: {error_code.replace('_', ' ').capitalize()}")
            raise HTTPException(400, error_message)
            
        data = res.json()
        token = data.get("idToken")
        refresh_token = data.get("refreshToken")
        uid = data.get("localId")
        
        # Fetch user profile (auto-heals if missing in Firestore)
        user = get_user_by_id(uid)
        if not user:
            # Fallback user structure if get_user_by_id completely failed
            name = email.split("@")[0].capitalize()
            role = "admin" if email in ("admin@bookbridge.in", "aboobacker.init@gmail.com") else "user"
            user = {
                "id": uid,
                "email": email,
                "name": name,
                "role": role,
                "bbid": gen_bbid(name)
            }
            
        if user.get("suspended"):
            raise HTTPException(403, "Account suspended. Contact admin.")
            
        return {"token": token, "refreshToken": refresh_token, "user": clean_user_dict(user)}
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in login: {str(e)}")
        raise HTTPException(500, "Internal Server Error during login")

@router.post("/login-google")
def login_google(body: GoogleLoginIn):
    try:
        # Verify Firebase Token
        decoded_token = firebase_auth.verify_id_token(body.token)
        uid = decoded_token["uid"]
        email = decoded_token.get("email", "").lower()
        
        # Check if user exists in Firestore
        user = get_user_by_id(uid)
        
        # If user doesn't exist by UID, check if they exist by Email (Account Linking)
        if not user:
            db = get_db()
            users = db.collection("users").where("email", "==", email).limit(1).get()
            if users:
                user = users[0].to_dict()
                user["id"] = users[0].id
                
        if not user:
            raise HTTPException(404, "User not found. Please complete registration.")
            
        if user.get("suspended"):
            raise HTTPException(403, "Account suspended. Contact admin.")
            
        # We can just return the same token since it's a valid Firebase token
        # But we don't have a refresh token from verify_id_token.
        # The frontend SDK manages refresh anyway if using Google Provider, 
        # but for our local system, let's just return the idToken.
        return {"token": body.token, "refreshToken": "", "user": clean_user_dict(user)}
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Google Login error: {e}")
        raise HTTPException(401, "Invalid Google token")

@router.post("/refresh")
def refresh_token(body: RefreshIn):
    try:
        fallback_key = "AIzaSyC1_gTlEJ_PMmd4GHdbforK7l3R9IcOQ9I"
        api_key = FIREBASE_API_KEY if (FIREBASE_API_KEY and len(FIREBASE_API_KEY) > 10) else fallback_key
        payload = {
            "grant_type": "refresh_token",
            "refresh_token": body.refresh_token
        }
        res = requests.post(
            f"https://securetoken.googleapis.com/v1/token?key={api_key}",
            json=payload
        )
        if res.status_code != 200:
            res = requests.post(
                f"https://securetoken.googleapis.com/v1/token?key={fallback_key}",
                json=payload
            )
            
        if res.status_code == 200:
            data = res.json()
            return {
                "token": data.get("id_token"),
                "refreshToken": data.get("refresh_token")
            }
        else:
            raise HTTPException(401, "Invalid refresh token")
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Refresh token error: {e}")
        raise HTTPException(500, "Could not refresh token")

@router.post("/reset-password")
def reset_password(body: ResetPasswordIn):
    try:
        email = body.email.strip().lower()
        fallback_key = "AIzaSyC1_gTlEJ_PMmd4GHdbforK7l3R9IcOQ9I"
        api_key = FIREBASE_API_KEY if (FIREBASE_API_KEY and len(FIREBASE_API_KEY) > 10) else fallback_key
        
        res = requests.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={api_key}",
            json={"requestType": "PASSWORD_RESET", "email": email}
        )
        if res.status_code != 200:
            requests.post(
                f"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={fallback_key}",
                json={"requestType": "PASSWORD_RESET", "email": email}
            )
        return {"ok": True, "message": "Password reset email sent. Please check your inbox."}
    except Exception as e:
        logger.error(f"Reset password failed: {e}")
        return {"ok": True, "message": "Password reset email sent. Please check your inbox."}

@router.post("/admin-reset-password")
def auth_admin_reset_password(body: dict, user: dict = Depends(require_role("admin"))):
    user_id = body.get("user_id") or body.get("email") or body.get("id")
    new_password = body.get("new_password") or "Password123!"
    
    if not user_id:
        raise HTTPException(400, "user_id or email required")
    if len(new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    db = get_db()
    user_doc = db.collection("users").document(user_id).get()
    auth_uid = user_id
    if not user_doc.exists:
        users = db.collection("users").where("email", "==", user_id.lower()).limit(1).get()
        if users:
            auth_uid = users[0].id
            user_doc = users[0]

    try:
        from firebase_admin import auth as firebase_auth
        try:
            firebase_auth.update_user(auth_uid, password=new_password)
        except Exception:
            email = user_doc.to_dict().get("email") if user_doc.exists else (user_id if "@" in user_id else None)
            if email:
                fb_user = firebase_auth.get_user_by_email(email)
                firebase_auth.update_user(fb_user.uid, password=new_password)
            else:
                raise
        return {"ok": True, "message": f"Password reset successfully to '{new_password}'"}
    except Exception as e:
        logger.error(f"Admin reset password error: {e}")
        raise HTTPException(400, f"Could not reset password: {str(e)}")

@router.post("/reset-password/confirm")
def reset_password_confirm(body: ResetPasswordConfirmIn):
    # This endpoint in Firebase is usually handled by the Firebase-generated link itself.
    # If the user lands back on our frontend and we pass the OobCode back, we can verify it.
    if not FIREBASE_API_KEY:
        raise HTTPException(500, "Firebase Web API Key is missing.")
        
    payload = {
        "oobCode": body.token,
        "newPassword": body.new_password
    }
    res = requests.post(
        f"https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key={FIREBASE_API_KEY}",
        json=payload
    )
    if res.status_code == 200:
        return {"ok": True, "message": "Password updated successfully"}
    else:
        raise HTTPException(400, "Invalid or expired reset link.")

@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return user

@router.post("/logout")
def logout(user: dict = Depends(get_current_user)):
    return {"ok": True}

@router.post("/change-password")
def change_password(body: ChangePasswordIn, user: dict = Depends(get_current_user)):
    if len(body.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
        
    # Verify current password via REST
    login_payload = {
        "email": user["email"],
        "password": body.current_password,
        "returnSecureToken": True
    }
    res = requests.post(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}",
        json=login_payload
    )
    if res.status_code != 200:
        raise HTTPException(400, "Current password is incorrect")
        
    firebase_auth.update_user(
        user["id"],
        password=body.new_password
    )
    return {"ok": True}

@router.post("/delete-account")
def delete_account(body: DeleteAccountIn, user: dict = Depends(get_current_user)):
    if user.get("role") == "admin":
        raise HTTPException(400, "Admin account cannot be deleted")
        
    # Verify password first
    login_payload = {
        "email": user["email"],
        "password": body.password,
        "returnSecureToken": True
    }
    res = requests.post(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}",
        json=login_payload
    )
    if res.status_code != 200:
        raise HTTPException(400, "Password is incorrect")
    
    try:
        # Delete from Firestore
        db = get_db()
        db.collection("users").document(user["id"]).delete()
        
        # Delete from Firebase Auth
        firebase_auth.delete_user(user["id"])
        
        return {"ok": True}
    except Exception as e:
        logger.error(f"Error deleting account: {e}")
        raise HTTPException(500, "Internal server error")
