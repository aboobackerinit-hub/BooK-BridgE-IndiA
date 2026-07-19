"""
Create Firestore composite indexes programmatically using the REST API.
This bypasses the firebase-tools CLI permission issues by using the
Firestore Admin REST API with the service account credentials.
"""
import json
import os
from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2 import service_account

load_dotenv(".env.local")

SA_PATH = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON_PATH", "").strip('"')
PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "book-bridge-india-hopwhi")

SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]

credentials = service_account.Credentials.from_service_account_file(SA_PATH, scopes=SCOPES)
credentials.refresh(Request())

import requests

BASE_URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/collectionGroups"

indexes = [
    {
        "collection": "books",
        "fields": [
            {"fieldPath": "approved", "order": "ASCENDING"},
            {"fieldPath": "created_at", "order": "DESCENDING"}
        ]
    },
    {
        "collection": "books",
        "fields": [
            {"fieldPath": "category", "order": "ASCENDING"},
            {"fieldPath": "created_at", "order": "DESCENDING"}
        ]
    },
    {
        "collection": "books",
        "fields": [
            {"fieldPath": "owner_id", "order": "ASCENDING"},
            {"fieldPath": "created_at", "order": "DESCENDING"}
        ]
    },
    {
        "collection": "books",
        "fields": [
            {"fieldPath": "featured", "order": "ASCENDING"},
            {"fieldPath": "created_at", "order": "DESCENDING"}
        ]
    },
    {
        "collection": "books",
        "fields": [
            {"fieldPath": "title_lower", "order": "ASCENDING"},
            {"fieldPath": "created_at", "order": "DESCENDING"}
        ]
    },
    {
        "collection": "orders",
        "fields": [
            {"fieldPath": "user_id", "order": "ASCENDING"},
            {"fieldPath": "created_at", "order": "DESCENDING"}
        ]
    },
    {
        "collection": "orders",
        "fields": [
            {"fieldPath": "seller_ids", "arrayConfig": "CONTAINS"},
            {"fieldPath": "created_at", "order": "DESCENDING"}
        ]
    },
    {
        "collection": "chat_threads",
        "fields": [
            {"fieldPath": "participants", "arrayConfig": "CONTAINS"},
            {"fieldPath": "last_time", "order": "DESCENDING"}
        ]
    },
    {
        "collection": "messages",
        "fields": [
            {"fieldPath": "thread_id", "order": "ASCENDING"},
            {"fieldPath": "created_at", "order": "ASCENDING"}
        ]
    },
    {
        "collection": "messages",
        "fields": [
            {"fieldPath": "to_user_id", "order": "ASCENDING"},
            {"fieldPath": "read", "order": "ASCENDING"},
            {"fieldPath": "created_at", "order": "DESCENDING"}
        ]
    },
    {
        "collection": "posts",
        "fields": [
            {"fieldPath": "created_at", "order": "DESCENDING"}
        ]
    },
    {
        "collection": "books",
        "fields": [
            {"fieldPath": "approved", "order": "ASCENDING"},
            {"fieldPath": "category", "order": "ASCENDING"},
            {"fieldPath": "created_at", "order": "DESCENDING"}
        ]
    },
    {
        "collection": "books",
        "fields": [
            {"fieldPath": "approved", "order": "ASCENDING"},
            {"fieldPath": "featured", "order": "ASCENDING"},
            {"fieldPath": "created_at", "order": "DESCENDING"}
        ]
    },
]

headers = {
    "Authorization": f"Bearer {credentials.token}",
    "Content-Type": "application/json"
}

for idx in indexes:
    collection = idx["collection"]
    fields = []
    for f in idx["fields"]:
        field = {"fieldPath": f["fieldPath"]}
        if "order" in f:
            field["order"] = f["order"]
        elif "arrayConfig" in f:
            field["arrayConfig"] = f["arrayConfig"]
        fields.append(field)
    
    # Single-field indexes are created automatically; only composite (2+ fields) need explicit creation
    if len(fields) < 2:
        print(f"  Skipping single-field index for {collection}")
        continue
    
    body = {
        "queryScope": "COLLECTION",
        "fields": fields
    }
    
    url = f"{BASE_URL}/{collection}/indexes"
    resp = requests.post(url, json=body, headers=headers)
    
    if resp.status_code == 200:
        print(f"  [OK] Created index for {collection}: {[f['fieldPath'] for f in fields]}")
    elif resp.status_code == 409:
        print(f"  [EXISTS] Index already exists for {collection}: {[f['fieldPath'] for f in fields]}")
    else:
        print(f"  [FAIL] Failed for {collection}: {resp.status_code} {resp.text[:200]}")

print("\nDone! Note: Indexes may take a few minutes to build.")
