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

try:
    from pathlib import Path
    BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
    sys.path.insert(0, str(BACKEND_DIR))

    # noqa: E402
    from server import app  # type: ignore
except Exception as e:
    err_msg = str(e)
    tb_msg = traceback.format_exc()

    async def app(scope, receive, send):
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

__all__ = ["app"]
