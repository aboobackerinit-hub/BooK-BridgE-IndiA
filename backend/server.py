from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
import random
import string
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta

# ---------- Setup ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
JWT_EXPIRE_HOURS = 24 * 7  # 7 days

app = FastAPI(title="BookBridge India API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bookbridge")


# ---------- Helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def gen_bbid(name: str) -> str:
    prefix = "".join([c for c in (name or "").upper() if c.isalpha()])[:3] or "BBU"
    suffix = "".join(random.choices(string.digits, k=6))
    return f"BB-{prefix}{suffix}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


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
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


def require_role(*roles):
    async def dep(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles and user.get("role") != "admin":
            raise HTTPException(403, "Insufficient permissions")
        return user
    return dep


# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "user"  # user | store_owner | publisher


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
    condition: str = "New"  # New | Used
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
    payment_method: str = "cod"  # cod | upi


class OrderStatusIn(BaseModel):
    status: str  # New | Processing | Packed | Shipped | Delivered | Cancelled


class MessageIn(BaseModel):
    to_user_id: str
    text: str


# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("bbid", unique=True)
    await db.books.create_index("owner_id")
    await db.posts.create_index([("created_at", -1)])
    await db.messages.create_index([("thread_id", 1), ("created_at", 1)])
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@bookbridge.in")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        uid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": uid,
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "BookBridge Admin",
            "role": "admin",
            "bbid": "BB-ADMIN000",
            "bio": "System Administrator",
            "avatar_url": "",
            "address": "",
            "phone": "",
            "privacy_public": True,
            "notifications_enabled": True,
            "approved": True,
            "suspended": False,
            "followers": [],
            "following": [],
            "created_at": now_iso(),
        })
        logger.info(f"Seeded admin: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})
    # Seed demo data
    await seed_demo_data()


async def seed_demo_data():
    if await db.books.count_documents({}) > 0:
        return
    # Seed some sample users
    demo_users = [
        {"email": "priya@demo.in", "name": "Priya Sharma", "role": "store_owner"},
        {"email": "raj@demo.in", "name": "Raj Publications", "role": "publisher"},
        {"email": "aditi@demo.in", "name": "Aditi Reader", "role": "user"},
    ]
    user_ids = {}
    for u in demo_users:
        uid = str(uuid.uuid4())
        user_ids[u["role"]] = uid
        await db.users.insert_one({
            "id": uid,
            "email": u["email"],
            "password_hash": hash_password("demo123"),
            "name": u["name"],
            "role": u["role"],
            "bbid": gen_bbid(u["name"]),
            "bio": f"Demo {u['role']} account",
            "avatar_url": "",
            "address": "Mumbai, India",
            "phone": "+91 90000 00000",
            "privacy_public": True,
            "notifications_enabled": True,
            "approved": True,
            "suspended": False,
            "followers": [],
            "following": [],
            "created_at": now_iso(),
        })

    # Sample books
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
         "description": "Autobiography of India's missile man and former President.", "role": "store_owner"},
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
    for b in samples:
        owner = user_ids[b["role"]]
        await db.books.insert_one({
            "id": str(uuid.uuid4()),
            "title": b["title"],
            "author": b["author"],
            "description": b["description"],
            "price": b["price"],
            "stock": 20,
            "category": b["category"],
            "condition": "New",
            "image_url": b["image_url"],
            "isbn": "",
            "edition": "1st",
            "language": "English",
            "owner_id": owner,
            "owner_role": b["role"],
            "approved": True,
            "featured": random.choice([True, False]),
            "created_at": now_iso(),
        })

    # Sample posts
    aditi = user_ids["user"]
    posts_data = [
        {"text": "Just finished 'The White Tiger' — an unflinching, brilliant read on modern India. Highly recommended!",
         "image_url": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600"},
        {"text": "Started 'Midnight's Children' today. Rushdie's prose is magic. ✨", "image_url": ""},
        {"text": "Bought a stack of used books from BookBridge — the smell of old paper is unmatched.",
         "image_url": "https://images.unsplash.com/photo-1491841651911-c44c30c34548?w=600"},
    ]
    for p in posts_data:
        await db.posts.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": aditi,
            "text": p["text"],
            "image_url": p["image_url"],
            "book_id": None,
            "likes": [],
            "comments": [],
            "created_at": now_iso(),
        })


