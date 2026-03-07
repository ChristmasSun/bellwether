"use client";
import { useElectionData } from "@/lib/ElectionDataContext";

function Chamber({
  label, demProjected, repProjected, tossUp, majority,
}: {
  label: string;
  demProjected: number;
  repProjected: number;
  tossUp: number;
  majority: number;
}) {
  const total = demProjected + repProjected + tossUp;
  if (total === 0) {
    return (
      <div className="mb-4">
        <div className="text-[#3d4a5c] font-mono text-[7px] tracking-widest mb-1.5">{label}</div>
        <div className="text-[#3d4a5c] font-mono text-[9px] py-4 text-center">
          No race data available
        </div>
      </div>
    );
  }

  const demPct = (demProjected / total) * 100;
  const repPct = (repProjected / total) * 100;
  const majPct = total > 0 ? (majority / total) * 100 : 50;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[7px] text-[#3d4a5c] tracking-widest">{label}</span>
        <span className="font-mono text-[7px] text-[#3d4a5c]">
          {tossUp > 0 ? `${tossUp} TOSS-UP` : ""} · MAJ: {majority}
        </span>
      </div>

      <div className="flex items-end justify-between mb-2">
        <div>
          <span className="font-mono text-[28px] font-bold text-[#4a90d9] leading-none">{demProjected}</span>
          <span className="font-mono text-[8px] text-[#1d3a6b] ml-1">DEM</span>
        </div>
        <div className="text-center">
          <div className="font-mono text-[8px] text-[#3d4a5c]">PROJ</div>
        </div>
        <div className="text-right">
          <span className="font-mono text-[28px] font-bold text-[#d95a5a] leading-none">{repProjected}</span>
          <span className="font-mono text-[8px] text-[#6b1d1d] ml-1">REP</span>
        </div>
      </div>

      <div className="relative h-3 rounded-sm overflow-hidden bg-[#080c12] border border-[#1c2333]">
        <div
          className="absolute left-0 top-0 h-full"
          style={{ width: `${demPct}%`, background: "linear-gradient(90deg, #1d4ed8, #4a90d9)" }}
        />
        {tossUp > 0 && (
          <div
            className="absolute top-0 h-full bg-[#d4a843] opacity-30"
            style={{ left: `${demPct}%`, width: `${(tossUp / total) * 100}%` }}
          />
        )}
        <div
          className="absolute right-0 top-0 h-full"
          style={{ width: `${repPct}%`, background: "linear-gradient(90deg, #d95a5a, #a83232)" }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-[#d4a843] z-10"
          style={{ left: `${majPct}%` }}
        />
      </div>

      <div
        className="font-mono text-[6px] text-[#d4a843] mt-0.5"
        style={{ marginLeft: `${majPct}%`, transform: "translateX(-50%)" }}
      >
        ——{majority}——
      </div>
    </div>
  );
}

export function SeatMeter() {
  const { seatBalance } = useElectionData();
  const s = seatBalance.senate;
  const h = seatBalance.house;

  return (
    <div>
      <Chamber
        label={`U.S. SENATE (${s.total} RACES TRACKED)`}
        demProjected={s.demProjected}
        repProjected={s.repProjected}
        tossUp={s.tossUp}
        majority={s.needed}
      />
      <Chamber
        label={`U.S. HOUSE (${h.total} RACES TRACKED)`}
        demProjected={h.demProjected}
        repProjected={h.repProjected}
        tossUp={h.tossUp}
        majority={h.needed}
      />
    </div>
  );
}
