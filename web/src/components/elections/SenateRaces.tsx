"use client";
import { type SenateRace, type Lean } from "@/lib/electionData";

const LEAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Safe D":    { bg: "#0d1f3c", text: "#3b82f6", border: "#1d3a6b" },
  "Likely D":  { bg: "#0a1a30", text: "#60a5fa", border: "#1e3a5f" },
  "Lean D":    { bg: "#071422", text: "#93c5fd", border: "#1a3050" },
  "Toss-Up":   { bg: "#1a1a00", text: "#fbbf24", border: "#3a3a00" },
  "Lean R":    { bg: "#1f0a0a", text: "#fca5a5", border: "#5f1a1a" },
  "Likely R":  { bg: "#2a0a0a", text: "#f87171", border: "#7f1d1d" },
  "Safe R":    { bg: "#3a0a0a", text: "#ef4444", border: "#991b1b" },
};

function LeanBadge({ lean }: { lean: Lean }) {
  const c = LEAN_COLORS[lean] ?? LEAN_COLORS["Toss-Up"];
  return (
    <span
      className="font-mono text-[8px] px-1.5 py-0.5 rounded-sm font-bold tracking-wider"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {lean.toUpperCase()}
    </span>
  );
}

function MarginBar({ dem, rep }: { dem: number; rep: number }) {
  const total = dem + rep;
  const demW = total > 0 ? (dem / total) * 100 : 50;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-sm">
      <div
        className="h-full"
        style={{ width: `${demW}%`, background: "linear-gradient(90deg, #1d4ed8, #3b82f6)" }}
      />
      <div
        className="h-full"
        style={{ width: `${100 - demW}%`, background: "linear-gradient(90deg, #ef4444, #b91c1c)" }}
      />
    </div>
  );
}

interface Props {
  races: SenateRace[];
  onSelect: (race: SenateRace) => void;
}

export function SenateRacesList({ races, onSelect }: Props) {
  const sorted = [...races].sort((a, b) => {
    const order: Lean[] = ["Toss-Up", "Lean D", "Lean R", "Likely D", "Likely R", "Safe D", "Safe R"];
    return order.indexOf(a.lean) - order.indexOf(b.lean);
  });

  if (sorted.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-[#445544] font-mono text-[10px]">
        No Senate race data loaded yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      <div className="grid grid-cols-[80px_1fr_1fr_90px_60px_50px] gap-2 px-3 py-1.5 text-[#334433] font-mono text-[8px] tracking-widest border-b border-[#1a2a1a]">
        <span>STATE</span>
        <span>DEM</span>
        <span>REP</span>
        <span>RATING</span>
        <span className="text-right">MARGIN</span>
        <span className="text-right">POLLS</span>
      </div>

      {sorted.map((race) => {
        const marginSign = race.margin > 0 ? "+" : "";
        const marginColor = race.margin > 0 ? "#3b82f6" : race.margin < 0 ? "#ef4444" : "#fbbf24";

        return (
          <button
            key={race.stateCode}
            onClick={() => onSelect(race)}
            className="group grid grid-cols-[80px_1fr_1fr_90px_60px_50px] gap-2 px-3 py-2 border-b border-[#0d1a0d] hover:bg-[#0a150a] transition-colors text-left w-full"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[#00ff41] font-mono text-[11px] font-bold group-hover:glow-text">
                {race.stateCode}
              </span>
              {race.key && (
                <span className="w-1 h-1 rounded-full bg-[#fbbf24] pulse-green" />
              )}
            </div>

            <div className="flex flex-col justify-center">
              <div className="text-[#60a5fa] font-mono text-[9px] truncate">{race.demCandidate}</div>
              <div className="text-[#3b82f6] font-mono text-[10px] font-bold">
                {race.demPct > 0 ? `${race.demPct}%` : "--"}
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <div className="text-[#fca5a5] font-mono text-[9px] truncate">{race.repCandidate}</div>
              <div className="text-[#ef4444] font-mono text-[10px] font-bold">
                {race.repPct > 0 ? `${race.repPct}%` : "--"}
              </div>
            </div>

            <div className="flex flex-col justify-center gap-1">
              <LeanBadge lean={race.lean} />
              {race.demPct > 0 && race.repPct > 0 && (
                <MarginBar dem={race.demPct} rep={race.repPct} />
              )}
            </div>

            <div className="flex items-center justify-end">
              {race.demPct > 0 || race.repPct > 0 ? (
                <span
                  className="font-mono text-[11px] font-bold"
                  style={{ color: marginColor }}
                >
                  {marginSign}{race.margin.toFixed(1)}
                </span>
              ) : (
                <span className="text-[#334433] font-mono text-[9px]">--</span>
              )}
            </div>

            <div className="flex items-center justify-end">
              <span className="text-[#445544] font-mono text-[9px]">{race.pollCount}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
