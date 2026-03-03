"""
Polls management endpoints - manual entry, search, pollster info.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from api.database import get_db
from api.models import Poll, Pollster, SenateRace

router = APIRouter(prefix="/polls", tags=["Polls"])


class PollCreate(BaseModel):
    state: Optional[str] = None          # For Senate races
    poll_type: str = "senate-race"
    subject: Optional[str] = None
    pollster_name: str
    poll_date_end: str                    # ISO format: 2026-01-15
    poll_date_start: Optional[str] = None
    sample_size: Optional[int] = None
    population: Optional[str] = "rv"     # lv, rv, a
    results: list[dict]                  # [{"candidate": "Name", "party": "DEM", "pct": 48.0}]
    source: str = "manual"
    is_partisan: bool = False


@router.post("/", status_code=201)
async def create_poll(data: PollCreate, db: AsyncSession = Depends(get_db)):
    """Manually add a poll to the database."""
    race_id = None
    if data.state:
        race_stmt = select(SenateRace).where(SenateRace.state.ilike(data.state.replace("-", " ")))
        race_result = await db.execute(race_stmt)
        race = race_result.scalar_one_or_none()
        if not race:
            raise HTTPException(status_code=404, detail=f"Race not found: {data.state}")
        race_id = race.id

    end_date = datetime.fromisoformat(data.poll_date_end)
    start_date = datetime.fromisoformat(data.poll_date_start) if data.poll_date_start else None

    poll = Poll(
        source=data.source,
        race_id=race_id,
        pollster_name=data.pollster_name,
        poll_date_start=start_date,
        poll_date_end=end_date,
        sample_size=data.sample_size,
        population=data.population,
        results=data.results,
        poll_type=data.poll_type,
        subject=data.subject or (f"{data.state} Senate" if data.state else None),
    )
    db.add(poll)
    await db.flush()
    return {"id": poll.id, "message": "Poll added successfully"}


@router.get("/search")
async def search_polls(
    pollster: Optional[str] = None,
    state: Optional[str] = None,
    poll_type: Optional[str] = None,
    days: int = Query(90, description="Look back N days"),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Search polls with filters."""
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(days=days)

    stmt = select(Poll).where(Poll.poll_date_end >= cutoff)
    if pollster:
        stmt = stmt.where(Poll.pollster_name.ilike(f"%{pollster}%"))
    if poll_type:
        stmt = stmt.where(Poll.poll_type == poll_type)
    if state:
        race_stmt = select(SenateRace.id).where(SenateRace.state.ilike(state.replace("-", " ")))
        race_result = await db.execute(race_stmt)
        race_ids = [r[0] for r in race_result.all()]
        if race_ids:
            stmt = stmt.where(Poll.race_id.in_(race_ids))

    stmt = stmt.order_by(desc(Poll.poll_date_end)).limit(limit)
    result = await db.execute(stmt)
    polls = result.scalars().all()

    return {
        "polls": [_poll_out(p) for p in polls],
        "count": len(polls),
    }


@router.get("/pollsters")
async def list_pollsters(db: AsyncSession = Depends(get_db)):
    """List all pollsters with their quality grades."""
    stmt = select(Pollster).order_by(Pollster.name)
    result = await db.execute(stmt)
    pollsters = result.scalars().all()
    return [_pollster_out(p) for p in pollsters]


@router.get("/stats")
async def poll_stats(db: AsyncSession = Depends(get_db)):
    """Database statistics."""
    total_polls = await db.execute(select(func.count(Poll.id)))
    senate_polls = await db.execute(select(func.count(Poll.id)).where(Poll.poll_type == "senate-race"))
    national_polls = await db.execute(select(func.count(Poll.id)).where(Poll.race_id.is_(None)))
    sources = await db.execute(select(Poll.source, func.count(Poll.id)).group_by(Poll.source))

    return {
        "total_polls": total_polls.scalar(),
        "senate_race_polls": senate_polls.scalar(),
        "national_polls": national_polls.scalar(),
        "by_source": {row[0]: row[1] for row in sources.all()},
    }


def _poll_out(poll: Poll) -> dict:
    return {
        "id": poll.id,
        "pollster": poll.pollster_name,
        "poll_type": poll.poll_type,
        "subject": poll.subject,
        "end_date": poll.poll_date_end.date().isoformat() if poll.poll_date_end else None,
        "start_date": poll.poll_date_start.date().isoformat() if poll.poll_date_start else None,
        "sample_size": poll.sample_size,
        "population": poll.population,
        "results": poll.results,
        "source": poll.source,
    }


def _pollster_out(p: Pollster) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "grade": p.grade,
        "rating": p.numeric_rating,
        "partisan": p.partisan,
        "partisan_lean": p.partisan_lean,
        "methodology": p.methodology,
    }
