from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.user import UserUpdate

def update_user_profile(db: Session, user: User, update_data: UserUpdate) -> User:
    if update_data.username is not None:
        # Check if username is taken by another user
        existing = db.query(User).filter(
            User.username == update_data.username,
            User.user_id != user.user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        user.username = update_data.username

    if update_data.email is not None:
        # Check if email is taken by another user
        existing = db.query(User).filter(
            User.email == update_data.email,
            User.user_id != user.user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        user.email = update_data.email

    if update_data.favourite_movies is not None:
        # Enforce exactly/up to 4 favorite movies
        if len(update_data.favourite_movies) > 4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You can select a maximum of 4 favourite movies"
            )
        user.favourite_movies = update_data.favourite_movies

    db.commit()
    db.refresh(user)
    return user
