"use client";

interface BackpackItem {
  id: string;
  name: string;
  description: string;
  sourceLocation: string;
  discoveredAt: number;
}

interface EvidenceBackpackProps {
  items: BackpackItem[];
  onUseItem: (item: BackpackItem) => void;
}

export function EvidenceBackpack({ items, onUseItem }: EvidenceBackpackProps) {
  if (items.length === 0) {
    return (
      <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
        <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">🎒 证物背包</h3>
        <p className="text-xs text-gray-600 italic">暂无证物。调查地点和对话NPC来收集线索。</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
      <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">🎒 证物背包 ({items.length})</h3>
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <button key={item.id}
            onClick={() => onUseItem(item)}
            className="text-left p-2 rounded border border-[#2a2a4a] bg-[#1a1a2e]
                     hover:border-[#ff6b9d]/30 transition-colors group">
            <p className="text-xs text-white truncate group-hover:text-[#ff6b9d]">{item.name}</p>
            <p className="text-[10px] text-gray-500 truncate">{item.description}</p>
            <p className="text-[9px] text-gray-600 mt-1">
              📍 {item.sourceLocation} · 循环{item.discoveredAt}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
