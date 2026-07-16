import os

with open('backend/server.py', 'r') as f:
    code = f.read()

indented_code = '\n'.join(['    ' + line for line in code.split('\n')])

new_code = f"""import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="BookBridge India API (Supabase)")

try:
{indented_code}
    
    # NOTE: backend/server.py already includes `app.include_router(api)`
    
except Exception as e:
    err = traceback.format_exc()
    @app.api_route("/{{path:path}}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
    async def catch_all(request: Request, path: str):
        return JSONResponse(status_code=500, content={{"error": "BOOT_CRASH", "traceback": err}})
"""

with open('api/[...path].py', 'w') as f:
    f.write(new_code)
