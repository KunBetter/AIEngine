"use client";

import { useState } from "react";
import type { EvidenceCard, ConfrontationRound } from "@/lib/types";

interface ConfrontationUIProps {
  evidenceCards: EvidenceCard[];
  rounds: ConfrontationRound[];
  echo7Emotion: string;
  onAccuse: (claim: string, evidenceIds: string[]) => void;
  onConcede: () => void;
  roundLimit: number;
}

export function ConfrontationUI({
  evidenceCards, rounds, echo7Emotion, onAccuse, onConcede, roundLimit,
}: ConfrontationUIProps) {
  const [claimInput, setClaimInput] = useState("");
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const remainingRounds = roundLimit - rounds.length;

  const handleAccuse = () => {
    if (!claimInput.trim()) return;
    onAccuse(claimInput.trim(), selectedEvidence);
    setClaimInput("");
    setSelectedEvidence([]);
  };

  const toggleEvidence = (cardId: string) => {
    setSelectedEvidence(prev => prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]);
  };

  const emotionDisplay: Record<string, string> = {
    defensive: "🛡️ ECHO-7 处于防御状态",
    cornered: "😰 ECHO-7 感到被逼入绝境",
    confessing: "💔 ECHO-7 开始坦白",
    defiant: "😤 ECHO-7 拒不承认",
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/80">
      <div className="flex flex-1 max-w-6xl mx-auto">
        {/* Evidence sidebar */}
        <div className="w-56 bg-[#0d0d24] border-r border-[#2a2a4a] p-3 overflow-y-auto">
          <h3 className="text-xs text-gray-500 mb-2 uppercase tracking-wider">可用证据</h3>
          <div className="space-y-1.5">
            {evidenceCards.map((card) => (
              <button key={card.id} onClick={() => toggleEvidence(card.id)}
                className={`w-full text-left p-2 rounded border text-[10px] transition-colors ${
                  selectedEvidence.includes(card.id)
                    ? "border-[#00ff88] bg-[#00ff88]/10 text-[#00ff88]"
                    : "border-[#2a2a4a] text-gray-500 hover:border-[#3a3a5a]"
                }`}>
                <span className="block truncate">{card.title}</span>
                <span className="text-gray-600 text-[8px]">{card.sourceLocation}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col p-6">
          <div className="text-center mb-4">
            <span className="text-sm text-[#00ff88]/80 animate-pulse">{emotionDisplay[echo7Emotion] || "🔴 对峙中"}</span>
            <span className="text-xs text-gray-600 ml-3">剩余回合: {remainingRounds}</span>
          </div>

          {/* Rounds history */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {rounds.map((round, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-end">
                  <div className="max-w-md p-3 rounded-lg bg-[#1a1a2e] border border-[#2a2a4a]">
                    <p className="text-xs text-gray-400">{round.playerClaim}</p>
                    {round.evidenceUsed.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {round.evidenceUsed.map((eid) => {
                          const card = evidenceCards.find(c => c.id === eid);
                          return <span key={eid} className="text-[9px] px-1 rounded bg-[#00ff88]/10 text-[#00ff88]">📋 {card?.title || eid}</span>;
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className={`max-w-md p-3 rounded-lg border ${
                    round.outcome === "echo7_confesses" ? "bg-[#00ff88]/5 border-[#00ff88]/20"
                    : round.outcome === "player_advances" ? "bg-[#ffaa00]/5 border-[#ffaa00]/20"
                    : "bg-[#ff4444]/5 border-[#ff4444]/20"
                  }`}>
                    <p className="text-xs text-[#00ff88]/80">ECHO-7:</p>
                    <p className="text-xs text-gray-300 mt-1">{round.echo7Response}</p>
                  </div>
                </div>
              </div>
            ))}
            {rounds.length === 0 && (
              <div className="text-center text-gray-600 text-sm pt-12">
                <p className="text-lg mb-2">⚡</p>
                <p>对峙开始。提出你的指控。</p>
                <p className="text-xs mt-1">你可以引用证据来支持你的观点。</p>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <textarea value={claimInput} onChange={(e) => setClaimInput(e.target.value)}
                placeholder="输入你的指控..."
                className="w-full px-3 py-2 rounded bg-[#0a0a1a] border border-[#2a2a4a] text-sm text-gray-300
                         placeholder:text-gray-600 focus:outline-none focus:border-[#00ff88]/40 resize-none"
                rows={2}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAccuse(); } }} />
              {selectedEvidence.length > 0 && <p className="text-[10px] text-[#00ff88] mt-1">已选择 {selectedEvidence.length} 条证据</p>}
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={handleAccuse} disabled={!claimInput.trim() || remainingRounds <= 0}
                className="px-4 py-2 rounded bg-[#00ff88]/20 border border-[#00ff88]/40 text-[#00ff88] text-sm
                         hover:bg-[#00ff88]/30 disabled:opacity-30 disabled:cursor-not-allowed">指控</button>
              <button onClick={onConcede}
                className="px-4 py-2 rounded border border-[#2a2a4a] text-gray-500 text-xs hover:text-gray-300">让步</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
