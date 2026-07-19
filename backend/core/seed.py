import os
import random
import logging
from backend.core.database import sb, APIError
from backend.core.security import hash_password, gen_bbid

logger = logging.getLogger("bookbridge.seed")

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
