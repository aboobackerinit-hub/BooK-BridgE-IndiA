import os
import json
import logging
import asyncio
from dotenv import load_dotenv

# Load Supabase credentials before initializing database
load_dotenv(".env.local")

from backend.core.database import sb

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backup")

TABLES = ["users", "books", "posts", "orders", "cart", "messages", "notifications"]

def backup_table(table_name):
    logger.info(f"Backing up table: {table_name}")
    try:
        data = []
        offset = 0
        limit = 1000
        while True:
            # We don't have count support directly in this client easily, so we paginate
            response = sb.table(table_name).select("*").range(offset, offset + limit - 1).execute()
            records = response.data
            if not records:
                break
            data.extend(records)
            if len(records) < limit:
                break
            offset += limit
            
        filename = f"backup_{table_name}.json"
        with open(filename, "w") as f:
            json.dump(data, f, indent=2)
        logger.info(f"Saved {len(data)} records to {filename}")
    except Exception as e:
        logger.error(f"Failed to backup {table_name}: {e}")

def backup_storage():
    logger.info("Backing up storage metadata (images bucket)")
    try:
        files = sb.storage.from_("images").list()
        filename = "backup_storage_images.json"
        with open(filename, "w") as f:
            json.dump(files, f, indent=2)
        logger.info(f"Saved {len(files)} file metadata entries to {filename}")
    except Exception as e:
        logger.error(f"Failed to backup storage: {e}")

def main():
    logger.info("Starting Supabase full backup...")
    if not sb:
        logger.error("Supabase client not initialized. Cannot perform backup.")
        return
        
    for table in TABLES:
        backup_table(table)
        
    backup_storage()
    logger.info("Backup complete.")

if __name__ == "__main__":
    main()
