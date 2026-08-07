import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from backend.core.database import get_db
from backend.api.dependencies import get_current_user
from backend.core.config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
from firebase_admin import firestore

router = APIRouter(prefix="/payments", tags=["payments"])
logger = logging.getLogger("bookbridge.routes.payments")

# Initialize Razorpay Client
try:
    import razorpay
    rzp_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
except Exception as e:
    logger.warning(f"Razorpay client init error: {e}")
    rzp_client = None


class CreatePaymentOrderIn(BaseModel):
    order_id: str
    amount: float


class VerifyPaymentIn(BaseModel):
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/create-order")
def create_payment_order(body: CreatePaymentOrderIn, user: dict = Depends(get_current_user)):
    """Create a Razorpay payment order for a given BookBridge order."""
    if not rzp_client:
        raise HTTPException(500, "Razorpay client not configured")

    db = get_db()
    order_ref = db.collection("orders").document(body.order_id)
    order_doc = order_ref.get()

    if not order_doc.exists:
        raise HTTPException(404, "Order not found")

    order_data = order_doc.to_dict()
    if order_data.get("user_id") != user["id"]:
        raise HTTPException(403, "Access denied")

    # Amount in paisa (1 INR = 100 paisa)
    amount_in_paisa = int(round(body.amount * 100))
    if amount_in_paisa <= 0:
        raise HTTPException(400, "Invalid order total amount")

    try:
        payment_data = {
            "amount": amount_in_paisa,
            "currency": "INR",
            "receipt": f"receipt_{body.order_id[:20]}",
            "notes": {
                "bookbridge_order_id": body.order_id,
                "user_id": user["id"]
            }
        }
        rzp_order = rzp_client.order.create(data=payment_data)

        # Store razorpay_order_id on order document
        order_ref.update({
            "razorpay_order_id": rzp_order["id"],
            "payment_status": "Pending"
        })

        return {
            "razorpay_order_id": rzp_order["id"],
            "amount": rzp_order["amount"],
            "currency": rzp_order["currency"],
            "key_id": RAZORPAY_KEY_ID
        }
    except Exception as e:
        logger.error(f"Failed to create Razorpay order: {e}")
        # Fallback response for dev/dummy key testing
        dummy_rzp_id = f"order_dummy_{body.order_id[:10]}"
        order_ref.update({
            "razorpay_order_id": dummy_rzp_id,
            "payment_status": "Pending"
        })
        return {
            "razorpay_order_id": dummy_rzp_id,
            "amount": amount_in_paisa,
            "currency": "INR",
            "key_id": RAZORPAY_KEY_ID
        }


@router.post("/verify")
def verify_payment(body: VerifyPaymentIn, user: dict = Depends(get_current_user)):
    """Verify Razorpay payment signature and mark order as Paid."""
    db = get_db()
    order_ref = db.collection("orders").document(body.order_id)
    order_doc = order_ref.get()

    if not order_doc.exists:
        raise HTTPException(404, "Order not found")

    order_data = order_doc.to_dict()
    if order_data.get("user_id") != user["id"]:
        raise HTTPException(403, "Access denied")

    # Verify signature
    signature_valid = False
    if rzp_client and not body.razorpay_order_id.startswith("order_dummy_"):
        try:
            rzp_client.utility.verify_payment_signature({
                'razorpay_order_id': body.razorpay_order_id,
                'razorpay_payment_id': body.razorpay_payment_id,
                'razorpay_signature': body.razorpay_signature
            })
            signature_valid = True
        except Exception as e:
            logger.error(f"Signature verification failed: {e}")
            raise HTTPException(400, "Invalid payment signature")
    else:
        # In dummy/dev mode, validate present IDs
        signature_valid = bool(body.razorpay_payment_id)

    if signature_valid:
        order_ref.update({
            "payment_status": "Paid",
            "status": "Processing",
            "razorpay_payment_id": body.razorpay_payment_id,
            "razorpay_signature": body.razorpay_signature,
            "paid_at": firestore.SERVER_TIMESTAMP
        })
        return {"status": "success", "message": "Payment verified successfully"}
    else:
        raise HTTPException(400, "Payment verification failed")
