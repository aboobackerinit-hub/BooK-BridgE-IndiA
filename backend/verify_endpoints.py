import requests
import sys
import uuid

BASE_URL = "http://localhost:8000/api"
TEST_USER = {
    "name": "Test User",
    "email": f"testuser_{uuid.uuid4().hex[:8]}@example.com",
    "password": "password123",
    "role": "user"
}

results = {"passed": [], "failed": []}

def run_test(name, func):
    try:
        res = func()
        if res:
            results["passed"].append(name)
            print(f"PASS: {name}")
        else:
            results["failed"].append(name)
            print(f"FAIL: {name}")
    except Exception as e:
        results["failed"].append(f"{name} (Error: {e})")
        print(f"ERROR: {name} - {e}")

# 1. Register
token = None
def test_register():
    global token
    res = requests.post(f"{BASE_URL}/auth/register", json=TEST_USER)
    if res.status_code == 200:
        token = res.json().get("token")
        return True
    print(res.json())
    return False

# 2. Login
def test_login():
    global token
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": TEST_USER["email"],
        "password": TEST_USER["password"]
    })
    if res.status_code == 200:
        token = res.json().get("token")
        return True
    return False

# 3. Profile / Me
def test_profile():
    if not token: return False
    res = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {token}"})
    return res.status_code == 200

# 4. Marketplace (Books list)
def test_marketplace():
    res = requests.get(f"{BASE_URL}/books/")
    return res.status_code == 200

# 5. Search
def test_search():
    res = requests.get(f"{BASE_URL}/books?q=test")
    return res.status_code == 200

# 6. Chat (List messages)
def test_chat():
    if not token: return False
    res = requests.get(f"{BASE_URL}/chat/some_other_id", headers={"Authorization": f"Bearer {token}"})
    return res.status_code == 200

# 7. Orders (List orders)
def test_orders():
    if not token: return False
    res = requests.get(f"{BASE_URL}/orders/", headers={"Authorization": f"Bearer {token}"})
    return res.status_code == 200

# 8. Settings (Change Password)
def test_settings():
    if not token: return False
    res = requests.post(f"{BASE_URL}/auth/change-password", headers={"Authorization": f"Bearer {token}"}, json={
        "current_password": "password123",
        "new_password": "password1234"
    })
    return res.status_code == 200

# 9. Book Upload
def test_book_upload():
    if not token: return False
    res = requests.post(f"{BASE_URL}/books/", headers={"Authorization": f"Bearer {token}"}, json={
        "title": "Test Book",
        "author": "Test Author",
        "price": 100,
        "condition": "New",
        "category": "Fiction"
    })
    return res.status_code == 200

print("Starting automated verification...")
run_test("Signup", test_register)
run_test("Login", test_login)
run_test("Profile", test_profile)
run_test("Marketplace", test_marketplace)
run_test("Search", test_search)
run_test("Chat", test_chat)
run_test("Orders", test_orders)
run_test("Book upload", test_book_upload)
run_test("Settings (Change Password)", test_settings)

print("\n--- Summary ---")
print(f"Passed: {len(results['passed'])}")
print(f"Failed: {len(results['failed'])}")
if results["failed"]:
    sys.exit(1)
