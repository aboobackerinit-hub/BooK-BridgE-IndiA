# BookBridge Auth Testing

## Default Credentials
- Admin: `admin@bookbridge.in` / `Admin@123`
- Roles: user, store_owner, publisher, admin

## Endpoints
- POST /api/auth/register {email, password, name, role}
- POST /api/auth/login {email, password}
- POST /api/auth/logout
- GET  /api/auth/me  (Bearer token)

## Auth
Uses Bearer JWT in Authorization header. Token returned in `token` field of login/register response.
