# JanMitra AI

Bilingual demo showcase for Andhra Pradesh welfare scheme discovery — rule-based eligibility matching plus an AI assistant (Groq → Ollama → curated fallback).

## Stack

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion
- **Backend:** FastAPI, SQLAlchemy, SQLite (dev) / PostgreSQL (prod)

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env        # add GROQ_API_KEY etc.
uvicorn app.main:app --reload --port 8000
```

The API seeds schemes on startup. Docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
copy .env.example .env        # leave VITE_API_BASE_URL blank for local dev
npm run dev
```

Open http://localhost:5173 and click **Start demo** (no login required).

## Environment

| Variable | Where | Purpose |
|----------|-------|---------|
| `GROQ_API_KEY` | backend `.env` | Primary LLM (Groq) |
| `OLLAMA_BASE_URL` | backend `.env` | Fallback local LLM |
| `DATABASE_URL` | backend `.env` | SQLite or PostgreSQL |
| `VITE_API_BASE_URL` | frontend `.env` | Production API origin (blank = same-origin / dev proxy) |

## Production notes

1. Set `VITE_API_BASE_URL` to your deployed backend URL before `npm run build`.
2. Serve `frontend/dist` via Vercel/Netlify and backend via Railway/Render/Fly.
3. Add your frontend origin to `BACKEND_CORS_ORIGINS` in `backend/app/config.py`.
4. Never commit `.env` files — they contain API keys.

## Demo features

- Guest demo mode (no auth friction)
- English / Telugu UI toggle
- 26 AP districts in profile form
- 2 seeded schemes with live rule engine
- AI chat: Groq → Ollama → rule-based answers

## API routes

- `GET /api/v1/health`
- `GET/PUT /api/v1/profiles/me`
- `GET /api/v1/schemes`
- `GET /api/v1/schemes/match/me`
- `POST /api/v1/chat`
