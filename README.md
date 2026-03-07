# Bellwether

A live polling aggregator for 2026 US Senate and House elections. Scrapes poll data from Wikipedia, computes weighted aggregates, and presents everything in a real-time Bloomberg-terminal-style dashboard.

## Architecture

```
┌─────────────────────────────┐      ┌──────────────────────────────┐
│  Next.js Frontend (web/)    │◄────►│  FastAPI Backend (api/)      │
│  React 19 · Tailwind v4     │ REST │  SQLAlchemy · SQLite         │
│  Recharts · Framer Motion   │      │  APScheduler · httpx + BS4   │
└─────────────────────────────┘      └──────────────────────────────┘
```

**Backend** — Python FastAPI server that scrapes Wikipedia for structured poll tables, stores results in SQLite, and exposes a REST API. A background scheduler refreshes data every 4 hours and recomputes aggregates hourly.

**Frontend** — Next.js 15 application with a dense, data-forward dashboard. Senate and House races, polling trends, seat balance meters, competitive-state indices, and a live ticker — all wired to the backend API.

---

## Features

### Data Pipeline

- **Wikipedia scraper** — Parses complex wikitables with multi-row headers (`rowspan`/`colspan`), detects candidate parties from header background colors, and handles both Senate and House race pages.
- **Aggregate filtering** — Automatically excludes poll aggregation sources (270toWin, RealClearPolitics, RaceToTheWH, etc.) so only raw poll data is counted.
- **Cycle enforcement** — Strictly filters to 2026 election data, preventing contamination from prior cycles.
- **Unique poll counting** — Deduplicates polls by pollster name and end date, so a single survey testing multiple matchups counts once.
- **Weighted aggregation engine** — Computes polling averages using recency decay (21-day half-life), sample size weighting, 538-style pollster quality grades, population adjustments (LV/RV/Adults), and house-effect corrections.
- **Fundraising data** — Static FEC Q4-2025 estimates for 15 competitive states (GA, NH, ME, MI, NC, CO, IA, VA, TX, MN, WV, AK, MA, DE, NJ) loaded from `FUNDRAISING_2026` lookup in `electionData.ts`.
- **Turnout data** — 2022 midterm voter turnout rates for all 50 states from the U.S. Elections Project, stored in the `TURNOUT_2022` lookup.
- **Campaign activity proxy** — `eventsThisWeek` computed from polls published in the last 14 days (capped at 12), used as a proxy for campaign intensity in the absence of real event tracking.
- **Poll entries** — `RecentPoll` records from the `/polls/search` endpoint are transformed into `PollEntry` format with margin-of-error computed from sample size (`0.98 / √n × 100`), feeding the polls table in `PollingPanel`.

### Dashboard

- **Senate tab** — All 33 tracked races with candidate matchups, margins, Cook ratings, and polling sparklines.
- **House tab** — District-level grid of polled House races with state names (resolved from full state-name lookup, not abbreviation codes).
- **Polls tab** — Chronological feed of recent polls with sample sizes, methodology, and computed margin of error.
- **News tab** — Poll activity feed derived dynamically from the latest `RecentPoll` data: headlines include pollster, leader, margin, and state; battleground states tagged `BATTLEGROUND`/`TOSS-UP`; polls with ≤1 pt margin flagged as urgent; relative timestamps shown.
- **Map view** — Full-width USA map (USAMap.tsx) with a competitive-state grid below. Clicking a state opens `StateDetailView`. Activated via the MAP nav button; MAP highlights correctly in the nav.
- **Left column** — Seat balance meter, control probability chart, and historical seats bar charts for both chambers.
- **Right column** — Race status overview, most-polled races, poll density by state, data status, and seats at stake.
- **Live ticker** — Scrolling marquee of race margins and movements generated from live race data.
- **Key metric strip** — Toss-up counts, party leads, total polls, and race counts at a glance.
- **Race detail modal** — Click any Senate race for polling trend charts and aggregate breakdowns.
- **Error screen** — When the API is unreachable and no race data has loaded, a full error screen shows the exact error, the backend URL hint (`127.0.0.1:8000`), the uvicorn startup command, and a RETRY CONNECTION button. If partial data already loaded (e.g. races loaded but a subsequent refresh fails), the dashboard still renders with stale data.

