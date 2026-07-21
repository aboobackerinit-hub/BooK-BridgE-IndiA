import logging
import os
import requests
from fastapi import APIRouter, HTTPException, Depends
import firebase_admin
from firebase_admin import auth as firebase_auth
from backend.core.database import get_db
from backend.core.config import FIREBASE_API_KEY
from backend.core.security import gen_bbid, clean_user_dict, get_user_by_id
from backend.models.schemas import (
    RegisterIn, LoginIn, ResetPasswordIn, ResetPasswordConfirmIn, 
    ChangePasswordIn, DeleteAccountIn
)
from backend.api.dependencies import get_current_user
from backend.services.email import send_email

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("bookbridge.routes.auth")

@router.post("/register")
def register(body: RegisterIn):
    if body.role not in ("user", "store_owner", "publisher"):
        raise HTTPException(400, "Invalid role")
    
    email = body.email.lower()
    try:
        # Create Firebase Auth user
        try:
            fb_user = firebase_auth.create_user(
                email=email,
                password=body.password,
                display_name=body.name
            )
        except firebase_admin.exceptions.AlreadyExistsError:
            raise HTTPException(400, "Email already registered")
        except Exception as e:
            logger.error(f"Firebase Auth create user error: {e}")
            raise HTTPException(400, "Could not create user account")

        # Save to Firestore
        from firebase_admin import firestore
        db = get_db()
        row = {
            "email": email,
            "name": body.name,
            "role": body.role,
            "bbid": gen_bbid(body.name),
            "created_at": firestore.SERVER_TIMESTAMP
        }
        db.collection("users").document(fb_user.uid).set(row)
        
        row["id"] = fb_user.uid
        
        # To return a token immediately like before, we use the REST API to login
        login_payload = {
            "email": email,
            "password": body.password,
            "returnSecureToken": True
        }
        res = requests.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}",
            json=login_payload
        )
        if res.status_code == 200:
            token = res.json().get("idToken")
            
            # Remove Sentinel object so FastAPI can serialize to JSON
            row.pop("created_at", None)
            
            return {"token": token, "user": clean_user_dict(row)}
        else:
            logger.error(f"Firebase REST API Error during register: {res.status_code} {res.text}")
            row.pop("created_at", None)
            # Fallback if API key is invalid/missing during migration
            return {"token": "firebase_token_pending", "user": clean_user_dict(row)}
            
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in register: {str(e)}")
        raise HTTPException(500, "Internal Server Error")

@router.post("/login")
def login(body: LoginIn):
    email = body.email.lower()
    
    if not FIREBASE_API_KEY:
        raise HTTPException(500, "Firebase Web API Key is missing. Login requires REST API.")
        
    try:
        login_payload = {
            "email": email,
            "password": body.password,
            "returnSecureToken": True
        }
        res = requests.post(
            f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}",
            json=login_payload
        )
        
        if res.status_code != 200:
            logger.error(f"Firebase REST API Error during login: {res.status_code} {res.text}")
            raise HTTPException(401, "Invalid email or password")
            
        data = res.json()
        token = data.get("idToken")
        uid = data.get("localId")
        
        user = get_user_by_id(uid)
        if not user:
            raise HTTPException(401, "User profile not found in database")
            
        if user.get("suspended"):
            raise HTTPException(403, "Account suspended. Contact admin.")
            
        return {"token": token, "user": clean_user_dict(user)}
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error in login: {str(e)}")
        raise HTTPException(500, "Internal Server Error")

@router.post("/reset-password")
def reset_password(body: ResetPasswordIn):
    try:
        # Use Firebase Admin to generate a reset link
        link = firebase_auth.generate_password_reset_link(body.email)
        
        # Alternatively, using REST API sendOobCode:
        # requests.post(f"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={FIREBASE_API_KEY}", json={"requestType":"PASSWORD_RESET", "email":body.email})
        
        # We will let Firebase send the email natively via REST if we prefer, but for backward compatibility,
        # we can just use our send_email and send the generated link.
        db = get_db()
        users = db.collection("users").where("email", "==", body.email).limit(1).get()
        if not users:
            return {"ok": True, "message": "Password reset email sent."}
            
        user = users[0].to_dict()
        body_text = f"Hi {user.get('name', 'User')},\n\nPlease click the link below to reset your password:\n\n{link}\n\nThis link will expire soon."
        send_email(body.email, "Password Reset Request", body_text)

        return {"ok": True, "message": "Password reset email sent."}
    except Exception as e:
        logger.error(f"Reset password failed: {e}")
        return {"ok": True, "message": "Password reset email sent."} # Always succeed to prevent email enumeration

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
