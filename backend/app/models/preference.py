from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database.connection import Base

class Preference(Base):
    __tablename__ = "preferences"

    pref_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    similar_movies = Column(JSON, nullable=True, default=list)      # JSON list of similar movies (titles or TMDB IDs)
    preferred_genres = Column(JSON, nullable=True, default=list)    # JSON list of preferred genres
    preferred_cast = Column(JSON, nullable=True, default=list)      # JSON list of actors
    preferred_crew = Column(JSON, nullable=True, default=list)      # JSON list of directors/crew
    runtime_min = Column(Integer, nullable=True)
    runtime_max = Column(Integer, nullable=True)
    free_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="preferences")
    member_rooms = relationship("GroupMember", back_populates="preference")