# ---------- Auth ----------
@api.post("/auth/register")
async def register(body: RegisterIn):
    if body.role not in ("user", "store_owner", "publisher"):
        raise HTTPException(400, "Invalid role")
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    uid = str(uuid.uuid4())
    user = {
        "id": uid,
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": body.role,
        "bbid": gen_bbid(body.name),
        "bio": "",
        "avatar_url": "",
        "address": "",
        "phone": "",
        "privacy_public": True,
        "notifications_enabled": True,
        "approved": True,
        "suspended": False,
        "followers": [],
        "following": [],
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_token(uid)
    return {"token": token, "user": clean(dict(user))}


@api.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    if user.get("suspended"):
        raise HTTPException(403, "Account suspended. Contact admin.")
    token = create_token(user["id"])
    return {"token": token, "user": clean(dict(user))}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/logout")
async def logout(user: dict = Depends(get_current_user)):
    return {"ok": True}


# ---------- Users / Profile ----------
@api.get("/users/{user_id}")
async def get_user(user_id: str):
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not u:
        raise HTTPException(404, "User not found")
    return u


@api.get("/users")
async def list_users(q: Optional[str] = None, role: Optional[str] = None):
    query = {}
    if role:
        query["role"] = role
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"bbid": {"$regex": q, "$options": "i"}},
        ]
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).limit(50).to_list(50)
    return users


@api.put("/users/me")
async def update_me(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return u


@api.post("/users/{user_id}/follow")
async def toggle_follow(user_id: str, user: dict = Depends(get_current_user)):
    if user_id == user["id"]:
        raise HTTPException(400, "Cannot follow yourself")
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(404, "User not found")
    following = user.get("following", []) or []
    if user_id in following:
        await db.users.update_one({"id": user["id"]}, {"$pull": {"following": user_id}})
        await db.users.update_one({"id": user_id}, {"$pull": {"followers": user["id"]}})
        return {"following": False}
    else:
        await db.users.update_one({"id": user["id"]}, {"$addToSet": {"following": user_id}})
        await db.users.update_one({"id": user_id}, {"$addToSet": {"followers": user["id"]}})
        return {"following": True}


# ---------- Books ----------
@api.get("/books")
async def list_books(q: Optional[str] = None, category: Optional[str] = None,
                     owner_id: Optional[str] = None, featured: Optional[bool] = None,
                     limit: int = 60):
    query = {"approved": True}
    if category and category != "All":
        query["category"] = category
    if owner_id:
        query["owner_id"] = owner_id
        query.pop("approved", None)
    if featured is not None:
        query["featured"] = featured
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"author": {"$regex": q, "$options": "i"}},
        ]
    books = await db.books.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return books


@api.get("/books/{book_id}")
async def get_book(book_id: str):
    b = await db.books.find_one({"id": book_id}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Book not found")
    owner = await db.users.find_one({"id": b["owner_id"]}, {"_id": 0, "password_hash": 0})
    b["owner"] = owner
    return b


@api.post("/books")
async def create_book(body: BookIn, user: dict = Depends(get_current_user)):
    if user["role"] not in ("user", "store_owner", "publisher", "admin"):
        raise HTTPException(403, "Not allowed")
    doc = body.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        "owner_role": user["role"],
        "approved": True,  # auto-approve for demo
        "featured": False,
        "created_at": now_iso(),
    })
    await db.books.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/books/{book_id}")
async def update_book(book_id: str, body: BookIn, user: dict = Depends(get_current_user)):
    b = await db.books.find_one({"id": book_id})
    if not b:
        raise HTTPException(404, "Book not found")
    if b["owner_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not allowed")
    await db.books.update_one({"id": book_id}, {"$set": body.model_dump()})
    b2 = await db.books.find_one({"id": book_id}, {"_id": 0})
    return b2


@api.delete("/books/{book_id}")
async def delete_book(book_id: str, user: dict = Depends(get_current_user)):
    b = await db.books.find_one({"id": book_id})
    if not b:
        raise HTTPException(404, "Book not found")
    if b["owner_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not allowed")
    await db.books.delete_one({"id": book_id})
    return {"ok": True}


@api.get("/categories")
async def categories():
    return ["All", "Fiction", "Non-Fiction", "Biography", "History", "Science",
            "Business", "Children", "Poetry", "Self-Help", "Textbook", "Regional"]


# ---------- Posts / Reviews ----------
@api.get("/posts")
async def list_posts(limit: int = 50):
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    # Attach author
    uids = list({p["user_id"] for p in posts})
    users = {u["id"]: u async for u in db.users.find({"id": {"$in": uids}},
                                                     {"_id": 0, "password_hash": 0})}
    for p in posts:
        p["author"] = users.get(p["user_id"])
    return posts


@api.post("/posts")
async def create_post(body: PostIn, user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "text": body.text,
        "image_url": body.image_url or "",
        "book_id": body.book_id,
        "likes": [],
        "comments": [],
        "created_at": now_iso(),
    }
    await db.posts.insert_one(doc)
    doc.pop("_id", None)
    doc["author"] = user
    return doc


