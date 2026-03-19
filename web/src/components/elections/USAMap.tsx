"use client";
import { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { type SenateRace } from "@/lib/electionData";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

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

interface Props {
  senateRaces: SenateRace[];
  onStateClick: (code: string) => void;
}

export function SenateMap({ senateRaces, onStateClick }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const raceMap = Object.fromEntries(senateRaces.map((r) => [r.stateCode, r]));

  function getFill(code: string): string {
    const race = raceMap[code];
    if (!race) return "#EDEAE4";
    const lean = race.lean;
    const fills: Record<string, string> = {
      "Safe D": "#2E5FA1",
      "Likely D": "#5A8AC4",
      "Lean D": "#9AB8D9",
      "Toss-Up": "#D4C5A0",
      "Lean R": "#D9A9A0",
      "Likely R": "#CC6B5A",
      "Safe R": "#C23B22",
    };
    return fills[lean] ?? "#D4C5A0";
  }

  function getHoverFill(code: string): string {
    const race = raceMap[code];
    if (!race) return "#E5E2DC";
    const lean = race.lean;
    if (lean.includes("D")) return "#1A4080";
    if (lean.includes("R")) return "#8B1A10";
    return "#6B5C40";
  }

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <ComposableMap
        projection="geoAlbersUsa"
        width={700}
        height={320}
        style={{ width: "100%", maxHeight: 210 }}
        projectionConfig={{ scale: 680, center: [-2, 3] as any }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const fips = geo.id as string;
              const code = FIPS[fips] ?? "";
              const hasRace = !!raceMap[code];
              const isHovered = hovered === code;

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={isHovered && hasRace ? getHoverFill(code) : getFill(code)}
                  stroke="#F5F3EE"
                  strokeWidth={1}
                  style={{
                    default: { outline: "none", cursor: hasRace ? "pointer" : "default" },
                    hover: { outline: "none", cursor: hasRace ? "pointer" : "default" },
                    pressed: { outline: "none" },
                  }}
                  onClick={() => hasRace && onStateClick(code)}
                  onMouseEnter={() => setHovered(code)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}
