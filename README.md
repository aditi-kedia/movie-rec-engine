# Movie Recommendation Engine

A web application that generates highly personalized movie recommendations for individuals (Solo) and room lobbies (Group) using TMDb and Groq Llama 3 parsing.

🎬 Live Demo:
https://movie-rec-engine-rouge.vercel.app

📖 Backend API Docs:
https://movie-rec-engine-backend.onrender.com/doc

## 🚀 Database Stack: Supabase PostgreSQL

The application uses **Supabase PostgreSQL** as the sole supported database backend. SQLite fallback is completely disabled.

### Database Setup

1. **Environment Configuration**:
   Ensure you configure a `.env` file at the root of the project with your Supabase PostgreSQL connection URL under the `DATABASE_URL` environment variable:
   ```env
   DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database>
   TMDB_API_KEY=your_tmdb_api_key
   GROQ_API_KEY=your_groq_api_key
   JWT_SECRET_KEY=your_jwt_secret_key
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   ```

2. **Run Migrations**:
   Alembic is the single source of truth for the database schema. Apply all migrations to your PostgreSQL instance using the following command:
   ```bash
   cd backend
   .venv\Scripts\alembic upgrade head
   ```

---

## 🛠️ Installation & Running

### 1. Run the Backend API Server
```bash
cd backend
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

### 2. Run the Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173` to open the app!
