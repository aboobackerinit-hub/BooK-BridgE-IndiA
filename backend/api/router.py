from fastapi import APIRouter

from backend.api.routes import (
    health,
    auth,
    users,
    books,
    posts,
    cart,
    orders,
    chat,
    notifications,
    dashboard,
    admin,
    categories,
    reviews,
    wishlist,
    location,
    recommendations,
    share,
    gamification
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(categories.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(books.router)
api_router.include_router(posts.router)
api_router.include_router(cart.router)
api_router.include_router(orders.router)
api_router.include_router(chat.router)
api_router.include_router(notifications.router)
api_router.include_router(dashboard.router)
api_router.include_router(admin.router)
api_router.include_router(reviews.router)
api_router.include_router(wishlist.router)
api_router.include_router(location.router)
api_router.include_router(recommendations.router)
api_router.include_router(share.router)
api_router.include_router(gamification.router)
