"""
Vercel Serverless Function entry point.

This file re-exports the FastAPI application defined in /backend/server.py.
Vercel's Python runtime auto-detects the `app` variable as an ASGI application
and dispatches all /api/* requests to it.

Local dev is unaffected — supervisor still runs /app/backend/server.py directly.
"""
import sys
from pathlib import Path

# Make the backend/ folder importable
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

# noqa: E402
from server import app  # type: ignore

# Vercel picks up `app` as the ASGI application
__all__ = ["app"]
