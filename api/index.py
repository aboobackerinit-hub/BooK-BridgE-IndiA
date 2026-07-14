import sys
from pathlib import Path

# Add backend directory to path so it can be imported
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

# Import the actual FastAPI app
from server import app  # type: ignore

__all__ = ["app"]
