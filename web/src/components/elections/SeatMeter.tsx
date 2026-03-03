"use client";
import { useElectionData } from "@/lib/ElectionDataContext";

function Bar({ dem, rep, total }: { dem: number; rep: number; total: number }) {
  const demW = (dem / total) * 100;
  const repW = (rep / total) * 100;
  const remainW = 100 - demW - repW;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-sm gap-px">
      <div
        className="h-full transition-all duration-700"
        style={{ width: `${demW}%`, background: "linear-gradient(90deg, #1d4ed8, #3b82f6)" }}
      />
      <div
        className="h-full bg-[#1a2a1a]"
        style={{ width: `${remainW}%` }}
      />
      <div
        className="h-full transition-all duration-700"
        style={{ width: `${repW}%`, background: "linear-gradient(90deg, #ef4444, #b91c1c)" }}
      />
    </div>
  );
}

export function SeatMeter() {
  const { seatBalance } = useElectionData();
  const s = seatBalance.senate;
  const h = seatBalance.house;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-[#050d05] border border-[#1a2a1a] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#00ff41] font-mono text-[9px] tracking-widest uppercase">Senate Balance</span>
          <span className="text-[#445544] font-mono text-[8px]">Need {s.needed}</span>
        </div>
        <Bar dem={s.demProjected} rep={s.repProjected} total={100} />
        <div className="flex justify-between mt-1.5">
          <div>
            <div className="text-[#3b82f6] font-mono text-[18px] font-bold leading-none">{s.demProjected}</div>
            <div className="text-[#1d4ed8] font-mono text-[8px] tracking-widest">DEM PROJ</div>
          </div>
          <div className="text-center">
            <div className="text-[#445544] font-mono text-[11px] font-bold">{s.tossUp}</div>
            <div className="text-[#333] font-mono text-[7px] tracking-widest">TOSS-UP</div>
          </div>
          <div className="text-right">
            <div className="text-[#ef4444] font-mono text-[18px] font-bold leading-none">{s.repProjected}</div>
            <div className="text-[#b91c1c] font-mono text-[8px] tracking-widest">REP PROJ</div>
          </div>
        </div>
      </div>

      <div className="bg-[#050d05] border border-[#1a2a1a] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#00ff41] font-mono text-[9px] tracking-widest uppercase">House Balance</span>
          <span className="text-[#445544] font-mono text-[8px]">Need {h.needed}</span>
        </div>
        <Bar dem={h.demProjected} rep={h.repProjected} total={435} />
        <div className="flex justify-between mt-1.5">
          <div>
            <div className="text-[#3b82f6] font-mono text-[18px] font-bold leading-none">{h.demProjected}</div>
            <div className="text-[#1d4ed8] font-mono text-[8px] tracking-widest">DEM PROJ</div>
          </div>
          <div className="text-center">
            <div className="text-[#445544] font-mono text-[11px] font-bold">{h.tossUp}</div>
            <div className="text-[#333] font-mono text-[7px] tracking-widest">TOSS-UP</div>
          </div>
          <div className="text-right">
            <div className="text-[#ef4444] font-mono text-[18px] font-bold leading-none">{h.repProjected}</div>
            <div className="text-[#b91c1c] font-mono text-[8px] tracking-widest">REP PROJ</div>
          </div>
        </div>
      </div>
    </div>
  );
}
