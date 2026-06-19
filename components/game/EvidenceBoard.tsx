"use client";

import { useState } from "react";
import type { EvidenceCard } from "@/lib/types";

interface EvidenceBoardProps {
  cards: EvidenceCard[];
  onConnect: (cardA: string, cardB: string) => void;
  onMarkSuspicious: (cardId: string) => void;
  onMarkCredible: (cardId: string) => void;
  contradictions: { cardA: string; cardB: string; description: string }[];
}

export function EvidenceBoard({
  cards, onConnect, onMarkSuspicious, onMarkCredible, contradictions,
}: EvidenceBoardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const handleCardClick = (cardId: string) => {
    if (selected && selected !== cardId) {
      onConnect(selected, cardId);
      setSelected(null);
    } else {
      setSelected(cardId === selected ? null : cardId);
    }
  };

  const cardPairsWithContradiction = new Set<string>();
  for (const c of contradictions) {
    cardPairsWithContradiction.add(`${c.cardA}-${c.cardB}`);
    cardPairsWithContradiction.add(`${c.cardB}-${c.cardA}`);
  }

  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider">🔍 证据面板</h3>
        <div className="flex gap-2">
          <span className="text-xs text-gray-500">{cards.length} 条证据 | {contradictions.length} 处矛盾</span>
          {contradictions.length >= 1 && <span className="text-xs text-[#00ff88] animate-pulse">⚡ 可发起对峙</span>}
        </div>
      </div>

      {contradictions.length > 0 && (
        <div className="mb-3 p-2 rounded bg-[#00ff88]/5 border border-[#00ff88]/10">
          {contradictions.map((c, i) => (
            <p key={i} className="text-[10px] text-[#00ff88]">⚡ 矛盾发现: {c.description}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {cards.map((card) => {
          const isSelected = selected === card.id;
          const isExpanded = expandedCard === card.id;
          const hasContradiction = Array.from(cardPairsWithContradiction).some(p => p.startsWith(card.id + "-"));

          return (
            <div key={card.id}>
              <div onClick={() => handleCardClick(card.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected ? "border-[#00ff88] bg-[#00ff88]/10 ring-1 ring-[#00ff88]/30"
                  : hasContradiction ? "border-[#ffaa00]/30 bg-[#ffaa00]/5"
                  : "border-[#2a2a4a] bg-[#1a1a2e] hover:border-[#3a3a5a]"
                }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white font-bold truncate">{card.title}</span>
                  <div className="flex gap-1">
                    {hasContradiction && <span className="text-[#ffaa00] text-[10px]">⚡</span>}
                    <span className="text-[10px] text-gray-600">{card.sourceLocation}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-[#2a2a4a] space-y-1.5">
                    <p className="text-[10px] text-gray-400">{card.description}</p>
                    <p className="text-[10px] text-[#00ff88]/60">ECHO-7: {card.echo7Explanation}</p>
                    {card.hiddenContradiction && (
                      <p className="text-[10px] text-[#ffaa00] italic">⚡ {card.hiddenContradiction}</p>
                    )}
                  </div>
                )}

                {card.connectedTo.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#1a1a2e]">
                    <p className="text-[9px] text-[#00ff88]/60 mb-1">🔗 关联证据:</p>
                    {card.connectedTo.map((targetId: string) => {
                      const target = cards.find((c: any) => c.id === targetId);
                      return target ? (
                        <span key={targetId} className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-[#00ff88]/5 text-[#00ff88]/70 mr-1 mb-1 border border-[#00ff88]/10">
                          {target.title.length > 15 ? target.title.slice(0, 15) + "..." : target.title}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); onMarkCredible(card.id); }}
                      className={`text-[9px] px-1.5 py-0.5 rounded ${card.credibility > 60 ? "bg-green-400/20 text-green-400" : "bg-[#0a0a1a] text-gray-600"}`}>
                      ✓ 可信
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onMarkSuspicious(card.id); }}
                      className={`text-[9px] px-1.5 py-0.5 rounded ${card.credibility < 30 ? "bg-red-400/20 text-red-400" : "bg-[#0a0a1a] text-gray-600"}`}>
                      ? 可疑
                    </button>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setExpandedCard(isExpanded ? null : card.id); }}
                    className="text-[9px] text-gray-600 hover:text-gray-400">
                    {isExpanded ? "收起" : "详情"}
                  </button>
                </div>

                <div className="mt-1.5">
                  <div className="flex items-center justify-between text-[9px] text-gray-600 mb-0.5">
                    <span>可信度</span>
                    <span>{card.credibility}%</span>
                  </div>
                  <div className="h-1 bg-[#1a1a2e] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${card.credibility}%`,
                        backgroundColor: card.credibility > 60 ? "#44ff44" : card.credibility > 30 ? "#ffaa00" : "#ff4444" }} />
                  </div>
                </div>
                {card.hiddenContradiction && (
                  <div className="mt-1 flex items-center gap-1 text-[9px] text-yellow-400/60">
                    <span>⚠</span>
                    <span className="truncate">{card.hiddenContradiction.slice(0, 40)}...</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {cards.length === 0 && (
        <p className="text-xs text-gray-600 text-center py-8">暂无证据。探索场景来收集线索。</p>
      )}
      {selected && (
        <p className="text-[10px] text-gray-500 mt-2 text-center">已选择一张卡片 — 点击另一张来检测矛盾</p>
      )}
    </div>
  );
}
