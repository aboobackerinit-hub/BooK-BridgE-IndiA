"""
Pydantic schemas for request validation across all API endpoints.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional


# ── Auth ──────────────────────────────────────────────────────────────

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=2)
    role: str = "user"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ResetPasswordIn(BaseModel):
    email: str


class ResetPasswordConfirmIn(BaseModel):
    token: str
    new_password: str


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


class DeleteAccountIn(BaseModel):
    password: str


# ── Users ─────────────────────────────────────────────────────────────

class UserUpdateIn(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    privacy_public: Optional[bool] = None
    notifications_enabled: Optional[bool] = None


class EmailPrefsIn(BaseModel):
    email_orders: Optional[bool] = None
    email_messages: Optional[bool] = None
    email_follows: Optional[bool] = None
    email_marketing: Optional[bool] = None


class LocationUpdate(BaseModel):
    lat: float
    lng: float
    district: Optional[str] = None
    state: Optional[str] = None
    college_id: Optional[str] = None
    college_name: Optional[str] = None


# ── Books ─────────────────────────────────────────────────────────────

class BookIn(BaseModel):
    title: str
    author: str
    description: Optional[str] = ""
    price: float
    stock: int = 1
    category: str = "General"
    condition: str = "New"
    image_url: Optional[str] = ""
    isbn: Optional[str] = ""
    edition: Optional[str] = ""
    language: str = "English"
    # Enhanced fields
    listing_type: str = "sell"  # sell | exchange | donate
    delivery_options: list[str] = ["pickup"]  # pickup, courier, meet_college, meet_library, meet_public
    subject: Optional[str] = None
    publisher_name: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_district: Optional[str] = None
    location_state: Optional[str] = None
    location_college_id: Optional[str] = None


class BookUpdateIn(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    listing_type: Optional[str] = None
    delivery_options: Optional[list[str]] = None
    subject: Optional[str] = None
    publisher_name: Optional[str] = None


# ── Posts / Social ────────────────────────────────────────────────────

class PostIn(BaseModel):
    text: str
    image_url: Optional[str] = ""
    book_id: Optional[str] = None

class PostUpdateIn(BaseModel):
    text: str
    image_url: Optional[str] = None


class CommentIn(BaseModel):
    text: str


# ── Cart & Orders ────────────────────────────────────────────────────

class CartItemIn(BaseModel):
    book_id: str
    quantity: int = 1


class OrderIn(BaseModel):
    address: str
    phone: str
    payment_method: str = "cod"
    delivery_method: str = "pickup"  # pickup, courier, meet_college, meet_library, meet_public
    delivery_notes: Optional[str] = None


class OrderStatusIn(BaseModel):
    status: str


# ── Chat ──────────────────────────────────────────────────────────────

class MessageIn(BaseModel):
    to_user_id: str
    text: str


class ChatImageIn(BaseModel):
    to_user_id: str
    image_url: str  # Cloudinary URL after upload


class ChatBookShareIn(BaseModel):
    to_user_id: str
    book_id: str


class ReportIn(BaseModel):
    reason: str = Field(..., min_length=5, max_length=500)
    description: Optional[str] = None


# ── Reviews ───────────────────────────────────────────────────────────

class ReviewIn(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    text: str = Field(..., min_length=10, max_length=2000)


# ── Wishlist ──────────────────────────────────────────────────────────

class WishlistAlertPrefs(BaseModel):
    notify_price_drop: bool = True
    notify_available: bool = True
    notify_update: bool = False


# ── Admin ─────────────────────────────────────────────────────────────

class AdminAnnouncementIn(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    body: str = Field(..., min_length=10, max_length=2000)

