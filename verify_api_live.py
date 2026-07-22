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

if reg_res.status_code != 200:
    print(f"Registration failed: {reg_res.status_code} {reg_res.text}")
    sys.exit(1)

token = reg_res.json().get("token")
user_id = reg_res.json().get("user", {}).get("id")

if not token or token == "firebase_token_pending":
    print("Registration succeeded but didn't return a token immediately. Logging in...")
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASS
    })
    if login_res.status_code != 200:
        print(f"Login failed: {login_res.status_code} {login_res.text}")
        sys.exit(1)
    token = login_res.json()["token"]
    user_id = login_res.json()["user"]["id"]

print(f"Auth successful! User ID: {user_id}")

print("2. Preparing book data...")
# A simple 1x1 red JPEG image in base64
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

print("3. Uploading book to Live Application...")
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

upload_res = requests.post(f"{BASE_URL}/books", json=book_data, headers=headers)

if upload_res.status_code != 200:
    print(f"Upload failed: {upload_res.status_code} {upload_res.text}")
    sys.exit(1)

book_response = upload_res.json()
print("Upload successful!")
print(json.dumps(book_response, indent=2))

print("\n4. Verifying image URL...")
image_url = book_response.get("image_url") or book_response.get("image")
if not image_url:
    print("FAILED: No image URL returned in response.")
    sys.exit(1)

print(f"Image URL: {image_url}")

if "res.cloudinary.com" in image_url:
    print("SUCCESS: Image URL is a valid Cloudinary secure_url.")
else:
    print("FAILED: Image URL does not point to Cloudinary.")
    sys.exit(1)

print("\n5. Testing Cloudinary URL directly...")
img_test = requests.get(image_url)
if img_test.status_code == 200:
    print("SUCCESS: Cloudinary URL returned HTTP 200.")
else:
    print(f"FAILED: Cloudinary URL returned HTTP {img_test.status_code}")
    sys.exit(1)

print("\n6. Cleaning up test book...")
book_id = book_response.get("id")
delete_res = requests.delete(f"{BASE_URL}/books/{book_id}", headers=headers)
if delete_res.status_code == 200:
    print("SUCCESS: Test book deleted.")
else:
    print(f"Warning: Failed to delete test book: {delete_res.status_code} {delete_res.text}")

print("\nAll Live Deployment Verifications Passed!")
