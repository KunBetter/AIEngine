"use client";

import type { TimelineNode } from "@/lib/types";

interface TimelineBoardProps {
  nodes: TimelineNode[];
  currentTime: number;
  actionPoints: number;
  maxActionPoints: number;
  onNodeClick: (node: TimelineNode) => void;
  onPreviewNode: (node: TimelineNode) => void;
  insightPoints: number;
}

const LOCATION_COLORS: Record<string, string> = {
  "钟楼": "#ffcc00", "花店": "#ff6b9d", "广场": "#aaaaaa",
  "诊所": "#64b5f6", "警局": "#8888ff", "图书馆": "#bb66ff",
};

export function TimelineBoard({
  nodes, currentTime, actionPoints, maxActionPoints,
  onNodeClick, onPreviewNode, insightPoints,
}: TimelineBoardProps) {
  const hours = Array.from({ length: 18 }, (_, i) => i + 7);
  const nodesByTime = new Map<number, TimelineNode[]>();
  for (const node of nodes) {
    const list = nodesByTime.get(node.time) || [];
    list.push(node);
    nodesByTime.set(node.time, list);
  }

  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider">⏳ 时间线</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">💡 洞察力: <span className="text-[#ff6b9d]">{insightPoints}</span></span>
          <span className={`text-xs font-mono ${actionPoints <= 2 ? "text-red-400 animate-pulse" : "text-gray-400"}`}>
            AP: {actionPoints}/{maxActionPoints}
          </span>
        </div>
      </div>

      <div className="relative h-32 overflow-x-auto">
        <div className="flex h-full" style={{ minWidth: `${hours.length * 60}px` }}>
          {hours.map((hour) => {
            const hourNodes = nodesByTime.get(hour) || [];
            const isCurrent = hour === currentTime;
            const isMidnight = hour === 24;

            return (
              <div key={hour} className={`flex-1 relative border-l border-[#1a1a2e] ${isMidnight ? "border-l-red-400/30" : ""}`}
                style={{ minWidth: 55 }}>
                <span className={`absolute -top-1 left-1 text-[9px] ${isCurrent ? "text-[#ff6b9d] font-bold" : "text-gray-500"}`}>
                  {hour}:00
                </span>
                {isCurrent && <div className="absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-full bg-[#ff6b9d]/40" />}
                <div className="mt-5 space-y-1 px-1">
                  {hourNodes.map((node) => (
                    <button key={node.id}
                      onClick={() => node.isUnlocked ? onNodeClick(node) : onPreviewNode(node)}
                      className={`w-full text-left text-[9px] px-1.5 py-1 rounded transition-colors ${
                        !node.isUnlocked ? "bg-[#0a0a1a] text-gray-700 italic border border-dashed border-gray-800"
                        : node.isCritical ? "bg-red-400/10 text-red-400 border border-red-400/20"
                        : node.mysteryStatus === "suspicious" ? "bg-[#ff6b9d]/10 text-[#ff6b9d] border border-[#ff6b9d]/20"
                        : "bg-[#1a1a2e] text-gray-400 hover:bg-[#2a2a4a]"
                      }`}
                      title={node.events.join("; ")}>
                      {!node.isUnlocked ? "🔒 ???" : (
                        <>
                          <span className="block truncate">{node.location}</span>
                          {node.npcsPresent.length > 0 && (
                            <span className="text-[8px] text-gray-600">{node.npcsPresent.join(", ")}</span>
                          )}
                        </>
                      )}
                    </button>
                  ))}
                </div>
                {isMidnight && <div className="absolute top-0 right-0 h-full w-0.5 bg-red-400/30" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4 mt-3 pt-2 border-t border-[#1a1a2e]">
        <span className="text-[9px] text-gray-600">🔒 未解锁</span>
        <span className="text-[9px] text-gray-600">🔴 关键事件</span>
        <span className="text-[9px] text-gray-600">💗 可疑活动</span>
      </div>
    </div>
  );
}
