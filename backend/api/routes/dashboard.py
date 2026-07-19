from fastapi import APIRouter, Depends
from backend.core.database import get_db
from backend.api.dependencies import get_current_user
from firebase_admin import firestore

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/overview")
def dashboard_overview(user: dict = Depends(get_current_user)):
    db = get_db()
    
    # 1. Fetch all books for aggregates
    books_docs = db.collection("books").where("owner_id", "==", user["id"]).stream()
    books_count = 0
    total_views = 0
    total_wishlisted = 0
    
    for doc in books_docs:
        b = doc.to_dict()
        books_count += 1
        total_views += b.get("views_count", 0)
        total_wishlisted += b.get("wishlist_count", 0)
    
    # 2. Fetch orders for revenue
    order_docs = db.collection("orders").where("seller_ids", "array_contains", user["id"]).stream()
    my_orders = [d.to_dict() for d in order_docs]
    
    revenue = 0.0
    for o in my_orders:
        for it in (o.get("items") or []):
            if it.get("seller_id") == user["id"]:
                revenue += float(it.get("price") or 0) * (it.get("quantity") or 0)
                
    # 3. Gamification and Trust
    trust_score = 50
    level = 1
    try:
        from backend.services.trust_service import get_trust_profile
        from backend.services.gamification_service import get_user_progress
        
        trust_profile = get_trust_profile(user["id"])
        trust_score = trust_profile.get("trust_score", 50)
        
        progress = get_user_progress(user["id"])
        level = progress.get("level", 1)
    except Exception:
        pass
                
    return {
        "total_books": books_count, 
        "total_orders": len(my_orders), 
        "revenue": revenue,
        "total_views": total_views,
        "total_wishlisted": total_wishlisted,
        "trust_score": trust_score,
        "level": level
    }
