# Bellwether

A polling aggregator for 2026 US Senate and House elections. Scrapes poll data from Wikipedia, computes weighted averages with pollster quality, recency, house effect, and completeness adjustments, and presents it in an editorial-style dashboard.

## Architecture

```
┌─────────────────────────────┐      ┌──────────────────────────────┐
│  Next.js Frontend (web/)    │◄────►│  FastAPI Backend (api/)      │
│  React 19 · Tailwind v4     │ REST │  JSON file cache · httpx     │
│  Recharts · Inter + Serif   │      │  BeautifulSoup · FEC API     │
└─────────────────────────────┘      └──────────────────────────────┘
```

**Backend** — Lightweight FastAPI server that scrapes Wikipedia for poll tables and fetches fundraising data from the FEC API. Data is cached as JSON files on disk and refreshed automatically (polls every 4 hours, FEC daily). No database required.

**Frontend** — Next.js 15 app with an editorial design (Instrument Serif, Inter, Geist Mono). Dashboard shows projected seat balance with interactive USA map, battleground races with sortable columns, and individual race detail pages with polling charts, fundraising, and election history.

---

## Features

### Data Pipeline

- **Wikipedia scraper** — Parses wikitables with multi-row headers, detects candidate parties from header colors and a 340+ candidate registry, and handles Senate, House, and special election race pages.
- **35 races tracked** — 33 Class II seats + 2 special elections (Ohio: Vance vacancy, Florida: Rubio vacancy). All verified from Ballotpedia.
- **Matchup grouping** — Groups polls by specific candidate matchup (e.g. Mills vs Collins, Platner vs Collins). Pre-primary states show the most-polled hypothetical matchup by default, with a switcher to view alternatives (≥5 polls threshold).
- **Weighted polling average** — Four-factor weighting:
  - **Pollster grade** (VoteHub scores): A+ = 5x, A = 4x, B = 3x, C = 2x, D = 1x, unrated = 2x
  - **Recency decay**: exponential half-life of 30 days
  - **House effect correction**: adjusts each poll to remove known partisan bias (from VoteHub metrics)
  - **Completeness**: polls with high undecided % get downweighted (D% + R% / 100)
- **FEC fundraising** — Real fundraising totals from the FEC API, cached daily. Updates per-matchup when switching candidates.
- **Margin-based ratings** — Race ratings derived from polling margins, not external Cook ratings:
  - D/R +10: Safe, +6–10: Likely, +2.5–6: Lean, ±2.5: Toss-Up
- **Toss-up projection** — Toss-up races are assigned to whoever is actually leading in the margin, not split 50/50.
- **Battleground detection** — Races within ±5 points with actual polling data are flagged as battlegrounds.
- **Primary results config** — `PRIMARY_RESULTS` constant to lock in confirmed nominees so the correct matchup is shown by default.
- **Independent candidate support** — Candidates like Dan Osborn (NE) are tagged as Dem-aligned in data but displayed with independent purple styling and "Running as Independent" label.

### Dashboard

- **Projected Senate Balance** — Big serif numbers showing projected D vs R seats based on polling margins, with a projection bar.
- **Interactive USA map** — States with Senate races colored by projected lean (Safe D deep blue → Toss-Up gold → Safe R deep red). Clickable to navigate to race detail. States without races are neutral gray.
- **Senate Composition bar** — Visual breakdown of all 100 seats showing safe vs up-for-reelection by party.
- **Battleground / All Races toggle** — Click the header to switch between battleground-only and all 35 races. All Races mode defaults to alphabetical.
- **Sortable columns** — '24 Pres (swing states first), Trend (most movement first), # Polls (most polled first), and Margin (closest first, in All Races mode). Active sort shows ↓ indicator.
- **Polling trend** — Compares the average margin of the last 3 polls to the prior 3. Shows directional shift with colored arrow.
- **2024 Presidential baseline** — Shows how each state voted in 2024 (verified from Ballotpedia), so you can see over/underperformance.
- **Margin badges** — Solid colored pills (blue/red/gold) for at-a-glance margin visibility.
- **Latest polls sidebar** — Up to 10 recent D vs R polls with pollster, candidates, and sample info. Clickable to navigate to that state's detail page. Filters out primary-only and generic polls.
- **House tab** — Competitive House districts with the same table format.

### Race Detail Page

- **Matchup switcher** — If multiple candidate matchups have 5+ polls, buttons let you switch between them. All data (chart, polls, fundraising, rating) updates.
- **Candidate matchup** — Big serif numbers for D vs R with candidate names. "Incumbent U.S. Senator" label only shown when the displayed candidate actually IS the incumbent (not for open seats).
- **Polling aggregate bar** — Visual D/R share with margin label.
- **Polling trend chart** — Recharts line chart showing D vs R over time.
- **Race details** — Rating, seat class, incumbent, polls for this matchup, latest poll date.
- **Fundraising** — Side-by-side FEC fundraising cards with share bar. Real FEC API data, updates per-matchup. Shows "—" when no FEC filing exists.
- **Recent polls table** — Grade badge (VoteHub, color-coded), pollster name, date (with year suffix for 2025 polls), sample size, population (LV/RV), D%, R%, margin.
- **VoteHub pollster grades** — Full metrics imported: grade, house effect, percent error, relative error, herding error, within-MOE percentage.
- **Recent statewide results** — Cards showing verified Ballotpedia results (2024 Pres for all 35 states, plus 2022/2024 Senate/Gov for competitive states).
- **Methodology footer** — Credits Wikipedia, VoteHub, and FEC with last updated timestamp.

