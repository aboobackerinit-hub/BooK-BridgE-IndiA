"""
Token-bucket rate limiter per IP and per user.

Applied as FastAPI middleware. Configurable limits for auth,
read, and write endpoints. Stored in-memory (upgradable to Redis later).
"""
import time
import threading
import logging
from typing import Optional
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from backend.core.config import RATE_LIMIT_AUTH, RATE_LIMIT_READ, RATE_LIMIT_WRITE

logger = logging.getLogger("bookbridge.rate_limiter")

_buckets: dict[str, dict] = {}
_lock = threading.Lock()

# Cleanup old entries every 5 minutes
_last_cleanup = time.time()
_CLEANUP_INTERVAL = 300


def _classify_endpoint(path: str, method: str) -> str:
    """Classify a request into auth, write, or read category."""
    path_lower = path.lower()

    if "/auth/" in path_lower:
        return "auth"

    if method in ("POST", "PUT", "DELETE", "PATCH"):
        return "write"

    return "read"


def _get_limit(category: str) -> int:
    """Get the rate limit for a category (requests per minute)."""
    limits = {
        "auth": RATE_LIMIT_AUTH,
        "read": RATE_LIMIT_READ,
        "write": RATE_LIMIT_WRITE,
    }
    return limits.get(category, RATE_LIMIT_READ)


def _get_client_key(request: Request) -> str:
    """Get a unique key for the client (IP + user ID if authenticated)."""
    # Use X-Forwarded-For for proxied requests (Railway, Vercel)
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "unknown"

    # If authenticated, include user ID for per-user limiting
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        # Use a hash of the token to avoid storing tokens
        token_hash = str(hash(auth[7:]))[:8]
        return f"{ip}:{token_hash}"

    return ip


def _check_rate_limit(key: str, category: str) -> bool:
    """
    Check if a request is within rate limits using token bucket algorithm.

    Returns True if allowed, False if rate limited.
    """
    global _last_cleanup

    now = time.time()
    limit = _get_limit(category)
    bucket_key = f"{key}:{category}"

    with _lock:
        # Periodic cleanup of expired buckets
        if now - _last_cleanup > _CLEANUP_INTERVAL:
            _cleanup_expired(now)
            _last_cleanup = now

        bucket = _buckets.get(bucket_key)

        if bucket is None:
            # New bucket — full tokens
            _buckets[bucket_key] = {
                "tokens": limit - 1,
                "last_refill": now,
            }
            return True

        # Refill tokens based on elapsed time
        elapsed = now - bucket["last_refill"]
        refill = elapsed * (limit / 60.0)  # tokens per second
        bucket["tokens"] = min(limit, bucket["tokens"] + refill)
        bucket["last_refill"] = now

        if bucket["tokens"] >= 1:
            bucket["tokens"] -= 1
            return True

        return False


def _cleanup_expired(now: float):
    """Remove buckets that haven't been used in over 2 minutes."""
    expired = [
        k for k, v in _buckets.items()
        if now - v["last_refill"] > 120
    ]
    for k in expired:
        del _buckets[k]


class RateLimitMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware that enforces rate limits."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Skip health checks and OPTIONS (CORS preflight)
        if request.url.path.endswith("/health") or request.method == "OPTIONS":
            return await call_next(request)

        client_key = _get_client_key(request)
        category = _classify_endpoint(request.url.path, request.method)

        if not _check_rate_limit(client_key, category):
            logger.warning(f"Rate limit exceeded: {client_key} on {category}")
            return Response(
                content='{"detail":"Rate limit exceeded. Please try again later."}',
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                media_type="application/json",
                headers={"Retry-After": "60"},
            )

        response = await call_next(request)
        return response


def get_stats() -> dict:
    """Return rate limiter statistics for monitoring."""
    with _lock:
        return {
            "active_buckets": len(_buckets),
            "limits": {
                "auth": f"{RATE_LIMIT_AUTH}/min",
                "read": f"{RATE_LIMIT_READ}/min",
                "write": f"{RATE_LIMIT_WRITE}/min",
            },
        }
