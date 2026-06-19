"use client";

import { useState, useRef, useEffect } from "react";
import { useButterfly, calculateScore, getRating } from "@/hooks/useButterfly";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { StreamingText } from "@/components/ui/StreamingText";
import { saveGame } from "@/lib/save-system";
import { PixelEvent } from "@/components/ui/PixelEvent";
import type { PixelEventData } from "@/components/ui/PixelEvent";
import { TimelineBoard } from "@/components/game/TimelineBoard";
import { CausalCanvas } from "@/components/game/CausalCanvas";
import { ResourceBar } from "@/components/game/ResourceBar";
import { TownMap } from "@/components/game/TownMap";

const NPC_COLORS: Record<string, string> = {
  elias: "#ffcc00", rose: "#ff6b9d", marcus: "#64b5f6",
  brooks: "#8888ff", vera: "#bb66ff", sam: "#88aa88",
};

const NPC_LABELS: Record<string, string> = {
  elias: "钟楼管理员 Elias", rose: "花店老板 Rose",
  marcus: "医生 Marcus", brooks: "警长 Brooks",
  vera: "图书管理员 Vera", sam: "流浪汉 Old Sam",
};

export default function ButterflyPage() {
  const { state, startNewLoop, sendAction, newLoop, resetGame, isLoading, error,
    anchorChain, placeFragment, connectFragments } = useButterfly();
  const [selectedNPC, setSelectedNPC] = useState<string | null>(null);
  const [playerInput, setPlayerInput] = useState("");
  const [showCausalGraph, setShowCausalGraph] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [showCanvas, setShowCanvas] = useState(false);
  const [pixelEvent, setPixelEvent] = useState<PixelEventData | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const prevLoopRef = useRef(state.loopNumber);
  const prevCausalLenRef = useRef(0);
  const prevDialogueLenRef = useRef(0);
  const prevPreventedRef = useRef(false);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [state.dialogueMessages]);

  // Auto-save at loop end
  useEffect(() => {
    if (state.loopNumber > 0 && state.timeOfDay >= 24) {
      saveGame("butterfly", 0, state as unknown as Record<string, unknown>, `循环${state.loopNumber}结束`);
    }
  }, [state.timeOfDay]);

  // Pixel event: Time reset (new loop)
  useEffect(() => {
    if (state.loopNumber > prevLoopRef.current) {
      setPixelEvent({ type: "time_reset", duration: 3000 });
    }
    prevLoopRef.current = state.loopNumber;
  }, [state.loopNumber]);

  // Pixel event: Causal ripple (new causal node)
  useEffect(() => {
    if (state.causalGraph.length > prevCausalLenRef.current) {
      setPixelEvent({ type: "causal_ripple" });
    }
    prevCausalLenRef.current = state.causalGraph.length;
  }, [state.causalGraph.length]);

  // Pixel event: Secret (NPC reveals something meaningful)
  useEffect(() => {
    if (state.dialogueMessages.length > prevDialogueLenRef.current) {
      const lastMsg = state.dialogueMessages[state.dialogueMessages.length - 1];
      if (lastMsg?.role === "npc" && lastMsg.content.length > 50) {
        // NPC gave a substantial response — might contain secrets
        const clueWords = ["秘密", "其实", "不知道", "隐藏", "真相", "循环", "钟楼", "消失", "失踪"];
        if (clueWords.some(w => lastMsg.content.includes(w))) {
          setPixelEvent({ type: "secret" });
        }
      }
    }
    prevDialogueLenRef.current = state.dialogueMessages.length;
  }, [state.dialogueMessages.length]);

  // Pixel event: Breakthrough (hypothesis confirmed)
  useEffect(() => {
    const confirmed = state.hypotheses?.filter(h => h.status === "confirmed").length || 0;
    if (confirmed > 0) {
      setPixelEvent({ type: "breakthrough", duration: 3000 });
    }
  }, [state.hypotheses]);

  // Pixel event: Loop break (key event prevented)
  useEffect(() => {
    if (state.keyEvent.prevented && !prevPreventedRef.current) {
      setPixelEvent({ type: "loop_break", duration: 4000 });
    }
    prevPreventedRef.current = state.keyEvent.prevented;
  }, [state.keyEvent.prevented]);

  // Format time
  const timeLabel = `${state.timeOfDay}:00`;
  const isDayEnd = state.timeOfDay >= 24;

  const handleNPCClick = (npcId: string) => {
    setSelectedNPC(npcId);
    setPlayerInput("");
  };

  const handleTalk = () => {
    if (!selectedNPC || !playerInput.trim() || isLoading) return;
    sendAction("talk", playerInput.trim(), selectedNPC);
    setPlayerInput("");
  };

  const handleInvestigate = (location: string) => {
    if (isLoading) return;
    sendAction("investigate", `调查${location}`);
  };

  const handleIntervene = (action: string) => {
    if (isLoading) return;
    sendAction("intervene", action);
  };

  const handleNewLoop = async () => {
    newLoop();
    await startNewLoop();
  };

  return (
    <div className="flex-1 flex flex-col p-4 max-w-6xl mx-auto w-full gap-4">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-[#ff6b9d]">🦋 蝴蝶效应</h1>
          <span className="text-sm text-gray-400">
            循环 #{state.loopNumber}
          </span>
          <span className="text-sm text-gray-400">
            🕐 {timeLabel}
          </span>
          <span className="text-sm text-gray-500">
            📍 {state.currentLocation}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              showTimeline
                ? "border-[#ff6b9d]/40 text-[#ff6b9d] bg-[#ff6b9d]/10"
                : "border-[#2a2a4a] text-gray-400 hover:text-white"
            }`}
          >
            ⏳ {showTimeline ? "隐藏时间线" : "时间线"}
          </button>
          <button
            onClick={() => setShowCausalGraph(!showCausalGraph)}
            className="text-xs px-3 py-1.5 rounded border border-[#ff6b9d]/30 text-[#ff6b9d] hover:bg-[#ff6b9d]/10 transition-colors"
          >
            📊 {showCausalGraph ? "隐藏因果图" : "因果网络"}
          </button>
          <button
            onClick={() => setShowJournal(!showJournal)}
            className="text-xs px-3 py-1.5 rounded border border-[#2a2a4a] text-gray-400 hover:text-white transition-colors"
          >
            📓 {showJournal ? "隐藏日志" : "日志"}
          </button>
          <button
            onClick={resetGame}
            className="text-xs px-3 py-1.5 rounded border border-[#2a2a4a] text-gray-500 hover:text-white transition-colors"
          >
            重置
          </button>
        </div>
      </div>

      {/* AP 资源栏 */}
      <ResourceBar
        resources={[{
          label: "AP", current: state.actionPoints, max: state.maxActionPoints,
          color: "#ff6b9d", icon: "🎯", warning: 2
        }]}
        compact
      />

      <ErrorBanner message={error} />

      {/* 关键事件提示 */}
      <div className="bg-[#ff6b9d]/5 border border-[#ff6b9d]/20 rounded-lg p-3 text-sm text-[#ff6b9d]/80">
        {state.activeMystery === "tower" && "🏚 "}
        {state.activeMystery === "plague" && "🦠 "}
        {state.activeMystery === "invasion" && "👥 "}
        <span className="font-bold">
          {state.activeMystery === "tower" && "钟楼倒塌"}
          {state.activeMystery === "plague" && "诡异瘟疫"}
          {state.activeMystery === "invasion" && "外来者入侵"}
        </span>
        <span className="mx-2">—</span>
        {state.keyEvent.description}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {state.keyEvent.requiredConditions.map((c, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#ff6b9d]/10 text-[#ff6b9d]/60">
              {c.includes("✓") ? c : "☐ " + c}
            </span>
          ))}
        </div>
      </div>

      {/* 时间线面板 */}
      {showTimeline && (
        <TimelineBoard
          nodes={state.timelineNodes}
          currentTime={state.timeOfDay}
          actionPoints={state.actionPoints}
          maxActionPoints={state.maxActionPoints}
          insightPoints={state.insightPoints}
          onNodeClick={(node) => {
            // Jump to that time/location
            sendAction("investigate", `前往${node.location}（时间${node.time}:00）`);
          }}
          onPreviewNode={(node) => {
            // Show hint about locked node
            sendAction("investigate", `尝试了解${node.time}:00的${node.location}`);
          }}
        />
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        <TownMap
          currentLocation={state.currentLocation}
          timeOfDay={state.timeOfDay}
          npcs={state.npcs}
          selectedNPC={selectedNPC}
          onLocationClick={handleInvestigate}
          onNPCClick={handleNPCClick}
        />

        {/* NPC互动 + 结果面板 */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
          {/* 对话面板 */}
          <div
            ref={chatRef}
            className="flex-1 bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4 overflow-y-auto min-h-[200px]"
          >
            {state.loopNumber === 1 && state.timeOfDay === 7 && state.dialogueMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <h2 className="text-lg font-bold text-[#ff6b9d] mb-3">🦋 蝴蝶效应</h2>
                  <p className="text-sm text-gray-400 mb-2">
                    你被困在橡木镇的时间循环中。
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    每个NPC都可能是解开谜题的关键。
                    与他们对话，调查线索，找到阻止钟楼倒塌的方法。
                  </p>
                  <button
                    onClick={startNewLoop}
                    disabled={isLoading}
                    className="px-6 py-2 rounded-lg bg-[#ff6b9d]/20 border border-[#ff6b9d]/40 text-[#ff6b9d]
                             hover:bg-[#ff6b9d]/30 transition-colors disabled:opacity-50 text-sm"
                  >
                    {isLoading ? "⏳ 时间开始流动..." : "▶ 开始第1次循环"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {state.dialogueMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`${
                      msg.role === "npc"
                        ? "bg-[#1a1a2e] border-l-2 border-[#ff6b9d]/40 pl-3 py-2 rounded-r"
                        : msg.role === "player"
                        ? "pl-4 text-gray-400"
                        : "text-gray-500 italic text-xs"
                    }`}
                  >
                    {msg.role === "npc" && (
                      <div
                        className="text-[10px] mb-0.5 font-bold"
                        style={{ color: NPC_COLORS[msg.npcName || ""] || "#888" }}
                      >
                        {NPC_LABELS[msg.npcName || ""] || msg.npcName}
                      </div>
                    )}
                    {msg.content}
                  </div>
                ))}
                {state.sceneResult && !state.dialogueMessages.find(m => m.content === state.sceneResult) && (
                  <div className="text-gray-300 italic text-xs border-t border-[#1a1a2e] pt-2">
                    {state.sceneResult}
                  </div>
                )}
                {isLoading && <StreamingText text="" isLoading={true} accent="#ff6b9d" emptyText="思考中" />}
              </div>
            )}
          </div>

          {/* 输入面板 */}
          {state.timeOfDay >= 7 && state.dialogueMessages.length > 0 && (
            <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
              {selectedNPC ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: NPC_COLORS[selectedNPC] || "#888" }}
                    />
                    <span className="text-sm text-white">
                      正在与 {NPC_LABELS[selectedNPC]} 对话
                    </span>
                    <button
                      onClick={() => setSelectedNPC(null)}
                      className="text-xs text-gray-600 hover:text-gray-400"
                    >
                      [取消]
                    </button>
                  </div>
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleTalk(); }}
                    className="flex gap-2"
                  >
                    <input
                      value={playerInput}
                      onChange={(e) => setPlayerInput(e.target.value)}
                      placeholder="说点什么..."
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 rounded-lg bg-[#0a0a1a] border border-[#2a2a4a] text-sm text-gray-300
                               placeholder:text-gray-600 focus:outline-none focus:border-[#ff6b9d]/40 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !playerInput.trim()}
                      className="px-4 py-2 rounded-lg bg-[#ff6b9d]/10 border border-[#ff6b9d]/30 text-[#ff6b9d] text-sm
                               hover:bg-[#ff6b9d]/20 transition-colors disabled:opacity-50"
                    >
                      对话
                    </button>
                  </form>
                </div>
              ) : isDayEnd ? (
                <div className="text-center">
                  <p className="text-sm text-red-400 mb-2">🌙 午夜降临，钟楼倒塌了...</p>
                  <button
                    onClick={handleNewLoop}
                    disabled={isLoading}
                    className="px-6 py-2 rounded-lg bg-[#ff6b9d]/20 border border-[#ff6b9d]/40 text-[#ff6b9d]
                             hover:bg-[#ff6b9d]/30 transition-colors disabled:opacity-50 text-sm"
                  >
                    {isLoading ? "⏳ 时间重置中..." : `🔄 进入第${state.loopNumber + 1}次循环`}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-500 mb-2">点击地图上的NPC进行对话，或自由行动：</p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!playerInput.trim() || isLoading) return;
                      sendAction("investigate", playerInput.trim());
                      setPlayerInput("");
                    }}
                    className="flex gap-2"
                  >
                    <input
                      value={playerInput}
                      onChange={(e) => setPlayerInput(e.target.value)}
                      placeholder="自由行动（如：前往钟楼查看地基）..."
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 rounded-lg bg-[#0a0a1a] border border-[#2a2a4a] text-sm text-gray-300
                               placeholder:text-gray-600 focus:outline-none focus:border-[#ff6b9d]/40 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !playerInput.trim()}
                      className="px-4 py-2 rounded-lg bg-[#1a1a2e] border border-[#2a2a4a] text-gray-300 text-sm
                               hover:border-[#ff6b9d]/30 transition-colors disabled:opacity-50"
                    >
                      行动
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 因果网络面板（可折叠）*/}
      {showCausalGraph && (
        <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs text-gray-500 uppercase tracking-wider">因果网络</h3>
            <button
              onClick={() => setShowCanvas(!showCanvas)}
              className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                showCanvas
                  ? "border-[#ff6b9d]/40 text-[#ff6b9d] bg-[#ff6b9d]/10"
                  : "border-[#2a2a4a] text-gray-400 hover:text-white"
              }`}
            >
              {showCanvas ? "📋 列表视图" : "🧩 因果拼图"}
            </button>
          </div>

          {showCanvas ? (
            <CausalCanvas
              fragments={state.causalFragments}
              anchoredChains={state.anchoredCausals}
              onPlaceFragment={placeFragment}
              onConnectFragments={connectFragments}
              onAnchorChain={anchorChain}
              insightPoints={state.insightPoints}
            />
          ) : (
            <>
              {/* 原因果图 */}
              {state.causalGraph.length === 0 ? (
                <p className="text-xs text-gray-600">尚未建立因果连接。每次行动都会产生涟漪。</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {state.causalGraph.map((node) => (
                    <div
                      key={node.id}
                      className="px-3 py-2 rounded-lg border border-[#ff6b9d]/10 bg-[#ff6b9d]/5 text-xs"
                    >
                      <div className="text-[#ff6b9d] mb-1">循环{node.loopNumber} | 强度:{node.magnitude}</div>
                      <div className="text-gray-400">{node.action}</div>
                      <div className="text-gray-500 mt-1">→ {node.consequenceDescription}</div>
                      <div className="flex gap-1 mt-1">
                        {node.affectedNPCs.map((npc) => (
                          <span
                            key={npc}
                            className="text-[10px] px-1 rounded"
                            style={{ backgroundColor: NPC_COLORS[npc] + "30", color: NPC_COLORS[npc] }}
                          >
                            {npc}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* 玩家假设 */}
          <div className="mt-4 pt-3 border-t border-[#1a1a2e]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">假设推理</span>
              <button
                onClick={() => {
                  const input = window.prompt("输入你的假设（如：Rose没去钟楼是因为怀表被偷了）:");
                  if (input?.trim()) {
                    const newHypothesis = {
                      id: `hyp_${Date.now()}`,
                      loopNumber: state.loopNumber,
                      content: input.trim(),
                      status: "pending" as const,
                    };
                    // Add hypothesis via journal dispatch
                    sendAction("investigate", `[假设] ${input.trim()}`);
                  }
                }}
                className="text-[10px] px-2 py-0.5 rounded border border-[#ff6b9d]/30 text-[#ff6b9d] hover:bg-[#ff6b9d]/10 transition-colors"
              >
                + 新假设
              </button>
            </div>
            {state.hypotheses.length === 0 ? (
              <p className="text-[10px] text-gray-600">尚未建立假设。观察因果链后提出你的推理。</p>
            ) : (
              <div className="space-y-1">
                {state.hypotheses.map((h) => (
                  <div
                    key={h.id}
                    className={`text-[10px] px-2 py-1 rounded ${
                      h.status === "confirmed"
                        ? "bg-green-400/10 text-green-400"
                        : h.status === "rejected"
                        ? "bg-red-400/10 text-red-400 line-through"
                        : "bg-[#1a1a2e] text-gray-400"
                    }`}
                  >
                    {h.status === "confirmed" && "✓ "}
                    {h.status === "rejected" && "✗ "}
                    {h.status === "pending" && "? "}
                    [循环{h.loopNumber}] {h.content}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 日志面板（可折叠） */}
      {showJournal && (
        <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4 max-h-40 overflow-y-auto">
          <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">探索日志</h3>
          <div className="space-y-1.5">
            {state.playerJournal.map((entry, i) => (
              <div key={i} className="text-xs flex gap-2">
                <span className="text-gray-600 shrink-0">
                  [循环{entry.loopNumber} {entry.timeOfDay}:00]
                </span>
                <span
                  className={
                    entry.type === "breakthrough"
                      ? "text-[#ff6b9d]"
                      : entry.type === "hypothesis"
                      ? "text-yellow-400"
                      : "text-gray-400"
                  }
                >
                  {entry.content}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 循环破解评分 */}
      {state.keyEvent.prevented && (
        <div className="bg-[#0d0d24] border border-[#ff6b9d]/40 rounded-xl p-4 text-center">
          <h3 className="text-lg font-bold text-[#ff6b9d] mb-3">🎉 循环破解！</h3>
          <p className="text-sm text-gray-300">评分: <span className="text-[#ff6b9d] font-bold">{calculateScore(state)}</span></p>
          <p className="text-sm text-gray-300 mt-1">评级: <span className="text-[#ff6b9d] font-bold">{getRating(calculateScore(state))}</span></p>
        </div>
      )}

      {pixelEvent && <PixelEvent event={pixelEvent} onDone={() => setPixelEvent(null)} />}
    </div>
  );
}
