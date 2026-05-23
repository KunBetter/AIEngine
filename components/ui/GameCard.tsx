"use client";

export function GameCard({
  emoji,
  name,
  subtitle,
  meta,
  children,
  onClick,
  className = "",
}: {
  emoji: string;
  name: string;
  subtitle?: string;
  meta?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border border-[#1a1a2e] hover:border-[#2a2a4a] transition-colors ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-white">
          {emoji} {name}
        </span>
        {meta && <span className="text-xs text-gray-500">{meta}</span>}
      </div>
      {subtitle && <div className="text-xs text-gray-500 mb-2">{subtitle}</div>}
      {children}
    </div>
  );
}
