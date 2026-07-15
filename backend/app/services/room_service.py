import random
import string
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.room import GroupRoom, GroupMember
from app.models.user import User
from app.models.preference import Preference

def generate_room_code(length: int = 6) -> str:
    # Generates a random alphanumeric uppercase room code
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))

def create_group_room(db: Session, host: User) -> GroupRoom:
    # Try up to 5 times to generate a unique room code
    room_code = None
    for _ in range(5):
        potential_code = generate_room_code()
        existing = db.query(GroupRoom).filter(GroupRoom.room_code == potential_code).first()
        if not existing:
            room_code = potential_code
            break
            
    if not room_code:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate a unique room code"
        )
        
    room = GroupRoom(
        host_id=host.user_id,
        room_code=room_code,
        status="active"
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    
    # Auto-join the host as a member
    # Look for any existing preferences of the host
    host_pref = db.query(Preference).filter(Preference.user_id == host.user_id).order_by(Preference.created_at.desc()).first()
    pref_id = host_pref.pref_id if host_pref else None
    
    member = GroupMember(
        room_id=room.room_id,
        user_id=host.user_id,
        pref_id=pref_id
    )
    db.add(member)
    db.commit()
    db.refresh(room)
    
    return room

def join_group_room(db: Session, user: User, room_code: str) -> GroupRoom:
    # Find room by code
    room = db.query(GroupRoom).filter(
        GroupRoom.room_code == room_code.strip().upper(),
        GroupRoom.status == "active"
    ).first()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active room not found"
        )
        
    # Check if user is already a member
    member = db.query(GroupMember).filter(
        GroupMember.room_id == room.room_id,
        GroupMember.user_id == user.user_id
    ).first()
    
    if not member:
        # Get user's latest preference if any
        user_pref = db.query(Preference).filter(Preference.user_id == user.user_id).order_by(Preference.created_at.desc()).first()
        pref_id = user_pref.pref_id if user_pref else None
        
        member = GroupMember(
            room_id=room.room_id,
            user_id=user.user_id,
            pref_id=pref_id
        )
        db.add(member)
        db.commit()
        db.refresh(room)
        
    return room

def update_member_preference(db: Session, user: User, room_id: int, pref_id: int) -> GroupMember:
    # Ensure room member exists
    member = db.query(GroupMember).filter(
        GroupMember.room_id == room_id,
        GroupMember.user_id == user.user_id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not a member of this room"
        )
        
    # Ensure preference belongs to user
    pref = db.query(Preference).filter(
        Preference.pref_id == pref_id,
        Preference.user_id == user.user_id
    ).first()
    
    if not pref:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid preference selection"
        )
        
    member.pref_id = pref_id
    db.commit()
    db.refresh(member)
    return member
