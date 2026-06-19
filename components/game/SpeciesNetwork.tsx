// components/game/SpeciesNetwork.tsx
"use client";

import type { SpeciesDef, SpeciesInteraction } from "@/lib/types";

interface SpeciesNetworkProps {
  species: Record<string, SpeciesDef>;
  interactions: SpeciesInteraction[];
}

export function SpeciesNetwork({ species, interactions }: SpeciesNetworkProps) {
  const aliveSpecies = Object.values(species).filter(s => s.status !== "extinct");
  if (aliveSpecies.length < 2) {
    return (
      <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
        <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">🕸 物种关系网</h3>
        <p className="text-xs text-gray-600 italic">需要至少2个存活物种才能显示关系网络。</p>
      </div>
    );
  }

  const center = { x: 200, y: 130 };
  const radius = 90;
  const angleStep = (2 * Math.PI) / aliveSpecies.length;

  const getPos = (i: number) => ({
    x: center.x + Math.cos(angleStep * i - Math.PI / 2) * radius,
    y: center.y + Math.sin(angleStep * i - Math.PI / 2) * radius,
  });

  const interactionPairs = new Set<string>();
  for (const ix of interactions) {
    const key = [ix.speciesA, ix.speciesB].sort().join("|");
    interactionPairs.add(key);
  }

  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
      <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">
        🕸 物种关系网 ({aliveSpecies.length} 物种, {interactionPairs.size} 关系)
      </h3>
      <svg viewBox="0 0 400 270" className="w-full">
        {/* Interaction lines */}
        {aliveSpecies.flatMap((a, i) =>
          aliveSpecies.slice(i + 1).map((b, j) => {
            const key = [a.id, b.id].sort().join("|");
            if (!interactionPairs.has(key)) return null;
            const ix = interactions.find(
              ix => (ix.speciesA === a.id && ix.speciesB === b.id) ||
                    (ix.speciesA === b.id && ix.speciesB === a.id)
            );
            const posA = getPos(i);
            const posB = getPos(i + j + 1);
            const color = ix?.type === "predation" ? "#ff4444"
              : ix?.type === "competition" ? "#ffaa00"
              : ix?.type === "symbiosis" ? "#00ff88"
              : "#888888";
            const dash = ix?.type === "competition" ? "4 2" : "none";
            return (
              <line key={key} x1={posA.x} y1={posA.y} x2={posB.x} y2={posB.y}
                stroke={color} strokeWidth={1.5} strokeDasharray={dash}
                opacity={0.6} />
            );
          })
        )}

        {/* Species nodes */}
        {aliveSpecies.map((s, i) => {
          const pos = getPos(i);
          return (
            <g key={s.id}>
              <circle cx={pos.x} cy={pos.y} r={s.population > 500 ? 18 : s.population > 200 ? 14 : 10}
                fill={s.color + "30"} stroke={s.color} strokeWidth="2"
                style={{ transition: "all 0.5s ease" }} />
              <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="14">{s.emoji}</text>
              <text x={pos.x} y={pos.y + 22} textAnchor="middle" fill="#ccc" fontSize="9">
                {s.name}
              </text>
              <text x={pos.x} y={pos.y + 33} textAnchor="middle" fill="#888" fontSize="8">
                {s.population}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex gap-4 mt-3 justify-center text-[10px]">
        <span className="text-red-400">— 捕食</span>
        <span className="text-[#ffaa00]">- - 竞争</span>
        <span className="text-[#00ff88]">— 共生</span>
      </div>
    </div>
  );
}
