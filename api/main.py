"""
Bellwether API — US Election Polling Aggregator
Focused on 2026 Senate and House races.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.database import init_db
from api.routers import senate, house, admin, polls
from api.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Bellwether API...")
    await init_db()
    await seed_races()
    start_scheduler()
    yield
    stop_scheduler()
    logger.info("Bellwether API shut down.")


app = FastAPI(
    title="Bellwether",
    description=(
        "A live polling aggregator for US elections — Senate and House races. "
        "Scrapes Wikipedia for poll data and computes weighted aggregates."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(senate.router, prefix="/api/v1")
app.include_router(house.router, prefix="/api/v1")
app.include_router(polls.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "name": "Bellwether",
        "description": "US Election Polling Aggregator — 2026 Senate and House",
        "version": "0.1.0",
        "docs": "/docs",
        "endpoints": {
            "senate_races": "/api/v1/senate/races",
            "senate_race": "/api/v1/senate/races/{state}",
            "race_polls": "/api/v1/senate/races/{state}/polls",
            "race_aggregate": "/api/v1/senate/races/{state}/aggregate",
            "all_aggregates": "/api/v1/senate/aggregate/all",
            "house_races": "/api/v1/house/races",
            "house_state_overview": "/api/v1/house/states/{state}/overview",
            "house_state_districts": "/api/v1/house/states/{state}/districts",
            "house_race_polls": "/api/v1/house/races/{district}/polls",
            "house_race_aggregate": "/api/v1/house/races/{district}/aggregate",
            "refresh_senate": "POST /api/v1/admin/refresh/senate",
            "refresh_house": "POST /api/v1/admin/refresh/house",
        },
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


async def seed_races():
    """Seed the database with 2026 Senate race metadata if not already present."""
    from api.database import AsyncSessionLocal
    from api.models import SenateRace
    from api.data.senate_races_2026 import SENATE_RACES_2026
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(SenateRace).limit(1))
        if result.scalar_one_or_none():
            return  # Already seeded

        logger.info("Seeding 2026 Senate races...")
        for race_data in SENATE_RACES_2026:
            race = SenateRace(**race_data)
            db.add(race)
        await db.commit()
        logger.info(f"Seeded {len(SENATE_RACES_2026)} Senate races.")
