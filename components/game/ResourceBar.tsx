"use client";

interface ResourceDef {
  label: string;
  current: number;
  max: number;
  color: string;
  icon: string;
  warning: number;
}

interface ResourceBarProps {
  resources: ResourceDef[];
  compact?: boolean;
}

export function ResourceBar({ resources, compact }: ResourceBarProps) {
  return (
    <div className={`flex ${compact ? "gap-3" : "gap-6"} flex-wrap`}>
      {resources.map((r) => {
        const pct = Math.min(100, Math.max(0, (r.current / r.max) * 100));
        const isLow = r.current <= r.warning;

        return (
          <div
            key={r.label}
            className={`flex items-center gap-2 ${compact ? "flex-shrink-0" : "flex-1 min-w-[140px]"}`}
          >
            <span className="text-xs shrink-0">{r.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className={`text-[10px] font-mono ${isLow ? "text-red-400 animate-pulse" : "text-gray-400"}`}
                >
                  {r.label}
                </span>
                <span
                  className={`text-[10px] font-mono ${isLow ? "text-red-400" : "text-gray-500"}`}
                >
                  {r.current}/{r.max}
                </span>
              </div>
              <div
                className="h-1.5 rounded-full"
                style={{ backgroundColor: "#1a1a2e" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: isLow ? "#ef4444" : r.color,
                    opacity: pct > 0 ? 1 : 0.3,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
