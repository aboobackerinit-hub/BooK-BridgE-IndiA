import traceback
import json
import sys
import os

try:
    import fastapi
    from fastapi import FastAPI, Request
    FASTAPI_AVAILABLE = True
except Exception as e:
    FASTAPI_AVAILABLE = False
    FASTAPI_ERROR = traceback.format_exc()

from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = {
            "hello": "world",
            "fastapi_available": FASTAPI_AVAILABLE,
            "fastapi_error": FASTAPI_ERROR if not FASTAPI_AVAILABLE else None,
            "sys_path": sys.path,
            "cwd": os.getcwd()
        }
        self.wfile.write(json.dumps(response).encode())
    
    def do_POST(self):
        self.do_GET()

# Also provide a dummy app just in case Vercel is stubborn
app = None