### Charts

- **Probability chart** — Computes Democratic and Republican Senate/House control probability dynamically from `seatBalance`. Senate uses the 2026 Class 2 non-contested baseline (R=42, D=24) plus projected contested seats. House shows lean distribution of tracked competitive races. Renders as D/R split bars with seat counts and percentage labels.
- **Historical seats chart** — Real 2016–2024 Senate and House composition as a grouped `BarChart`. Senate data: 48/52, 47/53, 50/50, 51/49, 47/53. House data: 194/241, 235/200, 222/213, 213/222, 215/220. Majority lines at 51 (Senate) and 218 (House).

### Model Confidence & Prediction Markets

The Model Confidence block computes all four indicators dynamically from `seatBalance`:

| Indicator | Computation |
|---|---|
| SEN CTRL | Republican control probability from Senate seat projection |
| HSE CTRL | Republican control probability from House seat projection |
| NET SEN | Projected R net change from current 53-seat baseline |
| NET HSE | Projected R net change from current 220-seat baseline |

The Prediction Markets section shows a "Live market data not connected" notice instead of fabricated percentages.

### State Detail View

Clicking a competitive state (from the map or race list) opens a drill-down panel (`StateDetailView.tsx`) with:

- **Polling trend chart** — Candidate support over time from race polls.
- **County geographic breakdown** — Urban Core, Inner Suburb, Outer Suburb, Small City, and Rural margins, adjusted for state lean. Safe D states show strong urban D leads with rural R margins; Safe R states show the inverse; Toss-Up states show close patterns throughout.
- **Voter demographics radar** — Age 18–34, Age 65+, White, Non-white, Income $50k+, and College+ group breakdowns. College+ uses actual poll percentages; all other dimensions are shifted ±2–10 points from national baselines based on Cook rating.
- **Historical results** — Real Senate/statewide election results for 18 key competitive states (AK, AZ, CO, GA, IA, ME, MI, MN, MT, NC, NH, NV, OH, PA, TX, VA, WI, WV) from `STATE_ELECTION_HISTORY`. States not in the lookup get lean-derived approximations.
- **Fundraising panel** — Candidate fundraising totals and quarterly breakdown bars (Q1–Q4 split at 18%/22%/28%/32%) populated from FEC estimates where available.
- **Top fundraisers sidebar** — Ranked list of fundraising leaders for the state.

### Race Called Status

Races can be marked as called (election-night results) via the admin API. Once called:

- `called: true` and `winner: "D" | "R"` are set on the `SenateRace` object in the frontend.
- The UI can display called indicators on race cards and in the seat meter.
- All races default to `called: false` pre-election.

---

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/v1/senate/races` | All 2026 Senate races with metadata |
| `GET /api/v1/senate/races/{state}` | Single race details |
| `GET /api/v1/senate/races/{state}/polls` | Polls for a Senate race |
| `GET /api/v1/senate/races/{state}/aggregate` | Computed aggregate for a race |
| `GET /api/v1/senate/aggregate/all` | All race aggregates |
| `PATCH /api/v1/senate/races/{state}/called` | Mark a race as called (election night) |
| `GET /api/v1/house/races` | All polled House districts |
| `GET /api/v1/house/states/{state}/overview` | State-level House summary |
| `GET /api/v1/house/states/{state}/districts` | Districts in a state |
| `GET /api/v1/house/races/{district}/polls` | Polls for a House district |
| `GET /api/v1/house/races/{district}/aggregate` | Computed aggregate for a district |
| `GET /api/v1/polls/search` | Search/filter polls across all races |
| `POST /api/v1/admin/refresh/senate` | Trigger Senate poll scrape |
| `POST /api/v1/admin/refresh/house` | Trigger House poll scrape |
| `POST /api/v1/admin/recompute/aggregates` | Recompute all aggregates |
| `GET /health` | Health check |

Full interactive docs at `/docs` (Swagger UI) when the backend is running.

### Calling a Race (Election Night)

```bash
# Mark Georgia Senate race as called for Democrats
curl -X PATCH http://localhost:8000/api/v1/senate/races/Georgia/called \
  -H "Content-Type: application/json" \
  -d '{"called": true, "winner": "DEM"}'

