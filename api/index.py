from fastapi import FastAPI
app = FastAPI()

@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "test"}

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
async def catch_all(path: str):
    return {"message": f"Hello from test API wrapper on {path}"}

