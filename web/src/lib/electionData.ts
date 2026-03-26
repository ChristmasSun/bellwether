import {
  BATTLEGROUND_MARGIN_THRESHOLD,
  MATCHUP_MIN_POLLS,
  RECENCY_HALF_LIFE_DAYS,
  GRADE_WEIGHTS,
  UNRATED_POLLSTER_WEIGHT,
  RATING_THRESHOLDS,
  PRIMARY_MIN_AVG_PCT,
} from "./constants";

export { BATTLEGROUND_MARGIN_THRESHOLD, MATCHUP_MIN_POLLS } from "./constants";

export type Party = "D" | "R" | "I";

export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

export type Lean =
  | "Safe D"
  | "Likely D"
  | "Lean D"
  | "Toss-Up"
  | "Lean R"
  | "Likely R"
  | "Safe R";

export interface PollSample {
  date: string;
  dem: number;
  rep: number;
  pollster?: string;
  sampleSize?: number;
  population?: string;
  grade?: string | null;
}


/**
 * Confirmed primary winners / nominees. When set, the matchup containing
 * this candidate's last name will be prioritized as the default.
 * Set to null for the party if the primary hasn't happened yet.
 */
export const PRIMARY_RESULTS: Record<string, { dem: string | null; rep: string | null }> = {
  TX: { dem: "Talarico", rep: null },  // Dem primary won by Talarico; Rep runoff Cornyn vs Paxton
  IL: { dem: "Stratton", rep: "Tracy" },
  // Add more as primaries are called:
  // GA: { dem: "Ossoff", rep: null },
};

export interface Matchup {
  demCandidate: string;
  repCandidate: string;
  demPct: number;
  repPct: number;
  margin: number;
  lean: Lean;
  pollingSamples: PollSample[];
  pollCount: number;
  latestPollDate?: string;
}

export interface PrimaryPollSample {
  date: string;
  candidates: { name: string; pct: number }[];
  pollster?: string;
  sampleSize?: number;
  population?: string;
  grade?: string | null;
}

export interface PrimaryMatchup {
  party: "DEM" | "REP";
  candidates: { name: string; pct: number }[];
  pollingSamples: PrimaryPollSample[];
  pollCount: number;
  latestPollDate?: string;
  /** The matchup key, e.g. "Cornyn vs Paxton" */
  label: string;
}

export interface SenateRace {
  state: string;
  stateCode: string;
  incumbent?: Party;
  incumbentName?: string;
  demCandidate: string;
  repCandidate: string;
  demPct: number;
  repPct: number;
  margin: number;
  lean: Lean;
  winner?: Party;
  called: boolean;
  pollingSamples: PollSample[];
  pollCount: number;
  key: boolean;
  moneyRaised?: { dem: number; rep: number };
  fecCandidates?: { name: string; party: string; receipts: number }[];
  turnout?: number;
  eventsThisWeek?: number;
  latestPollDate?: string;
  matchups: Matchup[];
  primaryMatchups?: PrimaryMatchup[];
}

export interface GovernorRace {
  state: string;
  stateCode: string;
  incumbent?: Party;
  incumbentName?: string;
  demCandidate: string;
  repCandidate: string;
  demPct: number;
  repPct: number;
  margin: number;
  lean: Lean;
  winner?: Party;
  called: boolean;
  pollingSamples: PollSample[];
  pollCount: number;
  key: boolean;
  moneyRaised?: { dem: number; rep: number };
  fecCandidates?: { name: string; party: string; receipts: number }[];
  turnout?: number;
  eventsThisWeek?: number;
  latestPollDate?: string;
  matchups: Matchup[];
  primaryMatchups?: PrimaryMatchup[];
}

export interface HouseRace {
  district: string;
  state: string;
  stateCode: string;
  demCandidate: string;
  repCandidate: string;
  demPct: number;
  repPct: number;
  margin: number;
  projectedMargin: number;
  lean: Lean;
  winner?: Party;
  called: boolean;
  incumbent?: Party;
  pollCount: number;
  pollingSamples: PollSample[];
  latestPollDate?: string;
}

// Pollster ratings from VoteHub (https://votehub.com)
// houseEffect: positive = R bias, negative = D bias
// pctError: average percent error
// relError: relative error
// herdingError: herding percentage (higher = more herding)
// withinMOE: percentage of polls within margin of error
export interface PollsterRating {
  grade: string;
  houseEffect: number; // positive = R bias, negative = D bias
  pctError: number;
  relError: number;
  herdingError: number;
  withinMOE: number;
}

