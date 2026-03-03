"""
Senate race endpoints.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from api.database import get_db
from api.models import SenateRace, Poll, PollAggregate
from api.aggregator.engine import PollRecord, aggregate_polls

router = APIRouter(prefix="/senate", tags=["Senate Races"])


@router.get("/races")
async def list_races(
    competitive_only: bool = Query(False, description="Only return competitive races"),
    db: AsyncSession = Depends(get_db),
):
    """List all 2026 Senate races."""
    stmt = select(SenateRace).order_by(SenateRace.state)
    result = await db.execute(stmt)
    races = result.scalars().all()

    if competitive_only:
        COMPETITIVE = {"Toss-up", "Lean DEM", "Lean REP", "Likely DEM", "Likely REP"}
        races = [r for r in races if r.cook_rating in COMPETITIVE]

    return [_race_summary(r) for r in races]


@router.get("/races/{state}")
async def get_race(state: str, db: AsyncSession = Depends(get_db)):
    """Get details for a specific Senate race."""
    stmt = select(SenateRace).where(
        SenateRace.state.ilike(state.replace("-", " "))
    )
    result = await db.execute(stmt)
    race = result.scalar_one_or_none()
    if not race:
        raise HTTPException(status_code=404, detail=f"Race not found: {state}")
    return _race_detail(race)


@router.get("/races/{state}/polls")
async def get_race_polls(
    state: str,
    limit: int = Query(50, le=200),
    pollster: Optional[str] = None,
    population: Optional[str] = Query(None, description="lv, rv, or a"),
    db: AsyncSession = Depends(get_db),
):
    """Get individual polls for a Senate race."""
    race_stmt = select(SenateRace).where(SenateRace.state.ilike(state.replace("-", " ")))
    race_result = await db.execute(race_stmt)
    race = race_result.scalar_one_or_none()
    if not race:
        raise HTTPException(status_code=404, detail=f"Race not found: {state}")

    stmt = (
        select(Poll)
        .where(Poll.race_id == race.id, Poll.source == "wikipedia")
        .order_by(desc(Poll.poll_date_end))
        .limit(limit)
    )
    if pollster:
        stmt = stmt.where(Poll.pollster_name.ilike(f"%{pollster}%"))
    if population:
        stmt = stmt.where(Poll.population == population.lower())

    result = await db.execute(stmt)
    polls = result.scalars().all()
    unique_count = _unique_survey_count(polls)

    return {
        "race": _race_summary(race),
        "polls": [_poll_out(p) for p in polls],
        "count": len(polls),
        "unique_count": unique_count,
    }


@router.get("/races/{state}/aggregate")
async def get_race_aggregate(
    state: str,
    recompute: bool = Query(False, description="Force recompute from raw polls"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the polling average for a Senate race.
    Returns cached aggregate or recomputes on demand.
    """
    race_stmt = select(SenateRace).where(SenateRace.state.ilike(state.replace("-", " ")))
    race_result = await db.execute(race_stmt)
    race = race_result.scalar_one_or_none()
    if not race:
        raise HTTPException(status_code=404, detail=f"Race not found: {state}")

    if not recompute:
        # Return latest cached aggregate
        agg_stmt = (
            select(PollAggregate)
            .where(PollAggregate.race_id == race.id)
            .order_by(desc(PollAggregate.computed_at))
            .limit(1)
        )
        agg_result = await db.execute(agg_stmt)
        agg = agg_result.scalar_one_or_none()
        if agg:
            return _aggregate_out(agg, race)

    # Compute from raw polls
    poll_stmt = select(Poll).where(Poll.race_id == race.id, Poll.source == "wikipedia")
    poll_result = await db.execute(poll_stmt)
    polls = poll_result.scalars().all()

    if not polls:
        return {
            "race": _race_summary(race),
            "aggregate": None,
            "message": "No polls available for this race yet.",
        }

    records = [_poll_to_record(p) for p in polls if p.poll_date_end]
    agg_data = aggregate_polls(records)

    # Persist computed aggregate
    new_agg = PollAggregate(
        race_id=race.id,
        poll_type="senate-race",
        subject=f"{race.state} Senate",
        computed_at=datetime.utcnow(),
        polls_included=agg_data["polls_included"],
        results=agg_data["results"],
        methodology_notes=str(agg_data["methodology"]),
    )
    db.add(new_agg)
    await db.flush()

    return {
        "race": _race_summary(race),
        "aggregate": agg_data,
        "computed_at": new_agg.computed_at.isoformat(),
    }


@router.get("/aggregate/all")
async def get_all_aggregates(
    competitive_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """Get latest polling average for every Senate race."""
    race_stmt = select(SenateRace).order_by(SenateRace.state)
    race_result = await db.execute(race_stmt)
    races = race_result.scalars().all()

    if competitive_only:
        COMPETITIVE = {"Toss-up", "Lean DEM", "Lean REP", "Likely DEM", "Likely REP"}
        races = [r for r in races if r.cook_rating in COMPETITIVE]

    out = []
    for race in races:
        agg_stmt = (
            select(PollAggregate)
            .where(PollAggregate.race_id == race.id)
            .order_by(desc(PollAggregate.computed_at))
            .limit(1)
        )
        agg_result = await db.execute(agg_stmt)
        agg = agg_result.scalar_one_or_none()

        out.append({
            "race": _race_summary(race),
            "aggregate": {
                "results": agg.results,
                "polls_included": agg.polls_included,
                "computed_at": agg.computed_at.isoformat(),
            } if agg else None,
        })

    return out


# --- Helpers ---

def _race_summary(race: SenateRace) -> dict:
    return {
        "state": race.state,
        "state_abbr": race.state_abbr,
        "cycle": race.cycle,
        "incumbent": race.incumbent_name,
        "incumbent_party": race.incumbent_party,
        "is_open": race.is_open,
        "cook_rating": race.cook_rating,
    }


def _race_detail(race: SenateRace) -> dict:
    return {
        **_race_summary(race),
        "seat_class": race.seat_class,
    }


def _poll_out(poll: Poll) -> dict:
    return {
        "id": poll.id,
        "pollster": poll.pollster_name,
        "end_date": poll.poll_date_end.date().isoformat() if poll.poll_date_end else None,
        "start_date": poll.poll_date_start.date().isoformat() if poll.poll_date_start else None,
        "sample_size": poll.sample_size,
        "population": poll.population,
        "results": poll.results,
        "source": poll.source,
    }


def _aggregate_out(agg: PollAggregate, race: SenateRace) -> dict:
    return {
        "race": _race_summary(race),
        "aggregate": {
            "results": agg.results,
            "polls_included": agg.polls_included,
            "computed_at": agg.computed_at.isoformat(),
        },
    }


def _poll_to_record(poll: Poll) -> PollRecord:
    return PollRecord(
        pollster=poll.pollster_name,
        end_date=poll.poll_date_end,
        sample_size=poll.sample_size,
        population=poll.population,
        results=poll.results or [],
        grade=poll.pollster_obj.grade if poll.pollster_obj else None,
        is_partisan=poll.pollster_obj.partisan if poll.pollster_obj else False,
    )


def _unique_survey_count(polls: list[Poll]) -> int:
    seen = set()
    for poll in polls:
        pollster = (poll.pollster_name or "").strip().lower()
        end_date = poll.poll_date_end.date().isoformat() if poll.poll_date_end else ""
        if not pollster or not end_date:
            continue
        seen.add((pollster, end_date))
    return len(seen)
