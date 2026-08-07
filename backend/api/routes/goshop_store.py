import logging
import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from firebase_admin import firestore
from backend.core.database import get_db
from backend.api.dependencies import get_current_user, require_role
from backend.models.schemas import (
    GoShopProductIn, GoShopProductUpdateIn,
    GoShopAddressIn, GoShopOrderIn, GoShopOrderStatusIn,
    GoShopCategoryIn, GoShopReviewIn
)

router = APIRouter(prefix="/goshop", tags=["goshop-store"])
logger = logging.getLogger("bookbridge.routes.goshop")


# ── 1. PRODUCTS & CATALOG ──────────────────────────────────────────────

@router.get("/products")
def list_goshop_products(
    q: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    in_stock: Optional[bool] = None,
    featured: Optional[bool] = None,
    bestseller: Optional[bool] = None,
    sort_by: Optional[str] = "newest",  # newest, price_asc, price_desc, popular
    limit: int = 50
):
    """Public catalog endpoint to search and filter products."""
    db = get_db()
    query = db.collection("products").where("is_active", "==", True)

    if category:
        query = query.where("category", "==", category)
    if featured:
        query = query.where("featured", "==", True)
    if bestseller:
        query = query.where("bestseller", "==", True)

    docs = query.stream()
    products = []

    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id

        # In-memory search filtering for title/description/tags
        if q:
            term = q.lower()
            name_match = term in d.get("name", "").lower()
            desc_match = term in d.get("description", "").lower()
            tags_match = any(term in tag.lower() for tag in d.get("tags", []))
            if not (name_match or desc_match or tags_match):
                continue

        # Price filters
        price = float(d.get("price", 0))
        if min_price is not None and price < min_price:
            continue
        if max_price is not None and price > max_price:
            continue

        # In stock filter
        if in_stock and d.get("stock", 0) <= 0:
            continue

        products.append(d)

    # Sorting
    if sort_by == "price_asc":
        products.sort(key=lambda x: x.get("price", 0))
    elif sort_by == "price_desc":
        products.sort(key=lambda x: x.get("price", 0), reverse=True)
    elif sort_by == "popular":
        products.sort(key=lambda x: (x.get("bestseller", False), x.get("featured", False)), reverse=True)
    else:  # newest
        products.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)

    return products[:limit]


@router.get("/products/{product_id}")
def get_goshop_product(product_id: str):
    """Public detailed view of a product including reviews."""
    db = get_db()
    doc = db.collection("products").document(product_id).get()
    if not doc.exists:
        raise HTTPException(404, "Product not found")

    p = doc.to_dict()
    p["id"] = doc.id

    # Fetch reviews
    reviews_docs = db.collection("reviews").where("product_id", "==", product_id).stream()
    reviews = []
    total_rating = 0
    for r in reviews_docs:
        rd = r.to_dict()
        rd["id"] = r.id
        reviews.append(rd)
        total_rating += rd.get("rating", 5)

    p["reviews"] = reviews
    p["avg_rating"] = round(total_rating / len(reviews), 1) if reviews else 5.0

    return p


@router.post("/products")
def create_goshop_product(body: GoShopProductIn, user: dict = Depends(require_role("admin"))):
    """Admin endpoint to create a new product."""
    db = get_db()
    new_doc = db.collection("products").document()
    product_data = body.dict()
    product_data["created_at"] = firestore.SERVER_TIMESTAMP
    product_data["updated_at"] = firestore.SERVER_TIMESTAMP

    new_doc.set(product_data)
    product_data["id"] = new_doc.id
    return product_data


