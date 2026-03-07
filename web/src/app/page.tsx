"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import dynamic from "next/dynamic";
const USAMap = dynamic(() => import("@/components/elections/USAMap").then(m => ({ default: m.USAMap })), { ssr: false });
import { StateDetailView } from "@/components/elections/StateDetailView";
import { type SenateRace } from "@/lib/electionData";
import {
  Activity, TrendingUp, Newspaper, BarChart2,
  Users, Database, Radio, Map, ChevronRight, RefreshCw,
} from "lucide-react";

type Tab = "SENATE" | "HOUSE" | "POLLS" | "NEWS";
type MainView = "dashboard" | "map" | "state";

function PanelHeader({
  title, icon: Icon, sub, right,
}: {
  title: string; icon: React.ElementType; sub?: string; right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1c2333] bg-[#0b0f16] sticky top-0 z-10">
      <Icon size={10} className="text-[#d4a843] shrink-0" />
      <span className="text-[#8b949e] font-mono text-[9px] font-bold tracking-widest">{title}</span>
      {sub && <span className="text-[#2a3447] font-mono text-[7px] ml-1">{sub}</span>}
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

function Dot({ color = "#d4a843" }: { color?: string }) {
  return <span className="inline-block w-1.5 h-1.5 rounded-full blink" style={{ background: color }} />;
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#080c12] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 bg-[#d4a843] flex items-center justify-center">
          <span className="text-[#080c12] font-bold text-[14px] leading-none">B</span>
        </div>
        <div className="text-[#c9d1d9] font-mono text-[11px] tracking-[0.3em] glow-text">
          BELLWETHER
        </div>
        <div className="flex items-center gap-2">
          <RefreshCw size={12} className="text-[#d4a843] animate-spin" />
          <span className="text-[#3d4a5c] font-mono text-[9px] tracking-widest">
            CONNECTING TO DATA FEED...
          </span>
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-[#080c12] flex items-center justify-center">
      <div className="flex flex-col items-center gap-5 max-w-sm text-center px-6">
        <div className="w-8 h-8 bg-[#3a0a0a] border border-[#7f1d1d] flex items-center justify-center">
          <span className="text-[#f87171] font-bold text-[14px] leading-none">!</span>
        </div>
        <div className="text-[#c9d1d9] font-mono text-[11px] tracking-[0.3em]">
          BELLWETHER — OFFLINE
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="text-[#f87171] font-mono text-[8px] tracking-widest">
            ⚠ DATA FEED UNAVAILABLE
          </div>
          <div className="text-[#3d4a5c] font-mono text-[7px] leading-relaxed">
            Unable to connect to the API backend at{" "}
            <span className="text-[#8b949e]">127.0.0.1:8000</span>. Ensure the
            FastAPI server is running and reachable.
          </div>
          <div className="text-[#2a3447] font-mono text-[6.5px] mt-1 break-all">{error}</div>
        </div>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-[#0b0f16] border border-[#1c2333] text-[#d4a843] font-mono text-[8px] tracking-widest hover:border-[#d4a843] transition-colors"
        >
          <RefreshCw size={10} />
          RETRY CONNECTION
        </button>
        <div className="text-[#1c2333] font-mono text-[6.5px]">
          Start backend: <span className="text-[#2a3447]">uvicorn api.main:app --reload --port 8000</span>
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const {
    senateRaces, houseRaces,
    seatBalance, totalSenatePolls, totalHousePolls,
    loading, error, lastRefresh, refetch,
  } = useElectionData();

  const [selectedRace, setSelectedRace] = useState<SenateRace | null>(null);
  const [centerTab, setCenterTab] = useState<Tab>("SENATE");
  const [mainView, setMainView] = useState<MainView>("dashboard");
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  if (loading) return <LoadingSkeleton />;
  if (error && senateRaces.length === 0) return <ErrorScreen error={error} onRetry={refetch} />;

  const tabs: Tab[] = ["SENATE", "HOUSE", "POLLS", "NEWS"];
  const tabIcons: Record<Tab, React.ElementType> = {
    SENATE: Database, HOUSE: Users, POLLS: BarChart2, NEWS: Newspaper,
  };

  const handleStateClick = (code: string) => {
    const hasSenate = senateRaces.some((r) => r.stateCode === code);
    const hasHouse = houseRaces.some((r) => r.stateCode === code);
    if (hasSenate || hasHouse) {
      setSelectedState(code);
      setMainView("state");
    }
  };

  const handleBack = () => {
    setMainView("dashboard");
    setSelectedState(null);
  };

  const bd = seatBalance.senate.breakdown;
  const competitiveRaces = senateRaces.filter((r) => r.key).length;
  const calledRaces = senateRaces.filter((r) => r.called).length;
  const uncalledRaces = senateRaces.length - calledRaces;
  const tossUpRaces = senateRaces.filter((r) => r.lean === "Toss-Up").length;

  return (
    <div
      className="h-screen bg-[#080c12] text-[#c9d1d9] flex flex-col overflow-hidden scanline"
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      {/* HEADER */}
      <header className="flex items-center gap-0 px-4 py-0 bg-[#080c12] border-b border-[#1c2333] shrink-0 h-11">
        <div className="flex items-center gap-2.5 pr-4 border-r border-[#1c2333] h-full">
          <div className="w-5 h-5 bg-[#d4a843] flex items-center justify-center shrink-0">
            <span className="text-[#080c12] font-bold text-[10px] leading-none font-mono">B</span>
          </div>
          <div>
            <div className="text-[#c9d1d9] font-mono text-[11px] font-bold tracking-[0.18em]">BELLWETHER</div>
            <div className="text-[#2a3447] font-mono text-[6.5px] tracking-widest">U.S. CONGRESSIONAL TRACKER · 2026 CYCLE</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-4 border-r border-[#1c2333] h-full">
          <Dot />
          <span className="text-[#d4a843] font-mono text-[7.5px] tracking-widest">
            {error ? "OFFLINE" : "LIVE"}
          </span>
        </div>

        <div className="flex items-center gap-2 px-4 border-r border-[#1c2333] h-full">
          {[
            { label: "RACES", value: String(senateRaces.length), color: "#d4a843" },
            { label: "BATTLEGROUNDS", value: String(competitiveRaces), color: "#fbbf24" },
            { label: "TOSS-UPS", value: String(tossUpRaces), color: "#f87171" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 bg-[#0b0f16] px-2 py-0.5 border border-[#1c2333]">
              <span style={{ color: s.color }} className="font-mono text-[12px] font-bold">{s.value}</span>
              <span className="text-[#2a3447] font-mono text-[6.5px] tracking-widest">{s.label}</span>
            </div>
          ))}
        </div>

        <nav className="flex items-center h-full border-r border-[#1c2333]">
          {[
            { label: "OVERVIEW", view: "dashboard" as MainView },
            { label: "MAP", view: "map" as MainView },
          ].map((n) => (
            <button
              key={n.label}
              onClick={() => { setMainView(n.view); setSelectedState(null); }}
              className={`px-3 h-full text-[7.5px] tracking-widest font-mono transition-colors border-r border-[#1c2333] ${
                mainView === n.view
                  ? "text-[#d4a843] bg-[#0d1117]"
                  : "text-[#3d4a5c] hover:text-[#8b949e] hover:bg-[#0b0f16]"
              }`}
            >
              {n.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 pr-4">
          <button
            onClick={refetch}
            className="text-[#3d4a5c] hover:text-[#d4a843] transition-colors p-1"
            title="Refresh data"
          >
            <RefreshCw size={12} />
          </button>
          <TerminalClock />
        </div>
      </header>

      <LiveTicker />
      <KeyMetricStrip />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <AnimatePresence mode="wait">
          {mainView === "state" && selectedState ? (
            <motion.div
              key="state"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex-1 flex overflow-hidden min-h-0"
            >
              <StateDetailView stateCode={selectedState} onBack={handleBack} senateRaces={senateRaces} houseRaces={houseRaces} />
            </motion.div>
          ) : mainView === "map" ? (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col overflow-hidden min-h-0"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-[#1c2333] bg-[#0b0f16] shrink-0">
                <div className="flex items-center gap-2">
                  <Map size={10} className="text-[#d4a843]" />
                  <span className="text-[#8b949e] font-mono text-[9px] font-bold tracking-widest">FULL MAP VIEW</span>
                  <span className="text-[#2a3447] font-mono text-[7px]">CLICK ANY STATE WITH RACES FOR DETAIL</span>
                </div>
                <div className="flex items-center gap-3">
                  {[
                    { label: "SAFE D", color: "#1a3a6b" }, { label: "LEAN D", color: "#1a3a5c" },
                    { label: "TOSS-UP", color: "#3a3200" }, { label: "LEAN R", color: "#5a1a1a" },
                    { label: "SAFE R", color: "#7a1a1a" },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-sm" style={{ background: l.color }} />
                      <span className="text-[#2a3447] font-mono text-[6.5px] tracking-widest">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-auto flex flex-col items-stretch p-4">
                <USAMap
                  senateRaces={senateRaces}
                  houseRaces={houseRaces}
                  onStateClick={(code) => {
                    const hasSenate = senateRaces.some((r) => r.stateCode === code);
                    const hasHouse = houseRaces.some((r) => r.stateCode === code);
                    if (hasSenate || hasHouse) {
                      setSelectedState(code);
                      setMainView("state");
                    }
                  }}
                />
                <div className="mt-4 grid grid-cols-4 gap-2 max-w-4xl mx-auto w-full">
                  {senateRaces.filter((r) => r.key).map((r) => {
                    const color = r.margin > 0 ? "#93c5fd" : r.margin < 0 ? "#fca5a5" : "#d4a843";
                    return (
                      <button
                        key={r.stateCode}
                        onClick={() => { setSelectedState(r.stateCode); setMainView("state"); }}
                        className="flex items-center justify-between px-3 py-2 bg-[#0b0f16] border hover:bg-[#0d1117] transition-colors"
                        style={{ borderColor: `${color}30` }}
                      >
                        <span className="font-mono text-[10px] font-bold" style={{ color }}>{r.stateCode}</span>
                        <span className="text-[#3d4a5c] font-mono text-[7px]">{r.lean}</span>
                        <span className="font-mono text-[10px] font-bold" style={{ color }}>
                          {r.margin >= 0 ? "D" : "R"}{Math.abs(r.margin) > 0 ? `+${Math.abs(r.margin).toFixed(1)}` : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex overflow-hidden min-h-0"
            >
              {/* LEFT COLUMN */}
              <div className="w-[270px] shrink-0 flex flex-col border-r border-[#1c2333] overflow-y-auto">
                <div className="border-b border-[#1c2333]">
                  <PanelHeader title="SEAT BALANCE" icon={BarChart2} sub="PROJECTED" />
                  <div className="p-3">
                    <SeatMeter />
                  </div>
                </div>

                <div className="border-b border-[#1c2333]">
                  <PanelHeader title="CONTROL PROBABILITY" icon={TrendingUp} />
                  <ProbabilityChart />
                </div>

                <div className="border-b border-[#1c2333]">
                  <PanelHeader title="SENATE HISTORICAL" icon={Database} sub="SEATS" />
                  <div className="px-2 pb-2 pt-2">
                    <HistoricalSeatsChart chamber="senate" />
                  </div>
                </div>

                <div className="border-b border-[#1c2333]">
                  <PanelHeader title="HOUSE HISTORICAL" icon={Database} sub="SEATS" />
                  <div className="px-2 pb-2 pt-2">
                    <HistoricalSeatsChart chamber="house" />
                  </div>
                </div>

                {(() => {
                  // Senate 2026 non-contested baseline (after 2024 election):
                  //   R held 53; 11 Class-2 seats defending → 42 R non-contested
                  //   D held 47; 23 Class-2 seats defending → 24 D non-contested
                  const SEN_R_BASE = 42, SEN_D_BASE = 24;
                  const SEN_R_2024 = 53, SEN_D_2024 = 47; // pre-election seat counts
                  const { demProjected: sDem, repProjected: sRep, tossUp: sToss } = seatBalance.senate;
                  const { demProjected: hDem, repProjected: hRep, tossUp: hToss } = seatBalance.house;
                  const hTrack = hDem + hRep + hToss;

                  // Expected seats (toss-ups split 50/50)
                  const senDTotal = SEN_D_BASE + sDem + Math.round(sToss * 0.5);
                  const senRTotal = SEN_R_BASE + sRep + Math.round(sToss * 0.5);
                  // Senate control: D needs 51, R needs 50 (R holds WH → tie goes R)
                  const senRCtrlPct = Math.min(99, Math.max(1, Math.round((senRTotal / 100) * 100)));
                  const senDCtrlPct = 100 - senRCtrlPct;
                  // Net change from 2024 (R currently holds 53 senate seats from Class 1+3)
                  // Contested Class-2 seats: R held 11, D held 23
                  // Net R change = (42 + sRep + toss*0.5) - 53 = projected R total - 53
                  const netSenR = senRTotal - SEN_R_2024;
                  const netSenSign = netSenR >= 0 ? "+" : "";
                  // House: competitive-race tracker proxy (full picture requires all 435)
                  const houseRCtrlPct = hTrack > 0
                    ? Math.min(99, Math.max(1, Math.round(((hRep + hToss * 0.5) / hTrack) * 100)))
                    : 50;
                  const houseDCtrlPct = 100 - houseRCtrlPct;
                  // Net house signal: R projected - D projected among tracked competitive races
                  const netHseR = hRep - hDem;
                  const netHseSign = netHseR >= 0 ? "+" : "";

                  const ctrlParty = (rPct: number) => rPct >= 50 ? "R" : "D";
                  const ctrlColor = (rPct: number) => rPct >= 50 ? "#d95a5a" : "#4a90d9";

                  const gauges = [
                    { label: "SEN CTRL", val: Math.max(senRCtrlPct, senDCtrlPct), color: ctrlColor(senRCtrlPct), party: ctrlParty(senRCtrlPct), noBar: false },
                    { label: "HSE CTRL", val: Math.max(houseRCtrlPct, houseDCtrlPct), color: ctrlColor(houseRCtrlPct), party: ctrlParty(houseRCtrlPct), noBar: false },
                    { label: "NET SEN", val: `${netSenSign}${netSenR}`, color: netSenR >= 0 ? "#d95a5a" : "#4a90d9", noBar: true },
                    { label: "NET HSE", val: `${netHseSign}${netHseR}`, color: netHseR >= 0 ? "#d95a5a" : "#4a90d9", noBar: true },
                  ];
                  return (
                    <div className="border-b border-[#1c2333] p-3">
                      <div className="text-[#2a3447] font-mono text-[7px] tracking-widest mb-2">MODEL CONFIDENCE</div>
                      <div className="grid grid-cols-2 gap-2">
                        {gauges.map((g, i) => (
                          <div key={i} className="bg-[#0b0f16] border border-[#1c2333] p-2">
                            <div className="text-[#2a3447] font-mono text-[6.5px] tracking-widest mb-1">{g.label}</div>
                            <div className="font-mono text-[15px] font-bold" style={{ color: g.color }}>
                              {g.noBar ? g.val : `${g.val}%`}
                            </div>
                            {!g.noBar && (
                              <>
                                <div className="mt-1 h-0.5 bg-[#1c2333] rounded-sm overflow-hidden">
                                  <div className="h-full rounded-sm" style={{ width: `${g.val}%`, background: g.color }} />
                                </div>
                                <div className="text-[#2a3447] font-mono text-[6px] mt-0.5">{g.party} CONTROL</div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="p-3">
                  <div className="text-[#2a3447] font-mono text-[7px] tracking-widest mb-2">PREDICTION MARKETS</div>
                  <div className="text-[#2a3447] font-mono text-[7px] italic mb-2">Live market data not connected</div>
                  <div className="text-[#1c2333] font-mono text-[6.5px] mt-0.5">Polymarket / Kalshi composite</div>
                </div>
              </div>

              {/* CENTER — MAP + RACES */}
              <div className="flex-1 flex flex-col overflow-hidden min-w-0 border-r border-[#1c2333]">
                <div className="border-b border-[#1c2333] shrink-0">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#0b0f16] border-b border-[#1c2333]">
                    <div className="flex items-center gap-2">
                      <Map size={10} className="text-[#d4a843]" />
                      <span className="text-[#8b949e] font-mono text-[9px] font-bold tracking-widest">SENATE RACE MAP</span>
                      <span className="text-[#2a3447] font-mono text-[7px]">CLICK STATE FOR DETAIL</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Dot color="#d4a843" />
                      <span className="text-[#2a3447] font-mono text-[7px]">BATTLEGROUND STATES HIGHLIGHTED</span>
                    </div>
                  </div>
                  <USAMap
                    senateRaces={senateRaces}
                    houseRaces={houseRaces}
                    onStateClick={handleStateClick}
                  />
                </div>

                <div className="flex border-b border-[#1c2333] bg-[#080c12] shrink-0">
                  {tabs.map((tab) => {
                    const Icon = tabIcons[tab];
                    const active = centerTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setCenterTab(tab)}
                        className={`flex items-center gap-1.5 px-4 py-2 font-mono text-[8px] tracking-widest transition-colors border-r border-[#1c2333] ${
                          active
                            ? "text-[#d4a843] bg-[#0d1117] border-b-2 border-b-[#d4a843]"
                            : "text-[#3d4a5c] hover:text-[#8b949e] hover:bg-[#0b0f16]"
                        }`}
                      >
                        <Icon size={9} />
                        {tab}
                      </button>
                    );
                  })}
                  <div className="ml-auto flex items-center gap-3 px-4">
                    <div className="flex items-center gap-1">
                      <Radio size={9} className="text-[#d4a843] blink" />
                      <span className="text-[#2a3447] font-mono text-[7px]">LIVE</span>
                    </div>
                    <span className="text-[#1c2333]">|</span>
                    <span className="text-[#2a3447] font-mono text-[7px]">
                      {lastRefresh
                        ? `SYNC ${lastRefresh.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} ET`
                        : "SYNCING..."}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {centerTab === "SENATE" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
                      <div className="px-4 py-1.5 border-b border-[#0f1520] flex items-center gap-2">
                        <span className="text-[#2a3447] font-mono text-[7px]">
                          {senateRaces.length} RACES TRACKED · {senateRaces.filter((r) => r.pollCount > 0).length} WITH POLLS · CLICK ROW FOR DETAIL
                        </span>
                        <ChevronRight size={8} className="text-[#2a3447]" />
                      </div>
                      <SenateRacesList races={senateRaces} onSelect={setSelectedRace} />
                    </motion.div>
                  )}
                  {centerTab === "HOUSE" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
                      <div className="px-4 py-1.5 border-b border-[#0f1520]">
                        <span className="text-[#2a3447] font-mono text-[7px]">
                          {houseRaces.length} KEY DISTRICTS · TOSS-UP OR COMPETITIVE
                        </span>
                      </div>
                      <HouseRaceGrid races={houseRaces} />
                    </motion.div>
                  )}
                  {centerTab === "POLLS" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
                      <PollingPanel />
                    </motion.div>
                  )}
                  {centerTab === "NEWS" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
                      <div className="px-4 py-1.5 border-b border-[#0f1520] flex items-center gap-1.5">
                        <Dot />
                        <span className="text-[#2a3447] font-mono text-[7px]">LIVE WIRE · UPDATING</span>
                      </div>
                      <NewsFeed />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="w-[290px] shrink-0 flex flex-col overflow-y-auto">
                <div className="border-b border-[#1c2333]">
                  <PanelHeader title="RACE STATUS" icon={Activity} />
                  <div className="grid grid-cols-3 gap-1.5 p-3">
                    {[
                      { label: "SAFE D", count: bd.sSafeD, color: "#4a90d9" },
                      { label: "LIKELY D", count: bd.sLikelyD, color: "#60a5fa" },
                      { label: "LEAN D", count: bd.sLeanD, color: "#93c5fd" },
                      { label: "TOSS-UP", count: bd.sTossUp, color: "#d4a843" },
                      { label: "LEAN R", count: bd.sLeanR, color: "#fca5a5" },
                      { label: "LIKELY R", count: bd.sLikelyR, color: "#f87171" },
                      { label: "", count: 0, color: "transparent" },
                      { label: "SAFE R", count: bd.sSafeR, color: "#d95a5a" },
                      { label: "", count: 0, color: "transparent" },
                    ].map((s, i) => (
                      s.label ? (
                        <div
                          key={i}
                          className="flex flex-col items-center bg-[#0b0f16] border py-2 px-1"
                          style={{ borderColor: `${s.color}30` }}
                        >
                          <span className="font-mono text-[16px] font-bold" style={{ color: s.color }}>{s.count}</span>
                          <span className="font-mono text-[6px] tracking-widest mt-0.5" style={{ color: `${s.color}99` }}>
                            {s.label}
                          </span>
                        </div>
                      ) : <div key={i} />
                    ))}
                  </div>
                </div>

                <div className="border-b border-[#1c2333]">
                  <PanelHeader title="SEATS AT STAKE" icon={Database} sub="SENATE 2026" />
                  <div className="p-3 flex flex-col gap-2">
                    {[
                      { label: "D SEATS DEFENDING", val: 23, color: "#4a90d9", total: 34 },
                      { label: "R SEATS DEFENDING", val: 11, color: "#d95a5a", total: 34 },
                      { label: "TOTAL CONTESTED", val: 34, color: "#d4a843", total: 34 },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center gap-2">
                        <span className="text-[#2a3447] font-mono text-[6.5px] tracking-widest w-28">{s.label}</span>
                        <div className="flex-1 h-1 bg-[#0b0f16] rounded-sm overflow-hidden">
                          <div className="h-full rounded-sm" style={{ width: `${(s.val / s.total) * 100}%`, background: s.color }} />
                        </div>
                        <span className="font-mono text-[11px] font-bold w-5 text-right" style={{ color: s.color }}>{s.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-b border-[#1c2333]">
                  <PanelHeader title="TOP FUNDRAISERS" icon={TrendingUp} sub="SENATE" />
                  <div className="flex flex-col divide-y divide-[#0f1520]">
                    {(() => {
                      const fundraisers = senateRaces
                        .filter((r) => r.moneyRaised)
                        .flatMap((r) => [
                          { name: `${r.demCandidate.split(" ").pop()} (D-${r.stateCode})`, raised: r.moneyRaised!.dem, party: "D" },
                          { name: `${r.repCandidate.split(" ").pop()} (R-${r.stateCode})`, raised: r.moneyRaised!.rep, party: "R" },
                        ])
                        .sort((a, b) => b.raised - a.raised)
                        .slice(0, 6);
                      if (fundraisers.length === 0) {
                        return <div className="px-3 py-4 text-[#3d4a5c] font-mono text-[8px] text-center">No fundraising data</div>;
                      }
                      return fundraisers.map((f, i) => (
                        <div key={f.name} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#0b0f16] transition-colors">
                          <span className="text-[#2a3447] font-mono text-[8px] w-3">{i + 1}</span>
                          <div className="w-0.5 h-3 rounded-sm" style={{ background: f.party === "D" ? "#4a90d9" : "#d95a5a" }} />
                          <span className="text-[#8b949e] font-mono text-[8px] flex-1">{f.name}</span>
                          <span className="font-mono text-[9px] font-bold" style={{ color: f.party === "D" ? "#4a90d9" : "#d95a5a" }}>
                            ${f.raised}M
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                <div className="border-b border-[#1c2333]">
                  <PanelHeader title="COMPETITIVE INDEX" icon={Activity} />
                  <div className="p-3 flex flex-wrap gap-1">
                    {senateRaces
                      .filter((r) => r.key)
                      .map((r) => {
                        const color = r.margin > 0 ? "#93c5fd" : r.margin < 0 ? "#fca5a5" : "#d4a843";
                        return (
                          <div
                            key={r.stateCode}
                            className="w-7 h-7 flex items-center justify-center font-mono text-[9px] font-bold border cursor-pointer hover:scale-110 transition-transform"
                            style={{
                              background: `${color}18`,
                              color: color,
                              borderColor: `${color}40`,
                            }}
                            onClick={() => {
                              setSelectedState(r.stateCode);
                              setMainView("state");
                            }}
                          >
                            {r.stateCode}
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="p-3">
                  <div className="text-[#2a3447] font-mono text-[7px] tracking-widest mb-2">DATA SOURCES</div>
                  <div className="text-[#3d4a5c] font-mono text-[7px] leading-relaxed">
                    AP WIRE · COOK POLITICAL · 538 · RCP · POLYMARKET · KALSHI
                  </div>
                  {error && (
                    <div className="mt-2 text-[#f87171] font-mono text-[7px]">
                      ⚠ {error}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* STATUS BAR */}
      <footer className="flex items-center gap-3 px-4 py-1 bg-[#080c12] border-t border-[#1c2333] shrink-0">
        <div className="flex items-center gap-1.5">
          <Dot color={error ? "#f87171" : "#4ade80"} />
          <span className="text-[#2a3447] font-mono text-[7px] tracking-widest">
            {error ? "API ERROR" : "SYS NOMINAL"}
          </span>
        </div>
        <span className="text-[#1c2333]">│</span>
        <span className="text-[#2a3447] font-mono text-[7px]">
          SEN: {totalSenatePolls} POLLS · HSE: {totalHousePolls} POLLS · {senateRaces.length} RACES
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[#2a3447] font-mono text-[7px]">v3.0.0-BELLWETHER</span>
          <span className="text-[#2a3447] font-mono text-[7px]">© 2026 BELLWETHER</span>
        </div>
      </footer>

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
