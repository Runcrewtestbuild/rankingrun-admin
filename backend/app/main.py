from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.db import engine
from app.models import Base
from app.routes import auth, dashboard, users, courses, runs, announcements, crews, changelogs


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create admin tables on startup (skip if exists)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Add ban columns to users table if missing
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false"
        ))
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_reason VARCHAR(500)"
        ))
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ"
        ))
    yield
    await engine.dispose()


app = FastAPI(title="RUNVS Admin API", lifespan=lifespan, redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(users.router)
app.include_router(courses.router)
app.include_router(runs.router)
app.include_router(announcements.router)
app.include_router(crews.router)
app.include_router(changelogs.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
