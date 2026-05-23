"use client";

export function ActionButton({
  children,
  onClick,
  disabled,
  variant = "default",
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger";
  className?: string;
}) {
  const base = "px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    default: "bg-[#1a1a2e] border border-[#2a2a4a] text-gray-300 hover:border-[#4a4a6a]",
    primary: "bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/20",
    danger: "bg-red-400/10 border border-red-400/30 text-red-400 hover:bg-red-400/20",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant] || variants.default} ${className}`}
    >
      {children}
    </button>
  );
}
