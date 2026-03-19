"use client";
import { useState, useEffect, useMemo } from "react";
import { ElectionDataProvider, useElectionData } from "@/lib/ElectionDataContext";
import { type SenateRace, type HouseRace, type Matchup, STATE_NAMES, BATTLEGROUND_MARGIN_THRESHOLD, STATE_ELECTION_HISTORY, MATCHUP_MIN_POLLS, type StateElectionResult } from "@/lib/electionData";
import { SEN_D_BASE, SEN_R_BASE, TREND_MIN_SHIFT, TREND_MIN_POLLS, TREND_WINDOW, INDEPENDENT_CANDIDATES, IND_COLOR } from "@/lib/constants";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import dynamic from "next/dynamic";
const SenateMap = dynamic(() => import("@/components/elections/USAMap").then(m => ({ default: m.SenateMap })), { ssr: false });

type Tab = "SENATE" | "HOUSE";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const mono = "var(--font-geist-mono), 'Geist Mono', monospace";
const serif = "'Instrument Serif', serif";

function leanDot(lean: string): string {
  if (lean.includes("D")) return "var(--dem)";
  if (lean.includes("R")) return "var(--rep)";
  return "var(--tossup)";
}

function marginLabel(margin: number): string {
  if (Math.abs(margin) < 0.1) return "EVEN";
  const party = margin > 0 ? "D" : "R";
  return `${party}+${Math.abs(margin).toFixed(1)}`;
}

function marginColor(margin: number): string {
  if (Math.abs(margin) < 0.1) return "var(--tossup-text)";
  return margin > 0 ? "var(--dem)" : "var(--rep)";
}

/**
 * Polling trend: compares the average margin of the last 3 polls vs the prior 3.
 * Positive shift = moving toward D, negative = moving toward R.
 */
function pollTrend(race: SenateRace): { shift: number; label: string; color: string } | null {
  const samples = race.pollingSamples;
  if (samples.length < TREND_MIN_POLLS) return null;
  const recent = samples.slice(-TREND_WINDOW);
  const prior = samples.slice(-(TREND_WINDOW * 2), -TREND_WINDOW);
  if (prior.length < 2) return null;
  const recentAvg = recent.reduce((s, p) => s + (p.dem - p.rep), 0) / recent.length;
  const priorAvg = prior.reduce((s, p) => s + (p.dem - p.rep), 0) / prior.length;
  const shift = Math.round((recentAvg - priorAvg) * 10) / 10;
  if (Math.abs(shift) < TREND_MIN_SHIFT) return null;
  return {
    shift,
    label: shift > 0 ? `D+${Math.abs(shift).toFixed(1)}` : `R+${Math.abs(shift).toFixed(1)}`,
    color: shift > 0 ? "var(--dem)" : "var(--rep)",
  };
}

/** Get the 2024 presidential margin for a state (positive = R). */
function presBaseline(stateCode: string): { margin: number; label: string; color: string } | null {
  const history = STATE_ELECTION_HISTORY[stateCode];
  if (!history) return null;
  const pres2024 = history.find((h) => h.label === "2024 PRES");
  if (!pres2024) return null;
  return {
    margin: pres2024.margin,
    label: pres2024.margin > 0 ? `R+${pres2024.margin.toFixed(1)}` : `D+${Math.abs(pres2024.margin).toFixed(1)}`,
    color: pres2024.margin > 0 ? "var(--rep)" : "var(--dem)",
  };
}

function TrendHeader({ active, onClick }: { active: boolean; onClick: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="flex items-center justify-center gap-1"
      style={{ fontSize: 11, color: "var(--text-faint)", width: 75, flexShrink: 0, position: "relative" as const, cursor: "pointer", borderBottom: active ? "1px solid var(--text-muted)" : "none" }}
      onClick={onClick}
    >
      Trend{active ? " ↓" : ""}
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 14, height: 14, borderRadius: "50%", border: "1px solid var(--border)",
          fontSize: 9, color: "var(--text-faint)", cursor: "help", flexShrink: 0,
        }}
      >
        ?
      </span>
      {show && (
        <div style={{
          position: "absolute" as const, top: 24, left: "50%", transform: "translateX(-50%)",
          background: "#FAFAF8", color: "var(--text-secondary)", padding: "10px 14px", borderRadius: 8,
          fontSize: 12, lineHeight: "17px", width: 220, zIndex: 9999, fontWeight: 400,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid var(--border)",
          animation: "fadeIn 0.12s ease-out",
        }}>
          Compares the average margin of the last 3 polls to the prior 3. Shows which direction the race is moving.
        </div>
      )}
    </span>
  );
}

function isIndependent(candidateName: string): { note: string } | null {
  return INDEPENDENT_CANDIDATES[candidateName] ?? null;
}

function demColor(candidateName: string): string {
  return isIndependent(candidateName) ? IND_COLOR : "var(--dem)";
}

function incumbentLabel(race: SenateRace): string {
  if (!race.incumbent) return "Open seat";
  const name = race.incumbentName ?? "";
  return name ? `Inc. ${name} (${race.incumbent})` : `Inc. (${race.incumbent})`;
}

// ---------------------------------------------------------------------------
// Loading / Error
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="flex flex-col items-center gap-4">
        <span style={{ fontFamily: serif, fontSize: 36, color: "var(--text-primary)" }}>Bellwether</span>
        <div className="flex items-center gap-2">
          <RefreshCw size={14} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading election data...</span>
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="flex flex-col items-center gap-5 max-w-sm text-center px-6">
        <span style={{ fontFamily: serif, fontSize: 36, color: "var(--text-primary)" }}>Bellwether</span>
        <div className="flex flex-col gap-2">
          <span style={{ fontSize: 13, color: "var(--rep)", fontWeight: 500 }}>Unable to connect to API</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: "18px" }}>
            Make sure the FastAPI backend is running on port 8000.
          </span>
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{error}</span>
        </div>
        <button onClick={onRetry} className="flex items-center gap-2 px-5 py-2.5 rounded-md" style={{ background: "var(--text-primary)", color: "var(--bg)", fontSize: 12, fontWeight: 500 }}>
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Senate Race Row (clickable)
// ---------------------------------------------------------------------------

