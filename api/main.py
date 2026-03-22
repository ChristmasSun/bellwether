"""
Bellwether API — simple backend that scrapes Wikipedia polls and serves them as JSON.

No ORM, no SQLite. Just JSON files on disk, refreshed every 4 hours.
"""
import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.scrapers.wikipedia import fetch_all_wikipedia
from api.scrapers.wikipedia_house import fetch_all_house_wikipedia, STATE_ABBR
from api.data.senate_races_2026 import SENATE_RACES_2026

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATA_DIR = Path(os.environ.get("DATA_DIR", "data"))
DATA_DIR.mkdir(exist_ok=True)

SENATE_POLLS_FILE = DATA_DIR / "senate_polls.json"
HOUSE_POLLS_FILE = DATA_DIR / "house_polls.json"
GENERIC_BALLOT_FILE = DATA_DIR / "generic_ballot.json"
FEC_FILE = DATA_DIR / "fec_fundraising.json"
META_FILE = DATA_DIR / "meta.json"

FEC_API_KEY = os.environ.get("FEC_API_KEY", "")

# In-memory cache (loaded from disk on startup)
_cache: dict = {
    "senate_polls": {},   # state -> [poll, ...]
    "house_polls": {},    # state -> [poll, ...]
    "generic_ballot": [],  # [poll, ...]
    "fec": {},            # state_abbr -> { candidates: [...] }
    "meta": {"last_senate_refresh": None, "last_house_refresh": None, "last_generic_ballot_refresh": None, "last_fec_refresh": None},
}

from api.constants import POLL_REFRESH_INTERVAL_HOURS as REFRESH_INTERVAL_HOURS


# ---------------------------------------------------------------------------
# Persistence — simple JSON read/write
# ---------------------------------------------------------------------------