export const POLLSTER_RATINGS: Record<string, PollsterRating> = {
  "east carolina university": { grade: "A+", houseEffect: 0.56, pctError: 1.28, relError: 0.72, herdingError: 25.4, withinMOE: 96 },
  "fabrizio-impact": { grade: "A+", houseEffect: 0.02, pctError: 1.97, relError: 0.93, herdingError: 30.1, withinMOE: 100 },
  "marquette law school": { grade: "A+", houseEffect: -0.27, pctError: 1.99, relError: 0.88, herdingError: 29.4, withinMOE: 90 },
  "beacon-shaw": { grade: "A", houseEffect: -0.62, pctError: 2.58, relError: 1.31, herdingError: 30.4, withinMOE: 78 },
  "echelon insights": { grade: "A", houseEffect: -0.57, pctError: 3.07, relError: 1.27, herdingError: 31.9, withinMOE: 84 },
  "hart-pos": { grade: "A", houseEffect: 0.30, pctError: 2.51, relError: 1.27, herdingError: 31.5, withinMOE: 78 },
  "insideradvantage": { grade: "A", houseEffect: 0.62, pctError: 2.74, relError: 1.39, herdingError: 13.4, withinMOE: 79 },
  "marist": { grade: "A", houseEffect: -0.37, pctError: 2.57, relError: 1.34, herdingError: 21.4, withinMOE: 92 },
  "research co.": { grade: "A", houseEffect: -0.18, pctError: 2.37, relError: 1.03, herdingError: 34.1, withinMOE: 87 },
  "siena-nyt": { grade: "A", houseEffect: -0.44, pctError: 2.63, relError: 1.40, herdingError: 13.1, withinMOE: 76 },
  "susquehanna": { grade: "A", houseEffect: 0.54, pctError: 2.75, relError: 1.30, herdingError: 24.0, withinMOE: 83 },
  "atlasintel": { grade: "B", houseEffect: 1.30, pctError: 2.66, relError: 1.43, herdingError: 30.1, withinMOE: 73 },
  "data for progress": { grade: "B", houseEffect: 0.04, pctError: 2.10, relError: 1.40, herdingError: 27.5, withinMOE: 70 },
  "emerson": { grade: "B", houseEffect: 0.29, pctError: 2.81, relError: 1.47, herdingError: 31.5, withinMOE: 73 },
  "fabrizio-gbao": { grade: "B", houseEffect: 0.31, pctError: 2.68, relError: 1.49, herdingError: 32.6, withinMOE: 78 },
  "fabrizio-mclaughlin": { grade: "B", houseEffect: 1.27, pctError: 2.81, relError: 1.44, herdingError: 27.7, withinMOE: 72 },
  "j.l. partners": { grade: "B", houseEffect: 1.34, pctError: 2.63, relError: 1.33, herdingError: 33.6, withinMOE: 78 },
  "onmessage inc.": { grade: "B", houseEffect: 1.35, pctError: 2.94, relError: 1.50, herdingError: 28.7, withinMOE: 73 },
  "quantus insights": { grade: "B", houseEffect: 0.96, pctError: 2.82, relError: 1.44, herdingError: 30.4, withinMOE: 72 },
  "socal strategies": { grade: "B", houseEffect: 0.03, pctError: 2.77, relError: 1.41, herdingError: 29.1, withinMOE: 76 },
  "suffolk": { grade: "B", houseEffect: 0.19, pctError: 3.20, relError: 1.50, herdingError: 11.5, withinMOE: 73 },
  "yougov": { grade: "B", houseEffect: 0.06, pctError: 2.77, relError: 1.49, herdingError: 35.0, withinMOE: 74 },
  "change research": { grade: "C", houseEffect: -1.31, pctError: 3.15, relError: 1.49, herdingError: 37.7, withinMOE: 69 },
  "cnn-ssrs": { grade: "C", houseEffect: 0.11, pctError: 2.98, relError: 1.43, herdingError: 31.4, withinMOE: 69 },
  "florida atlantic university": { grade: "C", houseEffect: 0.14, pctError: 3.14, relError: 1.66, herdingError: 30.1, withinMOE: 65 },
  "harrisx": { grade: "C", houseEffect: -0.52, pctError: 2.76, relError: 1.62, herdingError: 51.9, withinMOE: 65 },
  "harrisx-harris poll": { grade: "C", houseEffect: 0.97, pctError: 2.67, relError: 1.68, herdingError: 58.4, withinMOE: 67 },
  "rmg research": { grade: "C", houseEffect: 0.41, pctError: 2.88, relError: 1.59, herdingError: 32.2, withinMOE: 67 },
  "washington post": { grade: "C", houseEffect: 0.86, pctError: 2.84, relError: 1.47, herdingError: 32.0, withinMOE: 67 },
  "tipp": { grade: "C", houseEffect: -0.24, pctError: 3.20, relError: 1.68, herdingError: 29.4, withinMOE: 68 },
  "bullfinch": { grade: "D", houseEffect: -1.96, pctError: 3.56, relError: 1.76, herdingError: 31.2, withinMOE: 57 },
  "cygnal": { grade: "D", houseEffect: 0.20, pctError: 3.25, relError: 1.65, herdingError: 29.0, withinMOE: 62 },
  "focaldata": { grade: "D", houseEffect: -0.15, pctError: 3.01, relError: 1.93, herdingError: 43.7, withinMOE: 54 },
  "ipsos": { grade: "D", houseEffect: -0.73, pctError: 3.08, relError: 1.89, herdingError: 37.8, withinMOE: 54 },
  "noble predictive insights": { grade: "D", houseEffect: 0.29, pctError: 3.28, relError: 1.63, herdingError: 30.4, withinMOE: 58 },
  "patriot polling": { grade: "D", houseEffect: 1.62, pctError: 2.81, relError: 1.84, herdingError: 33.7, withinMOE: 60 },
  "quinnipiac": { grade: "D", houseEffect: -0.08, pctError: 3.21, relError: 1.95, herdingError: 34.6, withinMOE: 53 },
  "redfield & wilton": { grade: "D", houseEffect: 0.28, pctError: 3.32, relError: 1.81, herdingError: 30.9, withinMOE: 65 },
  "surveyusa": { grade: "D", houseEffect: -2.29, pctError: 4.16, relError: 1.79, herdingError: 33.7, withinMOE: 58 },
  "trafalgar": { grade: "D", houseEffect: 1.38, pctError: 2.84, relError: 1.91, herdingError: 27.0, withinMOE: 60 },
  "umass lowell": { grade: "D", houseEffect: -1.70, pctError: 3.63, relError: 1.77, herdingError: 34.6, withinMOE: 61 },
};

// Aliases for pollster name matching
const POLLSTER_ALIASES: Record<string, string> = {
  "marist college": "marist",
  "research co": "research co.",
  "siena college": "siena-nyt",
  "susquehanna polling": "susquehanna",
  "atlas intel": "atlasintel",
  "emerson college": "emerson",
  "jl partners": "j.l. partners",
  "onmessage": "onmessage inc.",
  "suffolk university": "suffolk",
  "cnn": "cnn-ssrs",
  "florida atlantic university-mainstreet research": "florida atlantic university",
  "fau": "florida atlantic university",
  "harris poll": "harrisx-harris poll",
  "the washington post": "washington post",
  "washington post-george mason university": "washington post",
  "tipp insights": "tipp",
  "bullfinch group": "bullfinch",
  "quinnipiac university": "quinnipiac",
  "redfield & wilton strategies": "redfield & wilton",
  "trafalgar group": "trafalgar",
  "university of massachusetts lowell-yougov": "umass lowell",
};

export function getPollsterRating(pollsterName: string): PollsterRating | null {
  const name = pollsterName.toLowerCase().replace(/\s*\([^)]*\)\s*/g, "").trim();
  // Direct match
  if (POLLSTER_RATINGS[name]) return POLLSTER_RATINGS[name];
  // Alias match
  if (POLLSTER_ALIASES[name] && POLLSTER_RATINGS[POLLSTER_ALIASES[name]]) return POLLSTER_RATINGS[POLLSTER_ALIASES[name]];
  // Substring match
  for (const [key, rating] of Object.entries(POLLSTER_RATINGS)) {
    if (name.includes(key) || key.includes(name)) return rating;
  }
  return null;
}

export function getPollsterGrade(pollsterName: string): string | null {
  return getPollsterRating(pollsterName)?.grade ?? null;
}

export interface RecentPoll {
  id: number;
  pollster: string;
  state?: string;
  subject?: string;
  endDate: string;
  sampleSize?: number;
  population?: string;
  results: { candidate: string; party: string; pct: number }[];
  pollType?: string;
}

export interface NewsItem {
  time: string;
  headline: string;
  tag: string;
  urgent?: boolean;
  source?: string;
  state?: string;
}

export interface PollEntry {
  pollster: string;
  state: string;
  date: string;
  dem: number;
  rep: number;
  moe: number;
  grade: string;
}

// ---------------------------------------------------------------------------
// Static reference data
// ---------------------------------------------------------------------------



// Recent statewide election results for states with 2026 Senate races.
// Format: { label, margin (R positive), topline }
export interface StateElectionResult {
  label: string;
  margin: number; // positive = R win, negative = D win
  topline: string;
}

