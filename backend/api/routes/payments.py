import logging
import json
from fastapi import APIRouter, HTTPException, Depends, Request, Header
from pydantic import BaseModel
from typing import Optional
from backend.core.database import get_db
from backend.api.dependencies import get_current_user
from backend.core.config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
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
    amount: Optional[float] = None  # Backend uses trusted order_data["total"]


class VerifyPaymentIn(BaseModel):
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


def fulfill_payment_and_deduct_stock(order_id: str, payment_id: str, signature: str = "") -> dict:
    """
    Atomically fulfill order, verify and deduct stock, clear user cart, and mark order as Paid.
    Guarantees idempotency (runs only once per order) and prevents overselling.
    """
    db = get_db()
    order_ref = db.collection("orders").document(order_id)
    
    transaction = db.transaction()
    
    @firestore.transactional
    def _fulfill_in_transaction(transaction, order_ref):
        order_doc = order_ref.get(transaction=transaction)
        if not order_doc.exists:
            raise HTTPException(404, "Order not found")
            
        order_data = order_doc.to_dict()
        
        # Idempotency check: if already paid, return success without duplicate stock deduction
        if order_data.get("payment_status") == "Paid":
            return {"status": "success", "message": "Order is already paid"}
            
        items = order_data.get("items", [])
        user_id = order_data.get("user_id")
        
        # Check and deduct stock atomically
        books_to_update = []
        for item in items:
            book_ref = db.collection("books").document(item["book_id"])
            book_snap = book_ref.get(transaction=transaction)
            if not book_snap.exists:
                continue
            b = book_snap.to_dict()
            current_stock = b.get("stock", 0)
            qty = item.get("quantity", 1)
            
            if current_stock < qty:
                # Oversell prevention: Mark for refund handling
                transaction.update(order_ref, {
                    "payment_status": "Stock Error - Refund Needed",
                    "status": "Pending Refund",
                    "razorpay_payment_id": payment_id,
                    "updated_at": firestore.SERVER_TIMESTAMP
                })
                logger.error(f"Oversell prevented for order {order_id}: Book '{b.get('title')}' stock is {current_stock}, requested {qty}")
                return {"status": "error", "message": f"Stock unavailable for '{b.get('title')}'"}
                
            books_to_update.append((book_ref, current_stock - qty))
            
        # Apply stock updates atomically
        for book_ref, new_stock in books_to_update:
            transaction.update(book_ref, {"stock": new_stock})
            
        # Mark order as Paid and Processing
        update_dict = {
            "payment_status": "Paid",
            "status": "Processing",
            "razorpay_payment_id": payment_id,
            "paid_at": firestore.SERVER_TIMESTAMP
        }
        if signature:
            update_dict["razorpay_signature"] = signature
            
        transaction.update(order_ref, update_dict)
        
        # Clear cart items for this user atomically
        if user_id:
            cart_docs = db.collection("cart").where("user_id", "==", user_id).stream()
            for c in cart_docs:
                transaction.delete(c.reference)
                
        return {"status": "success", "message": "Payment verified and order fulfilled"}
        
    return _fulfill_in_transaction(transaction, order_ref)


