from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database.connection import Base

class UserFavourite(Base):
    __tablename__ = "user_favourites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)  # 'movie', 'genre', 'cast', 'crew'
    item_id = Column(Integer, nullable=False)  # TMDb ID
    name = Column(String(255), nullable=False)  # Display name (e.g. title or name)
    meta = Column(JSON, nullable=True)  # poster_path, profile_path, etc.
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationship to user
    user = relationship("User", back_populates="favourites")
