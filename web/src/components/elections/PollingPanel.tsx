"use client";
import { useElectionData } from "@/lib/ElectionDataContext";

const GRADE_COLOR: Record<string, string> = {
  "A+": "#4ade80", "A": "#86efac", "A-": "#bbf7d0",
  "B+": "#fbbf24", "B": "#fde68a", "B-": "#fef3c7",
};

function computeGenericBallotFromRecentPolls(recentPolls: { results: { party: string; pct: number }[]; state?: string; pollType?: string; subject?: string }[]) {
  const genericPolls = recentPolls.filter((p) => {
    if (p.state) return false;
    const hasDem = p.results.some((r) => r.party === "D");
    const hasRep = p.results.some((r) => r.party === "R");
    return hasDem && hasRep;
  });
  if (genericPolls.length === 0) return null;

  let demSum = 0;
  let repSum = 0;
  let count = 0;
  for (const p of genericPolls) {
    const dem = p.results.find((r) => r.party === "D")?.pct ?? 0;
    const rep = p.results.find((r) => r.party === "R")?.pct ?? 0;
    if (dem > 0 || rep > 0) {
      demSum += dem;
      repSum += rep;
      count++;
    }
  }
  if (count === 0) return null;
  return { dem: demSum / count, rep: repSum / count, pollCount: count };
}

export function PollingPanel() {
  const { pollEntries, recentPolls } = useElectionData();

  const genericBallot = computeGenericBallotFromRecentPolls(recentPolls);
  const demAvg = genericBallot?.dem ?? 0;
  const repAvg = genericBallot?.rep ?? 0;
  const pollCount = genericBallot?.pollCount ?? 0;
  const total = demAvg + repAvg;
  const demWidth = total > 0 ? (demAvg / total) * 100 : 47.4;
  const repWidth = total > 0 ? (repAvg / total) * 100 : 52.6;
  const margin = repAvg - demAvg;
  const marginStr = margin >= 0 ? `R+${margin.toFixed(1)}` : `D+${Math.abs(margin).toFixed(1)}`;

  return (
    <div className="flex flex-col gap-0">
      {/* National generic ballot highlight */}
      <div className="px-4 py-3 border-b border-[#1c2333] bg-[#0d1117]">
        <div className="text-[#3d4a5c] font-mono text-[7px] tracking-widest mb-2">
          NATIONAL GENERIC BALLOT COMPOSITE
        </div>
        <div className="flex items-center gap-4 mb-2">
          <div>
            <span className="text-[#4a90d9] font-mono text-[28px] font-bold leading-none">{demAvg.toFixed(1)}</span>
            <span className="text-[#1d3a6b] font-mono text-[9px] ml-1.5">DEM</span>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className="h-2.5 rounded-sm overflow-hidden flex gap-px">
              <div style={{ width: `${demWidth}%`, background: "linear-gradient(90deg,#1d4ed8,#4a90d9)" }} className="h-full" />
              <div style={{ width: `${repWidth}%`, background: "linear-gradient(90deg,#d95a5a,#a83232)" }} className="h-full" />
            </div>
            <div className="text-[#3d4a5c] font-mono text-[7px] text-center">
              ± 1.8 MoE · {marginStr} avg · {pollCount} polls
            </div>
          </div>
          <div className="text-right">
            <span className="text-[#d95a5a] font-mono text-[28px] font-bold leading-none">{repAvg.toFixed(1)}</span>
            <span className="text-[#6b1d1d] font-mono text-[9px] ml-1.5">REP</span>
          </div>
        </div>
        {genericBallot && (
          <div className="flex gap-2 mt-2">
            <div className="bg-[#080c12] border border-[#1c2333] px-2 py-1 flex-1">
              <div className="text-[#3d4a5c] font-mono text-[6px] tracking-widest">POLLS COUNTED</div>
              <div className="font-mono text-[11px] font-bold text-[#d4a843]">{pollCount}</div>
            </div>
            <div className="bg-[#080c12] border border-[#1c2333] px-2 py-1 flex-1">
              <div className="text-[#3d4a5c] font-mono text-[6px] tracking-widest">MARGIN</div>
              <div className="font-mono text-[11px] font-bold" style={{ color: margin >= 0 ? "#d95a5a" : "#4a90d9" }}>{marginStr}</div>
            </div>
            <div className="bg-[#080c12] border border-[#1c2333] px-2 py-1 flex-1">
              <div className="text-[#3d4a5c] font-mono text-[6px] tracking-widest">SPREAD</div>
              <div className="font-mono text-[11px] font-bold text-[#8b949e]">{Math.abs(demAvg - repAvg).toFixed(1)}pts</div>
            </div>
          </div>
        )}
      </div>

      {/* Poll table header */}
      <div className="grid grid-cols-[1.2fr_36px_36px_42px_56px_32px] gap-1 px-4 py-1.5 text-[#2a3447] font-mono text-[7px] tracking-widest border-b border-[#1c2333] bg-[#080c12]">
        <span>POLLSTER / STATE</span>
        <span className="text-right">DEM</span>
        <span className="text-right">REP</span>
        <span className="text-right">DATE</span>
        <span className="text-right">MARGIN</span>
        <span className="text-right">GRD</span>
      </div>

      {pollEntries.length === 0 && (
        <div className="px-4 py-6 text-center text-[#3d4a5c] font-mono text-[9px]">
          No poll data available — connect API
        </div>
      )}
      {pollEntries.map((poll, i) => {
        const spread = poll.dem - poll.rep;
        const demLeads = spread > 0;
        return (
          <div
            key={i}
            className="grid grid-cols-[1.2fr_36px_36px_42px_56px_32px] gap-1 px-4 py-2 border-b border-[#0f1520] hover:bg-[#0d1117] transition-colors"
          >
            <div className="flex flex-col">
              <span className="text-[#8b949e] font-mono text-[8px] truncate">{poll.pollster}</span>
              <span className="text-[#d4a843] font-mono text-[7px] font-bold mt-0.5">{poll.state}</span>
            </div>
            <div className="text-right text-[#4a90d9] font-mono text-[9px] font-bold">{poll.dem}</div>
            <div className="text-right text-[#d95a5a] font-mono text-[9px] font-bold">{poll.rep}</div>
            <div className="text-right text-[#3d4a5c] font-mono text-[7px]">{poll.date}</div>
            <div
              className="text-right font-mono text-[9px] font-bold"
              style={{ color: demLeads ? "#4a90d9" : "#d95a5a" }}
            >
              {demLeads ? "D" : "R"}+{Math.abs(spread).toFixed(1)}
            </div>
            <div
              className="text-right font-mono text-[8px] font-bold"
              style={{ color: GRADE_COLOR[poll.grade] ?? "#4a5568" }}
            >
              {poll.grade}
            </div>
          </div>
        );
      })}
    </div>
  );
}
