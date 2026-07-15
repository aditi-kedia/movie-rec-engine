from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class TMDbSelection(BaseModel):
    id: int
    name: str
    poster_path: Optional[str] = None
    profile_path: Optional[str] = None

class PreferenceBase(BaseModel):
    similar_movies: List[TMDbSelection] = Field(default_factory=list)
    preferred_genres: List[TMDbSelection] = Field(default_factory=list)
    preferred_cast: List[TMDbSelection] = Field(default_factory=list)
    preferred_crew: List[TMDbSelection] = Field(default_factory=list)
    runtime_min: Optional[int] = Field(None, ge=0)
    runtime_max: Optional[int] = Field(None, ge=0)
    free_text: Optional[str] = Field(None, max_length=1000)

class PreferenceCreate(PreferenceBase):
    pass

class PreferenceResponse(PreferenceBase):
    pref_id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
