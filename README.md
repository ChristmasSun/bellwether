# Bellwether

A polling aggregator for 2026 US Senate and House elections. Scrapes poll data from Wikipedia, computes weighted averages with pollster quality and recency adjustments, and presents it in an editorial-style dashboard.

## Architecture

```
┌─────────────────────────────┐      ┌──────────────────────────────┐
│  Next.js Frontend (web/)    │◄────►│  FastAPI Backend (api/)      │
│  React 19 · Tailwind v4     │ REST │  JSON file cache · httpx     │
│  Recharts · Inter + Serif   │      │  BeautifulSoup · FEC API     │
└─────────────────────────────┘      └──────────────────────────────┘
```

**Backend** — Lightweight FastAPI server that scrapes Wikipedia for poll tables and fetches fundraising data from the FEC API. Data is cached as JSON files on disk and refreshed automatically (polls every 4 hours, FEC daily). No database required.

**Frontend** — Next.js 15 app with an editorial design (Instrument Serif, Inter, Geist Mono). Dashboard shows projected seat balance, battleground races with trend and baseline data, and individual race detail pages with polling charts, fundraising, and election history.

---

## Features

### Data Pipeline

- **Wikipedia scraper** — Parses wikitables with multi-row headers, detects candidate parties from header colors and a 340+ candidate registry, and handles both Senate and House race pages.
- **Matchup grouping** — Groups polls by specific candidate matchup (e.g. Mills vs Collins, Platner vs Collins). Pre-primary states show the most-polled hypothetical matchup by default, with a switcher to view alternatives.
- **Weighted polling average** — Three-factor weighting:
  - **Pollster grade** (VoteHub scores): A+ = 5x, A = 4x, B = 3x, C = 2x, D = 1x
  - **Recency decay**: exponential half-life of 30 days
  - **House effect correction**: adjusts each poll to remove known partisan bias
- **FEC fundraising** — Real fundraising totals from the FEC API, cached daily. Updates per-matchup when switching candidates.
- **Margin-based ratings** — Race ratings derived from polling margins, not external Cook ratings:
  - D/R +10: Safe, +6–10: Likely, +2.5–6: Lean, ±2.5: Toss-Up
- **Battleground detection** — Races within ±5 points with actual polling data are flagged as battlegrounds.
- **Primary results config** — `PRIMARY_RESULTS` constant to lock in confirmed nominees so the correct matchup is shown by default.

### Dashboard

- **Projected Senate Balance of Power** — Big serif numbers showing projected D vs R seats, with a projection bar and toss-up count.
- **Senate Composition bar** — Visual breakdown of all 100 seats showing which are safe vs up for reelection.
- **Battleground races table** — Races within ±5 margin, showing rating, candidates, percentages, 2024 presidential baseline, polling trend, poll count, and margin.
- **Polling trend** — Compares the average margin of the last 3 polls to the prior 3. Shows directional shift.
- **2024 Presidential baseline** — Shows how each state voted in 2024, so you can see over/underperformance.
- **Latest polls sidebar** — Recent D vs R polls with pollster, candidates, and sample info. Clickable to navigate to that state's detail page.
- **All States grid** — Color-coded tiles for all 50 states, clickable to view race details.
- **House tab** — Competitive House districts with the same table format.

### Race Detail Page

- **Matchup switcher** — If multiple candidate matchups have 5+ polls, buttons let you switch between them. All data (chart, polls, fundraising, rating) updates.
- **Candidate matchup** — Big serif numbers for D vs R with candidate names and incumbent labels.
- **Polling aggregate bar** — Visual D/R share with margin label.
- **Polling trend chart** — Recharts line chart showing D vs R over time.
- **Race details** — Rating, seat class, incumbent, poll count, latest poll date.
- **Fundraising** — Side-by-side FEC fundraising cards with share bar. Updates per-matchup.
- **Recent polls table** — Pollster grade badge (VoteHub), pollster name, date, sample size, population, D%, R%, margin.
- **Pollster grades** — Color-coded badges (A+/A green, B olive, C gold, D red) from VoteHub's pollster scorecards.
- **Recent statewide results** — 4 cards showing verified results from Ballotpedia (2024 Pres, 2022/2024 Senate/Gov, etc.) for 15 states.
- **Methodology footer** — Credits Wikipedia, VoteHub, and FEC with last updated timestamp.

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
3. Fetch FEC fundraising data for all 32 Senate races
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
| `GET /api/v1/senate/races` | All 2026 Senate races with metadata |
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
│   ├── scrapers/
│   │   ├── wikipedia.py          # Senate poll scraper (340+ candidate registry)
│   │   └── wikipedia_house.py    # House poll scraper
│   └── data/
│       └── senate_races_2026.py  # Seed data for 32 Senate races
│
├── web/src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout (Inter + Instrument Serif + Geist Mono)
│   │   ├── page.tsx              # Dashboard + Race Detail view
│   │   └── globals.css           # CSS variables + scrollbar styles
│   └── lib/
│       ├── electionData.ts       # Types, transforms, weighted averages,
│       │                         #   pollster ratings (VoteHub), statewide
│       │                         #   election history (Ballotpedia), primary
│       │                         #   results config, battleground detection
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

| Data | Source | Update |
|---|---|---|
| Senate / House polls | Wikipedia wikitables | Every 4 hours |
| Fundraising | FEC API | Daily |
| Pollster grades | VoteHub pollster scorecards | Static (in code) |
| Statewide election history | Ballotpedia | Static (verified) |
| Cook Political ratings | Seed data (fallback only) | Manual |
| Race metadata | Seed data | Manual |

---

## Tech Stack

**Backend**: Python 3.9+ · FastAPI · httpx · BeautifulSoup

**Frontend**: Next.js 15 · React 19 · TypeScript · Tailwind CSS v4 · Recharts · Lucide Icons

---

## Security Notes

- **Admin endpoints** (`/api/v1/admin/*`) have no authentication. In production, restrict access via reverse proxy or add auth middleware.
- **CORS** is set to `allow_origins=["*"]`. Restrict to your frontend domain in production.
- **FEC API key** is loaded from environment variables and never exposed to the frontend.
- The `data/` directory and `.env` file are gitignored.

---

## License

MIT
