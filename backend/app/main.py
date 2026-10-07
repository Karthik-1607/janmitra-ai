import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.v1.endpoints import health, profiles, schemes, chat, live
from app.seed import seed_database
from app.services import live_sync

logger = logging.getLogger("janmitra")


async def _live_refresh_loop() -> None:
    """Periodically refresh scheme snapshots from the official portals."""
    await asyncio.sleep(3)
    while True:
        try:
            count = await asyncio.to_thread(live_sync.run_sync)
            logger.info("Live sync complete: %s sources", count)
        except Exception as exc:  # never let a scrape failure stop the app
            logger.warning("Live sync loop error: %s", exc)
        await asyncio.sleep(max(1, settings.LIVE_SYNC_INTERVAL_HOURS) * 3600)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    seed_database()
    refresh_task = None
    if settings.LIVE_SYNC_ENABLED:
        refresh_task = asyncio.create_task(_live_refresh_loop())
    try:
        yield
    finally:
        if refresh_task:
            refresh_task.cancel()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Set up CORS middleware
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include Routers
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(profiles.router, prefix=f"{settings.API_V1_STR}/profiles", tags=["profiles"])
app.include_router(schemes.router, prefix=f"{settings.API_V1_STR}/schemes", tags=["schemes"])
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["chat"])
app.include_router(live.router, prefix=f"{settings.API_V1_STR}/live", tags=["live"])

@app.get("/")
def read_root():
    return {
        "message": "Welcome to JanMitra AI API",
        "docs_url": "/docs",
        "status": "active"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
