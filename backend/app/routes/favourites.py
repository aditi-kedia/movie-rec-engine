from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from app.database.connection import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.favourite import FavouriteCreate, FavouriteResponse
from app.services import favourite_service

router = APIRouter(prefix="/favourites", tags=["Favourites"])

@router.post("", response_model=FavouriteResponse, status_code=status.HTTP_201_CREATED)
def add_favourite(
    fav_data: FavouriteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new favourite item (movie, genre, cast, crew)."""
    return favourite_service.add_favourite(db, current_user.user_id, fav_data)

@router.get("", response_model=List[FavouriteResponse])
def get_favourites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all favourites for the authenticated user."""
    return favourite_service.get_user_favourites(db, current_user.user_id)

@router.delete("/{fav_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_favourite_by_id(
    fav_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a favourite item by database ID."""
    favourite_service.remove_favourite_by_id(db, current_user.user_id, fav_id)
    return None

@router.delete("/{type}/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_favourite_by_tmdb(
    type: str,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a favourite item by type (movie, genre, cast, crew) and TMDb ID."""
    favourite_service.remove_favourite_by_tmdb(db, current_user.user_id, type, item_id)
    return None
