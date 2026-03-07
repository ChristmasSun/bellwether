"use client";
import { motion, AnimatePresence } from "framer-motion";
import { type SenateRace } from "@/lib/electionData";
import { RacePollChart, MoneyChart } from "./Charts";
import { X, TrendingUp, DollarSign, Users, Calendar, MapPin } from "lucide-react";

const LEAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Safe D":    { bg: "#0d1f3c", text: "#4a90d9", border: "#1d3a6b" },
  "Likely D":  { bg: "#0a1a2e", text: "#60a5fa", border: "#1a3258" },
  "Lean D":    { bg: "#071422", text: "#93c5fd", border: "#152840" },
  "Toss-Up":   { bg: "#1a1400", text: "#d4a843", border: "#3a2f00" },
  "Lean R":    { bg: "#1f0808", text: "#fca5a5", border: "#5f1818" },
  "Likely R":  { bg: "#280808", text: "#f87171", border: "#7f1d1d" },
  "Safe R":    { bg: "#380808", text: "#d95a5a", border: "#991b1b" },
};

function Row({ icon: Icon, label, value, valueColor = "#c9d1d9" }: {
  icon: React.ElementType; label: string; value: string; valueColor?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={10} className="text-[#3d4a5c] mt-0.5 shrink-0" />
      <div>
        <div className="text-[#3d4a5c] font-mono text-[7px] tracking-widest">{label}</div>
        <div className="font-mono text-[12px] font-bold" style={{ color: valueColor }}>{value}</div>
      </div>
    </div>
  );
}

interface Props { race: SenateRace | null; onClose: () => void; }