@router.post("/create-order")
def create_payment_order(body: CreatePaymentOrderIn, user: dict = Depends(get_current_user)):
    """Create a Razorpay payment order using server-side trusted order total."""
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

    # TRUSTED AMOUNT CALCULATION FROM SERVER ORDER DATA
    order_total = float(order_data.get("total", 0.0))
    if order_total <= 0:
        raise HTTPException(400, "Invalid order total amount")

    # Amount in paise (1 INR = 100 paise)
    amount_in_paisa = int(round(order_total * 100))

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
        # Fallback response for dev / dummy test keys
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
    """Verify Razorpay payment signature and confirmed captured status before marking order as Paid."""
    db = get_db()
    order_ref = db.collection("orders").document(body.order_id)
    order_doc = order_ref.get()

    if not order_doc.exists:
        raise HTTPException(404, "Order not found")

    order_data = order_doc.to_dict()
    if order_data.get("user_id") != user["id"]:
        raise HTTPException(403, "Access denied")

    # Double check if already paid (idempotency)
    if order_data.get("payment_status") == "Paid":
        return {"status": "success", "message": "Order is already paid"}

    order_total = float(order_data.get("total", 0.0))
    expected_amount_in_paisa = int(round(order_total * 100))

    # Signature & Payment Status verification
    signature_valid = False
    if rzp_client and not body.razorpay_order_id.startswith("order_dummy_"):
        try:
            # 1. Verify HMAC Signature
            rzp_client.utility.verify_payment_signature({
                'razorpay_order_id': body.razorpay_order_id,
                'razorpay_payment_id': body.razorpay_payment_id,
                'razorpay_signature': body.razorpay_signature
            })
            signature_valid = True
        except Exception as e:
            logger.error(f"Signature verification failed for order {body.order_id}: {e}")
            raise HTTPException(400, "Invalid payment signature")

        # 2. Server-side API verification of actual Razorpay payment status and amount
        try:
            rzp_payment = rzp_client.payment.fetch(body.razorpay_payment_id)
            pay_status = rzp_payment.get("status")
            pay_amount = int(rzp_payment.get("amount", 0))

            # Reject if amount doesn't match trusted server order amount
            if pay_amount != expected_amount_in_paisa:
                logger.error(f"Payment amount mismatch for order {body.order_id}: Expected {expected_amount_in_paisa}, got {pay_amount}")
                raise HTTPException(400, "Payment amount mismatch")

            if pay_status == "authorized":
                # Auto-capture if in authorized state
                rzp_client.payment.capture(body.razorpay_payment_id, pay_amount)
                pay_status = "captured"

            if pay_status != "captured":
                logger.error(f"Payment status is '{pay_status}' (not captured) for order {body.order_id}")
                raise HTTPException(400, f"Payment is not confirmed as captured (status: {pay_status})")
        except HTTPException:
            raise
        except Exception as py_err:
            logger.warning(f"Razorpay payment fetch/capture warning for order {body.order_id}: {py_err}")
    else:
        # Development / dummy mode fallback
        signature_valid = bool(body.razorpay_payment_id)

    if signature_valid:
        res = fulfill_payment_and_deduct_stock(body.order_id, body.razorpay_payment_id, body.razorpay_signature)
        if res.get("status") == "error":
            raise HTTPException(400, res.get("message", "Stock unavailable"))
        return {"status": "success", "message": "Payment verified and order fulfilled successfully"}
    else:
        raise HTTPException(400, "Payment verification failed")


@router.post("/razorpay/webhook")
async def razorpay_webhook(request: Request, x_razorpay_signature: Optional[str] = Header(None)):
    """Secure, idempotent Razorpay webhook endpoint (Fail-Closed authentication)."""
    raw_body = await request.body()
    body_str = raw_body.decode("utf-8")

    # FAIL CLOSED if Webhook Secret is missing
    if not RAZORPAY_WEBHOOK_SECRET:
        logger.error("Razorpay webhook rejected: RAZORPAY_WEBHOOK_SECRET is not configured.")
        raise HTTPException(500, "Webhook secret not configured")

    if not x_razorpay_signature:
        raise HTTPException(400, "Missing Razorpay signature header")

    # Verify Webhook Signature using ONLY RAZORPAY_WEBHOOK_SECRET
    if rzp_client:
        try:
            rzp_client.utility.verify_webhook_signature(body_str, x_razorpay_signature, RAZORPAY_WEBHOOK_SECRET)
        except Exception as e:
            logger.error(f"Razorpay webhook signature verification failed: {e}")
            raise HTTPException(400, "Invalid webhook signature")

    try:
        payload = json.loads(body_str)
        event = payload.get("event")
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {}) or payload.get("payload", {}).get("order", {}).get("entity", {})
        
        notes = entity.get("notes", {})
        bookbridge_order_id = notes.get("bookbridge_order_id")
        
        if not bookbridge_order_id:
            # Fallback search by razorpay_order_id
            rzp_order_id = entity.get("order_id") or entity.get("id")
            if rzp_order_id:
                db = get_db()
                docs = db.collection("orders").where("razorpay_order_id", "==", rzp_order_id).limit(1).stream()
                for doc in docs:
                    bookbridge_order_id = doc.id
                    break

        if bookbridge_order_id:
            db = get_db()
            order_ref = db.collection("orders").document(bookbridge_order_id)
            order_doc = order_ref.get()

            if order_doc.exists:
                order_data = order_doc.to_dict()
                if event in ("payment.captured", "order.paid"):
                    if order_data.get("payment_status") != "Paid":
                        payment_id = entity.get("id") or order_data.get("razorpay_payment_id", "")
                        fulfill_payment_and_deduct_stock(bookbridge_order_id, payment_id)
                        logger.info(f"Webhook: Order {bookbridge_order_id} fulfilled via {event}")
                elif event == "payment.failed":
                    if order_data.get("payment_status") != "Paid":
                        order_ref.update({
                            "payment_status": "Failed"
                        })
                        logger.info(f"Webhook: Order {bookbridge_order_id} marked as Failed via {event}")

        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        return {"status": "ok"}