export const STATE_ELECTION_HISTORY: Record<string, StateElectionResult[]> = {
  // Source: Ballotpedia verified election results
  GA: [
    { label: "2024 PRES", margin: 2.2, topline: "Trump 50.7 — Harris 48.5" },
    { label: "2022 GOV", margin: 7.5, topline: "Kemp 53.4 — Abrams 45.9" },
    { label: "2022 SEN", margin: -2.8, topline: "Walker 48.6 — Warnock 51.4" },
    { label: "2020 PRES", margin: -0.2, topline: "Trump 49.3 — Biden 49.5" },
  ],
  MI: [
    { label: "2024 PRES", margin: 1.4, topline: "Trump 49.7 — Harris 48.3" },
    { label: "2024 SEN", margin: -0.3, topline: "Rogers 48.3 — Slotkin 48.6" },
    { label: "2022 GOV", margin: -10.6, topline: "Dixon 43.9 — Whitmer 54.5" },
    { label: "2020 PRES", margin: -2.8, topline: "Trump 47.8 — Biden 50.6" },
  ],
  MN: [
    { label: "2024 PRES", margin: -4.2, topline: "Trump 46.7 — Harris 50.9" },
    { label: "2024 SEN", margin: -15.7, topline: "White 40.5 — Klobuchar 56.2" },
    { label: "2022 GOV", margin: -7.7, topline: "Jensen 44.6 — Walz 52.3" },
    { label: "2020 PRES", margin: -7.1, topline: "Trump 45.3 — Biden 52.4" },
  ],
  NH: [
    { label: "2024 PRES", margin: -2.8, topline: "Trump 47.9 — Harris 50.7" },
    { label: "2022 SEN", margin: -9.1, topline: "Bolduc 44.4 — Hassan 53.5" },
    { label: "2022 GOV", margin: 15.5, topline: "Sununu 57.0 — Sherman 41.5" },
    { label: "2020 PRES", margin: -7.3, topline: "Trump 45.4 — Biden 52.7" },
  ],
  ME: [
    { label: "2024 PRES", margin: -6.9, topline: "Trump 45.5 — Harris 52.4" },
    { label: "2024 SEN", margin: -17.3, topline: "Kouzounas 34.4 — King 51.7" },
    { label: "2022 GOV", margin: -13.3, topline: "LePage 42.4 — Mills 55.7" },
    { label: "2020 SEN", margin: 8.6, topline: "Collins 51.0 — Gideon 42.4" },
  ],
  NC: [
    { label: "2024 PRES", margin: 3.3, topline: "Trump 50.9 — Harris 47.6" },
    { label: "2024 GOV", margin: -14.8, topline: "Robinson 40.1 — Stein 54.9" },
    { label: "2022 SEN", margin: 3.2, topline: "Budd 50.5 — Beasley 47.3" },
    { label: "2020 PRES", margin: 1.3, topline: "Trump 49.9 — Biden 48.6" },
  ],
  TX: [
    { label: "2024 PRES", margin: 13.6, topline: "Trump 56.1 — Harris 42.5" },
    { label: "2024 SEN", margin: 8.5, topline: "Cruz 53.1 — Allred 44.6" },
    { label: "2022 GOV", margin: 10.9, topline: "Abbott 54.8 — O'Rourke 43.9" },
    { label: "2020 PRES", margin: 5.6, topline: "Trump 52.1 — Biden 46.5" },
  ],
  IA: [
    { label: "2024 PRES", margin: 13.2, topline: "Trump 55.7 — Harris 42.5" },
    { label: "2022 SEN", margin: 12.2, topline: "Grassley 56.0 — Franken 43.8" },
    { label: "2022 GOV", margin: 18.5, topline: "Reynolds 58.0 — DeJear 39.5" },
    { label: "2020 PRES", margin: 8.2, topline: "Trump 53.1 — Biden 44.9" },
  ],
  CO: [
    { label: "2024 PRES", margin: -11.0, topline: "Trump 43.1 — Harris 54.1" },
    { label: "2022 SEN", margin: -14.6, topline: "O'Dea 41.3 — Bennet 55.9" },
    { label: "2022 GOV", margin: -19.3, topline: "Ganahl 39.2 — Polis 58.5" },
    { label: "2020 PRES", margin: -13.5, topline: "Trump 41.9 — Biden 55.4" },
  ],
  AK: [
    { label: "2024 PRES", margin: 13.1, topline: "Trump 54.5 — Harris 41.4" },
    { label: "2022 GOV", margin: 26.1, topline: "Dunleavy 50.3 — Gara 24.2" },
    { label: "2020 SEN", margin: 12.7, topline: "Sullivan 53.9 — Gross 41.2" },
    { label: "2020 PRES", margin: 10.0, topline: "Trump 52.8 — Biden 42.8" },
  ],
  MA: [
    { label: "2024 PRES", margin: -25.2, topline: "Trump 36.0 — Harris 61.2" },
    { label: "2024 SEN", margin: -19.8, topline: "Deaton 40.0 — Warren 59.8" },
    { label: "2022 GOV", margin: -29.1, topline: "Diehl 34.6 — Healey 63.7" },
    { label: "2020 PRES", margin: -33.5, topline: "Trump 32.1 — Biden 65.6" },
  ],
  VA: [
    { label: "2024 PRES", margin: -5.7, topline: "Trump 46.1 — Harris 51.8" },
    { label: "2024 SEN", margin: -9.0, topline: "Cao 45.4 — Kaine 54.4" },
    { label: "2021 GOV", margin: 2.0, topline: "Youngkin 50.6 — McAuliffe 48.6" },
    { label: "2020 PRES", margin: -10.1, topline: "Trump 44.0 — Biden 54.1" },
  ],
  SC: [
    { label: "2024 PRES", margin: 17.8, topline: "Trump 58.2 — Harris 40.4" },
    { label: "2022 SEN", margin: 25.9, topline: "Scott 62.9 — Matthews 37.0" },
    { label: "2022 GOV", margin: 17.3, topline: "McMaster 58.0 — Cunningham 40.7" },
    { label: "2020 PRES", margin: 11.7, topline: "Trump 55.1 — Biden 43.4" },
  ],
  KY: [
    { label: "2024 PRES", margin: 30.6, topline: "Trump 64.5 — Harris 33.9" },
    { label: "2023 GOV", margin: -5.0, topline: "Cameron 47.5 — Beshear 52.5" },
    { label: "2022 SEN", margin: 23.6, topline: "Paul 61.8 — Booker 38.2" },
    { label: "2020 PRES", margin: 25.9, topline: "Trump 62.1 — Biden 36.2" },
  ],
  MT: [
    { label: "2024 PRES", margin: 19.9, topline: "Trump 58.4 — Harris 38.5" },
    { label: "2024 SEN", margin: 7.1, topline: "Sheehy 52.6 — Tester 45.5" },
    { label: "2024 GOV", margin: 20.3, topline: "Gianforte 58.9 — Busse 38.6" },
    { label: "2020 PRES", margin: 16.4, topline: "Trump 56.9 — Biden 40.5" },
  ],
  // States with 2024 presidential data only — verified from Ballotpedia
  AR: [
    { label: "2024 PRES", margin: 30.6, topline: "Trump 64.2 — Harris 33.6" },
  ],
  DE: [
    { label: "2024 PRES", margin: -14.7, topline: "Trump 41.8 — Harris 56.5" },
  ],
  ID: [
    { label: "2024 PRES", margin: 36.5, topline: "Trump 66.9 — Harris 30.4" },
  ],
  IL: [
    { label: "2024 PRES", margin: -10.9, topline: "Trump 43.5 — Harris 54.4" },
  ],
  KS: [
    { label: "2024 PRES", margin: 16.2, topline: "Trump 57.2 — Harris 41.0" },
  ],
  LA: [
    { label: "2024 PRES", margin: 22.0, topline: "Trump 60.2 — Harris 38.2" },
  ],
  MD: [
    { label: "2024 PRES", margin: -28.5, topline: "Trump 34.1 — Harris 62.6" },
  ],
  MS: [
    { label: "2024 PRES", margin: 22.9, topline: "Trump 60.9 — Harris 38.0" },
  ],
  NE: [
    { label: "2024 PRES", margin: 20.4, topline: "Trump 59.3 — Harris 38.9" },
  ],
  NJ: [
    { label: "2024 PRES", margin: -5.9, topline: "Trump 46.1 — Harris 52.0" },
  ],
  NM: [
    { label: "2024 PRES", margin: -6.0, topline: "Trump 45.9 — Harris 51.9" },
  ],
  OK: [
    { label: "2024 PRES", margin: 34.3, topline: "Trump 66.2 — Harris 31.9" },
  ],
  OR: [
    { label: "2024 PRES", margin: -14.3, topline: "Trump 41.0 — Harris 55.3" },
  ],
  RI: [
    { label: "2024 PRES", margin: -13.7, topline: "Trump 41.8 — Harris 55.5" },
  ],
  SD: [
    { label: "2024 PRES", margin: 29.2, topline: "Trump 63.4 — Harris 34.2" },
  ],
  WV: [
    { label: "2024 PRES", margin: 41.9, topline: "Trump 70.0 — Harris 28.1" },
  ],
  WY: [
    { label: "2024 PRES", margin: 45.8, topline: "Trump 71.6 — Harris 25.8" },
  ],
  AL: [
    { label: "2024 PRES", margin: 30.5, topline: "Trump 64.6 — Harris 34.1" },
  ],
  TN: [
    { label: "2024 PRES", margin: 29.7, topline: "Trump 64.2 — Harris 34.5" },
  ],
  OH: [
    { label: "2024 PRES", margin: 11.2, topline: "Trump 55.1 — Harris 43.9" },
    { label: "2024 SEN", margin: 6.3, topline: "Moreno 50.2 — Brown 43.9" },
  ],
  FL: [
    { label: "2024 PRES", margin: 13.1, topline: "Trump 56.1 — Harris 43.0" },
    { label: "2024 SEN", margin: 12.5, topline: "Scott 55.8 — Mucarsel-Powell 43.3" },
  ],
};

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Transform helpers
// ---------------------------------------------------------------------------