export function RaceDetailModal({ race, onClose }: Props) {
  return (
    <AnimatePresence>
      {race && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-[#080c12] border-l border-[#1c2333] z-50 overflow-y-auto flex flex-col"
            style={{ fontFamily: "'Courier New', monospace" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c2333] bg-[#0b0f16] sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <span className="text-[#d4a843] font-mono text-[10px] font-bold tracking-widest">
                  {race.stateCode} · U.S. SENATE
                </span>
                {!race.called && race.key && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4a843] blink" />
                )}
              </div>
              <button onClick={onClose} className="text-[#3d4a5c] hover:text-[#c9d1d9] transition-colors p-1">
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col flex-1">
              {/* State + lean */}
              <div className="px-4 py-3 border-b border-[#1c2333]">
                <div className="text-[#c9d1d9] font-mono text-[15px] font-bold mb-1.5">{race.state}</div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const c = LEAN_COLORS[race.lean];
                    return (
                      <span
                        className="font-mono text-[8px] font-bold px-2 py-0.5 tracking-widest"
                        style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                      >
                        {race.lean.toUpperCase()}
                      </span>
                    );
                  })()}
                  {race.called && (
                    <span className="font-mono text-[7px] text-[#4ade80] tracking-widest">✓ CALLED</span>
                  )}
                  {race.key && (
                    <span className="font-mono text-[7px] text-[#d4a843] tracking-widest">BATTLEGROUND</span>
                  )}
                </div>
              </div>

              {/* Candidates */}
              <div className="px-4 py-3 border-b border-[#1c2333]">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-[#0d1117] border border-[#1d3a6b] p-3">
                    <div className="text-[#4a90d9] font-mono text-[7px] tracking-widest mb-1">DEMOCRAT</div>
                    <div className="text-[#c9d1d9] font-mono text-[10px] font-bold leading-snug mb-1">{race.demCandidate}</div>
                    <div className="text-[#4a90d9] font-mono text-[26px] font-bold leading-none">{race.demPct}%</div>
                    <div className="h-1 bg-[#0a1a2e] rounded-sm mt-2 overflow-hidden">
                      <div className="h-full rounded-sm" style={{ width: `${race.demPct}%`, background: "#4a90d9" }} />
                    </div>
                  </div>
                  <div className="bg-[#0d1117] border border-[#6b1d1d] p-3">
                    <div className="text-[#d95a5a] font-mono text-[7px] tracking-widest mb-1">REPUBLICAN</div>
                    <div className="text-[#c9d1d9] font-mono text-[10px] font-bold leading-snug mb-1">{race.repCandidate}</div>
                    <div className="text-[#d95a5a] font-mono text-[26px] font-bold leading-none">{race.repPct}%</div>
                    <div className="h-1 bg-[#2a0808] rounded-sm mt-2 overflow-hidden">
                      <div className="h-full rounded-sm" style={{ width: `${race.repPct}%`, background: "#d95a5a" }} />
                    </div>
                  </div>
                </div>

                {/* Margin bar */}
                <div className="flex h-2.5 rounded-sm overflow-hidden mb-1">
                  {(() => {
                    const t = race.demPct + race.repPct;
                    const dw = (race.demPct / t) * 100;
                    return (
                      <>
                        <div className="h-full" style={{ width: `${dw}%`, background: "linear-gradient(90deg,#1d4ed8,#4a90d9)" }} />
                        <div className="h-full" style={{ width: `${100 - dw}%`, background: "linear-gradient(90deg,#d95a5a,#a83232)" }} />
                      </>
                    );
                  })()}
                </div>
                <div className="flex justify-between font-mono text-[8px] font-bold">
                  <span className="text-[#4a90d9]">{race.demPct}%</span>
                  <span style={{ color: race.margin > 0 ? "#4a90d9" : "#d95a5a" }}>
                    {race.margin > 0 ? "D" : "R"}+{Math.abs(race.margin).toFixed(1)}
                  </span>
                  <span className="text-[#d95a5a]">{race.repPct}%</span>
                </div>
              </div>

              {/* Polling trend */}
              <div className="border-b border-[#1c2333]">
                <div className="flex items-center gap-2 px-4 py-2">
                  <TrendingUp size={10} className="text-[#d4a843]" />
                  <span className="text-[#d4a843] font-mono text-[8px] tracking-widest font-bold">POLLING TREND</span>
                </div>
                <div className="px-2 pb-2">
                  <RacePollChart data={race.pollingSamples} />
                </div>
              </div>

              {/* Fundraising */}
              {race.moneyRaised && (
                <div className="border-b border-[#1c2333]">
                  <div className="flex items-center gap-2 px-4 py-2">
                    <DollarSign size={10} className="text-[#d4a843]" />
                    <span className="text-[#d4a843] font-mono text-[8px] tracking-widest font-bold">FUNDRAISING</span>
                  </div>
                  <div className="px-4 pb-3">
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div>
                        <div className="text-[#4a90d9] font-mono text-[7px]">DEM RAISED</div>
                        <div className="text-[#4a90d9] font-mono text-[18px] font-bold">${race.moneyRaised.dem}M</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[#d95a5a] font-mono text-[7px]">REP RAISED</div>
                        <div className="text-[#d95a5a] font-mono text-[18px] font-bold">${race.moneyRaised.rep}M</div>
                      </div>
                    </div>
                    <MoneyChart dem={race.moneyRaised.dem} rep={race.moneyRaised.rep} />
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="px-4 py-3 grid grid-cols-2 gap-3">
                {race.turnout != null && (
                  <Row icon={Users} label="EST. TURNOUT" value={`${race.turnout}%`} />
                )}
                {race.eventsThisWeek != null && (
                  <Row icon={Calendar} label="EVENTS/WEEK" value={`${race.eventsThisWeek}`} valueColor="#d4a843" />
                )}
                <Row
                  icon={MapPin}
                  label="INCUMBENT"
                  value={race.incumbent === "D" ? "DEMOCRAT" : race.incumbent === "R" ? "REPUBLICAN" : "OPEN SEAT"}
                  valueColor={race.incumbent === "D" ? "#4a90d9" : race.incumbent === "R" ? "#d95a5a" : "#4a5568"}
                />
                <Row
                  icon={TrendingUp}
                  label="BATTLEGROUND"
                  value={race.key ? "YES" : "NO"}
                  valueColor={race.key ? "#d4a843" : "#3d4a5c"}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
