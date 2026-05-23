"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useXenogenesis } from "@/hooks/useXenogenesis";
import type { SpeciesTraits, SpeciesDef, XenogenesisState } from "@/lib/types";
import { ACHIEVEMENTS } from "@/lib/types";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { StreamingText } from "@/components/ui/StreamingText";
import { GameCard } from "@/components/ui/GameCard";
import { saveGame } from "@/lib/save-system";
import { PixelEvent } from "@/components/ui/PixelEvent";
import type { PixelEventData } from "@/components/ui/PixelEvent";

const TRAIT_LABELS: Record<keyof SpeciesTraits, string> = {
  size: "体型",
  metabolism: "代谢",
  reproduction: "繁殖",
  intelligence: "智力",
  defense: "防御",
  adaptability: "适应",
  specialAbility: "特殊",
};

// ---- 纪元内演化模拟 ----

interface SimLayer {
  running: boolean;
  progress: number;           // 0→1，当前纪元的播放进度
  epochStartPops: Record<string, number>; // 纪元开始时的种群
}

const EPOCH_DURATION_MS = 3000; // 纪元内演化动画时长

function lerpPops(
  startPops: Record<string, number>,
  targetPops: Record<string, number>,
  t: number
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const id of Object.keys(targetPops)) {
    const start = startPops[id] ?? targetPops[id];
    result[id] = Math.round(start + (targetPops[id] - start) * t);
  }
  return result;
}

// ---- 页面组件 ----

