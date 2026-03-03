"use client";
import { motion, AnimatePresence } from "framer-motion";
import { type SenateRace, type Lean } from "@/lib/electionData";
import { RacePollChart } from "./Charts";
import { X, TrendingUp, MapPin, BarChart2 } from "lucide-react";

const LEAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Safe D":    { bg: "#0d1f3c", text: "#3b82f6", border: "#1d3a6b" },
  "Likely D":  { bg: "#0a1a30", text: "#60a5fa", border: "#1e3a5f" },
  "Lean D":    { bg: "#071422", text: "#93c5fd", border: "#1a3050" },
  "Toss-Up":   { bg: "#1a1a00", text: "#fbbf24", border: "#3a3a00" },
  "Lean R":    { bg: "#1f0a0a", text: "#fca5a5", border: "#5f1a1a" },
  "Likely R":  { bg: "#2a0a0a", text: "#f87171", border: "#7f1d1d" },
  "Safe R":    { bg: "#3a0a0a", text: "#ef4444", border: "#991b1b" },
};

interface Props {
  race: SenateRace | null;
  onClose: () => void;
}

export function RaceDetailModal({ race, onClose }: Props) {
  return (
    <AnimatePresence>
      {race && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-[#030a03] border-l border-[#1a2a1a] z-50 overflow-y-auto flex flex-col"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2a1a] bg-[#020802] sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="text-[#00ff41] font-mono text-[10px] font-bold tracking-widest">
                  {race.stateCode} · SENATE
                </div>
                {race.key && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] pulse-green" />
                )}
              </div>
              <button
                onClick={onClose}
                className="text-[#445544] hover:text-[#00ff41] transition-colors p-1"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-0 flex-1">
              {/* State name + lean */}
              <div className="px-4 py-3 border-b border-[#1a2a1a]">
                <div className="text-[#ccc] font-mono text-[15px] font-bold mb-1">{race.state}</div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const c = LEAN_COLORS[race.lean] ?? LEAN_COLORS["Toss-Up"];
                    return (
                      <span
                        className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-sm tracking-widest"
                        style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                      >
                        {race.lean.toUpperCase()}
                      </span>
                    );
                  })()}
                  <span className="text-[#445544] font-mono text-[8px]">
                    {race.pollCount} unique polls
                  </span>
                </div>
              </div>

              {/* Candidates */}
              <div className="px-4 py-3 border-b border-[#1a2a1a]">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#050d20] border border-[#1d3a6b] p-3 rounded-sm">
                    <div className="text-[#60a5fa] font-mono text-[7px] tracking-widest mb-1">DEMOCRAT</div>
                    <div className="text-[#93c5fd] font-mono text-[10px] font-bold leading-tight">{race.demCandidate}</div>
                    <div className="text-[#3b82f6] font-mono text-[24px] font-bold leading-none mt-1">
                      {race.demPct > 0 ? `${race.demPct}%` : "--"}
                    </div>
                    {race.demPct > 0 && (
                      <div className="h-1 bg-[#0a1a30] rounded-sm mt-2 overflow-hidden">
                        <div
                          className="h-full rounded-sm"
                          style={{ width: `${race.demPct}%`, background: "linear-gradient(90deg,#1d4ed8,#3b82f6)" }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="bg-[#200505] border border-[#6b1d1d] p-3 rounded-sm">
                    <div className="text-[#fca5a5] font-mono text-[7px] tracking-widest mb-1">REPUBLICAN</div>
                    <div className="text-[#fca5a5] font-mono text-[10px] font-bold leading-tight">{race.repCandidate}</div>
                    <div className="text-[#ef4444] font-mono text-[24px] font-bold leading-none mt-1">
                      {race.repPct > 0 ? `${race.repPct}%` : "--"}
                    </div>
                    {race.repPct > 0 && (
                      <div className="h-1 bg-[#2a0a0a] rounded-sm mt-2 overflow-hidden">
                        <div
                          className="h-full rounded-sm"
                          style={{ width: `${race.repPct}%`, background: "linear-gradient(90deg,#ef4444,#b91c1c)" }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {(race.demPct > 0 || race.repPct > 0) && (
                  <div className="mt-3 text-center">
                    <span className="text-[#445544] font-mono text-[8px]">CURRENT MARGIN: </span>
                    <span
                      className="font-mono text-[12px] font-bold"
                      style={{ color: race.margin > 0 ? "#3b82f6" : race.margin < 0 ? "#ef4444" : "#fbbf24" }}
                    >
                      {race.margin > 0 ? "D" : race.margin < 0 ? "R" : ""}
                      {race.margin !== 0 ? `+${Math.abs(race.margin).toFixed(1)}` : "EVEN"}
                    </span>
                  </div>
                )}
              </div>

              {/* Polling trend */}
              {race.pollingSamples.length > 1 && (
                <div className="border-b border-[#1a2a1a]">
                  <div className="flex items-center gap-2 px-4 py-2">
                    <TrendingUp size={10} className="text-[#00ff41]" />
                    <span className="text-[#00ff41] font-mono text-[9px] tracking-widest">POLLING TREND</span>
                    <span className="text-[#334433] font-mono text-[7px] ml-auto">
                      {race.pollingSamples.length} data points
                    </span>
                  </div>
                  <div className="px-2 pb-2">
                    <RacePollChart data={race.pollingSamples} />
                  </div>
                </div>
              )}

              {/* Stats grid */}
              <div className="border-b border-[#1a2a1a] px-4 py-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-2">
                    <MapPin size={10} className="text-[#445544] mt-0.5" />
                    <div>
                      <div className="text-[#334433] font-mono text-[7px] tracking-widest">INCUMBENT</div>
                      <div className={`font-mono text-[11px] font-bold ${race.incumbent === "D" ? "text-[#3b82f6]" : race.incumbent === "R" ? "text-[#ef4444]" : "text-[#445544]"}`}>
                        {race.incumbent === "D" ? "DEMOCRAT" : race.incumbent === "R" ? "REPUBLICAN" : "OPEN SEAT"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <BarChart2 size={10} className="text-[#445544] mt-0.5" />
                    <div>
                      <div className="text-[#334433] font-mono text-[7px] tracking-widest">UNIQUE POLLS</div>
                      <div className="text-[#aaa] font-mono text-[13px] font-bold">{race.pollCount}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <TrendingUp size={10} className="text-[#445544] mt-0.5" />
                    <div>
                      <div className="text-[#334433] font-mono text-[7px] tracking-widest">BATTLEGROUND</div>
                      <div className={`font-mono text-[11px] font-bold ${race.key ? "text-[#fbbf24]" : "text-[#334433]"}`}>
                        {race.key ? "YES" : "NO"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={10} className="text-[#445544] mt-0.5" />
                    <div>
                      <div className="text-[#334433] font-mono text-[7px] tracking-widest">COOK RATING</div>
                      <div className="text-[#aaa] font-mono text-[11px] font-bold">
                        {race.lean}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* No trend data message */}
              {race.pollingSamples.length <= 1 && (
                <div className="px-4 py-6 text-center">
                  <div className="text-[#334433] font-mono text-[9px]">
                    {race.pollCount === 0
                      ? "No polling data available for this race yet."
                      : "Not enough general-election polls to show a trend line."}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
