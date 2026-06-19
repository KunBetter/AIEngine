"use client";

import { useState, useRef, useCallback } from "react";
import type { CausalFragment, AnchoredCausal } from "@/lib/types";

const CARD_WIDTH = 160;
const CARD_HEIGHT = 60;
const NPC_COLORS: Record<string, string> = {
  elias: "#ffcc00", rose: "#ff6b9d", marcus: "#64b5f6",
  brooks: "#8888ff", vera: "#bb66ff", sam: "#88aa88",
};
const CONNECT_DISTANCE = 80;

interface PlacedFragment {
  id: string;
  x: number;
  y: number;
  description: string;
  relatedNPCs: string[];
  isCorrect: boolean | null;
  connections: string[];
}

interface CausalCanvasProps {
  fragments: CausalFragment[];
  anchoredChains: AnchoredCausal[];
  onPlaceFragment: (fragmentId: string, x: number, y: number) => void;
  onConnectFragments: (fromId: string, toId: string) => void;
  onAnchorChain: (fragmentIds: string[]) => void;
  insightPoints: number;
}

export function CausalCanvas({
  fragments, anchoredChains, onPlaceFragment,
  onConnectFragments, onAnchorChain, insightPoints,
}: CausalCanvasProps) {
  const [placed, setPlaced] = useState<PlacedFragment[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  const unplacedFragments = fragments.filter(f => !placed.find(p => p.id === f.id));

  const findNearestFragment = useCallback((x: number, y: number, excludeId: string) => {
    let nearest: PlacedFragment | null = null;
    let minDist = CONNECT_DISTANCE;
    for (const p of placed) {
      if (p.id === excludeId) continue;
      const dist = Math.sqrt((p.x + CARD_WIDTH/2 - x) ** 2 + (p.y + CARD_HEIGHT/2 - y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = p;
      }
    }
    return nearest;
  }, [placed]);

  const handleDrop = useCallback((e: React.DragEvent, fragmentId: string) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const fragment = fragments.find(f => f.id === fragmentId);
    if (!fragment) return;

    const newPlaced: PlacedFragment = {
      id: fragment.id, x, y,
      description: fragment.description,
      relatedNPCs: fragment.relatedNPCs,
      isCorrect: null, connections: [],
    };

    // Check for nearby fragments to auto-connect
    const nearby = findNearestFragment(x + CARD_WIDTH/2, y + CARD_HEIGHT/2, fragmentId);
    if (nearby) {
      newPlaced.connections = [nearby.id];
      setPlaced(prev => prev.map(p =>
        p.id === nearby.id ? { ...p, connections: [...p.connections, fragmentId] } : p
      ));
      onConnectFragments(fragmentId, nearby.id);
    }

    setPlaced(prev => [...prev, newPlaced]);
    onPlaceFragment(fragmentId, x, y);
  }, [fragments, onPlaceFragment, findNearestFragment, onConnectFragments]);

  const handleSelect = useCallback((id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const handleAnchor = useCallback(() => {
    if (selected.length < 3) return;
    const cost = Math.pow(2, anchoredChains.length);
    if (insightPoints < cost) return;
    onAnchorChain(selected);
    setSelected([]);
    setPlaced(prev => prev.map(p =>
      selected.includes(p.id) ? { ...p, isCorrect: true } : p
    ));
  }, [selected, anchoredChains.length, insightPoints, onAnchorChain]);

  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider">🧩 因果拼图</h3>
        <div className="flex gap-2">
          <span className="text-xs text-gray-500">未放置: <span className="text-[#ff6b9d]">{unplacedFragments.length}</span></span>
          <button onClick={handleAnchor}
            disabled={selected.length < 3 || insightPoints < Math.pow(2, anchoredChains.length)}
            className="text-[10px] px-2 py-1 rounded border border-[#ff6b9d]/30 text-[#ff6b9d]
                     hover:bg-[#ff6b9d]/10 disabled:opacity-30 disabled:cursor-not-allowed">
            🔗 锚定 ({selected.length} 已选, {Math.pow(2, anchoredChains.length)} 💡)
          </button>
        </div>
      </div>

      <div className="flex gap-4" style={{ height: 300 }}>
        {/* Fragment pool (left) */}
        <div className="w-48 shrink-0 overflow-y-auto border-r border-[#1a1a2e] pr-3">
          <p className="text-[10px] text-gray-600 mb-2">可拖入画布的碎片：</p>
          <div className="space-y-1.5">
            {unplacedFragments.map((f) => (
              <div key={f.id} draggable
                onDragStart={(e) => e.dataTransfer.setData("fragmentId", f.id)}
                className="p-2 rounded border border-[#2a2a4a] bg-[#1a1a2e] cursor-grab
                         hover:border-[#ff6b9d]/30 text-[10px] text-gray-400">
                <p className="truncate">{f.description}</p>
                <div className="flex gap-1 mt-1">
                  {f.relatedNPCs.map(npc => (
                    <span key={npc} className="text-[8px] px-1 rounded"
                      style={{ backgroundColor: NPC_COLORS[npc] + "30", color: NPC_COLORS[npc] }}>{npc}</span>
                  ))}
                </div>
              </div>
            ))}
            {unplacedFragments.length === 0 && (
              <p className="text-[10px] text-gray-600 italic">所有碎片已放置。继续调查获取更多。</p>
            )}
          </div>
        </div>

        {/* Canvas (right) */}
        <div ref={canvasRef}
          className="flex-1 relative bg-[#0a0a1a] rounded-lg border border-[#1a1a2e] overflow-hidden"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const id = e.dataTransfer.getData("fragmentId");
            if (id) handleDrop(e, id);
          }}>
          {/* Grid background */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.1 }}>
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#fff" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
            {placed.flatMap(p =>
              p.connections.map(targetId => {
                const target = placed.find(t => t.id === targetId);
                if (!target) return null;
                return (
                  <line key={`${p.id}-${targetId}`}
                    x1={p.x + CARD_WIDTH / 2} y1={p.y + CARD_HEIGHT / 2}
                    x2={target.x + CARD_WIDTH / 2} y2={target.y + CARD_HEIGHT / 2}
                    stroke="#ff6b9d" strokeWidth="1.5" strokeDasharray="4 2"
                    opacity={0.5} />
                );
              })
            )}
          </svg>

          {/* Placed fragments */}
          {placed.map((p) => (
            <div key={p.id}
              className={`absolute p-2 rounded border cursor-pointer text-[10px] ${
                selected.includes(p.id) ? "border-[#ff6b9d] bg-[#ff6b9d]/10"
                : p.isCorrect === true ? "border-green-400/50 bg-green-400/5"
                : p.isCorrect === false ? "border-red-400/50 bg-red-400/5"
                : "border-[#2a2a4a] bg-[#1a1a2e]"
              } hover:border-[#ff6b9d]/50`}
              style={{ left: p.x, top: p.y, width: CARD_WIDTH, minHeight: CARD_HEIGHT }}
              onClick={() => handleSelect(p.id)}>
              <p className="text-gray-400 truncate">{p.description}</p>
              <div className="flex gap-1 mt-1">
                {p.relatedNPCs.map(npc => (
                  <span key={npc} className="text-[8px] px-1 rounded"
                    style={{ backgroundColor: NPC_COLORS[npc] + "30", color: NPC_COLORS[npc] }}>{npc}</span>
                ))}
              </div>
              {p.isCorrect === true && <span className="text-green-400 text-[8px]">✓</span>}
              {p.isCorrect === false && <span className="text-red-400 text-[8px]">✗</span>}
            </div>
          ))}

          {placed.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-xs">
              从左侧拖入因果碎片到此处
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
