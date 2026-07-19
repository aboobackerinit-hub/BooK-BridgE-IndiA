"""
Create Firebase Auth accounts for existing Firestore users.
Since Supabase bcrypt password hashes can't be imported directly to Firebase Auth,
we create the accounts with a known default password for testing.
In production, users would use the 'Reset Password' flow.
"""
import json
import os
import logging
from dotenv import load_dotenv

load_dotenv(".env.local")

import firebase_admin
from firebase_admin import credentials, auth, firestore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("create_auth_users")

SA_PATH = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON_PATH", "").strip('"')

if not firebase_admin._apps:
    cred = credentials.Certificate(SA_PATH)
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Fetch all users from Firestore
users = db.collection("users").stream()

created = 0
skipped = 0
failed = 0

for doc in users:
    u = doc.to_dict()
    uid = doc.id
    email = u.get("email")
    name = u.get("name", "")
    
    if not email:
        logger.warning(f"Skipping user {uid}: no email")
        skipped += 1
        continue
        
    try:
        # Check if user already exists in Firebase Auth
        try:
            existing = auth.get_user(uid)
            logger.info(f"User {email} already exists in Firebase Auth (uid={uid})")
            skipped += 1
            continue
        except auth.UserNotFoundError:
            pass
        
        # Also check by email
        try:
            existing = auth.get_user_by_email(email)
            logger.info(f"User {email} exists with different uid: {existing.uid}")
            skipped += 1
            continue
        except auth.UserNotFoundError:
            pass
            
        # Create the user in Firebase Auth with the same uid
        auth.create_user(
            uid=uid,
            email=email,
            password="demo123",  # Default password for migration
            display_name=name
        )
        created += 1
        logger.info(f"Created Firebase Auth user: {email} (uid={uid})")
        
    except Exception as e:
        logger.error(f"Failed to create user {email}: {e}")
        failed += 1

print(f"\nDone! Created: {created}, Skipped: {skipped}, Failed: {failed}")
print("NOTE: All migrated users have password 'demo123'. Users should reset their password on first login.")
