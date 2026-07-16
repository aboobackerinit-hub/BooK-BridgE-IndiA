import os

with open('backend/server.py', 'r') as f:
    code = f.read()

indented_code = '\n'.join(['    ' + line for line in code.split('\n')])

new_code = f"""import traceback
import json

class DummyApp:
    async def __call__(self, scope, receive, send):
        pass

app = DummyApp()

try:
{indented_code}
    
except Exception as e:
    err = traceback.format_exc()
    
    async def fallback_app(scope, receive, send):
        if scope["type"] == "http":
            await send({{
                "type": "http.response.start",
                "status": 500,
                "headers": [(b"content-type", b"application/json")]
            }})
            await send({{
                "type": "http.response.body",
                "body": json.dumps({{"error": "BOOT_CRASH", "traceback": err}}).encode("utf-8")
            }})
            
    app = fallback_app
"""

with open('api/index.py', 'w') as f:
    f.write(new_code)