# Un-call a race
curl -X PATCH http://localhost:8000/api/v1/senate/races/Georgia/called \
  -H "Content-Type: application/json" \
  -d '{"called": false}'
```

---

## What's Live vs. Hardcoded

### Live from API (dynamically fetched and computed)

- Senate race list, states, Cook ratings, incumbent info, `called`/`called_winner` status
- Candidate names, polling percentages, margins (from individual race polls)
- House district list, candidates, margins, and state names
- Recent polls table and poll activity feed with real MoE values
- News feed headlines derived from live poll data (pollster, leader, margin, timestamps)
- Ticker items generated from live race margins
- Race status breakdown (Safe D / Toss-Up / Lean R counts from Cook ratings)
- Key metric strip values (toss-ups, leads, poll counts, race counts)
- Most polled races, poll density, data status panels
- Competitive state index tiles
- Race detail modal with polling trend charts
- Seat balance meter and seat projections
- Model confidence indicators (SEN CTRL, HSE CTRL, NET SEN, NET HSE)
- Control probability chart percentages
- Fundraising panels for 15 competitive states (FEC Q4-2025 estimates)
- Turnout percentages for all 50 states (2022 midterm data)
- Campaign events proxy (recent poll activity count)

### Static / Hardcoded (in `web/src/lib/electionData.ts` and component files)

- **Historical seat counts** — Real 2016–2024 data stored as constants in `Charts.tsx`. Factual and immutable.
- **Fundraising data** — `FUNDRAISING_2026` lookup table (FEC Q4-2025 estimates). Accurate as of filing period; updated manually.
- **Turnout data** — `TURNOUT_2022` lookup (U.S. Elections Project). Fixed to 2022 midterm cycle.
- **State election history** — `STATE_ELECTION_HISTORY` in `StateDetailView.tsx` for 18 competitive states. Real results; won't change.
- **Senate non-contested baseline** — R=42, D=24 non-contested Class 2 seats used for probability calculation. Reflects 2024 election results.
- **Prediction markets** — Shows "not connected" message. No live market integration.
- **County breakdowns / demographics** — Lean-adjusted approximations for states without real precinct data.

---

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- npm or yarn

### Backend

```bash
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

The server will:
1. Initialize the SQLite database (`polls.db`) and run migrations
2. Seed 2026 Senate race metadata (33 races with Cook ratings and incumbent info)
3. Start the background scheduler (scrapes Wikipedia every 4h, recomputes aggregates every 1h)

To trigger an immediate data refresh after first startup:

```bash
curl -X POST http://localhost:8000/api/v1/admin/refresh/senate
curl -X POST http://localhost:8000/api/v1/admin/refresh/house
curl -X POST http://localhost:8000/api/v1/admin/recompute/aggregates
```

### Frontend

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dashboard fetches from `http://127.0.0.1:8000/api/v1` by default.

If the backend is unreachable, the frontend shows an error screen with the exact error message, backend URL hint, and a retry button. No blank screens.

To point the frontend at a different API URL:

```bash
NEXT_PUBLIC_API_URL=https://your-api.example.com/api/v1 npm run dev
```

---

## Project Structure

