import traceback
import json
import sys
import os

def build_error_app(err_msg, tb_msg):
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse
    error_app = FastAPI()
    @error_app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
    async def catch_all(request: Request, path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Backend initialization failed",
                "details": err_msg,
                "traceback": tb_msg
            }
        )
    return error_app

try:
    from fastapi import FastAPI, APIRouter, Request, HTTPException, Depends
    from starlette.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    from supabase import create_client, Client
    import base64
    import logging
    from pydantic import BaseModel, Field, EmailStr
    from typing import List, Optional
    import uuid
    import random
    import string
    import hashlib
    import secrets
    import jwt
    from datetime import datetime, timezone, timedelta
    from dotenv import load_dotenv
    from pathlib import Path

    load_dotenv(Path(__file__).parent / '.env')
    load_dotenv(Path(__file__).parent.parent / '.env.local')

    # ---------- Setup ----------
    SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or ""
    service_role = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not service_role or "your-" in service_role:
        service_role = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or ""
    SUPABASE_SERVICE_ROLE_KEY = service_role
    JWT_SECRET = os.environ.get("JWT_SECRET") or "dev-secret-please-set-in-env"

    os.environ["SUPABASE_URL"] = SUPABASE_URL
    os.environ["SUPABASE_SERVICE_ROLE_KEY"] = SUPABASE_SERVICE_ROLE_KEY

    sb: Optional[Client] = None
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        except Exception as _e:
            pass

    JWT_ALG = "HS256"
    JWT_EXPIRE_HOURS = 24 * 7  # 7 days
    BUCKET = "images"
    
    app = FastAPI(title="BookBridge India API (Supabase)")
    api = APIRouter()
    
    @api.get("/health")
    def health():
        return {"ok": True}

    def hash_password(pw: str) -> str:
        salt = secrets.token_hex(16)
        hashed = hashlib.pbkdf2_hmac('sha256', pw.encode(), salt.encode(), 100000).hex()
        return f"pbkdf2:sha256:100000${salt}${hashed}"

    def verify_password(pw: str, hashed: str) -> bool:
        if not hashed: return False
        try:
            parts = hashed.split("$")
            if len(parts) == 5 and parts[0] == "pbkdf2:sha256:100000":
                salt = parts[1]
                h = parts[2]
                test_hash = hashlib.pbkdf2_hmac('sha256', pw.encode(), salt.encode(), 100000).hex()
                return h == test_hash
            return False
        except Exception:
            return False

    def create_token(user_id: str) -> str:
        exp = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
        return jwt.encode({"sub": user_id, "exp": exp}, JWT_SECRET, algorithm=JWT_ALG)

    def verify_token(token: str) -> Optional[str]:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
            return payload.get("sub")
        except:
            return None

    def clean(user_dict: dict) -> dict:
        return {k: v for k, v in user_dict.items() if k != "password_hash"}

    def get_current_user(request: Request):
        auth = request.headers.get("Authorization")
        if not auth or not auth.startswith("Bearer "): raise HTTPException(401, "Missing token")
        token = auth.split(" ")[1]
        uid = verify_token(token)
        if not uid: raise HTTPException(401, "Invalid or expired token")
        res = sb.table("users").select("*").eq("id", uid).limit(1).execute()
        if not res.data: raise HTTPException(401, "User not found")
        return res.data[0]

    class RegisterIn(BaseModel):
        email: EmailStr
        password: str
        name: str
        role: str = "user"

    @api.post("/auth/register")
    def register(body: RegisterIn):
        if body.role not in ("user", "store_owner", "publisher"): raise HTTPException(400, "Invalid role")
        email = body.email.lower()
        existing = sb.table("users").select("id").eq("email", email).limit(1).execute()
        if existing.data: raise HTTPException(400, "Email already registered")
        
        row = {
            "email": email,
            "password_hash": hash_password(body.password),
            "name": body.name,
            "role": body.role,
            "bbid": f"BB-{uuid.uuid4().hex[:6].upper()}"
        }
        res = sb.table("users").insert(row).execute()
        user = res.data[0]
        return {"token": create_token(user["id"]), "user": clean(user)}

    app.include_router(api, prefix="/api")
    app.include_router(api)

    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
        allow_methods=["*"],
        allow_headers=["*"],
    )

except Exception as e:
    err_msg = str(e)
    tb_msg = traceback.format_exc()
    app = build_error_app(err_msg, tb_msg)

__all__ = ["app"]
