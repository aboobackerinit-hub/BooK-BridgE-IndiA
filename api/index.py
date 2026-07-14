import traceback
import json

def build_error_app(err_msg, tb_msg):
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    error_app = FastAPI()
    @error_app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
    async def catch_all(path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Backend initialization failed",
                "details": err_msg,
                "traceback": tb_msg
            }
        )
    return error_app

try:
    from backend.server import app as real_app  # type: ignore
    app = real_app
except Exception as e:
    err_msg = str(e)
    tb_msg = traceback.format_exc()
    app = build_error_app(err_msg, tb_msg)

__all__ = ["app"]
