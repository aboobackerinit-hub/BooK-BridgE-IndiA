import traceback
import sys
import os
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type','text/plain')
        self.end_headers()
        
        try:
            from backend.server import app
            self.wfile.write(b"Import successful! But we bypassed it.")
        except Exception as e:
            err = traceback.format_exc()
            self.wfile.write(f"Import failed!\n\n{err}".encode('utf-8'))
            
    def do_POST(self):
        self.do_GET()
