from fastapi import FastAPI
app = FastAPI()

@app.get("/api/health")
def health():
    return {"ok": True, "message": "Dummy health check from api/index.py"}

@app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
def catch_all(path_name: str):
    return {"error": "Fallback caught in api/index.py", "path": path_name}
