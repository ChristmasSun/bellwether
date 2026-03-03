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

## Features

### Data Pipeline

- **Wikipedia scraper** — Parses complex wikitables with multi-row headers (`rowspan`/`colspan`), detects candidate parties from header background colors, and handles both Senate and House race pages.
- **Aggregate filtering** — Automatically excludes poll aggregation sources (270toWin, RealClearPolitics, RaceToTheWH, etc.) so only raw poll data is counted.
- **Cycle enforcement** — Strictly filters to 2026 election data, preventing contamination from prior cycles.
- **Unique poll counting** — Deduplicates polls by pollster name and end date, so a single survey testing multiple matchups counts once.
- **Weighted aggregation engine** — Computes polling averages using recency decay (21-day half-life), sample size weighting, 538-style pollster quality grades, population adjustments (LV/RV/Adults), and house-effect corrections.

### Dashboard

- **Senate tab** — All 33 tracked races with candidate matchups, margins, Cook ratings, and polling sparklines.
- **House tab** — District-level grid of polled House races.
- **Polls tab** — Chronological feed of recent polls with sample sizes and methodology.
- **News tab** — Poll activity feed derived from latest data.
- **Left column** — Seat balance meter, control probability chart, and historical seats bar charts for both chambers.
- **Right column** — Race status overview, most-polled races, poll density by state, data status, and seats at stake.
- **Live ticker** — Scrolling marquee of race margins and movements.
- **Key metric strip** — Toss-up counts, party leads, total polls, and race counts at a glance.
- **Race detail modal** — Click any Senate race for polling trend charts and aggregate breakdowns.

### API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/v1/senate/races` | All 2026 Senate races with metadata |
| `GET /api/v1/senate/races/{state}` | Single race details |
| `GET /api/v1/senate/races/{state}/polls` | Polls for a Senate race |
| `GET /api/v1/senate/races/{state}/aggregate` | Computed aggregate for a race |
| `GET /api/v1/senate/aggregate/all` | All race aggregates |
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

Full interactive docs available at `/docs` (Swagger UI) when the backend is running.

## What's Live vs. Hardcoded

### Live from API (dynamically fetched and computed)

- Senate race list, states, Cook ratings, incumbent info
- Candidate names, polling percentages, margins (from individual race polls)
- House district list, candidates, margins
- Recent polls table and poll activity feed
- Ticker items (generated from live race margins)
- Race status breakdown (Safe D / Toss-Up / Lean R counts from Cook ratings)
- Key metric strip values (toss-ups, leads, poll counts, race counts)
- Most polled races, poll density, data status panels
- Competitive state index tiles
- Race detail modal with polling trend charts

### Hardcoded / Static (in `web/src/lib/electionData.ts`)

- **Projected seat numbers** — `demProjected: 47, repProjected: 53` (Senate) and `215/220` (House) are placeholders matching current composition, not model-driven projections.
- **Control probability chart** — `PROBABILITY_HISTORY` is placeholder data. There is no forecasting model behind it.
- **Historical seat counts** — Real historical data (2016–2024) stored as static constants. These are factual and do not change.

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
1. Initialize the SQLite database (`polls.db`)
2. Seed 2026 Senate race metadata
3. Start the background scheduler (scrapes Wikipedia every 4h, recomputes aggregates every 1h)

To trigger an immediate data refresh:

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

Open [http://localhost:3000](http://localhost:3000). The dashboard will fetch data from the backend at `http://127.0.0.1:8000/api/v1` by default.

To point the frontend at a different API URL, set the environment variable:

```bash
NEXT_PUBLIC_API_URL=https://your-api.example.com/api/v1 npm run dev
```

## Project Structure

```
bellwether/
├── api/                          # FastAPI backend
│   ├── main.py                   # App entry point, lifespan, CORS, router registration
│   ├── models.py                 # SQLAlchemy models (SenateRace, Poll, PollAggregate, etc.)
│   ├── database.py               # Async/sync engine setup, session management
│   ├── scheduler.py              # APScheduler jobs for periodic data refresh
│   ├── routers/
│   │   ├── senate.py             # Senate race endpoints
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
│   │   │   ├── page.tsx          # Main dashboard page
│   │   │   └── globals.css       # Tailwind v4 global styles
│   │   ├── components/elections/
│   │   │   ├── SenateRaces.tsx   # Senate race list component
│   │   │   ├── HouseRaces.tsx    # House race grid component
│   │   │   ├── PollingPanel.tsx  # Recent polls display
│   │   │   ├── NewsFeed.tsx      # Poll activity feed
│   │   │   ├── LiveTicker.tsx    # Scrolling race ticker
│   │   │   ├── KeyMetricStrip.tsx# Top-level metric cards
│   │   │   ├── SeatMeter.tsx     # Chamber seat balance meter
│   │   │   ├── Charts.tsx        # Recharts-based charts
│   │   │   ├── RaceDetailModal.tsx# Race drill-down modal
│   │   │   └── TerminalClock.tsx # Live clock display
│   │   └── lib/
│   │       ├── electionData.ts   # Types, API helpers, data transformations
│   │       ├── ElectionDataContext.tsx # React Context provider for global data
│   │       └── utils.ts          # Tailwind merge utility
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   └── postcss.config.mjs
│
├── requirements.txt              # Python dependencies
├── .env.example                  # Environment variable template
└── .gitignore
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DB_PATH` | `polls.db` | Path to the SQLite database file |
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000/api/v1` | Backend API base URL for the frontend |

## Tech Stack

**Backend**: Python 3.9+ · FastAPI · SQLAlchemy (async) · aiosqlite · httpx · BeautifulSoup · APScheduler · pandas

**Frontend**: Next.js 15 · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · Recharts · Lucide Icons

## Notes

- **Admin endpoints** (`/api/v1/admin/*`) have no authentication. In production, restrict access or add auth middleware.
- **CORS** is currently set to `allow_origins=["*"]`. Restrict to your frontend domain in production.
- Data sourced exclusively from Wikipedia. No API keys or paid data subscriptions required.

## License

MIT
