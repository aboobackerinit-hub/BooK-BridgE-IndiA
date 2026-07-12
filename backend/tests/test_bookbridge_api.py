"""
BookBridge India API Tests
Tests for: Auth, Books, Cart, Orders, Posts/Reviews, Chat, Users, Admin
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@bookbridge.in"
ADMIN_PASSWORD = "Admin@123"
STORE_OWNER_EMAIL = "priya@demo.in"
PUBLISHER_EMAIL = "raj@demo.in"
USER_EMAIL = "aditi@demo.in"
DEMO_PASSWORD = "demo123"


class TestHealthAndBasics:
    """Basic API health checks"""
    
    def test_books_endpoint_accessible(self):
        """GET /api/books returns 200"""
        response = requests.get(f"{BASE_URL}/api/books")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Books endpoint returns {len(data)} books")
    
    def test_categories_endpoint(self):
        """GET /api/categories returns list"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert "Fiction" in data
        print(f"✓ Categories: {data}")


class TestAuth:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Admin login with seeded credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful, BBID: {data['user'].get('bbid')}")
    
    def test_store_owner_login_success(self):
        """Store owner (priya) login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STORE_OWNER_EMAIL,
            "password": DEMO_PASSWORD
        })
        assert response.status_code == 200, f"Store owner login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "store_owner"
        print(f"✓ Store owner login successful: {data['user']['name']}")
    
    def test_publisher_login_success(self):
        """Publisher (raj) login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PUBLISHER_EMAIL,
            "password": DEMO_PASSWORD
        })
        assert response.status_code == 200, f"Publisher login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "publisher"
        print(f"✓ Publisher login successful: {data['user']['name']}")
    
    def test_user_login_success(self):
        """Regular user (aditi) login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": DEMO_PASSWORD
        })
        assert response.status_code == 200, f"User login failed: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "user"
        print(f"✓ User login successful: {data['user']['name']}")
    
    def test_login_invalid_credentials(self):
        """Login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")
    
    def test_auth_me_with_token(self):
        """GET /api/auth/me returns user with valid token"""
        # First login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_resp.json()["token"]
        
        # Then get me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        print(f"✓ /api/auth/me returns user: {data['name']}")
    
    def test_auth_me_without_token(self):
        """GET /api/auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ /api/auth/me correctly requires auth")
    
    def test_register_new_user(self):
        """Register a new user with role=user"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "testpass123",
            "name": "Test User",
            "role": "user"
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email.lower()
        assert data["user"]["role"] == "user"
        assert "bbid" in data["user"]
        assert data["user"]["bbid"].startswith("BB-")
        print(f"✓ New user registered with BBID: {data['user']['bbid']}")
    
    def test_register_duplicate_email(self):
        """Register with existing email returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": ADMIN_EMAIL,
            "password": "testpass",
            "name": "Duplicate",
            "role": "user"
        })
        assert response.status_code == 400
        print("✓ Duplicate email correctly rejected")


class TestBooks:
    """Book listing and filtering tests"""
    
    def test_get_all_books(self):
        """GET /api/books returns seeded books with all fields"""
        response = requests.get(f"{BASE_URL}/api/books")
        assert response.status_code == 200
        books = response.json()
        assert len(books) >= 8, f"Expected at least 8 seeded books, got {len(books)}"
        
        # Check book has all required fields
        book = books[0]
        required_fields = ["id", "title", "author", "price", "image_url", "category", "owner_role"]
        for field in required_fields:
            assert field in book, f"Missing field: {field}"
        print(f"✓ GET /api/books returns {len(books)} books with all fields")
    
    def test_filter_by_category_fiction(self):
        """GET /api/books?category=Fiction returns fiction books"""
        response = requests.get(f"{BASE_URL}/api/books", params={"category": "Fiction"})
        assert response.status_code == 200
        books = response.json()
        assert len(books) > 0, "Expected fiction books"
        for book in books:
            assert book["category"] == "Fiction", f"Got non-fiction book: {book['title']}"
        print(f"✓ Category filter returns {len(books)} fiction books")
    
    def test_search_white_tiger(self):
        """GET /api/books?q=White returns The White Tiger"""
        response = requests.get(f"{BASE_URL}/api/books", params={"q": "White"})
        assert response.status_code == 200
        books = response.json()
        assert len(books) > 0, "Expected to find The White Tiger"
        titles = [b["title"] for b in books]
        assert any("White Tiger" in t for t in titles), f"White Tiger not found in: {titles}"
        print(f"✓ Search 'White' returns: {titles}")
    
    def test_get_single_book(self):
        """GET /api/books/{id} returns book with owner attached"""
        # First get a book id
        books_resp = requests.get(f"{BASE_URL}/api/books")
        books = books_resp.json()
        book_id = books[0]["id"]
        
        # Get single book
        response = requests.get(f"{BASE_URL}/api/books/{book_id}")
        assert response.status_code == 200
        book = response.json()
        assert book["id"] == book_id
        assert "owner" in book, "Book should have owner attached"
        assert book["owner"] is not None
        print(f"✓ Single book '{book['title']}' has owner: {book['owner']['name']}")
    
    def test_get_nonexistent_book(self):
        """GET /api/books/{invalid_id} returns 404"""
        response = requests.get(f"{BASE_URL}/api/books/nonexistent-id-12345")
        assert response.status_code == 404
        print("✓ Nonexistent book returns 404")


class TestStoreOwnerBooks:
    """Store owner book CRUD tests"""
    
    @pytest.fixture
    def store_owner_token(self):
        """Get store owner auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STORE_OWNER_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["token"], response.json()["user"]["id"]
    
    def test_store_owner_sees_own_books(self, store_owner_token):
        """Store owner can filter books by owner_id"""
        token, owner_id = store_owner_token
        response = requests.get(f"{BASE_URL}/api/books", params={"owner_id": owner_id})
        assert response.status_code == 200
        books = response.json()
        for book in books:
            assert book["owner_id"] == owner_id
        print(f"✓ Store owner sees {len(books)} of their own books")
    
    def test_store_owner_create_book(self, store_owner_token):
        """Store owner can create a book"""
        token, owner_id = store_owner_token
        response = requests.post(f"{BASE_URL}/api/books", 
            headers={"Authorization": f"Bearer {token}"},
            json={
                "title": "TEST_Book_" + uuid.uuid4().hex[:6],
                "author": "Test Author",
                "price": 199,
                "category": "Fiction",
                "description": "Test book for API testing"
            }
        )
        assert response.status_code == 200, f"Create book failed: {response.text}"
        book = response.json()
        assert "id" in book
        assert book["owner_id"] == owner_id
        print(f"✓ Store owner created book: {book['title']}")
        return book["id"]
    
    def test_store_owner_update_book(self, store_owner_token):
        """Store owner can update their book"""
        token, owner_id = store_owner_token
        
        # Create a book first
        create_resp = requests.post(f"{BASE_URL}/api/books",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "title": "TEST_Update_" + uuid.uuid4().hex[:6],
                "author": "Original Author",
                "price": 100,
                "category": "Fiction"
            }
        )
        book_id = create_resp.json()["id"]
        
        # Update it
        response = requests.put(f"{BASE_URL}/api/books/{book_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "title": "Updated Title",
                "author": "Updated Author",
                "price": 150,
                "category": "History"
            }
        )
        assert response.status_code == 200
        updated = response.json()
        assert updated["title"] == "Updated Title"
        assert updated["price"] == 150
        print(f"✓ Store owner updated book to: {updated['title']}")
    
    def test_store_owner_delete_book(self, store_owner_token):
        """Store owner can delete their book"""
        token, owner_id = store_owner_token
        
        # Create a book first
        create_resp = requests.post(f"{BASE_URL}/api/books",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "title": "TEST_Delete_" + uuid.uuid4().hex[:6],
                "author": "To Delete",
                "price": 50,
                "category": "Fiction"
            }
        )
        book_id = create_resp.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/books/{book_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        # Verify deleted
        get_resp = requests.get(f"{BASE_URL}/api/books/{book_id}")
        assert get_resp.status_code == 404
        print("✓ Store owner deleted book successfully")


class TestCart:
    """Cart operations tests"""
    
    @pytest.fixture
    def user_token(self):
        """Get regular user auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["token"]
    
    def test_add_to_cart(self, user_token):
        """POST /api/cart adds book to cart"""
        # Get a book id
        books = requests.get(f"{BASE_URL}/api/books").json()
        book_id = books[0]["id"]
        
        response = requests.post(f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"book_id": book_id, "quantity": 1}
        )
        assert response.status_code == 200
        print(f"✓ Added book to cart")
    
    def test_get_cart(self, user_token):
        """GET /api/cart returns items and total"""
        # First add something
        books = requests.get(f"{BASE_URL}/api/books").json()
        book_id = books[0]["id"]
        requests.post(f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"book_id": book_id, "quantity": 1}
        )
        
        response = requests.get(f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        print(f"✓ Cart has {len(data['items'])} items, total: {data['total']}")
    
    def test_remove_from_cart(self, user_token):
        """DELETE /api/cart/{book_id} removes item"""
        # Add a book
        books = requests.get(f"{BASE_URL}/api/books").json()
        book_id = books[1]["id"]  # Use different book
        requests.post(f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"book_id": book_id, "quantity": 1}
        )
        
        # Remove it
        response = requests.delete(f"{BASE_URL}/api/cart/{book_id}",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        print("✓ Removed item from cart")


class TestOrders:
    """Order placement and tracking tests"""
    
    @pytest.fixture
    def user_with_cart(self):
        """Get user token and add item to cart"""
        # Login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": DEMO_PASSWORD
        })
        token = login_resp.json()["token"]
        
        # Clear cart first by getting and removing all
        cart = requests.get(f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {token}"}
        ).json()
        for item in cart.get("items", []):
            requests.delete(f"{BASE_URL}/api/cart/{item['book_id']}",
                headers={"Authorization": f"Bearer {token}"}
            )
        
        # Add a book
        books = requests.get(f"{BASE_URL}/api/books").json()
        book_id = books[0]["id"]
        requests.post(f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {token}"},
            json={"book_id": book_id, "quantity": 1}
        )
        return token
    
    def test_place_order(self, user_with_cart):
        """POST /api/orders creates order and clears cart"""
        token = user_with_cart
        
        response = requests.post(f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "address": "123 Test Street, Mumbai",
                "phone": "+91 9876543210",
                "payment_method": "cod"
            }
        )
        assert response.status_code == 200, f"Order failed: {response.text}"
        order = response.json()
        assert "id" in order
        assert "order_no" in order
        assert order["status"] == "New"
        assert order["total"] > 0
        print(f"✓ Order placed: {order['order_no']}, total: {order['total']}")
        
        # Verify cart is cleared
        cart = requests.get(f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {token}"}
        ).json()
        assert len(cart["items"]) == 0, "Cart should be empty after order"
        print("✓ Cart cleared after order")
    
    def test_get_user_orders(self):
        """GET /api/orders returns user's orders"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": DEMO_PASSWORD
        })
        token = login_resp.json()["token"]
        
        response = requests.get(f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        assert isinstance(orders, list)
        print(f"✓ User has {len(orders)} orders")


class TestSellerOrders:
    """Seller order management tests"""
    
    @pytest.fixture
    def store_owner_token(self):
        """Get store owner auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STORE_OWNER_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["token"]
    
    def test_seller_sees_orders(self, store_owner_token):
        """GET /api/orders/seller returns orders with seller's books"""
        response = requests.get(f"{BASE_URL}/api/orders/seller",
            headers={"Authorization": f"Bearer {store_owner_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        assert isinstance(orders, list)
        print(f"✓ Seller sees {len(orders)} orders")
    
    def test_seller_update_order_status(self, store_owner_token):
        """PUT /api/orders/{id}/status updates order status"""
        # First get seller orders
        orders_resp = requests.get(f"{BASE_URL}/api/orders/seller",
            headers={"Authorization": f"Bearer {store_owner_token}"}
        )
        orders = orders_resp.json()
        
        if len(orders) == 0:
            pytest.skip("No seller orders to update")
        
        order_id = orders[0]["id"]
        response = requests.put(f"{BASE_URL}/api/orders/{order_id}/status",
            headers={"Authorization": f"Bearer {store_owner_token}"},
            json={"status": "Processing"}
        )
        assert response.status_code == 200
        print(f"✓ Seller updated order status to Processing")


class TestPosts:
    """Posts/Reviews tests"""
    
    @pytest.fixture
    def user_token(self):
        """Get regular user auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_posts(self):
        """GET /api/posts returns posts with author"""
        response = requests.get(f"{BASE_URL}/api/posts")
        assert response.status_code == 200
        posts = response.json()
        assert isinstance(posts, list)
        if len(posts) > 0:
            assert "author" in posts[0], "Post should have author attached"
        print(f"✓ GET /api/posts returns {len(posts)} posts")
    
    def test_create_post(self, user_token):
        """POST /api/posts creates a review"""
        response = requests.post(f"{BASE_URL}/api/posts",
            headers={"Authorization": f"Bearer {user_token}"},
            json={
                "text": "TEST_Post: Great book recommendation! " + uuid.uuid4().hex[:6]
            }
        )
        assert response.status_code == 200
        post = response.json()
        assert "id" in post
        assert "author" in post
        print(f"✓ Created post: {post['id']}")
        return post["id"]
    
    def test_like_post(self, user_token):
        """POST /api/posts/{id}/like toggles like"""
        # Get a post
        posts = requests.get(f"{BASE_URL}/api/posts").json()
        if len(posts) == 0:
            pytest.skip("No posts to like")
        
        post_id = posts[0]["id"]
        
        # Like it
        response = requests.post(f"{BASE_URL}/api/posts/{post_id}/like",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "liked" in data
        print(f"✓ Like toggled: liked={data['liked']}")
    
    def test_comment_on_post(self, user_token):
        """POST /api/posts/{id}/comment adds comment"""
        # Get a post
        posts = requests.get(f"{BASE_URL}/api/posts").json()
        if len(posts) == 0:
            pytest.skip("No posts to comment on")
        
        post_id = posts[0]["id"]
        
        response = requests.post(f"{BASE_URL}/api/posts/{post_id}/comment",
            headers={"Authorization": f"Bearer {user_token}"},
            json={"text": "TEST_Comment: Great review! " + uuid.uuid4().hex[:6]}
        )
        assert response.status_code == 200
        comment = response.json()
        assert "id" in comment
        assert "text" in comment
        print(f"✓ Added comment: {comment['id']}")


class TestChat:
    """Chat messaging tests"""
    
    @pytest.fixture
    def two_users(self):
        """Get tokens for two users"""
        user1_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": DEMO_PASSWORD
        })
        user2_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": STORE_OWNER_EMAIL,
            "password": DEMO_PASSWORD
        })
        return (
            user1_resp.json()["token"],
            user1_resp.json()["user"]["id"],
            user2_resp.json()["token"],
            user2_resp.json()["user"]["id"]
        )
    
    def test_send_message(self, two_users):
        """POST /api/chat sends message to another user"""
        token1, user1_id, token2, user2_id = two_users
        
        response = requests.post(f"{BASE_URL}/api/chat",
            headers={"Authorization": f"Bearer {token1}"},
            json={
                "to_user_id": user2_id,
                "text": "TEST_Message: Hello! " + uuid.uuid4().hex[:6]
            }
        )
        assert response.status_code == 200
        msg = response.json()
        assert "id" in msg
        assert msg["to_user_id"] == user2_id
        print(f"✓ Sent message: {msg['id']}")
    
    def test_get_chat_messages(self, two_users):
        """GET /api/chat/{other_user_id} returns messages"""
        token1, user1_id, token2, user2_id = two_users
        
        # Send a message first
        requests.post(f"{BASE_URL}/api/chat",
            headers={"Authorization": f"Bearer {token1}"},
            json={"to_user_id": user2_id, "text": "Test message"}
        )
        
        response = requests.get(f"{BASE_URL}/api/chat/{user2_id}",
            headers={"Authorization": f"Bearer {token1}"}
        )
        assert response.status_code == 200
        messages = response.json()
        assert isinstance(messages, list)
        print(f"✓ Chat thread has {len(messages)} messages")
    
    def test_get_chat_threads(self, two_users):
        """GET /api/chat/threads returns thread list"""
        token1, user1_id, token2, user2_id = two_users
        
        response = requests.get(f"{BASE_URL}/api/chat/threads",
            headers={"Authorization": f"Bearer {token1}"}
        )
        assert response.status_code == 200
        threads = response.json()
        assert isinstance(threads, list)
        print(f"✓ User has {len(threads)} chat threads")


class TestUserProfile:
    """User profile and follow tests"""
    
    @pytest.fixture
    def user_token(self):
        """Get regular user auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["token"], response.json()["user"]["id"]
    
    def test_update_profile(self, user_token):
        """PUT /api/users/me updates profile"""
        token, user_id = user_token
        
        response = requests.put(f"{BASE_URL}/api/users/me",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Aditi Reader Updated",
                "bio": "Book lover and reviewer",
                "address": "Delhi, India",
                "phone": "+91 98765 43210",
                "privacy_public": True,
                "notifications_enabled": True
            }
        )
        assert response.status_code == 200
        user = response.json()
        assert user["bio"] == "Book lover and reviewer"
        print(f"✓ Profile updated: {user['name']}")
    
    def test_toggle_follow(self, user_token):
        """POST /api/users/{id}/follow toggles follow"""
        token, user_id = user_token
        
        # Get another user to follow
        users = requests.get(f"{BASE_URL}/api/users").json()
        other_user = next((u for u in users if u["id"] != user_id), None)
        if not other_user:
            pytest.skip("No other user to follow")
        
        response = requests.post(f"{BASE_URL}/api/users/{other_user['id']}/follow",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "following" in data
        print(f"✓ Follow toggled: following={data['following']}")
    
    def test_get_user_profile(self, user_token):
        """GET /api/users/{id} returns user profile"""
        token, user_id = user_token
        
        response = requests.get(f"{BASE_URL}/api/users/{user_id}")
        assert response.status_code == 200
        user = response.json()
        assert user["id"] == user_id
        assert "followers" in user
        assert "following" in user
        print(f"✓ Got user profile: {user['name']}")


class TestAdmin:
    """Admin dashboard tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_admin_stats(self, admin_token):
        """GET /api/admin/stats returns totals"""
        response = requests.get(f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        stats = response.json()
        assert "total_users" in stats
        assert "total_books" in stats
        assert "total_orders" in stats
        assert "revenue" in stats
        print(f"✓ Admin stats: {stats['total_users']} users, {stats['total_books']} books")
    
    def test_admin_users(self, admin_token):
        """GET /api/admin/users returns all users"""
        response = requests.get(f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        assert len(users) > 0
        print(f"✓ Admin sees {len(users)} users")
    
    def test_admin_books(self, admin_token):
        """GET /api/admin/books returns all books"""
        response = requests.get(f"{BASE_URL}/api/admin/books",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        books = response.json()
        assert isinstance(books, list)
        print(f"✓ Admin sees {len(books)} books")
    
    def test_admin_all_orders(self, admin_token):
        """GET /api/orders/all returns all orders"""
        response = requests.get(f"{BASE_URL}/api/orders/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        assert isinstance(orders, list)
        print(f"✓ Admin sees {len(orders)} orders")
    
    def test_admin_suspend_user(self, admin_token):
        """PUT /api/admin/users/{id}/suspend toggles suspended"""
        # Get a non-admin user
        users = requests.get(f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        target = next((u for u in users if u["role"] != "admin"), None)
        if not target:
            pytest.skip("No non-admin user to suspend")
        
        response = requests.put(f"{BASE_URL}/api/admin/users/{target['id']}/suspend",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        # Toggle back
        requests.put(f"{BASE_URL}/api/admin/users/{target['id']}/suspend",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"✓ Admin toggled suspend for user: {target['name']}")
    
    def test_admin_feature_book(self, admin_token):
        """PUT /api/admin/books/{id}/feature toggles featured"""
        books = requests.get(f"{BASE_URL}/api/admin/books",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        if len(books) == 0:
            pytest.skip("No books to feature")
        
        book_id = books[0]["id"]
        response = requests.put(f"{BASE_URL}/api/admin/books/{book_id}/feature",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print(f"✓ Admin toggled featured for book: {books[0]['title']}")


class TestRoleBasedAccess:
    """Role-based access control tests"""
    
    @pytest.fixture
    def user_token(self):
        """Get regular user auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["token"]
    
    def test_user_cannot_access_admin_stats(self, user_token):
        """Regular user cannot access /api/admin/stats"""
        response = requests.get(f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403
        print("✓ Regular user correctly blocked from admin stats")
    
    def test_user_cannot_access_admin_users(self, user_token):
        """Regular user cannot access /api/admin/users"""
        response = requests.get(f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403
        print("✓ Regular user correctly blocked from admin users")
    
    def test_user_cannot_access_all_orders(self, user_token):
        """Regular user cannot access /api/orders/all"""
        response = requests.get(f"{BASE_URL}/api/orders/all",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 403
        print("✓ Regular user correctly blocked from all orders")
    
    def test_unauthenticated_cannot_create_post(self):
        """Unauthenticated user cannot create post"""
        response = requests.post(f"{BASE_URL}/api/posts",
            json={"text": "Unauthorized post"}
        )
        assert response.status_code == 401
        print("✓ Unauthenticated user correctly blocked from creating post")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
