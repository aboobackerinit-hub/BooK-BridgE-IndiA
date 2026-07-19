"""
Simple in-memory TTL cache for frequently accessed data.

Used for categories, leaderboards, trending books, and other data
that can tolerate a few minutes of staleness.

Thread-safe implementation using threading.Lock.
"""
import time
import threading
import functools
import logging
from typing import Any, Optional, Callable

logger = logging.getLogger("bookbridge.cache")

_cache_store: dict[str, dict] = {}
_cache_lock = threading.Lock()


def get(key: str) -> Optional[Any]:
    """Get a value from cache if it exists and hasn't expired."""
    with _cache_lock:
        entry = _cache_store.get(key)
        if entry is None:
            return None
        if time.time() > entry["expires_at"]:
            del _cache_store[key]
            return None
        return entry["value"]


def set(key: str, value: Any, ttl: int = 300) -> None:
    """Set a value in cache with TTL in seconds (default 5 minutes)."""
    with _cache_lock:
        _cache_store[key] = {
            "value": value,
            "expires_at": time.time() + ttl,
        }


def delete(key: str) -> None:
    """Delete a specific key from cache."""
    with _cache_lock:
        _cache_store.pop(key, None)


def invalidate_prefix(prefix: str) -> None:
    """Invalidate all cache keys starting with a prefix."""
    with _cache_lock:
        keys_to_delete = [k for k in _cache_store if k.startswith(prefix)]
        for k in keys_to_delete:
            del _cache_store[k]


def clear() -> None:
    """Clear the entire cache."""
    with _cache_lock:
        _cache_store.clear()


def cached(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator to cache function results with TTL.

    Usage:
        @cached(ttl=300, key_prefix="categories")
        def get_categories():
            ...

    The cache key is built from key_prefix + function name + args.
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Build cache key from prefix, function name, and arguments
            parts = [key_prefix or func.__name__]
            if args:
                parts.extend(str(a) for a in args)
            if kwargs:
                parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
            cache_key = ":".join(parts)

            # Check cache
            result = get(cache_key)
            if result is not None:
                return result

            # Execute and cache
            result = func(*args, **kwargs)
            if result is not None:
                set(cache_key, result, ttl)
            return result

        # Expose cache invalidation for this function
        wrapper.invalidate = lambda: invalidate_prefix(key_prefix or func.__name__)
        return wrapper

    return decorator


def get_stats() -> dict:
    """Return cache statistics for monitoring."""
    with _cache_lock:
        now = time.time()
        total = len(_cache_store)
        expired = sum(1 for v in _cache_store.values() if now > v["expires_at"])
        return {
            "total_entries": total,
            "active_entries": total - expired,
            "expired_entries": expired,
        }
