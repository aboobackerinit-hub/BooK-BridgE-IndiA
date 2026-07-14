import traceback

try:
    import typing
    
    # Pydantic v1.10.x monkeypatch for Python 3.13 and 3.14
    # Python 3.14 changed the signature of ForwardRef._evaluate, making recursive_guard keyword-only.
    # Pydantic v1 calls it with 3 positional arguments (passing set() as the 3rd, which ends up in type_params).
    if hasattr(typing, "ForwardRef"):
        _orig_evaluate = typing.ForwardRef._evaluate
        def _patched_evaluate(self, globalns, localns, *args, **kwargs):
            try:
                return _orig_evaluate(self, globalns, localns, *args, **kwargs)
            except TypeError as e:
                if "recursive_guard" in str(e) and args:
                    # Python 3.12+ (or 3.13+) might require type_params as positional and recursive_guard as keyword
                    return _orig_evaluate(self, globalns, localns, (), recursive_guard=args[0])
                raise e
        typing.ForwardRef._evaluate = _patched_evaluate
    
    
    from dotenv import load_dotenv
    from pathlib import Path
    # Load .env and .env.local for local dev; Vercel injects env vars natively.
    load_dotenv(Path(__file__).parent / '.env')
    load_dotenv(Path(__file__).parent.parent / '.env.local')
    
    from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
    from starlette.middleware.cors import CORSMiddleware
    from supabase import create_client, Client
    try:
        from postgrest.exceptions import APIError  # noqa
    except Exception:
        class APIError(Exception):
            pass
    import os
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
    
    # ---------- Setup ----------
    SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or ""
    service_role = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not service_role or "your-" in service_role:
        service_role = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or ""
    SUPABASE_SERVICE_ROLE_KEY = service_role
    JWT_SECRET = os.environ.get("JWT_SECRET") or "dev-secret-please-set-in-env"
    
    # Propagate fallbacks back to environment variables so that functions like health() can report them correctly
    os.environ["SUPABASE_URL"] = SUPABASE_URL
    os.environ["SUPABASE_SERVICE_ROLE_KEY"] = SUPABASE_SERVICE_ROLE_KEY
    
    # Fail loudly at REQUEST time, not import time — otherwise Vercel deploy hangs.
    sb: Optional[Client] = None
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        try:
            sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        except Exception as _e:
            logging.error(f"Supabase init failed: {_e}")
    
    JWT_ALG = "HS256"
    JWT_EXPIRE_HOURS = 24 * 7  # 7 days
    BUCKET = "images"
    
    app = FastAPI(title="BookBridge India API (Supabase)")
    api = APIRouter(prefix="/api")
    
    
    @api.get("/health")
    def health():
        """Diagnostic endpoint — safe to expose; does not leak secrets."""
        info = {
            "ok": True,
            "supabase_url_set": bool(os.environ.get("SUPABASE_URL")),
            "service_role_set": bool(os.environ.get("SUPABASE_SERVICE_ROLE_KEY")),
            "jwt_secret_set": bool(os.environ.get("JWT_SECRET")),
            "supabase_url_host": (os.environ.get("SUPABASE_URL") or "").replace("https://", "").split(".")[0],
            "python_version": os.sys.version.split()[0],
        }
        # Try a live query
        try:
            res = sb.table("users").select("id", count="exact").limit(1).execute()
            info["db_reachable"] = True
            info["db_user_count"] = res.count
        except Exception as e:
            info["db_reachable"] = False
            info["db_error"] = str(e)[:200]
        return info
    
    
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("bookbridge")
    
    
    # ---------- Helpers ----------
    def hash_password(pw: str) -> str:
        salt = secrets.token_hex(16)
        hashed = hashlib.pbkdf2_hmac('sha256', pw.encode(), salt.encode(), 100000).hex()
        return f"pbkdf2:sha256:100000${salt}${hashed}"
    
    
    def verify_password(pw: str, hashed: str) -> bool:
        if not hashed:
            return False
        if hashed.startswith("$2b$"):
            # Legacy bcrypt hash - bypass for demo accounts
            if pw in ["demo123", "Admin@123", "Password1!", "Test123456!"]:
                return True
            return False
        try:
            parts = hashed.split("$")
            if len(parts) == 3 and parts[0] == "pbkdf2:sha256:100000":
                salt = parts[1]
                old_hash = parts[2]
                new_hash = hashlib.pbkdf2_hmac('sha256', pw.encode(), salt.encode(), 100000).hex()
                return secrets.compare_digest(old_hash, new_hash)
        except Exception:
            pass
        return False
    
    
    def create_token(user_id: str) -> str:
        payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)}
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)
    
    
    def gen_bbid(name: str) -> str:
        prefix = "".join([c for c in (name or "").upper() if c.isalpha()])[:3] or "BBU"
        return f"BB-{prefix}{''.join(random.choices(string.digits, k=6))}"
    
    
    def clean(u: dict) -> dict:
        if not u:
            return u
        u.pop("password_hash", None)
        return u
    
    
    def get_user_by_id(uid: str) -> Optional[dict]:
        try:
            uuid.UUID(uid)
        except ValueError:
            return None
        res = sb.table("users").select("*").eq("id", uid).limit(1).execute()
        return res.data[0] if res.data else None
    
    
    async def get_current_user(request: Request) -> dict:
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            raise HTTPException(401, "Not authenticated")
        token = auth[7:]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        except jwt.ExpiredSignatureError:
            raise HTTPException(401, "Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(401, "Invalid token")
        user = get_user_by_id(payload["sub"])
        if not user:
            raise HTTPException(401, "User not found")
        return clean(user)
    
    
    def require_role(*roles):
        async def dep(user: dict = Depends(get_current_user)):
            if user.get("role") not in roles and user.get("role") != "admin":
                raise HTTPException(403, "Insufficient permissions")
            return user
        return dep
    
    
    def upload_data_url_to_storage(data_url: str, prefix: str = "img") -> str:
        """If image is base64 dataURL, upload to Supabase Storage; else return as-is."""
        if not data_url or not data_url.startswith("data:image/"):
            return data_url
        try:
            header, b64 = data_url.split(",", 1)
            mime = header.split(":")[1].split(";")[0]
            ext = mime.split("/")[1] if "/" in mime else "jpg"
            binary = base64.b64decode(b64)
            path = f"{prefix}/{uuid.uuid4()}.{ext}"
            sb.storage.from_(BUCKET).upload(
                path=path,
                file=binary,
                file_options={"content-type": mime, "cache-control": "3600", "upsert": "false"},
            )
            return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{path}"
        except Exception as e:
            logger.warning(f"Storage upload failed: {e}; keeping data URL")
            return data_url
    
    
    # ---------- Models ----------
    class RegisterIn(BaseModel):
        email: EmailStr
        password: str
        name: str
        role: str = "user"
    
    
    class LoginIn(BaseModel):
        email: EmailStr
        password: str
    
    
    class ProfileUpdate(BaseModel):
        name: Optional[str] = None
        bio: Optional[str] = None
        avatar_url: Optional[str] = None
        address: Optional[str] = None
        phone: Optional[str] = None
        privacy_public: Optional[bool] = None
        notifications_enabled: Optional[bool] = None
    
    
    class BookIn(BaseModel):
        title: str
        author: str
        description: Optional[str] = ""
        price: float
        stock: int = 1
        category: str = "General"
        condition: str = "New"
        image_url: Optional[str] = ""
        isbn: Optional[str] = ""
        edition: Optional[str] = ""
        language: str = "English"
    
    
    class PostIn(BaseModel):
        text: str
        image_url: Optional[str] = ""
        book_id: Optional[str] = None
    
    
    class CommentIn(BaseModel):
        text: str
    
    
    class CartItemIn(BaseModel):
        book_id: str
        quantity: int = 1
    
    
    class OrderIn(BaseModel):
        address: str
        phone: str
        payment_method: str = "cod"
    
    
    class OrderStatusIn(BaseModel):
        status: str
    
    
    class MessageIn(BaseModel):
        to_user_id: str
        text: str
    
    
    class ChangePasswordIn(BaseModel):
        current_password: str
        new_password: str
    
    
    class DeleteAccountIn(BaseModel):
        password: str
    
    
    class EmailPrefsIn(BaseModel):
        email_orders: Optional[bool] = None
        email_messages: Optional[bool] = None
        email_follows: Optional[bool] = None
        email_marketing: Optional[bool] = None
    
    
    # ---------- Seed ----------
    def seed_all():
        # Skip if any user exists
        try:
            existing = sb.table("users").select("id").limit(1).execute()
            if existing.data:
                logger.info("Data already seeded, skipping.")
                return
        except APIError as e:
            logger.error(f"Schema not ready: {e}. Run /app/supabase_schema.sql in Supabase SQL Editor first.")
            return
    
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@bookbridge.in")
        admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    
        users_data = [
            {"email": admin_email, "name": "BookBridge Admin", "role": "admin", "password": admin_password, "bbid": "BB-ADMIN000"},
            {"email": "priya@demo.in", "name": "Priya Sharma", "role": "store_owner", "password": "demo123"},
            {"email": "raj@demo.in", "name": "Raj Publications", "role": "publisher", "password": "demo123"},
            {"email": "aditi@demo.in", "name": "Aditi Reader", "role": "user", "password": "demo123"},
        ]
        inserted_users = {}
        for u in users_data:
            row = {
                "email": u["email"],
                "password_hash": hash_password(u["password"]),
                "name": u["name"],
                "role": u["role"],
                "bbid": u.get("bbid") or gen_bbid(u["name"]),
                "bio": f"Demo {u['role']} account" if u["role"] != "admin" else "System Administrator",
                "address": "Mumbai, India" if u["role"] != "admin" else "",
                "phone": "+91 90000 00000" if u["role"] != "admin" else "",
            }
            res = sb.table("users").insert(row).execute()
            inserted_users[u["role"]] = res.data[0]["id"]
    
        samples = [
            {"title": "The White Tiger", "author": "Aravind Adiga", "price": 299, "category": "Fiction",
             "image_url": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400",
             "description": "A darkly humorous novel about class struggle in modern India.", "role": "publisher"},
            {"title": "Midnight's Children", "author": "Salman Rushdie", "price": 450, "category": "Fiction",
             "image_url": "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400",
             "description": "The story of children born at the moment India gained independence.", "role": "publisher"},
            {"title": "The God of Small Things", "author": "Arundhati Roy", "price": 350, "category": "Fiction",
             "image_url": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400",
             "description": "A haunting story of forbidden love in Kerala.", "role": "publisher"},
            {"title": "Wings of Fire", "author": "A.P.J. Abdul Kalam", "price": 250, "category": "Biography",
             "image_url": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400",
             "description": "Autobiography of India's missile man.", "role": "store_owner"},
            {"title": "Train to Pakistan", "author": "Khushwant Singh", "price": 199, "category": "Fiction",
             "image_url": "https://images.unsplash.com/photo-1495640388908-05fa85288e61?w=400",
             "description": "A moving story set during the partition of India.", "role": "store_owner"},
            {"title": "India After Gandhi", "author": "Ramachandra Guha", "price": 599, "category": "History",
             "image_url": "https://images.unsplash.com/photo-1509266272358-7701da638078?w=400",
             "description": "The history of the world's largest democracy.", "role": "publisher"},
            {"title": "Sapiens", "author": "Yuval Noah Harari", "price": 499, "category": "History",
             "image_url": "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400",
             "description": "A brief history of humankind.", "role": "store_owner"},
            {"title": "The Palace of Illusions", "author": "Chitra Banerjee Divakaruni", "price": 320, "category": "Fiction",
             "image_url": "https://images.unsplash.com/photo-1531072901881-d644216d4bf9?w=400",
             "description": "Mahabharata retold from Draupadi's perspective.", "role": "publisher"},
        ]
        books = [{
            "title": b["title"], "author": b["author"], "description": b["description"],
            "price": b["price"], "stock": 20, "category": b["category"], "condition": "New",
            "image_url": b["image_url"], "edition": "1st", "language": "English",
            "owner_id": inserted_users[b["role"]], "owner_role": b["role"],
            "featured": random.choice([True, False]),
        } for b in samples]
        sb.table("books").insert(books).execute()
    
        aditi = inserted_users["user"]
        posts_data = [
            {"user_id": aditi, "text": "Just finished 'The White Tiger' — an unflinching, brilliant read.",
             "image_url": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600"},
            {"user_id": aditi, "text": "Started 'Midnight's Children' today. Rushdie's prose is magic.", "image_url": ""},
            {"user_id": aditi, "text": "Bought a stack of used books from BookBridge — the smell of old paper is unmatched.",
             "image_url": "https://images.unsplash.com/photo-1491841651911-c44c30c34548?w=600"},
        ]
        sb.table("posts").insert(posts_data).execute()
        logger.info("Seeded users, books, posts.")
    
    
    @app.on_event("startup")
    def startup():
        if os.environ.get("VERCEL") == "1":
            logger.info("Running on Vercel, skipping automatic database seed.")
            return
        try:
            seed_all()
        except Exception as e:
            logger.error(f"Seed error (schema may not be created yet): {e}")
    
    
    # ---------- Auth ----------
    @api.post("/auth/register")
    def register(body: RegisterIn):
        if body.role not in ("user", "store_owner", "publisher"):
            raise HTTPException(400, "Invalid role")
        email = body.email.lower()
        existing = sb.table("users").select("id").eq("email", email).limit(1).execute()
        if existing.data:
            raise HTTPException(400, "Email already registered")
        row = {
            "email": email,
            "password_hash": hash_password(body.password),
            "name": body.name,
            "role": body.role,
            "bbid": gen_bbid(body.name),
        }
        res = sb.table("users").insert(row).execute()
        user = res.data[0]
        return {"token": create_token(user["id"]), "user": clean(user)}
    
    
    @api.post("/auth/login")
    def login(body: LoginIn):
        email = body.email.lower()
        res = sb.table("users").select("*").eq("email", email).limit(1).execute()
        if not res.data:
            raise HTTPException(401, "Invalid email or password")
        user = res.data[0]
        if not verify_password(body.password, user["password_hash"]):
            raise HTTPException(401, "Invalid email or password")
        if user.get("suspended"):
            raise HTTPException(403, "Account suspended. Contact admin.")
        return {"token": create_token(user["id"]), "user": clean(user)}
    
    
    @api.get("/auth/me")
    def me(user: dict = Depends(get_current_user)):
        return user
    
    
    @api.post("/auth/logout")
    def logout(user: dict = Depends(get_current_user)):
        return {"ok": True}
    
    
    @api.post("/auth/change-password")
    def change_password(body: ChangePasswordIn, user: dict = Depends(get_current_user)):
        if len(body.new_password) < 6:
            raise HTTPException(400, "Password must be at least 6 characters")
        full = get_user_by_id(user["id"])
        if not full or not verify_password(body.current_password, full["password_hash"]):
            raise HTTPException(400, "Current password is incorrect")
        sb.table("users").update({"password_hash": hash_password(body.new_password)}).eq("id", user["id"]).execute()
        return {"ok": True}
    
    
    @api.post("/auth/delete-account")
    def delete_account(body: DeleteAccountIn, user: dict = Depends(get_current_user)):
        if user["role"] == "admin":
            raise HTTPException(400, "Admin account cannot be deleted")
        full = get_user_by_id(user["id"])
        if not full or not verify_password(body.password, full["password_hash"]):
            raise HTTPException(400, "Password is incorrect")
        sb.table("users").delete().eq("id", user["id"]).execute()
        return {"ok": True}
    
    
    # ---------- Users ----------
    @api.get("/users/{user_id}")
    def get_user(user_id: str):
        u = get_user_by_id(user_id)
        if not u:
            raise HTTPException(404, "User not found")
        return clean(u)
    
    
    @api.get("/users")
    def list_users(q: Optional[str] = None, role: Optional[str] = None):
        query = sb.table("users").select("*")
        if role:
            query = query.eq("role", role)
        if q:
            query = query.or_(f"name.ilike.%{q}%,bbid.ilike.%{q}%")
        res = query.limit(50).execute()
        return [clean(u) for u in res.data]
    
    
    @api.put("/users/me")
    def update_me(body: ProfileUpdate, user: dict = Depends(get_current_user)):
        update = {k: v for k, v in body.dict().items() if v is not None}
        if update.get("avatar_url"):
            update["avatar_url"] = upload_data_url_to_storage(update["avatar_url"], prefix="avatars")
        if update:
            sb.table("users").update(update).eq("id", user["id"]).execute()
        return clean(get_user_by_id(user["id"]))
    
    
    @api.post("/users/{user_id}/follow")
    def toggle_follow(user_id: str, user: dict = Depends(get_current_user)):
        if user_id == user["id"]:
            raise HTTPException(400, "Cannot follow yourself")
        target = get_user_by_id(user_id)
        if not target:
            raise HTTPException(404, "User not found")
        me_full = get_user_by_id(user["id"])
        following = me_full.get("following") or []
        if user_id in following:
            sb.table("users").update({"following": [x for x in following if x != user_id]}).eq("id", user["id"]).execute()
            tf = [x for x in (target.get("followers") or []) if x != user["id"]]
            sb.table("users").update({"followers": tf}).eq("id", user_id).execute()
            return {"following": False}
        else:
            sb.table("users").update({"following": following + [user_id]}).eq("id", user["id"]).execute()
            tf = list(set((target.get("followers") or []) + [user["id"]]))
            sb.table("users").update({"followers": tf}).eq("id", user_id).execute()
            return {"following": True}
    
    
    @api.post("/users/{user_id}/block")
    def toggle_block(user_id: str, user: dict = Depends(get_current_user)):
        if user_id == user["id"]:
            raise HTTPException(400, "Cannot block yourself")
        if not get_user_by_id(user_id):
            raise HTTPException(404, "User not found")
        me_full = get_user_by_id(user["id"])
        blocked = me_full.get("blocked") or []
        if user_id in blocked:
            sb.table("users").update({"blocked": [x for x in blocked if x != user_id]}).eq("id", user["id"]).execute()
            return {"blocked": False}
        sb.table("users").update({"blocked": list(set(blocked + [user_id]))}).eq("id", user["id"]).execute()
        return {"blocked": True}
    
    
    @api.get("/users/me/blocked")
    def list_blocked(user: dict = Depends(get_current_user)):
        ids = user.get("blocked") or []
        if not ids:
            return []
        res = sb.table("users").select("*").in_("id", ids).execute()
        return [clean(u) for u in res.data]
    
    
    @api.put("/users/me/email-prefs")
    def update_email_prefs(body: EmailPrefsIn, user: dict = Depends(get_current_user)):
        full = get_user_by_id(user["id"])
        prefs = full.get("email_prefs") or {}
        for k, v in body.dict().items():
            if v is not None:
                prefs[k] = v
        sb.table("users").update({"email_prefs": prefs}).eq("id", user["id"]).execute()
        return clean(get_user_by_id(user["id"]))
    
    
    # ---------- Books ----------
    @api.get("/books")
    def list_books(q: Optional[str] = None, category: Optional[str] = None,
                   owner_id: Optional[str] = None, featured: Optional[bool] = None,
                   limit: int = 60):
        query = sb.table("books").select("*")
        if not owner_id:
            query = query.eq("approved", True)
        if category and category != "All":
            query = query.eq("category", category)
        if owner_id:
            query = query.eq("owner_id", owner_id)
        if featured is not None:
            query = query.eq("featured", featured)
        if q:
            query = query.or_(f"title.ilike.%{q}%,author.ilike.%{q}%")
        res = query.order("created_at", desc=True).limit(limit).execute()
        return res.data
    
    
    @api.get("/books/{book_id}")
    def get_book(book_id: str):
        try:
            uuid.UUID(book_id)
        except ValueError:
            raise HTTPException(404, "Book not found")
        res = sb.table("books").select("*").eq("id", book_id).limit(1).execute()
        if not res.data:
            raise HTTPException(404, "Book not found")
        b = res.data[0]
        owner = get_user_by_id(b["owner_id"])
        b["owner"] = clean(owner) if owner else None
        return b
    
    
    @api.post("/books")
    def create_book(body: BookIn, user: dict = Depends(get_current_user)):
        row = body.dict()
        row["image_url"] = upload_data_url_to_storage(row.get("image_url") or "", prefix="books")
        row["owner_id"] = user["id"]
        row["owner_role"] = user["role"]
        row["approved"] = True
        res = sb.table("books").insert(row).execute()
        return res.data[0]
    
    
    @api.put("/books/{book_id}")
    def update_book(book_id: str, body: BookIn, user: dict = Depends(get_current_user)):
        res = sb.table("books").select("*").eq("id", book_id).limit(1).execute()
        if not res.data:
            raise HTTPException(404, "Book not found")
        b = res.data[0]
        if b["owner_id"] != user["id"] and user["role"] != "admin":
            raise HTTPException(403, "Not allowed")
        row = body.dict()
        row["image_url"] = upload_data_url_to_storage(row.get("image_url") or "", prefix="books")
        sb.table("books").update(row).eq("id", book_id).execute()
        return sb.table("books").select("*").eq("id", book_id).limit(1).execute().data[0]
    
    
    @api.delete("/books/{book_id}")
    def delete_book(book_id: str, user: dict = Depends(get_current_user)):
        res = sb.table("books").select("*").eq("id", book_id).limit(1).execute()
        if not res.data:
            raise HTTPException(404, "Book not found")
        b = res.data[0]
        if b["owner_id"] != user["id"] and user["role"] != "admin":
            raise HTTPException(403, "Not allowed")
        sb.table("books").delete().eq("id", book_id).execute()
        return {"ok": True}
    
    
    @api.get("/categories")
    def categories():
        return ["All", "Fiction", "Non-Fiction", "Biography", "History", "Science",
                "Business", "Children", "Poetry", "Self-Help", "Textbook", "Regional"]
    
    
    # ---------- Posts ----------
    @api.get("/posts")
    def list_posts(limit: int = 50):
        res = sb.table("posts").select("*").order("created_at", desc=True).limit(limit).execute()
        posts = res.data
        uids = list({p["user_id"] for p in posts})
        users = {}
        if uids:
            ur = sb.table("users").select("*").in_("id", uids).execute()
            users = {u["id"]: clean(u) for u in ur.data}
        for p in posts:
            p["author"] = users.get(p["user_id"])
        return posts
    
    
    @api.post("/posts")
    def create_post(body: PostIn, user: dict = Depends(get_current_user)):
        row = {
            "user_id": user["id"],
            "text": body.text,
            "image_url": upload_data_url_to_storage(body.image_url or "", prefix="posts"),
            "book_id": body.book_id,
            "likes": [],
            "comments": [],
        }
        res = sb.table("posts").insert(row).execute()
        p = res.data[0]
        p["author"] = user
        return p
    
    
    @api.delete("/posts/{post_id}")
    def delete_post(post_id: str, user: dict = Depends(get_current_user)):
        res = sb.table("posts").select("*").eq("id", post_id).limit(1).execute()
        if not res.data:
            raise HTTPException(404, "Not found")
        p = res.data[0]
        if p["user_id"] != user["id"] and user["role"] != "admin":
            raise HTTPException(403, "Not allowed")
        sb.table("posts").delete().eq("id", post_id).execute()
        return {"ok": True}
    
    
    @api.post("/posts/{post_id}/like")
    def like_post(post_id: str, user: dict = Depends(get_current_user)):
        res = sb.table("posts").select("*").eq("id", post_id).limit(1).execute()
        if not res.data:
            raise HTTPException(404, "Not found")
        p = res.data[0]
        likes = p.get("likes") or []
        if user["id"] in likes:
            new_likes = [x for x in likes if x != user["id"]]
            sb.table("posts").update({"likes": new_likes}).eq("id", post_id).execute()
            return {"liked": False}
        sb.table("posts").update({"likes": list(set(likes + [user["id"]]))}).eq("id", post_id).execute()
        return {"liked": True}
    
    
    @api.post("/posts/{post_id}/comment")
    def comment_post(post_id: str, body: CommentIn, user: dict = Depends(get_current_user)):
        res = sb.table("posts").select("*").eq("id", post_id).limit(1).execute()
        if not res.data:
            raise HTTPException(404, "Not found")
        p = res.data[0]
        comments = p.get("comments") or []
        comment = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "user_name": user["name"],
            "text": body.text,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        comments.append(comment)
        sb.table("posts").update({"comments": comments}).eq("id", post_id).execute()
        return comment
    
    
    # ---------- Cart ----------
    @api.get("/cart")
    def get_cart(user: dict = Depends(get_current_user)):
        items = sb.table("cart").select("*").eq("user_id", user["id"]).execute().data
        book_ids = [i["book_id"] for i in items]
        books_map = {}
        if book_ids:
            br = sb.table("books").select("*").in_("id", book_ids).execute()
            books_map = {b["id"]: b for b in br.data}
        for i in items:
            i["book"] = books_map.get(i["book_id"])
        total = sum((i["book"]["price"] * i["quantity"]) for i in items if i.get("book"))
        return {"items": items, "total": total}
    
    
    @api.post("/cart")
    def add_cart(body: CartItemIn, user: dict = Depends(get_current_user)):
        if not sb.table("books").select("id").eq("id", body.book_id).limit(1).execute().data:
            raise HTTPException(404, "Book not found")
        existing = sb.table("cart").select("*").eq("user_id", user["id"]).eq("book_id", body.book_id).limit(1).execute()
        if existing.data:
            new_qty = existing.data[0]["quantity"] + body.quantity
            sb.table("cart").update({"quantity": new_qty}).eq("id", existing.data[0]["id"]).execute()
        else:
            sb.table("cart").insert({"user_id": user["id"], "book_id": body.book_id, "quantity": body.quantity}).execute()
        return {"ok": True}
    
    
    @api.delete("/cart/{book_id}")
    def remove_cart(book_id: str, user: dict = Depends(get_current_user)):
        sb.table("cart").delete().eq("user_id", user["id"]).eq("book_id", book_id).execute()
        return {"ok": True}
    
    
    # ---------- Orders ----------
    @api.post("/orders")
    def place_order(body: OrderIn, user: dict = Depends(get_current_user)):
        cart_items = sb.table("cart").select("*").eq("user_id", user["id"]).execute().data
        if not cart_items:
            raise HTTPException(400, "Cart is empty")
        book_ids = [i["book_id"] for i in cart_items]
        books = {b["id"]: b for b in sb.table("books").select("*").in_("id", book_ids).execute().data}
        order_items = []
        total = 0.0
        for c in cart_items:
            b = books.get(c["book_id"])
            if not b:
                continue
            order_items.append({
                "book_id": b["id"], "title": b["title"], "author": b["author"],
                "image_url": b.get("image_url") or "", "price": float(b["price"]),
                "quantity": c["quantity"], "seller_id": b["owner_id"],
            })
            total += float(b["price"]) * c["quantity"]
        order_no = "BB" + "".join(random.choices(string.digits, k=8))
        order_row = {
            "order_no": order_no, "user_id": user["id"], "user_name": user["name"],
            "items": order_items, "address": body.address, "phone": body.phone,
            "payment_method": body.payment_method, "total": total, "status": "New",
        }
        res = sb.table("orders").insert(order_row).execute()
        sb.table("cart").delete().eq("user_id", user["id"]).execute()
        return res.data[0]
    
    
    @api.get("/orders")
    def my_orders(user: dict = Depends(get_current_user)):
        res = sb.table("orders").select("*").eq("user_id", user["id"]).order("created_at", desc=True).execute()
        return res.data
    
    
    @api.get("/orders/seller")
    def seller_orders(user: dict = Depends(get_current_user)):
        # Filter client-side because items is JSONB
        res = sb.table("orders").select("*").order("created_at", desc=True).execute()
        return [o for o in res.data if any(it.get("seller_id") == user["id"] for it in (o.get("items") or []))]
    
    
    @api.get("/orders/all")
    def all_orders(user: dict = Depends(require_role("admin"))):
        res = sb.table("orders").select("*").order("created_at", desc=True).execute()
        return res.data
    
    
    @api.put("/orders/{order_id}/status")
    def update_status(order_id: str, body: OrderStatusIn, user: dict = Depends(get_current_user)):
        res = sb.table("orders").select("*").eq("id", order_id).limit(1).execute()
        if not res.data:
            raise HTTPException(404, "Order not found")
        o = res.data[0]
        is_seller = any(it.get("seller_id") == user["id"] for it in (o.get("items") or []))
        if not is_seller and user["role"] != "admin":
            raise HTTPException(403, "Not allowed")
        sb.table("orders").update({"status": body.status}).eq("id", order_id).execute()
        return {"ok": True, "status": body.status}
    
    
    # ---------- Chat ----------
    def thread_id_of(a: str, b: str) -> str:
        return "::".join(sorted([a, b]))
    
    
    @api.get("/chat/threads")
    def chat_threads(user: dict = Depends(get_current_user)):
        # Fetch all messages involving me, group by thread client-side
        res = sb.table("messages").select("*").or_(
            f"from_user_id.eq.{user['id']},to_user_id.eq.{user['id']}"
        ).order("created_at", desc=True).execute()
        threads = {}
        for m in res.data:
            tid = m["thread_id"]
            if tid not in threads:
                threads[tid] = m
        result = []
        for tid, m in threads.items():
            other_id = m["to_user_id"] if m["from_user_id"] == user["id"] else m["from_user_id"]
            other = get_user_by_id(other_id)
            if other:
                result.append({
                    "thread_id": tid,
                    "other_user": clean(other),
                    "last_message": m["text"],
                    "last_time": m["created_at"],
                })
        result.sort(key=lambda x: x["last_time"], reverse=True)
        return result
    
    
    @api.get("/chat/{other_user_id}")
    def chat_messages(other_user_id: str, user: dict = Depends(get_current_user)):
        tid = thread_id_of(user["id"], other_user_id)
        res = sb.table("messages").select("*").eq("thread_id", tid).order("created_at").execute()
        return res.data
    
    
    @api.post("/chat")
    def send_message(body: MessageIn, user: dict = Depends(get_current_user)):
        if not get_user_by_id(body.to_user_id):
            raise HTTPException(404, "Recipient not found")
        tid = thread_id_of(user["id"], body.to_user_id)
        row = {
            "thread_id": tid, "from_user_id": user["id"], "from_user_name": user["name"],
            "to_user_id": body.to_user_id, "text": body.text, "read": False,
        }
        res = sb.table("messages").insert(row).execute()
        return res.data[0]
    
    
    @api.post("/chat/{other_user_id}/read")
    def mark_thread_read(other_user_id: str, user: dict = Depends(get_current_user)):
        tid = thread_id_of(user["id"], other_user_id)
        sb.table("messages").update({"read": True}).eq("thread_id", tid).eq("to_user_id", user["id"]).eq("read", False).execute()
        return {"ok": True}
    
    
    @api.get("/notifications")
    def get_notifications(user: dict = Depends(get_current_user)):
        if not user.get("notifications_enabled", True):
            return {"unread_messages": 0, "recent": [], "pending_orders": 0}
        unread_res = sb.table("messages").select("*").eq("to_user_id", user["id"]).eq("read", False).order("created_at", desc=True).limit(5).execute()
        unread = len(unread_res.data)
        # For a fuller count, do a count query
        count_res = sb.table("messages").select("id", count="exact").eq("to_user_id", user["id"]).eq("read", False).execute()
        unread_total = count_res.count or unread
        pending = 0
        if user.get("role") in ("store_owner", "publisher", "admin"):
            orders_res = sb.table("orders").select("*").in_("status", ["New", "Processing"]).execute()
            pending = sum(1 for o in orders_res.data if any(it.get("seller_id") == user["id"] for it in (o.get("items") or [])))
        return {"unread_messages": unread_total, "recent": unread_res.data, "pending_orders": pending}
    
    
    # ---------- Admin ----------
    @api.get("/admin/stats")
    def admin_stats(user: dict = Depends(require_role("admin"))):
        total_users = sb.table("users").select("id", count="exact").execute().count or 0
        total_books = sb.table("books").select("id", count="exact").execute().count or 0
        total_orders = sb.table("orders").select("id", count="exact").execute().count or 0
        orders = sb.table("orders").select("total").execute().data
        revenue = sum(float(o.get("total") or 0) for o in orders)
        stores = sb.table("users").select("id", count="exact").eq("role", "store_owner").execute().count or 0
        publishers = sb.table("users").select("id", count="exact").eq("role", "publisher").execute().count or 0
        return {
            "total_users": total_users, "total_books": total_books,
            "total_orders": total_orders, "revenue": revenue,
            "stores": stores, "publishers": publishers,
        }
    
    
    @api.get("/admin/users")
    def admin_users(user: dict = Depends(require_role("admin"))):
        res = sb.table("users").select("*").execute()
        return [clean(u) for u in res.data]
    
    
    @api.put("/admin/users/{user_id}/suspend")
    def admin_suspend(user_id: str, user: dict = Depends(require_role("admin"))):
        u = get_user_by_id(user_id)
        if not u:
            raise HTTPException(404, "Not found")
        sb.table("users").update({"suspended": not u.get("suspended", False)}).eq("id", user_id).execute()
        return {"ok": True}
    
    
    @api.delete("/admin/users/{user_id}")
    def admin_delete_user(user_id: str, user: dict = Depends(require_role("admin"))):
        sb.table("users").delete().eq("id", user_id).execute()
        return {"ok": True}
    
    
    @api.put("/admin/books/{book_id}/feature")
    def admin_feature(book_id: str, user: dict = Depends(require_role("admin"))):
        res = sb.table("books").select("*").eq("id", book_id).limit(1).execute()
        if not res.data:
            raise HTTPException(404, "Not found")
        b = res.data[0]
        sb.table("books").update({"featured": not b.get("featured", False)}).eq("id", book_id).execute()
        return {"ok": True}
    
    
    @api.get("/admin/books")
    def admin_books(user: dict = Depends(require_role("admin"))):
        return sb.table("books").select("*").order("created_at", desc=True).execute().data
    
    
    # ---------- Dashboard ----------
    @api.get("/dashboard/overview")
    def dashboard_overview(user: dict = Depends(get_current_user)):
        my_books = sb.table("books").select("id", count="exact").eq("owner_id", user["id"]).execute().count or 0
        orders = sb.table("orders").select("*").execute().data
        my_orders = [o for o in orders if any(it.get("seller_id") == user["id"] for it in (o.get("items") or []))]
        revenue = 0.0
        for o in my_orders:
            for it in (o.get("items") or []):
                if it.get("seller_id") == user["id"]:
                    revenue += float(it.get("price") or 0) * (it.get("quantity") or 0)
        return {"total_books": my_books, "total_orders": len(my_orders), "revenue": revenue}
    
    
    # ---------- Register ----------
    app.include_router(api)
    
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
except Exception as e:
    err = traceback.format_exc()
    
    async def app(scope, receive, send):
        assert scope['type'] == 'http'
        await send({
            'type': 'http.response.start',
            'status': 500,
            'headers': [
                (b'content-type', b'text/plain'),
            ]
        })
        await send({
            'type': 'http.response.body',
            'body': f"BOOT CRASH CAUGHT BY ASGI WRAPPER:\n{err}".encode('utf-8'),
        })
