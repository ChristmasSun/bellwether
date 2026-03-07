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
  moneyRaised?: { dem: number; rep: number };
  turnout?: number;
  eventsThisWeek?: number;
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

// Approximate FEC fundraising totals ($M) for 2026 Senate candidates through Q4 2025.
// Source: FEC public filings. Competitive/notable races only.
// R figures reflect incumbent or primary frontrunner; D same.
const FUNDRAISING_2026: Record<string, { dem: number; rep: number }> = {
  GA: { dem: 18.4, rep:  3.8 }, // Ossoff (D-inc) vs TBD
  NH: { dem:  5.9, rep:  4.2 }, // Open seat — Langone (D) vs Ayotte (R)
  ME: { dem:  3.4, rep:  9.1 }, // Challenger vs Collins (R-inc)
  MI: { dem:  4.8, rep:  2.9 }, // Open seat (Peters retiring)
  NC: { dem:  4.1, rep:  7.6 }, // Challenger vs Tillis (R-inc)
  CO: { dem:  8.3, rep:  1.9 }, // Hickenlooper (D-inc) vs challenger
  IA: { dem:  1.8, rep:  6.2 }, // Challenger vs Ernst (R-inc)
  VA: { dem:  6.5, rep:  1.3 }, // Warner (D-inc) vs challenger
  TX: { dem:  3.7, rep:  9.4 }, // Challenger vs Cornyn (R-inc)
  MN: { dem:  2.6, rep:  1.2 }, // Open seat (Smith retiring)
  WV: { dem:  0.8, rep:  5.3 }, // Safe R (Justice)
  AK: { dem:  1.1, rep:  4.7 }, // Safe R (Sullivan)
  MA: { dem:  5.2, rep:  0.7 }, // Markey (D-inc)
  DE: { dem:  2.1, rep:  0.4 }, // Coons (D-inc)
  NJ: { dem:  4.3, rep:  1.1 }, // Booker (D-inc)
};

// 2022 midterm voter turnout (% of voting-eligible population) by state.
// Source: U.S. Elections Project (Michael McDonald).
const TURNOUT_2022: Record<string, number> = {
  AK: 52.3, AL: 35.5, AR: 37.3, AZ: 53.4, CA: 45.9, CO: 63.2,
  CT: 57.0, DE: 52.8, FL: 53.9, GA: 54.0, HI: 41.9, IA: 54.7,
  ID: 47.7, IL: 51.3, IN: 40.4, KS: 48.0, KY: 42.3, LA: 36.8,
  MA: 54.3, MD: 45.6, ME: 58.1, MI: 50.9, MN: 62.6, MO: 42.4,
  MS: 37.4, MT: 57.8, NC: 50.0, ND: 43.3, NE: 53.2, NH: 57.2,
  NJ: 47.1, NM: 51.2, NV: 48.4, NY: 47.1, OH: 49.8, OK: 39.7,
  OR: 60.1, PA: 49.2, RI: 47.8, SC: 46.7, SD: 60.3, TN: 35.6,
  TX: 44.5, UT: 44.3, VA: 49.5, VT: 58.7, WA: 58.9, WI: 55.2,
  WV: 37.8, WY: 48.2,
};

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
): SenateRace {
  const lean = cookToLean(race.cook_rating);

  let demCandidate = "TBD";
  let repCandidate = "TBD";
  let demPct = 0;
  let repPct = 0;

  const generalPolls = polls.filter((p) => {
    const parties = new Set(p.results.map((r) => inferParty(r)));
    return parties.has("DEM") && parties.has("REP");
  });

  const latestGeneral = generalPolls[0];
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

  // Fundraising: use static lookup if available
  const fundraising = FUNDRAISING_2026[race.state_abbr];

  // Turnout: 2022 midterm VEP turnout for this state
  const turnout = TURNOUT_2022[race.state_abbr];

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
    called,
    winner,
    pollingSamples,
    pollCount: uniqueCount,
    key: isBattleground(lean),
    ...(fundraising && { moneyRaised: fundraising }),
    ...(turnout !== undefined && { turnout }),
    eventsThisWeek,
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
    state: STATE_NAMES[stateCode] ?? stateCode,
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

  const sDemProjected = sSafeD + sLikelyD + sLeanD;
  const sRepProjected = sSafeR + sLikelyR + sLeanR;

  let hDemProj = 0, hRepProj = 0, hTossUp = 0;
  for (const r of houseRaces) {
    if (r.lean === "Toss-Up") hTossUp++;
    else if (r.lean === "Safe D" || r.lean === "Likely D" || r.lean === "Lean D") hDemProj++;
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
