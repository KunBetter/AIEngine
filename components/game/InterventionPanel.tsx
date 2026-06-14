"use client";

import type { DisasterWarning } from "@/lib/types";

interface InterventionAction {
  id: string;
  label: string;
  emoji: string;
  description: string;
  cost: number;
  disabled?: boolean;
  disabledReason?: string;
}

interface InterventionPanelProps {
  tokens: number;
  maxTokens: number;
  warnings: DisasterWarning[];
  onIntervene: (actionId: string) => void;
  onClose: () => void;
}

const INTERVENTIONS: InterventionAction[] = [
  { id: "mutate", emoji: "🧬", label: "催化突变", description: "选中物种获得随机正面突变", cost: 1 },
  { id: "smite", emoji: "⚡", label: "天罚", description: "选中区域触发小范围灾难", cost: 1 },
  { id: "bless", emoji: "🌿", label: "祝福之地", description: "选中区域资源翻倍（持续3纪元）", cost: 1 },
  { id: "gene_edit", emoji: "🧪", label: "基因编辑", description: "手动微调物种一项特征±2", cost: 2 },
  { id: "protect", emoji: "🛡️", label: "神圣保护", description: "标记物种本纪元不会灭绝", cost: 2 },
  { id: "env_tweak", emoji: "🌍", label: "环境微调", description: "全局温度/氧气/水域±5%", cost: 1 },
  { id: "extinction", emoji: "💀", label: "灭绝令", description: "直接灭绝一个物种", cost: 3 },
  { id: "accelerate", emoji: "🔮", label: "加速演化", description: "本纪元执行双倍tick数", cost: 2 },
];

export function InterventionPanel({ tokens, maxTokens, warnings, onIntervene, onClose }: InterventionPanelProps) {
  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#ffaa00]">✋ 上帝之手</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            干预令牌: <span className={`font-bold ${tokens <= 2 ? "text-red-400 animate-pulse" : "text-[#ffaa00]"}`}>{tokens}</span>/{maxTokens}
          </span>
          <button onClick={onClose} className="text-xs text-gray-600 hover:text-white">[关闭]</button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-red-400/5 border border-red-400/10">
          <p className="text-xs text-red-400 mb-2 font-bold">⚠ 纪元预警</p>
          {warnings.map((w) => (
            <div key={w.type} className="flex items-center gap-2 text-xs mb-1">
              <span className="text-gray-400">
                {w.type === "meteor" && "☄"}{w.type === "ice_age" && "❄"}{w.type === "plague" && "🦠"}{w.type === "solar_flare" && "☀"}
                {" "}{w.description}
              </span>
              <span className={`font-mono ${w.probability > 50 ? "text-red-400" : "text-yellow-400"}`}>{w.probability}%</span>
              <span className="text-gray-600">— {w.suggestion}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {INTERVENTIONS.map((action) => {
          const canAfford = tokens >= action.cost;
          const isDisabled = action.disabled || !canAfford;
          const reason = !canAfford ? "令牌不足" : action.disabledReason;

          return (
            <button key={action.id} onClick={() => !isDisabled && onIntervene(action.id)} disabled={isDisabled} title={reason}
              className={`p-3 rounded-lg border text-center transition-colors ${
                isDisabled ? "border-[#1a1a2e] bg-[#0a0a1a] text-gray-700 cursor-not-allowed"
                : "border-[#2a2a4a] bg-[#1a1a2e] hover:border-[#ffaa00]/40 hover:bg-[#ffaa00]/5"
              }`}>
              <div className="text-lg mb-1">{action.emoji}</div>
              <div className="text-[10px] text-gray-300 font-bold">{action.label}</div>
              <div className="text-[9px] text-gray-600 mt-0.5">{action.description}</div>
              <div className="text-[9px] text-[#ffaa00] mt-1">{action.cost} 令牌</div>
            </button>
          );
        })}
      </div>

      {tokens === 0 && (
        <p className="text-xs text-red-400/60 mt-3 text-center">令牌已耗尽。你只能观察，无法再干预这个世界。</p>
      )}
    </div>
  );
}
