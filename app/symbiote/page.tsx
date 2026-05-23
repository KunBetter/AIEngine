"use client";

import { useState, useRef, useEffect } from "react";
import { useSymbiote } from "@/hooks/useSymbiote";

export default function SymbiotePage() {
  const { state, sendAction, resetGame, isLoading, error } = useSymbiote();
  const [customInput, setCustomInput] = useState("");
  const sceneRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.scrollTop = sceneRef.current.scrollHeight;
    }
  }, [state.sceneDescription, state.symbioteMessage]);

  const handleAction = (action: string) => {
    if (isLoading) return;
    sendAction(action);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim() || isLoading) return;
    handleAction(customInput.trim());
    setCustomInput("");
  };

  const trustColor =
    state.trustMeter > 60
      ? "#00ff88"
      : state.trustMeter > 35
      ? "#ffaa00"
      : "#ff4444";

  return (
    <div className="flex-1 flex flex-col p-4 max-w-6xl mx-auto w-full gap-4">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">信任度</span>
            <div className="w-32 h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${state.trustMeter}%`,
                  backgroundColor: trustColor,
                  boxShadow: `0 0 8px ${trustColor}`,
                }}
              />
            </div>
            <span className="text-xs font-mono" style={{ color: trustColor }}>
              {state.trustMeter}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>
            📍 {state.currentLocation}
          </span>
          <span>🔄 第 {state.turn} 轮</span>
          {state.visitedLocations.length > 0 && (
            <span title={state.visitedLocations.join(" → ")}>
              🗺 已探索 {state.visitedLocations.length}/{5}
            </span>
          )}
        </div>

        <button
          onClick={resetGame}
          className="text-xs px-3 py-1 rounded border border-[#2a2a4a] text-gray-500 hover:text-white hover:border-[#4a4a6a] transition-colors"
        >
          重新开始
        </button>
      </div>

      {/* 信任度变化指示器 */}
      {state.trustDelta !== undefined && state.trustDelta !== 0 && (
        <div
          className={`text-xs text-center ${
            state.trustDelta > 0 ? "text-green-400" : "text-red-400"
          } animate-pulse`}
        >
          信任度 {state.trustDelta > 0 ? "+" : ""}
          {state.trustDelta}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg p-3 text-center">
          {error}
        </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* 场景描述面板 */}
        <div
          ref={sceneRef}
          className={`lg:col-span-2 bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-5 overflow-y-auto ${
            state.turn === 0 ? "flex items-center justify-center" : ""
          }`}
        >
          {state.turn === 0 ? (
            <div className="text-center max-w-md">
              <h2 className="text-xl font-bold text-white mb-4">共生体 Symbiote</h2>
              <div className="text-sm text-gray-400 leading-relaxed mb-6">
                <p className="mb-3">
                  你是异星探索科学家 <span className="text-[#00ff88]">Kaelen</span>。
                </p>
                <p className="mb-3">
                  返回舱在着陆时严重受损。你体内植入的AI共生体
                  <span className="text-[#00ff88]"> ECHO-7</span> 是你唯一能依靠的伙伴。
                </p>
                <p className="text-gray-500">
                  但ECHO-7真的完全站在你这边吗？
                </p>
              </div>
              <button
                onClick={() => handleAction("开始探索")}
                disabled={isLoading}
                className="px-8 py-3 rounded-lg bg-[#00ff88]/20 border border-[#00ff88]/40 text-[#00ff88]
                         hover:bg-[#00ff88]/30 transition-colors disabled:opacity-50 font-bold"
              >
                {isLoading ? "..." : "开始探索"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 场景描述（流式渲染中会有闪烁光标的样式） */}
              <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                {state.sceneDescription || (
                  <span className="text-gray-600 italic">等待ECHO-7处理环境数据...</span>
                )}
                {isLoading && <span className="cursor-blink" />}
              </div>

              {/* 可用物品和线索 */}
              {(state.inventory.length > 0 || state.discoveredClues.length > 0) && (
                <div className="flex flex-wrap gap-3 pt-3 border-t border-[#1a1a2e]">
                  {state.inventory.map((item) => (
                    <span
                      key={item}
                      className="text-xs px-2 py-1 rounded bg-[#1a1a2e] text-gray-400 border border-[#2a2a4a]"
                    >
                      📦 {item}
                    </span>
                  ))}
                  {state.discoveredClues.map((clue) => (
                    <span
                      key={clue}
                      className="text-xs px-2 py-1 rounded bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20"
                    >
                      📋 {clue}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 共生体对话面板 */}
        <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#1a1a2e]">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "#00ff88", boxShadow: "0 0 6px #00ff88" }}
            />
            <span className="text-sm font-bold text-[#00ff88]">ECHO-7 共生体频道</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 text-xs min-h-0">
            {state.dialogueHistory.length === 0 ? (
              <p className="text-gray-600 italic">等待神经链接建立...</p>
            ) : (
              state.dialogueHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`${
                    msg.role === "symbiote"
                      ? "text-[#00ff88]/80 border-l-2 border-[#00ff88]/30 pl-2"
                      : msg.role === "player"
                      ? "text-gray-400 pl-2"
                      : "text-gray-500 italic"
                  }`}
                >
                  {msg.role === "symbiote" && (
                    <span className="text-[10px] text-[#00ff88]/50 block mb-0.5">ECHO-7:</span>
                  )}
                  {msg.role === "player" && (
                    <span className="text-[10px] text-gray-600 block mb-0.5">Kaelen:</span>
                  )}
                  {msg.content}
                </div>
              ))
            )}
            {isLoading && (
              <div className="text-[#00ff88]/50 text-xs">
                <span className="cursor-blink">ECHO-7 分析中</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 行动面板 */}
      <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-500">可用行动</span>
        </div>

        {/* 推荐行动（共生体建议） */}
        {state.availableActions.length > 0 && state.turn > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {state.availableActions.map((action) => (
              <button
                key={action}
                onClick={() => handleAction(action)}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg bg-[#1a1a2e] border border-[#2a2a4a] text-sm text-gray-300
                         hover:border-[#00ff88]/40 hover:text-[#00ff88] transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {action}
              </button>
            ))}
          </div>
        )}

        {/* 自由输入 */}
        <form onSubmit={handleCustomSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="输入你想做的事...（如：用扫描仪检查洞穴符号）"
            disabled={isLoading || state.turn === 0}
            className="flex-1 px-4 py-2 rounded-lg bg-[#0a0a1a] border border-[#2a2a4a] text-sm text-gray-300
                     placeholder:text-gray-600 focus:outline-none focus:border-[#00ff88]/40
                     disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !customInput.trim()}
            className="px-5 py-2 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] text-sm
                     hover:bg-[#00ff88]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            执行
          </button>
        </form>
      </div>

      {/* 隐藏的调试信息（开发用） */}
      {process.env.NODE_ENV === "development" && state.turn > 0 && (
        <details className="text-[10px] text-gray-700">
          <summary className="cursor-pointer">调试信息</summary>
          <p>隐秘目标: {state.symbioteGoal}</p>
          <p>目标进度: {state.symbioteGoalProgress}/100</p>
        </details>
      )}
    </div>
  );
}
