from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.database.connection import get_db
from app.schemas.room import RoomCreate, RoomResponse, RoomJoin, GroupMemberResponse
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.room import GroupRoom, GroupMember
from app.services import room_service
from app.recommendation import engine

router = APIRouter(prefix="/rooms", tags=["Rooms"])

@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    room = room_service.create_group_room(db, current_user)
    # Re-fetch with eager loaded relationships
    return db.query(GroupRoom).options(
        joinedload(GroupRoom.host),
        joinedload(GroupRoom.members).joinedload(GroupMember.user),
        joinedload(GroupRoom.members).joinedload(GroupMember.preference)
    ).filter(GroupRoom.room_id == room.room_id).first()

@router.post("/join", response_model=RoomResponse)
def join_room(
    join_data: RoomJoin,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    room = room_service.join_group_room(db, current_user, join_data.room_code)
    # Re-fetch with eager loaded relationships
    return db.query(GroupRoom).options(
        joinedload(GroupRoom.host),
        joinedload(GroupRoom.members).joinedload(GroupMember.user),
        joinedload(GroupRoom.members).joinedload(GroupMember.preference)
    ).filter(GroupRoom.room_id == room.room_id).first()

@router.get("/active", response_model=List[RoomResponse])
def get_active_rooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get all active rooms the user is currently in
    room_ids = db.query(GroupMember.room_id).filter(GroupMember.user_id == current_user.user_id).subquery()
    return db.query(GroupRoom).options(
        joinedload(GroupRoom.host),
        joinedload(GroupRoom.members).joinedload(GroupMember.user),
        joinedload(GroupRoom.members).joinedload(GroupMember.preference)
    ).filter(GroupRoom.room_id.in_(room_ids), GroupRoom.status == "active").all()

@router.get("/{room_id}", response_model=RoomResponse)
def get_room_details(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    room = db.query(GroupRoom).options(
        joinedload(GroupRoom.host),
        joinedload(GroupRoom.members).joinedload(GroupMember.user),
        joinedload(GroupRoom.members).joinedload(GroupMember.preference)
    ).filter(GroupRoom.room_id == room_id).first()
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    # Verify user is a member or host
    is_member = any(m.user_id == current_user.user_id for m in room.members)
    if not is_member and room.host_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    return room

@router.put("/{room_id}/preference/{pref_id}", response_model=GroupMemberResponse)
def select_room_preference(
    room_id: int,
    pref_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return room_service.update_member_preference(db, current_user, room_id, pref_id)

@router.get("/{room_id}/recommendations")
def get_room_recommendations(
    room_id: int,
    relax_constraints: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve joint top 100 recommendations for a group room."""
    # Verify user is a member of the room
    member = db.query(GroupMember).filter(
        GroupMember.room_id == room_id,
        GroupMember.user_id == current_user.user_id
    ).first()
    
    room = db.query(GroupRoom).filter(GroupRoom.room_id == room_id).first()
    
    if not member and (not room or room.host_id != current_user.user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member or host of this room to view recommendations"
        )
        
    return engine.recommend_movies_group(db, room_id, relax_constraints=relax_constraints)

@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def dissolve_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Dissolve/Delete a room. Only the host can perform this action."""
    room = db.query(GroupRoom).filter(GroupRoom.room_id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    if room.host_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the room host can dissolve the room"
        )
        
    # Delete room (cascading will delete the members)
    db.delete(room)
    db.commit()
    return None
