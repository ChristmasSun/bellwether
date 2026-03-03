"use client";
import { useElectionData } from "@/lib/ElectionDataContext";
import { type RecentPoll } from "@/lib/electionData";

function PollRow({ poll }: { poll: RecentPoll }) {
  const demResult = poll.results.find((r) => r.party === "DEM");
  const repResult = poll.results.find((r) => r.party === "REP");
  const demPct = demResult?.pct ?? 0;
  const repPct = repResult?.pct ?? 0;
  const spread = demPct - repPct;
  const demLeads = spread > 0;

  return (
    <div className="grid grid-cols-[1fr_32px_32px_60px_40px] gap-1 px-3 py-1.5 border-b border-[#0a100a] hover:bg-[#0a150a] transition-colors">
      <div className="flex flex-col">
        <span className="text-[#888] font-mono text-[8px] truncate">{poll.pollster}</span>
        <div className="flex items-center gap-1 mt-0.5">
          {demPct > 0 && repPct > 0 && (
            <>
              <div
                className="h-0.5 rounded"
                style={{
                  width: "30px",
                  background: `linear-gradient(90deg, #3b82f6 ${(demPct / (demPct + repPct)) * 100}%, #ef4444 ${(demPct / (demPct + repPct)) * 100}%)`
                }}
              />
              <span
                className="font-mono text-[7px] font-bold"
                style={{ color: demLeads ? "#3b82f6" : "#ef4444" }}
              >
                {demLeads ? "D" : "R"}+{Math.abs(spread).toFixed(1)}
              </span>
            </>
          )}
          {poll.subject && (
            <span className="text-[#334433] font-mono text-[6px] ml-1">{poll.subject}</span>
          )}
        </div>
      </div>
      <div className="text-right text-[#3b82f6] font-mono text-[9px] font-bold">
        {demPct > 0 ? demPct.toFixed(1) : "--"}
      </div>
      <div className="text-right text-[#ef4444] font-mono text-[9px] font-bold">
        {repPct > 0 ? repPct.toFixed(1) : "--"}
      </div>
      <div className="text-right text-[#445544] font-mono text-[7px]">{poll.endDate}</div>
      <div className="text-right text-[#334433] font-mono text-[7px]">
        {poll.sampleSize ? `${(poll.sampleSize / 1000).toFixed(1)}K` : "--"}
      </div>
    </div>
  );
}

export function PollingPanel() {
  const { recentPolls } = useElectionData();

  const totalDem = recentPolls.reduce((s, p) => {
    const d = p.results.find((r) => r.party === "DEM");
    return s + (d?.pct ?? 0);
  }, 0);
  const totalRep = recentPolls.reduce((s, p) => {
    const r = p.results.find((r2) => r2.party === "REP");
    return s + (r?.pct ?? 0);
  }, 0);
  const n = recentPolls.filter((p) =>
    p.results.some((r) => r.party === "DEM") && p.results.some((r) => r.party === "REP")
  ).length;
  const avgDem = n > 0 ? totalDem / n : 0;
  const avgRep = n > 0 ? totalRep / n : 0;

  if (recentPolls.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-[#445544] font-mono text-[10px]">
        No recent polls loaded yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      <div className="px-3 py-3 border-b border-[#1a2a1a] bg-[#02100a]">
        <div className="text-[#334433] font-mono text-[8px] tracking-widest mb-2">
          RECENT POLLS AVG ({n} polls, last 60 days)
        </div>
        {n > 0 && (
          <div className="flex items-center gap-3 mb-2">
            <div>
              <span className="text-[#3b82f6] font-mono text-[22px] font-bold leading-none">{avgDem.toFixed(1)}</span>
              <span className="text-[#1d4ed8] font-mono text-[8px] ml-1">DEM</span>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <div className="h-2 rounded-sm overflow-hidden flex gap-px">
                <div
                  style={{ width: `${(avgDem / (avgDem + avgRep)) * 100}%`, background: "linear-gradient(90deg,#1d4ed8,#3b82f6)" }}
                  className="h-full"
                />
                <div
                  style={{ width: `${(avgRep / (avgDem + avgRep)) * 100}%`, background: "linear-gradient(90deg,#ef4444,#b91c1c)" }}
                  className="h-full"
                />
              </div>
              <div className="text-[#445544] font-mono text-[7px] text-center">
                {recentPolls.length} total polls
              </div>
            </div>
            <div className="text-right">
              <span className="text-[#ef4444] font-mono text-[22px] font-bold leading-none">{avgRep.toFixed(1)}</span>
              <span className="text-[#b91c1c] font-mono text-[8px] ml-1">REP</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-[1fr_32px_32px_60px_40px] gap-1 px-3 py-1 text-[#334433] font-mono text-[7px] tracking-widest border-b border-[#1a2a1a]">
        <span>POLLSTER</span>
        <span className="text-right">DEM</span>
        <span className="text-right">REP</span>
        <span className="text-right">DATE</span>
        <span className="text-right">n=</span>
      </div>

      {recentPolls.map((poll) => (
        <PollRow key={poll.id} poll={poll} />
      ))}
    </div>
  );
}
