"use client";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid,
} from "recharts";
import { useElectionData } from "@/lib/ElectionDataContext";

const MONO = "'Courier New', monospace";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#080c12] border border-[#1c2333] px-2 py-1.5 font-mono">
      <div className="text-[#d4a843] text-[8px] mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="text-[8px]" style={{ color: p.color }}>
          {p.name}: {p.value}%
        </div>
      ))}
    </div>
  );
}

export function ProbabilityChart() {
  const { seatBalance } = useElectionData();

  // Senate 2026: Class 2 seats contested. After 2024 election:
  //   R held 53 total, 11 are Class 2 (defending) → 42 R non-contested
  //   D held 47 total, 23 are Class 2 (defending) → 24 D non-contested
  const SEN_R_BASE = 42;
  const SEN_D_BASE = 24;
  const { demProjected: sDem, repProjected: sRep, tossUp: sToss } = seatBalance.senate;

  // Project with toss-ups split 50/50 for expected-value estimate
  const senDTotal = SEN_D_BASE + sDem + Math.round(sToss * 0.5);
  const senRTotal = SEN_R_BASE + sRep + Math.round(sToss * 0.5);
  // D needs 51 for majority; R needs 50 (VP tie-breaker currently R)
  const senDCtrlPct = Math.min(99, Math.max(1, Math.round((senDTotal / 100) * 100)));
  const senRCtrlPct = 100 - senDCtrlPct;

  // House: only competitive races tracked — show lean breakdown as proxy signal
  const hTracked = seatBalance.house.demProjected + seatBalance.house.repProjected + seatBalance.house.tossUp;
  const hDPct = hTracked > 0
    ? Math.min(99, Math.max(1, Math.round(((seatBalance.house.demProjected + seatBalance.house.tossUp * 0.5) / hTracked) * 100)))
    : 50;
  const hRPct = 100 - hDPct;

  if (sDem + sRep + sToss === 0) {
    return (
      <div className="px-2 pt-2 pb-1">
        <div className="text-[#2a3447] font-mono text-[6.5px] tracking-widest mb-1.5 px-1">
          CHAMBER CONTROL PROBABILITY (%)
        </div>
        <div className="flex items-center justify-center h-[100px] text-[#3d4a5c] font-mono text-[9px]">
          Awaiting race data...
        </div>
      </div>
    );
  }

  const rows = [
    { label: "SENATE", D: senDCtrlPct, R: senRCtrlPct, dSeats: senDTotal, rSeats: senRTotal },
    { label: "HOUSE", D: hDPct, R: hRPct, dSeats: null, rSeats: null },
  ];

  return (
    <div className="px-2 pt-2 pb-2 flex flex-col gap-3">
      <div className="text-[#2a3447] font-mono text-[6.5px] tracking-widest px-1">
        CHAMBER CONTROL PROBABILITY (%)
      </div>
      {rows.map((row) => (
        <div key={row.label} className="px-1">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[6.5px] text-[#2a3447] tracking-widest">{row.label}</span>
            {row.dSeats !== null && (
              <span className="font-mono text-[6.5px] text-[#2a3447]">
                D{row.dSeats} · R{row.rSeats} / 100 seats
              </span>
            )}
          </div>
          <div className="relative h-5 flex overflow-hidden rounded-sm">
            <div
              className="h-full flex items-center justify-end pr-1 transition-all"
              style={{ width: `${row.D}%`, background: "linear-gradient(90deg, #1d4ed8, #4a90d9)" }}
            >
              {row.D > 18 && (
                <span className="font-mono text-[7px] font-bold text-white">{row.D}%</span>
              )}
            </div>
            <div
              className="h-full flex items-center justify-start pl-1 transition-all"
              style={{ width: `${row.R}%`, background: "linear-gradient(90deg, #d95a5a, #a83232)" }}
            >
              {row.R > 18 && (
                <span className="font-mono text-[7px] font-bold text-white">{row.R}%</span>
              )}
            </div>
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="font-mono text-[6px] text-[#4a90d9]">D CONTROL</span>
            <span className="font-mono text-[6px] text-[#d95a5a]">R CONTROL</span>
          </div>
        </div>
      ))}
      <div className="text-[#1c2333] font-mono text-[6px] px-1">
        Senate uses 2026 non-contested baseline · House competitive races only
      </div>
    </div>
  );
}

export function HistoricalSeatsChart({ chamber }: { chamber: "senate" | "house" }) {
  const SENATE_DATA = [
    { year: "2016", dem: 48, rep: 52 },
    { year: "2018", dem: 47, rep: 53 },
    { year: "2020", dem: 50, rep: 50 },
    { year: "2022", dem: 51, rep: 49 },
    { year: "2024", dem: 47, rep: 53 },
  ];
  const HOUSE_DATA = [
    { year: "2016", dem: 194, rep: 241 },
    { year: "2018", dem: 235, rep: 200 },
    { year: "2020", dem: 222, rep: 213 },
    { year: "2022", dem: 213, rep: 222 },
    { year: "2024", dem: 215, rep: 220 },
  ];
  const data = chamber === "senate" ? SENATE_DATA : HOUSE_DATA;
  const majority = chamber === "senate" ? 51 : 218;

  return (
    <ResponsiveContainer width="100%" height={80}>
      <BarChart data={data} margin={{ top: 2, right: 4, bottom: 0, left: -22 }} barCategoryGap="20%">
        <CartesianGrid stroke="#0f1520" strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="year" tick={{ fill: "#2a3447", fontSize: 7, fontFamily: MONO }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: "#2a3447", fontSize: 7, fontFamily: MONO }} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <ReferenceLine y={majority} stroke="#d4a843" strokeDasharray="3 3" strokeWidth={1} />
        <Bar dataKey="dem" name="Dem" fill="#4a90d9" radius={[1, 1, 0, 0]} maxBarSize={14} />
        <Bar dataKey="rep" name="Rep" fill="#d95a5a" radius={[1, 1, 0, 0]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RacePollChart({ data }: { data: { date: string; dem: number; rep: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[130px] text-[#3d4a5c] font-mono text-[9px]">
        No polling data available
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={130}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
        <defs>
          <linearGradient id="demFillRC" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4a90d9" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#4a90d9" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="repFillRC" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#d95a5a" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#d95a5a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#0f1520" strokeDasharray="2 4" />
        <XAxis dataKey="date" tick={{ fill: "#2a3447", fontSize: 7, fontFamily: MONO }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: "#2a3447", fontSize: 7, fontFamily: MONO }} tickLine={false} axisLine={false} domain={[40, 60]} />
        <Tooltip content={<ChartTooltip />} />
        <ReferenceLine y={50} stroke="#1c2333" strokeDasharray="3 3" />
        <Area type="monotone" dataKey="dem" name="Dem" stroke="#4a90d9" fill="url(#demFillRC)" strokeWidth={2} dot={{ fill: "#4a90d9", r: 2 }} />
        <Area type="monotone" dataKey="rep" name="Rep" stroke="#d95a5a" fill="url(#repFillRC)" strokeWidth={2} dot={{ fill: "#d95a5a", r: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MoneyChart({ dem, rep }: { dem: number; rep: number }) {
  const data = [{ name: "Raised", dem, rep }];
  return (
    <ResponsiveContainer width="100%" height={50}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
        <XAxis type="number" tick={{ fill: "#2a3447", fontSize: 7, fontFamily: MONO }} tickLine={false} axisLine={false} unit="M" />
        <YAxis type="category" dataKey="name" tick={false} width={0} />
        <Tooltip
          contentStyle={{ background: "#080c12", border: "1px solid #1c2333", fontFamily: MONO, fontSize: 8 }}
          formatter={(v: any) => [`$${v}M`, ""]}
          labelStyle={{ color: "#d4a843" }}
        />
        <Bar dataKey="dem" name="Dem $" fill="#4a90d9" radius={[0, 2, 2, 0]} maxBarSize={12} />
        <Bar dataKey="rep" name="Rep $" fill="#d95a5a" radius={[0, 2, 2, 0]} maxBarSize={12} />
      </BarChart>
    </ResponsiveContainer>
  );
}