export function inferParty(result: { candidate?: string; party?: string }): string {
  const existing = (result.party ?? "").toUpperCase();
  if (existing && existing !== "UNK") return existing;
  const c = result.candidate ?? "";
  if (/\((?:D|DEM|DFL)\)/i.test(c) || /\bDemocrat\b/i.test(c)) return "DEM";
  if (/\((?:R|REP|GOP)\)/i.test(c) || /\bRepublican\b/i.test(c)) return "REP";
  if (/\((?:I|IND)\)/i.test(c) || /\bIndependent\b/i.test(c)) return "IND";
  if (/\bgeneric\s+democrat\b/i.test(c)) return "DEM";
  if (/\bgeneric\s+republican\b/i.test(c)) return "REP";
  return "UNK";
}

function lastName(full: string): string {
  const cleaned = full.replace(/\s*\(.*?\)\s*/g, "").trim();
  const parts = cleaned.split(/\s+/);
  return parts[parts.length - 1] || cleaned;
}

/** Derive a rating from the polling margin (D − R). */
export function marginToLean(margin: number): Lean {
  const { safe, likely, lean } = RATING_THRESHOLDS;
  if (margin > safe) return "Safe D";
  if (margin > likely) return "Likely D";
  if (margin > lean) return "Lean D";
  if (margin >= -lean) return "Toss-Up";
  if (margin >= -likely) return "Lean R";
  if (margin >= -safe) return "Likely R";
  return "Safe R";
}

/** Fallback: derive lean from Cook rating string (used when no polls exist). */
export function cookToLean(cook: string | null | undefined): Lean {
  if (!cook) return "Toss-Up";
  const lower = cook.toLowerCase().replace(/[-–]/g, " ").trim();
  if (/(?:safe|solid)\s*d/.test(lower)) return "Safe D";
  if (/likely\s*d/.test(lower)) return "Likely D";
  if (/lean\s*d/.test(lower)) return "Lean D";
  if (/toss/.test(lower)) return "Toss-Up";
  if (/lean\s*r/.test(lower)) return "Lean R";
  if (/likely\s*r/.test(lower)) return "Likely R";
  if (/(?:safe|solid)\s*r/.test(lower)) return "Safe R";
  return "Toss-Up";
}

/** Convert a Cook rating to an approximate D-positive margin (midpoint of the threshold band). */
export function cookToMargin(cook: string | null | undefined): number {
  const lean = cookToLean(cook);
  // Midpoints of RATING_THRESHOLDS bands: Safe >10 → 15, Likely 6-10 → 8, Lean 2.5-6 → 4.25, Toss-Up → 0
  const margins: Record<string, number> = {
    "Safe D": 15, "Likely D": 8, "Lean D": 4.25, "Toss-Up": 0,
    "Lean R": -4.25, "Likely R": -8, "Safe R": -15,
  };
  return margins[lean] ?? 0;
}

function partyToIncumbent(p: string | null | undefined): Party | undefined {
  if (!p) return undefined;
  const u = p.toUpperCase();
  if (u === "DEM" || u === "D") return "D";
  if (u === "REP" || u === "R") return "R";
  if (u === "IND" || u === "I") return "I";
  return undefined;
}


function isBattleground(margin: number, hasPolls: boolean): boolean {
  return hasPolls && Math.abs(margin) <= BATTLEGROUND_MARGIN_THRESHOLD;
}

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

interface ApiRace {
  state: string;
  state_abbr: string;
  cycle?: number;
  incumbent?: string;
  incumbent_party?: string;
  is_open: boolean;
  cook_rating?: string;
  called?: boolean;
  called_winner?: string | null;
}

interface ApiPollResult {
  candidate: string;
  party?: string;
  pct: number;
}

interface ApiPoll {
  id: number;
  pollster: string;
  end_date: string;
  start_date?: string;
  sample_size?: number;
  population?: string;
  results: ApiPollResult[];
  source?: string;
  poll_type?: string;
  subject?: string;
}

interface ApiHouseDistrict {
  district: string;
  subject: string;
  poll_count: number;
  latest_poll?: string;
}

// ---------------------------------------------------------------------------
// Transformers
// ---------------------------------------------------------------------------