@router.put("/products/{product_id}")
def update_goshop_product(product_id: str, body: GoShopProductUpdateIn, user: dict = Depends(require_role("admin"))):
    """Admin endpoint to update product details."""
    db = get_db()
    ref = db.collection("products").document(product_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(404, "Product not found")

    update_data = {k: v for k, v in body.dict().items() if v is not None}
    update_data["updated_at"] = firestore.SERVER_TIMESTAMP
    ref.update(update_data)

    updated_doc = ref.get()
    res = updated_doc.to_dict()
    res["id"] = updated_doc.id
    return res


@router.delete("/products/{product_id}")
def delete_goshop_product(product_id: str, user: dict = Depends(require_role("admin"))):
    """Admin endpoint to delete a product."""
    db = get_db()
    ref = db.collection("products").document(product_id)
    if not ref.get().exists:
        raise HTTPException(404, "Product not found")
    ref.delete()
    return {"ok": True, "message": "Product deleted successfully"}


# ── 2. CATEGORIES ──────────────────────────────────────────────────────

@router.get("/categories")
def list_goshop_categories():
    db = get_db()
    docs = db.collection("categories").stream()
    cats = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        cats.append(d)
    return cats


@router.post("/categories")
def create_goshop_category(body: GoShopCategoryIn, user: dict = Depends(require_role("admin"))):
    db = get_db()
    ref = db.collection("categories").document()
    cat_data = body.dict()
    cat_data["slug"] = body.name.lower().replace(" ", "-")
    ref.set(cat_data)
    cat_data["id"] = ref.id
    return cat_data


@router.delete("/categories/{category_id}")
def delete_goshop_category(category_id: str, user: dict = Depends(require_role("admin"))):
    db = get_db()
    ref = db.collection("categories").document(category_id)
    if not ref.get().exists:
        raise HTTPException(404, "Category not found")
    ref.delete()
    return {"ok": True}


# ── 3. ADDRESSES ───────────────────────────────────────────────────────

@router.get("/addresses")
def get_user_addresses(user: dict = Depends(get_current_user)):
    db = get_db()
    docs = db.collection("addresses").where("user_id", "==", user["id"]).stream()
    addresses = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        addresses.append(d)
    return addresses


@router.post("/addresses")
def add_user_address(body: GoShopAddressIn, user: dict = Depends(get_current_user)):
    db = get_db()
    addr_data = body.dict()
    addr_data["user_id"] = user["id"]
    addr_data["created_at"] = firestore.SERVER_TIMESTAMP

    # If set default, clear existing default flags
    if body.is_default:
        existing = db.collection("addresses").where("user_id", "==", user["id"]).stream()
        for doc in existing:
            doc.reference.update({"is_default": False})

    ref = db.collection("addresses").document()
    ref.set(addr_data)
    addr_data["id"] = ref.id
    return addr_data


@router.delete("/addresses/{address_id}")
def delete_user_address(address_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    ref = db.collection("addresses").document(address_id)
    doc = ref.get()
    if not doc.exists or doc.to_dict().get("user_id") != user["id"]:
        raise HTTPException(404, "Address not found")
    ref.delete()
    return {"ok": True}


# ── 4. CART & WISHLIST ─────────────────────────────────────────────────

@router.get("/cart")
def get_goshop_cart(user: dict = Depends(get_current_user)):
    db = get_db()
    docs = db.collection("cart").where("user_id", "==", user["id"]).stream()
    items = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        items.append(d)

    # Attach product info
    total = 0.0
    for item in items:
        pdoc = db.collection("products").document(item["product_id"]).get()
        if pdoc.exists:
            p = pdoc.to_dict()
            p["id"] = pdoc.id
            item["product"] = p
            effective_price = p.get("price", 0) - p.get("discount", 0)
            total += effective_price * item.get("quantity", 1)

    return {"items": items, "total": max(0.0, total)}


@router.post("/cart")
def add_to_goshop_cart(product_id: str, quantity: int = 1, user: dict = Depends(get_current_user)):
    db = get_db()
    pdoc = db.collection("products").document(product_id).get()
    if not pdoc.exists:
        raise HTTPException(404, "Product not found")

    p = pdoc.to_dict()
    if p.get("stock", 0) <= 0:
        raise HTTPException(400, f"Product '{p.get('name')}' is currently out of stock")

    docs = db.collection("cart").where("user_id", "==", user["id"]).where("product_id", "==", product_id).limit(1).stream()
    existing = list(docs)

    if existing:
        ref = existing[0].reference
        new_qty = existing[0].to_dict().get("quantity", 1) + quantity
        if new_qty > p.get("stock", 0):
            raise HTTPException(400, f"Only {p.get('stock')} available in stock")
        ref.update({"quantity": new_qty})
    else:
        ref = db.collection("cart").document()
        ref.set({
            "user_id": user["id"],
            "product_id": product_id,
            "quantity": quantity,
            "created_at": firestore.SERVER_TIMESTAMP
        })

    return {"ok": True, "message": "Product added to cart"}


@router.delete("/cart/{product_id}")
def remove_from_goshop_cart(product_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    docs = db.collection("cart").where("user_id", "==", user["id"]).where("product_id", "==", product_id).stream()
    for d in docs:
        d.reference.delete()
    return {"ok": True}


@router.post("/wishlist/toggle")
def toggle_wishlist(product_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    docs = db.collection("wishlist").where("user_id", "==", user["id"]).where("product_id", "==", product_id).limit(1).stream()
    existing = list(docs)

    if existing:
        existing[0].reference.delete()
        return {"in_wishlist": False, "message": "Removed from wishlist"}
    else:
        ref = db.collection("wishlist").document()
        ref.set({
            "user_id": user["id"],
            "product_id": product_id,
            "created_at": firestore.SERVER_TIMESTAMP
        })
        return {"in_wishlist": True, "message": "Added to wishlist"}


@router.get("/wishlist")
def get_goshop_wishlist(user: dict = Depends(get_current_user)):
    db = get_db()
    docs = db.collection("wishlist").where("user_id", "==", user["id"]).stream()
    items = []
    for doc in docs:
        d = doc.to_dict()
        pdoc = db.collection("products").document(d["product_id"]).get()
        if pdoc.exists:
            p = pdoc.to_dict()
            p["id"] = pdoc.id
            items.append(p)
    return items


# ── 5. ORDERS & WHATSAPP ORDER FLOW ────────────────────────────────────

@router.post("/orders")
def place_goshop_order(body: GoShopOrderIn, user: dict = Depends(get_current_user)):
    """Customer order placement endpoint."""
    db = get_db()

    # 1. Fetch Cart items
    cart_docs = db.collection("cart").where("user_id", "==", user["id"]).stream()
    cart_items = [c.to_dict() for c in cart_docs]
    if not cart_items:
        raise HTTPException(400, "Your cart is empty")

    # 2. Get Delivery Address
    address_data = None
    if body.address_id:
        adoc = db.collection("addresses").document(body.address_id).get()
        if adoc.exists:
            address_data = adoc.to_dict()
    elif body.custom_address:
        address_data = body.custom_address.dict()

    if not address_data:
        raise HTTPException(400, "Valid delivery address required")

    # 3. Deduct Stock & Calculate Total
    order_items = []
    subtotal = 0.0

    for c in cart_items:
        pdoc = db.collection("products").document(c["product_id"]).get()
        if not pdoc.exists:
            continue
        p = pdoc.to_dict()
        if p.get("stock", 0) < c.get("quantity", 1):
            raise HTTPException(400, f"Insufficient stock for {p.get('name')}")

        unit_price = float(p.get("price", 0)) - float(p.get("discount", 0))
        item_total = unit_price * c.get("quantity", 1)
        subtotal += item_total

        order_items.append({
            "product_id": pdoc.id,
            "name": p.get("name"),
            "price": p.get("price"),
            "discount": p.get("discount", 0),
            "quantity": c.get("quantity", 1),
            "image": (p.get("images") or [""])[0]
        })

        # Decrement stock
        db.collection("products").document(pdoc.id).update({
            "stock": firestore.Increment(-c.get("quantity", 1))
        })

    order_no = "GS" + uuid.uuid4().hex[:8].upper()

    order_row = {
        "order_no": order_no,
        "user_id": user["id"],
        "user_name": user.get("name") or address_data.get("full_name"),
        "user_phone": address_data.get("mobile_number") or user.get("phone", ""),
        "items": order_items,
        "subtotal": subtotal,
        "total": subtotal,
        "address": address_data,
        "notes": body.notes or "",
        "status": "Pending",  # Initial status per PRD
        "created_at": firestore.SERVER_TIMESTAMP
    }

    new_order_ref = db.collection("orders").document()
    new_order_ref.set(order_row)

    # Empty Cart
    cart_refs = db.collection("cart").where("user_id", "==", user["id"]).stream()
    for cr in cart_refs:
        cr.reference.delete()

    order_row["id"] = new_order_ref.id
    order_row.pop("created_at", None)

    # Format WhatsApp URL for Admin contact
    phone_clean = address_data.get("mobile_number", "").replace("+", "").replace(" ", "")
    wa_msg = f"Hello {address_data.get('full_name')}, Thank you for your GOSHOP STORE order #{order_no} of ₹{subtotal}. We will verify your order shortly!"
    order_row["whatsapp_url"] = f"https://wa.me/{phone_clean}?text={wa_msg.replace(' ', '%20')}"

    return order_row


@router.get("/orders/my")
def get_my_goshop_orders(user: dict = Depends(get_current_user)):
    db = get_db()
    docs = db.collection("orders").where("user_id", "==", user["id"]).stream()
    orders = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        orders.append(d)

    orders.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)
    return orders


@router.get("/orders/all")
def get_all_goshop_orders(user: dict = Depends(require_role("admin"))):
    """Admin endpoint to view all customer orders with WhatsApp direct link."""
    db = get_db()
    docs = db.collection("orders").stream()
    orders = []
    for doc in docs:
        d = doc.to_dict()
        d["id"] = doc.id
        phone_clean = str(d.get("user_phone", "")).replace("+", "").replace(" ", "").replace("-", "")
        if not phone_clean.startswith("91") and len(phone_clean) == 10:
            phone_clean = "91" + phone_clean
        msg = f"Hello {d.get('user_name')}, regarding your GOSHOP STORE Order #{d.get('order_no')} (Total: ₹{d.get('total')}): Status is {d.get('status')}."
        d["whatsapp_link"] = f"https://wa.me/{phone_clean}?text={msg.replace(' ', '%20')}"
        orders.append(d)

    orders.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)
    return orders


@router.put("/orders/{order_id}/status")
def update_goshop_order_status(order_id: str, body: GoShopOrderStatusIn, user: dict = Depends(require_role("admin"))):
    """Admin endpoint to update order status according to workflow."""
    db = get_db()
    ref = db.collection("orders").document(order_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(404, "Order not found")

    valid_statuses = ["Pending", "Contacted", "Payment Received", "Packing", "Shipped", "Delivered", "Cancelled"]
    if body.status not in valid_statuses:
        raise HTTPException(400, f"Status must be one of: {valid_statuses}")

    ref.update({
        "status": body.status,
        "updated_at": firestore.SERVER_TIMESTAMP
    })

    return {"ok": True, "order_id": order_id, "new_status": body.status}


# ── 6. ADMIN DASHBOARD ANALYTICS ───────────────────────────────────────

@router.get("/admin/stats")
def get_goshop_admin_stats(user: dict = Depends(require_role("admin"))):
    """Admin Overview Analytics Dashboard Data."""
    db = get_db()

    orders_docs = list(db.collection("orders").stream())
    products_docs = list(db.collection("products").stream())
    users_docs = list(db.collection("users").stream())

    total_sales = 0.0
    pending_orders = 0
    shipped_orders = 0

    for o in orders_docs:
        d = o.to_dict()
        if d.get("status") in ["Payment Received", "Packing", "Shipped", "Delivered"]:
            total_sales += float(d.get("total", 0))
        if d.get("status") == "Pending":
            pending_orders += 1
        elif d.get("status") == "Shipped":
            shipped_orders += 1

    low_stock = [p.to_dict() for p in products_docs if p.to_dict().get("stock", 0) <= 5]

    return {
        "total_sales": round(total_sales, 2),
        "total_orders": len(orders_docs),
        "total_products": len(products_docs),
        "total_users": len(users_docs),
        "pending_orders": pending_orders,
        "shipped_orders": shipped_orders,
        "low_stock_count": len(low_stock)
    }


# ── 7. REVIEWS ─────────────────────────────────────────────────────────

@router.post("/reviews")
def add_goshop_review(body: GoShopReviewIn, user: dict = Depends(get_current_user)):
    db = get_db()
    ref = db.collection("reviews").document()
    rev_data = body.dict()
    rev_data["user_id"] = user["id"]
    rev_data["user_name"] = user.get("name", "Verified Customer")
    rev_data["created_at"] = firestore.SERVER_TIMESTAMP
    ref.set(rev_data)
    rev_data["id"] = ref.id
    return rev_data
