# BookBridge India — PRD

## Original Problem Statement
BookBridge India — social + marketplace platform for books in India with 4 user roles (User, Store Owner, Publisher, Admin). Includes auth, store (Flipkart-style), Facebook-style reviews timeline, cart/checkout, chat, dashboards. "Make demo for me and usable for my friends".

## Architecture
- Backend: FastAPI + Motor (MongoDB), JWT auth with bcrypt password hashing
- Frontend: React 19 + react-router-dom v7, Tailwind + shadcn/ui, Playfair Display + Inter, terracotta/sage palette
- Storage: MongoDB collections — users, books, posts, cart, orders, messages
- Deployment: /api prefix, REACT_APP_BACKEND_URL

## Core Requirements
- Multi-role auth (User, Store Owner, Publisher, Admin) with signup/login
- Book Store with category filter + search
- Book detail + Add to cart / Buy Now
- Cart, checkout (mock COD/UPI), Place Order
- My Orders with status pipeline
- Reviews (Facebook-style feed) — post text+image, like, comment
- User Profile (public), Follow/Unfollow
- 1-to-1 Chat with polling (via BBID or user search)
- App Settings (edit profile, privacy, notifications)
- Store Owner + Publisher dashboards — stats, book CRUD, order status update
- Admin dashboard — user/book/order management, suspend, feature books

## Personas
- Reader (User): browses, buys, reviews, chats
- Store Owner: manages inventory, fulfils orders
- Publisher: publishes titles with ISBN, tracks sales
- Admin: platform oversight

## Implemented (2026-01)
- ✅ Full JWT auth with role selection at signup, bcrypt hashing
- ✅ Seed admin + 3 demo users + 8 sample books + 3 sample posts
- ✅ Store page with hero, category filter, search, featured
- ✅ Book detail page with buy/cart/chat with seller
- ✅ Reviews feed with likes, comments, share (copy link)
- ✅ Cart + Checkout + Order Placement
- ✅ Orders page with visual status pipeline
- ✅ Chat page with thread list, user search by BBID, polling
- ✅ Profile page with follow/unfollow, listed books
- ✅ Settings page (profile, privacy, notifications)
- ✅ Store Owner + Publisher dashboards (shared component)
- ✅ Admin dashboard (users, books, orders)

## Backlog / Future
- P1: Real payments (Stripe/Razorpay)
- P1: WebSocket chat instead of polling
- P1: Image upload (currently image URL only)
- P2: Push notifications
- P2: Publisher analytics charts (recharts)
- P2: Advanced admin moderation (reports, spam)
- P2: Reviews on individual books (currently only feed posts)

## Test Credentials
See `/app/memory/test_credentials.md`

## Iteration 2 (2026-01)
- ✅ Emerald green color palette (replaced terracotta)
- ✅ Dark mode with toggle button in top nav + Settings
- ✅ Language selector (English / Malayalam) — nav labels switch
- ✅ Cart removed from top nav → moved into user menu dropdown (with live count badge)
- ✅ Redesigned Settings page with 6 tabs: Profile, Account, Appearance, Notifications, Email, Blocked
- ✅ Change password (with current-password verification)
- ✅ Delete account (destructive dialog with password confirm — cascades books/posts/cart/messages)
- ✅ Block/Unblock users (button on profile + list in settings)
- ✅ Email preferences (orders / messages / follows / marketing)
- ✅ Seller order card highlights buyer's shipping address (📦 Ship to block)
- ⏭️ Razorpay: skipped by user — keeping Cash on Delivery
