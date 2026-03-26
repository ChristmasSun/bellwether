"""
Wikipedia scraper for 2026 Governor race polls.

Reuses the parsing infrastructure from the Senate scraper.
The only differences are the URL pattern and poll metadata.

URL pattern: 2026_{State}_gubernatorial_election
(vs Senate: 2026_United_States_Senate_election_in_{State})
"""
import asyncio
import logging
import re
from datetime import datetime
from typing import Optional
from urllib.parse import quote

import httpx

from api.scrapers.wikipedia import (
    HEADERS,
    _is_poll_table,
    _parse_poll_table,
    _name_to_party,
)

# Governor polls: only include 2026 cycle polls (exclude 2025 hypothetical matchups)
GOV_CYCLE_START = datetime(2026, 1, 1)

logger = logging.getLogger(__name__)


# Known 2026 Governor candidates → party.
# Covers all states with Wikipedia polling tables.
# Both full names and last names are included (like the Senate scraper).
GOVERNOR_CANDIDATE_PARTIES: dict[str, str] = {
    # ── Georgia ─────────────────────────────────────────────────────────
    "rick jackson": "REP",
    "jackson": "REP",
    "burt jones": "REP",
    "jones": "REP",
    "chris carr": "REP",
    "carr": "REP",
    "clark dean": "REP",
    "dean": "REP",
    "brad raffensperger": "REP",
    "raffensperger": "REP",
    "gregg kirkpatrick": "REP",
    "kirkpatrick": "REP",
    "leland olinger": "REP",
    "olinger": "REP",
    "kenneth yasger": "REP",
    "yasger": "REP",
    "keisha lance bottoms": "DEM",
    "bottoms": "DEM",
    "geoff duncan": "DEM",
    "duncan": "DEM",
    "jason esteves": "DEM",
    "esteves": "DEM",
    "derrick jackson": "DEM",
    "mike thurmond": "DEM",
    "thurmond": "DEM",
    "olujimi brown": "DEM",
    "olu brown": "DEM",
    "brown": "DEM",
    # ── Arizona ──────────────────────────────────────────────────────────
    "katie hobbs": "DEM",
    "hobbs": "DEM",
    "andy biggs": "REP",
    "biggs": "REP",
    "david schweikert": "REP",
    "schweikert": "REP",
    "karrin taylor robson": "REP",
    "taylor robson": "REP",
    # ── Michigan ─────────────────────────────────────────────────────────
    "jocelyn benson": "DEM",
    "benson": "DEM",
    "chris swanson": "DEM",
    "swanson": "DEM",
    "john james": "REP",
    "james": "REP",
    "perry johnson": "REP",
    "tom leonard": "REP",
    "leonard": "REP",
    "aric nesbitt": "REP",
    "nesbitt": "REP",
    "mike cox": "REP",
    "cox": "REP",
    "mike duggan": "IND",
    "duggan": "IND",
    # ── Wisconsin ────────────────────────────────────────────────────────
    "mandela barnes": "DEM",
    "barnes": "DEM",
    "david crowley": "DEM",
    "crowley": "DEM",
    "sara rodriguez": "DEM",
    "rodriguez": "DEM",
    "kelda roys": "DEM",
    "roys": "DEM",
    "francesca hong": "DEM",
    "hong": "DEM",
    "missy hughes": "DEM",
    "hughes": "DEM",
    "joel brennan": "DEM",
    "brennan": "DEM",
    "brett hulsey": "DEM",
    "hulsey": "DEM",
    "tom tiffany": "REP",
    "tiffany": "REP",
    # ── Florida ──────────────────────────────────────────────────────────
    "byron donalds": "REP",
    "donalds": "REP",
    "paul renner": "REP",
    "renner": "REP",
    "jay collins": "REP",
    "collins": "REP",
    "charles burkett": "REP",
    "burkett": "REP",
    "james fishback": "REP",
    "fishback": "REP",
    "casey desantis": "REP",
    "desantis": "REP",
    "david jolly": "DEM",
    "jolly": "DEM",
    "jerry demings": "DEM",
    "demings": "DEM",
    "nikki fried": "DEM",
    "fried": "DEM",
    "dayna marie foster": "DEM",
    "foster": "DEM",
    # ── Ohio ──────────────────────────────────────────────────────────────
    "vivek ramaswamy": "REP",
    "ramaswamy": "REP",
    "dave yost": "REP",
    "yost": "REP",
    "jim tressel": "REP",
    "tressel": "REP",
    "amy acton": "DEM",
    "acton": "DEM",
    "tim ryan": "DEM",
    "ryan": "DEM",
    # ── California (top-two primary) ─────────────────────────────────────
    "eric swalwell": "DEM",
    "swalwell": "DEM",
    "katie porter": "DEM",
    "porter": "DEM",
    "tom steyer": "DEM",
    "steyer": "DEM",
    "tony thurmond": "DEM",
    "thurmond": "DEM",
    "antonio villaraigosa": "DEM",
    "villaraigosa": "DEM",
    "betty yee": "DEM",
    "yee": "DEM",
    "toni atkins": "DEM",
    "atkins": "DEM",
    "matt mahan": "DEM",
    "mahan": "DEM",
    "steve hilton": "REP",
    "hilton": "REP",
    "chad bianco": "REP",
    "bianco": "REP",
    "nicole shanahan": "REP",
    "shanahan": "REP",
    # ── New York ─────────────────────────────────────────────────────────
    "kathy hochul": "DEM",
    "hochul": "DEM",
    "bruce blakeman": "REP",
    "blakeman": "REP",
    "elise stefanik": "REP",
    "stefanik": "REP",
    "mike lawler": "REP",
    "lawler": "REP",
    # ── Pennsylvania ─────────────────────────────────────────────────────
    "josh shapiro": "DEM",
    "shapiro": "DEM",
    "stacy garrity": "REP",
    "garrity": "REP",
    "doug mastriano": "REP",
    "mastriano": "REP",
    # ── Texas ────────────────────────────────────────────────────────────
    "greg abbott": "REP",
    "abbott": "REP",
    "gina hinojosa": "DEM",
    "hinojosa": "DEM",
    "chris bell": "DEM",
    "bell": "DEM",
    # ── Nevada ───────────────────────────────────────────────────────────
    "joe lombardo": "REP",
    "lombardo": "REP",
    "aaron ford": "DEM",
    "ford": "DEM",
    "alexis hill": "DEM",
    "hill": "DEM",
    # ── New Hampshire ────────────────────────────────────────────────────
    "kelly ayotte": "REP",
    "ayotte": "REP",
    "cinde warmington": "DEM",
    "warmington": "DEM",
    "jon kiper": "DEM",
    "kiper": "DEM",
    # ── Iowa ──────────────────────────────────────────────────────────────
    "rob sand": "DEM",
    "sand": "DEM",
    "randy feenstra": "REP",
    "feenstra": "REP",
    "eddie andrews": "REP",
    "andrews": "REP",
    "zach lahn": "REP",
    "lahn": "REP",
    "adam steen": "REP",
    "steen": "REP",
    # ── Kansas ───────────────────────────────────────────────────────────
    "kris kobach": "REP",
    "kobach": "REP",
    "derek schmidt": "REP",
    "schmidt": "REP",
    "jeff colyer": "REP",
    "colyer": "REP",
    "scott schwab": "REP",
    "schwab": "REP",
    "ty masterson": "REP",
    "masterson": "REP",
    "vicki schmidt": "REP",
    "dayton moore": "REP",
    "moore": "REP",
    "david toland": "DEM",
    "toland": "DEM",
    "ethan corson": "DEM",
    "corson": "DEM",
    "cindy holscher": "DEM",
    "holscher": "DEM",
    # ── Maine ────────────────────────────────────────────────────────────
    "shenna bellows": "DEM",
    "bellows": "DEM",
    "troy jackson": "DEM",
    "jackson": "DEM",
    "angus king iii": "DEM",
    "king": "DEM",
    "hannah pingree": "DEM",
    "pingree": "DEM",
    "nirav shah": "DEM",
    "shah": "DEM",
    "bobby charles": "REP",
    "charles": "REP",
    "garrett mason": "REP",
    "mason": "REP",
    "jim libby": "REP",
    "libby": "REP",
    "laurel libby": "REP",
    "shawn moody": "REP",
    "moody": "REP",
    # ── New Mexico ───────────────────────────────────────────────────────
    "deb haaland": "DEM",
    "haaland": "DEM",
    "sam bregman": "DEM",
    "bregman": "DEM",
    "gregg hull": "REP",
    "hull": "REP",
    "duke rodriguez": "REP",
    "doug turner": "REP",
    "turner": "REP",
    # ── Oregon ───────────────────────────────────────────────────────────
    "tina kotek": "DEM",
    "kotek": "DEM",
    "christine drazan": "REP",
    "drazan": "REP",
    "chris dudley": "REP",
    "dudley": "REP",
    "ed diehl": "REP",
    "diehl": "REP",
    "david medina": "REP",
    "medina": "REP",
    # ── Minnesota ────────────────────────────────────────────────────────
    "amy klobuchar": "DEM",
    "klobuchar": "DEM",
    "kelly morrison": "DEM",
    "morrison": "DEM",
    "erin murphy": "DEM",
    "murphy": "DEM",
    "lisa demuth": "REP",
    "demuth": "REP",
    "mike lindell": "REP",
    "lindell": "REP",
    "kendall qualls": "REP",
    "qualls": "REP",
    "kristin robbins": "REP",
    "robbins": "REP",
    "peggy bennett": "REP",
    "bennett": "REP",
    # ── Colorado ─────────────────────────────────────────────────────────
    "michael bennet": "DEM",
    "bennet": "DEM",
    "phil weiser": "DEM",
    "weiser": "DEM",
    "scott bottoms": "REP",
    "bottoms": "REP",
    "barbara kirkmeyer": "REP",
    "kirkmeyer": "REP",
    "jason mikesell": "REP",
    "mikesell": "REP",
    # ── Illinois ─────────────────────────────────────────────────────────
    "jb pritzker": "DEM",
    "j.b. pritzker": "DEM",
    "pritzker": "DEM",
    "darren bailey": "REP",
    "bailey": "REP",
    "ted dabrowski": "REP",
    "dabrowski": "REP",
    "james mendrick": "REP",
    "mendrick": "REP",
    "rick heidner": "REP",
    "heidner": "REP",
    # ── Massachusetts ────────────────────────────────────────────────────
    "maura healey": "DEM",
    "healey": "DEM",
    "mike kennealy": "REP",
    "kennealy": "REP",
    "brian shortsleeve": "REP",
    "shortsleeve": "REP",
    "michael minogue": "REP",
    "minogue": "REP",
    # ── Maryland ─────────────────────────────────────────────────────────
    "wes moore": "DEM",
    "ed hale": "REP",
    "hale": "REP",
    "larry hogan": "REP",
    "hogan": "REP",
    "steve hershey": "REP",
    "hershey": "REP",
    # ── Connecticut ──────────────────────────────────────────────────────
    "ned lamont": "DEM",
    "lamont": "DEM",
    "josh elliott": "DEM",
    "elliott": "DEM",
    "erin stewart": "REP",
    "stewart": "REP",
    "ryan fazio": "REP",
    "fazio": "REP",
    "betsy mccaughey": "REP",
    "mccaughey": "REP",
}

