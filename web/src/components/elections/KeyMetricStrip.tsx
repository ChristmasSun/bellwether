"use client";
import { useElectionData } from "@/lib/ElectionDataContext";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function Metric({
  label, value, sub, color = "#c9d1d9", trend,
}: {
  label: string; value: string; sub?: string; color?: string; trend?: "up" | "down" | "flat";
}) {
  return (
    <div className="flex flex-col px-3 py-1.5 border-r border-[#1c2333] last:border-r-0 min-w-[82px] shrink-0">
      <div className="text-[#3d4a5c] font-mono text-[6.5px] tracking-widest mb-0.5">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-[13px] font-bold leading-none" style={{ color }}>
          {value}
        </span>
        {trend === "up" && <TrendingUp size={8} className="text-[#4ade80] mb-0.5" />}
        {trend === "down" && <TrendingDown size={8} className="text-[#f87171] mb-0.5" />}
        {trend === "flat" && <Minus size={8} style={{ color: "#3d4a5c" }} className="mb-0.5" />}
      </div>
      {sub && <div className="text-[#2a3447] font-mono text-[6.5px] mt-0.5">{sub}</div>}
    </div>
  );
}

export function KeyMetricStrip() {
  const { senateRaces, houseRaces, seatBalance, totalSenatePolls, totalHousePolls } = useElectionData();
  const s = seatBalance.senate;
  const h = seatBalance.house;
  const tossUpSenate = senateRaces.filter((r) => r.lean === "Toss-Up" || r.lean === "Lean D" || r.lean === "Lean R").length;
  const tossUpHouse = houseRaces.filter((r) => r.lean === "Toss-Up").length;
  const totalFundDem = senateRaces.reduce((acc, r) => acc + (r.moneyRaised?.dem ?? 0), 0);
  const totalFundRep = senateRaces.reduce((acc, r) => acc + (r.moneyRaised?.rep ?? 0), 0);

  return (
    <div className="flex overflow-x-auto bg-[#080c12] border-b border-[#1c2333] no-scrollbar">
      <Metric label="SEN PROJ (D)" value={`${s.demProjected}`} sub={`of ${s.total} tracked`} color="#4a90d9" />
      <Metric label="SEN PROJ (R)" value={`${s.repProjected}`} sub={`maj=${s.needed}`} color="#d95a5a" />
      <Metric label="HSE PROJ (D)" value={`${h.demProjected}`} sub={`of ${h.total} tracked`} color="#4a90d9" />
      <Metric label="HSE PROJ (R)" value={`${h.repProjected}`} sub={`maj=${h.needed}`} color="#d95a5a" />
      <Metric label="TOSS-UP SEN" value={`${tossUpSenate}`} sub="competitive" color="#d4a843" />
      <Metric label="TOSS-UP HSE" value={`${tossUpHouse}`} sub="undecided" color="#d4a843" />
      <Metric label="SEN POLLS" value={`${totalSenatePolls}`} sub="total collected" color="#8b949e" />
      <Metric label="HSE POLLS" value={`${totalHousePolls}`} sub="total collected" color="#8b949e" />
      {totalFundDem > 0 && <Metric label="D RAISED" value={`$${totalFundDem.toFixed(0)}M`} sub="senate total" color="#4a90d9" />}
      {totalFundRep > 0 && <Metric label="R RAISED" value={`$${totalFundRep.toFixed(0)}M`} sub="senate total" color="#d95a5a" />}
    </div>
  );
}
