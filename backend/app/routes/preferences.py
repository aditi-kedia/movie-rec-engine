from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from app.database.connection import get_db
from app.schemas.preference import PreferenceCreate, PreferenceResponse
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.preference import Preference

router = APIRouter(prefix="/preferences", tags=["Preferences"])

@router.post("", response_model=PreferenceResponse, status_code=status.HTTP_201_CREATED)
def create_preference(
    pref_data: PreferenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_pref = Preference(
        user_id=current_user.user_id,
        similar_movies=[m.model_dump() for m in pref_data.similar_movies],
        preferred_genres=[g.model_dump() for g in pref_data.preferred_genres],
        preferred_cast=[c.model_dump() for c in pref_data.preferred_cast],
        preferred_crew=[c.model_dump() for c in pref_data.preferred_crew],
        runtime_min=pref_data.runtime_min,
        runtime_max=pref_data.runtime_max,
        free_text=pref_data.free_text
    )
    db.add(new_pref)
    db.commit()
    db.refresh(new_pref)
    return new_pref

@router.get("", response_model=List[PreferenceResponse])
def get_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Preference).filter(Preference.user_id == current_user.user_id).order_by(Preference.created_at.desc()).all()

@router.get("/latest", response_model=PreferenceResponse)
def get_latest_preference(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pref = db.query(Preference).filter(Preference.user_id == current_user.user_id).order_by(Preference.created_at.desc()).first()
    if not pref:
        # Return a blank preference as fallback
        return Preference(
            pref_id=0,
            user_id=current_user.user_id,
            similar_movies=[],
            preferred_genres=[],
            preferred_cast=[],
            preferred_crew=[],
            runtime_min=None,
            runtime_max=None,
            free_text="",
            created_at=current_user.created_at
        )
    return pref
