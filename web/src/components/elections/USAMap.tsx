"use client";
import { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { type SenateRace, type HouseRace } from "@/lib/electionData";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// FIPS code → state abbreviation
const FIPS: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
  "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
  "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
  "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
  "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
  "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
  "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
  "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
  "56": "WY",
};

function leanToFill(lean: string | null, hasRace: boolean): string {
  if (!lean) return hasRace ? "#131d2a" : "#0e1520";
  const map: Record<string, string> = {
    "Safe D":   "#0d2a5c",
    "Likely D": "#0f3268",
    "Lean D":   "#0c2448",
    "Toss-Up":  "#2a2200",
    "Lean R":   "#3a0a0a",
    "Likely R": "#4a0a0a",
    "Safe R":   "#5c0a0a",
  };
  return map[lean] ?? "#0e1520";
}

function leanToStroke(lean: string | null, hasRace: boolean): string {
  if (!lean) return hasRace ? "#1e2d3f" : "#161e28";
  const map: Record<string, string> = {
    "Safe D":   "#1d4a8b",
    "Likely D": "#1d5a9b",
    "Lean D":   "#1a3a6a",
    "Toss-Up":  "#5a4800",
    "Lean R":   "#7a1818",
    "Likely R": "#9a1d1d",
    "Safe R":   "#b82020",
  };
  return map[lean] ?? "#161e28";
}

function leanToAccent(lean: string | null): string {
  if (!lean) return "#3d4a5c";
  const map: Record<string, string> = {
    "Safe D":   "#4a90d9",
    "Likely D": "#60a5fa",
    "Lean D":   "#93c5fd",
    "Toss-Up":  "#d4a843",
    "Lean R":   "#fca5a5",
    "Likely R": "#f87171",
    "Safe R":   "#d95a5a",
  };
  return map[lean] ?? "#3d4a5c";
}

interface Props {
  senateRaces: SenateRace[];
  houseRaces: HouseRace[];
  onStateClick: (code: string) => void;
}

interface TooltipState {
  code: string;
  name: string;
  lean: string | null;
  houseCount: number;
  x: number;
  y: number;
}

export function USAMap({ senateRaces, houseRaces, onStateClick }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const senateMap = Object.fromEntries(senateRaces.map((r) => [r.stateCode, r]));

  const getLean = (code: string) => senateMap[code]?.lean ?? null;

  return (
    <div className="relative w-full bg-[#080c12]">
      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1 border-b border-[#1c2333] flex-wrap bg-[#0b0f16]">
        {[
          { color: "#4a90d9", label: "Safe D" },
          { color: "#60a5fa", label: "Likely D" },
          { color: "#93c5fd", label: "Lean D" },
          { color: "#d4a843", label: "Toss-Up" },
          { color: "#fca5a5", label: "Lean R" },
          { color: "#f87171", label: "Likely R" },
          { color: "#d95a5a", label: "Safe R" },
          { color: "#2a3447", label: "No Senate Race" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ background: l.color }} />
            <span className="font-mono text-[6.5px] text-[#3d4a5c]">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Map */}
      <div
        className="relative"
        onMouseLeave={() => setTooltip(null)}
      >
        <ComposableMap
          projection="geoAlbersUsa"
          style={{ width: "100%", height: 240 }}
          projectionConfig={{ scale: 900 }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const fips = geo.id as string;
                const code = FIPS[fips] ?? "";
                const lean = getLean(code);
                const houseCount = houseRaces.filter((r) => r.stateCode === code).length;
                const hasRace = !!lean || houseCount > 0;
                const fill = leanToFill(lean, hasRace);
                const stroke = leanToStroke(lean, hasRace);
                const accent = leanToAccent(lean);

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none", opacity: hasRace ? 1 : 0.5 },
                      hover: {
                        outline: "none",
                        fill: hasRace ? accent + "33" : fill,
                        stroke: hasRace ? accent : stroke,
                        strokeWidth: 1.5,
                        filter: "brightness(1.4)",
                        cursor: hasRace ? "pointer" : "default",
                      },
                      pressed: { outline: "none" },
                    }}
                    onClick={() => hasRace && onStateClick(code)}
                    onMouseEnter={(e) => {
                      if (!code) return;
                      setTooltip({
                        code,
                        name: geo.properties.name,
                        lean,
                        houseCount,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                    onMouseMove={(e) => {
                      if (tooltip) setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : t);
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>

        {/* Tooltip */}
        {tooltip && (() => {
          const race = senateMap[tooltip.code];
          return (
            <div
              className="fixed bg-[#0d1117] border border-[#1c2333] px-3 py-2 pointer-events-none z-50 min-w-[190px]"
              style={{
                left: tooltip.x + 12,
                top: tooltip.y - 10,
                boxShadow: "0 4px 20px rgba(0,0,0,0.7)",
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[11px] font-bold text-[#c9d1d9]">{tooltip.name}</span>
                <span className="font-mono text-[9px] font-bold text-[#d4a843]">{tooltip.code}</span>
              </div>
              {race && (
                <>
                  <div className="font-mono text-[6.5px] text-[#3d4a5c] mb-0.5">SENATE</div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[8px] text-[#4a90d9]">
                      {race.demCandidate} {race.demPct}%
                    </span>
                    <span className="font-mono text-[8px] text-[#d95a5a]">
                      {race.repCandidate} {race.repPct}%
                    </span>
                  </div>
                  <div className="font-mono text-[8px] font-bold" style={{ color: leanToAccent(race.lean) }}>
                    {race.lean}
                  </div>
                </>
              )}
              {tooltip.houseCount > 0 && (
                <div className="font-mono text-[6.5px] text-[#3d4a5c] mt-1">
                  {tooltip.houseCount} HOUSE RACE{tooltip.houseCount > 1 ? "S" : ""}
                </div>
              )}
              {(race || tooltip.houseCount > 0) && (
                <div className="font-mono text-[6px] text-[#2a3447] mt-1.5">CLICK TO VIEW DETAIL →</div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
