from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.schemas.user import UserResponse
from app.schemas.preference import PreferenceResponse

class RoomBase(BaseModel):
    status: str = "active"

class RoomCreate(BaseModel):
    pass

class GroupMemberResponse(BaseModel):
    room_id: int
    user_id: int
    pref_id: Optional[int] = None
    user: Optional[UserResponse] = None
    preference: Optional[PreferenceResponse] = None

    class Config:
        from_attributes = True

class RoomResponse(RoomBase):
    room_id: int
    host_id: int
    room_code: str
    created_at: datetime
    host: Optional[UserResponse] = None
    members: List[GroupMemberResponse] = []

    class Config:
        from_attributes = True

class RoomJoin(BaseModel):
    room_code: str
