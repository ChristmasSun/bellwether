"""
Admin endpoints for triggering data refreshes.
"""
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.database import get_db
from api.models import SenateRace, Poll, Pollster, RefreshLog

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/refresh/senate")
async def refresh_senate_polls(
    background_tasks: BackgroundTasks,
    state: str = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger a refresh of Senate race polls from Wikipedia.
    If state is provided, only refresh that state.
    """
    log = RefreshLog(source="wikipedia", started_at=datetime.utcnow())
    db.add(log)
    await db.flush()
    log_id = log.id

    background_tasks.add_task(_run_senate_refresh, log_id, state)
    return {"message": "Refresh started", "log_id": log_id}


@router.post("/refresh/house")
async def refresh_house_polls(
    background_tasks: BackgroundTasks,
    state: str = None,
    db: AsyncSession = Depends(get_db),
):
    """Trigger a refresh of House race polls from Wikipedia."""
    log = RefreshLog(source="wikipedia-house", started_at=datetime.utcnow())
    db.add(log)
    await db.flush()
    log_id = log.id

    background_tasks.add_task(_run_house_refresh, log_id, state)
    return {"message": "House refresh started", "log_id": log_id}


@router.get("/refresh/logs")
async def get_refresh_logs(limit: int = 20, db: AsyncSession = Depends(get_db)):
    """Get recent refresh operation logs."""
    from sqlalchemy import desc
    stmt = select(RefreshLog).order_by(desc(RefreshLog.started_at)).limit(limit)
    result = await db.execute(stmt)
    logs = result.scalars().all()
    return [
        {
            "id": l.id,
            "source": l.source,
            "started_at": l.started_at.isoformat(),
            "completed_at": l.completed_at.isoformat() if l.completed_at else None,
            "polls_added": l.polls_added,
            "polls_updated": l.polls_updated,
            "success": l.success,
            "errors": l.errors,
        }
        for l in logs
    ]


@router.post("/refresh/senate/sync")
async def refresh_senate_sync(
    state: str = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Synchronous Senate refresh from Wikipedia (waits for completion, returns results).
    """
    from api.scrapers.wikipedia import fetch_all_wikipedia
    from api.data.senate_races_2026 import SENATE_RACES_2026

    races = SENATE_RACES_2026
    if state:
        races = [r for r in races if r["state"].lower() == state.lower()]
    states = [r["state"] for r in races]
    wiki_results = await fetch_all_wikipedia(states)

    added = 0
    errors = []
    for state_name, polls_data in wiki_results.items():
        if not polls_data:
            continue
        race_result = await db.execute(select(SenateRace).where(SenateRace.state == state_name))
        race = race_result.scalar_one_or_none()
        if not race:
            continue

        for pd in polls_data:
            ext_id = pd.get("external_id")
            existing = await db.execute(select(Poll).where(
                Poll.external_id == ext_id,
                Poll.source == "wikipedia",
            ))
            if not existing.scalar_one_or_none():
                db.add(Poll(
                    race_id=race.id,
                    source=pd.get("source", "wikipedia"),
                    external_id=ext_id,
                    pollster_name=pd["pollster_name"],
                    poll_date_start=pd.get("poll_date_start"),
                    poll_date_end=pd["poll_date_end"],
                    sample_size=pd.get("sample_size"),
                    population=pd.get("population", "rv"),
                    results=pd["results"],
                    poll_type=pd.get("poll_type", "senate-race"),
                    subject=pd.get("subject"),
                    raw_data=pd.get("raw_data"),
                ))
                added += 1

    await db.commit()
    return {
        "polls_added": added,
        "errors": errors,
        "states_with_data": [s for s, p in wiki_results.items() if p],
        "states_checked": len(states),
    }


@router.post("/refresh/house/sync")
async def refresh_house_sync(
    state: str = None,
    db: AsyncSession = Depends(get_db),
):
    """Synchronous House refresh from Wikipedia."""
    from api.scrapers.wikipedia_house import fetch_all_house_wikipedia, STATE_ABBR

    states = list(STATE_ABBR.keys())
    if state:
        states = [s for s in states if s.lower() == state.lower()]
    house_results = await fetch_all_house_wikipedia(states)

    added = 0
    for _, polls_data in house_results.items():
        for pd in polls_data:
            ext_id = pd.get("external_id")
            existing = await db.execute(select(Poll).where(
                Poll.external_id == ext_id,
                Poll.source == "wikipedia",
            ))
            if existing.scalar_one_or_none():
                continue
            db.add(Poll(
                race_id=None,
                source="wikipedia",
                external_id=ext_id,
                pollster_name=pd["pollster_name"],
                poll_date_start=pd.get("poll_date_start"),
                poll_date_end=pd["poll_date_end"],
                sample_size=pd.get("sample_size"),
                population=pd.get("population", "rv"),
                results=pd["results"],
                poll_type="house-race",
                subject=pd.get("subject"),
                raw_data=pd.get("raw_data"),
            ))
            added += 1
    await db.commit()
    return {
        "polls_added": added,
        "states_with_data": [s for s, p in house_results.items() if p],
        "states_checked": len(states),
    }


@router.post("/refresh/wikipedia")
async def refresh_wikipedia_polls(
    background_tasks: BackgroundTasks,
    state: str = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger a background refresh of Senate race polls from Wikipedia.
    If state is provided, only refresh that state.
    """
    log = RefreshLog(source="wikipedia", started_at=datetime.utcnow())
    db.add(log)
    await db.flush()
    log_id = log.id

    background_tasks.add_task(_run_wikipedia_refresh, log_id, state)
    return {"message": "Wikipedia refresh started", "log_id": log_id}


@router.post("/refresh/wikipedia/sync")
async def refresh_wikipedia_sync(
    state: str = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Synchronous Wikipedia refresh (waits for completion, returns results).
    Use for debugging or targeted state refreshes.
    """
    from api.scrapers.wikipedia import fetch_all_wikipedia
    from api.data.senate_races_2026 import SENATE_RACES_2026

    races = SENATE_RACES_2026
    if state:
        races = [r for r in races if r["state"].lower() == state.lower()]

    states = [r["state"] for r in races]
    wiki_results = await fetch_all_wikipedia(states)

    added = 0
    errors = []

    for state_name, polls_data in wiki_results.items():
        if not polls_data:
            continue
        race_result = await db.execute(select(SenateRace).where(SenateRace.state == state_name))
        race = race_result.scalar_one_or_none()
        if not race:
            continue

        for pd in polls_data:
            ext_id = pd.get("external_id")
            existing = await db.execute(select(Poll).where(
                Poll.external_id == ext_id,
                Poll.source == "wikipedia",
            ))
            if not existing.scalar_one_or_none():
                db.add(Poll(
                    race_id=race.id,
                    source=pd.get("source", "wikipedia"),
                    external_id=ext_id,
                    pollster_name=pd["pollster_name"],
                    poll_date_start=pd.get("poll_date_start"),
                    poll_date_end=pd["poll_date_end"],
                    sample_size=pd.get("sample_size"),
                    population=pd.get("population", "rv"),
                    results=pd["results"],
                    poll_type=pd.get("poll_type", "senate-race"),
                    subject=pd.get("subject"),
                    raw_data=pd.get("raw_data"),
                ))
                added += 1

    await db.commit()
    return {
        "polls_added": added,
        "errors": errors,
        "states_with_data": [s for s, p in wiki_results.items() if p],
        "states_checked": len(states),
    }


@router.post("/recompute/aggregates")
async def recompute_all_aggregates(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Recompute polling averages for all races."""
    background_tasks.add_task(_recompute_all)
    return {"message": "Recompute started for all races"}


# --- Background tasks ---

async def _run_senate_refresh(log_id: int, state_filter: str = None):
    """Background task alias to Wikipedia-only Senate refresh."""
    await _run_wikipedia_refresh(log_id, state_filter)


async def _run_wikipedia_refresh(log_id: int, state_filter: str = None):
    """Background task: fetch polls from Wikipedia and store in DB."""
    from api.database import AsyncSessionLocal
    from api.scrapers.wikipedia import fetch_all_wikipedia
    from api.data.senate_races_2026 import SENATE_RACES_2026

    races = SENATE_RACES_2026
    if state_filter:
        races = [r for r in races if r["state"].lower() == state_filter.lower()]

    states = [r["state"] for r in races]
    wiki_results = await fetch_all_wikipedia(states)

    added = 0
    updated = 0
    errors = []

    # Fields to compare for updates
    _POLL_FIELDS = [
        "pollster_name", "poll_date_start", "poll_date_end",
        "sample_size", "population", "results",
    ]

    # Process each state: fetch existing polls, upsert
    for state_name, polls_data in wiki_results.items():
        if not polls_data:
            continue
        try:
            async with AsyncSessionLocal() as db:
                # Look up the race
                race_result = await db.execute(
                    select(SenateRace).where(SenateRace.state == state_name)
                )
                race = race_result.scalar_one_or_none()
                if not race:
                    continue

                # Get all existing polls for these external_ids
                ext_ids = [p.get("external_id") for p in polls_data if p.get("external_id")]
                existing_result = await db.execute(
                    select(Poll).where(
                        Poll.external_id.in_(ext_ids),
                        Poll.source == "wikipedia",
                    )
                )
                existing_polls = {p.external_id: p for p in existing_result.scalars().all()}

                new_polls = []
                for poll_data in polls_data:
                    ext_id = poll_data.get("external_id")
                    existing = existing_polls.get(ext_id)

                    if existing:
                        # Check if any fields changed
                        changed = False
                        for field in _POLL_FIELDS:
                            new_val = poll_data.get(field)
                            if getattr(existing, field) != new_val:
                                setattr(existing, field, new_val)
                                changed = True
                        if changed:
                            updated += 1
                    else:
                        new_polls.append(Poll(
                            race_id=race.id,
                            source=poll_data.get("source", "wikipedia"),
                            external_id=ext_id,
                            pollster_name=poll_data["pollster_name"],
                            poll_date_start=poll_data.get("poll_date_start"),
                            poll_date_end=poll_data["poll_date_end"],
                            sample_size=poll_data.get("sample_size"),
                            population=poll_data.get("population", "rv"),
                            results=poll_data["results"],
                            poll_type=poll_data.get("poll_type", "senate-race"),
                            subject=poll_data.get("subject"),
                            raw_data=poll_data.get("raw_data"),
                        ))

                if new_polls:
                    db.add_all(new_polls)
                await db.commit()
                added += len(new_polls)

        except Exception as e:
            errors.append(f"{state_name}: {str(e)}")
            logger.error(f"Error storing Wikipedia polls for {state_name}: {e}")

    # Update the refresh log
    try:
        async with AsyncSessionLocal() as db:
            log_stmt = select(RefreshLog).where(RefreshLog.id == log_id)
            log_result = await db.execute(log_stmt)
            log = log_result.scalar_one_or_none()
            if log:
                log.completed_at = datetime.utcnow()
                log.polls_added = added
                log.polls_updated = updated
                log.errors = errors
                log.success = len(errors) == 0
                await db.commit()
    except Exception:
        pass

    logger.info(f"Wikipedia refresh complete: {added} added, {updated} updated, {len(errors)} errors")


async def _run_house_refresh(log_id: int, state_filter: str = None):
    """Background task: fetch House polls from Wikipedia and store in DB."""
    from api.database import AsyncSessionLocal
    from api.scrapers.wikipedia_house import fetch_all_house_wikipedia, STATE_ABBR

    states = list(STATE_ABBR.keys())
    if state_filter:
        states = [s for s in states if s.lower() == state_filter.lower()]
    house_results = await fetch_all_house_wikipedia(states)

    added = 0
    updated = 0
    errors = []

    _POLL_FIELDS = [
        "pollster_name", "poll_date_start", "poll_date_end",
        "sample_size", "population", "results",
    ]

    for state_name, polls_data in house_results.items():
        try:
            async with AsyncSessionLocal() as db:
                # Batch-fetch existing polls for this state
                ext_ids = [p.get("external_id") for p in polls_data if p.get("external_id")]
                if ext_ids:
                    existing_result = await db.execute(
                        select(Poll).where(
                            Poll.external_id.in_(ext_ids),
                            Poll.source == "wikipedia",
                        )
                    )
                    existing_polls = {p.external_id: p for p in existing_result.scalars().all()}
                else:
                    existing_polls = {}

                new_polls = []
                for poll_data in polls_data:
                    ext_id = poll_data.get("external_id")
                    existing = existing_polls.get(ext_id)

                    if existing:
                        changed = False
                        for field in _POLL_FIELDS:
                            new_val = poll_data.get(field)
                            if getattr(existing, field) != new_val:
                                setattr(existing, field, new_val)
                                changed = True
                        if changed:
                            updated += 1
                    else:
                        new_polls.append(Poll(
                            race_id=None,
                            source="wikipedia",
                            external_id=ext_id,
                            pollster_name=poll_data["pollster_name"],
                            poll_date_start=poll_data.get("poll_date_start"),
                            poll_date_end=poll_data["poll_date_end"],
                            sample_size=poll_data.get("sample_size"),
                            population=poll_data.get("population", "rv"),
                            results=poll_data["results"],
                            poll_type="house-race",
                            subject=poll_data.get("subject"),
                            raw_data=poll_data.get("raw_data"),
                        ))

                if new_polls:
                    db.add_all(new_polls)
                await db.commit()
                added += len(new_polls)
        except Exception as e:
            errors.append(f"{state_name}: {str(e)}")
            logger.error(f"Error storing House polls for {state_name}: {e}")

    try:
        async with AsyncSessionLocal() as db:
            log_stmt = select(RefreshLog).where(RefreshLog.id == log_id)
            log_result = await db.execute(log_stmt)
            log = log_result.scalar_one_or_none()
            if log:
                log.completed_at = datetime.utcnow()
                log.polls_added = added
                log.polls_updated = updated
                log.errors = errors
                log.success = len(errors) == 0
                await db.commit()
    except Exception:
        pass
    logger.info(f"House refresh complete: {added} added, {updated} updated, {len(errors)} errors")


async def _recompute_all():
    """Recompute aggregates for Senate and House races."""
    from api.database import AsyncSessionLocal
    from api.aggregator.engine import PollRecord, aggregate_polls

    async with AsyncSessionLocal() as db:
        races_result = await db.execute(select(SenateRace))
        races = races_result.scalars().all()

        for race in races:
            polls_result = await db.execute(
                select(Poll).where(Poll.race_id == race.id, Poll.source == "wikipedia")
            )
            polls = polls_result.scalars().all()
            if not polls:
                continue

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
            if agg_data["polls_included"] == 0:
                continue

            from api.models import PollAggregate
            agg = PollAggregate(
                race_id=race.id,
                poll_type="senate-race",
                subject=f"{race.state} Senate",
                computed_at=datetime.utcnow(),
                polls_included=agg_data["polls_included"],
                results=agg_data["results"],
                methodology_notes=str(agg_data["methodology"]),
            )
            db.add(agg)

        # House race aggregates by subject (district)
        subjects_result = await db.execute(
            select(Poll.subject)
            .where(Poll.poll_type == "house-race", Poll.source == "wikipedia")
            .group_by(Poll.subject)
        )
        subjects = [s[0] for s in subjects_result.all() if s[0]]
        for subject in subjects:
            polls_result = await db.execute(
                select(Poll).where(
                    Poll.poll_type == "house-race",
                    Poll.source == "wikipedia",
                    Poll.subject == subject,
                )
            )
            polls = polls_result.scalars().all()
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
            if not records:
                continue
            agg_data = aggregate_polls(records)
            if agg_data["polls_included"] == 0:
                continue
            agg = PollAggregate(
                race_id=None,
                poll_type="house-race",
                subject=subject,
                computed_at=datetime.utcnow(),
                polls_included=agg_data["polls_included"],
                results=agg_data["results"],
                methodology_notes=str(agg_data["methodology"]),
            )
            db.add(agg)

        await db.commit()
        logger.info("Recomputed all aggregates")


@router.post("/refresh/generic-ballot")
async def refresh_generic_ballot(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Trigger a refresh of generic congressional ballot polls from RealClearPolling."""
    log = RefreshLog(source="realclearpolling", started_at=datetime.utcnow())
    db.add(log)
    await db.flush()
    log_id = log.id

    background_tasks.add_task(_run_generic_ballot_refresh, log_id)
    return {"message": "Generic ballot refresh started", "log_id": log_id}


async def _run_generic_ballot_refresh(log_id: int):
    """Background task: fetch generic ballot polls from RCP and store in DB."""
    from api.database import AsyncSessionLocal
    from api.scrapers.generic_ballot import fetch_generic_ballot_polls

    polls_data = await fetch_generic_ballot_polls()
    added = 0
    updated = 0
    errors = []

    _POLL_FIELDS = [
        "pollster_name", "poll_date_start", "poll_date_end",
        "sample_size", "population", "results",
    ]

    try:
        async with AsyncSessionLocal() as db:
            ext_ids = [p.get("external_id") for p in polls_data if p.get("external_id")]
            if ext_ids:
                existing_result = await db.execute(
                    select(Poll).where(
                        Poll.external_id.in_(ext_ids),
                        Poll.source == "realclearpolling",
                    )
                )
                existing_polls = {p.external_id: p for p in existing_result.scalars().all()}
            else:
                existing_polls = {}

            new_polls = []
            for poll_data in polls_data:
                ext_id = poll_data.get("external_id")
                existing = existing_polls.get(ext_id)

                if existing:
                    changed = False
                    for field in _POLL_FIELDS:
                        new_val = poll_data.get(field)
                        if getattr(existing, field) != new_val:
                            setattr(existing, field, new_val)
                            changed = True
                    if changed:
                        updated += 1
                else:
                    new_polls.append(Poll(
                        race_id=None,
                        source="realclearpolling",
                        external_id=ext_id,
                        pollster_name=poll_data["pollster_name"],
                        poll_date_start=poll_data.get("poll_date_start"),
                        poll_date_end=poll_data["poll_date_end"],
                        sample_size=poll_data.get("sample_size"),
                        population=poll_data.get("population", "rv"),
                        results=poll_data["results"],
                        poll_type="generic-ballot",
                        subject="2026 Generic Ballot",
                        raw_data=poll_data.get("raw_data"),
                    ))

            if new_polls:
                db.add_all(new_polls)
            await db.commit()
            added = len(new_polls)
    except Exception as e:
        errors.append(str(e))
        logger.error(f"Error storing generic ballot polls: {e}")

    try:
        async with AsyncSessionLocal() as db:
            log_stmt = select(RefreshLog).where(RefreshLog.id == log_id)
            log_result = await db.execute(log_stmt)
            log = log_result.scalar_one_or_none()
            if log:
                log.completed_at = datetime.utcnow()
                log.polls_added = added
                log.polls_updated = updated
                log.errors = errors
                log.success = len(errors) == 0
                await db.commit()
    except Exception:
        pass
    logger.info(f"Generic ballot refresh: {added} added, {updated} updated, {len(errors)} errors")
