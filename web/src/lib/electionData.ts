export type Party = "D" | "R" | "I";

export type Lean =
  | "Safe D"
  | "Likely D"
  | "Lean D"
  | "Toss-Up"
  | "Lean R"
  | "Likely R"
  | "Safe R";

export interface SenateRace {
  state: string;
  stateCode: string;
  incumbent?: Party;
  demCandidate: string;
  repCandidate: string;
  demPct: number;
  repPct: number;
  margin: number;
  lean: Lean;
  winner?: Party;
  called: boolean;
  pollingSamples: { date: string; dem: number; rep: number }[];
  pollCount: number;
  key: boolean;
}

export interface HouseRace {
  district: string;
  state: string;
  stateCode: string;
  demCandidate: string;
  repCandidate: string;
  demPct: number;
  repPct: number;
  lean: Lean;
  winner?: Party;
  called: boolean;
  incumbent?: Party;
  pollCount: number;
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
  source: string;
  tag: "BREAKING" | "POLL" | "MONEY" | "ANALYSIS" | "RESULTS";
  state?: string;
}

// ---------------------------------------------------------------------------
// Static data (real historical numbers, kept as constants)
// ---------------------------------------------------------------------------

export const SEAT_BALANCE = {
  senate: {
    demCurrent: 47,
    repCurrent: 53,
    demProjected: 47,
    repProjected: 53,
    tossUp: 0,
    needed: 51,
    historical: [
      { year: 2016, dem: 48, rep: 52 },
      { year: 2018, dem: 47, rep: 53 },
      { year: 2020, dem: 50, rep: 50 },
      { year: 2022, dem: 51, rep: 49 },
      { year: 2024, dem: 47, rep: 53 },
    ],
  },
  house: {
    demCurrent: 215,
    repCurrent: 220,
    demProjected: 215,
    repProjected: 220,
    tossUp: 0,
    needed: 218,
    historical: [
      { year: 2016, dem: 194, rep: 241 },
      { year: 2018, dem: 235, rep: 199 },
      { year: 2020, dem: 222, rep: 213 },
      { year: 2022, dem: 212, rep: 222 },
      { year: 2024, dem: 215, rep: 220 },
    ],
  },
};

export const PROBABILITY_HISTORY = [
  { date: "Jan", demSenate: 38, repSenate: 62, demHouse: 42, repHouse: 58 },
  { date: "Feb", demSenate: 37, repSenate: 63, demHouse: 43, repHouse: 57 },
  { date: "Mar", demSenate: 39, repSenate: 61, demHouse: 44, repHouse: 56 },
];

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

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
  if (/\((?:D|DEM)\)/i.test(c) || /\bDemocrat\b/i.test(c)) return "DEM";
  if (/\((?:R|REP|GOP)\)/i.test(c) || /\bRepublican\b/i.test(c)) return "REP";
  if (/\((?:I|IND)\)/i.test(c) || /\bIndependent\b/i.test(c)) return "IND";
  return "UNK";
}

function lastName(full: string): string {
  const cleaned = full.replace(/\s*\(.*?\)\s*/g, "").trim();
  const parts = cleaned.split(/\s+/);
  return parts[parts.length - 1] || cleaned;
}

export function cookToLean(cook: string | null | undefined): Lean {
  if (!cook) return "Toss-Up";
  const lower = cook.toLowerCase().replace(/[-–]/g, " ").trim();
  if (/safe\s*d/.test(lower)) return "Safe D";
  if (/likely\s*d/.test(lower)) return "Likely D";
  if (/lean\s*d/.test(lower)) return "Lean D";
  if (/toss/.test(lower)) return "Toss-Up";
  if (/lean\s*r/.test(lower)) return "Lean R";
  if (/likely\s*r/.test(lower)) return "Likely R";
  if (/safe\s*r/.test(lower)) return "Safe R";
  return "Toss-Up";
}

