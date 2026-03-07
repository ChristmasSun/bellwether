"use client";
import { type SenateRace } from "@/lib/electionData";

const LEAN_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  "Safe D":   { text: "#4a90d9", bg: "#0d1f3c", border: "#1d3a6b" },
  "Likely D": { text: "#60a5fa", bg: "#0a1a2e", border: "#1a3258" },
  "Lean D":   { text: "#93c5fd", bg: "#071422", border: "#152840" },
  "Toss-Up":  { text: "#d4a843", bg: "#1a1400", border: "#3a2f00" },
  "Lean R":   { text: "#fca5a5", bg: "#1f0808", border: "#5f1818" },
  "Likely R": { text: "#f87171", bg: "#280808", border: "#7f1d1d" },
  "Safe R":   { text: "#d95a5a", bg: "#380808", border: "#991b1b" },
};

export function SenateRacesList({ races, onSelect }: { races: SenateRace[]; onSelect: (r: SenateRace) => void }) {
  const sorted = [...races].sort((a, b) => {
    const order = ["Toss-Up", "Lean R", "Lean D", "Likely R", "Likely D", "Safe R", "Safe D"];
    return order.indexOf(a.lean) - order.indexOf(b.lean);
  });

  if (sorted.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-[#3d4a5c] font-mono text-[10px]">
        No Senate race data loaded yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Column headers */}
      <div className="grid grid-cols-[1.4fr_1fr_1fr_64px_56px_56px_48px] gap-1 px-4 py-1.5 text-[#2a3447] font-mono text-[7px] tracking-widest border-b border-[#1c2333] bg-[#080c12] sticky top-0 z-10">
        <span>STATE / RACE</span>
        <span>DEMOCRAT</span>
        <span>REPUBLICAN</span>
        <span className="text-right">MARGIN</span>
        <span className="text-right">D $</span>
        <span className="text-right">R $</span>
        <span className="text-right">LEAN</span>
      </div>

      {sorted.map((race, i) => {
        const ls = LEAN_STYLES[race.lean];
        const margin = race.margin;
        const isKey = race.key;
        return (
          <div
            key={i}
            onClick={() => onSelect(race)}
            className="grid grid-cols-[1.4fr_1fr_1fr_64px_56px_56px_48px] gap-1 px-4 py-2.5 border-b border-[#0f1520] hover:bg-[#0d1117] cursor-pointer transition-colors group"
            style={{ borderLeft: isKey ? "2px solid #d4a843" : "2px solid transparent" }}
          >
            {/* State */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] font-bold text-[#c9d1d9] group-hover:text-white transition-colors">
                  {race.state}
                </span>
                {race.called && (
                  <span className="font-mono text-[6px] text-[#4ade80] tracking-widest">CALLED</span>
                )}
              </div>
              <span className="font-mono text-[7px] text-[#3d4a5c]">
                {race.incumbent === "D" ? "D INCUMBENT" : race.incumbent === "R" ? "R INCUMBENT" : "OPEN SEAT"}
              </span>
            </div>

            {/* Dem */}
            <div className="flex flex-col justify-center">
              <span className="font-mono text-[8px] text-[#8b949e] truncate">{race.demCandidate.split(" ").pop()}</span>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-12 h-1 bg-[#0a1a2e] rounded-sm overflow-hidden">
                  <div className="h-full rounded-sm bg-[#4a90d9]" style={{ width: `${race.demPct}%` }} />
                </div>
                <span className="font-mono text-[8px] font-bold text-[#4a90d9]">{race.demPct}%</span>
              </div>
            </div>

            {/* Rep */}
            <div className="flex flex-col justify-center">
              <span className="font-mono text-[8px] text-[#8b949e] truncate">{race.repCandidate.split(" ").pop()}</span>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-12 h-1 bg-[#2a0808] rounded-sm overflow-hidden">
                  <div className="h-full rounded-sm bg-[#d95a5a]" style={{ width: `${race.repPct}%` }} />
                </div>
                <span className="font-mono text-[8px] font-bold text-[#d95a5a]">{race.repPct}%</span>
              </div>
            </div>

            {/* Margin */}
            <div className="flex items-center justify-end">
              <span
                className="font-mono text-[10px] font-bold"
                style={{ color: margin > 0 ? "#4a90d9" : margin < 0 ? "#d95a5a" : "#d4a843" }}
              >
                {margin > 0 ? "D" : "R"}+{Math.abs(margin).toFixed(1)}
              </span>
            </div>

            {/* D $ */}
            <div className="flex items-center justify-end">
              <span className="font-mono text-[8px] text-[#4a90d9]">
                {race.moneyRaised?.dem != null ? `$${race.moneyRaised.dem}M` : "--"}
              </span>
            </div>

            {/* R $ */}
            <div className="flex items-center justify-end">
              <span className="font-mono text-[8px] text-[#d95a5a]">
                {race.moneyRaised?.rep != null ? `$${race.moneyRaised.rep}M` : "--"}
              </span>
            </div>

            {/* Lean badge */}
            <div className="flex items-center justify-end">
              <span
                className="font-mono text-[6px] font-bold px-1 py-0.5 tracking-widest whitespace-nowrap"
                style={{ background: ls.bg, color: ls.text, border: `1px solid ${ls.border}` }}
              >
                {race.lean === "Toss-Up" ? "TOSS" : race.lean.replace(" ", " ").toUpperCase()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
