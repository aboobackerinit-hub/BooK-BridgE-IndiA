# This file acts as the entrypoint for Vercel Serverless Functions.
# It simply imports the FastAPI app from the refactored backend structure.
import os
import sys

# Ensure the root directory is in the Python path for absolute imports like `from backend...`
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import app
