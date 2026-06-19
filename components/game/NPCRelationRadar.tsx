// components/game/NPCRelationRadar.tsx
"use client";

import type { NPCState } from "@/lib/types";

const NPC_COLORS: Record<string, string> = {
  elias: "#ffcc00", rose: "#ff6b9d", marcus: "#64b5f6",
  brooks: "#8888ff", vera: "#bb66ff", sam: "#88aa88",
};

const NPC_LABELS: Record<string, string> = {
  elias: "Elias", rose: "Rose", marcus: "Marcus",
  brooks: "Brooks", vera: "Vera", sam: "Sam",
};

interface NPCRelationRadarProps {
  npcs: Record<string, NPCState>;
  selectedNPC: string | null;
  onSelectNPC: (id: string) => void;
}

export function NPCRelationRadar({ npcs, selectedNPC, onSelectNPC }: NPCRelationRadarProps) {
  const npcEntries = Object.entries(npcs);
  const center = { x: 150, y: 130 };
  const radius = 90;
  const angleStep = (2 * Math.PI) / npcEntries.length;

  const getPoint = (index: number, distance: number) => ({
    x: center.x + Math.cos(angleStep * index - Math.PI / 2) * distance,
    y: center.y + Math.sin(angleStep * index - Math.PI / 2) * distance,
  });

  const dataPoints = npcEntries.map(([, npc], i) => {
    const dist = radius * 0.5; // default midpoint — actual awakening data comes from NPCState
    return getPoint(i, dist);
  });

  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
      <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">NPC 关系网络</h3>
      <svg viewBox="0 0 300 270" className="w-full">
        {/* Background rings */}
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon key={scale}
            points={npcEntries.map((_, i) => {
              const p = getPoint(i, radius * scale);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="none" stroke="#1a1a2e" strokeWidth="1" />
        ))}

        {/* Axes */}
        {npcEntries.map((_, i) => {
          const outer = getPoint(i, radius);
          return <line key={i} x1={center.x} y1={center.y} x2={outer.x} y2={outer.y}
            stroke="#1a1a2e" strokeWidth="1" />;
        })}

        {/* Data polygon */}
        <polygon points={dataPoints.map(p => `${p.x},${p.y}`).join(" ")}
          fill="#ff6b9d" fillOpacity="0.15" stroke="#ff6b9d" strokeWidth="1.5"
          style={{ transition: "all 0.5s ease" }} />

        {/* NPC nodes */}
        {npcEntries.map(([id, npc], i) => {
          const pos = getPoint(i, radius + 20);
          const isSelected = id === selectedNPC;
          const dejaVu = (npc as any).dejaVu;
          const isAwake = !!dejaVu || (npc as any).awakeningStage !== "dormant";
          return (
            <g key={id} style={{ cursor: "pointer" }} onClick={() => onSelectNPC(id)}>
              {isAwake && (
                <circle cx={pos.x} cy={pos.y} r={isSelected ? 16 : 12}
                  fill="none" stroke={NPC_COLORS[id]} strokeWidth="1"
                  opacity={0.5} className="animate-pulse" />
              )}
              <circle cx={pos.x} cy={pos.y} r={6}
                fill={isSelected ? NPC_COLORS[id] : "#1a1a2e"}
                stroke={NPC_COLORS[id]} strokeWidth="2"
                style={{ transition: "all 0.3s" }} />
              <text x={pos.x} y={pos.y + 18} textAnchor="middle"
                fill={isSelected ? "#fff" : "#666"} fontSize="9"
                fontWeight={isSelected ? "bold" : "normal"}>
                {NPC_LABELS[id]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
