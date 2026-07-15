import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.preferences import router as preferences_router
from app.routes.rooms import router as rooms_router
from app.routes.tmdb import router as tmdb_router
from app.routes.favourites import router as favourites_router
from app.routes.recommendations import router as recommendations_router

app = FastAPI(
    title="Movie Recommendation Engine API",
    description="Clean Architecture API backend for joint and individual movie recommendations",
    version="1.0.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev, we can allow all; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route prefixes
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(preferences_router, prefix="/api")
app.include_router(rooms_router, prefix="/api")
app.include_router(tmdb_router, prefix="/api")
app.include_router(favourites_router, prefix="/api")
app.include_router(recommendations_router, prefix="/api")

@app.get("/api/status")
def get_status():
    return {
        "status": "healthy",
        "service": "Movie Recommendation Engine Backend",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
