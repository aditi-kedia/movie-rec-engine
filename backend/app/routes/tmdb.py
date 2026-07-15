from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services import tmdb_service

router = APIRouter(prefix="/tmdb", tags=["TMDb"])

@router.get("/search/movie")
def search_movies(
    query: str,
    current_user: User = Depends(get_current_user)
):
    """Proxy endpoint to search movies on TMDb."""
    try:
        return tmdb_service.search_movies(query)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/search/person")
def search_people(
    query: str,
    current_user: User = Depends(get_current_user)
):
    """Proxy endpoint to search actors/crew on TMDb."""
    try:
        return tmdb_service.search_people(query)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/genres")
def get_genres(
    current_user: User = Depends(get_current_user)
):
    """Retrieve movie genres (cached for 24 hours)."""
    try:
        return tmdb_service.get_movie_genres()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
