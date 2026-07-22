import requests
import json
import base64
import time
import sys

BASE_URL = "https://boo-k-bridg-e-indi-a.vercel.app/api"
TEST_EMAIL = f"test_{int(time.time())}@example.com"
TEST_PASS = "password123"

print(f"1. Registering new user {TEST_EMAIL} on Live Application...")
reg_res = requests.post(f"{BASE_URL}/auth/register", json={
    "name": "Live Tester",
    "email": TEST_EMAIL,
    "password": TEST_PASS,
    "role": "user"
})

token = reg_res.json().get("token")
user_id = reg_res.json().get("user", {}).get("id")

if not token or token == "firebase_token_pending":
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASS
    })
    token = login_res.json()["token"]
    user_id = login_res.json()["user"]["id"]

image_base64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
book_data = {
    "title": f"Live Vercel Prod Test Book {int(time.time())}",
    "author": "Automated Tester",
    "price": 149,
    "condition": "New",
    "category": "Fiction",
    "description": "This is a test book uploaded directly to the Vercel live application.",
    "image_url": image_base64,
    "user_id": user_id
}

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

print("Polling Live API until the deployment updates...")
max_attempts = 10
for i in range(max_attempts):
    print(f"\nAttempt {i+1}...")
    upload_res = requests.post(f"{BASE_URL}/books", json=book_data, headers=headers)
    if upload_res.status_code != 200:
        print(f"Upload failed: {upload_res.status_code} {upload_res.text}")
        time.sleep(15)
        continue
        
    book_response = upload_res.json()
    image_url = book_response.get("image_url") or book_response.get("image")
    print(f"Received Image URL: {str(image_url)[:100]}...")
    
    book_id = book_response.get("id")
    requests.delete(f"{BASE_URL}/books/{book_id}", headers=headers)
    
    if image_url and "supabase.co" in image_url:
        print("Still returning Supabase URL. Vercel deployment not ready yet. Waiting 20 seconds...")
        time.sleep(20)
    else:
        print(f"\nSUCCESS! Deployment updated! Image URL: {str(image_url)[:100]}")
        sys.exit(0)

print("Timeout reached.")
sys.exit(1)
