import os
import logging
from dotenv import load_dotenv
from pathlib import Path

# Load .env and .env.local for local dev; Vercel injects env vars natively.
# We traverse up to find .env files
load_dotenv(Path(__file__).parent.parent.parent / '.env')
load_dotenv(Path(__file__).parent.parent.parent / '.env.local')

# Firebase Configuration
FIREBASE_API_KEY = os.environ.get("FIREBASE_API_KEY") or ""
FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID") or ""
FIREBASE_CLIENT_EMAIL = os.environ.get("FIREBASE_CLIENT_EMAIL") or ""
FIREBASE_PRIVATE_KEY = os.environ.get("FIREBASE_PRIVATE_KEY") or ""
FIREBASE_STORAGE_BUCKET = os.environ.get("FIREBASE_STORAGE_BUCKET") or ""
FIREBASE_SERVICE_ACCOUNT_JSON_PATH = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON_PATH") or os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON") or ""

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME") or ""
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY") or ""
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET") or ""

# App Secret config
JWT_SECRET = os.environ.get("JWT_SECRET") or "dev-secret-please-set-in-env"
JWT_ALG = "HS256"
JWT_EXPIRE_HOURS = 24 * 7  # 7 days

# Email Settings
SMTP_HOST = os.environ.get("SMTP_HOST", "localhost")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "1025"))
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASS = os.environ.get("SMTP_PASS")

# Rate Limiting
RATE_LIMIT_AUTH = int(os.environ.get("RATE_LIMIT_AUTH", "100"))       # per minute
RATE_LIMIT_READ = int(os.environ.get("RATE_LIMIT_READ", "300"))      # per minute
RATE_LIMIT_WRITE = int(os.environ.get("RATE_LIMIT_WRITE", "60"))     # per minute

# CORS
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("bookbridge")
