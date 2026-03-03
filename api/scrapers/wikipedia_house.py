"""
Wikipedia scraper for 2026 U.S. House race polling tables.
"""
import asyncio
import logging
import re
from urllib.parse import quote
from typing import Optional

import httpx
from bs4 import BeautifulSoup, Tag

from api.scrapers.wikipedia import _is_poll_table, _parse_poll_table

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

STATE_ABBR = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
    "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
    "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
    "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD", "Massachusetts": "MA",
    "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO", "Montana": "MT",
    "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
    "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
    "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
    "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
}


def _canonical_house_url(state: str) -> str:
    slug = state.strip().replace(" ", "_")
    return f"https://en.wikipedia.org/wiki/2026_United_States_House_of_Representatives_elections_in_{slug}"


async def _resolve_house_url(state: str, client: httpx.AsyncClient) -> Optional[str]:
    canonical = _canonical_house_url(state)
    try:
        r = await client.get(canonical)
        if r.status_code == 200:
            return canonical
    except httpx.RequestError:
        pass

    query = f"2026 United States House of Representatives elections in {state}"
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
        return None

    state_slug = state.lower().replace(" ", "_")
    for u in urls:
        if (
            "/2026_United_States_House_of_Representatives_elections_in_" in u
            and state_slug in u.lower()
        ):
            return u
    return None


def _extract_district_from_heading(text: str, state_abbr: str) -> Optional[str]:
    t = text.lower()
    if "at-large" in t or "at large" in t:
        return f"{state_abbr}-AL"

    patterns = [
        r"\b(\d{1,2})(?:st|nd|rd|th)?\s+district\b",
        r"\bdistrict\s+(\d{1,2})\b",
        r"\bcd\s*(\d{1,2})\b",
    ]
    for p in patterns:
        m = re.search(p, t)
        if m:
            num = int(m.group(1))
            return f"{state_abbr}-{num:02d}"
    return None


def _district_for_table(table: Tag, state: str) -> Optional[str]:
    abbr = STATE_ABBR.get(state)
    if not abbr:
        return None

    # Some pages have nested headings like "Polling" under a district section,
    # so walk back through multiple heading levels and pick the first district match.
    for heading in table.find_all_previous(["h5", "h4", "h3", "h2"]):
        text = heading.get_text(" ", strip=True)
        district = _extract_district_from_heading(text, abbr)
        if district:
            return district
    return None


async def fetch_house_state_polls_wikipedia(state: str) -> list[dict]:
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30) as client:
        url = await _resolve_house_url(state, client)
        if not url:
            return []
        try:
            resp = await client.get(url)
            resp.raise_for_status()
        except Exception:
            return []

    soup = BeautifulSoup(resp.text, "lxml")
    tables = soup.find_all("table", class_="wikitable")

    out: list[dict] = []
    seen: set[str] = set()
    for table in tables:
        if not _is_poll_table(table):
            continue
        district = _district_for_table(table, state)
        if not district:
            continue
        parsed = _parse_poll_table(table, state)
        for p in parsed:
            for r in p.get("results", []):
                party = (r.get("party") or "").upper()
                if party and party != "UNK":
                    continue
                candidate = str(r.get("candidate") or "")
                if "(D" in candidate or " Democrat" in candidate:
                    r["party"] = "DEM"
                elif "(R" in candidate or " Republican" in candidate:
                    r["party"] = "REP"
                elif "(I" in candidate or " Independent" in candidate:
                    r["party"] = "IND"

            # Convert Senate-normalized row into House-normalized row.
            p["poll_type"] = "house-race"
            p["subject"] = f"{district} House"
            p["raw_data"] = {"url": url, "district": district}
            p["external_id"] = f"{p['external_id']}_{district.lower().replace('-', '')}"
            eid = p["external_id"]
            if eid in seen:
                continue
            seen.add(eid)
            out.append(p)

    return out


async def fetch_all_house_wikipedia(states: list[str]) -> dict[str, list[dict]]:
    results = await asyncio.gather(
        *[fetch_house_state_polls_wikipedia(s) for s in states],
        return_exceptions=True,
    )
    mapped: dict[str, list[dict]] = {}
    for state, result in zip(states, results):
        if isinstance(result, Exception):
            logger.warning(f"House Wikipedia scrape failed for {state}: {result}")
            mapped[state] = []
        else:
            mapped[state] = result
    return mapped
