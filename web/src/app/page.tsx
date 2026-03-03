"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ElectionDataProvider, useElectionData } from "@/lib/ElectionDataContext";
import { LiveTicker } from "@/components/elections/LiveTicker";
import { SeatMeter } from "@/components/elections/SeatMeter";
import { SenateRacesList } from "@/components/elections/SenateRaces";
import { HouseRaceGrid } from "@/components/elections/HouseRaces";
import { NewsFeed } from "@/components/elections/NewsFeed";
import { PollingPanel } from "@/components/elections/PollingPanel";
import { ProbabilityChart, HistoricalSeatsChart } from "@/components/elections/Charts";
import { RaceDetailModal } from "@/components/elections/RaceDetailModal";
import { KeyMetricStrip } from "@/components/elections/KeyMetricStrip";
import { TerminalClock } from "@/components/elections/TerminalClock";
import { type SenateRace } from "@/lib/electionData";
import {
  Activity, TrendingUp, Newspaper, BarChart2,
  Users, Database, Radio, ChevronRight, RefreshCw,
} from "lucide-react";

type Tab = "SENATE" | "HOUSE" | "POLLS" | "NEWS";

function PanelHeader({
  title, icon: Icon, sub, right,
}: {
  title: string;
  icon: React.ElementType;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1a2a1a] bg-[#050d05] sticky top-0 z-10">
      <Icon size={11} className="text-[#00ff41]" />
      <span className="text-[#00ff41] font-mono text-[10px] font-bold tracking-widest">{title}</span>
      {sub && <span className="text-[#334433] font-mono text-[8px] ml-1">{sub}</span>}
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

function BlinkDot({ color = "#00ff41" }: { color?: string }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full pulse-green"
      style={{ background: color }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#030a03] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 bg-[#00ff41] flex items-center justify-center">
          <span className="text-black font-bold text-[14px] leading-none">E</span>
        </div>
        <div className="text-[#00ff41] font-mono text-[11px] tracking-[0.3em] glow-text">
          BELLWETHER
        </div>
        <div className="flex items-center gap-2">
          <RefreshCw size={12} className="text-[#00ff41] animate-spin" />
          <span className="text-[#445544] font-mono text-[9px] tracking-widest">
            CONNECTING TO DATA FEED...
          </span>
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const {
    senateRaces, houseRaces, recentPolls,
    seatBalance, totalSenatePolls, totalHousePolls,
    loading, error, lastRefresh, refetch,
  } = useElectionData();

  const [selectedRace, setSelectedRace] = useState<SenateRace | null>(null);
  const [centerTab, setCenterTab] = useState<Tab>("SENATE");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  if (loading) return <LoadingSkeleton />;

  const tabs: Tab[] = ["SENATE", "HOUSE", "POLLS", "NEWS"];
  const tabIcons: Record<Tab, React.ElementType> = {
    SENATE: Database,
    HOUSE: Users,
    POLLS: BarChart2,
    NEWS: Newspaper,
  };

  const bd = seatBalance.senate.breakdown;

  const racesWithPolls = senateRaces.filter((r) => r.pollCount > 0).length;
  const competitiveRaces = senateRaces.filter((r) => r.key).length;

  const sortedByPolls = [...senateRaces].sort((a, b) => b.pollCount - a.pollCount);
  const topPolled = sortedByPolls.slice(0, 8);

  return (
    <div
      className="min-h-screen bg-[#030a03] text-[#ccc] flex flex-col scanline"
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      {/* TOP HEADER BAR */}
      <header className="flex items-center gap-4 px-4 py-2 bg-[#020802] border-b border-[#1a2a1a]">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-5 h-5 bg-[#00ff41] flex items-center justify-center">
            <span className="text-black font-bold text-[10px] leading-none">E</span>
          </div>
          <div>
            <div className="text-[#00ff41] font-mono text-[11px] font-bold tracking-[0.2em] glow-text">
              BELLWETHER
            </div>
            <div className="text-[#334433] font-mono text-[7px] tracking-widest">
              U.S. CONGRESSIONAL TRACKER — 2026 CYCLE
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 border-l border-[#1a2a1a] pl-4">
          <BlinkDot />
          <span className="text-[#00ff41] font-mono text-[8px] tracking-widest">LIVE DATA</span>
        </div>

        <div className="flex items-center gap-2 border-l border-[#1a2a1a] pl-4">
          {[
            { label: "RACES", value: String(senateRaces.length), color: "#00ff41" },
            { label: "BATTLEGROUNDS", value: String(competitiveRaces), color: "#fbbf24" },
            { label: "WITH POLLS", value: String(racesWithPolls), color: "#00ff41" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1 bg-[#0a150a] px-2 py-0.5 border border-[#1a2a1a] rounded-sm">
              <span style={{ color: s.color }} className="font-mono text-[11px] font-bold">{s.value}</span>
              <span className="text-[#445544] font-mono text-[7px] tracking-widest">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={refetch}
            className="text-[#445544] hover:text-[#00ff41] transition-colors p-1"
            title="Refresh data"
          >
            <RefreshCw size={12} />
          </button>
          <TerminalClock />
        </div>
      </header>

      {/* LIVE TICKER */}
      <LiveTicker />

      {/* KEY METRICS STRIP */}
      <KeyMetricStrip />

      {/* MAIN GRID */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN */}
        <div className="w-[280px] shrink-0 flex flex-col border-r border-[#1a2a1a] overflow-y-auto">
          <div className="border-b border-[#1a2a1a]">
            <PanelHeader title="SEAT BALANCE" icon={BarChart2} sub="PROJECTED" />
            <div className="p-3">
              <SeatMeter />
            </div>
          </div>

          <div className="border-b border-[#1a2a1a]">
            <PanelHeader title="CONTROL PROBABILITY" icon={TrendingUp} />
            <ProbabilityChart />
          </div>

          <div className="border-b border-[#1a2a1a]">
            <PanelHeader title="HISTORICAL SENATE" icon={Database} sub="SEATS" />
            <div className="px-2 pb-2 pt-2">
              <HistoricalSeatsChart chamber="senate" />
            </div>
          </div>

          <div className="border-b border-[#1a2a1a]">
            <PanelHeader title="HISTORICAL HOUSE" icon={Database} sub="SEATS" />
            <div className="px-2 pb-2 pt-2">
              <HistoricalSeatsChart chamber="house" />
            </div>
          </div>

          {/* Competitive state index */}
          <div className="p-3">
            <div className="text-[#334433] font-mono text-[8px] tracking-widest mb-2">COMPETITIVE STATE INDEX</div>
            <div className="flex flex-wrap gap-1">
              {senateRaces
                .filter((r) => r.key)
                .map((r) => {
                  const color = r.margin > 0 ? "#93c5fd" : r.margin < 0 ? "#fca5a5" : "#fbbf24";
                  return (
                    <div
                      key={r.stateCode}
                      className="w-7 h-7 flex items-center justify-center font-mono text-[9px] font-bold border border-[#1a2a1a] cursor-pointer hover:scale-110 transition-transform"
                      style={{
                        background: `${color}18`,
                        color: color,
                        borderColor: `${color}40`,
                      }}
                      onClick={() => setSelectedRace(r)}
                    >
                      {r.stateCode}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 border-r border-[#1a2a1a]">
          <div className="flex border-b border-[#1a2a1a] bg-[#020802] shrink-0">
            {tabs.map((tab) => {
              const Icon = tabIcons[tab];
              const active = centerTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setCenterTab(tab)}
                  className={`flex items-center gap-1.5 px-5 py-2.5 font-mono text-[9px] tracking-widest transition-colors border-r border-[#1a2a1a] ${
                    active
                      ? "text-[#00ff41] bg-[#050d05] border-b-2 border-b-[#00ff41]"
                      : "text-[#445544] hover:text-[#00cc33] hover:bg-[#0a150a]"
                  }`}
                >
                  <Icon size={10} />
                  {tab}
                </button>
              );
            })}

            <div className="ml-auto flex items-center gap-3 px-4">
              <div className="flex items-center gap-1">
                <Radio size={9} className="text-[#00ff41] pulse-green" />
                <span className="text-[#334433] font-mono text-[8px]">LIVE UPDATES</span>
              </div>
              <span className="text-[#1a2a1a] font-mono text-[8px]">|</span>
              <span className="text-[#334433] font-mono text-[8px]">
                {lastRefresh
                  ? `LAST SYNC ${lastRefresh.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} ET`
                  : "SYNCING..."}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {centerTab === "SENATE" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-3 py-2 border-b border-[#0d1a0d] flex items-center gap-2">
                  <span className="text-[#334433] font-mono text-[8px]">
                    {senateRaces.length} RACES TRACKED · {racesWithPolls} WITH POLLS · CLICK ROW FOR DETAIL
                  </span>
                  <ChevronRight size={8} className="text-[#334433]" />
                </div>
                <SenateRacesList races={senateRaces} onSelect={setSelectedRace} />
              </motion.div>
            )}

            {centerTab === "HOUSE" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-3 py-2 border-b border-[#0d1a0d] flex items-center gap-2">
                  <span className="text-[#334433] font-mono text-[8px]">
                    {houseRaces.length} DISTRICTS WITH POLLING DATA
                  </span>
                </div>
                <HouseRaceGrid races={houseRaces} />
              </motion.div>
            )}

            {centerTab === "POLLS" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <PollingPanel />
              </motion.div>
            )}

            {centerTab === "NEWS" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-3 py-2 border-b border-[#0d1a0d] flex items-center gap-1.5">
                  <BlinkDot />
                  <span className="text-[#334433] font-mono text-[8px]">POLL ACTIVITY FEED · UPDATING</span>
                </div>
                <NewsFeed />
              </motion.div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-[300px] shrink-0 flex flex-col overflow-y-auto">
          {/* Race Status Overview */}
          <div className="border-b border-[#1a2a1a] p-3">
            <PanelHeader title="RACE STATUS OVERVIEW" icon={Activity} />
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: "SAFE D", count: bd?.sSafeD ?? 0, color: "#3b82f6" },
                { label: "LIKELY D", count: bd?.sLikelyD ?? 0, color: "#60a5fa" },
                { label: "LEAN D", count: bd?.sLeanD ?? 0, color: "#93c5fd" },
                { label: "TOSS-UP", count: bd?.sTossUp ?? 0, color: "#fbbf24" },
                { label: "LEAN R", count: bd?.sLeanR ?? 0, color: "#fca5a5" },
                { label: "LIKELY R", count: bd?.sLikelyR ?? 0, color: "#f87171" },
                { label: "", count: 0, color: "transparent" },
                { label: "SAFE R", count: bd?.sSafeR ?? 0, color: "#ef4444" },
                { label: "", count: 0, color: "transparent" },
              ].map((s, i) => (
                s.label ? (
                  <div
                    key={i}
                    className="flex flex-col items-center bg-[#050d05] border border-[#1a2a1a] py-2 px-1 rounded-sm"
                    style={{ borderColor: `${s.color}30` }}
                  >
                    <span className="font-mono text-[15px] font-bold" style={{ color: s.color }}>{s.count}</span>
                    <span className="font-mono text-[6px] tracking-widest mt-0.5" style={{ color: s.color + "aa" }}>
                      {s.label}
                    </span>
                  </div>
                ) : <div key={i} />
              ))}
            </div>
          </div>

          {/* Most Polled Races */}
          <div className="border-b border-[#1a2a1a]">
            <PanelHeader title="MOST POLLED RACES" icon={TrendingUp} sub="SENATE" />
            <div className="flex flex-col divide-y divide-[#0a100a]">
              {topPolled.map((r, i) => (
                <button
                  key={r.stateCode}
                  onClick={() => setSelectedRace(r)}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#0a150a] transition-colors text-left w-full"
                >
                  <span className="text-[#334433] font-mono text-[9px] w-4">{i + 1}</span>
                  <div
                    className="w-1 h-3 rounded-sm"
                    style={{
                      background: r.margin > 0 ? "#3b82f6" : r.margin < 0 ? "#ef4444" : "#fbbf24",
                    }}
                  />
                  <span className="text-[#888] font-mono text-[8px] flex-1">
                    {r.stateCode} — {r.demCandidate} vs {r.repCandidate}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-[#00ff41]">
                    {r.pollCount}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Poll Density */}
          <div className="border-b border-[#1a2a1a]">
            <PanelHeader title="POLL DENSITY" icon={BarChart2} sub="BY STATE" />
            <div className="flex flex-col divide-y divide-[#0a100a]">
              {sortedByPolls.slice(0, 10).map((r) => {
                const maxPolls = sortedByPolls[0]?.pollCount ?? 1;
                const pct = maxPolls > 0 ? (r.pollCount / maxPolls) * 100 : 0;
                return (
                  <div key={r.stateCode} className="px-3 py-1.5 hover:bg-[#0a150a] transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#00ff41] font-mono text-[9px] font-bold">{r.stateCode}</span>
                      <span className="text-[#445544] font-mono text-[8px]">{r.pollCount} polls</span>
                    </div>
                    <div className="h-1.5 bg-[#0a150a] rounded-sm overflow-hidden">
                      <div
                        className="h-full rounded-sm transition-all"
                        style={{ width: `${pct}%`, background: "#00ff41" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data status */}
          <div className="border-b border-[#1a2a1a] p-3">
            <div className="text-[#334433] font-mono text-[8px] tracking-widest mb-2">DATA STATUS</div>
            <div className="flex flex-col gap-2">
              {[
                { label: "SENATE POLLS", val: totalSenatePolls, color: "#00ff41" },
                { label: "HOUSE POLLS", val: totalHousePolls, color: "#00ff41" },
                { label: "SENATE RACES", val: senateRaces.length, color: "#00ff41" },
                { label: "HOUSE DISTRICTS", val: houseRaces.length, color: "#00ff41" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="text-[#334433] font-mono text-[8px] tracking-widest w-28">{s.label}</span>
                  <span className="font-mono text-[11px] font-bold" style={{ color: s.color }}>{s.val}</span>
                </div>
              ))}
              <div className="flex items-center gap-1 mt-1">
                <BlinkDot />
                <span className="text-[#334433] font-mono text-[7px]">
                  {lastRefresh
                    ? `Last refresh: ${lastRefresh.toLocaleTimeString()}`
                    : "Refreshing..."}
                </span>
              </div>
            </div>
          </div>

          {/* Seats At Stake */}
          <div className="border-b border-[#1a2a1a]">
            <PanelHeader title="SEATS AT STAKE" icon={Database} sub="SENATE 2026" />
            <div className="p-3 flex flex-col gap-2">
              {[
                { label: "CLASS II UP", val: senateRaces.length, color: "#00ff41", note: "This cycle" },
                { label: "COMPETITIVE", val: competitiveRaces, color: "#fbbf24", note: "Toss-up/Lean" },
                { label: "WITH POLLING", val: racesWithPolls, color: "#00ff41", note: "Wikipedia data" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="text-[#334433] font-mono text-[8px] tracking-widest w-28">{s.label}</span>
                  <div className="flex-1 h-1.5 bg-[#0a150a] rounded-sm overflow-hidden">
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width: `${senateRaces.length > 0 ? (s.val / senateRaces.length) * 100 : 0}%`,
                        background: s.color,
                      }}
                    />
                  </div>
                  <span className="font-mono text-[11px] font-bold" style={{ color: s.color }}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* STATUS BAR */}
      <footer className="flex items-center gap-4 px-4 py-1.5 bg-[#020802] border-t border-[#1a2a1a]">
        <div className="flex items-center gap-1.5">
          <BlinkDot color={error ? "#ef4444" : "#00ff41"} />
          <span className="text-[#334433] font-mono text-[7px] tracking-widest">
            {error ? "DATA ERROR" : "SYS OK"}
          </span>
        </div>
        <span className="text-[#1a2a1a]">|</span>
        <span className="text-[#334433] font-mono text-[7px]">DATA: WIKIPEDIA POLLING TABLES</span>
        <span className="text-[#1a2a1a]">|</span>
        <span className="text-[#334433] font-mono text-[7px]">
          {totalSenatePolls + totalHousePolls} TOTAL UNIQUE POLLS INDEXED
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[#334433] font-mono text-[7px]">v1.0.0-2026</span>
          <span className="text-[#334433] font-mono text-[7px]">BELLWETHER</span>
        </div>
      </footer>

      {/* RACE DETAIL MODAL */}
      <RaceDetailModal race={selectedRace} onClose={() => setSelectedRace(null)} />
    </div>
  );
}

export default function ElectionsDashboard() {
  return (
    <ElectionDataProvider>
      <DashboardContent />
    </ElectionDataProvider>
  );
}
