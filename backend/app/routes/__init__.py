from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.preferences import router as preferences_router
from app.routes.rooms import router as rooms_router

__all__ = ["auth_router", "users_router", "preferences_router", "rooms_router"]