_GOV_CANDIDATE_KEYS_SORTED = sorted(GOVERNOR_CANDIDATE_PARTIES.keys(), key=len, reverse=True)


def _gov_name_to_party(name: str) -> Optional[str]:
    """Look up a governor candidate's party from the governor registry, then fall back to Senate registry."""
    name_clean = name.lower().strip()
    name_clean = re.sub(r"\s*\([^)]*\)\s*", " ", name_clean).strip()
    if name_clean in GOVERNOR_CANDIDATE_PARTIES:
        return GOVERNOR_CANDIDATE_PARTIES[name_clean]
    for key in _GOV_CANDIDATE_KEYS_SORTED:
        if key in name_clean:
            return GOVERNOR_CANDIDATE_PARTIES[key]
    # Fall back to the Senate candidate registry (many names overlap)
    return _name_to_party(name)


def _state_to_gov_wiki_url(state: str) -> str:
    slug = state.strip().replace(" ", "_")
    return f"https://en.wikipedia.org/wiki/2026_{slug}_gubernatorial_election"


async def _resolve_gov_wiki_url(state: str, client: httpx.AsyncClient) -> Optional[str]:
    """
    Resolve a Wikipedia gubernatorial election URL for the state.
    Prefer the canonical 2026 page, then fallback to MediaWiki search.
    """
    canonical = _state_to_gov_wiki_url(state)
    try:
        r = await client.get(canonical)
        if r.status_code == 200:
            return canonical
    except httpx.RequestError:
        pass

    queries = [
        f"2026 {state} gubernatorial election",
        f"{state} gubernatorial election",
    ]
    normalized_state = state.lower().replace(" ", "_")
    for query in queries:
        api_url = (
            "https://en.wikipedia.org/w/api.php"
            f"?action=opensearch&search={quote(query)}&limit=10&namespace=0&format=json"
        )
        try:
            resp = await client.get(api_url)
            resp.raise_for_status()
            payload = resp.json()
            urls = payload[3] if isinstance(payload, list) and len(payload) >= 4 else []
        except Exception:
            continue

        candidates = [
            u for u in urls
            if "/wiki/" in u
            and "gubernatorial_election" in u
            and normalized_state in u.lower()
            and "/2026_" in u
        ]
        if candidates:
            return candidates[0]

    return None


