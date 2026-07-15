from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database.connection import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    favourite_movies = Column(JSON, nullable=True, default=list)  # Stored as a JSON list (max 4 movies)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    preferences = relationship("Preference", back_populates="user", cascade="all, delete-orphan")
    rooms_hosted = relationship("GroupRoom", back_populates="host", cascade="all, delete-orphan")
    memberships = relationship("GroupMember", back_populates="user", cascade="all, delete-orphan")
    favourites = relationship("UserFavourite", back_populates="user", cascade="all, delete-orphan")
