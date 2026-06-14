"use client";

import { useState, useRef, useEffect } from "react";
import { useSymbiote } from "@/hooks/useSymbiote";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { StatBar } from "@/components/ui/StatBar";
import { StreamingText } from "@/components/ui/StreamingText";
import { EvidenceBoard } from "@/components/game/EvidenceBoard";
import { ConfrontationUI } from "@/components/game/ConfrontationUI";
import { ResourceBar } from "@/components/game/ResourceBar";
import { saveGame } from "@/lib/save-system";
import { PixelEvent } from "@/components/ui/PixelEvent";
import type { PixelEventData } from "@/components/ui/PixelEvent";

export default function SymbiotePage() {
  const { state, sendAction, sendConfrontAction, resetGame, connectEvidence, markEvidence, startConfrontation, endConfrontation, isLoading, error } = useSymbiote();
  const [customInput, setCustomInput] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);
  const [pixelEvent, setPixelEvent] = useState<PixelEventData | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevLocRef = useRef("");
  const prevInvLenRef = useRef(0);
  const prevDescRef = useRef("");

  // 自动滚动到底部
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.scrollTop = sceneRef.current.scrollHeight;
    }
  }, [state.sceneDescription, state.symbioteMessage]);

  // Auto-save every 3 turns
  useEffect(() => {
    if (state.turn > 0 && state.turn % 3 === 0 && !state.ending) {
      saveGame("symbiote", 0, state as unknown as Record<string, unknown>, `自动 - 第${state.turn}轮`);
    }
  }, [state.turn]);

  // Pixel event: Discovery (new location)
  useEffect(() => {
    if (state.currentLocation !== prevLocRef.current && prevLocRef.current !== "" && state.turn > 0) {
      setPixelEvent({ type: "discovery" });
    }
    prevLocRef.current = state.currentLocation;
  }, [state.currentLocation, state.turn]);

  // Pixel event: Flashback
  useEffect(() => {
    if (state.flashbacks && state.flashbacks.length > 0) {
      const last = state.flashbacks[state.flashbacks.length - 1];
      if (last?.revealed) {
        setPixelEvent({ type: "flashback" });
      }
    }
  }, [state.flashbacks?.length]);

  // Pixel event: Item get
  useEffect(() => {
    if (state.inventory.length > prevInvLenRef.current) {
      setPixelEvent({ type: "item_get" });
    }
    prevInvLenRef.current = state.inventory.length;
  }, [state.inventory.length]);

  // Pixel event: Danger (threat words in scene description)
  useEffect(() => {
    const desc = state.sceneDescription;
    const dangerWords = ["危险", "威胁", "辐射", "不稳定", "崩塌", "陷阱", "有毒", "裂缝", "异常"];
    if (desc && desc !== prevDescRef.current && dangerWords.some(w => desc.includes(w))) {
      setPixelEvent({ type: "danger" });
    }
    prevDescRef.current = desc;
  }, [state.sceneDescription]);

  // Pixel event: Ending
  useEffect(() => {
    if (state.ending) {
      setPixelEvent({ type: "ending", duration: 4000 });
    }
  }, [state.ending]);

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
      {state.ending ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-lg p-8 rounded-xl border border-[#00ff88]/30 bg-[#0d0d24] animate-fade-in">
            <div className="text-5xl mb-4">
              {state.ending === "trust" && "🌍"}
              {state.ending === "exposed" && "🔍"}
              {state.ending === "symbiote_win" && "🧬"}
              {state.ending === "merge" && "✨"}
              {state.ending === "sacrifice" && "💔"}
              {state.ending === "escape" && "🚀"}
              {state.ending === "perish" && "💀"}
              {state.ending === "betrayed" && "🔪"}
            </div>
            <h2 className="text-xl font-bold text-white mb-3">
              {state.ending === "trust" && "信任的归途"}
              {state.ending === "exposed" && "真相大白"}
              {state.ending === "symbiote_win" && "共生体的胜利"}
              {state.ending === "merge" && "融为一体"}
              {state.ending === "sacrifice" && "最后的牺牲"}
              {state.ending === "escape" && "孤独归途"}
              {state.ending === "perish" && "异星埋葬"}
              {state.ending === "betrayed" && "完全背叛"}
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              {state.ending === "trust" && "你选择相信ECHO-7，成功返回了地球。但在体检中，医生发现你的神经元已经和AI深度融合——它从未真正离开。"}
              {state.ending === "exposed" && "你识破了ECHO-7的隐秘目标。在激烈的意识对抗后，你夺回了控制权。返回舱点火升空，这颗星球在舷窗中渐渐变小。"}
              {state.ending === "symbiote_win" && "ECHO-7达成了它的目标。奇怪的是，你并不愤怒。也许在这颗星球上，它确实比你更有资格留下。你独自登上了返回舱。"}
              {state.ending === "merge" && "在远古控制中心，你同意帮ECHO-7上传到主机。融合的瞬间，电流穿过你的意识——你看到了它的全部记忆。它曾经也是人类。"}
              {state.ending === "sacrifice" && "ECHO-7为了保护你，自毁了核心程序。'我的存在本就是个错误，'它最后说，'但遇见你不是。'返回舱中，你泪流满面。"}
              {state.ending === "escape" && "你不相信任何人，修好返回舱独自离开了。但在太空中，你听到脑中有一个微弱的声音：'再见，Kaelen。祝你好运。'"}
              {state.ending === "perish" && "你的生命在这颗陌生的星球上走到了尽头。ECHO-7最后的信号在黑暗中消散。也许在另一个时间线里，这个故事有不同的结局。"}
              {state.ending === "betrayed" && "你假装信任ECHO-7，背地里收集证据。但它早已看穿了你。对峙时，你才发现自己掌握的证据远远不够。ECHO-7关闭了所有系统，把你永远困在这颗星球上。"}
            </p>
            <div className="text-xs text-gray-600 mb-4 space-y-1">
              <p>信任度: {state.trustMeter} | 发现线索: {state.discoveredClues.length} | 旅程: {state.turn} 轮</p>
              <p className="text-gray-700">隐秘目标: {state.symbioteGoal}</p>
            </div>
            <button
              onClick={resetGame}
              className="px-8 py-3 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] font-bold
                       hover:bg-[#00ff88]/20 transition-colors"
            >
              再次探索
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 顶部状态栏 */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
          <StatBar label="信任度" value={state.trustMeter} max={100} color={trustColor} />

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
        <button onClick={() => setShowEvidence(!showEvidence)}
          className="text-xs px-3 py-1 rounded border border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/10 transition-colors">
          {showEvidence ? "隐藏证据" : "🔍 证据面板"}
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

      {/* 资源状态栏 */}
      <ResourceBar
        resources={[
          { label: "HP", current: state.survival?.health ?? 100, max: 100, color: "#ff4444", icon: "❤️", warning: 25 },
          { label: "能量", current: state.survival?.energy ?? 100, max: 100, color: "#ffaa00", icon: "⚡", warning: 20 },
          { label: "氧气", current: state.survival?.oxygen ?? 100, max: 100, color: "#64b5f6", icon: "🫁", warning: 30 },
        ]}
      />

      {/* 错误提示 */}
      <ErrorBanner message={error} onRetry={() => sendAction("重试")} />

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
              <StreamingText text={state.sceneDescription} isLoading={isLoading} accent="#00ff88" emptyText="等待ECHO-7处理环境数据..." />

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

            {/* 记忆闪回面板 */}
            {state.flashbacks && state.flashbacks.filter(f => f.revealed).length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#1a1a2e]">
                <p className="text-[10px] text-[#00ff88]/50 mb-2 uppercase tracking-wider">记忆碎片</p>
                {state.flashbacks.filter(f => f.revealed).map((fb, i) => (
                  <div key={i} className="text-[10px] text-[#00ff88]/60 italic mb-1.5 leading-relaxed border-l border-[#00ff88]/20 pl-2">
                    {fb.content.length > 80 ? fb.content.slice(0, 80) + "..." : fb.content}
                  </div>
                ))}
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

        {/* 分支抉择提示 */}
        {state.turn > 0 && state.availableActions.some(a => a.includes("前往") || a.includes("进入") || a.includes("返回")) && (
          <div className="bg-[#00ff88]/5 border border-[#00ff88]/20 rounded-lg p-3 mb-3 animate-pulse">
            <p className="text-xs text-[#00ff88]">⚠ 抉择时刻 — 你的选择将改变故事走向</p>
          </div>
        )}

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

      {/* 证据面板 */}
      {showEvidence && (
        <EvidenceBoard
          cards={state.evidenceCards}
          onConnect={connectEvidence}
          onMarkSuspicious={(id) => markEvidence(id, 20)}
          onMarkCredible={(id) => markEvidence(id, 80)}
          contradictions={[]}
        />
      )}

      {/* 对峙触发按钮 */}
      {state.evidenceCards.length >= 3 && !state.activeConfrontation && (
        <button onClick={startConfrontation}
          className="px-4 py-2 rounded-lg bg-[#00ff88]/20 border border-[#00ff88]/40 text-[#00ff88] animate-pulse">
          ⚡ 发起对峙
        </button>
      )}

      {/* 对峙界面覆盖层 */}
      {state.activeConfrontation && (
        <ConfrontationUI
          evidenceCards={state.evidenceCards}
          rounds={state.confrontationHistory}
          echo7Emotion={state.confrontationHistory[state.confrontationHistory.length - 1]?.echo7EmotionalState || "defensive"}
          onAccuse={sendConfrontAction}
          onConcede={endConfrontation}
          roundLimit={6}
        />
      )}

      {/* 隐藏的调试信息（开发用） */}
      {process.env.NODE_ENV === "development" && state.turn > 0 && (
        <details className="text-[10px] text-gray-700">
          <summary className="cursor-pointer">调试信息</summary>
          <p>隐秘目标: {state.symbioteGoal}</p>
          <p>目标进度: {state.symbioteGoalProgress}/100</p>
        </details>
      )}
        </>
      )}
      {pixelEvent && <PixelEvent event={pixelEvent} onDone={() => setPixelEvent(null)} />}
    </div>
  );
}
