from fastapi import APIRouter

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("")
def get_categories():
    return ["Fiction", "Non-Fiction", "Science", "History", "Biography", "Children", "Academic"]