function SenateRaceRow({ race, onClick }: { race: SenateRace; onClick: () => void }) {
  const trend = pollTrend(race);
  const baseline = presBaseline(race.stateCode);

  return (
    <div
      className="flex items-center py-3.5 px-10 transition-colors"
      style={{ borderBottom: "1px solid var(--border-subtle)", cursor: "pointer" }}
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div className="flex flex-col gap-0.5" style={{ width: 160, flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{race.state}</span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{incumbentLabel(race)}</span>
      </div>
      <div className="flex items-center gap-1.5" style={{ width: 90, flexShrink: 0 }}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: leanDot(race.lean) }} />
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{race.lean}</span>
      </div>
      <div className="flex flex-col gap-0.5" style={{ width: 140, flexShrink: 0 }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 13, fontWeight: 500, color: demColor(race.demCandidate) }}>{race.demCandidate}</span>
          {isIndependent(race.demCandidate) && (
            <span style={{ fontSize: 9, fontWeight: 500, color: IND_COLOR, background: "rgba(107,91,149,0.1)", padding: "1px 4px", borderRadius: 3, letterSpacing: "0.03em" }}>IND</span>
          )}
        </div>
        <span style={{ fontFamily: mono, fontSize: 12, color: demColor(race.demCandidate) }}>{race.demPct > 0 ? `${race.demPct}%` : "—"}</span>
      </div>
      <div className="flex flex-col gap-0.5" style={{ width: 140, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--rep)" }}>{race.repCandidate}</span>
        <span style={{ fontFamily: mono, fontSize: 12, color: "var(--rep)" }}>{race.repPct > 0 ? `${race.repPct}%` : "—"}</span>
      </div>
      <div className="flex items-center justify-center" style={{ width: 75, flexShrink: 0 }}>
        {baseline ? (
          <span style={{ fontFamily: mono, fontSize: 13, color: baseline.color }}>{baseline.label}</span>
        ) : (
          <span style={{ fontSize: 13, color: "var(--text-faint)" }}>—</span>
        )}
      </div>
      <div className="flex items-center justify-center" style={{ width: 75, flexShrink: 0 }}>
        {trend ? (
          <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 500, color: trend.color }}>
            {trend.shift > 0 ? "↑" : "↓"} {trend.label}
          </span>
        ) : (
          <span style={{ fontSize: 13, color: "var(--text-faint)" }}>—</span>
        )}
      </div>
      <div className="flex items-center justify-center" style={{ width: 55, flexShrink: 0 }}>
        <span style={{ fontFamily: mono, fontSize: 13, color: "var(--text-muted)" }}>
          {race.pollCount > 0 ? race.pollCount : "—"}
        </span>
      </div>
      <div className="flex items-center justify-end" style={{ marginLeft: "auto" }}>
        {race.demPct > 0 || race.repPct > 0 ? (
          <span style={{
            fontFamily: mono, fontSize: 13, fontWeight: 700, letterSpacing: "0.02em",
            color: "#fff",
            background: race.margin > 0 ? "var(--dem)" : race.margin < 0 ? "var(--rep)" : "var(--tossup-text)",
            padding: "4px 10px", borderRadius: 5,
          }}>
            {marginLabel(race.margin)}
          </span>
        ) : (
          <span style={{ fontSize: 13, color: "var(--text-faint)" }}>—</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// House Race Row
// ---------------------------------------------------------------------------

function HouseRaceRow({ race }: { race: HouseRace }) {
  const margin = race.demPct - race.repPct;
  return (
    <div
      className="flex items-center py-3.5 px-10 transition-colors"
      style={{ borderBottom: "1px solid var(--border-subtle)", cursor: "default" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div className="flex flex-col gap-0.5" style={{ width: 180, flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{race.district}</span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{race.state}</span>
      </div>
      <div className="flex items-center gap-1.5" style={{ width: 100, flexShrink: 0 }}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: leanDot(race.lean) }} />
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{race.lean}</span>
      </div>
      <div className="flex flex-col gap-0.5" style={{ width: 160, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--dem)" }}>{race.demCandidate}</span>
        <span style={{ fontFamily: mono, fontSize: 12, color: "var(--dem)" }}>{race.demPct > 0 ? `${race.demPct}%` : "—"}</span>
      </div>
      <div className="flex flex-col gap-0.5" style={{ width: 160, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--rep)" }}>{race.repCandidate}</span>
        <span style={{ fontFamily: mono, fontSize: 12, color: "var(--rep)" }}>{race.repPct > 0 ? `${race.repPct}%` : "—"}</span>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        {race.pollCount > 0 && (
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{race.pollCount} poll{race.pollCount !== 1 ? "s" : ""}</span>
        )}
        <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 600, color: marginColor(margin) }}>
          {race.demPct > 0 || race.repPct > 0 ? marginLabel(margin) : "—"}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent Polls Sidebar Card
// ---------------------------------------------------------------------------

function RecentPollCard({ poll, onClick }: { poll: { pollster: string; state: string; dem: string; demPct: number; rep: string; repPct: number; date: string; sampleSize?: number; population?: string }; onClick?: () => void }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-md transition-colors"
      style={{ cursor: onClick ? "pointer" : "default", padding: "6px 8px", margin: "-6px -8px" }}
      onClick={onClick}
      onMouseEnter={(e) => onClick && (e.currentTarget.style.background = "var(--bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{poll.pollster} — {poll.state}</span>
        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{poll.date}</span>
      </div>
      <div className="flex items-center gap-3">
        <span style={{ fontFamily: mono, fontSize: 12, color: "var(--dem)" }}>{poll.dem} {poll.demPct}</span>
        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>vs</span>
        <span style={{ fontFamily: mono, fontSize: 12, color: "var(--rep)" }}>{poll.rep} {poll.repPct}</span>
      </div>
      {poll.sampleSize && (
        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>n={poll.sampleSize.toLocaleString()} {poll.population || ""}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// All States Grid (clickable)
// ---------------------------------------------------------------------------

function AllStatesGrid({ senateRaces, tab, onSelect }: { senateRaces: SenateRace[]; tab: Tab; onSelect: (code: string) => void }) {
  if (tab !== "SENATE") return null;

  const racesByState = useMemo(() => {
    const map: Record<string, SenateRace> = {};
    for (const r of senateRaces) map[r.stateCode] = r;
    return map;
  }, [senateRaces]);

  const allStates = Object.keys(STATE_NAMES).filter((s) => s !== "DC").sort();

  return (
    <div className="flex flex-col gap-3">
      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>All States</span>
      <div className="flex flex-wrap gap-1.5">
        {allStates.map((code) => {
          const race = racesByState[code];
          const hasRace = !!race;
          const bg = hasRace ? (race.margin > 0 ? "var(--dem-bg)" : race.margin < 0 ? "var(--rep-bg)" : "rgba(212,197,160,0.2)") : "rgba(0,0,0,0.03)";
          const color = hasRace ? (race.margin > 0 ? "var(--dem)" : race.margin < 0 ? "var(--rep)" : "var(--tossup-text)") : "var(--text-faint)";
          return (
            <div
              key={code}
              className="flex items-center justify-center transition-transform"
              style={{
                width: 40, height: 30, borderRadius: 4, background: bg,
                fontFamily: mono, fontSize: 12, fontWeight: hasRace ? 600 : 400,
                color, opacity: hasRace ? 1 : 0.5,
                cursor: hasRace ? "pointer" : "default",
              }}
              title={hasRace ? `${race.state}: ${race.lean} (${marginLabel(race.margin)})` : `${STATE_NAMES[code]}: No race`}
              onClick={() => hasRace && onSelect(code)}
              onMouseEnter={(e) => hasRace && (e.currentTarget.style.transform = "scale(1.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {code}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Race Detail View (matches Paper design)
// ---------------------------------------------------------------------------

function RaceDetailView({ race, onBack, lastRefresh }: { race: SenateRace; onBack: () => void; lastRefresh: Date | null }) {
  const [matchupIdx, setMatchupIdx] = useState(0);
  const hasMultipleMatchups = race.matchups.length > 1;

  // Active matchup data — either from the switcher or the race defaults
  const active: Matchup = race.matchups[matchupIdx] ?? {
    demCandidate: race.demCandidate, repCandidate: race.repCandidate,
    demPct: race.demPct, repPct: race.repPct, margin: race.margin,
    lean: race.lean, pollingSamples: race.pollingSamples,
    pollCount: race.pollCount, latestPollDate: race.latestPollDate,
  };

  const isBattleground = race.key;
  const demBarPct = active.demPct + active.repPct > 0 ? (active.demPct / (active.demPct + active.repPct)) * 100 : 50;
  const stateHistory = STATE_ELECTION_HISTORY[race.stateCode];
  const chartData = active.pollingSamples.map((s) => ({ date: s.date, Dem: s.dem, Rep: s.rep }));

  // Matchup-specific fundraising from FEC candidates
  const matchupFundraising = useMemo(() => {
    if (!race.fecCandidates || race.fecCandidates.length === 0) return race.moneyRaised;
    const demName = active.demCandidate.toLowerCase();
    const repName = active.repCandidate.toLowerCase();
    // Find FEC candidate whose last name matches the polling candidate
    const demFec = race.fecCandidates
      .filter((c) => c.party === "DEM")
      .find((c) => c.name.toLowerCase().includes(demName));
    const repFec = race.fecCandidates
      .filter((c) => c.party === "REP")
      .find((c) => c.name.toLowerCase().includes(repName));
    // Fallback to top fundraiser if no name match
    const demFallback = !demFec ? race.fecCandidates.filter((c) => c.party === "DEM").sort((a, b) => b.receipts - a.receipts)[0] : undefined;
    const repFallback = !repFec ? race.fecCandidates.filter((c) => c.party === "REP").sort((a, b) => b.receipts - a.receipts)[0] : undefined;
    const d = demFec ?? demFallback;
    const r = repFec ?? repFallback;
    if (!d && !r) return race.moneyRaised;
    return {
      dem: Math.round((d?.receipts ?? 0) / 1e6 * 10) / 10,
      rep: Math.round((r?.receipts ?? 0) / 1e6 * 10) / 10,
    };
  }, [race.fecCandidates, race.moneyRaised, active.demCandidate, active.repCandidate]);

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header className="flex items-center px-10 shrink-0" style={{ height: 56, borderBottom: "1px solid var(--border)" }}>
        <button onClick={onBack} className="flex items-center gap-2 mr-6" style={{ color: "var(--text-muted)", fontSize: 13, background: "none", border: "none", cursor: "pointer" }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-baseline gap-3">
          <span style={{ fontFamily: serif, fontSize: 28, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Bellwether</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>2026 Midterms</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 40px 80px" }}>
          {/* Hero */}
          <div className="flex flex-col gap-2" style={{ marginBottom: 32 }}>
            <div className="flex items-center gap-2">
              <span style={{ fontFamily: mono, fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>2026 Senate Race</span>
              <span style={{ color: "var(--text-faint)" }}>·</span>
              <span style={{ fontFamily: mono, fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Class II</span>
              <span style={{ color: "var(--text-faint)" }}>·</span>
              <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: race.incumbent === "D" ? "var(--dem)" : race.incumbent === "R" ? "var(--rep)" : "var(--text-muted)" }}>
                {race.incumbent ? `${race.incumbent} Incumbent` : "Open Seat"}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span style={{ fontFamily: serif, fontSize: 80, color: "var(--text-primary)", letterSpacing: "-0.03em", lineHeight: "80px" }}>
                {race.state}
              </span>
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", padding: "4px 10px", borderRadius: 4, color: "#fff", background: active.lean.includes("D") ? "var(--dem)" : active.lean.includes("R") ? "var(--rep)" : "var(--tossup-text)" }}>
                  {active.lean.toUpperCase()}
                </span>
                {isBattleground && (
                  <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", padding: "4px 10px", borderRadius: 4, color: "var(--accent)", background: "rgba(184,92,56,0.1)" }}>
                    BATTLEGROUND
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Matchup Switcher */}
          {hasMultipleMatchups && (
            <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Matchup:</span>
              <div className="flex gap-1.5">
                {race.matchups.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => setMatchupIdx(i)}
                    style={{
                      fontFamily: mono,
                      fontSize: 12,
                      fontWeight: matchupIdx === i ? 600 : 400,
                      padding: "5px 12px",
                      borderRadius: 6,
                      border: matchupIdx === i ? "2px solid var(--text-primary)" : "1px solid var(--border)",
                      background: matchupIdx === i ? "var(--text-primary)" : "transparent",
                      color: matchupIdx === i ? "var(--bg)" : "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {m.demCandidate} vs {m.repCandidate}
                    <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>({m.pollCount})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Candidate Matchup */}
          <div className="flex items-center justify-between" style={{ padding: "24px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: demColor(active.demCandidate) }} />
                <span style={{ fontSize: 11, fontWeight: 500, color: demColor(active.demCandidate), letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
                  {isIndependent(active.demCandidate) ? "Independent" : "Democrat"}
                </span>
              </div>
              <span style={{ fontFamily: serif, fontSize: 32, color: "var(--text-primary)" }}>{active.demCandidate || "TBD"}</span>
              {isIndependent(active.demCandidate) ? (
                <span style={{ fontSize: 12, color: IND_COLOR }}>{isIndependent(active.demCandidate)!.note}</span>
              ) : race.incumbent === "D" && race.incumbentName && !race.called && race.incumbentName.toLowerCase().includes(active.demCandidate.toLowerCase()) ? (
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Incumbent U.S. Senator</span>
              ) : null}
            </div>
            <div className="flex items-baseline gap-3">
              <span style={{ fontFamily: serif, fontSize: 48, color: demColor(active.demCandidate), letterSpacing: "-0.02em" }}>
                {active.demPct > 0 ? active.demPct.toFixed(1) : "—"}
              </span>
              <span style={{ fontSize: 16, color: "var(--text-faint)" }}>vs</span>
              <span style={{ fontFamily: serif, fontSize: 48, color: "var(--rep)", letterSpacing: "-0.02em" }}>
                {active.repPct > 0 ? active.repPct.toFixed(1) : "—"}
              </span>
            </div>
            <div className="flex flex-col gap-1" style={{ textAlign: "right" }}>
              <div className="flex items-center gap-2 justify-end">
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--rep)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Republican</span>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--rep)" }} />
              </div>
              <span style={{ fontFamily: serif, fontSize: 32, color: "var(--text-primary)" }}>{active.repCandidate || "TBD"}</span>
              {race.incumbent === "R" && race.incumbentName && race.incumbentName.toLowerCase().includes(active.repCandidate.toLowerCase()) && (
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Incumbent U.S. Senator</span>
              )}
            </div>
          </div>

          {/* Aggregate Bar */}
          {(active.demPct > 0 || active.repPct > 0) && (
            <div style={{ padding: "20px 0 24px" }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <span style={{ fontFamily: mono, fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Polling Aggregate</span>
                <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: marginColor(active.margin) }}>
                  {marginLabel(active.margin)} margin
                </span>
              </div>
              <div className="flex overflow-hidden" style={{ height: 24, borderRadius: 4 }}>
                <div style={{ width: `${demBarPct}%`, background: "var(--dem)", transition: "width 0.3s" }} />
                <div style={{ flex: 1, background: "var(--rep)" }} />
              </div>
              <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
                <span style={{ fontFamily: mono, fontSize: 12, color: "var(--dem)" }}>{active.demPct.toFixed(1)}% {active.demCandidate}</span>
                <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{active.pollCount} poll{active.pollCount !== 1 ? "s" : ""} included</span>
                <span style={{ fontFamily: mono, fontSize: 12, color: "var(--rep)" }}>{active.repPct.toFixed(1)}% {active.repCandidate}</span>
              </div>
            </div>
          )}

          {/* Polling Trend Chart */}
          {chartData.length > 1 && (
            <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <span style={{ fontFamily: serif, fontSize: 24, color: "var(--text-primary)" }}>Polling Trend</span>
                <span style={{ fontSize: 12, color: "var(--text-faint)" }}>Last {chartData.length} polls</span>
              </div>
              <div style={{ width: "100%", height: 240, background: "#FAF9F6", borderRadius: 8, padding: "16px 0" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0DDD6" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9A9590" }} tickLine={false} axisLine={{ stroke: "#E0DDD6" }} />
                    <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 11, fill: "#9A9590" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #E0DDD6", background: "#F5F3EE" }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="Dem" stroke="#2E5FA1" strokeWidth={2} dot={{ r: 3, fill: "#2E5FA1" }} />
                    <Line type="monotone" dataKey="Rep" stroke="#C23B22" strokeWidth={2} dot={{ r: 3, fill: "#C23B22" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Race Details + Fundraising side by side */}
          <div className="flex gap-8" style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
            {/* Race Details */}
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: serif, fontSize: 24, color: "var(--text-primary)" }}>Race Details</span>
              <div className="flex flex-col" style={{ marginTop: 16 }}>
                {[
                  ["Rating", active.lean],
                  ["Seat Class", "Class II"],
                  ...(race.incumbentName ? [["Incumbent", `${race.incumbentName} (${race.incumbent})`]] : [["Status", "Open seat"]]),
                  ["Polls This Matchup", String(active.pollCount)],
                  ...(active.latestPollDate ? [["Latest Poll", active.latestPollDate]] : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between" style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{label}</span>
                    <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fundraising */}
            {matchupFundraising && (
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: serif, fontSize: 24, color: "var(--text-primary)" }}>Fundraising</span>
                <div className="flex gap-3" style={{ marginTop: 16 }}>
                  <div style={{ flex: 1, background: "var(--dem-bg)", borderRadius: 8, padding: 16 }}>
                    <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: "var(--dem)", letterSpacing: "0.05em", textTransform: "uppercase" as const }}>{active.demCandidate}</span>
                    <div style={{ fontFamily: serif, fontSize: 36, color: "var(--dem)", marginTop: 4 }}>{matchupFundraising.dem > 0 ? `$${matchupFundraising.dem}M` : "—"}</div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{matchupFundraising.dem > 0 ? "FEC filing" : "No FEC data"}</span>
                  </div>
                  <div style={{ flex: 1, background: "var(--rep-bg)", borderRadius: 8, padding: 16 }}>
                    <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: "var(--rep)", letterSpacing: "0.05em", textTransform: "uppercase" as const }}>{active.repCandidate}</span>
                    <div style={{ fontFamily: serif, fontSize: 36, color: "var(--rep)", marginTop: 4 }}>{matchupFundraising.rep > 0 ? `$${matchupFundraising.rep}M` : "—"}</div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{matchupFundraising.rep > 0 ? "FEC filing" : "No FEC data"}</span>
                  </div>
                </div>
                {/* Fundraising share bar — only if both sides have data */}
                {matchupFundraising.dem > 0 && matchupFundraising.rep > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div className="flex overflow-hidden" style={{ height: 8, borderRadius: 4 }}>
                      <div style={{ width: `${(matchupFundraising.dem / (matchupFundraising.dem + matchupFundraising.rep)) * 100}%`, background: "var(--dem)" }} />
                      <div style={{ flex: 1, background: "var(--rep)" }} />
                    </div>
                    <div className="flex justify-between" style={{ marginTop: 4 }}>
                      <span style={{ fontFamily: mono, fontSize: 11, color: "var(--dem)" }}>{((matchupFundraising.dem / (matchupFundraising.dem + matchupFundraising.rep)) * 100).toFixed(1)}%</span>
                      <span style={{ fontFamily: mono, fontSize: 11, color: "var(--rep)" }}>{((matchupFundraising.rep / (matchupFundraising.dem + matchupFundraising.rep)) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Polls Table */}
          {active.pollingSamples.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
                <span style={{ fontFamily: serif, fontSize: 24, color: "var(--text-primary)" }}>Recent Polls</span>
                <span style={{ fontSize: 12, color: "var(--text-faint)" }}>Sorted by date</span>
              </div>
              {/* Table header */}
              <div className="flex items-center" style={{ padding: "10px 0", borderBottom: "2px solid var(--border)" }}>
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, width: 50, flexShrink: 0, textAlign: "center" as const }}>Grade</span>
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, width: 190, flexShrink: 0 }}>Pollster</span>
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, width: 80, flexShrink: 0 }}>Date</span>
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, width: 70, flexShrink: 0 }}>Sample</span>
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, width: 40, flexShrink: 0 }}>Pop</span>
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--dem)", letterSpacing: "0.08em", textTransform: "uppercase" as const, width: 60, flexShrink: 0, fontWeight: 600 }}>Dem</span>
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--rep)", letterSpacing: "0.08em", textTransform: "uppercase" as const, width: 60, flexShrink: 0, fontWeight: 600 }}>Rep</span>
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginLeft: "auto" }}>Margin</span>
              </div>
              {/* Poll rows */}
              {active.pollingSamples.slice().reverse().map((sample, i) => {
                const m = sample.dem - sample.rep;
                const gradeColors: Record<string, string> = { "A+": "#2d8a4e", "A": "#2d8a4e", "B": "#6b8f3a", "C": "#b8860b", "D": "#c44e3f" };
                const gradeColor = sample.grade ? (gradeColors[sample.grade[0]] ?? "var(--text-muted)") : "var(--text-faint)";
                return (
                  <div key={i} className="flex items-center" style={{ padding: "16px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div className="flex items-center justify-center" style={{ width: 50, flexShrink: 0 }}>
                      {sample.grade ? (
                        <span style={{
                          fontFamily: mono, fontSize: 11, fontWeight: 700, color: gradeColor,
                          background: `${gradeColor}15`, padding: "2px 8px", borderRadius: 4,
                        }}>
                          {sample.grade}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>—</span>
                      )}
                    </div>
                    <span style={{ fontSize: 14, color: "var(--text-secondary)", width: 190, flexShrink: 0 }}>{sample.pollster || "—"}</span>
                    <span style={{ fontFamily: mono, fontSize: 13, color: "var(--text-muted)", width: 80, flexShrink: 0 }}>{sample.date}</span>
                    <span style={{ fontFamily: mono, fontSize: 13, color: "var(--text-muted)", width: 70, flexShrink: 0 }}>
                      {sample.sampleSize ? sample.sampleSize.toLocaleString() : "—"}
                    </span>
                    <span style={{ fontFamily: mono, fontSize: 13, color: "var(--text-muted)", width: 40, flexShrink: 0 }}>
                      {sample.population || "—"}
                    </span>
                    <span style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: "var(--dem)", width: 60, flexShrink: 0 }}>{sample.dem}</span>
                    <span style={{ fontFamily: mono, fontSize: 16, fontWeight: 700, color: "var(--rep)", width: 60, flexShrink: 0 }}>{sample.rep}</span>
                    <span style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: marginColor(m), marginLeft: "auto" }}>{marginLabel(m)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent Statewide Results */}
          {stateHistory && (
            <div style={{ borderTop: "1px solid var(--border)", padding: "32px 0" }}>
              <span style={{ fontFamily: serif, fontSize: 24, color: "var(--text-primary)" }}>Recent Statewide Results</span>
              <div className="flex gap-3" style={{ marginTop: 16 }}>
                {stateHistory.map((result) => (
                  <div key={result.label} style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
                    <span style={{ fontFamily: mono, fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{result.label}</span>
                    <div style={{ fontFamily: serif, fontSize: 28, color: result.margin > 0 ? "var(--rep)" : "var(--dem)", marginTop: 4, letterSpacing: "-0.02em" }}>
                      {result.margin > 0 ? "R" : "D"}+{Math.abs(result.margin).toFixed(1)}
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: "16px" }}>{result.topline}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Methodology + Last Updated */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, marginTop: 8 }}>
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Methodology</span>
                <span style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: "18px", maxWidth: 500 }}>
                  Polling average using general election polls from Wikipedia. Pollster grades from VoteHub. Fundraising data from FEC filings. Ratings derived from polling margin.
                </span>
              </div>
              <div className="flex flex-col gap-1" style={{ textAlign: "right" }}>
                <span style={{ fontFamily: mono, fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Last Updated</span>
                <span style={{ fontFamily: mono, fontSize: 12, color: "var(--text-faint)" }}>
                  {lastRefresh ? lastRefresh.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " ET" : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Content
// ---------------------------------------------------------------------------

function DashboardContent() {
  const {
    senateRaces, houseRaces, recentPolls, seatBalance,
    totalSenatePolls, totalHousePolls,
    loading, error, lastRefresh, refetch,
  } = useElectionData();

  const [tab, setTab] = useState<Tab>("SENATE");
  const [selectedRaceCode, setSelectedRaceCode] = useState<string | null>(null);
  const [showAllRaces, setShowAllRaces] = useState(false);
  type SortMode = "alpha" | "margin" | "pres24" | "polls" | "trend";
  const [sortMode, setSortMode] = useState<SortMode>("alpha");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  if (loading) return <LoadingSkeleton />;
  if (error && senateRaces.length === 0) return <ErrorScreen error={error} onRetry={refetch} />;

  // If a race is selected, show detail view
  const selectedRace = selectedRaceCode ? senateRaces.find((r) => r.stateCode === selectedRaceCode) : null;
  if (selectedRace) {
    return <RaceDetailView race={selectedRace} onBack={() => setSelectedRaceCode(null)} lastRefresh={lastRefresh} />;
  }

  // Compute seat projections
  const { demProjected: sDem, repProjected: sRep, tossUp: sToss } = seatBalance.senate;
  const senDTotal = SEN_D_BASE + sDem;
  const senRTotal = SEN_R_BASE + sRep;
  const senTotal = senDTotal + senRTotal;
  const demPct = senTotal > 0 ? Math.round((senDTotal / senTotal) * 100) : 50;
  const tossPct = senTotal > 0 ? Math.round((sToss / senTotal) * 100) : 0;

  const battlegrounds = senateRaces.filter((r) => r.key).length;
  const totalPolls = totalSenatePolls + totalHousePolls;

  const sidebarPolls = recentPolls
    .filter((p) => {
      // Only show polls with both a named DEM and REP candidate with real percentages
      const dem = p.results.find((r) => r.party === "DEM" || r.party === "D");
      const rep = p.results.find((r) => r.party === "REP" || r.party === "R");
      if (!dem || !rep || dem.pct <= 0 || rep.pct <= 0) return false;
      // Skip generic/unnamed candidates
      const isGeneric = (name: string) => /generic|someone else|opponent/i.test(name);
      return !isGeneric(dem.candidate) && !isGeneric(rep.candidate);
    })
    .slice(0, 10)
    .map((p) => {
      const dem = p.results.find((r) => r.party === "DEM" || r.party === "D")!;
      const rep = p.results.find((r) => r.party === "REP" || r.party === "R")!;
      const rawState = p.state ?? p.subject ?? "";
      const stateCode = Object.entries(STATE_NAMES).find(
        ([code, name]) => rawState.toLowerCase() === name.toLowerCase() || rawState.toUpperCase() === code
      )?.[0] ?? rawState.slice(0, 2).toUpperCase();
      const endDate = new Date(p.endDate);
      const daysDiff = Math.floor((Date.now() - endDate.getTime()) / (1000 * 60 * 60 * 24));
      const timeStr = daysDiff <= 0 ? "today" : daysDiff === 1 ? "1d ago" : `${daysDiff}d ago`;
      return {
        pollster: p.pollster, state: STATE_NAMES[stateCode] ?? rawState,
        stateCode,
        dem: dem.candidate.replace(/\s*\(.*?\)\s*/g, "").trim().split(" ").pop() ?? "Dem", demPct: dem.pct,
        rep: rep.candidate.replace(/\s*\(.*?\)\s*/g, "").trim().split(" ").pop() ?? "Rep", repPct: rep.pct,
        date: timeStr, sampleSize: p.sampleSize, population: p.population,
      };
    });

  const sortedSenate = showAllRaces
    ? [...senateRaces].sort((a, b) => {
        if (sortMode === "margin") {
          const aHas = a.demPct > 0 && a.repPct > 0;
          const bHas = b.demPct > 0 && b.repPct > 0;
          if (aHas && !bHas) return -1;
          if (!aHas && bHas) return 1;
          return Math.abs(a.margin) - Math.abs(b.margin);
        }
        if (sortMode === "pres24") {
          const aP = STATE_ELECTION_HISTORY[a.stateCode]?.find(h => h.label === "2024 PRES");
          const bP = STATE_ELECTION_HISTORY[b.stateCode]?.find(h => h.label === "2024 PRES");
          if (aP && !bP) return -1;
          if (!aP && bP) return 1;
          if (aP && bP) return Math.abs(aP.margin) - Math.abs(bP.margin);
          return 0;
        }
        if (sortMode === "polls") {
          return b.pollCount - a.pollCount;
        }
        if (sortMode === "trend") {
          const aT = pollTrend(a);
          const bT = pollTrend(b);
          if (aT && !bT) return -1;
          if (!aT && bT) return 1;
          if (aT && bT) return Math.abs(bT.shift) - Math.abs(aT.shift);
          return 0;
        }
        return a.state.localeCompare(b.state);
      })
    : senateRaces.filter((r) => r.key).sort((a, b) => {
        if (sortMode === "pres24") {
          const aP = STATE_ELECTION_HISTORY[a.stateCode]?.find(h => h.label === "2024 PRES");
          const bP = STATE_ELECTION_HISTORY[b.stateCode]?.find(h => h.label === "2024 PRES");
          if (aP && !bP) return -1;
          if (!aP && bP) return 1;
          if (aP && bP) return Math.abs(aP.margin) - Math.abs(bP.margin);
          return 0;
        }
        if (sortMode === "polls") return b.pollCount - a.pollCount;
        if (sortMode === "trend") {
          const aT = pollTrend(a);
          const bT = pollTrend(b);
          if (aT && !bT) return -1;
          if (!aT && bT) return 1;
          if (aT && bT) return Math.abs(bT.shift) - Math.abs(aT.shift);
          return 0;
        }
        return Math.abs(a.margin) - Math.abs(b.margin);
      });
  const sortedHouse = [...houseRaces].sort((a, b) => Math.abs(a.demPct - a.repPct) - Math.abs(b.demPct - b.repPct));

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header className="flex items-center px-10 shrink-0" style={{ height: 56, borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-baseline gap-3">
          <span style={{ fontFamily: serif, fontSize: 28, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Bellwether</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>2026 Midterms</span>
        </div>
        <nav className="flex items-center gap-6 ml-auto">
          {(["SENATE", "HOUSE"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ fontSize: 13, fontWeight: tab === t ? 500 : 400, color: tab === t ? "var(--text-primary)" : "var(--text-muted)", background: "none", border: "none", cursor: "pointer", borderBottom: tab === t ? "2px solid var(--text-primary)" : "2px solid transparent", paddingBottom: 2 }}>
              {t === "SENATE" ? "Senate" : "House"}
            </button>
          ))}
          <button onClick={refetch} className="p-1.5 rounded" style={{ color: "var(--text-muted)" }} title="Refresh data"><RefreshCw size={14} /></button>
        </nav>
      </header>

      {/* Hero */}
      <div className="flex px-10 shrink-0" style={{ borderBottom: "1px solid var(--border)", paddingTop: 24, paddingBottom: 20, gap: 32 }}>
        {/* Left — Projection */}
        <div className="flex flex-col gap-2" style={{ width: 340, flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
            {tab === "SENATE" ? "Projected Senate Balance" : "House Competitive Races"}
          </span>
          {tab === "SENATE" ? (
            <>
              <div className="flex items-baseline gap-3">
                <div className="flex items-baseline gap-1">
                  <span style={{ fontFamily: serif, fontSize: 52, color: "var(--dem)", letterSpacing: "-0.03em", lineHeight: "52px" }}>{senDTotal}</span>
                  <span style={{ fontSize: 13, color: "var(--dem)" }}>Dem</span>
                </div>
                <span style={{ fontSize: 13, color: "var(--text-faint)" }}>—</span>
                <div className="flex items-baseline gap-1">
                  <span style={{ fontFamily: serif, fontSize: 52, color: "var(--rep)", letterSpacing: "-0.03em", lineHeight: "52px" }}>{senRTotal}</span>
                  <span style={{ fontSize: 13, color: "var(--rep)" }}>Rep</span>
                </div>
              </div>
              {/* Projection bar */}
              {(() => {
                // sDem/sRep already include toss-ups assigned by margin
                const total = senDTotal + senRTotal;
                return (
                  <div className="flex flex-col gap-1">
                    <div className="flex overflow-hidden" style={{ height: 10, borderRadius: 5 }}>
                      <div style={{ width: `${(senDTotal / total) * 100}%`, background: "var(--dem)" }} />
                      <div style={{ flex: 1, background: "var(--rep)" }} />
                    </div>
                    <div className="flex justify-between">
                      <span style={{ fontFamily: mono, fontSize: 10, color: "var(--dem)" }}>{senDTotal} projected</span>
                      {sToss > 0 && <span style={{ fontFamily: mono, fontSize: 10, color: "var(--text-muted)" }}>{sToss} toss-up</span>}
                      <span style={{ fontFamily: mono, fontSize: 10, color: "var(--rep)" }}>{senRTotal} projected</span>
                    </div>
                  </div>
                );
              })()}
              <div className="flex gap-4" style={{ marginTop: 4 }}>
                {[
                  { val: senateRaces.length, label: "Races", color: "var(--text-primary)" },
                  { val: battlegrounds, label: "Battlegrounds", color: "var(--accent)" },
                  { val: totalPolls, label: "Total Polls", color: "var(--text-primary)" },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col gap-0">
                    <span style={{ fontFamily: mono, fontSize: 20, fontWeight: 500, color: s.color, letterSpacing: "-0.02em" }}>{s.val}</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-3">
                <div className="flex items-baseline gap-1">
                  <span style={{ fontFamily: serif, fontSize: 52, color: "var(--dem)", letterSpacing: "-0.03em", lineHeight: "52px" }}>{seatBalance.house.demProjected}</span>
                  <span style={{ fontSize: 13, color: "var(--dem)" }}>Lean D</span>
                </div>
                <span style={{ fontSize: 13, color: "var(--text-faint)" }}>—</span>
                <div className="flex items-baseline gap-1">
                  <span style={{ fontFamily: serif, fontSize: 52, color: "var(--rep)", letterSpacing: "-0.03em", lineHeight: "52px" }}>{seatBalance.house.repProjected}</span>
                  <span style={{ fontSize: 13, color: "var(--rep)" }}>Lean R</span>
                </div>
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{houseRaces.length} competitive districts tracked. 218 needed for majority.</span>
            </>
          )}
        </div>

        {/* Center — Map (Senate only) */}
        {tab === "SENATE" && (
          <div className="flex flex-col flex-1 min-w-0">
            <SenateMap senateRaces={senateRaces} onStateClick={setSelectedRaceCode} />
          </div>
        )}

        {/* Right — Senate composition bar */}
        {tab === "SENATE" && (
          <div className="flex flex-col gap-2 justify-center" style={{ width: 280, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
              Senate Composition
            </span>
            {(() => {
              const dSafe = SEN_D_BASE;
              const dUp = senateRaces.filter((r) => r.incumbent === "D" || (!r.incumbent && r.lean.includes("D"))).length;
              const rUp = senateRaces.filter((r) => r.incumbent === "R" || (!r.incumbent && r.lean.includes("R"))).length;
              const rSafe = SEN_R_BASE;
              return (
                <>
                  <div className="flex overflow-hidden" style={{ height: 24, borderRadius: 5 }}>
                    <div style={{ width: `${dSafe}%`, background: "var(--dem)" }} title={`${dSafe} Dem seats not up`} />
                    <div style={{ width: `${dUp}%`, background: "var(--dem-light)", borderLeft: "1px solid var(--bg)" }} title={`${dUp} Dem seats up`} />
                    <div style={{ width: `${rUp}%`, background: "var(--rep-light)", borderLeft: "1px solid var(--bg)" }} title={`${rUp} Rep seats up`} />
                    <div style={{ width: `${rSafe}%`, background: "var(--rep)", borderLeft: "1px solid var(--bg)" }} title={`${rSafe} Rep seats not up`} />
                  </div>
                  <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: "var(--dem)" }} />
                        <span style={{ fontFamily: mono, fontSize: 9, color: "var(--text-muted)" }}>{dSafe} safe</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: "var(--dem-light)" }} />
                        <span style={{ fontFamily: mono, fontSize: 9, color: "var(--text-muted)" }}>{dUp} up</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: "var(--rep-light)" }} />
                        <span style={{ fontFamily: mono, fontSize: 9, color: "var(--text-muted)" }}>{rUp} up</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: "var(--rep)" }} />
                        <span style={{ fontFamily: mono, fontSize: 9, color: "var(--text-muted)" }}>{rSafe} safe</span>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="flex flex-col flex-1 overflow-hidden" style={{ borderRight: "1px solid var(--border)" }}>
          <div className="flex items-center px-10 shrink-0" style={{ height: 40, borderBottom: "1px solid var(--border)" }}>
            {tab === "SENATE" ? (
              <div style={{ width: 160, flexShrink: 0 }}>
                <span
                  onClick={() => { setShowAllRaces(!showAllRaces); setSortMode("alpha"); }}
                  style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, cursor: "pointer", borderBottom: "1px dashed var(--text-faint)", paddingBottom: 1 }}
                >
                  {showAllRaces ? "All Races" : "Battleground Races"}
                </span>
              </div>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, width: 160, flexShrink: 0 }}>
                House Districts
              </span>
            )}
            <span style={{ fontSize: 11, color: "var(--text-faint)", width: 90, flexShrink: 0 }}>Rating</span>
            <span style={{ fontSize: 11, color: "var(--text-faint)", width: 140, flexShrink: 0 }}>Democrat</span>
            <span style={{ fontSize: 11, color: "var(--text-faint)", width: 140, flexShrink: 0 }}>Republican</span>
            <span
              onClick={() => setSortMode(sortMode === "pres24" ? "alpha" : "pres24")}
              style={{ fontSize: 11, color: "var(--text-faint)", width: 75, flexShrink: 0, textAlign: "center" as const, cursor: "pointer", borderBottom: sortMode === "pres24" ? "1px solid var(--text-muted)" : "none" }}
            >'24 Pres{sortMode === "pres24" ? " ↓" : ""}</span>
            <TrendHeader active={sortMode === "trend"} onClick={() => setSortMode(sortMode === "trend" ? "alpha" : "trend")} />
            <span
              onClick={() => setSortMode(sortMode === "polls" ? "alpha" : "polls")}
              style={{ fontSize: 11, color: "var(--text-faint)", width: 55, flexShrink: 0, textAlign: "center" as const, cursor: "pointer", borderBottom: sortMode === "polls" ? "1px solid var(--text-muted)" : "none" }}
            ># Polls{sortMode === "polls" ? " ↓" : ""}</span>
            <span
              onClick={() => showAllRaces && setSortMode(sortMode === "margin" ? "alpha" : "margin")}
              style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: "auto", paddingRight: 22, cursor: showAllRaces ? "pointer" : "default", borderBottom: showAllRaces && sortMode === "margin" ? "1px solid var(--text-muted)" : "none" }}
            >
              Margin{showAllRaces && sortMode === "margin" ? " ↓" : ""}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto hide-scrollbar">
            {tab === "SENATE"
              ? sortedSenate.map((race) => <SenateRaceRow key={race.stateCode} race={race} onClick={() => setSelectedRaceCode(race.stateCode)} />)
              : sortedHouse.map((race) => <HouseRaceRow key={race.district} race={race} />)
            }
          </div>
        </div>

        <div className="flex flex-col overflow-y-auto shrink-0" style={{ width: 360, padding: "24px 32px", gap: 32 }}>
          <div className="flex flex-col gap-4">
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Latest Polls</span>
            <div className="flex flex-col gap-3.5">
              {sidebarPolls.length > 0 ? sidebarPolls.map((poll, i) => (
                <div key={i}>
                  <RecentPollCard poll={poll} onClick={() => setSelectedRaceCode(poll.stateCode)} />
                  {i < sidebarPolls.length - 1 && <div style={{ height: 1, background: "var(--border-subtle)", marginTop: 14 }} />}
                </div>
              )) : (
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>No recent polls available</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-10 shrink-0" style={{ height: 36, borderTop: "1px solid var(--border)" }}>
        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Polls from Wikipedia. Pollster grades from VoteHub. Fundraising from FEC. Updated every 4 hours.</span>
        <div className="flex items-center gap-4">
          {lastRefresh && <span style={{ fontFamily: mono, fontSize: 11, color: "var(--text-faint)" }}>Last sync {lastRefresh.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>}
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Bellwether v3.0</span>
        </div>
      </footer>
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