def _parse_gov_poll_table(table, state: str) -> list[dict]:
    """
    Parse a governor poll table. Reuses the Senate parser but patches
    the output to use governor-specific metadata.
    Filters out pre-2026 hypothetical matchup polls.
    """
    polls = _parse_poll_table(table, state)

    filtered = []
    for p in polls:
        # Filter out pre-2026 polls (hypothetical matchups)
        end_date = p.get("poll_date_end")
        if isinstance(end_date, str):
            try:
                end_date = datetime.fromisoformat(end_date)
            except (ValueError, TypeError):
                pass
        if isinstance(end_date, datetime) and end_date < GOV_CYCLE_START:
            continue

        # Second-pass party inference: resolve UNK parties using governor candidate registry
        for r in p.get("results", []):
            if r.get("party") == "UNK":
                inferred = _gov_name_to_party(r.get("candidate", ""))
                if inferred:
                    r["party"] = inferred

        p["poll_type"] = "governor-race"
        p["subject"] = f"{state} Governor"
        p["raw_data"] = {"url": _state_to_gov_wiki_url(state)}
        # Rewrite external_id prefix to avoid collisions with Senate polls
        if p["external_id"].startswith("wiki_"):
            p["external_id"] = p["external_id"].replace("wiki_", "wiki_gov_", 1)
        filtered.append(p)

    return filtered


