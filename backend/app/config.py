import os
from dotenv import load_dotenv

# Ensure environmental variables are loaded from the project root .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "supersecretkeyforlocaldevelopmentonlychangeinproduction")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    TMDB_API_KEY: str = os.getenv("TMDB_API_KEY", "de19318da4acd5964b1bf9cfa88206a1")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://movie-rec-engine-rouge.vercel.app")
    FREE_TEXT_WEIGHT: float = float(os.getenv("FREE_TEXT_WEIGHT", "30.0"))

settings = Settings()