export default function XenogenesisPage() {
  const { state, advanceEpoch, addSpecies, updateEnvironment, resetGame, error } =
    useXenogenesis();
  const [showCreator, setShowCreator] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [pixelEvent, setPixelEvent] = useState<PixelEventData | null>(null);

  // 纪元间自动推进
  const [autoAdvance, setAutoAdvance] = useState(false);
  const autoAdvanceRef = useRef(false);

  // 纪元内演化模拟
  const [sim, setSim] = useState<SimLayer>({
    running: false,
    progress: 1,
    epochStartPops: {},
  });
  const simRef = useRef(sim);
  useEffect(() => { simRef.current = sim; }, [sim]);
  const animFrameRef = useRef<number>(0);
  const prevDisasterLenRef = useRef(0);
  const prevCivLenRef = useRef(0);
  const prevExtinctCountRef = useRef(0);
  const prevTraitsHashRef = useRef("");

  // 物种创建
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<SpeciesDef["type"]>("herbivore");
  const [newTraits, setNewTraits] = useState<SpeciesTraits>({
    size: 5, metabolism: 5, reproduction: 5,
    intelligence: 3, defense: 3, adaptability: 5,
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    addSpecies({
      name: newName.trim(),
      type: newType,
      traits: { ...newTraits },
      population: 100,
      status: "stable",
      epochCreated: state.epoch,
    });
    setNewName("");
    setShowCreator(false);
  };

  // 获取当前展示用的物种数据（经过演化插值）
  const currentSpecies = state.species;
  const displaySpecies = { ...currentSpecies };
  if (sim.progress < 1 && Object.keys(sim.epochStartPops).length > 0) {
    const targetPops: Record<string, number> = {};
    for (const [id, s] of Object.entries(currentSpecies)) {
      targetPops[id] = s.population;
    }
    const lerped = lerpPops(sim.epochStartPops, targetPops, sim.progress);
    for (const [id, pop] of Object.entries(lerped)) {
      if (displaySpecies[id]) {
        displaySpecies[id] = { ...displaySpecies[id], population: pop };
      }
    }
  }

  const aliveSpecies = Object.values(displaySpecies).filter((s) => s.status !== "extinct");
  const extinctSpecies = Object.values(displaySpecies).filter((s) => s.status === "extinct");
  const currentEpoch = state.timeline[state.timeline.length - 1];

  // ---- 纪元内演化动画 ----

  const startEpochSim = useCallback(() => {
    // 记录纪元开始时的种群
    const startPops: Record<string, number> = {};
    for (const [id, s] of Object.entries(state.species)) {
      startPops[id] = s.population;
    }
    const newSim: SimLayer = { running: true, progress: 0, epochStartPops: startPops };
    setSim(newSim);
    simRef.current = newSim;

    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      const current = simRef.current;
      if (!current.running) return;

      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const p = Math.min(1, elapsed / EPOCH_DURATION_MS);

      setSim(prev => ({ ...prev, progress: p }));

      if (p < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setSim(prev => ({ ...prev, running: false, progress: 1 }));
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [state.species]);

  const pauseSim = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    setSim(prev => ({ ...prev, running: false }));
  }, []);

  const resumeSim = useCallback(() => {
    if (sim.progress >= 1) return;
    const newSim = { ...sim, running: true };
    setSim(newSim);
    simRef.current = newSim;

    const startFromProgress = sim.progress;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      const current = simRef.current;
      if (!current.running) return;

      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const remaining = 1 - startFromProgress;
      const p = Math.min(1, startFromProgress + (elapsed / EPOCH_DURATION_MS) * remaining);

      setSim(prev => ({ ...prev, progress: p }));

      if (p < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setSim(prev => ({ ...prev, running: false, progress: 1 }));
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [sim]);

  const stopSim = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    setSim({ running: false, progress: 1, epochStartPops: {} });
  }, []);

  // ---- 纪元推进 ----

  const handleAdvanceEpoch = useCallback(async () => {
    if (state.isSimulating) return;
    await advanceEpoch();
  }, [advanceEpoch, state.isSimulating]);

  // 纪元推进完成后自动开始纪元内演化
  const prevEpoch = useRef(state.epoch);
  useEffect(() => {
    if (state.epoch > prevEpoch.current && !state.isSimulating) {
      prevEpoch.current = state.epoch;
      // 延迟一帧等 state 更新完
      setTimeout(() => startEpochSim(), 50);
    }
  }, [state.epoch, state.isSimulating, startEpochSim]);

  // ---- 纪元间自动推进 ----

  useEffect(() => { autoAdvanceRef.current = autoAdvance; }, [autoAdvance]);

  useEffect(() => {
    if (!autoAdvance) return;
    let stopped = false;

    const run = async () => {
      while (!stopped && autoAdvanceRef.current) {
        const speciesAlive = Object.values(state.species).filter(s => s.status !== "extinct");
        if (speciesAlive.length === 0 && state.epoch > 0) {
          setAutoAdvance(false);
          break;
        }
        // 等待当前纪元内演化完成
        while (simRef.current.progress < 1 && simRef.current.running && !stopped) {
          await new Promise(r => setTimeout(r, 100));
        }
        if (stopped) break;
        await advanceEpoch();
        // 等待纪元内演化
        await new Promise(r => setTimeout(r, EPOCH_DURATION_MS + 500));
      }
    };

    run();
    return () => { stopped = true; };
  }, [autoAdvance]);

  // ---- 自动存档 ----

  useEffect(() => {
    if (state.epoch > 0 && state.epoch % 3 === 0) {
      saveGame("xenogenesis", 0, state as unknown as Record<string, unknown>, `纪元${state.epoch}`);
    }
  }, [state.epoch]);

  // ---- 清理 ----

  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Pixel event: Meteor (disaster added)
  useEffect(() => {
    if (state.disasters && state.disasters.length > prevDisasterLenRef.current) {
      const lastD = state.disasters[state.disasters.length - 1];
      if (lastD?.type === "meteor") setPixelEvent({ type: "meteor" });
      else if (lastD?.type) setPixelEvent({ type: "meteor" });
    }
    prevDisasterLenRef.current = state.disasters?.length || 0;
  }, [state.disasters?.length]);

  // Pixel event: Evolution (species traits changed via mutation)
  useEffect(() => {
    const traitsHash = Object.values(state.species)
      .map(s => `${s.id}:${s.traits.specialAbility || ""}`)
      .join(",");
    if (prevTraitsHashRef.current && traitsHash !== prevTraitsHashRef.current) {
      setPixelEvent({ type: "evolution" });
    }
    prevTraitsHashRef.current = traitsHash;
  }, [state.species]);

  // Pixel event: Civilization (new civ awakened)
  useEffect(() => {
    if (state.civilizations && state.civilizations.length > prevCivLenRef.current) {
      setPixelEvent({ type: "civilization", duration: 3500 });
    }
    prevCivLenRef.current = state.civilizations?.length || 0;
  }, [state.civilizations?.length]);

  // Pixel event: Extinction (species went extinct)
  useEffect(() => {
    const extinctCount = Object.values(state.species).filter(s => s.status === "extinct").length;
    if (extinctCount > prevExtinctCountRef.current) {
      setPixelEvent({ type: "extinction", duration: 3000 });
    }
    prevExtinctCountRef.current = extinctCount;
  }, [state.species]);

  // Pixel event: Balance (3 consecutive epochs without extinction, 3+ species alive)
  useEffect(() => {
    if (state.epoch >= 3 && state.timeline.length >= 3) {
      const recentEpochs = state.timeline.slice(-3);
      const noExtinction = recentEpochs.every(
        e => !e.notableEvents?.some(ev => ev.includes("灭绝"))
      );
      const aliveCount = Object.values(state.species).filter(s => s.status !== "extinct").length;
      if (noExtinction && aliveCount >= 3) {
        setPixelEvent({ type: "balance", duration: 3500 });
      }
    }
  }, [state.epoch]);

  // ---- 衍生状态 ----

  const simActive = sim.running || sim.progress < 1;
  const simProgress = Math.round(sim.progress * 100);

  return (
    <div className="flex-1 flex flex-col p-4 max-w-6xl mx-auto w-full gap-4">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-white">{state.planetName}</h1>
          <span className="text-sm text-gray-500">第 {state.epoch} 纪元</span>
          <span className="text-xs text-gray-600 font-mono" title="星球种子码">🌱 {state.seed}</span>
          {simActive && (
            <span className="text-xs text-[#64b5f6] animate-pulse">
              演化中 {simProgress}%
            </span>
          )}
          <div className="flex gap-3 text-xs text-gray-400">
            <span>🌡 {state.environment.temperature}°C</span>
            <span>💧 {state.environment.waterCoverage}%</span>
            <span>🫁 O₂ {state.environment.oxygenLevel}%</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreator(!showCreator)}
            className="text-xs px-3 py-1.5 rounded border border-[#64b5f6]/30 text-[#64b5f6] hover:bg-[#64b5f6]/10 transition-colors">
            + 创建物种
          </button>
          <button onClick={() => setShowAchievements(!showAchievements)}
            className="text-xs px-3 py-1.5 rounded border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 transition-colors">
            🏆 {state.achievements.length}/15
          </button>
          <button onClick={resetGame}
            className="text-xs px-3 py-1.5 rounded border border-[#2a2a4a] text-gray-500 hover:text-white transition-colors">
            重置
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* 物种创建表单 */}
      {showCreator && (
        <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-5">
          <div className="flex gap-4 flex-wrap items-end">
            <div>
              <label className="text-xs text-gray-500 block mb-1">物种名</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                className="w-32 px-3 py-1.5 rounded bg-[#0a0a1a] border border-[#2a2a4a] text-sm text-white"
                placeholder="如：鳞行者" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">类型</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value as SpeciesDef["type"])}
                className="px-3 py-1.5 rounded bg-[#0a0a1a] border border-[#2a2a4a] text-sm text-white">
                <option value="plant">🌱 植物</option>
                <option value="herbivore">🐑 草食</option>
                <option value="carnivore">🐺 肉食</option>
                <option value="omnivore">🐻 杂食</option>
                <option value="decomposer">🍄 分解者</option>
              </select>
            </div>
            {(Object.keys(TRAIT_LABELS) as Array<keyof SpeciesTraits>).filter(k => k !== "specialAbility").map((key) => (
              <div key={key}>
                <label className="text-xs text-gray-500 block mb-1">{TRAIT_LABELS[key]}</label>
                <input type="range" min="1" max="10" value={newTraits[key]}
                  onChange={(e) => setNewTraits((t) => ({ ...t, [key]: Number(e.target.value) }))}
                  className="w-20" />
                <span className="text-xs text-gray-400 ml-1">{newTraits[key]}</span>
              </div>
            ))}
            <button onClick={handleCreate}
              className="px-4 py-1.5 rounded bg-[#64b5f6]/20 border border-[#64b5f6]/40 text-[#64b5f6] text-sm hover:bg-[#64b5f6]/30">
              投放
            </button>
          </div>
        </div>
      )}

      {/* 成就面板 */}
      {showAchievements && (
        <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4 max-h-48 overflow-y-auto">
          <h3 className="text-xs text-gray-500 mb-2 uppercase tracking-wider">成就 ({state.achievements.length}/15)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
            {Object.entries(ACHIEVEMENTS).map(([key, desc]) => {
              const unlocked = state.achievements.includes(key);
              return (
                <div key={key} className={`text-[10px] px-2 py-1.5 rounded border ${
                  unlocked ? "text-yellow-400 bg-yellow-400/5 border-yellow-400/20" : "text-gray-700 border-[#1a1a2e]"
                }`}>
                  {unlocked ? desc : "??? " + desc.split(":")[1]?.trim()}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* 物种面板 */}
        <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4 overflow-y-auto">
          <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">
            物种
            {simActive && <span className="text-[#64b5f6] ml-2">● LIVE</span>}
          </h3>
          {aliveSpecies.length === 0 && extinctSpecies.length === 0 ? (
            <p className="text-sm text-gray-600">还没有物种。点击"+ 创建物种"开始。</p>
          ) : (
            <div className="space-y-2">
              {aliveSpecies.map((s) => {
                const civ = state.civilizations.find(c => c.speciesId === s.id && c.stage !== "collapsed");
                const collapsedCiv = state.civilizations.find(c => c.speciesId === s.id && c.stage === "collapsed");
                const stageLabels: Record<string, string> = {
                  tools: "🔧 工具时代", tribal: "🏘 部落时代", agriculture: "🌾 农业时代",
                  industrial: "🏭 工业时代", information: "💻 信息时代", interstellar: "⭐ 星际文明",
                };
                const originalPop = state.species[s.id]?.population ?? s.population;
                const popDelta = s.population - originalPop;

                return (
                  <GameCard key={s.id} emoji={s.emoji} name={s.name} subtitle={s.type}
                    meta={`${s.population} 只${simActive && popDelta !== 0 ? (popDelta > 0 ? ` ↑` : ` ↓`) : ""}`}>
                    {/* 纪元内种群变化条 */}
                    {simActive && (
                      <div className="mb-1.5 h-1 bg-[#1a1a2e] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-100"
                          style={{
                            width: `${Math.min(100, (s.population / Math.max(originalPop, 1)) * 100)}%`,
                            backgroundColor: popDelta >= 0 ? "#64b5f6" : "#ff6644",
                          }} />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {(Object.keys(TRAIT_LABELS) as Array<keyof SpeciesTraits>).map((key) =>
                        s.traits[key] !== undefined && key !== "specialAbility" ? (
                          <span key={key} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a2e] text-gray-400">
                            {TRAIT_LABELS[key]}:{s.traits[key]}
                          </span>
                        ) : null
                      )}
                      {s.traits.specialAbility && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#64b5f6]/10 text-[#64b5f6]">
                          {s.traits.specialAbility}
                        </span>
                      )}
                    </div>
                    <div className={`text-[10px] mt-1.5 ${
                      s.status === "thriving" ? "text-green-400" : s.status === "declining" ? "text-yellow-400" :
                      s.status === "endangered" ? "text-red-400" : "text-gray-500"
                    }`}>
                      {s.status === "thriving" && "📈 繁盛"}
                      {s.status === "stable" && "➡ 稳定"}
                      {s.status === "declining" && "📉 衰减"}
                      {s.status === "endangered" && "⚠ 濒危"}
                    </div>
                    {civ && (
                      <div className="mt-2 pt-2 border-t border-[#1a1a2e]">
                        <span className="text-[10px] text-[#64b5f6]">{stageLabels[civ.stage] || civ.stage}</span>
                        {collapsedCiv && <span className="text-[10px] text-red-400 ml-2">💀 文明崩塌</span>}
                      </div>
                    )}
                  </GameCard>
                );
              })}
              {extinctSpecies.map((s) => (
                <div key={s.id} className="p-3 rounded-lg border border-[#1a1a2e] opacity-40">
                  <span className="text-sm text-gray-500 line-through">{s.emoji} {s.name}</span>
                  <span className="text-xs text-red-400 ml-2">灭绝</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 种群趋势图 + 互动 + 叙事 */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {state.timeline.length > 0 && (
            <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
              <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">种群趋势</h3>
              <div className="relative h-40">
                <PopulationChart
                  timeline={state.timeline}
                  species={state.species}
                  liveSpecies={displaySpecies}
                  simActive={simActive && sim.progress < 1}
                />
              </div>
            </div>
          )}

          {currentEpoch?.interactions && currentEpoch.interactions.length > 0 && (
            <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
              <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">物种互动</h3>
              <div className="space-y-1.5">
                {currentEpoch.interactions.map((ix, i) => {
                  const a = state.species[ix.speciesA];
                  const b = state.species[ix.speciesB];
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{a?.emoji}</span>
                      <span className="text-white">{a?.name || ix.speciesA}</span>
                      <span className="text-gray-600">
                        {ix.type === "predation" ? "→ 捕食 →" : ix.type === "competition" ? "↔ 竞争 ↔" :
                         ix.type === "symbiosis" ? "⇄ 共生 ⇄" : "→ 分解 →"}
                      </span>
                      <span className="text-white">{b?.emoji} {b?.name || ix.speciesB}</span>
                      <span className="text-gray-600">({Math.round(ix.intensity * 100)}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {state.timeline.length > 0 && (
            <div className="flex-1 bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4 overflow-y-auto">
              <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">纪元史书</h3>
              <div className="space-y-3">
                {state.timeline.map((epoch) => (
                  <div key={epoch.epochNumber} className="text-sm">
                    <div className="text-xs text-gray-600 mb-1">— 第{epoch.epochNumber}纪元 —</div>
                    <p className="text-gray-300 leading-relaxed">{epoch.narrative}</p>
                    {epoch.notableEvents.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {epoch.notableEvents.map((ev, i) => {
                          const isDisaster = ["陨石", "冰河", "瘟疫", "耀斑", "灾难", "灭绝"].some(k => ev.includes(k));
                          return (
                            <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${
                              isDisaster ? "bg-red-400/10 text-red-400" : "bg-[#64b5f6]/10 text-[#64b5f6]"
                            }`}>{ev}</span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
                {state.isSimulating && (
                  <div className="text-sm text-gray-600 italic">
                    <span className="cursor-blink text-[#64b5f6]">AI 计算中</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4 flex items-center gap-3 flex-wrap">
        {/* === 纪元内演化控制 === */}
        <div className="flex items-center gap-1.5 border-r border-[#2a2a4a] pr-3 mr-1">
          <span className="text-[10px] text-gray-600 mr-1">纪元内</span>

          {!sim.running ? (
            <button onClick={resumeSim}
              disabled={sim.progress >= 1 || state.isSimulating}
              className="px-3 py-1.5 rounded bg-[#64b5f6]/20 border border-[#64b5f6]/40 text-[#64b5f6] text-xs
                       hover:bg-[#64b5f6]/30 transition-colors disabled:opacity-30 flex items-center gap-1"
              title="播放纪元内演化">
              ▶ 播放
            </button>
          ) : (
            <button onClick={pauseSim}
              className="px-3 py-1.5 rounded bg-yellow-400/20 border border-yellow-400/40 text-yellow-400 text-xs
                       hover:bg-yellow-400/30 transition-colors flex items-center gap-1"
              title="暂停纪元内演化">
              ⏸ 暂停
            </button>
          )}

          <button onClick={stopSim}
            disabled={sim.progress >= 1 && !sim.running}
            className="px-3 py-1.5 rounded bg-red-400/10 border border-red-400/30 text-red-400 text-xs
                     hover:bg-red-400/20 transition-colors disabled:opacity-30"
            title="停止并跳到纪元终点">
            ⏹ 停止
          </button>
        </div>

        {/* === 纪元间推进控制 === */}
        <div className="flex items-center gap-1.5 border-r border-[#2a2a4a] pr-3 mr-1">
          <span className="text-[10px] text-gray-600 mr-1">纪元推进</span>

          <button onClick={handleAdvanceEpoch}
            disabled={state.isSimulating}
            className="px-3 py-1.5 rounded bg-[#1a1a2e] border border-[#2a2a4a] text-gray-300 text-xs
                     hover:border-[#4a4a6a] transition-colors disabled:opacity-50"
            title="手动推进一个纪元">
            ⏭ 单步
          </button>

          {!autoAdvance ? (
            <button onClick={() => setAutoAdvance(true)}
              disabled={state.isSimulating}
              className="px-3 py-1.5 rounded bg-[#64b5f6]/20 border border-[#64b5f6]/40 text-[#64b5f6] text-xs
                       hover:bg-[#64b5f6]/30 transition-colors disabled:opacity-30"
              title="自动连续推进纪元">
              🔄 自动
            </button>
          ) : (
            <button onClick={() => setAutoAdvance(false)}
              className="px-3 py-1.5 rounded bg-yellow-400/20 border border-yellow-400/40 text-yellow-400 text-xs
                       hover:bg-yellow-400/30 transition-colors"
              title="停止自动推进">
              🔄 停止自动
            </button>
          )}
        </div>

        {/* === 环境调节 === */}
        <div className="flex items-center gap-4 text-xs text-gray-500 ml-auto">
          <div className="flex items-center gap-2">
            <label>🌡 温度</label>
            <input type="range" min="-20" max="60" value={state.environment.temperature}
              onChange={(e) => updateEnvironment({ temperature: Number(e.target.value) })}
              className="w-24" />
            <span>{state.environment.temperature}°C</span>
          </div>
          <div className="flex items-center gap-2">
            <label>💧 水域</label>
            <input type="range" min="0" max="100" value={state.environment.waterCoverage}
              onChange={(e) => updateEnvironment({ waterCoverage: Number(e.target.value) })}
              className="w-24" />
            <span>{state.environment.waterCoverage}%</span>
          </div>
        </div>
      </div>
      {pixelEvent && <PixelEvent event={pixelEvent} onDone={() => setPixelEvent(null)} />}
    </div>
  );
}

// ---- 简易 SVG 种群趋势图 ----

function PopulationChart({
  timeline, species, liveSpecies, simActive,
}: {
  timeline: XenogenesisState["timeline"];
  species: XenogenesisState["species"];
  liveSpecies?: XenogenesisState["species"];
  simActive?: boolean;
}) {
  const displaySpecies = liveSpecies || species;
  const aliveSpecies = Object.values(displaySpecies).filter((s) => s.status !== "extinct");
  if (aliveSpecies.length === 0) return null;

  const populationsByEpoch: Record<string, number[]> = {};
  let maxPop = 50;

  for (const s of aliveSpecies) {
    const pops: number[] = [];
    let current = 100;
    const realSpecies = species[s.id];
    for (const epoch of timeline) {
      current += epoch.populationChanges[s.id] ?? 0;
      current = Math.max(0, current);
      pops.push(current);
    }
    populationsByEpoch[s.id] = pops;
    maxPop = Math.max(maxPop, ...pops);
  }

  // 如果正在模拟中，将最后一个数据点替换为当前插值
  if (simActive && liveSpecies) {
    for (const s of aliveSpecies) {
      const pops = populationsByEpoch[s.id];
      if (pops && pops.length > 0) {
        pops[pops.length - 1] = s.population;
        maxPop = Math.max(maxPop, s.population);
      }
    }
  }

  const width = 600;
  const height = 140;
  const pad = { top: 10, right: 10, bottom: 20, left: 40 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const epochs = Math.max(timeline.length, 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
        <line key={pct} x1={pad.left} y1={pad.top + chartH * (1 - pct)}
          x2={width - pad.right} y2={pad.top + chartH * (1 - pct)}
          stroke="#1a1a2e" strokeWidth="1" />
      ))}
      {aliveSpecies.map((s) => {
        const pops = populationsByEpoch[s.id];
        if (!pops || pops.length === 0) return null;
        const points = pops
          .map((pop, i) => {
            const x = pad.left + (i / Math.max(epochs - 1, 1)) * chartW;
            const y = pad.top + chartH * (1 - pop / maxPop);
            return `${x},${y}`;
          })
          .join(" ");

        const realS = species[s.id];
        const color = realS?.color || s.color;

        return (
          <g key={s.id}>
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
            {pops.map((pop, i) => (
              <circle key={i} cx={pad.left + (i / Math.max(epochs - 1, 1)) * chartW}
                cy={pad.top + chartH * (1 - pop / maxPop)} r="2.5" fill={color}>
                <title>{`${s.name} 纪元${i + 1}: ${Math.round(pop)}`}</title>
              </circle>
            ))}
            {/* 当前纪元的实时数据点（脉冲动画） */}
            {simActive && (
              <circle
                cx={pad.left + ((pops.length - 1) / Math.max(epochs - 1, 1)) * chartW}
                cy={pad.top + chartH * (1 - pops[pops.length - 1] / maxPop)}
                r="4" fill={color} opacity="0.6"
                className="animate-pulse"
              />
            )}
          </g>
        );
      })}
      {aliveSpecies.map((s, i) => (
        <text key={s.id} x={pad.left + i * 85} y={height - 3} fill={species[s.id]?.color || s.color} fontSize="9">
          {s.emoji} {s.name}
        </text>
      ))}
    </svg>
  );
}
