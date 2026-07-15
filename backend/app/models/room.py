from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database.connection import Base

class GroupRoom(Base):
    __tablename__ = "group_rooms"

    room_id = Column(Integer, primary_key=True, index=True)
    host_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    room_code = Column(String(10), unique=True, index=True, nullable=False)
    status = Column(String(20), default="active", nullable=False)  # active, closed, etc.
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    host = relationship("User", back_populates="rooms_hosted")
    members = relationship("GroupMember", back_populates="room", cascade="all, delete-orphan")


class GroupMember(Base):
    __tablename__ = "group_members"

    room_id = Column(Integer, ForeignKey("group_rooms.room_id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    pref_id = Column(Integer, ForeignKey("preferences.pref_id", ondelete="SET NULL"), nullable=True)

    # Relationships
    room = relationship("GroupRoom", back_populates="members")
    user = relationship("User", back_populates="memberships")
    preference = relationship("Preference", back_populates="member_rooms")
