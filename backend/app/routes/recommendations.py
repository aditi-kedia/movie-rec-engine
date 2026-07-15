from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database.connection import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.recommendation import engine

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.get("/solo")
def get_solo_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve the top 10 recommendations based on the user's latest preference profile."""
    return engine.recommend_movies_solo(db, current_user.user_id)
