"use client";
import { type HouseRace, type Lean } from "@/lib/electionData";

const LEAN_COLORS: Record<string, { bg: string; text: string }> = {
  "Safe D":    { bg: "#0d1f3c", text: "#3b82f6" },
  "Likely D":  { bg: "#0a1a30", text: "#60a5fa" },
  "Lean D":    { bg: "#071422", text: "#93c5fd" },
  "Toss-Up":   { bg: "#1a1a00", text: "#fbbf24" },
  "Lean R":    { bg: "#1f0a0a", text: "#fca5a5" },
  "Likely R":  { bg: "#2a0a0a", text: "#f87171" },
  "Safe R":    { bg: "#3a0a0a", text: "#ef4444" },
};

interface Props {
  races: HouseRace[];
  onSelect?: (race: HouseRace) => void;
}

export function HouseRaceGrid({ races, onSelect }: Props) {
  const sorted = [...races].sort((a, b) => {
    const order: Lean[] = ["Toss-Up", "Lean D", "Lean R", "Likely D", "Likely R", "Safe D", "Safe R"];
    return order.indexOf(a.lean) - order.indexOf(b.lean);
  });

  if (sorted.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-[#445544] font-mono text-[10px]">
        No House race data loaded yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      <div className="grid grid-cols-[60px_1fr_1fr_80px_50px] gap-2 px-3 py-1.5 text-[#334433] font-mono text-[8px] tracking-widest border-b border-[#1a2a1a]">
        <span>DIST</span>
        <span>DEM</span>
        <span>REP</span>
        <span>RATING</span>
        <span className="text-right">MRG</span>
      </div>

      {sorted.map((race) => {
        const margin = race.demPct - race.repPct;
        const marginSign = margin > 0 ? "+" : "";
        const marginColor = margin > 0 ? "#3b82f6" : margin < 0 ? "#ef4444" : "#fbbf24";
        const c = LEAN_COLORS[race.lean] ?? LEAN_COLORS["Toss-Up"];

        return (
          <button
            key={race.district}
            onClick={() => onSelect?.(race)}
            className="group grid grid-cols-[60px_1fr_1fr_80px_50px] gap-2 px-3 py-1.5 border-b border-[#0d1a0d] hover:bg-[#0a150a] transition-colors text-left w-full"
          >
            <div className="flex flex-col">
              <span className="text-[#00ff41] font-mono text-[10px] font-bold">{race.district}</span>
              <span className="text-[#334433] font-mono text-[8px]">{race.stateCode}</span>
            </div>

            <div className="flex flex-col justify-center">
              <div className="text-[#60a5fa] font-mono text-[8px] truncate">{race.demCandidate}</div>
              <div className="text-[#3b82f6] font-mono text-[9px] font-bold">
                {race.demPct > 0 ? `${race.demPct}%` : "--"}
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <div className="text-[#fca5a5] font-mono text-[8px] truncate">{race.repCandidate}</div>
              <div className="text-[#ef4444] font-mono text-[9px] font-bold">
                {race.repPct > 0 ? `${race.repPct}%` : "--"}
              </div>
            </div>

            <div className="flex items-center">
              <span
                className="font-mono text-[7px] px-1 py-0.5 rounded-sm font-bold tracking-wide"
                style={{ background: c.bg, color: c.text }}
              >
                {race.lean.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center justify-end">
              {race.demPct > 0 || race.repPct > 0 ? (
                <span className="font-mono text-[10px] font-bold" style={{ color: marginColor }}>
                  {marginSign}{margin.toFixed(1)}
                </span>
              ) : (
                <span className="text-[#334433] font-mono text-[9px]">--</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