@api.delete("/posts/{post_id}")
async def delete_post(post_id: str, user: dict = Depends(get_current_user)):
    p = await db.posts.find_one({"id": post_id})
    if not p:
        raise HTTPException(404, "Not found")
    if p["user_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Not allowed")
    await db.posts.delete_one({"id": post_id})
    return {"ok": True}


@api.post("/posts/{post_id}/like")
async def like_post(post_id: str, user: dict = Depends(get_current_user)):
    p = await db.posts.find_one({"id": post_id})
    if not p:
        raise HTTPException(404, "Not found")
    likes = p.get("likes", [])
    if user["id"] in likes:
        await db.posts.update_one({"id": post_id}, {"$pull": {"likes": user["id"]}})
        return {"liked": False}
    else:
        await db.posts.update_one({"id": post_id}, {"$addToSet": {"likes": user["id"]}})
        return {"liked": True}


@api.post("/posts/{post_id}/comment")
async def comment_post(post_id: str, body: CommentIn, user: dict = Depends(get_current_user)):
    p = await db.posts.find_one({"id": post_id})
    if not p:
        raise HTTPException(404, "Not found")
    comment = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user["name"],
        "text": body.text,
        "created_at": now_iso(),
    }
    await db.posts.update_one({"id": post_id}, {"$push": {"comments": comment}})
    return comment


# ---------- Cart ----------
@api.get("/cart")
async def get_cart(user: dict = Depends(get_current_user)):
    items = await db.cart.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    book_ids = [i["book_id"] for i in items]
    books = {b["id"]: b async for b in db.books.find({"id": {"$in": book_ids}}, {"_id": 0})}
    for i in items:
        i["book"] = books.get(i["book_id"])
    total = sum((i["book"]["price"] * i["quantity"]) for i in items if i.get("book"))
    return {"items": items, "total": total}


@api.post("/cart")
async def add_cart(body: CartItemIn, user: dict = Depends(get_current_user)):
    b = await db.books.find_one({"id": body.book_id})
    if not b:
        raise HTTPException(404, "Book not found")
    existing = await db.cart.find_one({"user_id": user["id"], "book_id": body.book_id})
    if existing:
        await db.cart.update_one(
            {"user_id": user["id"], "book_id": body.book_id},
            {"$inc": {"quantity": body.quantity}},
        )
    else:
        await db.cart.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "book_id": body.book_id,
            "quantity": body.quantity,
            "created_at": now_iso(),
        })
    return {"ok": True}


@api.delete("/cart/{book_id}")
async def remove_cart(book_id: str, user: dict = Depends(get_current_user)):
    await db.cart.delete_one({"user_id": user["id"], "book_id": book_id})
    return {"ok": True}


# ---------- Orders ----------
@api.post("/orders")
async def place_order(body: OrderIn, user: dict = Depends(get_current_user)):
    cart_items = await db.cart.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    if not cart_items:
        raise HTTPException(400, "Cart is empty")
    book_ids = [i["book_id"] for i in cart_items]
    books = {b["id"]: b async for b in db.books.find({"id": {"$in": book_ids}}, {"_id": 0})}
    order_items = []
    total = 0.0
    for c in cart_items:
        b = books.get(c["book_id"])
        if not b:
            continue
        order_items.append({
            "book_id": b["id"],
            "title": b["title"],
            "author": b["author"],
            "image_url": b.get("image_url", ""),
            "price": b["price"],
            "quantity": c["quantity"],
            "seller_id": b["owner_id"],
        })
        total += b["price"] * c["quantity"]
    order = {
        "id": str(uuid.uuid4()),
        "order_no": "BB" + "".join(random.choices(string.digits, k=8)),
        "user_id": user["id"],
        "user_name": user["name"],
        "items": order_items,
        "address": body.address,
        "phone": body.phone,
        "payment_method": body.payment_method,
        "total": total,
        "status": "New",
        "created_at": now_iso(),
    }
    await db.orders.insert_one(order)
    await db.cart.delete_many({"user_id": user["id"]})
    order.pop("_id", None)
    return order


@api.get("/orders")
async def my_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return orders


