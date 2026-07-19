import os
import time
import logging
from fastapi import FastAPI, Request
from starlette.middleware.cors import CORSMiddleware

from backend.core.config import CORS_ORIGINS
from backend.api.router import api_router
from backend.core.rate_limiter import RateLimitMiddleware

logger = logging.getLogger("bookbridge.main")

app = FastAPI(
    title="BookBridge India API",
    description="Marketplace API for buying, selling, exchanging, and donating books in India.",
    version="2.0.0",
)


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("Starting up BookBridge India API...")

    # Initialize Cloudinary
    try:
        from backend.services.cloudinary_service import _ensure_configured
        _ensure_configured()
    except Exception as e:
        logger.warning(f"Cloudinary init skipped: {e}")

    # Register hook handlers
    try:
        from backend.core.hooks import register
        from backend.services.search_engine import generate_search_tokens
        from backend.services.notification_service import notify_book_sold, notify_review

        logger.info("Hook system initialized.")
    except Exception as e:
        logger.warning(f"Hook registration skipped: {e}")

    logger.info("BookBridge India API startup complete.")


# ── Middleware (order matters: last added = first executed) ────────────

# Rate limiter
app.add_middleware(RateLimitMiddleware)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log request method, path, and response time."""
    start = time.time()
    response = await call_next(request)
    elapsed = time.time() - start

    # Only log slow requests or errors to avoid noise
    if elapsed > 1.0 or response.status_code >= 400:
        logger.info(
            f"{request.method} {request.url.path} → {response.status_code} ({elapsed:.3f}s)"
        )

    return response

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS.split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────

app.include_router(api_router, prefix="/api")
# Also mount at root for backward compatibility
app.include_router(api_router)