export function transformSenateRace(
  race: ApiRace,
  polls: ApiPoll[],
  uniqueCount: number,
  fecCandidates?: any[],
  weightedAggregates?: Record<string, { results: { candidate: string; party: string; pct: number }[]; polls_included: number }>,
): SenateRace {
  // lean will be set from polling margin below; Cook is fallback only

  let demCandidate = "TBD";
  let repCandidate = "TBD";
  let demPct = 0;
  let repPct = 0;

  // Filter to polls with both a DEM and REP candidate (but not jungle primaries)
  const generalPolls = polls.filter((p) => {
    const partyCount: Record<string, number> = {};
    for (const r of p.results) {
      const party = inferParty(r);
      partyCount[party] = (partyCount[party] || 0) + 1;
    }
    // Must have both parties
    if (!partyCount["DEM"] || !partyCount["REP"]) return false;
    // Exclude jungle primaries: if either party has 3+ candidates, it's a primary field, not a GE matchup
    if ((partyCount["DEM"] || 0) >= 3 || (partyCount["REP"] || 0) >= 3) return false;
    return true;
  });

  // Group polls by matchup (DEM last name vs REP last name)
  const matchupGroups: Record<string, typeof generalPolls> = {};
  for (const p of generalPolls) {
    const d = p.results.find((r) => inferParty(r) === "DEM");
    const r = p.results.find((r2) => inferParty(r2) === "REP");
    if (d && r) {
      const key = `${lastName(d.candidate)}__${lastName(r.candidate)}`;
      if (!matchupGroups[key]) matchupGroups[key] = [];
      matchupGroups[key].push(p);
    }
  }

  function recencyWeight(endDate: string | undefined): number {
    if (!endDate) return 0.5;
    const daysAgo = (Date.now() - new Date(endDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo < 0) return 1;
    return Math.pow(0.5, daysAgo / RECENCY_HALF_LIFE_DAYS);
  }

  function pollWeight(pollster: string, endDate?: string, completeness?: number): number {
    const rating = getPollsterRating(pollster);
    const gradeW = rating ? (GRADE_WEIGHTS[rating.grade] ?? UNRATED_POLLSTER_WEIGHT) : UNRATED_POLLSTER_WEIGHT;
    // Completeness: D% + R% / 100. A poll with 48-24 (72% total) gets 0.72x weight.
    const completenessW = completeness != null ? Math.min(completeness / 100, 1) : 1;
    return gradeW * recencyWeight(endDate) * completenessW;
  }

  // Build Matchup objects for all groups with enough polls
  function buildMatchup(group: typeof generalPolls): Matchup {
    const first = group[0];
    const dFirst = first.results.find((r) => inferParty(r) === "DEM");
    const rFirst = first.results.find((r2) => inferParty(r2) === "REP");

    let dPct = dFirst?.pct ?? 0;
    let rPct = rFirst?.pct ?? 0;

    // Weighted average: grade weight × recency decay × house effect adjustment
    // Applies even with 1 poll (for house effect correction)
    let dWeightedSum = 0, rWeightedSum = 0, totalWeight = 0;
    for (const p of group) {
      const d = p.results.find((r) => inferParty(r) === "DEM");
      const r = p.results.find((r2) => inferParty(r2) === "REP");
      if (d && r) {
        const completeness = d.pct + r.pct;
        const w = pollWeight(p.pollster, p.end_date, completeness);
        const rating = getPollsterRating(p.pollster);
        // Adjust for house effect: positive = R bias, so shift toward D
        const houseAdj = rating?.houseEffect ?? 0;
        dWeightedSum += (d.pct + houseAdj / 2) * w;
        rWeightedSum += (r.pct - houseAdj / 2) * w;
        totalWeight += w;
      }
    }
    if (totalWeight > 0) {
      dPct = Math.round((dWeightedSum / totalWeight) * 10) / 10;
      rPct = Math.round((rWeightedSum / totalWeight) * 10) / 10;
    }

    const margin = Math.round((dPct - rPct) * 10) / 10;

    const samples: PollSample[] = group
      .filter((p) => p.end_date)
      .reverse()
      .map((p) => {
        const d = p.results.find((r) => inferParty(r) === "DEM");
        const r = p.results.find((r2) => inferParty(r2) === "REP");
        return {
          date: (() => {
            const d = new Date(p.end_date);
            const base = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return d.getFullYear() < new Date().getFullYear() ? base + " (" + d.getFullYear() + ")" : base;
          })(),
          dem: d?.pct ?? 0,
          rep: r?.pct ?? 0,
          pollster: p.pollster,
          sampleSize: p.sample_size,
          population: p.population?.toUpperCase(),
          grade: p.pollster ? getPollsterGrade(p.pollster) : null,
        };
      });

    return {
      demCandidate: lastName(dFirst?.candidate ?? "TBD"),
      repCandidate: lastName(rFirst?.candidate ?? "TBD"),
      demPct: dPct,
      repPct: rPct,
      margin,
      lean: (dPct > 0 && rPct > 0) ? marginToLean(dPct - rPct) : cookToLean(race.cook_rating),
      pollingSamples: samples,
      pollCount: group.length,
      latestPollDate: group[0]?.end_date
        ? new Date(group[0].end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : undefined,
    };
  }

  // Compute primary leaders (if primary polling exists) for tiebreaking
  const primaryLeader: Record<string, string> = {}; // party → leading candidate last name
  {
    const pPolls = polls.filter((p) => {
      if (p.end_date && new Date(p.end_date).getFullYear() < 2026) return false;
      const parties = new Set(p.results.filter((r) => r.pct > 0).map((r) => inferParty(r)));
      return parties.size === 1 && p.results.filter((r) => r.pct > 0).length >= 2
        && (parties.has("DEM") || parties.has("REP"));
    });
    const partyTotals: Record<string, Record<string, { weightedSum: number; totalWeight: number }>> = {};
    for (const p of pPolls) {
      const candidates = p.results.filter((r) => r.pct > 0);
      const party = inferParty(candidates[0]);
      if (!partyTotals[party]) partyTotals[party] = {};
      const w = pollWeight(p.pollster, p.end_date, undefined);
      for (const r of candidates) {
        const name = lastName(r.candidate);
        if (!partyTotals[party][name]) partyTotals[party][name] = { weightedSum: 0, totalWeight: 0 };
        partyTotals[party][name].weightedSum += r.pct * w;
        partyTotals[party][name].totalWeight += w;
      }
    }
    for (const [party, candidates] of Object.entries(partyTotals)) {
      const sorted = Object.entries(candidates).sort((a, b) =>
        (b[1].weightedSum / b[1].totalWeight) - (a[1].weightedSum / a[1].totalWeight)
      );
      if (sorted.length >= 2) primaryLeader[party] = sorted[0][0];
    }
  }

  // Build all matchups, sorted by poll count descending (primary leader as tiebreaker)
  const allMatchups: Matchup[] = Object.values(matchupGroups)
    .filter((group) => group.length >= 1)
    .map(buildMatchup)
    .sort((a, b) => {
      if (b.pollCount !== a.pollCount) return b.pollCount - a.pollCount;
      // Tiebreak: prefer matchup containing the primary leader(s)
      const aScore = (primaryLeader["DEM"] && a.demCandidate.toLowerCase() === primaryLeader["DEM"].toLowerCase() ? 1 : 0)
        + (primaryLeader["REP"] && a.repCandidate.toLowerCase() === primaryLeader["REP"].toLowerCase() ? 1 : 0);
      const bScore = (primaryLeader["DEM"] && b.demCandidate.toLowerCase() === primaryLeader["DEM"].toLowerCase() ? 1 : 0)
        + (primaryLeader["REP"] && b.repCandidate.toLowerCase() === primaryLeader["REP"].toLowerCase() ? 1 : 0);
      return bScore - aScore;
    });

  // The "switchable" matchups are those with >= MATCHUP_MIN_POLLS
  const switchableMatchups = allMatchups.filter((m) => m.pollCount >= MATCHUP_MIN_POLLS);
  // If none meet the threshold, just use the best one
  const matchups = switchableMatchups.length > 0 ? switchableMatchups : allMatchups.slice(0, 1);

  // If we have confirmed primary winners, prioritize matchups containing them
  const primaryResult = PRIMARY_RESULTS[race.state_abbr];
  let best = matchups[0];
  if (primaryResult && matchups.length > 1) {
    const confirmed = matchups.find((m) => {
      const demOk = !primaryResult.dem || m.demCandidate.toLowerCase() === primaryResult.dem.toLowerCase();
      const repOk = !primaryResult.rep || m.repCandidate.toLowerCase() === primaryResult.rep.toLowerCase();
      return demOk && repOk;
    });
    // If no exact match, at least match the confirmed side
    const partial = !confirmed ? matchups.find((m) => {
      if (primaryResult.dem && m.demCandidate.toLowerCase() === primaryResult.dem.toLowerCase()) return true;
      if (primaryResult.rep && m.repCandidate.toLowerCase() === primaryResult.rep.toLowerCase()) return true;
      return false;
    }) : undefined;
    best = confirmed ?? partial ?? best;

    // Re-sort so the confirmed matchup is first
    if (best !== matchups[0]) {
      const idx = matchups.indexOf(best);
      if (idx > 0) {
        matchups.splice(idx, 1);
        matchups.unshift(best);
      }
    }
  }
  if (best) {
    demCandidate = best.demCandidate;
    repCandidate = best.repCandidate;
    demPct = best.demPct;
    repPct = best.repPct;
  }

  const pollingSamples = best?.pollingSamples ?? [];
  const latestPollDate = best?.latestPollDate;

  // Fundraising: from FEC API only (no hardcoded fallback)
  let fundraising: { dem: number; rep: number } | undefined;
  if (fecCandidates && fecCandidates.length > 0) {
    const demFec = fecCandidates.filter((c: any) => c.party === "DEM").sort((a: any, b: any) => b.receipts - a.receipts)[0];
    const repFec = fecCandidates.filter((c: any) => c.party === "REP").sort((a: any, b: any) => b.receipts - a.receipts)[0];
    if (demFec || repFec) {
      fundraising = {
        dem: Math.round((demFec?.receipts ?? 0) / 1e6 * 10) / 10,
        rep: Math.round((repFec?.receipts ?? 0) / 1e6 * 10) / 10,
      };
    }
  }

  // Events/week: proxy from polls published in the last 14 days
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recentPollCount = polls.filter((p) => {
    if (!p.end_date) return false;
    return new Date(p.end_date).getTime() >= twoWeeksAgo;
  }).length;
  // Rough estimate: 1 event for every 2 recent polls (more polling = more campaign activity)
  const eventsThisWeek = Math.min(recentPollCount, 12);

  // called: read from API (will be false pre-election, can be set via admin PATCH endpoint)
  const called = Boolean(race.called);
  const winner = race.called_winner === "DEM" ? "D" : race.called_winner === "REP" ? "R" : undefined;

  // ---------------------------------------------------------------------------
  // Primary polls: single-party polls OR jungle primaries (3+ candidates from one party)
  // ---------------------------------------------------------------------------
  const primaryPolls = polls.filter((p) => {
    // Exclude pre-2026 polls (hypothetical matchups before candidates declared)
    if (p.end_date && new Date(p.end_date).getFullYear() < 2026) return false;
    const candidatesWithPct = p.results.filter((r) => r.pct > 0);
    if (candidatesWithPct.length < 2) return false;
    const partyCount: Record<string, number> = {};
    for (const r of candidatesWithPct) {
      const party = inferParty(r);
      partyCount[party] = (partyCount[party] || 0) + 1;
    }
    const parties = Object.keys(partyCount);
    // Traditional primary: all candidates same party
    if (parties.length === 1 && (partyCount["DEM"] || partyCount["REP"])) return true;
    // Jungle/top-N primary: 3+ candidates from either party (treat each party as a primary)
    if ((partyCount["DEM"] ?? 0) >= 3 || (partyCount["REP"] ?? 0) >= 3) return true;
    return false;
  });

  let primaryMatchups: PrimaryMatchup[] | undefined;
  if (primaryPolls.length > 0) {
    // Group by party — one DEM primary, one REP primary
    // For jungle primaries, split the same poll into per-party virtual polls
    const primaryGroups: Record<string, { party: "DEM" | "REP"; polls: typeof primaryPolls }> = {};
    for (const p of primaryPolls) {
      const candidatesWithPct = p.results.filter((r) => r.pct > 0);
      const partyCounts: Record<string, number> = {};
      for (const r of candidatesWithPct) {
        const party = inferParty(r);
        partyCounts[party] = (partyCounts[party] || 0) + 1;
      }
      // For each party with 2+ candidates, add to that party's group
      for (const party of ["DEM", "REP"] as const) {
        if ((partyCounts[party] ?? 0) >= 2) {
          if (!primaryGroups[party]) primaryGroups[party] = { party, polls: [] };
          // Create a virtual poll with only this party's candidates
          const partyPoll = {
            ...p,
            results: p.results.filter((r) => inferParty(r) === party && r.pct > 0),
          };
          primaryGroups[party].polls.push(partyPoll as any);
        }
      }
    }

    primaryMatchups = Object.values(primaryGroups)
      .filter((g) => g.polls.length >= 2) // Need at least 2 polls
      .map((g) => {
        const { party, polls: gPolls } = g;
        // Aggregate: weighted average per candidate across all polls in this group
        const candidateTotals: Record<string, { weightedSum: number; totalWeight: number; count: number }> = {};
        for (const p of gPolls) {
          const w = pollWeight(p.pollster, p.end_date, undefined);
          for (const r of p.results.filter((r) => r.pct > 0)) {
            const name = lastName(r.candidate);
            if (!candidateTotals[name]) candidateTotals[name] = { weightedSum: 0, totalWeight: 0, count: 0 };
            candidateTotals[name].weightedSum += r.pct * w;
            candidateTotals[name].totalWeight += w;
            candidateTotals[name].count += 1;
          }
        }

        const candidates = Object.entries(candidateTotals)
          .map(([name, t]) => ({
            name,
            pct: Math.round((t.weightedSum / t.totalWeight) * 10) / 10,
          }))
          .filter((c) => c.pct >= PRIMARY_MIN_AVG_PCT)
          .sort((a, b) => b.pct - a.pct);

        // Set of names that passed the threshold — used to filter poll samples too
        const eligibleNames = new Set(candidates.map((c) => c.name));

        const samples: PrimaryPollSample[] = gPolls
          .filter((p) => p.end_date)
          .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime())
          .map((p) => ({
            date: (() => {
              const d = new Date(p.end_date);
              const base = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              return d.getFullYear() < new Date().getFullYear() ? base + " (" + d.getFullYear() + ")" : base;
            })(),
            candidates: p.results
              .filter((r) => r.pct > 0 && eligibleNames.has(lastName(r.candidate)))
              .sort((a, b) => b.pct - a.pct)
              .map((r) => ({ name: lastName(r.candidate), pct: r.pct })),
            pollster: p.pollster,
            sampleSize: p.sample_size,
            population: p.population?.toUpperCase(),
            grade: p.pollster ? getPollsterGrade(p.pollster) : null,
          }));

        const top2 = candidates.slice(0, 2);
        return {
          party,
          candidates,
          pollingSamples: samples,
          pollCount: gPolls.length,
          latestPollDate: gPolls[gPolls.length - 1]?.end_date
            ? new Date(gPolls[gPolls.length - 1].end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : undefined,
          label: top2.map((c) => c.name).join(" vs "),
        };
      })
      .filter((m) => m.candidates.length >= 2) // Need at least 2 eligible candidates
      .sort((a, b) => b.pollCount - a.pollCount);

    if (primaryMatchups.length === 0) primaryMatchups = undefined;
  }

  // Override with engine-computed per-matchup weighted aggregate if available
  if (weightedAggregates) {
    // Find the aggregate matching the best matchup's candidates
    for (const [key, agg] of Object.entries(weightedAggregates)) {
      if (agg.polls_included > 0 &&
          key.toLowerCase().includes(demCandidate.toLowerCase()) &&
          key.toLowerCase().includes(repCandidate.toLowerCase())) {
        const aggDem = agg.results.find((r: any) => (r.party === "DEM" || r.party === "D") && r.candidate.toLowerCase().includes(demCandidate.toLowerCase()));
        const aggRep = agg.results.find((r: any) => (r.party === "REP" || r.party === "R") && r.candidate.toLowerCase().includes(repCandidate.toLowerCase()));
        if (aggDem) demPct = aggDem.pct;
        if (aggRep) repPct = aggRep.pct;
        break;
      }
    }
    // Also override each matchup's demPct/repPct
    for (const m of matchups) {
      for (const [key, agg] of Object.entries(weightedAggregates)) {
        if (agg.polls_included > 0 &&
            key.toLowerCase().includes(m.demCandidate.toLowerCase()) &&
            key.toLowerCase().includes(m.repCandidate.toLowerCase())) {
          const aggDem = agg.results.find((r: any) => (r.party === "DEM" || r.party === "D") && r.candidate.toLowerCase().includes(m.demCandidate.toLowerCase()));
          const aggRep = agg.results.find((r: any) => (r.party === "REP" || r.party === "R") && r.candidate.toLowerCase().includes(m.repCandidate.toLowerCase()));
          if (aggDem) m.demPct = aggDem.pct;
          if (aggRep) m.repPct = aggRep.pct;
          m.margin = Math.round((m.demPct - m.repPct) * 10) / 10;
          m.lean = marginToLean(m.margin);
          break;
        }
      }
    }
  }

  return {
    state: race.state,
    stateCode: race.state_abbr,
    incumbent: partyToIncumbent(race.incumbent_party),
    incumbentName: race.incumbent ?? undefined,
    demCandidate,
    repCandidate,
    demPct,
    repPct,
    margin: Math.round((demPct - repPct) * 10) / 10,
    lean: (demPct > 0 && repPct > 0) ? marginToLean(demPct - repPct) : cookToLean(race.cook_rating),
    called,
    winner,
    pollingSamples,
    pollCount: best?.pollCount ?? 0,
    key: isBattleground(demPct - repPct, demPct > 0 && repPct > 0),
    ...(fundraising && { moneyRaised: fundraising }),
    eventsThisWeek,
    latestPollDate,
    matchups,
    ...(primaryMatchups && { primaryMatchups }),
    ...(fecCandidates && fecCandidates.length > 0 && {
      fecCandidates: fecCandidates.map((c: any) => ({
        name: c.name as string,
        party: c.party as string,
        receipts: c.receipts as number,
      })),
    }),
  };
}

export function transformGovernorRace(
  race: ApiRace,
  polls: ApiPoll[],
  uniqueCount: number,
  fecCandidates?: any[],
  weightedAggregates?: Record<string, { results: { candidate: string; party: string; pct: number }[]; polls_included: number }>,
): GovernorRace {
  // Reuse the Senate transform — data shape is identical
  const senateResult = transformSenateRace(race, polls, uniqueCount, fecCandidates, weightedAggregates);
  return senateResult as unknown as GovernorRace;
}

export function transformHouseRace(
  district: ApiHouseDistrict,
  polls: ApiPoll[],
  weightedAggregate?: { results: { candidate: string; party: string; pct: number }[]; polls_included: number },
): HouseRace {
  const parts = district.district.split("-");
  const stateCode = parts[0] || "";

  let demCandidate = "TBD";
  let repCandidate = "TBD";
  let demPct = 0;
  let repPct = 0;
  let lean: Lean = "Toss-Up";

  const generalPolls = polls.filter((p) => {
    const parties = new Set(p.results.map((r) => inferParty(r)));
    return parties.has("DEM") && parties.has("REP");
  });

  const pollingSamples: PollSample[] = [];
  let latestPollDate: string | undefined;

  if (generalPolls.length > 0) {
    let dSum = 0, rSum = 0, n = 0;
    for (const p of generalPolls) {
      const d = p.results.find((r) => inferParty(r) === "DEM");
      const r = p.results.find((r2) => inferParty(r2) === "REP");
      if (d && r) {
        dSum += d.pct;
        rSum += r.pct;
        n++;
      }
    }
    if (n > 0) {
      demPct = Math.round((dSum / n) * 10) / 10;
      repPct = Math.round((rSum / n) * 10) / 10;
    }

    const latest = generalPolls[0];
    const dR = latest.results.find((r) => inferParty(r) === "DEM");
    const rR = latest.results.find((r) => inferParty(r) === "REP");
    if (dR) demCandidate = lastName(dR.candidate);
    if (rR) repCandidate = lastName(rR.candidate);

    lean = marginToLean(demPct - repPct);

    latestPollDate = latest.end_date
      ? new Date(latest.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : undefined;

    for (const p of [...generalPolls].reverse()) {
      const d = p.results.find((r) => inferParty(r) === "DEM");
      const r = p.results.find((r2) => inferParty(r2) === "REP");
      if (d && r && p.end_date) {
        const dt = new Date(p.end_date);
        const base = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        pollingSamples.push({
          date: dt.getFullYear() < new Date().getFullYear() ? base + " (" + dt.getFullYear() + ")" : base,
          dem: d.pct,
          rep: r.pct,
          pollster: p.pollster,
          sampleSize: p.sample_size,
          population: p.population?.toUpperCase(),
          grade: p.pollster ? getPollsterGrade(p.pollster) : null,
        });
      }
    }
  }

  // Override with engine-computed weighted aggregate if available
  if (weightedAggregate && weightedAggregate.polls_included > 0) {
    const aggDem = weightedAggregate.results.find((r: any) => r.party === "DEM" || r.party === "D");
    const aggRep = weightedAggregate.results.find((r: any) => r.party === "REP" || r.party === "R");
    if (aggDem) demPct = aggDem.pct;
    if (aggRep) repPct = aggRep.pct;
    lean = marginToLean(demPct - repPct);
  }

  return {
    district: district.district,
    state: STATE_NAMES[stateCode] ?? stateCode,
    stateCode,
    demCandidate,
    repCandidate,
    demPct,
    repPct,
    margin: demPct - repPct,
    projectedMargin: demPct - repPct,
    lean,
    called: false,
    pollCount: district.poll_count,
    pollingSamples,
    latestPollDate,
  };
}

export function transformRecentPoll(p: ApiPoll & { state?: string }): RecentPoll {
  return {
    id: p.id,
    pollster: p.pollster,
    state: p.state,
    subject: p.subject,
    endDate: p.end_date,
    sampleSize: p.sample_size,
    population: p.population,
    results: (p.results || []).map((r) => ({
      candidate: r.candidate,
      party: inferParty(r),
      pct: r.pct,
    })),
    pollType: p.poll_type,
  };
}

// Convert a RecentPoll to the PollEntry format used by PollingPanel's table.
// Only polls that have both a D and R result are included.
export function transformRecentPollToPollEntry(p: RecentPoll): PollEntry | null {
  const dem = p.results.find((r) => r.party === "DEM" || r.party === "D");
  const rep = p.results.find((r) => r.party === "REP" || r.party === "R");
  if (!dem || !rep) return null;

  // Derive a state label from subject (e.g. "Georgia Senate" → "Georgia") or state field
  const rawState = p.state ?? (p.subject ? p.subject.replace(/ (Senate|House)$/i, "") : "");
  // Try to find the state abbreviation
  const abbr =
    Object.entries(STATE_NAMES).find(
      ([code, name]) =>
        rawState.toUpperCase() === code ||
        rawState.toLowerCase() === name.toLowerCase(),
    )?.[0] ?? rawState.slice(0, 2).toUpperCase();

  return {
    pollster: p.pollster,
    state: abbr || rawState,
    date: p.endDate
      ? new Date(p.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "—",
    dem: Math.round(dem.pct * 10) / 10,
    rep: Math.round(rep.pct * 10) / 10,
    moe: p.sampleSize ? Math.round((0.98 / Math.sqrt(p.sampleSize)) * 100 * 10) / 10 : 0,
    grade: "—", // Grade not available from search endpoint without pollster join
  };
}

export function generateTickerItems(
  senateRaces: SenateRace[],
  houseRaces: HouseRace[],
): string[] {
  const items: string[] = [];

  const senateMargins = senateRaces
    .filter((r) => r.demPct > 0 || r.repPct > 0)
    .map((r) => {
      const leader = r.margin >= 0 ? r.demCandidate : r.repCandidate;
      const party = r.margin >= 0 ? "D" : "R";
      return `${r.stateCode} Senate: ${leader} (${party}) ${r.margin >= 0 ? "+" : ""}${r.margin.toFixed(1)}`;
    });

  if (senateMargins.length > 0) {
    items.push(senateMargins.join(" | "));
  }

  const tossUpSenate = senateRaces.filter((r) => r.lean === "Toss-Up").length;
  const leanSenate = senateRaces.filter((r) => r.lean === "Lean D" || r.lean === "Lean R").length;
  items.push(
    `Senate map: ${tossUpSenate} toss-ups · ${leanSenate} lean races · ${senateRaces.length} total tracked`
  );

  const houseWithPolls = houseRaces.filter((r) => r.pollCount > 0).length;
  items.push(
    `House map: ${houseRaces.length} districts tracked · ${houseWithPolls} with polling data`
  );

  items.push(
    `Data source: Wikipedia polling tables · Updated ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" })} ET`
  );

  return items;
}

export function computeSeatBalance(
  senateRaces: SenateRace[],
  houseRaces: HouseRace[],
) {
  let sTossUp = 0;
  let sTossDem = 0, sTossRep = 0;
  let sLeanD = 0, sLeanR = 0, sLikelyD = 0, sLikelyR = 0, sSafeD = 0, sSafeR = 0;
  for (const r of senateRaces) {
    if (r.lean === "Toss-Up") {
      sTossUp++;
      // Assign toss-up to whoever is actually leading
      if (r.margin > 0) sTossDem++;
      else if (r.margin < 0) sTossRep++;
      else sTossRep++; // exact ties go to R (party holding tiebreaker via VP)
    }
    else if (r.lean === "Lean D") sLeanD++;
    else if (r.lean === "Lean R") sLeanR++;
    else if (r.lean === "Likely D") sLikelyD++;
    else if (r.lean === "Likely R") sLikelyR++;
    else if (r.lean === "Safe D") sSafeD++;
    else if (r.lean === "Safe R") sSafeR++;
  }

  const sDemProjected = sSafeD + sLikelyD + sLeanD + sTossDem;
  const sRepProjected = sSafeR + sLikelyR + sLeanR + sTossRep;

  let hDemProj = 0, hRepProj = 0, hTossUp = 0;
  for (const r of houseRaces) {
    const pm = r.projectedMargin;
    const projLean = marginToLean(pm);
    if (projLean === "Toss-Up") {
      hTossUp++;
      if (pm > 0) hDemProj++;
      else if (pm < 0) hRepProj++;
      else hRepProj++;
    }
    else if (projLean === "Safe D" || projLean === "Likely D" || projLean === "Lean D") hDemProj++;
    else hRepProj++;
  }


  return {
    senate: {
      demProjected: sDemProjected,
      repProjected: sRepProjected,
      tossUp: sTossUp,
      total: senateRaces.length,
      needed: 51,
      breakdown: { sSafeD, sLikelyD, sLeanD, sTossUp, sLeanR, sLikelyR, sSafeR },
    },
    house: {
      demProjected: hDemProj,
      repProjected: hRepProj,
      tossUp: hTossUp,
      total: houseRaces.length,
      needed: 218,
    },
  };
}

// ---------------------------------------------------------------------------
// News feed generation from poll data
// ---------------------------------------------------------------------------

export function generateNewsItems(
  polls: RecentPoll[],
  senateRaces: SenateRace[],
): NewsItem[] {
  const battlegroundCodes = new Set(
    senateRaces.filter((r) => r.key).map((r) => r.stateCode),
  );

  const now = new Date();

  return polls
    .filter((p) => p.results.length > 0)
    .slice(0, 40)
    .map((p): NewsItem => {
      const dem = p.results.find((r) => r.party === "DEM" || r.party === "D");
      const rep = p.results.find((r) => r.party === "REP" || r.party === "R");

      // Determine state code from state field (may be "PA", "Pennsylvania", etc.)
      const rawState = p.state ?? p.subject ?? "";
      const stateCode =
        Object.entries(STATE_NAMES).find(
          ([code, name]) =>
            rawState.toLowerCase() === name.toLowerCase() ||
            rawState.toUpperCase() === code,
        )?.[0] ?? rawState.slice(0, 2).toUpperCase();

      let headline = "";
      let tag = "POLL";
      let urgent = false;

      if (dem && rep) {
        const margin = dem.pct - rep.pct;
        const absMargin = Math.abs(margin);
        const leaderName =
          margin > 0
            ? dem.candidate.split(" ").pop()
            : rep.candidate.split(" ").pop();
        const leaderParty = margin >= 0 ? "D" : "R";
        const marginStr =
          absMargin < 0.5
            ? "TIED"
            : `${leaderName} (${leaderParty}) +${absMargin.toFixed(1)}`;

        const location = STATE_NAMES[stateCode] ?? rawState;
        const chamber = p.pollType?.toLowerCase().includes("house") ? "HOUSE" : "SENATE";
        headline = `${p.pollster.toUpperCase()}: ${marginStr} — ${location} ${chamber}`;

        if (battlegroundCodes.has(stateCode)) {
          tag = absMargin <= 3 ? "TOSS-UP" : "BATTLEGROUND";
          urgent = absMargin <= 1;
        }
      } else {
        const location = STATE_NAMES[stateCode] ?? rawState;
        headline = `${p.pollster.toUpperCase()} releases new poll — ${location}`;
      }

      // Relative time string
      const endDate = new Date(p.endDate);
      const daysDiff = Math.floor(
        (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const timeStr =
        daysDiff <= 0
          ? "TODAY"
          : daysDiff === 1
          ? "YESTERDAY"
          : `${daysDiff}D AGO`;

      return { time: timeStr, headline, tag, urgent, state: p.state };
    })
    .filter((item) => item.headline.length > 0);
}
