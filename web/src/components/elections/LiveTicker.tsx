"use client";
import { useElectionData } from "@/lib/ElectionDataContext";

export function LiveTicker() {
  const { tickerItems } = useElectionData();
  const fullText = tickerItems.join("     ·     ");
  const doubled = fullText + "     ·     " + fullText;

  return (
    <div className="bg-[#0b0f16] border-b border-[#1c2333] overflow-hidden py-1.5 select-none">
      <div className="flex items-center gap-0">
        <div className="shrink-0 bg-[#d4a843] text-[#080c12] text-[8px] font-bold px-2.5 py-1 mr-3 tracking-[0.2em] z-10 font-mono">
          LIVE
        </div>
        <div className="overflow-hidden flex-1">
          <div className="ticker-track whitespace-nowrap inline-block">
            <span className="text-[#4a5568] font-mono text-[9px] tracking-wide">
              {doubled}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
