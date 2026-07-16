import os

with open('api/index.py', 'r') as f:
    code = f.read()

indented_code = '\n'.join(['    ' + line for line in code.split('\n')])

new_code = f"""import traceback
from fastapi import FastAPI

try:
{indented_code}
except Exception as e:
    app = FastAPI()
    err = traceback.format_exc()
    @app.api_route("/{{path:path}}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    def root(path: str):
        return {{"error": "BOOT_CRASH", "traceback": err}}
"""

with open('api/index.py', 'w') as f:
    f.write(new_code)
