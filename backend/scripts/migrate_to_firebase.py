import json
import os
import logging
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(".env.local")

# Set up Firebase Admin
import firebase_admin
from firebase_admin import credentials, firestore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration")

def get_firebase_db():
    if not firebase_admin._apps:
        # Load from config
        FIREBASE_SERVICE_ACCOUNT_JSON_PATH = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON_PATH")
        if FIREBASE_SERVICE_ACCOUNT_JSON_PATH:
            cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_JSON_PATH)
            firebase_admin.initialize_app(cred)
        else:
            raise Exception("No Firebase Service Account JSON found. Cannot migrate.")
    return firestore.client()

def migrate_collection(db, collection_name, backup_file, id_field="id", transform_fn=None):
    if not os.path.exists(backup_file):
        logger.warning(f"Backup file {backup_file} not found. Skipping {collection_name}.")
        return

    with open(backup_file, "r") as f:
        data = json.load(f)

    if not data:
        logger.info(f"No records in {backup_file}. Skipping {collection_name}.")
        return

    logger.info(f"Migrating {len(data)} records to {collection_name}...")
    batch = db.batch()
    count = 0
    total = 0

    for item in data:
        if transform_fn:
            item = transform_fn(item)
            if not item:
                continue

        doc_id = str(item.pop(id_field, item.get("id")))
        doc_ref = db.collection(collection_name).document(doc_id)
        batch.set(doc_ref, item)
        count += 1
        total += 1

        if count >= 490: # Batch limit
            batch.commit()
            logger.info(f"Committed {total} records to {collection_name}...")
            batch = db.batch()
            count = 0

    if count > 0:
        batch.commit()
        logger.info(f"Committed {total} records to {collection_name}... Done.")

def transform_user(user):
    # Ensure name_lower is present for search
    if user.get("name"):
        user["name_lower"] = user["name"].lower()
    return user

def transform_book(book):
    if book.get("title"):
        book["title_lower"] = book["title"].lower()
    # Assume owner details are fetched/denormalized later or already present
    return book

def transform_order(order):
    # Extract seller_ids for the array-contains queries
    seller_ids = set()
    items = order.get("items") or []
    for it in items:
        if it.get("seller_id"):
            seller_ids.add(it["seller_id"])
    order["seller_ids"] = list(seller_ids)
    return order

def main():
    try:
        db = get_firebase_db()
    except Exception as e:
        logger.error(str(e))
        return

    migrate_collection(db, "users", "backup_users.json", transform_fn=transform_user)
    migrate_collection(db, "books", "backup_books.json", transform_fn=transform_book)
    migrate_collection(db, "posts", "backup_posts.json")
    migrate_collection(db, "orders", "backup_orders.json", transform_fn=transform_order)
    migrate_collection(db, "cart", "backup_cart.json")
    migrate_collection(db, "messages", "backup_messages.json")
    
    # We don't have chat_threads in Supabase, we need to generate them from messages
    logger.info("Generating chat_threads from messages...")
    try:
        if os.path.exists("backup_messages.json"):
            with open("backup_messages.json", "r") as f:
                messages = json.load(f)
                
            threads = {}
            for m in messages:
                tid = m.get("thread_id")
                if not tid: continue
                if tid not in threads:
                    threads[tid] = {
                        "participants": [m["from_user_id"], m["to_user_id"]],
                        "last_message": m["text"],
                        "last_time": m["created_at"]
                    }
                else:
                    if m["created_at"] > threads[tid]["last_time"]:
                        threads[tid]["last_message"] = m["text"]
                        threads[tid]["last_time"] = m["created_at"]
                        
            batch = db.batch()
            c = 0
            for tid, tdata in threads.items():
                doc_ref = db.collection("chat_threads").document(tid)
                batch.set(doc_ref, tdata)
                c += 1
                if c >= 490:
                    batch.commit()
                    batch = db.batch()
                    c = 0
            if c > 0:
                batch.commit()
            logger.info("Chat threads generated successfully.")
    except Exception as e:
        logger.error(f"Failed to generate chat threads: {e}")

    logger.info("Migration complete!")

if __name__ == "__main__":
    main()
