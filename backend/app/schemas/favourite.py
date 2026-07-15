from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any

class FavouriteBase(BaseModel):
    type: str = Field(..., description="Must be 'movie', 'genre', 'cast', or 'crew'")
    item_id: int = Field(..., description="TMDb integer ID of the item")
    name: str = Field(..., description="Display name of the item")
    meta: Optional[Dict[str, Any]] = Field(default=None, description="Optional extra metadata like poster_path or profile_path")

class FavouriteCreate(FavouriteBase):
    pass

class FavouriteResponse(FavouriteBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
