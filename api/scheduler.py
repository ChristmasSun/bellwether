"""
Background scheduler for automatic poll refreshes.
Refreshes Senate polls every 4 hours and national polls every 2 hours.
"""
import logging
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


def start_scheduler():
    from api.routers.admin import _recompute_all, _run_wikipedia_refresh, _run_house_refresh, _run_generic_ballot_refresh

    # Refresh Senate polls from Wikipedia every 4 hours
    scheduler.add_job(
        _run_wikipedia_refresh,
        "interval",
        hours=4,
        id="senate_refresh",
        args=[None, None],
        replace_existing=True,
    )

    # Refresh House polls from Wikipedia every 4 hours
    scheduler.add_job(
        _run_house_refresh,
        "interval",
        hours=4,
        id="house_refresh",
        args=[None, None],
        replace_existing=True,
    )

    # Refresh generic ballot polls from RCP every 4 hours
    scheduler.add_job(
        _run_generic_ballot_refresh,
        "interval",
        hours=4,
        id="generic_ballot_refresh",
        args=[None],
        replace_existing=True,
    )

    # Recompute all aggregates every hour
    scheduler.add_job(
        _recompute_all,
        "interval",
        hours=1,
        id="recompute",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Scheduler started: senate=4h, house=4h, generic-ballot=4h, recompute=1h")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped.")
