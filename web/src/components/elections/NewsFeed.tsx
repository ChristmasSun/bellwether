"use client";
import { useElectionData } from "@/lib/ElectionDataContext";

export function NewsFeed() {
  const { newsItems } = useElectionData();

  if (newsItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-[#3d4a5c] font-mono text-[9px]">
        No news items available.
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-[#0f1520]">
      {newsItems.map((item, i) => {
        const isUrgent = item.urgent;
        return (
          <div key={i} className="px-4 py-2.5 hover:bg-[#0d1117] transition-colors cursor-pointer group">
            <div className="flex items-center gap-2 mb-1">
              {isUrgent && (
                <span className="font-mono text-[7px] font-bold px-1.5 py-0.5 tracking-widest bg-[#3a0a0a] text-[#f87171] border border-[#7f1d1d] shrink-0">
                  BREAKING
                </span>
              )}
              <span className="text-[#d4a843] font-mono text-[7px] font-bold shrink-0">{item.tag}</span>
              <span className="text-[#2a3447] font-mono text-[7px] ml-auto shrink-0">{item.time}</span>
            </div>
            <div className="text-[#8b949e] font-mono text-[9px] leading-relaxed group-hover:text-[#c9d1d9] transition-colors">
              {item.headline}
            </div>
          </div>
        );
      })}
    </div>
  );
}