```
bellwether/
├── api/                          # FastAPI backend
│   ├── main.py                   # App entry point, lifespan, CORS, router registration
│   ├── models.py                 # SQLAlchemy models (SenateRace, Poll, PollAggregate, etc.)
│   │                             #   SenateRace includes: called (Boolean), called_winner (String)
│   ├── database.py               # Async/sync engine setup, session management
│   ├── scheduler.py              # APScheduler jobs for periodic data refresh
│   ├── routers/
│   │   ├── senate.py             # Senate race endpoints + PATCH /races/{state}/called
│   │   ├── house.py              # House race endpoints
│   │   ├── polls.py              # Cross-race poll search endpoint
│   │   └── admin.py              # Data refresh and recompute triggers
│   ├── scrapers/
│   │   ├── wikipedia.py          # Senate poll scraper (Wikipedia wikitables)
│   │   └── wikipedia_house.py    # House poll scraper (Wikipedia wikitables)
│   ├── aggregator/
│   │   └── engine.py             # Weighted polling average computation
│   └── data/
│       └── senate_races_2026.py  # Seed data for 2026 Senate races
│
├── web/                          # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx        # Root layout with metadata
│   │   │   ├── page.tsx          # Main dashboard (OVERVIEW/MAP views, ErrorScreen, ModelConfidence)
│   │   │   └── globals.css       # Tailwind v4 global styles
│   │   ├── components/elections/
│   │   │   ├── SenateRaces.tsx   # Senate race list component
│   │   │   ├── HouseRaces.tsx    # House race grid component
│   │   │   ├── PollingPanel.tsx  # Recent polls table (populated from pollEntries)
│   │   │   ├── NewsFeed.tsx      # Poll activity feed (generated from recentPolls)
│   │   │   ├── LiveTicker.tsx    # Scrolling race ticker
│   │   │   ├── KeyMetricStrip.tsx# Top-level metric cards
│   │   │   ├── SeatMeter.tsx     # Chamber seat balance meter
│   │   │   ├── Charts.tsx        # ProbabilityChart (live) + HistoricalSeatsChart (static)
│   │   │   ├── RaceDetailModal.tsx# Race drill-down modal
│   │   │   ├── TerminalClock.tsx # Live clock display
│   │   │   ├── USAMap.tsx        # Interactive choropleth map (Map view)
│   │   │   └── StateDetailView.tsx# State drill-down: history, demographics, fundraising
│   │   └── lib/
│   │       ├── electionData.ts   # Types, API helpers, data transformations, static lookups
│   │       │                     #   Exports: transformSenateRace, transformHouseRace,
│   │       │                     #            transformRecentPoll, transformRecentPollToPollEntry,
│   │       │                     #            generateTickerItems, generateNewsItems,
│   │       │                     #            computeSeatBalance, STATE_NAMES,
│   │       │                     #            FUNDRAISING_2026, TURNOUT_2022
│   │       ├── ElectionDataContext.tsx # React Context provider — holds all global election state
│   │       └── utils.ts          # Tailwind merge utility
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   └── postcss.config.mjs
│
├── docs/
│   └── todo.md                   # Multi-agent coordination log (all 16 issues resolved)
├── requirements.txt              # Python dependencies
├── .env.example                  # Environment variable template
└── .gitignore
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DB_PATH` | `polls.db` | Path to the SQLite database file |
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000/api/v1` | Backend API base URL for the frontend |

---

## Tech Stack

**Backend**: Python 3.9+ · FastAPI · SQLAlchemy (async) · aiosqlite · httpx · BeautifulSoup · APScheduler · pandas

**Frontend**: Next.js 15 · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · Recharts · Lucide Icons

---

## Data Sources

| Data | Source | Update Frequency |
|---|---|---|
| Senate / House polls | Wikipedia wikitables | Every 4 hours (background scheduler) |
| Cook Political ratings | Seeded at startup | Manual update via seed data |
| Fundraising estimates | FEC Q4-2025 filings (static) | Manual update |
| Voter turnout | U.S. Elections Project 2022 | Static (per-cycle) |
| Historical seat counts | CRS / Wikipedia (2016–2024) | Static |
| State election history | Official state results (18 states) | Static |

---

## Notes

- **Admin endpoints** (`/api/v1/admin/*`) have no authentication. In production, restrict access or add auth middleware.
- **CORS** is currently set to `allow_origins=["*"]`. Restrict to your frontend domain in production.
- **County breakdowns and demographics** for non-competitive states are lean-derived approximations, not real precinct data. Use caution if displaying these as authoritative.
- **Race called status** requires manual operator action via the PATCH endpoint — there is no AP wire integration.
- Data sourced exclusively from Wikipedia. No API keys or paid data subscriptions required.

---

## License

MIT
