"""
RealClearPolling scraper for 2026 generic congressional ballot polls.
Parses poll data from Next.js SSR __next_f chunks embedded in the page HTML.
"""
import logging
import re
from datetime import datetime
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

RCP_URL = "https://www.realclearpolling.com/polls/state-of-the-union/generic-congressional-vote"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def _parse_date(date_str: str) -> tuple[Optional[datetime], Optional[datetime]]:
    """Parse RCP date format like '3/17 - 3/19' into start/end dates."""
    date_str = date_str.strip()
    if not date_str or date_str == "--":
        return None, None

    year = datetime.now().year
    parts = re.split(r"\s*[-–—]\s*", date_str)

    def parse_single(s: str) -> Optional[datetime]:
        s = s.strip().rstrip("*")
        try:
            d = s.split("/")
            if len(d) == 2:
                return datetime(year, int(d[0]), int(d[1]))
            elif len(d) == 3:
                y = int(d[2])
                if y < 100:
                    y += 2000
                return datetime(y, int(d[0]), int(d[1]))
        except (ValueError, IndexError):
            pass
        return None

    if len(parts) == 2:
        start = parse_single(parts[0])
        end = parse_single(parts[1])
        if start and end and end < start:
            # End date might be in next year
            end = end.replace(year=year + 1) if end.month < start.month else end
        return start, end
    elif len(parts) == 1:
        d = parse_single(parts[0])
        return d, d

    return None, None


def _parse_sample(sample_str: str) -> tuple[Optional[int], str]:
    """Parse sample like '1206 RV' into (1206, 'rv')."""
    sample_str = sample_str.strip()
    if not sample_str or sample_str == "--":
        return None, "rv"

    pop = "rv"
    upper = sample_str.upper()
    if "LV" in upper:
        pop = "lv"
    elif "RV" in upper:
        pop = "rv"
    elif " A " in upper or upper.endswith(" A"):
        pop = "a"

    match = re.search(r"(\d[\d,]*)", sample_str)
    n = int(match.group(1).replace(",", "")) if match else None
    return n, pop


async def fetch_generic_ballot_polls() -> list[dict]:
    """Fetch generic congressional ballot polls from RealClearPolling."""
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30) as client:
        try:
            resp = await client.get(RCP_URL)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.error(f"RCP HTTP error: {e.response.status_code}")
            return []
        except httpx.RequestError as e:
            logger.error(f"RCP request error: {e}")
            return []

        # RCP uses Next.js SSR with escaped JSON in __next_f chunks
        text = resp.text.replace('\\"', '"').replace("\\n", "\n")

        # Split on pollster fields to find individual poll objects
        segments = text.split('"pollster":"')
        polls = []
        seen = set()

        for seg in segments[1:]:
            pollster = seg.split('"')[0]
            if not pollster or pollster.strip() == "":
                continue
            # Skip RCP average row
            if "rcp" in pollster.lower() or "average" in pollster.lower():
                continue

            date_m = re.search(r'"date":"([^"]+)"', seg[:500])
            sample_m = re.search(r'"sampleSize":"([^"]*?)"', seg[:500])
            dem_m = re.search(r'"Democrat"[^}]*?"value":"([\d.]+)"', seg[:1000])
            rep_m = re.search(r'"Republican"[^}]*?"value":"([\d.]+)"', seg[:1000])

            if not (dem_m and rep_m and date_m):
                continue

            date_str = date_m.group(1)
            sample_str = sample_m.group(1) if sample_m else ""
            dem_pct = float(dem_m.group(1))
            rep_pct = float(rep_m.group(1))

            start_date, end_date = _parse_date(date_str)
            if not end_date:
                continue

            sample_size, population = _parse_sample(sample_str)

            # Clean pollster name (remove trailing **)
            pollster_clean = re.sub(r"\*+$", "", pollster).strip()

            pollster_slug = re.sub(r"[^a-z0-9]", "", pollster_clean.lower())[:20]
            end_date_str = end_date.strftime("%Y%m%d")
            external_id = f"rcp_gb_{pollster_slug}_{end_date_str}"

            # Deduplicate (RCP page contains duplicate data in multiple chunks)
            if external_id in seen:
                continue
            seen.add(external_id)

            polls.append({
                "external_id": external_id,
                "pollster_name": pollster_clean,
                "poll_date_start": start_date,
                "poll_date_end": end_date,
                "sample_size": sample_size,
                "population": population,
                "results": [
                    {"candidate": "Generic Democrat", "party": "DEM", "pct": dem_pct},
                    {"candidate": "Generic Republican", "party": "REP", "pct": rep_pct},
                ],
                "poll_type": "generic-ballot",
                "subject": "2026 Generic Ballot",
                "source": "realclearpolling",
                "raw_data": {"url": RCP_URL},
            })

    logger.info(f"Scraped {len(polls)} generic ballot polls from RCP")
    return polls
