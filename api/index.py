"""
Vercel Serverless Function entry point.

This file re-exports the FastAPI application defined in /backend/server.py.
Vercel's Python runtime auto-detects the `app` variable as an ASGI application
and dispatches all /api/* requests to it.

Local dev is unaffected — supervisor still runs /app/backend/server.py directly.
"""
import sys
import traceback
import json
from pathlib import Path

# Define app globally at top-level to satisfy Vercel's static analyzer
app = None

try:
    # Make the backend/ folder importable
    BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
    sys.path.insert(0, str(BACKEND_DIR))
    from server import app as _real_app  # type: ignore
    app = _real_app
except Exception as e:
    err_msg = str(e)
    tb_msg = traceback.format_exc()

    async def _error_app(scope, receive, send):
        if scope['type'] == 'http':
            await send({
                'type': 'http.response.start',
                'status': 500,
                'headers': [(b'content-type', b'application/json')],
            })
            await send({
                'type': 'http.response.body',
                'body': json.dumps({"error": err_msg, "traceback": tb_msg}).encode('utf-8'),
            })
    app = _error_app

__all__ = ["app"]
