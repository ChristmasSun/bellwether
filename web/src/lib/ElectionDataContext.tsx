"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  type SenateRace,
  type HouseRace,
  type RecentPoll,
  type NewsItem,
  type PollEntry,
  STATE_NAMES,
  marginToLean,
  apiGet,
  transformSenateRace,
  transformHouseRace,
  transformRecentPoll,
  transformRecentPollToPollEntry,
  generateTickerItems,
  generateNewsItems,
  computeSeatBalance,
} from "./electionData";
import { HOUSE_2024_NATIONAL_MARGIN, HOUSE_NATIONAL_ENVIRONMENT, POLLS_FOR_FULL_WEIGHT, RECENT_POLL_DAYS } from "./constants";
import { DISTRICT_PRES_2024 } from "./districtPres2024";
import { DISTRICT_HOUSE_2024 } from "./districtHouse2024";

export interface GenericBallotPoll {
  id: number;
  pollster: string;
  endDate: string;
  startDate?: string;
  demPct: number;
  repPct: number;
  margin: number;
  sampleSize?: number;
  population?: string;
}

export interface GenericBallotAverage {
  dem: number;
  rep: number;
  margin: number;
}

interface ElectionData {
  senateRaces: SenateRace[];
  houseRaces: HouseRace[];
  recentPolls: RecentPoll[];
  newsItems: NewsItem[];
  pollEntries: PollEntry[];
  tickerItems: string[];
  seatBalance: ReturnType<typeof computeSeatBalance>;
  genericBallotPolls: GenericBallotPoll[];
  genericBallotAverage: GenericBallotAverage | null;
  totalSenatePolls: number;
  totalHousePolls: number;
  loading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  refetch: () => void;
}

const defaultCtx: ElectionData = {
  senateRaces: [],
  houseRaces: [],
  recentPolls: [],
  newsItems: [],
  pollEntries: [],
  tickerItems: ["Connecting to data feed..."],
  seatBalance: {
    senate: { demProjected: 0, repProjected: 0, tossUp: 0, total: 0, needed: 51, breakdown: { sSafeD: 0, sLikelyD: 0, sLeanD: 0, sTossUp: 0, sLeanR: 0, sLikelyR: 0, sSafeR: 0 } },
    house: { demProjected: 0, repProjected: 0, tossUp: 0, total: 0, needed: 218 },
  },
  genericBallotPolls: [],
  genericBallotAverage: null,
  totalSenatePolls: 0,
  totalHousePolls: 0,
  loading: true,
  error: null,
  lastRefresh: null,
  refetch: () => {},
};

const ElectionDataCtx = createContext<ElectionData>(defaultCtx);

export function useElectionData() {
  return useContext(ElectionDataCtx);
}

