"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid, Area, AreaChart,
} from "recharts";
import { PROBABILITY_HISTORY, SEAT_BALANCE } from "@/lib/electionData";

const MONO_FONT = "'Courier New', monospace";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#020802] border border-[#1a3a1a] px-2 py-1.5 font-mono">
      <div className="text-[#00ff41] text-[8px] mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="text-[8px]" style={{ color: p.color }}>
          {p.name}: {p.value}%
        </div>
      ))}
    </div>
  );
}

export function ProbabilityChart() {
  return (
    <div className="px-2 pt-2 pb-1">
      <div className="text-[#334433] font-mono text-[7px] tracking-widest mb-2 px-1">
        CHAMBER CONTROL PROBABILITY (%)
      </div>
      <ResponsiveContainer width="100%" height={110}>
        <AreaChart data={PROBABILITY_HISTORY} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="demGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#0d1a0d" strokeDasharray="2 4" />
          <XAxis dataKey="date" tick={{ fill: "#334433", fontSize: 7, fontFamily: MONO_FONT }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#334433", fontSize: 7, fontFamily: MONO_FONT }} tickLine={false} axisLine={false} domain={[0, 100]} />
          <Tooltip content={<ChartTooltip />} />
          <ReferenceLine y={50} stroke="#1a3a1a" strokeDasharray="3 3" />
          <Area type="monotone" dataKey="repSenate" name="R Senate" stroke="#ef4444" fill="url(#repGrad)" strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="demSenate" name="D Senate" stroke="#3b82f6" fill="url(#demGrad)" strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="repHouse" name="R House" stroke="#f87171" fill="none" strokeWidth={1} dot={false} strokeDasharray="3 2" />
          <Area type="monotone" dataKey="demHouse" name="D House" stroke="#60a5fa" fill="none" strokeWidth={1} dot={false} strokeDasharray="3 2" />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 px-1 mt-1">
        {[
          { color: "#ef4444", label: "R Senate" },
          { color: "#3b82f6", label: "D Senate" },
          { color: "#f87171", label: "R House", dash: true },
          { color: "#60a5fa", label: "D House", dash: true },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1">
            <div
              className="w-4 h-px"
              style={{
                background: l.color,
                borderTop: l.dash ? `1px dashed ${l.color}` : `1px solid ${l.color}`,
              }}
            />
            <span className="text-[#445544] font-mono text-[7px]">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HistoricalSeatsChart({ chamber }: { chamber: "senate" | "house" }) {
  const data = SEAT_BALANCE[chamber].historical;
  return (
    <ResponsiveContainer width="100%" height={90}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} barGap={2}>
        <CartesianGrid stroke="#0d1a0d" strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="year" tick={{ fill: "#334433", fontSize: 7, fontFamily: MONO_FONT }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: "#334433", fontSize: 7, fontFamily: MONO_FONT }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: "#020802", border: "1px solid #1a3a1a", fontFamily: MONO_FONT, fontSize: 9 }}
          labelStyle={{ color: "#00ff41" }}
          itemStyle={{ color: "#ccc" }}
        />
        <Bar dataKey="dem" name="Dem" fill="#3b82f6" radius={[1, 1, 0, 0]} maxBarSize={16} />
        <Bar dataKey="rep" name="Rep" fill="#ef4444" radius={[1, 1, 0, 0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RacePollChart({ data }: { data: { date: string; dem: number; rep: number }[] }) {
  if (!data || data.length === 0) return null;

  const allVals = data.flatMap((d) => [d.dem, d.rep]).filter((v) => v > 0);
  const minVal = allVals.length > 0 ? Math.floor(Math.min(...allVals) - 3) : 30;
  const maxVal = allVals.length > 0 ? Math.ceil(Math.max(...allVals) + 3) : 70;

  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="demFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="repFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#0d1a0d" strokeDasharray="2 4" />
        <XAxis dataKey="date" tick={{ fill: "#334433", fontSize: 7, fontFamily: MONO_FONT }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: "#334433", fontSize: 7, fontFamily: MONO_FONT }} tickLine={false} axisLine={false} domain={[minVal, maxVal]} />
        <Tooltip content={<ChartTooltip />} />
        <ReferenceLine y={50} stroke="#1a3a1a" strokeDasharray="3 3" />
        <Area type="monotone" dataKey="dem" name="Dem" stroke="#3b82f6" fill="url(#demFill)" strokeWidth={2} dot={{ fill: "#3b82f6", r: 2 }} />
        <Area type="monotone" dataKey="rep" name="Rep" stroke="#ef4444" fill="url(#repFill)" strokeWidth={2} dot={{ fill: "#ef4444", r: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
