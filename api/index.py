import sys
import os
import json
import traceback

class FallbackApp:
    def __init__(self, error_msg):
        self.error_msg = error_msg

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "http":
            await send({
                "type": "http.response.start",
                "status": 500,
                "headers": [(b"content-type", b"application/json")]
            })
            await send({
                "type": "http.response.body",
                "body": json.dumps({
                    "error": "BOOT_CRASH",
                    "traceback": self.error_msg
                }).encode("utf-8")
            })

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from backend.server import app as real_app
    app = real_app
except Exception as e:
    app = FallbackApp(traceback.format_exc())

__all__ = ["app"]