export function ElectionDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ElectionData>(defaultCtx);

  const fetchAll = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [rawRaces, rawHouseDistricts, rawRecentPolls, rawFec, rawGBPolls, rawGBAvg, rawSenAggs, rawHouseAggs] = await Promise.all([
        apiGet<any[]>("/senate/races"),
        apiGet<any[]>("/house/races?limit=1000"),
        apiGet<{ polls: any[]; count: number }>("/polls/search?days=60&limit=500"),
        apiGet<Record<string, any[]>>("/fec").catch(() => ({} as Record<string, any[]>)),
        apiGet<{ polls: any[] }>("/generic-ballot/polls").catch(() => ({ polls: [] })),
        apiGet<{ average: any; poll_count: number }>("/generic-ballot/average").catch(() => ({ average: null, poll_count: 0 })),
        apiGet<Record<string, any>>("/senate/aggregates/all").catch(() => ({} as Record<string, any>)),
        apiGet<Record<string, any>>("/house/aggregates/all").catch(() => ({} as Record<string, any>)),
      ]);
      const senateAggregates: Record<string, any> = rawSenAggs ?? {};
      const houseAggregates: Record<string, any> = rawHouseAggs ?? {};

      const races: any[] = Array.isArray(rawRaces) ? rawRaces : [];
      const houseDistricts: any[] = Array.isArray(rawHouseDistricts) ? rawHouseDistricts : [];

      const BATCH = 8;
      const senateRaces: SenateRace[] = [];

      // FEC data keyed by state abbreviation
      const fecData: Record<string, any[]> = rawFec ?? {};

      for (let i = 0; i < races.length; i += BATCH) {
        const batch = races.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(async (race: any) => {
            try {
              const pollData = await apiGet<{ polls: any[]; unique_count?: number }>(
                `/senate/races/${encodeURIComponent(race.state)}/polls?limit=200`
              );
              return transformSenateRace(
                race,
                pollData.polls || [],
                pollData.unique_count ?? (pollData.polls || []).length,
                fecData[race.state_abbr],
                senateAggregates[race.state],
              );
            } catch {
              return transformSenateRace(race, [], 0, fecData[race.state_abbr], senateAggregates[race.state]);
            }
          })
        );
        for (const r of results) {
          if (r.status === "fulfilled") senateRaces.push(r.value);
        }
      }

      const topDistricts = [...houseDistricts]
        .sort((a, b) => (b.poll_count || 0) - (a.poll_count || 0))
        .slice(0, 60);

      const houseRaces: HouseRace[] = [];
      for (let i = 0; i < topDistricts.length; i += BATCH) {
        const batch = topDistricts.slice(i, i + BATCH);
        const results = await Promise.allSettled(
          batch.map(async (d: any) => {
            try {
              const pollData = await apiGet<{ polls: any[] }>(
                `/house/races/${encodeURIComponent(d.district)}/polls?limit=50`
              );
              return transformHouseRace(d, pollData.polls || [], houseAggregates[d.district]);
            } catch {
              return transformHouseRace(d, [], houseAggregates[d.district]);
            }
          })
        );
        for (const r of results) {
          if (r.status === "fulfilled") houseRaces.push(r.value);
        }
      }

      // Transform generic ballot data
      const genericBallotPolls: GenericBallotPoll[] = (rawGBPolls.polls || []).map((p: any) => ({
        id: p.id,
        pollster: p.pollster,
        endDate: p.end_date,
        startDate: p.start_date,
        demPct: p.dem_pct,
        repPct: p.rep_pct,
        margin: p.margin,
        sampleSize: p.sample_size,
        population: p.population,
      }));
      const genericBallotAverage: GenericBallotAverage | null = rawGBAvg.average ?? null;

      // Use live generic ballot margin for House environment shift, fall back to constant
      // Shift is relative to 2024 national environment (R+2.6 → -2.6 in D-positive terms)
      const rawEnv = genericBallotAverage?.margin ?? HOUSE_NATIONAL_ENVIRONMENT;
      const envShift = rawEnv - HOUSE_2024_NATIONAL_MARGIN;

      // Add remaining districts (no polls) from presidential data
      const polledDistricts = new Set(houseRaces.map((r) => r.district));
      for (const [district, presMargin] of Object.entries(DISTRICT_PRES_2024)) {
        if (polledDistricts.has(district)) continue;
        const stateCode = district.split("-")[0] || "";
        // Use 2024 House race margin if available, else presidential margin
        // Both are R-positive; our margin convention is D-positive
        const rawMargin = DISTRICT_HOUSE_2024[district] ?? presMargin;
        const dMargin = -rawMargin + envShift;
        const lean = marginToLean(dMargin);
        houseRaces.push({
          district,
          state: STATE_NAMES[stateCode] ?? stateCode,
          stateCode,
          demCandidate: "TBD",
          repCandidate: "TBD",
          demPct: 0,
          repPct: 0,
          margin: dMargin,
          projectedMargin: dMargin,
          lean,
          called: false,
          pollCount: 0,
          pollingSamples: [],
        });
      }

      // Compute projectedMargin for all districts with poll data:
      // Blend polling margin with 2024 baseline + generic ballot shift,
      // weighted by number of RECENT polls (within RECENT_POLL_DAYS)
      const recentCutoff = new Date();
      recentCutoff.setDate(recentCutoff.getDate() - RECENT_POLL_DAYS);
      for (const r of houseRaces) {
        const rawBaseline = DISTRICT_HOUSE_2024[r.district] ?? DISTRICT_PRES_2024[r.district];
        if (rawBaseline == null) continue;
        const prior = -rawBaseline + envShift; // D-positive

        if (r.demPct > 0 || r.repPct > 0) {
          // Has general election polling — blend with prior based on recent poll count
          const recentCount = r.pollingSamples.filter((s) => {
            try {
              const d = new Date(s.date + ", " + new Date().getFullYear());
              return !isNaN(d.getTime()) && d >= recentCutoff;
            } catch { return false; }
          }).length;
          const blend = Math.min(recentCount / POLLS_FOR_FULL_WEIGHT, 1);
          r.projectedMargin = blend * r.margin + (1 - blend) * prior;
        } else {
          // In polled set but no general election data — use 2024 baseline + env shift
          r.projectedMargin = prior;
          r.margin = prior;
        }
        // Always set lean from projectedMargin so rating matches displayed margin
        r.lean = marginToLean(r.projectedMargin);
      }

      const recentPolls = (rawRecentPolls.polls || []).map(transformRecentPoll);
      const pollEntries: PollEntry[] = recentPolls
        .map(transformRecentPollToPollEntry)
        .filter((e): e is PollEntry => e !== null);
      const tickerItems = generateTickerItems(senateRaces, houseRaces);
      const newsItems = generateNewsItems(recentPolls, senateRaces);
      const seatBalance = computeSeatBalance(senateRaces, houseRaces);

      const totalSenatePolls = senateRaces.reduce((s, r) => s + r.pollCount, 0);
      const totalHousePolls = houseDistricts.reduce(
        (s: number, d: any) => s + (d.poll_count || 0),
        0,
      );

      setData({
        senateRaces,
        houseRaces,
        recentPolls,
        newsItems,
        pollEntries,
        tickerItems,
        seatBalance,
        genericBallotPolls,
        genericBallotAverage,
        totalSenatePolls,
        totalHousePolls,
        loading: false,
        error: null,
        lastRefresh: new Date(),
        refetch: fetchAll,
      });
    } catch (err: any) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err?.message ?? "Failed to fetch election data",
        refetch: fetchAll,
      }));
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <ElectionDataCtx.Provider value={{ ...data, refetch: fetchAll }}>
      {children}
    </ElectionDataCtx.Provider>
  );
}
