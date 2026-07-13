"""
Test: POST /api/posts with a base64 data URL image
Verifies backend accepts image_url as data URL and either uploads to
Supabase storage (returns https URL) or keeps the data URL as fallback.
This is the P0 feature for Reviews page file upload flow.
"""
import base64
import os
import uuid
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
USER_EMAIL = "aditi@demo.in"
DEMO_PASSWORD = "demo123"

# Tiny 1x1 red PNG (base64)
TINY_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
)


def _login_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": USER_EMAIL, "password": DEMO_PASSWORD
    })
    assert r.status_code == 200
    return r.json()["token"]


class TestPostImageUpload:
    def test_create_post_with_data_url_image(self):
        """POST /api/posts should accept data URL and return post with image_url populated."""
        token = _login_token()
        data_url = f"data:image/png;base64,{TINY_PNG_B64}"
        marker = uuid.uuid4().hex[:8]
        r = requests.post(
            f"{BASE_URL}/api/posts",
            headers={"Authorization": f"Bearer {token}"},
            json={"text": f"TEST_ImageUpload_{marker}", "image_url": data_url},
        )
        assert r.status_code == 200, f"Post creation failed: {r.text}"
        post = r.json()
        assert "id" in post
        assert "image_url" in post
        assert post["image_url"], "image_url should not be empty"
        # Either uploaded to storage (https URL) or fallback data URL
        assert post["image_url"].startswith("http") or post["image_url"].startswith("data:image/"), \
            f"Unexpected image_url format: {post['image_url'][:80]}"
        print(f"✓ Post created with image_url prefix: {post['image_url'][:80]}")

        # Verify persistence by fetching feed
        feed = requests.get(f"{BASE_URL}/api/posts").json()
        found = next((p for p in feed if p["id"] == post["id"]), None)
        assert found is not None, "Newly created post not present in /api/posts feed"
        assert found["image_url"] == post["image_url"], "image_url not persisted"
        print(f"✓ Post persisted in feed with image_url")

    def test_create_post_text_only(self):
        """POST /api/posts with only text (no image) should still work (regression)."""
        token = _login_token()
        marker = uuid.uuid4().hex[:8]
        r = requests.post(
            f"{BASE_URL}/api/posts",
            headers={"Authorization": f"Bearer {token}"},
            json={"text": f"TEST_TextOnly_{marker}"},
        )
        assert r.status_code == 200, f"Text-only post failed: {r.text}"
        post = r.json()
        assert post["text"].startswith("TEST_TextOnly_")
        print(f"✓ Text-only post works: {post['id']}")


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v", "--tb=short"])