async def fetch_governor_race_polls_wikipedia(state: str) -> list[dict]:
    """
    Fetch and parse all polls for a Governor race from Wikipedia.
    Returns normalized poll dicts.
    """
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30) as client:
        url = await _resolve_gov_wiki_url(state, client)
        if not url:
            logger.warning(f"No Wikipedia gubernatorial page found for {state}")
            return []
        logger.info(f"Fetching Wikipedia governor polls for {state}: {url}")
        try:
            resp = await client.get(url)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.warning(f"HTTP {e.response.status_code} for Wikipedia governor {state}")
            return []
        except httpx.RequestError as e:
            logger.warning(f"Request error for Wikipedia governor {state}: {e}")
            return []

    from bs4 import BeautifulSoup
    soup = BeautifulSoup(resp.text, "lxml")
    tables = soup.find_all("table", class_="wikitable")

    all_polls: list[dict] = []
    for table in tables:
        if _is_poll_table(table):
            polls = _parse_gov_poll_table(table, state)
            all_polls.extend(polls)

    # Deduplicate by external_id
    seen: set[str] = set()
    unique: list[dict] = []
    for p in all_polls:
        eid = p["external_id"]
        if eid not in seen:
            seen.add(eid)
            p["raw_data"] = {"url": url}
            unique.append(p)

    logger.info(f"Wikipedia governor {state}: {len(unique)} unique polls")
    return unique


async def fetch_all_governor_wikipedia(states: list[str]) -> dict[str, list[dict]]:
    """Fetch Wikipedia governor polls for all states concurrently."""
    results_list = await asyncio.gather(
        *[fetch_governor_race_polls_wikipedia(s) for s in states],
        return_exceptions=True,
    )
    results: dict[str, list[dict]] = {}
    for state, result in zip(states, results_list):
        if isinstance(result, Exception):
            logger.warning(f"Wikipedia governor fetch failed for {state}: {result}")
            results[state] = []
        else:
            results[state] = result  # type: ignore[assignment]
    return results
