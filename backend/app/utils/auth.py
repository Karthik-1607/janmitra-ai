from uuid import UUID, NAMESPACE_URL, uuid5

from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

from app.config import settings

security = HTTPBearer()
GUEST_TOKEN_PREFIX = "janmitra-guest-"
LEGACY_SHARED_TOKENS = {"mock-token", "janmitra-guest-demo-token"}


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or unsupported authentication token.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    """Return a stable profile ID for a private guest token or a verified Supabase JWT."""
    token = credentials.credentials

    if token.startswith(GUEST_TOKEN_PREFIX):
        raw_guest_id = token[len(GUEST_TOKEN_PREFIX):]
        try:
            guest_id = str(UUID(raw_guest_id))
        except (ValueError, AttributeError):
            raise _unauthorized()
        # The random UUID is a browser-held bearer credential; hashing it into a
        # separate database ID keeps each browser's profile isolated and stable.
        return str(uuid5(NAMESPACE_URL, f"janmitra-guest:{guest_id}"))

    if token in LEGACY_SHARED_TOKENS or token.startswith(("mock-", "demo-")):
        raise _unauthorized()

    if not settings.SUPABASE_KEY or not settings.SUPABASE_KEY.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Guest identity token required; Supabase authentication is not configured.",
        )

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_KEY,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError:
        raise _unauthorized()

    user_id = payload.get("sub")
    if not user_id:
        raise _unauthorized()
    return str(user_id)