### Constants

All tunable values are centralized in two files:

**Frontend** (`web/src/lib/constants.ts`):
- Senate seat baselines (SEN_D_BASE, SEN_R_BASE)
- Battleground margin threshold (±5)
- Matchup minimum polls (5)
- Recency half-life (30 days)
- Grade weights (A+=5 ... D=1)
- Rating thresholds (Safe/Likely/Lean/Toss-Up cutoffs)
- Trend parameters (min shift, min polls, window size)
- Independent candidates config

**Backend** (`api/constants.py`):
- Poll refresh interval (4 hours)
- FEC refresh interval (24 hours)

---

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- FEC API key (free at https://api.open.fec.gov/developers/)

### Backend

```bash
# Set up environment
cp .env.example .env
# Edit .env and add your FEC_API_KEY

# Install and run
pip install -r requirements.txt
source .env && export FEC_API_KEY
uvicorn api.main:app --port 8000
```

The server will automatically:
1. Load cached data from `data/` if available
2. Scrape Wikipedia for Senate and House polls if data is missing or stale
3. Fetch FEC fundraising data for all 35 Senate races
4. Start background refresh (polls every 4h, FEC daily)

### Frontend

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To point at a different API:
```bash
NEXT_PUBLIC_API_URL=https://your-api.example.com/api/v1 npm run dev
```

---

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/v1/senate/races` | All 2026 Senate races (33 Class II + 2 specials) |
| `GET /api/v1/senate/races/{state}/polls` | Polls for a Senate race |
| `GET /api/v1/house/races` | All polled House districts |
| `GET /api/v1/house/races/{district}/polls` | Polls for a House district |
| `GET /api/v1/polls/search` | Search recent polls across all races |
| `GET /api/v1/fec/{state}` | FEC fundraising data for a state |
| `GET /api/v1/fec` | All FEC fundraising data |
| `GET /api/v1/status` | Health check + data stats |
| `POST /api/v1/admin/refresh/senate` | Trigger Senate poll scrape |
| `POST /api/v1/admin/refresh/house` | Trigger House poll scrape |
| `POST /api/v1/admin/refresh/fec` | Trigger FEC data refresh |

---

## Project Structure

```
bellwether/
├── api/
│   ├── main.py                   # FastAPI app, JSON caching, all endpoints
│   ├── constants.py              # Backend tunable constants (refresh intervals)
│   ├── scrapers/
│   │   ├── wikipedia.py          # Senate poll scraper (340+ candidate registry)
│   │   └── wikipedia_house.py    # House poll scraper
│   └── data/
│       └── senate_races_2026.py  # Seed data for 35 Senate races (verified Ballotpedia)
│
├── web/src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout (Inter + Instrument Serif + Geist Mono)
│   │   ├── page.tsx              # Dashboard + Race Detail view + USA Map
│   │   └── globals.css           # CSS variables, scrollbar styles, animations
│   ├── components/elections/
│   │   └── USAMap.tsx            # Interactive USA map (react-simple-maps)
│   └── lib/
│       ├── constants.ts          # All frontend tunable constants
│       ├── electionData.ts       # Types, transforms, weighted averages,
│       │                         #   pollster ratings (VoteHub), statewide
│       │                         #   election history (Ballotpedia), primary
│       │                         #   results config, matchup grouping
│       └── ElectionDataContext.tsx# React Context provider
│
├── data/                         # Runtime cache (gitignored)
│   ├── senate_polls.json
│   ├── house_polls.json
│   ├── fec_fundraising.json
│   └── meta.json
│
├── .env                          # API keys (gitignored)
├── .env.example
├── requirements.txt
└── .gitignore
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `FEC_API_KEY` | — | FEC API key for fundraising data |
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000/api/v1` | Backend API URL for the frontend |
| `DATA_DIR` | `data` | Directory for cached JSON data |

---

## Data Sources

| Data | Source | Update | Verified |
|---|---|---|---|
| Senate / House polls | Wikipedia wikitables | Every 4 hours | Auto-scraped |
| Fundraising | FEC API | Daily | Real filings |
| Pollster grades + metrics | VoteHub pollster scorecards | Static (in code) | Yes |
| 2024 Presidential results | Ballotpedia | Static | All 35 states verified |
| Statewide election history | Ballotpedia | Static | 15 competitive states |
| Race metadata / incumbents | Ballotpedia | Manual | All 35 races verified |
| Cook Political ratings | Seed data (fallback only) | Manual | — |

---

## Tech Stack

**Backend**: Python 3.9+ · FastAPI · httpx · BeautifulSoup

**Frontend**: Next.js 15 · React 19 · TypeScript · Tailwind CSS v4 · Recharts · react-simple-maps · Lucide Icons

---

## Security Notes

- **Admin endpoints** (`/api/v1/admin/*`) have no authentication. In production, restrict access via reverse proxy or add auth middleware.
- **CORS** is set to `allow_origins=["*"]`. Restrict to your frontend domain in production.
- **FEC API key** is loaded from environment variables and never exposed to the frontend.
- The `data/` directory and `.env` file are gitignored.

---

## License

MIT
