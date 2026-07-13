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

## Iteration 3 (2026-01)
- ✅ Sign-up no longer auto-logs user in → redirects to /login with "Please sign in" toast
- ✅ Login/Register pages auto-redirect to /store if already logged in
- ✅ Notifications toggle now wired: bell icon in top nav shows badge for unread messages + pending seller orders; polls every 12s; only active when `notifications_enabled=true`; new-message toast pop-up
- ✅ New "Sell a Book" page (`/sell`) accessible to every logged-in user (not just sellers/publishers) with:
  - Live book cover preview
  - Full details form (title, author, description, category, condition, edition, ISBN, language, price, stock, image URL)
  - Entry points: user menu dropdown ("Sell a Book" with primary color) + floating CTA on Store page
- ✅ New endpoints: GET /api/notifications, POST /api/chat/{other_user_id}/read
- ✅ Messages now have `read` field for accurate unread tracking

## Iteration 4 (2026-01)
- ✅ Removed all image URL text fields; replaced with real file upload picker (ImageUpload component)
- ✅ Client-side image resize to max 800px width @ JPEG q=0.85 → base64 dataURL stored in MongoDB (compact)
- ✅ Applied to: Sell a Book page (book cover), Settings → Profile (circular avatar), Store Owner/Publisher dashboard Add/Edit book dialog
- ✅ Upload UI: dashed drop zone → shows preview with "Change" and "X" buttons after upload
- ✅ 6 MB file size cap with toast validation

## Iteration 6 (2026-01) — Supabase Migration Complete
- ✅ Migrated backend from MongoDB → Supabase Postgres (via supabase-py)
- ✅ 6 tables: users, books, posts, cart, orders, messages (with RLS enabled)
- ✅ Supabase Storage bucket "images" with public read policy
- ✅ Base64 image dataURLs auto-uploaded to Supabase Storage on write (returns public CDN URL)
- ✅ Seed data recreated in Supabase (4 users, 8 books, 3 posts)
- ✅ Kept custom JWT+bcrypt auth (pragmatic — Supabase Auth would require email verification)
- ✅ All existing frontend code unchanged — only backend swapped
- ✅ Verified end-to-end via curl + Playwright screenshot
- Env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY added to /app/backend/.env
- Schema file at /app/supabase_schema.sql for reproducibility

## Not doable by main agent
- Git push to GitHub → user must click "Save to GitHub" button in Emergent UI
- Vercel deploy → user-side; frontend only will work; backend needs separate hosting (Railway/Render/etc.)

## Iteration 7 (2026-01) — Vercel Serverless Restructure
- ✅ Created /app/api/index.py — Vercel serverless function entry (imports FastAPI app from backend/server.py)
- ✅ Created /app/vercel.json with build config, function config (@vercel/python@4.3.1, maxDuration 30s, includeFiles backend/**), rewrites (/api/* → /api/index.py)
- ✅ Created lean /app/requirements.txt (repo root) + /app/api/requirements.txt (function-local, 6 deps only)
- ✅ Created /app/frontend/.env.production with REACT_APP_BACKEND_URL="" (same-origin)
- ✅ Updated /app/frontend/src/lib/api.js to fallback to same-origin when env is empty
- ✅ Created /app/VERCEL_DEPLOY.md with full deployment instructions
- ✅ Local dev (supervisor + preview) still works (backend at /app/backend/server.py unchanged)
- ✅ Verified /app/api/index.py imports cleanly (48 routes exposed)

## User Action Items
- Click "Save to GitHub" → push to main
- Import repo in Vercel → set env vars (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, CORS_ORIGINS)
- Leave REACT_APP_BACKEND_URL blank (same-origin) or set to Vercel URL
- Deploy — Vercel auto-detects vercel.json and builds frontend + Python function together

## Iteration 8 (2026-02) — Bug batch + Vercel deploy hardening
**Root cause:** Vercel switched to `uv` as default Python installer and honors `pyproject.toml` + `uv.lock` over `requirements.txt`. Without pyproject.toml, uv was re-resolving deps against Vercel's newer default Python (likely 3.13), breaking on `bcrypt==4.1.3` / `cryptography==44.0.1` (no 3.13 wheels at that time).

**Fix applied:**
- ✅ Added `/app/pyproject.toml` with `requires-python = "~=3.12.0"`, all 8 deps pinned, `[tool.uv] python-downloads = "never"` (prevents uv from silently swapping interpreter).
- ✅ Generated `/app/uv.lock` via `uv lock` (37 packages, committed) so Vercel never re-resolves.
- ✅ Restored `/app/requirements.txt` at repo root as fallback.
- ✅ Kept `/app/api/requirements.txt` (byte-identical) + `/app/.python-version=3.12` as extra safety nets.
- ✅ Removed outdated `@vercel/python@4.7.2` pin from vercel.json — Vercel now uses latest runtime with uv support.
- ✅ Verified locally: `uv sync --frozen` and `uv pip install -r requirements.txt` both exit 0 on Python 3.12.13.
- ✅ Pytest regression: 48/49 pass (no new failures).
- ✅ Registration: verified working end-to-end on preview (POST /api/auth/register → 200 with JWT). No code change needed.
- ✅ Demo Accounts section: already removed from /login (confirmed in DOM by testing agent).
- ✅ "Made with Emergent" watermark: removed from index.html (no posthog, no badge, no emergent.sh link).
- ✅ Reviews composer: replaced free-text image URL input with real file-upload flow (hidden `<input type=file>` + FileReader + canvas resize @ 1200px + Add photo button + preview + Remove). Backend already uploads base64 dataURLs to Supabase Storage bucket 'images'.
- ✅ Vercel `uv pip install` fix: removed duplicate root /app/requirements.txt; pinned exact versions in /app/api/requirements.txt (fastapi==0.116.1, pydantic==2.11.0, PyJWT==2.12.1, cryptography==44.0.1, bcrypt==4.1.3, supabase==2.16.0, python-dotenv==1.1.0, email-validator==2.3.0). Verified `uv pip install -r requirements.txt` succeeds on Python 3.12.13 locally.
- ✅ Testing agent: 48/49 backend tests pass, all 4 P0 frontend bug-fix scenarios pass.

## Deployment guide (Vercel)
1. Click **"Save to GitHub"** button in Emergent chat input to push code to main.
2. In Vercel dashboard → your project → Settings → Environment Variables, ensure these are set (Production):
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CORS_ORIGINS` (comma-separated or `*`)
3. Trigger a redeploy (Deployments → ⋯ → Redeploy).
4. Verify: open `<your-vercel-url>/api/health` — should return `{"ok":true,"db_reachable":true,...}`.
5. Test registration on the live site.

## Backlog / Future
- P1: Real payments (Stripe/Razorpay)
- P1: Email OTP registration via Resend
- P1: WebSocket / Supabase Realtime chat instead of polling
- P2: Push notifications, Publisher analytics charts, Advanced admin moderation, Book-level reviews (currently only feed posts)
- P3: (nit) GET /api/books/{invalid-uuid} returns 500 instead of 404 — wrap lookup in try/except
- P3: Split server.py (879 lines) into routers/{auth,books,cart,orders,posts,chat,admin}.py
