import os
import urllib.request
import urllib.parse
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

# TMDb Key is loaded from env, or defaults to the developer key
TMDB_API_KEY = os.getenv("TMDB_API_KEY", "de19318da4acd5964b1bf9cfa88206a1")
BASE_URL = "https://api.themoviedb.org/3"

# In-memory cache for genres list
_genre_cache: Optional[List[Dict[str, Any]]] = None
_genre_cache_expiry: Optional[datetime] = None

def _make_tmdb_request(path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if params is None:
        params = {}
    params["api_key"] = TMDB_API_KEY
    
    query_str = urllib.parse.urlencode(params)
    url = f"{BASE_URL}{path}?{query_str}"
    
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        raise Exception(f"TMDb API request failed: {e}")

def search_movies(query: str) -> List[Dict[str, Any]]:
    """Search for movies on TMDb. Returns structured selections."""
    if not query.strip():
        return []
    data = _make_tmdb_request("/search/movie", {"query": query})
    results = data.get("results", [])
    return [
        {
            "id": item["id"],
            "name": item["title"],
            "poster_path": item.get("poster_path")
        }
        for item in results
    ]

def search_people(query: str) -> List[Dict[str, Any]]:
    """Search for actors and directors on TMDb."""
    if not query.strip():
        return []
    data = _make_tmdb_request("/search/person", {"query": query})
    results = data.get("results", [])
    return [
        {
            "id": item["id"],
            "name": item["name"],
            "profile_path": item.get("profile_path")
        }
        for item in results
    ]

def get_movie_details(movie_id: int) -> Dict[str, Any]:
    """Retrieve full movie details."""
    return _make_tmdb_request(f"/movie/{movie_id}")

def get_movie_keywords(movie_id: int) -> Dict[str, Any]:
    """Retrieve keywords for a movie."""
    return _make_tmdb_request(f"/movie/{movie_id}/keywords")

def get_movie_genres() -> List[Dict[str, Any]]:
    """Fetch movie genres list and cache in-memory for 24 hours."""
    global _genre_cache, _genre_cache_expiry
    now = datetime.now()
    if _genre_cache is not None and _genre_cache_expiry is not None and now < _genre_cache_expiry:
        return _genre_cache
        
    data = _make_tmdb_request("/genre/movie/list")
    genres = data.get("genres", [])
    
    # Store formatted list in cache
    _genre_cache = [
        {
            "id": genre["id"],
            "name": genre["name"]
        }
        for genre in genres
    ]
    _genre_cache_expiry = now + timedelta(hours=24)
    return _genre_cache

def discover_movies(filters: Dict[str, Any]) -> Dict[str, Any]:
    """Search TMDb discover endpoint using filters."""
    return _make_tmdb_request("/discover/movie", filters)

def get_movie_recommendations(movie_id: int) -> List[Dict[str, Any]]:
    """Retrieve recommended movies based on a specific movie ID."""
    data = _make_tmdb_request(f"/movie/{movie_id}/recommendations")
    return data.get("results", [])

def get_enriched_movie_details(movie_id: int) -> Dict[str, Any]:
    """Retrieve full movie details with credits and keywords appended in one call."""
    return _make_tmdb_request(f"/movie/{movie_id}", {"append_to_response": "credits,keywords"})
