import logging
from typing import Optional
import firebase_admin
from firebase_admin import credentials, firestore
from backend.core.config import (
    FIREBASE_SERVICE_ACCOUNT_JSON_PATH,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
    FIREBASE_PROJECT_ID,
)

logger = logging.getLogger("bookbridge.database")

# Firestore client (initialized on request)
db = None
firebase_app = None
firebase_error = ""


def init_firebase():
    """Initialize Firebase Admin SDK and Firestore client."""
    global db, firebase_app, firebase_error
    if firebase_app is not None:
        return

    try:
        cred = None
        if FIREBASE_SERVICE_ACCOUNT_JSON_PATH:
            if FIREBASE_SERVICE_ACCOUNT_JSON_PATH.startswith("{"):
                import json
                cred = credentials.Certificate(json.loads(FIREBASE_SERVICE_ACCOUNT_JSON_PATH))
            else:
                cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_JSON_PATH)
        elif FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY and FIREBASE_PROJECT_ID:
            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": FIREBASE_PROJECT_ID,
                "private_key": FIREBASE_PRIVATE_KEY.replace('\\n', '\n'),
                "client_email": FIREBASE_CLIENT_EMAIL,
                "token_uri": "https://oauth2.googleapis.com/token",
            })

        if cred:
            firebase_app = firebase_admin.initialize_app(cred)
            db = firestore.client()
            logger.info("Firebase Admin initialized successfully.")
        else:
            firebase_error = "Missing Firebase Service Account credentials."
            logger.error(firebase_error)

    except Exception as e:
        firebase_error = str(e)
        logger.error(f"Firebase init failed: {e}")


# Try initializing on startup
init_firebase()


def get_db():
    """Get the Firestore client instance."""
    if not db:
        init_firebase()
    return db
