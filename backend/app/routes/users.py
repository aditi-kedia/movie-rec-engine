from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services import user_service

router = APIRouter(prefix="/users", tags=["Users"])

@router.put("/profile", response_model=UserResponse)
def update_profile(
    update_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return user_service.update_user_profile(db, current_user, update_data)
