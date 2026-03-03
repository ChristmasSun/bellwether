"""
Wikipedia scraper for 2026 Senate race polls.

Wikipedia election pages contain structured wikitable poll tables with
candidate percentages, party colors (via header background colors), dates,
and pollster names.

Data flow:
1. Build URL from state name: 2026_United_States_Senate_election_in_{State}
2. Fetch page and parse with BeautifulSoup
3. Find wikitable elements with poll-related headers
4. Detect candidate parties from header background colors or candidate registry
5. Parse each data row into normalized poll dicts
"""
import asyncio
import logging
import re
from datetime import datetime
from typing import Optional
from urllib.parse import quote

import httpx
from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

CYCLE_START = datetime(2025, 1, 1)
CYCLE_END = datetime(2026, 12, 31, 23, 59, 59)

# Known 2026 Senate candidates → party. Checked via substring match (longest first).
CANDIDATE_PARTIES: dict[str, str] = {
    # Texas
    "ken paxton": "REP",
    "john cornyn": "REP",
    "wesley hunt": "REP",
    "roland gutierrez": "DEM",
    "gil cisneros": "DEM",
    "joaquin castro": "DEM",
    "greg casar": "DEM",
    "marc veasey": "DEM",
    "paul talarico": "DEM",
    "talarico": "DEM",
    "casar": "DEM",
    "veasey": "DEM",
    "gutierrez": "DEM",
    "cisneros": "DEM",
    "cornyn": "REP",
    "paxton": "REP",
    "hunt": "REP",
    # North Carolina
    "thom tillis": "REP",
    "michael whatley": "REP",
    "jim morrow": "REP",
    "pat mccrory": "REP",
    "roy cooper": "DEM",
    "jeff jackson": "DEM",
    "don davis": "DEM",
    "tillis": "REP",
    "whatley": "REP",
    "morrow": "REP",
    "mccrory": "REP",
    "cooper": "DEM",
    "jackson": "DEM",
    # Michigan
    "mike rogers": "REP",
    "peter meijer": "REP",
    "sandy pensler": "REP",
    "mallory mcmorrow": "DEM",
    "abdul el-sayed": "DEM",
    "hill harper": "DEM",
    "elissa slotkin": "DEM",
    "haley stevens": "DEM",
    "el-sayed": "DEM",
    "mcmorrow": "DEM",
    "slotkin": "DEM",
    "stevens": "DEM",
    "rogers": "REP",
    "meijer": "REP",
    "pensler": "REP",
    # Georgia
    "jon ossoff": "DEM",
    "brian kemp": "REP",
    "rick allen": "REP",
    "marjorie taylor greene": "REP",
    "bernie marcus": "REP",
    "mike collins": "REP",
    "ossoff": "DEM",
    "kemp": "REP",
    "allen": "REP",
    "greene": "REP",
    "marcus": "REP",
    # Pennsylvania
    "dave mccormick": "REP",
    "john fetterman": "DEM",
    "malcolm kenyatta": "DEM",
    "bob casey": "DEM",
    "dan meuser": "REP",
    "mccormick": "REP",
    "fetterman": "DEM",
    "kenyatta": "DEM",
    "casey": "DEM",
    "meuser": "REP",
    # Wisconsin
    "ron johnson": "REP",
    "eric hovde": "REP",
    "tammy baldwin": "DEM",
    "sarah godlewski": "DEM",
    "alex lasry": "DEM",
    "mandela barnes": "DEM",
    "hovde": "REP",
    "baldwin": "DEM",
    "godlewski": "DEM",
    "lasry": "DEM",
    "barnes": "DEM",
    # Ohio
    "bernie moreno": "REP",
    "matt dolan": "REP",
    "nina turner": "DEM",
    "tim ryan": "DEM",
    "moreno": "REP",
    "dolan": "REP",
    "turner": "DEM",
    "ryan": "DEM",
    # Virginia
    "mark warner": "DEM",
    "jen kiggans": "REP",
    "glenn youngkin": "REP",
    "scott surovell": "DEM",
    "kiggans": "REP",
    "youngkin": "REP",
    "surovell": "DEM",
    # Colorado
    "john hickenlooper": "DEM",
    "joe o'dea": "REP",
    "gabe evans": "REP",
    "hickenlooper": "DEM",
    "evans": "REP",
    # Minnesota
    "tina smith": "DEM",
    "royce white": "REP",
    # New Hampshire
    "jeanne shaheen": "DEM",
    "chris sununu": "REP",
    "maggie hassan": "DEM",
    "shaheen": "DEM",
    "sununu": "REP",
    "hassan": "DEM",
    # Iowa
    "joni ernst": "REP",
    "theresa greenfield": "DEM",
    "ernst": "REP",
    "greenfield": "DEM",
    # Maine
    "susan collins": "REP",
    "sara gideon": "DEM",
    "gideon": "DEM",
    # Illinois
    "dick durbin": "DEM",
    "robin kelly": "DEM",
    "tammy duckworth": "DEM",
    "durbin": "DEM",
    "duckworth": "DEM",
    # Independents
    "bernie sanders": "IND",
    "angus king": "IND",
}

