"use client";
import { useElectionData } from "@/lib/ElectionDataContext";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  trend?: "up" | "down" | "flat";
}

function Metric({ label, value, sub, color = "#00ff41", trend }: MetricProps) {
  return (
    <div className="flex flex-col px-3 py-2 border-r border-[#1a2a1a] last:border-r-0 min-w-[90px]">
      <div className="text-[#334433] font-mono text-[7px] tracking-widest mb-0.5">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-[14px] font-bold leading-none" style={{ color }}>
          {value}
        </span>
        {trend === "up" && <TrendingUp size={9} className="text-[#00ff41] mb-0.5" />}
        {trend === "down" && <TrendingDown size={9} className="text-[#ef4444] mb-0.5" />}
        {trend === "flat" && <Minus size={9} className="text-[#445544] mb-0.5" />}
      </div>
      {sub && <div className="text-[#334433] font-mono text-[7px] mt-0.5">{sub}</div>}
    </div>
  );
}

export function KeyMetricStrip() {
  const { senateRaces, houseRaces, seatBalance, totalSenatePolls, totalHousePolls } = useElectionData();

  const s = seatBalance.senate;
  const h = seatBalance.house;

  const tossUpSenate = senateRaces.filter(
    (r) => r.lean === "Toss-Up" || r.lean === "Lean D" || r.lean === "Lean R"
  ).length;
  const tossUpHouse = houseRaces.filter((r) => r.lean === "Toss-Up").length;
  const demLeading = senateRaces.filter((r) => r.margin > 0).length;
  const repLeading = senateRaces.filter((r) => r.margin < 0).length;

  return (
    <div className="flex overflow-x-auto bg-[#020802] border-b border-[#1a2a1a]">
      <Metric label="SEN PROJ (D)" value={`${s.demProjected}`} sub="of 100" color="#3b82f6" trend="flat" />
      <Metric label="SEN PROJ (R)" value={`${s.repProjected}`} sub="MAJORITY=51" color="#ef4444" trend="flat" />
      <Metric label="HSE PROJ (D)" value={`${h.demProjected}`} sub="of 435" color="#3b82f6" trend="flat" />
      <Metric label="HSE PROJ (R)" value={`${h.repProjected}`} sub="MAJORITY=218" color="#ef4444" trend="flat" />
      <Metric label="SEN TOSS-UPS" value={`${tossUpSenate}`} sub="competitive" color="#fbbf24" />
      <Metric label="HSE TOSS-UPS" value={`${tossUpHouse}`} sub="undecided" color="#fbbf24" />
      <Metric label="D LEADS" value={`${demLeading}`} sub="senate races" color="#3b82f6" />
      <Metric label="R LEADS" value={`${repLeading}`} sub="senate races" color="#ef4444" />
      <Metric label="SEN POLLS" value={`${totalSenatePolls}`} sub="unique polls" color="#00ff41" />
      <Metric label="HSE POLLS" value={`${totalHousePolls}`} sub="unique polls" color="#00ff41" />
      <Metric label="RACES" value={`${senateRaces.length}`} sub="senate tracked" color="#00ff41" />
      <Metric label="DISTRICTS" value={`${houseRaces.length}`} sub="house tracked" color="#00ff41" />
    </div>
  );
}
