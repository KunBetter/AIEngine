"use client";

const MYSTERY_ICONS: Record<string, string> = {
  tower: "🏚",
  plague: "🦠",
  invasion: "👥",
};

const MYSTERY_NAMES: Record<string, string> = {
  tower: "钟楼倒塌",
  plague: "诡异瘟疫",
  invasion: "外来者入侵",
};

interface LoopGoalBannerProps {
  activeMystery: "tower" | "plague" | "invasion";
  keyEvent: { description: string; prevented: boolean; requiredConditions: string[] };
  actionPoints: number;
  maxActionPoints: number;
  loopGoal: string;
  loopNumber: number;
}

export function LoopGoalBanner({ activeMystery, keyEvent, actionPoints, maxActionPoints, loopGoal, loopNumber }: LoopGoalBannerProps) {
  const completedConditions = keyEvent.requiredConditions.filter(c => c.includes("✓")).length;
  const totalConditions = keyEvent.requiredConditions.length;
  const progressPct = totalConditions > 0 ? (completedConditions / totalConditions) * 100 : 0;
  const circumference = 2 * Math.PI * 22;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;
  const apPct = (actionPoints / maxActionPoints) * 100;
  const apLow = actionPoints <= 2;

  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
      <div className="flex items-start gap-4">
        {/* Progress ring */}
        <div className="relative w-14 h-14 shrink-0">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" fill="none" stroke="#1a1a2e" strokeWidth="4" />
            <circle cx="28" cy="28" r="22" fill="none" stroke="#ff6b9d" strokeWidth="4"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              strokeLinecap="round" transform="rotate(-90 28 28)"
              style={{ transition: "stroke-dashoffset 0.8s ease" }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#ff6b9d]">
            {completedConditions}/{totalConditions}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{MYSTERY_ICONS[activeMystery] || "❓"}</span>
            <span className="text-sm font-bold text-[#ff6b9d]">
              {MYSTERY_NAMES[activeMystery] || activeMystery}
            </span>
            <span className="text-xs text-gray-500">循环 #{loopNumber}</span>
          </div>
          <p className="text-xs text-gray-400 mb-2">{keyEvent.description}</p>

          {loopGoal && (
            <p className="text-xs text-[#ffcc00]/80 mb-2 italic">
              🎯 本轮目标: {loopGoal}
            </p>
          )}

          <div className="flex flex-wrap gap-1">
            {keyEvent.requiredConditions.map((c, i) => (
              <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full ${
                c.includes("✓") ? "bg-green-400/10 text-green-400" : "bg-[#1a1a2e] text-gray-500"
              }`}>
                {c.includes("✓") ? "✓ " : "☐ "}{c.replace("✓ ", "")}
              </span>
            ))}
          </div>
        </div>

        {/* AP indicator */}
        <div className="shrink-0 text-center">
          <div className={`text-lg font-mono font-bold ${apLow ? "text-red-400 animate-pulse" : "text-[#ff6b9d]"}`}
            style={{ transition: "color 0.3s" }}>
            {actionPoints}
          </div>
          <div className="text-[10px] text-gray-500">/ {maxActionPoints} AP</div>
          <div className="mt-1 w-12 h-1 bg-[#1a1a2e] rounded-full overflow-hidden">
            <div className="h-full bg-[#ff6b9d] rounded-full transition-all duration-300"
              style={{ width: `${apPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
