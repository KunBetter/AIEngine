"use client";

import type { NPCState } from "@/lib/types";

const LOCATION_COORDS: Record<string, { x: number; y: number }> = {
  "钟楼": { x: 200, y: 45 },
  "花店": { x: 200, y: 145 },
  "广场": { x: 130, y: 95 },
  "诊所": { x: 280, y: 95 },
  "警局": { x: 90, y: 145 },
  "图书馆": { x: 130, y: 175 },
};

const ROAD_PATHS = [
  { x1: 130, y1: 95, x2: 200, y2: 45 },
  { x1: 130, y1: 95, x2: 200, y2: 145 },
  { x1: 130, y1: 95, x2: 280, y2: 95 },
  { x1: 130, y1: 95, x2: 90, y2: 145 },
  { x1: 130, y1: 95, x2: 130, y2: 175 },
];

const NPC_COLORS: Record<string, string> = {
  elias: "#ffcc00", rose: "#ff6b9d", marcus: "#64b5f6",
  brooks: "#8888ff", vera: "#bb66ff", sam: "#88aa88",
};

const NPC_LABELS: Record<string, string> = {
  elias: "Elias", rose: "Rose", marcus: "Marcus",
  brooks: "Brooks", vera: "Vera", sam: "Old Sam",
};

function getTimeOfDayGradient(hour: number): { overlay: string; accent: string } {
  if (hour >= 7 && hour < 10) return { overlay: "rgba(100,120,180,0.25)", accent: "#8899cc" };
  if (hour >= 10 && hour < 14) return { overlay: "rgba(255,220,150,0.15)", accent: "#ffcc88" };
  if (hour >= 14 && hour < 17) return { overlay: "rgba(255,255,240,0.08)", accent: "#ffffff" };
  if (hour >= 17 && hour < 20) return { overlay: "rgba(255,140,80,0.25)", accent: "#ff9966" };
  if (hour >= 20 && hour < 24) return { overlay: "rgba(20,30,80,0.45)", accent: "#4466aa" };
  return { overlay: "rgba(80,10,10,0.55)", accent: "#cc3333" };
}

interface TownMapProps {
  currentLocation: string;
  timeOfDay: number;
  npcs: Record<string, NPCState>;
  selectedNPC: string | null;
  onLocationClick: (location: string) => void;
  onNPCClick: (npcId: string) => void;
}

export function TownMap({ currentLocation, timeOfDay, npcs, selectedNPC, onLocationClick, onNPCClick }: TownMapProps) {
  const { overlay, accent } = getTimeOfDayGradient(timeOfDay);
  const isNight = timeOfDay >= 20;

  const npcsAtLocation = (loc: string) =>
    Object.entries(npcs).filter(([, n]) => n.location === loc);

  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
      <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">橡木镇</h3>
      <svg viewBox="0 0 400 250" className="w-full" style={{ transition: "filter 2s ease" }}>
        <defs>
          <radialGradient id="timeOverlay">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor={overlay} />
          </radialGradient>
          {isNight && (
            <filter id="nightGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          )}
        </defs>

        {ROAD_PATHS.map((p, i) => (
          <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
            stroke="#2a2a4a" strokeWidth="3" />
        ))}

        <rect x="0" y="0" width="400" height="250" fill="url(#timeOverlay)"
          style={{ transition: "opacity 2s ease" }} />

        {Object.entries(LOCATION_COORDS).map(([name, pos]) => {
          const isCurrent = currentLocation === name;
          const npcsHere = npcsAtLocation(name);
          return (
            <g key={name}>
              <circle
                cx={pos.x} cy={pos.y}
                r={isCurrent ? 12 : 8}
                fill={isCurrent ? accent : "#1a1a2e"}
                stroke={isCurrent ? accent : "#3a3a5a"}
                strokeWidth="2"
                style={{
                  cursor: "pointer",
                  transition: "all 0.5s ease",
                  filter: isNight ? "url(#nightGlow)" : undefined,
                }}
                onClick={() => onLocationClick(name)}
              />
              {npcsHere.map(([id]) => (
                <circle key={id}
                  cx={pos.x + 16} cy={pos.y - 16} r="5"
                  fill={NPC_COLORS[id] || "#888"}
                  stroke="#0d0d24" strokeWidth="1"
                  className={id === selectedNPC ? "animate-pulse" : ""}
                  style={{
                    animation: "pulseGlow 1.5s ease-in-out infinite",
                    cursor: "pointer",
                  }}
                  onClick={(e) => { e.stopPropagation(); onNPCClick(id); }}
                />
              ))}
              <text x={pos.x} y={pos.y + 22} textAnchor="middle"
                fill={isCurrent ? accent : "#666"}
                fontSize="9" fontWeight={isCurrent ? "bold" : "normal"}
                style={{ transition: "fill 0.5s ease" }}>
                {name}
              </text>
            </g>
          );
        })}

        {(() => {
          const pos = LOCATION_COORDS[currentLocation];
          if (!pos) return null;
          return (
            <text x={pos.x} y={pos.y - 20} textAnchor="middle" fill="#fff" fontSize="10"
              className="animate-bounce">
              ▼
            </text>
          );
        })()}
      </svg>

      <div className="mt-3 pt-3 border-t border-[#1a1a2e]">
        <p className="text-xs text-gray-500 mb-2">当前在此地的NPC:</p>
        {npcsAtLocation(currentLocation).length === 0 ? (
          <p className="text-xs text-gray-600">无人</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {npcsAtLocation(currentLocation).map(([id]) => (
              <button key={id}
                onClick={() => onNPCClick(id)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  selectedNPC === id
                    ? "border-[#ff6b9d] text-[#ff6b9d] bg-[#ff6b9d]/10"
                    : "border-[#2a2a4a] text-gray-400 hover:border-[#4a4a6a]"
                }`}>
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                  style={{ backgroundColor: NPC_COLORS[id] || "#888" }} />
                {NPC_LABELS[id]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
