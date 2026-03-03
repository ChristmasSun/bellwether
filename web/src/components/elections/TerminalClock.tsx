"use client";
import { useEffect, useState } from "react";

export function TerminalClock() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "America/New_York",
        }) + " ET"
      );
      setDate(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-right">
      <div className="text-[#00ff41] font-mono text-[13px] font-bold tracking-widest glow-text">
        {time}
      </div>
      <div className="text-[#445544] font-mono text-[9px] tracking-wider uppercase">
        {date}
      </div>
    </div>
  );
}