@api.get("/orders/seller")
async def seller_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find(
        {"items.seller_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return orders


@api.get("/orders/all")
async def all_orders(user: dict = Depends(require_role("admin"))):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders


@api.put("/orders/{order_id}/status")
async def update_status(order_id: str, body: OrderStatusIn, user: dict = Depends(get_current_user)):
    o = await db.orders.find_one({"id": order_id})
    if not o:
        raise HTTPException(404, "Order not found")
    # Seller or admin can update
    is_seller = any(it["seller_id"] == user["id"] for it in o.get("items", []))
    if not is_seller and user["role"] != "admin":
        raise HTTPException(403, "Not allowed")
    await db.orders.update_one({"id": order_id}, {"$set": {"status": body.status}})
    return {"ok": True, "status": body.status}


# ---------- Chat ----------
def thread_id_of(a: str, b: str) -> str:
    return "::".join(sorted([a, b]))


@api.get("/chat/threads")
async def chat_threads(user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"$or": [{"from_user_id": user["id"]}, {"to_user_id": user["id"]}]}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": "$thread_id",
            "last_message": {"$first": "$text"},
            "last_time": {"$first": "$created_at"},
            "from_user_id": {"$first": "$from_user_id"},
            "to_user_id": {"$first": "$to_user_id"},
        }},
        {"$sort": {"last_time": -1}},
    ]
    threads = await db.messages.aggregate(pipeline).to_list(100)
    result = []
    for t in threads:
        other_id = t["to_user_id"] if t["from_user_id"] == user["id"] else t["from_user_id"]
        other = await db.users.find_one({"id": other_id}, {"_id": 0, "password_hash": 0})
        if other:
            result.append({
                "thread_id": t["_id"],
                "other_user": other,
                "last_message": t["last_message"],
                "last_time": t["last_time"],
            })
    return result


@api.get("/chat/{other_user_id}")
async def chat_messages(other_user_id: str, user: dict = Depends(get_current_user)):
    tid = thread_id_of(user["id"], other_user_id)
    msgs = await db.messages.find({"thread_id": tid}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return msgs


@api.post("/chat")
async def send_message(body: MessageIn, user: dict = Depends(get_current_user)):
    if not await db.users.find_one({"id": body.to_user_id}):
        raise HTTPException(404, "Recipient not found")
    tid = thread_id_of(user["id"], body.to_user_id)
    doc = {
        "id": str(uuid.uuid4()),
        "thread_id": tid,
        "from_user_id": user["id"],
        "from_user_name": user["name"],
        "to_user_id": body.to_user_id,
        "text": body.text,
        "created_at": now_iso(),
    }
    await db.messages.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ---------- Admin ----------
@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_role("admin"))):
    total_users = await db.users.count_documents({})
    total_books = await db.books.count_documents({})
    total_orders = await db.orders.count_documents({})
    orders_agg = await db.orders.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]).to_list(1)
    revenue = orders_agg[0]["total"] if orders_agg else 0
    active_stores = await db.users.count_documents({"role": "store_owner"})
    publishers = await db.users.count_documents({"role": "publisher"})
    return {
        "total_users": total_users,
        "total_books": total_books,
        "total_orders": total_orders,
        "revenue": revenue,
        "stores": active_stores,
        "publishers": publishers,
    }


@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_role("admin"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return users


@api.put("/admin/users/{user_id}/suspend")
async def admin_suspend(user_id: str, user: dict = Depends(require_role("admin"))):
    u = await db.users.find_one({"id": user_id})
    if not u:
        raise HTTPException(404, "Not found")
    await db.users.update_one({"id": user_id}, {"$set": {"suspended": not u.get("suspended", False)}})
    return {"ok": True}


@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, user: dict = Depends(require_role("admin"))):
    await db.users.delete_one({"id": user_id})
    return {"ok": True}


@api.put("/admin/books/{book_id}/feature")
async def admin_feature(book_id: str, user: dict = Depends(require_role("admin"))):
    b = await db.books.find_one({"id": book_id})
    if not b:
        raise HTTPException(404, "Not found")
    await db.books.update_one({"id": book_id}, {"$set": {"featured": not b.get("featured", False)}})
    return {"ok": True}


@api.get("/admin/books")
async def admin_books(user: dict = Depends(require_role("admin"))):
    books = await db.books.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return books


# ---------- Dashboard (seller/publisher) ----------
@api.get("/dashboard/overview")
async def dashboard_overview(user: dict = Depends(get_current_user)):
    my_books = await db.books.count_documents({"owner_id": user["id"]})
    orders_cur = db.orders.find({"items.seller_id": user["id"]}, {"_id": 0})
    orders = await orders_cur.to_list(500)
    total_orders = len(orders)
    revenue = 0.0
    for o in orders:
        for it in o["items"]:
            if it["seller_id"] == user["id"]:
                revenue += it["price"] * it["quantity"]
    return {
        "total_books": my_books,
        "total_orders": total_orders,
        "revenue": revenue,
    }


# ---------- Register router ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
