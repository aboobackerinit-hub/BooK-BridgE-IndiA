import traceback
from fastapi import FastAPI

try:
    import DOES_NOT_EXIST
except Exception as e:
    app = FastAPI()
    err = traceback.format_exc()
    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    def root(path: str):
        return {"error": "BOOT_CRASH", "traceback": err}
