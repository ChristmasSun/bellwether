"use client";
import { useElectionData } from "@/lib/ElectionDataContext";

const TAG_STYLES: Record<string, { bg: string; text: string }> = {
  POLL:     { bg: "#1a3a00", text: "#86efac" },
  SENATE:   { bg: "#1a1a2e", text: "#a5b4fc" },
  HOUSE:    { bg: "#1a1a00", text: "#fde68a" },
  NEW:      { bg: "#003a1a", text: "#34d399" },
};

export function NewsFeed() {
  const { recentPolls } = useElectionData();

  if (recentPolls.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-[#445544] font-mono text-[10px]">
        No recent poll activity.
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-[#0d1a0d]">
      {recentPolls.map((poll) => {
        const tag = poll.pollType === "house-race" ? "HOUSE" : "SENATE";
        const tc = TAG_STYLES[tag] ?? TAG_STYLES.POLL;

        const demR = poll.results.find((r) => r.party === "DEM");
        const repR = poll.results.find((r) => r.party === "REP");
        const marginText = demR && repR
          ? `${demR.pct > repR.pct ? "D" : "R"}+${Math.abs(demR.pct - repR.pct).toFixed(1)}`
          : "";

        return (
          <div
            key={poll.id}
            className="px-3 py-2 hover:bg-[#0a150a] transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="font-mono text-[7px] font-bold px-1.5 py-0.5 rounded-sm tracking-widest shrink-0"
                style={{ background: tc.bg, color: tc.text }}
              >
                {tag}
              </span>
              {poll.subject && (
                <span className="text-[#445544] font-mono text-[7px] shrink-0 truncate max-w-[120px]">
                  {poll.subject}
                </span>
              )}
              <span className="text-[#334433] font-mono text-[8px] ml-auto shrink-0">
                {poll.endDate}
              </span>
            </div>
            <div className="text-[#aaa] font-mono text-[9px] leading-relaxed group-hover:text-[#ccc] transition-colors">
              {poll.pollster}{marginText ? ` — ${marginText}` : ""}
            </div>
            <div className="text-[#334433] font-mono text-[7px] mt-0.5">
              {poll.sampleSize ? `n=${poll.sampleSize.toLocaleString()}` : ""}
              {poll.population ? ` · ${poll.population.toUpperCase()}` : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}
