"use client";
import { useElectionData } from "@/lib/ElectionDataContext";

export function LiveTicker() {
  const { tickerItems } = useElectionData();

  const fullText = tickerItems.join("   ///   ");
  const doubled = fullText + "   ///   " + fullText;

  return (
    <div className="bg-[#020802] border-t border-b border-[#1a2a1a] overflow-hidden py-1.5 select-none">
      <div className="flex items-center">
        <div className="shrink-0 bg-[#00ff41] text-black text-[9px] font-bold px-2 py-0.5 mr-3 tracking-widest z-10">
          LIVE
        </div>
        <div className="overflow-hidden flex-1">
          <div className="ticker-track">
            <span className="text-[#aaa] font-mono text-[10px] tracking-wide whitespace-nowrap pr-8">
              {doubled}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
