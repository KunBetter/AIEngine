"use client";

interface LoopChange {
  label: string;
  before: string;
  after: string;
}

interface LoopSummaryProps {
  loopNumber: number;
  changes: LoopChange[];
  newClues: number;
  newCausalNodes: number;
  confirmedHypotheses: number;
  rejectedHypotheses: number;
  score: number;
  rating: string;
  onContinue: () => void;
}

export function LoopSummary({ loopNumber, changes, newClues, newCausalNodes, confirmedHypotheses, rejectedHypotheses, score, rating, onContinue }: LoopSummaryProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70"
      style={{ animation: "fadeIn 0.3s ease-out" }}>
      <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-6 w-full max-w-lg mx-4"
        style={{ animation: "scaleIn 0.4s ease-out" }}>
        <h3 className="text-lg font-bold text-[#ff6b9d] text-center mb-4">
          🔄 第 {loopNumber} 次循环结束
        </h3>

        {/* What changed */}
        {changes.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">NPC 行为变化</p>
            <div className="space-y-2">
              {changes.map((c, i) => (
                <div key={i} className="flex items-stretch gap-2 text-xs">
                  <div className="flex-1 bg-[#1a1a2e] rounded p-2 text-gray-500 line-through">{c.before}</div>
                  <span className="flex items-center text-[#ff6b9d]">→</span>
                  <div className="flex-1 bg-[#ff6b9d]/5 border border-[#ff6b9d]/20 rounded p-2 text-[#ff6b9d]">{c.after}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-[#1a1a2e] rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-[#ff6b9d]">{newClues}</p>
            <p className="text-[10px] text-gray-500">新线索</p>
          </div>
          <div className="bg-[#1a1a2e] rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-[#ff6b9d]">{newCausalNodes}</p>
            <p className="text-[10px] text-gray-500">因果链</p>
          </div>
          <div className="bg-[#1a1a2e] rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-green-400">{confirmedHypotheses}</p>
            <p className="text-[10px] text-gray-500">假设确认</p>
          </div>
          <div className="bg-[#1a1a2e] rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-red-400">{rejectedHypotheses}</p>
            <p className="text-[10px] text-gray-500">假设驳回</p>
          </div>
        </div>

        {/* Score */}
        <div className="text-center mb-4">
          <p className="text-xs text-gray-500">评分</p>
          <p className="text-2xl font-bold text-[#ff6b9d]">{score}</p>
          <p className="text-xs text-[#ffcc00] font-mono">评级: {rating}</p>
        </div>

        <button onClick={onContinue}
          className="w-full py-2 rounded-lg bg-[#ff6b9d]/20 border border-[#ff6b9d]/40 text-[#ff6b9d]
                   hover:bg-[#ff6b9d]/30 transition-colors text-sm">
          进入下一次循环 →
        </button>
      </div>
    </div>
  );
}
