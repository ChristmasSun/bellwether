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
  apiGet,
  transformSenateRace,
  transformHouseRace,
  transformRecentPoll,
  transformRecentPollToPollEntry,
  generateTickerItems,
  generateNewsItems,
  computeSeatBalance,
} from "./electionData";

interface ElectionData {
  senateRaces: SenateRace[];
  houseRaces: HouseRace[];
  recentPolls: RecentPoll[];
  newsItems: NewsItem[];
  pollEntries: PollEntry[];
  tickerItems: string[];
  seatBalance: ReturnType<typeof computeSeatBalance>;
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
      const [rawRaces, rawHouseDistricts, rawRecentPolls] = await Promise.all([
        apiGet<any[]>("/senate/races"),
        apiGet<any[]>("/house/races?limit=1000"),
        apiGet<{ polls: any[]; count: number }>("/polls/search?days=60&limit=50"),
      ]);

      const races: any[] = Array.isArray(rawRaces) ? rawRaces : [];
      const houseDistricts: any[] = Array.isArray(rawHouseDistricts) ? rawHouseDistricts : [];

      const BATCH = 8;
      const senateRaces: SenateRace[] = [];

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
              );
            } catch {
              return transformSenateRace(race, [], 0);
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
              return transformHouseRace(d, pollData.polls || []);
            } catch {
              return transformHouseRace(d, []);
            }
          })
        );
        for (const r of results) {
          if (r.status === "fulfilled") houseRaces.push(r.value);
        }
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