def _json_serial(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


def _save():
    try:
        SENATE_POLLS_FILE.write_text(
            json.dumps(_cache["senate_polls"], default=_json_serial, ensure_ascii=False),
            encoding="utf-8",
        )
        HOUSE_POLLS_FILE.write_text(
            json.dumps(_cache["house_polls"], default=_json_serial, ensure_ascii=False),
            encoding="utf-8",
        )
        GENERIC_BALLOT_FILE.write_text(
            json.dumps(_cache["generic_ballot"], default=_json_serial, ensure_ascii=False),
            encoding="utf-8",
        )
        FEC_FILE.write_text(
            json.dumps(_cache["fec"], default=_json_serial, ensure_ascii=False),
            encoding="utf-8",
        )
        META_FILE.write_text(
            json.dumps(_cache["meta"], default=_json_serial),
            encoding="utf-8",
        )
        logger.info("Data saved to disk.")
    except Exception as e:
        logger.error(f"Failed to save data: {e}")


def _load():
    try:
        if SENATE_POLLS_FILE.exists():
            _cache["senate_polls"] = json.loads(SENATE_POLLS_FILE.read_text(encoding="utf-8"))
        if HOUSE_POLLS_FILE.exists():
            _cache["house_polls"] = json.loads(HOUSE_POLLS_FILE.read_text(encoding="utf-8"))
        if GENERIC_BALLOT_FILE.exists():
            _cache["generic_ballot"] = json.loads(GENERIC_BALLOT_FILE.read_text(encoding="utf-8"))
        if FEC_FILE.exists():
            _cache["fec"] = json.loads(FEC_FILE.read_text(encoding="utf-8"))
        if META_FILE.exists():
            _cache["meta"] = json.loads(META_FILE.read_text(encoding="utf-8"))
        total_s = sum(len(v) for v in _cache["senate_polls"].values())
        total_h = sum(len(v) for v in _cache["house_polls"].values())
        logger.info(f"Loaded from disk: {total_s} senate polls, {total_h} house polls, {len(_cache['fec'])} states with FEC data")
    except Exception as e:
        logger.error(f"Failed to load data: {e}")


# ---------------------------------------------------------------------------
# Scraping
# ---------------------------------------------------------------------------

async def refresh_senate():
    logger.info("Starting Senate poll refresh...")
    states = [r["state"] for r in SENATE_RACES_2026]
    results = await fetch_all_wikipedia(states)

    total_new = 0
    for state, polls in results.items():
        existing = _cache["senate_polls"].get(state, [])
        existing_ids = {p["external_id"] for p in existing}
        new_polls = [p for p in polls if p["external_id"] not in existing_ids]
        if new_polls:
            for p in new_polls:
                for key in ("poll_date_start", "poll_date_end"):
                    if isinstance(p.get(key), datetime):
                        p[key] = p[key].isoformat()
            _cache["senate_polls"][state] = existing + new_polls
            total_new += len(new_polls)

    _cache["meta"]["last_senate_refresh"] = datetime.utcnow().isoformat()
    _save()
    total = sum(len(v) for v in _cache["senate_polls"].values())
    logger.info(f"Senate refresh done: +{total_new} new, {total} total polls")


async def refresh_house():
    logger.info("Starting House poll refresh...")
    states = list(STATE_ABBR.keys())
    results = await fetch_all_house_wikipedia(states)

    total_new = 0
    for state, polls in results.items():
        existing = _cache["house_polls"].get(state, [])
        existing_ids = {p["external_id"] for p in existing}
        new_polls = [p for p in polls if p["external_id"] not in existing_ids]
        if new_polls:
            for p in new_polls:
                for key in ("poll_date_start", "poll_date_end"):
                    if isinstance(p.get(key), datetime):
                        p[key] = p[key].isoformat()
            _cache["house_polls"][state] = existing + new_polls
            total_new += len(new_polls)

    _cache["meta"]["last_house_refresh"] = datetime.utcnow().isoformat()
    _save()
    total = sum(len(v) for v in _cache["house_polls"].values())
    logger.info(f"House refresh done: +{total_new} new, {total} total polls")


async def refresh_generic_ballot():
    """Fetch generic congressional ballot polls from RealClearPolling."""
    from api.scrapers.generic_ballot import fetch_generic_ballot_polls
    logger.info("Starting generic ballot refresh...")
    polls = await fetch_generic_ballot_polls()

    existing_ids = {p["external_id"] for p in _cache["generic_ballot"]}
    new_polls = []
    for p in polls:
        if p["external_id"] not in existing_ids:
            for key in ("poll_date_start", "poll_date_end"):
                if isinstance(p.get(key), datetime):
                    p[key] = p[key].isoformat()
            new_polls.append(p)

    if new_polls:
        _cache["generic_ballot"].extend(new_polls)
    _cache["meta"]["last_generic_ballot_refresh"] = datetime.utcnow().isoformat()
    _save()
    logger.info(f"Generic ballot refresh done: +{len(new_polls)} new, {len(_cache['generic_ballot'])} total")


async def refresh_fec():
    """Fetch fundraising totals from FEC API for all 2026 Senate candidates."""
    if not FEC_API_KEY:
        logger.warning("No FEC_API_KEY set, skipping fundraising refresh")
        return

    import httpx

    logger.info("Starting FEC fundraising refresh...")
    base_url = "https://api.open.fec.gov/v1/candidates/totals/"

    async with httpx.AsyncClient(timeout=30) as client:
        for race in SENATE_RACES_2026:
            state = race["state_abbr"]
            try:
                resp = await client.get(base_url, params={
                    "api_key": FEC_API_KEY,
                    "election_year": 2026,
                    "office": "S",
                    "state": state,
                    "sort": "-receipts",
                    "per_page": 10,
                    "is_active_candidate": "true",
                })
                resp.raise_for_status()
                data = resp.json()

                candidates = []
                for c in data.get("results", []):
                    receipts = c.get("receipts") or c.get("total_receipts")
                    if receipts is None:
                        continue
                    candidates.append({
                        "name": c.get("name", ""),
                        "party": c.get("party", ""),
                        "receipts": float(receipts) if receipts else 0,
                        "disbursements": float(c.get("disbursements", 0) or 0),
                        "cash_on_hand": float(c.get("cash_on_hand_end_period", 0) or 0),
                        "candidate_id": c.get("candidate_id", ""),
                        "incumbent": c.get("incumbent_challenge", "") == "I",
                        "coverage_end": c.get("coverage_end_date"),
                    })

                if candidates:
                    _cache["fec"][state] = candidates
                    top = candidates[0]
                    logger.info(f"  {state}: {len(candidates)} candidates, top={top['name']} ${top['receipts']/1e6:.1f}M")

                # Small delay to avoid rate limiting
                await asyncio.sleep(0.2)

            except Exception as e:
                logger.error(f"FEC fetch failed for {state}: {e}")

    _cache["meta"]["last_fec_refresh"] = datetime.utcnow().isoformat()
    _save()
    logger.info(f"FEC refresh done: {len(_cache['fec'])} states with data")


from api.constants import FEC_REFRESH_INTERVAL_HOURS


async def _periodic_refresh():
    while True:
        await asyncio.sleep(REFRESH_INTERVAL_HOURS * 3600)
        try:
            await refresh_senate()
            await refresh_house()
        except Exception as e:
            logger.error(f"Periodic refresh failed: {e}")


async def _periodic_fec_refresh():
    while True:
        await asyncio.sleep(FEC_REFRESH_INTERVAL_HOURS * 3600)
        try:
            await refresh_fec()
        except Exception as e:
            logger.error(f"FEC periodic refresh failed: {e}")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    _load()

    # Refresh on startup if no data or stale
    needs_refresh = not _cache["senate_polls"]
    last_str = _cache["meta"].get("last_senate_refresh")
    if last_str:
        try:
            last = datetime.fromisoformat(last_str)
            if (datetime.utcnow() - last).total_seconds() > REFRESH_INTERVAL_HOURS * 3600:
                needs_refresh = True
        except (ValueError, TypeError):
            needs_refresh = True

    if needs_refresh:
        asyncio.create_task(refresh_senate())
        asyncio.create_task(refresh_house())

    # FEC: refresh if no data or stale (daily)
    needs_fec = not _cache["fec"]
    fec_last = _cache["meta"].get("last_fec_refresh")
    if fec_last:
        try:
            if (datetime.utcnow() - datetime.fromisoformat(fec_last)).total_seconds() > FEC_REFRESH_INTERVAL_HOURS * 3600:
                needs_fec = True
        except (ValueError, TypeError):
            needs_fec = True
    if needs_fec:
        asyncio.create_task(refresh_fec())

    # Generic ballot: refresh if no data or stale
    needs_gb = not _cache["generic_ballot"]
    gb_last = _cache["meta"].get("last_generic_ballot_refresh")
    if gb_last:
        try:
            last_gb = datetime.fromisoformat(gb_last)
            if (datetime.utcnow() - last_gb).total_seconds() > REFRESH_INTERVAL_HOURS * 3600:
                needs_gb = True
        except (ValueError, TypeError):
            needs_gb = True
    if needs_gb:
        asyncio.create_task(refresh_generic_ballot())

    task = asyncio.create_task(_periodic_refresh())
    fec_task = asyncio.create_task(_periodic_fec_refresh())
    yield
    task.cancel()
    fec_task.cancel()


app = FastAPI(title="Bellwether", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/v1/senate/races")
async def get_senate_races():
    return [
        {
            "state": r["state"],
            "state_abbr": r["state_abbr"],
            "cycle": 2026,
            "incumbent": r["incumbent_name"],
            "incumbent_party": r["incumbent_party"],
            "is_open": r["is_open"],
            "cook_rating": r["cook_rating"],
            "called": False,
            "called_winner": None,
        }
        for r in SENATE_RACES_2026
    ]


@app.get("/api/v1/senate/races/{state}/polls")
async def get_senate_race_polls(state: str, limit: int = 200):
    race_data = None
    for r in SENATE_RACES_2026:
        if r["state"].lower() == state.lower() or r["state_abbr"].lower() == state.lower():
            race_data = r
            break

    polls = _cache["senate_polls"].get(state, [])
    if not polls and race_data:
        polls = _cache["senate_polls"].get(race_data["state"], [])

    api_polls = [
        {
            "id": hash(p["external_id"]) & 0x7FFFFFFF,
            "pollster": p["pollster_name"],
            "end_date": p.get("poll_date_end", ""),
            "start_date": p.get("poll_date_start"),
            "sample_size": p.get("sample_size"),
            "population": p.get("population"),
            "results": p.get("results", []),
            "source": "wikipedia",
            "poll_type": p.get("poll_type", "senate-race"),
            "subject": p.get("subject"),
        }
        for p in polls[:limit]
    ]

    return {
        "race": {
            "state": race_data["state"] if race_data else state,
            "state_abbr": race_data["state_abbr"] if race_data else state[:2].upper(),
            "cycle": 2026,
            "incumbent": race_data["incumbent_name"] if race_data else None,
            "incumbent_party": race_data["incumbent_party"] if race_data else None,
            "is_open": race_data["is_open"] if race_data else False,
            "cook_rating": race_data["cook_rating"] if race_data else None,
            "called": False,
            "called_winner": None,
        },
        "polls": api_polls,
        "count": len(api_polls),
        "unique_count": len(polls),
    }


@app.get("/api/v1/house/races")
async def get_house_races(limit: int = 1000):
    districts: list[dict] = []
    for state, polls in _cache["house_polls"].items():
        by_district: dict[str, list] = {}
        for p in polls:
            district = p.get("raw_data", {}).get("district") or p.get("subject", "").replace(" House", "")
            if district:
                by_district.setdefault(district, []).append(p)
        for district, d_polls in by_district.items():
            districts.append({
                "district": district,
                "subject": f"{district} House",
                "poll_count": len(d_polls),
                "latest_poll": max((p.get("poll_date_end", "") for p in d_polls), default=None),
            })
    districts.sort(key=lambda d: d["poll_count"], reverse=True)
    return districts[:limit]


@app.get("/api/v1/house/races/{district}/polls")
async def get_house_district_polls(district: str, limit: int = 50):
    all_polls = []
    for state, polls in _cache["house_polls"].items():
        for p in polls:
            d = p.get("raw_data", {}).get("district") or p.get("subject", "").replace(" House", "")
            if d and d.lower() == district.lower():
                all_polls.append({
                    "id": hash(p["external_id"]) & 0x7FFFFFFF,
                    "pollster": p["pollster_name"],
                    "end_date": p.get("poll_date_end", ""),
                    "start_date": p.get("poll_date_start"),
                    "sample_size": p.get("sample_size"),
                    "population": p.get("population"),
                    "results": p.get("results", []),
                    "source": "wikipedia",
                    "poll_type": "house-race",
                    "subject": p.get("subject"),
                })
    return {"polls": all_polls[:limit]}


@app.get("/api/v1/polls/search")
async def search_polls(days: int = 60, limit: int = 50):
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
    all_polls = []

    for state, polls in _cache["senate_polls"].items():
        for p in polls:
            if p.get("poll_date_end", "") >= cutoff:
                all_polls.append({
                    "id": hash(p["external_id"]) & 0x7FFFFFFF,
                    "pollster": p["pollster_name"],
                    "state": state,
                    "end_date": p.get("poll_date_end", ""),
                    "sample_size": p.get("sample_size"),
                    "population": p.get("population"),
                    "results": p.get("results", []),
                    "poll_type": p.get("poll_type"),
                    "subject": p.get("subject"),
                })

    for state, polls in _cache["house_polls"].items():
        for p in polls:
            if p.get("poll_date_end", "") >= cutoff:
                all_polls.append({
                    "id": hash(p["external_id"]) & 0x7FFFFFFF,
                    "pollster": p["pollster_name"],
                    "state": state,
                    "end_date": p.get("poll_date_end", ""),
                    "sample_size": p.get("sample_size"),
                    "population": p.get("population"),
                    "results": p.get("results", []),
                    "poll_type": "house-race",
                    "subject": p.get("subject"),
                })

    for p in _cache["generic_ballot"]:
        if p.get("poll_date_end", "") >= cutoff:
            all_polls.append({
                "id": hash(p["external_id"]) & 0x7FFFFFFF,
                "pollster": p["pollster_name"],
                "end_date": p.get("poll_date_end", ""),
                "sample_size": p.get("sample_size"),
                "population": p.get("population"),
                "results": p.get("results", []),
                "poll_type": "generic-ballot",
                "subject": "2026 Generic Ballot",
            })

    all_polls.sort(key=lambda p: p.get("end_date", ""), reverse=True)
    return {"polls": all_polls[:limit], "count": len(all_polls)}


@app.get("/api/v1/generic-ballot/polls")
async def get_generic_ballot_polls():
    """Return all generic ballot polls sorted by date."""
    polls = sorted(
        _cache["generic_ballot"],
        key=lambda p: p.get("poll_date_end", ""),
        reverse=True,
    )
    formatted = []
    for p in polls:
        dem = next((r for r in p.get("results", []) if r.get("party") == "DEM"), None)
        rep = next((r for r in p.get("results", []) if r.get("party") == "REP"), None)
        formatted.append({
            "id": hash(p["external_id"]) & 0x7FFFFFFF,
            "pollster": p["pollster_name"],
            "end_date": p.get("poll_date_end", ""),
            "start_date": p.get("poll_date_start"),
            "sample_size": p.get("sample_size"),
            "population": p.get("population"),
            "dem_pct": dem["pct"] if dem else 0,
            "rep_pct": rep["pct"] if rep else 0,
            "margin": (dem["pct"] if dem else 0) - (rep["pct"] if rep else 0),
            "results": p.get("results", []),
        })
    return {"polls": formatted, "count": len(formatted)}


@app.get("/api/v1/generic-ballot/average")
async def get_generic_ballot_average():
    """Compute weighted average of generic ballot polls using the full aggregation engine."""
    from api.aggregator.engine import PollRecord, aggregate_polls

    polls = _cache["generic_ballot"]
    if not polls:
        return {"average": None, "poll_count": 0, "methodology": {}}

    records = []
    for p in polls:
        end_str = p.get("poll_date_end", "")
        if not end_str:
            continue
        try:
            end_date = datetime.fromisoformat(end_str) if isinstance(end_str, str) else end_str
        except (ValueError, TypeError):
            continue
        records.append(PollRecord(
            pollster=p["pollster_name"],
            end_date=end_date,
            sample_size=p.get("sample_size"),
            population=p.get("population"),
            results=p.get("results", []),
        ))

    if not records:
        return {"average": None, "poll_count": 0, "methodology": {}}

    agg = aggregate_polls(records)

    dem_result = next((r for r in agg["results"] if r["party"] in ("DEM", "D")), None)
    rep_result = next((r for r in agg["results"] if r["party"] in ("REP", "R")), None)

    if not dem_result or not rep_result:
        return {"average": None, "poll_count": agg["polls_included"], "methodology": agg.get("methodology", {})}

    return {
        "average": {
            "dem": round(dem_result["pct"], 1),
            "rep": round(rep_result["pct"], 1),
            "margin": round(dem_result["pct"] - rep_result["pct"], 1),
            "dem_low": round(dem_result.get("pct_low", dem_result["pct"]), 1),
            "dem_high": round(dem_result.get("pct_high", dem_result["pct"]), 1),
            "rep_low": round(rep_result.get("pct_low", rep_result["pct"]), 1),
            "rep_high": round(rep_result.get("pct_high", rep_result["pct"]), 1),
        },
        "poll_count": agg["polls_included"],
        "methodology": agg.get("methodology", {}),
    }


@app.post("/api/v1/admin/refresh/generic-ballot")
async def trigger_generic_ballot_refresh():
    asyncio.create_task(refresh_generic_ballot())
    return {"message": "Generic ballot refresh started"}


@app.get("/api/v1/fec/{state}")
async def get_fec_data(state: str):
    """Return FEC fundraising data for a state's Senate candidates."""
    candidates = _cache["fec"].get(state.upper(), [])
    return {"state": state.upper(), "candidates": candidates}


@app.get("/api/v1/fec")
async def get_all_fec_data():
    """Return all FEC fundraising data."""
    return _cache["fec"]


@app.post("/api/v1/admin/refresh/senate")
async def trigger_senate_refresh():
    asyncio.create_task(refresh_senate())
    return {"message": "Refresh started"}


@app.post("/api/v1/admin/refresh/house")
async def trigger_house_refresh():
    asyncio.create_task(refresh_house())
    return {"message": "Refresh started"}


@app.post("/api/v1/admin/refresh/fec")
async def trigger_fec_refresh():
    asyncio.create_task(refresh_fec())
    return {"message": "FEC refresh started"}


@app.get("/api/v1/status")
async def status():
    return {
        "status": "ok",
        "senate_polls": sum(len(v) for v in _cache["senate_polls"].values()),
        "house_polls": sum(len(v) for v in _cache["house_polls"].values()),
        "fec_states": len(_cache["fec"]),
        "last_senate_refresh": _cache["meta"].get("last_senate_refresh"),
        "last_house_refresh": _cache["meta"].get("last_house_refresh"),
        "last_fec_refresh": _cache["meta"].get("last_fec_refresh"),
    }
