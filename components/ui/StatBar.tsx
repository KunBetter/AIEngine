"use client";

export function StatBar({
  label,
  value,
  max = 100,
  color = "#00ff88",
  size = "md",
}: {
  label: string;
  value: number;
  max?: number;
  color?: string;
  size?: "sm" | "md";
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const h = size === "sm" ? "h-1.5" : "h-2";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-12 shrink-0">{label}</span>
      <div className={`flex-1 ${h} bg-[#1a1a2e] rounded-full overflow-hidden`}>
        <div
          className={`${h} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
        />
      </div>
      <span className="text-xs font-mono w-8 text-right" style={{ color }}>{value}</span>
    </div>
  );
}
