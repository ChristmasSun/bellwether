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
      <div className="font-mono text-[13px] font-bold tracking-widest text-[#e2b35a]">
        {time}
      </div>
      <div className="font-mono text-[8px] text-[#4a5568] tracking-wider uppercase">
        {date}
      </div>
    </div>
  );
}
