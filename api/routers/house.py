"""
House race endpoints.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.aggregator.engine import PollRecord, aggregate_polls
from api.database import get_db
from api.models import Poll, SenateRace

router = APIRouter(prefix="/house", tags=["House Races"])

STATE_TO_ABBR = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA",
    "colorado": "CO", "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA",
    "hawaii": "HI", "idaho": "ID", "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
    "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD", "massachusetts": "MA",
    "michigan": "MI", "minnesota": "MN", "mississippi": "MS", "missouri": "MO", "montana": "MT",
    "nebraska": "NE", "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM",
    "new york": "NY", "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
    "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT", "vermont": "VT",
    "virginia": "VA", "washington": "WA", "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
}


def _normalize_state(state: str) -> str:
    return state.replace("-", " ").replace("_", " ").strip().lower()


def _state_abbr(state: str) -> Optional[str]:
    return STATE_TO_ABBR.get(_normalize_state(state))


def _pretty_state(state: str) -> str:
    return " ".join([w.capitalize() for w in _normalize_state(state).split()])


@router.get("/races")
async def list_house_races(
    limit: int = Query(500, le=1000),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Poll).where(Poll.poll_type == "house-race", Poll.source == "wikipedia")
    result = await db.execute(stmt)
    polls = result.scalars().all()
    grouped: dict[str, list[Poll]] = {}
    for poll in polls:
        subject = poll.subject
        if not subject:
            continue
        grouped.setdefault(subject, []).append(poll)

    rows = []
    for subject, subject_polls in grouped.items():
        unique_count = _unique_survey_count(subject_polls)
        latest = max((p.poll_date_end for p in subject_polls if p.poll_date_end), default=None)
        rows.append({
            "district": subject.replace(" House", ""),
            "subject": subject,
            "poll_count": unique_count,
            "latest_poll": latest.date().isoformat() if latest else None,
        })

    rows.sort(key=lambda r: (-r["poll_count"], r["subject"]))
    return rows[:limit]


@router.get("/states/{state}/districts")
async def list_house_districts_for_state(
    state: str,
    limit: int = Query(80, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await _list_house_districts_for_state(state, db, limit)


async def _list_house_districts_for_state(
    state: str,
    db: AsyncSession,
    limit: int = 80,
):
    abbr = _state_abbr(state)
    if not abbr:
        raise HTTPException(status_code=404, detail=f"Unknown state: {state}")

    stmt = select(Poll).where(
        Poll.poll_type == "house-race",
        Poll.source == "wikipedia",
        Poll.subject.like(f"{abbr}-% House"),
    )
    result = await db.execute(stmt)
    polls = result.scalars().all()
    grouped: dict[str, list[Poll]] = {}
    for poll in polls:
        subject = poll.subject
        if not subject:
            continue
        grouped.setdefault(subject, []).append(poll)

    rows = []
    for subject, subject_polls in grouped.items():
        unique_count = _unique_survey_count(subject_polls)
        latest = max((p.poll_date_end for p in subject_polls if p.poll_date_end), default=None)
        rows.append({
            "district": subject.replace(" House", ""),
            "subject": subject,
            "poll_count": unique_count,
            "latest_poll": latest.date().isoformat() if latest else None,
        })
    rows.sort(key=lambda r: r["subject"])
    return rows[:limit]


@router.get("/states/{state}/overview")
async def house_state_overview(
    state: str,
    db: AsyncSession = Depends(get_db),
):
    districts = await _list_house_districts_for_state(state, db=db, limit=80)
    pretty_state = _pretty_state(state)
    senate_stmt = select(SenateRace).where(SenateRace.state.ilike(pretty_state))
    senate_result = await db.execute(senate_stmt)
    senate = senate_result.scalar_one_or_none()

    return {
        "state": pretty_state,
        "state_abbr": _state_abbr(state),
        "house_districts": districts,
        "house_district_count": len(districts),
        "senate_race": {
            "state": senate.state,
            "cook_rating": senate.cook_rating,
            "incumbent": senate.incumbent_name,
            "incumbent_party": senate.incumbent_party,
            "is_open": senate.is_open,
        } if senate else None,
    }


@router.get("/races/{district}/polls")
async def get_house_race_polls(
    district: str,
    limit: int = Query(200, le=400),
    db: AsyncSession = Depends(get_db),
):
    subject = f"{district.upper()} House"
    stmt = (
        select(Poll)
        .where(Poll.poll_type == "house-race", Poll.subject == subject, Poll.source == "wikipedia")
        .order_by(desc(Poll.poll_date_end))
        .limit(limit)
    )
    result = await db.execute(stmt)
    polls = result.scalars().all()
    if not polls:
        raise HTTPException(status_code=404, detail=f"No house polls found for {district}")

    return {
        "district": district.upper(),
        "subject": subject,
        "polls": [_poll_out(p) for p in polls],
        "count": len(polls),
        "unique_count": _unique_survey_count(polls),
    }


@router.get("/races/{district}/aggregate")
async def get_house_race_aggregate(
    district: str,
    limit: int = Query(100, le=300),
    db: AsyncSession = Depends(get_db),
):
    subject = f"{district.upper()} House"
    stmt = (
        select(Poll)
        .where(Poll.poll_type == "house-race", Poll.subject == subject, Poll.source == "wikipedia")
        .order_by(desc(Poll.poll_date_end))
        .limit(limit)
    )
    result = await db.execute(stmt)
    polls = result.scalars().all()
    if not polls:
        raise HTTPException(status_code=404, detail=f"No house polls found for {district}")

    records = [
        PollRecord(
            pollster=p.pollster_name,
            end_date=p.poll_date_end,
            sample_size=p.sample_size,
            population=p.population,
            results=p.results or [],
        )
        for p in polls if p.poll_date_end
    ]
    agg_data = aggregate_polls(records)
    return {
        "district": district.upper(),
        "subject": subject,
        "aggregate": agg_data,
        "polls_considered": len(records),
        "computed_at": datetime.utcnow().isoformat(),
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
    }


def _unique_survey_count(polls: list[Poll]) -> int:
    seen = set()
    for poll in polls:
        pollster = (poll.pollster_name or "").strip().lower()
        end_date = poll.poll_date_end.date().isoformat() if poll.poll_date_end else ""
        if not pollster or not end_date:
            continue
        seen.add((pollster, end_date))
    return len(seen)
