from fastapi import FastAPI, APIRouter
from fastapi.responses import JSONResponse
import sys

app = FastAPI(title="BookBridge Debug")
api = APIRouter()

@api.get("/health")
def health():
    return {"ok": True, "python_path": sys.path}

@api.post("/auth/register")
def register():
    return JSONResponse(status_code=500, content={"error": "Still debugging Vercel imports!"})

app.include_router(api, prefix="/api")
app.include_router(api)
