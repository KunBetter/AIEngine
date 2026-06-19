"use client";

import { useEffect, useState } from "react";

interface AchievementToastProps {
  name: string;
  description: string;
  onDone: () => void;
}

export function AchievementToast({ name, description, onDone }: AchievementToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 3500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
    }`}>
      <div className="bg-[#0d0d24] border border-[#ffcc00]/30 rounded-xl p-4 shadow-lg shadow-[#ffcc00]/5 max-w-xs">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-xs text-[#ffcc00] font-bold mb-0.5">成就解锁</p>
            <p className="text-sm text-white font-bold">{name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
