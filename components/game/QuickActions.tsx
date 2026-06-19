"use client";

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  apCost: number;
}

interface QuickActionsProps {
  actions: QuickAction[];
  disabled: boolean;
  onAction: (action: string) => void;
}

export function QuickActions({ actions, disabled, onAction }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map(a => (
        <button key={a.id}
          onClick={() => onAction(a.action)}
          disabled={disabled}
          className="text-xs px-3 py-1.5 rounded-full border border-[#2a2a4a] text-gray-400
                   hover:border-[#ff6b9d]/30 hover:text-[#ff6b9d] disabled:opacity-30
                   transition-colors flex items-center gap-1">
          <span>{a.icon}</span>
          <span>{a.label}</span>
          <span className="text-[9px] text-gray-600">({a.apCost}AP)</span>
        </button>
      ))}
    </div>
  );
}