function partyToIncumbent(p: string | null | undefined): Party | undefined {
  if (!p) return undefined;
  const u = p.toUpperCase();
  if (u === "DEM" || u === "D") return "D";
  if (u === "REP" || u === "R") return "R";
  if (u === "IND" || u === "I") return "I";
  return undefined;
}

function isBattleground(lean: Lean): boolean {
  return ["Toss-Up", "Lean D", "Lean R"].includes(lean);
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
): SenateRace {
  const lean = cookToLean(race.cook_rating);

  let demCandidate = "TBD";
  let repCandidate = "TBD";
  let demPct = 0;
  let repPct = 0;

  // Find the "general election" matchup from the latest poll
  const generalPolls = polls.filter((p) => {
    const parties = new Set(p.results.map((r) => inferParty(r)));
    return parties.has("DEM") && parties.has("REP");
  });

  const latestGeneral = generalPolls[0]; // polls come sorted by end_date desc
  if (latestGeneral) {
    const demResult = latestGeneral.results.find((r) => inferParty(r) === "DEM");
    const repResult = latestGeneral.results.find((r) => inferParty(r) === "REP");
    if (demResult) {
      demCandidate = lastName(demResult.candidate);
      demPct = demResult.pct;
    }
    if (repResult) {
      repCandidate = lastName(repResult.candidate);
      repPct = repResult.pct;
    }
  }

  // Build simple average from all general polls
  if (generalPolls.length > 1) {
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
  }

  // Build trend series from general polls (chronological)
  const pollingSamples = generalPolls
    .filter((p) => p.end_date)
    .reverse()
    .slice(-12)
    .map((p) => {
      const d = p.results.find((r) => inferParty(r) === "DEM");
      const r = p.results.find((r2) => inferParty(r2) === "REP");
      return {
        date: new Date(p.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dem: d?.pct ?? 0,
        rep: r?.pct ?? 0,
      };
    });

  return {
    state: race.state,
    stateCode: race.state_abbr,
    incumbent: partyToIncumbent(race.incumbent_party),
    demCandidate,
    repCandidate,
    demPct,
    repPct,
    margin: Math.round((demPct - repPct) * 10) / 10,
    lean,
    called: false,
    pollingSamples,
    pollCount: uniqueCount,
    key: isBattleground(lean),
  };
}

export function transformHouseRace(
  district: ApiHouseDistrict,
  polls: ApiPoll[],
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

    const margin = demPct - repPct;
    if (margin > 10) lean = "Safe D";
    else if (margin > 5) lean = "Likely D";
    else if (margin > 1) lean = "Lean D";
    else if (margin < -10) lean = "Safe R";
    else if (margin < -5) lean = "Likely R";
    else if (margin < -1) lean = "Lean R";
    else lean = "Toss-Up";
  }

  return {
    district: district.district,
    state: "",
    stateCode,
    demCandidate,
    repCandidate,
    demPct,
    repPct,
    lean,
    called: false,
    pollCount: district.poll_count,
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
  let sLeanD = 0, sLeanR = 0, sLikelyD = 0, sLikelyR = 0, sSafeD = 0, sSafeR = 0;
  for (const r of senateRaces) {
    if (r.lean === "Toss-Up") sTossUp++;
    else if (r.lean === "Lean D") sLeanD++;
    else if (r.lean === "Lean R") sLeanR++;
    else if (r.lean === "Likely D") sLikelyD++;
    else if (r.lean === "Likely R") sLikelyR++;
    else if (r.lean === "Safe D") sSafeD++;
    else if (r.lean === "Safe R") sSafeR++;
  }

  const hTossUp = houseRaces.filter((r) => r.lean === "Toss-Up").length;

  return {
    senate: {
      ...SEAT_BALANCE.senate,
      tossUp: sTossUp,
      breakdown: { sSafeD, sLikelyD, sLeanD, sTossUp, sLeanR, sLikelyR, sSafeR },
    },
    house: {
      ...SEAT_BALANCE.house,
      tossUp: hTossUp,
    },
  };
}
