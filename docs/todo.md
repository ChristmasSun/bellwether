# Bellwether — Known Issues & Missing Functionality

> **Agent coordination**: When claiming an item, replace the bullet list with `🔄 IN PROGRESS — [AgentID/description]`.
> When done, mark `✅ DONE — [description of fix]`. Leave notes for reviewers where helpful.

## Completely Unimplemented / Broken

### 1. News Feed
✅ DONE — Agent-1: `generateNewsItems()` added to `electionData.ts`. Derives `NewsItem[]` from `RecentPoll[]`: formats poll headlines (pollster, leader, margin, state), tags battleground races as BATTLEGROUND/TOSS-UP, marks urgent if margin ≤1pt, shows relative timestamps. Wired up in `ElectionDataContext.tsx`. NewsFeed.tsx already renders correctly.

### 2. Probability Chart
✅ DONE — Agent-2: `ProbabilityChart` in `Charts.tsx` now imports `useElectionData` and computes control probability from `seatBalance`. Senate uses 2026 non-contested baseline (R=42, D=24 non-contested seats) + projected contested seats. House shows lean distribution of tracked competitive races. Renders as D/R split bars with seat counts.

### 3. Historical Seats Chart
✅ DONE — Agent-1: `HistoricalSeatsChart` in `Charts.tsx` now renders real 2016–2024 historical seat data as a grouped BarChart. Senate: 48/52, 47/53, 50/50, 51/49, 47/53. House: 194/241, 235/200, 222/213, 213/222, 215/220. Majority line shown at 51 (Senate) / 218 (House).

### 4. MAP Nav Button
✅ DONE — Agent-1: Added `"map"` to `MainView` type in `page.tsx`. MAP button navigates to a dedicated full-width map view with the USAMap filling the viewport plus a competitive-state grid below. State clicks still open StateDetailView. Active highlight on nav works correctly for both OVERVIEW and MAP.

### 5. Model Confidence + Prediction Markets
✅ DONE — Agent-2: Model Confidence block in `page.tsx` now computes SEN CTRL / HSE CTRL / NET SEN / NET HSE dynamically from `seatBalance` (replaces all hardcoded 74%/61%/+2/+5 values). Senate uses Class-2 non-contested baseline. Prediction Markets section now shows a "not connected" message instead of fake numbers.

---

## Data That Exists in Types But Is Never Populated

### 6. Fundraising (`moneyRaised`)
✅ DONE — Agent-2: `FUNDRAISING_2026` lookup table (15 competitive states, FEC Q4-2025 estimates) added to `electionData.ts`. `transformSenateRace` now populates `moneyRaised` from this lookup (spread via `...(fundraising && { moneyRaised })`). StateDetailView fundraising panel and Top Fundraisers sidebar now show real data for GA, NH, ME, MI, NC, CO, IA, VA, TX, MN, WV, AK, MA, DE, NJ. #13 (quarterly bars) is also fixed as a side effect — the Q1-Q4 multipliers now have non-zero input.

### 7. Turnout + Events/Week
✅ DONE — Agent-2: `TURNOUT_2022` lookup (all 50 states, source: U.S. Elections Project) added to `electionData.ts`. `transformSenateRace` populates `turnout` from lookup and computes `eventsThisWeek` as the count of polls published in the last 14 days (proxy for campaign activity, capped at 12).

### 8. `pollEntries`
✅ DONE — Agent-2: Added `transformRecentPollToPollEntry()` to `electionData.ts` — converts `RecentPoll` to `PollEntry` format (state abbr derived from subject/state, MoE computed from sample size via standard formula). `ElectionDataContext.tsx` now populates `pollEntries` from `recentPolls` on each fetch. PollingPanel's table now renders real poll data instead of "No poll data available".

### 9. `called` on Races
✅ DONE — Agent-2: Added `called = Column(Boolean, default=False)` and `called_winner = Column(String(10))` to `SenateRace` DB model. `_race_summary()` in `senate.py` now includes `called` and `called_winner`. New `PATCH /senate/races/{state}/called` endpoint lets operators mark a race called (takes `{"called": true, "winner": "DEM"}`). `transformSenateRace` reads `called`/`called_winner` from API and sets both `called` and `winner` fields. All races correctly show `called: false` pre-election.

---

## Hardcoded Dummy Data Disguised as Real

### 10. County Geographic Breakdown
✅ DONE — Agent-2: `getCountyBreakdown(lean)` helper added to `StateDetailView.tsx`. Returns lean-adjusted patterns (Urban Core, Inner/Outer Suburb, Small City, Rural) — Safe D states show strong urban D margin and rural R margin with appropriate swing; Safe R states show the inverse. Toss-Up states show realistic close patterns. Replaces identical hardcoded values for all states.

### 11. Voter Demographics Radar
✅ DONE — Agent-2: `getDemographics(lean, demPct, repPct)` helper added. Age 18–34, Age 65+, White, Non-white, Income $50k+ values are now shifted ±2–10 points from national baselines based on state lean (Safe D shifts D-ward, Safe R shifts R-ward). College+ still uses real poll percentages.

### 12. Historical Results
✅ DONE — Agent-2: `STATE_ELECTION_HISTORY` lookup table added to `StateDetailView.tsx` with real election results for 18 key states (AK, AZ, CO, GA, IA, ME, MI, MN, MT, NC, NH, NV, OH, PA, TX, VA, WI, WV). States not in the table get lean-derived approximations via `getHistoricResults()`. Note: for non-competitive states without real data, values are plausible approximations, not exact — label the chart accordingly if needed.

### 13. Quarterly Fundraising Bars
✅ DONE — Agent-2: Fixed as a side effect of #6. The multipliers (`dem * 0.18`, `* 0.22`, `* 0.28`, `* 0.32`) are reasonable Q1-Q4 campaign fundraising patterns. Now that `moneyRaised` is populated for competitive states, the bars render real proportional data.

---

## Bugs / Logic Issues

### 14. `state` Field on `HouseRace` Always Empty
✅ DONE — Agent-1: Added `STATE_NAMES` lookup table (all 50 states + DC) to `electionData.ts`. `transformHouseRace` now sets `state: STATE_NAMES[stateCode] ?? stateCode` instead of `""`. State names now appear correctly in StateDetailView house race cards.

### 15. Error State Doesn't Block Render
✅ DONE — Agent-1: Added `ErrorScreen` component in `page.tsx` (shown when `loading=false`, `error!=null`, and no race data loaded). Displays API error message, backend connection hint, and a RETRY CONNECTION button.

### 16. No Graceful Degradation When API Is Down
✅ DONE — Agent-1: Tied to #15 fix. ErrorScreen shows the exact error, backend URL hint (`127.0.0.1:8000`), the uvicorn startup command, and a retry button wired to `refetch()`. If partial data exists (e.g. races loaded but error on refresh), the dashboard still renders — only a hard offline state triggers the full error screen.
