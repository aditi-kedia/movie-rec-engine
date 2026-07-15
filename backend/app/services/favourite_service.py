from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.favourite import UserFavourite
from app.schemas.favourite import FavouriteCreate
from typing import List

def get_user_favourites(db: Session, user_id: int) -> List[UserFavourite]:
    """Retrieve all favourites for the current user."""
    return db.query(UserFavourite).filter(UserFavourite.user_id == user_id).all()

def add_favourite(db: Session, user_id: int, favourite_data: FavouriteCreate) -> UserFavourite:
    """Save an item as a favourite, preventing duplicates."""
    # Check if this favorite already exists
    existing = db.query(UserFavourite).filter(
        UserFavourite.user_id == user_id,
        UserFavourite.type == favourite_data.type,
        UserFavourite.item_id == favourite_data.item_id
    ).first()
    
    if existing:
        return existing
        
    new_fav = UserFavourite(
        user_id=user_id,
        type=favourite_data.type,
        item_id=favourite_data.item_id,
        name=favourite_data.name,
        meta=favourite_data.meta
    )
    db.add(new_fav)
    db.commit()
    db.refresh(new_fav)
    return new_fav

def remove_favourite_by_id(db: Session, user_id: int, fav_id: int) -> None:
    """Remove a favourite by its database ID."""
    fav = db.query(UserFavourite).filter(
        UserFavourite.id == fav_id,
        UserFavourite.user_id == user_id
    ).first()
    
    if not fav:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favourite not found"
        )
        
    db.delete(fav)
    db.commit()

def remove_favourite_by_tmdb(db: Session, user_id: int, type: str, item_id: int) -> None:
    """Remove a favourite by type and TMDb item ID."""
    fav = db.query(UserFavourite).filter(
        UserFavourite.user_id == user_id,
        UserFavourite.type == type,
        UserFavourite.item_id == item_id
    ).first()
    
    if not fav:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favourite not found"
        )
        
    db.delete(fav)
    db.commit()