# Sort by length descending so longer/more-specific names match first
_CANDIDATE_KEYS_SORTED = sorted(CANDIDATE_PARTIES.keys(), key=len, reverse=True)


def _state_to_wiki_url(state: str) -> str:
    slug = state.strip().replace(" ", "_")
    return f"https://en.wikipedia.org/wiki/2026_United_States_Senate_election_in_{slug}"


async def _resolve_wiki_url(state: str, client: httpx.AsyncClient) -> Optional[str]:
    """
    Resolve a Wikipedia election URL for the state.
    Prefer the canonical 2026 page, then fallback to MediaWiki search.
    """
    canonical = _state_to_wiki_url(state)
    try:
        r = await client.get(canonical)
        if r.status_code == 200:
            return canonical
    except httpx.RequestError:
        pass

    queries = [
        f"2026 United States Senate election in {state}",
        f"United States Senate election in {state}",
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
            and "United_States_Senate_election_in" in u
            and normalized_state in u.lower()
            and "/2026_" in u
        ]
        if candidates:
            return candidates[0]

    return None


def _extract_bg_color(tag: Tag) -> Optional[str]:
    """Extract background color from a table cell's style or bgcolor attribute."""
    style = tag.get("style", "")
    if style:
        m = re.search(r"background(?:-color)?\s*:\s*([^;\"']+)", style, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    bgcolor = tag.get("bgcolor")
    if bgcolor:
        return str(bgcolor).strip()
    return None


def _color_to_party(color_str: str) -> Optional[str]:
    """Determine party affiliation from a CSS background color value."""
    if not color_str:
        return None
    c = color_str.strip().lower()

    # Named colors
    if c in ("red", "#ff0000"):
        return "REP"
    if c in ("blue", "#0000ff"):
        return "DEM"

    # Hex colors
    hex_match = re.search(r"#([0-9a-f]{6}|[0-9a-f]{3})\b", c)
    if hex_match:
        h = hex_match.group(1)
        if len(h) == 3:
            h = h[0] * 2 + h[1] * 2 + h[2] * 2
        r = int(h[0:2], 16)
        g = int(h[2:4], 16)
        b = int(h[4:6], 16)
        # Red-dominant (Republican)
        if r >= 140 and r > b + 40 and r > g + 10:
            return "REP"
        # Blue-dominant (Democratic)
        if b >= 100 and b > r + 30:
            return "DEM"

    return None


def _name_to_party(name: str) -> Optional[str]:
    """Look up a candidate's party from the known 2026 candidate registry."""
    name_clean = name.lower().strip()
    # Remove party markers like (R), (D), (REP), (DEM) in parentheses
    name_clean = re.sub(r"\s*\([^)]*\)\s*", " ", name_clean).strip()
    # Exact match first
    if name_clean in CANDIDATE_PARTIES:
        return CANDIDATE_PARTIES[name_clean]
    # Substring match using pre-sorted keys (longest first)
    for key in _CANDIDATE_KEYS_SORTED:
        if key in name_clean:
            return CANDIDATE_PARTIES[key]
    return None


_MONTH_NAMES = (
    "January|February|March|April|May|June|July|August|"
    "September|October|November|December|"
    "Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec"
)


def _span_value(raw, default: int = 1) -> int:
    """Parse rowspan/colspan attributes robustly (handles odd values like '2;')."""
    if raw is None:
        return default
    m = re.search(r"\d+", str(raw))
    if not m:
        return default
    try:
        return max(1, int(m.group(0)))
    except ValueError:
        return default


def _parse_wiki_date(s: str) -> tuple[Optional[datetime], Optional[datetime]]:
    """Parse Wikipedia date strings like 'February 26–27, 2026' or 'Jan. 5–7, 2026'."""
    if not s:
        return None, None

    s = s.strip()
    # Normalize month abbreviations: "Jan." → "Jan"
    s = re.sub(r"\b(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.", r"\1", s)

    # Determine separator: en dash (–) or ASCII hyphen surrounded by spaces
    if "–" in s:
        sep = "–"
    elif " - " in s:
        sep = " - "
    else:
        d = _try_parse_date(s)
        return d, d

    parts = s.split(sep, 1)
    start_raw = parts[0].strip()
    end_raw = parts[1].strip()

    # Extract year — Wikipedia puts it at the end of the range
    year_match = re.search(r"\b(20\d{2})\b", end_raw)
    year = year_match.group(1) if year_match else "2026"

    has_month_start = bool(re.search(rf"\b({_MONTH_NAMES})\b", start_raw, re.IGNORECASE))
    has_month_end = bool(re.search(rf"\b({_MONTH_NAMES})\b", end_raw, re.IGNORECASE))
    has_year_start = bool(re.search(r"\b20\d{2}\b", start_raw))

    # Build full start: add month (from end) and/or year if missing
    if not has_year_start:
        if not has_month_start:
            m = re.search(rf"\b({_MONTH_NAMES})\b", end_raw, re.IGNORECASE)
            if m:
                start_raw = f"{m.group(1)} {start_raw}"
        start_raw = f"{start_raw}, {year}"

    # Build full end: if end has no month name, it's just a day number like "31, 2026"
    # Pull the month from start_raw.
    if not has_month_end:
        m = re.search(rf"\b({_MONTH_NAMES})\b", start_raw, re.IGNORECASE)
        day_m = re.search(r"\b(\d{1,2})\b", end_raw)
        if m and day_m:
            end_raw = f"{m.group(1)} {day_m.group(1)}, {year}"

    start_date = _try_parse_date(start_raw)
    end_date = _try_parse_date(end_raw)
    return start_date, end_date


def _try_parse_date(s: str) -> Optional[datetime]:
    """Try to parse a date string using common Wikipedia date formats."""
    if not s:
        return None
    s = s.strip().rstrip(".")

    formats = [
        "%B %d, %Y",    # February 26, 2026
        "%b %d, %Y",    # Feb 26, 2026
        "%B %d %Y",     # February 26 2026
        "%b %d %Y",     # Feb 26 2026
        "%d %B %Y",     # 26 February 2026
        "%d %b %Y",     # 26 Feb 2026
        "%B %Y",        # February 2026 (day unknown — use day 1)
        "%b %Y",        # Feb 2026
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(s, fmt)
            if dt.year == 1900:
                dt = dt.replace(year=2026)
            return dt
        except ValueError:
            continue
    return None


def _parse_wiki_sample(s: str) -> tuple[Optional[int], str]:
    """Parse Wikipedia sample strings like '547 (LV)', '600 (RV)', '1,200'."""
    if not s:
        return None, "rv"
    s = s.strip()
    s_upper = s.upper()
    pop = "rv"
    if "LV" in s_upper:
        pop = "lv"
    elif "RV" in s_upper:
        pop = "rv"
    elif re.search(r"\bA\b", s_upper):
        pop = "a"
    s_clean = s.replace(",", "")
    m = re.search(r"(\d+)", s_clean)
    n = int(m.group(1)) if m else None
    return n, pop


def _is_poll_table(table: Tag) -> bool:
    """Return True if this wikitable appears to contain polling data."""
    # Combine early-row headers to handle multi-row/stacked table headers.
    rows = table.find_all("tr")
    if not rows:
        return False
    header_text = " ".join(
        cell.get_text(strip=True).lower()
        for row in rows[:4]
        for cell in row.find_all(["th", "td"])
    )
    caption = table.find("caption")
    if caption:
        header_text += " " + caption.get_text(" ", strip=True).lower()

    # Some pages nest polling tables under "Polling" sections with weak headers.
    # Use nearby section heading as a supporting signal.
    prev_heading = table.find_previous(["h2", "h3", "h4"])
    if prev_heading:
        header_text += " " + prev_heading.get_text(" ", strip=True).lower()

    # Exclude aggregate/model tables (not individual polls).
    aggregate_markers = [
        "source of poll aggregation",
        "aggregate polls",
        "dates updated",
        "poll aggregation",
    ]
    if any(marker in header_text for marker in aggregate_markers):
        return False

    poll_keywords = [
        "poll source", "polling firm", "pollster",
        "dates administered", "date administered", "field dates",
        "date(s)", "conducted",
        "polling", "general election polling", "primary polling",
    ]
    return any(kw in header_text for kw in poll_keywords)


def _is_aggregate_pollster_name(name: str) -> bool:
    """True when a row represents a modeled/aggregated tracker, not a raw poll."""
    s = (name or "").lower()
    aggregate_sources = [
        "270towin",
        "realclearpolitics",
        "real clear politics",
        "race to the wh",
        "racetothewh",
        "fivethirtyeight",
        "five thirty eight",
        "split ticket",
        "the economist",
        "daily kos elections",
        "average",
    ]
    return any(token in s for token in aggregate_sources)


def _build_columns(header_rows: list[Tag]) -> list[dict]:
    """
    Build a list of column descriptors from a header row.
    Each descriptor: {"type": str, "party": str|None, "name": str|None}
    Handles colspan so the list length equals the actual column count.
    """
    if not header_rows:
        return []

    matrix: list[list[Optional[Tag]]] = []
    occupied: list[set[int]] = []

    for r_idx, row in enumerate(header_rows):
        while len(matrix) <= r_idx:
            matrix.append([])
            occupied.append(set())

        cells = row.find_all(["th", "td"])
        c_idx = 0
        for cell in cells:
            while c_idx in occupied[r_idx]:
                c_idx += 1

            rowspan = _span_value(cell.get("rowspan"), 1)
            colspan = _span_value(cell.get("colspan"), 1)
            for rr in range(r_idx, r_idx + rowspan):
                while len(matrix) <= rr:
                    matrix.append([])
                    occupied.append(set())
                for cc in range(c_idx, c_idx + colspan):
                    occupied[rr].add(cc)
                    while len(matrix[rr]) <= cc:
                        matrix[rr].append(None)
                    matrix[rr][cc] = cell
            c_idx += colspan

    max_cols = max((len(r) for r in matrix), default=0)
    columns: list[dict] = []

    for col_idx in range(max_cols):
        header_parts: list[str] = []
        party = None
        seen_text: set[str] = set()
        for r in matrix:
            if col_idx >= len(r):
                continue
            cell = r[col_idx]
            if not cell:
                continue
            cell_copy = BeautifulSoup(str(cell), "lxml")
            for sup in cell_copy.find_all("sup"):
                sup.decompose()
            text = cell_copy.get_text(separator=" ", strip=True)
            text_norm = re.sub(r"\s+", " ", text).strip()
            if text_norm and text_norm.lower() not in seen_text:
                seen_text.add(text_norm.lower())
                header_parts.append(text_norm)
            if party is None:
                bg = _extract_bg_color(cell)
                if bg:
                    party = _color_to_party(bg)

        combined = " ".join(header_parts).strip()
        text_lower = combined.lower()

        if any(x in text_lower for x in ["poll source", "polling firm", "pollster", "source"]):
            columns.append({"type": "pollster", "party": None, "name": None})
        elif any(x in text_lower for x in ["date", "administered", "field", "conducted"]):
            columns.append({"type": "date", "party": None, "name": None})
        elif any(x in text_lower for x in ["sample", "n ="]):
            columns.append({"type": "sample", "party": None, "name": None})
        elif any(x in text_lower for x in ["margin", "moe", "error", "±", "m.o.e"]):
            columns.append({"type": "moe", "party": None, "name": None})
        elif any(x in text_lower for x in ["undecided", "unsure", "don't know", "lead", "other", "spread", "ref"]):
            columns.append({"type": "skip", "party": None, "name": None})
        else:
            name = combined
            if not party:
                party = _name_to_party(name)
            columns.append({"type": "candidate", "party": party, "name": name or None})

    return columns


def _parse_poll_table(table: Tag, state: str) -> list[dict]:
    """Parse a Wikipedia wikitable and return normalized poll dicts."""
    rows = table.find_all("tr")
    if not rows:
        return []

    # Collect contiguous header rows at top (supports rowspan/colspan structures).
    header_rows: list[Tag] = []
    data_start = 0
    for i, row in enumerate(rows):
        ths = row.find_all("th")
        tds = row.find_all("td")
        if ths and not tds:
            header_rows.append(row)
            data_start = i + 1
            continue
        if ths and tds and i <= 1:
            header_rows.append(row)
            data_start = i + 1
            continue
        break

    if not header_rows:
        return []

    columns = _build_columns(header_rows)

    # Must have at least a pollster column and one candidate column
    if not any(c["type"] == "pollster" for c in columns):
        return []
    if not any(c["type"] == "candidate" for c in columns):
        return []

    state_slug = state.lower().replace(" ", "_")
    polls = []

    # Track active rowspans: col_idx → (remaining_rows, text_value)
    active_rowspans: dict[int, tuple[int, str]] = {}

    for row in rows[data_start:]:
        raw_cells = list(row.find_all(["td", "th"]))
        if not raw_cells:
            continue

        # Skip sub-header rows (all <th>)
        if all(c.name == "th" for c in raw_cells):
            continue

        # Build effective cell values, filling in rowspan placeholders.
        effective: list[str] = []
        raw_idx = 0
        for col_idx in range(len(columns)):
            if col_idx in active_rowspans:
                remaining, val = active_rowspans[col_idx]
                effective.append(val)
                if remaining <= 1:
                    del active_rowspans[col_idx]
                else:
                    active_rowspans[col_idx] = (remaining - 1, val)
            else:
                if raw_idx < len(raw_cells):
                    cell = raw_cells[raw_idx]
                    # Strip footnotes
                    for sup in cell.find_all("sup"):
                        sup.decompose()
                    val = cell.get_text(strip=True)
                    rowspan = _span_value(cell.get("rowspan"), 1)
                    if rowspan > 1:
                        active_rowspans[col_idx] = (rowspan - 1, val)
                    effective.append(val)
                    raw_idx += 1
                else:
                    effective.append("")

        # Skip aggregate/average rows
        row_text_lower = " ".join(effective).lower()
        if any(x in row_text_lower for x in ["average", "rcp average", "fivethirtyeight", "aggregate", "weighted average"]):
            continue

        # Extract field values
        pollster = None
        date_str = None
        sample_str = None
        candidate_results = []

        for col_idx, col in enumerate(columns):
            if col_idx >= len(effective):
                break
            val = effective[col_idx]

            if col["type"] == "pollster" and pollster is None:
                pollster = val
            elif col["type"] == "date" and date_str is None:
                date_str = val
            elif col["type"] == "sample" and sample_str is None:
                sample_str = val
            elif col["type"] == "candidate" and col["name"]:
                if val and val not in ("–", "-", "N/A", ""):
                    pct_m = re.search(r"(\d+(?:\.\d+)?)", val)
                    if pct_m:
                        try:
                            pct = float(pct_m.group(1))
                            candidate_results.append({
                                "candidate": col["name"],
                                "party": col["party"] or "UNK",
                                "pct": pct,
                            })
                        except ValueError:
                            pass

        if not pollster or not candidate_results:
            continue
        if _is_aggregate_pollster_name(pollster):
            continue

        start_date, end_date = _parse_wiki_date(date_str or "")
        if not end_date:
            continue
        # Keep only polling dates relevant to the 2026 cycle.
        if end_date < CYCLE_START or end_date > CYCLE_END:
            continue

        n, pop = _parse_wiki_sample(sample_str or "")

        # Detect partisan pollsters
        is_partisan = False
        partisan_lean = ""
        if pollster:
            if "(D)" in pollster or "(Dem)" in pollster:
                is_partisan, partisan_lean = True, "DEM"
            elif "(R)" in pollster or "(Rep)" in pollster:
                is_partisan, partisan_lean = True, "REP"

        end_date_str = end_date.strftime("%Y%m%d")
        pollster_slug = re.sub(r"[^a-z0-9]", "", pollster.lower())[:20]
        # Include candidates in the ID so same-pollster, same-date, different-matchup
        # polls all get unique IDs (e.g. Paxton-Talarico vs Cornyn-Talarico).
        cand_slug = re.sub(r"[^a-z0-9]", "", "_".join(
            r["candidate"] for r in sorted(candidate_results, key=lambda x: x["candidate"])
        ).lower())[:30]
        external_id = f"wiki_{state_slug}_{pollster_slug}_{end_date_str}_{cand_slug}"

        polls.append({
            "external_id": external_id,
            "pollster_name": pollster,
            "poll_date_start": start_date,
            "poll_date_end": end_date,
            "sample_size": n,
            "population": pop,
            "results": candidate_results,
            "poll_type": "senate-race",
            "subject": f"{state} Senate",
            "source": "wikipedia",
            "is_partisan": is_partisan,
            "partisan_lean": partisan_lean,
            "raw_data": {"url": _state_to_wiki_url(state)},
        })

    return polls


async def fetch_senate_race_polls_wikipedia(state: str) -> list[dict]:
    """
    Fetch and parse all polls for a Senate race from Wikipedia.
    Returns normalized poll dicts ready for DB insertion.
    """
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30) as client:
        url = await _resolve_wiki_url(state, client)
        if not url:
            logger.warning(f"No Wikipedia election page found for {state}")
            return []
        logger.info(f"Fetching Wikipedia polls for {state}: {url}")
        try:
            resp = await client.get(url)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.warning(f"HTTP {e.response.status_code} for Wikipedia {state}")
            return []
        except httpx.RequestError as e:
            logger.warning(f"Request error for Wikipedia {state}: {e}")
            return []

    soup = BeautifulSoup(resp.text, "lxml")
    tables = soup.find_all("table", class_="wikitable")

    all_polls: list[dict] = []
    for table in tables:
        if _is_poll_table(table):
            polls = _parse_poll_table(table, state)
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

    logger.info(f"Wikipedia {state}: {len(unique)} unique polls")
    return unique


async def fetch_all_wikipedia(states: list[str]) -> dict[str, list[dict]]:
    """Fetch Wikipedia polls for all states concurrently."""
    results_list = await asyncio.gather(
        *[fetch_senate_race_polls_wikipedia(s) for s in states],
        return_exceptions=True,
    )
    results: dict[str, list[dict]] = {}
    for state, result in zip(states, results_list):
        if isinstance(result, Exception):
            logger.warning(f"Wikipedia fetch failed for {state}: {result}")
            results[state] = []
        else:
            results[state] = result  # type: ignore[assignment]
    return results
