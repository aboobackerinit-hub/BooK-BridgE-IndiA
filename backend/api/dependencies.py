from fastapi import Request, HTTPException, Depends
from backend.core.security import get_user_by_id, clean_user_dict, verify_firebase_token

async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    token = auth[7:]
    
    payload = verify_firebase_token(token)
    if not payload:
        raise HTTPException(401, "Invalid or expired Firebase token")
    
    # We use the 'uid' claim from Firebase as the sub ID.
    uid = payload.get("uid") or payload.get("sub")
    if not uid:
        raise HTTPException(401, "Token does not contain a user ID")
    
    user = get_user_by_id(uid)
    if not user:
        raise HTTPException(401, "User not found in database")
    
    if user.get("suspended"):
        raise HTTPException(403, "Account suspended. Contact admin.")
        
    return clean_user_dict(user)


def require_role(*roles):
    async def dep(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles and user.get("role") != "admin":
            raise HTTPException(403, "Insufficient permissions")
        return user
    return dep
