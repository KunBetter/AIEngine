"use client";

import { useState } from "react";
import { useXenogenesis } from "@/hooks/useXenogenesis";
import type { SpeciesTraits, SpeciesDef, XenogenesisState } from "@/lib/types";
import { ACHIEVEMENTS } from "@/lib/types";

const TRAIT_LABELS: Record<keyof SpeciesTraits, string> = {
  size: "体型",
  metabolism: "代谢",
  reproduction: "繁殖",
  intelligence: "智力",
  defense: "防御",
  adaptability: "适应",
  specialAbility: "特殊",
};

export default function XenogenesisPage() {
  const { state, advanceEpoch, addSpecies, updateEnvironment, resetGame, error } =
    useXenogenesis();
  const [showCreator, setShowCreator] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);

  // 物种创建表单
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

  const aliveSpecies = Object.values(state.species).filter((s) => s.status !== "extinct");
  const extinctSpecies = Object.values(state.species).filter((s) => s.status === "extinct");
  const currentEpoch = state.timeline[state.timeline.length - 1];

  return (
    <div className="flex-1 flex flex-col p-4 max-w-6xl mx-auto w-full gap-4">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-white">
            {state.planetName}
          </h1>
          <span className="text-sm text-gray-500">第 {state.epoch} 纪元</span>
          <span className="text-xs text-gray-600 font-mono" title="星球种子码">🌱 {state.seed}</span>
          <div className="flex gap-3 text-xs text-gray-400">
            <span>🌡 {state.environment.temperature}°C</span>
            <span>💧 {state.environment.waterCoverage}%</span>
            <span>🫁 O₂ {state.environment.oxygenLevel}%</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreator(!showCreator)}
            className="text-xs px-3 py-1.5 rounded border border-[#64b5f6]/30 text-[#64b5f6] hover:bg-[#64b5f6]/10 transition-colors"
          >
            + 创建物种
          </button>
          <button
            onClick={() => setShowAchievements(!showAchievements)}
            className="text-xs px-3 py-1.5 rounded border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 transition-colors"
          >
            🏆 {state.achievements.length}/15
          </button>
          <button
            onClick={resetGame}
            className="text-xs px-3 py-1.5 rounded border border-[#2a2a4a] text-gray-500 hover:text-white transition-colors"
          >
            重置
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg p-3 text-center">
          {error}
        </div>
      )}

      {/* 物种创建表单 */}
      {showCreator && (
        <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-5">
          <div className="flex gap-4 flex-wrap items-end">
            <div>
              <label className="text-xs text-gray-500 block mb-1">物种名</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-32 px-3 py-1.5 rounded bg-[#0a0a1a] border border-[#2a2a4a] text-sm text-white"
                placeholder="如：鳞行者"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">类型</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as SpeciesDef["type"])}
                className="px-3 py-1.5 rounded bg-[#0a0a1a] border border-[#2a2a4a] text-sm text-white"
              >
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
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={newTraits[key]}
                  onChange={(e) => setNewTraits((t) => ({ ...t, [key]: Number(e.target.value) }))}
                  className="w-20"
                />
                <span className="text-xs text-gray-400 ml-1">{newTraits[key]}</span>
              </div>
            ))}
            <button
              onClick={handleCreate}
              className="px-4 py-1.5 rounded bg-[#64b5f6]/20 border border-[#64b5f6]/40 text-[#64b5f6] text-sm hover:bg-[#64b5f6]/30"
            >
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
                <div
                  key={key}
                  className={`text-[10px] px-2 py-1.5 rounded border ${
                    unlocked
                      ? "text-yellow-400 bg-yellow-400/5 border-yellow-400/20"
                      : "text-gray-700 border-[#1a1a2e]"
                  }`}
                >
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
          <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">物种</h3>
          {aliveSpecies.length === 0 && extinctSpecies.length === 0 ? (
            <p className="text-sm text-gray-600">还没有物种。点击"+ 创建物种"开始。</p>
          ) : (
            <div className="space-y-2">
              {aliveSpecies.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-lg border border-[#1a1a2e] hover:border-[#2a2a4a] transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white">
                      {s.emoji} {s.name}
                    </span>
                    <span className="text-xs text-gray-500">{s.population} 只</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">{s.type}</div>
                  <div className="flex flex-wrap gap-1">
                    {(Object.keys(TRAIT_LABELS) as Array<keyof SpeciesTraits>).map(
                      (key) =>
                        s.traits[key] !== undefined && (
                          <span
                            key={key}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a2e] text-gray-400"
                          >
                            {TRAIT_LABELS[key]}:{s.traits[key]}
                          </span>
                        )
                    )}
                    {s.traits.specialAbility && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#64b5f6]/10 text-[#64b5f6]">
                        {s.traits.specialAbility}
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[10px] mt-1.5 ${
                      s.status === "thriving"
                        ? "text-green-400"
                        : s.status === "declining"
                        ? "text-yellow-400"
                        : s.status === "endangered"
                        ? "text-red-400"
                        : "text-gray-500"
                    }`}
                  >
                    {s.status === "thriving" && "📈 繁盛"}
                    {s.status === "stable" && "➡ 稳定"}
                    {s.status === "declining" && "📉 衰减"}
                    {s.status === "endangered" && "⚠ 濒危"}
                  </div>
                  {/* 文明状态 */}
                  {(() => {
                    const civ = state.civilizations.find(c => c.speciesId === s.id && c.stage !== "collapsed");
                    if (!civ) return null;
                    const stageLabels: Record<string, string> = {
                      tools: "🔧 工具时代", tribal: "🏘 部落时代", agriculture: "🌾 农业时代",
                      industrial: "🏭 工业时代", information: "💻 信息时代", interstellar: "⭐ 星际文明",
                    };
                    const collapsedCiv = state.civilizations.find(c => c.speciesId === s.id && c.stage === "collapsed");
                    return (
                      <div className="mt-2 pt-2 border-t border-[#1a1a2e]">
                        <span className="text-[10px] text-[#64b5f6]">
                          {civ ? stageLabels[civ.stage] || civ.stage : ""}
                        </span>
                        {collapsedCiv && (
                          <span className="text-[10px] text-red-400 ml-2">💀 文明崩塌</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}
              {extinctSpecies.map((s) => (
                <div key={s.id} className="p-3 rounded-lg border border-[#1a1a2e] opacity-40">
                  <span className="text-sm text-gray-500 line-through">
                    {s.emoji} {s.name}
                  </span>
                  <span className="text-xs text-red-400 ml-2">灭绝</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 种群趋势图 + 互动 */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* 简易趋势图 */}
          {state.timeline.length > 0 && (
            <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
              <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">种群趋势</h3>
              <div className="relative h-40">
                <PopulationChart
                  timeline={state.timeline}
                  species={state.species}
                />
              </div>
            </div>
          )}

          {/* 食物链 */}
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
                        {ix.type === "predation"
                          ? "→ 捕食 →"
                          : ix.type === "competition"
                          ? "↔ 竞争 ↔"
                          : ix.type === "symbiosis"
                          ? "⇄ 共生 ⇄"
                          : "→ 分解 →"}
                      </span>
                      <span className="text-white">{b?.emoji} {b?.name || ix.speciesB}</span>
                      <span className="text-gray-600">({Math.round(ix.intensity * 100)}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 时代叙事 */}
          {state.timeline.length > 0 && (
            <div className="flex-1 bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4 overflow-y-auto">
              <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">
                纪元史书
              </h3>
              <div className="space-y-3">
                {state.timeline.map((epoch) => (
                  <div key={epoch.epochNumber} className="text-sm">
                    <div className="text-xs text-gray-600 mb-1">
                      — 第{epoch.epochNumber}纪元 —
                    </div>
                    <p className="text-gray-300 leading-relaxed">{epoch.narrative}</p>
                    {epoch.notableEvents.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {epoch.notableEvents.map((ev, i) => {
                          const isDisaster = ["陨石", "冰河", "瘟疫", "耀斑", "灾难", "灭绝"].some(k => ev.includes(k));
                          return (
                            <span
                              key={i}
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                isDisaster
                                  ? "bg-red-400/10 text-red-400"
                                  : "bg-[#64b5f6]/10 text-[#64b5f6]"
                              }`}
                            >
                              {ev}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
                {state.isSimulating && (
                  <div className="text-sm text-gray-600 italic">
                    <span className="cursor-blink text-[#64b5f6]">演化进行中</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4 flex items-center gap-4">
        <button
          onClick={advanceEpoch}
          disabled={state.isSimulating}
          className="px-6 py-2.5 rounded-lg bg-[#64b5f6]/20 border border-[#64b5f6]/40 text-[#64b5f6]
                   hover:bg-[#64b5f6]/30 transition-colors disabled:opacity-50 font-bold text-sm"
        >
          {state.isSimulating ? "⏳ 演化中..." : "⏭ 推进时代"}
        </button>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <label>🌡 温度</label>
            <input
              type="range"
              min="-20"
              max="60"
              value={state.environment.temperature}
              onChange={(e) => updateEnvironment({ temperature: Number(e.target.value) })}
              className="w-24"
            />
            <span>{state.environment.temperature}°C</span>
          </div>
          <div className="flex items-center gap-2">
            <label>💧 水域</label>
            <input
              type="range"
              min="0"
              max="100"
              value={state.environment.waterCoverage}
              onChange={(e) => updateEnvironment({ waterCoverage: Number(e.target.value) })}
              className="w-24"
            />
            <span>{state.environment.waterCoverage}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 简易 SVG 种群趋势图
function PopulationChart({
  timeline,
  species,
}: {
  timeline: XenogenesisState["timeline"];
  species: XenogenesisState["species"];
}) {
  const aliveSpecies = Object.values(species).filter((s) => s.status !== "extinct");
  if (aliveSpecies.length === 0) return null;

  // 计算每个物种在每个纪元的累计种群
  const populationsByEpoch: Record<string, number[]> = {};
  let maxPop = 50;

  for (const s of aliveSpecies) {
    const pops: number[] = [];
    let current = 100; // initial population
    for (const epoch of timeline) {
      current += epoch.populationChanges[s.id] ?? 0;
      current = Math.max(0, current);
      pops.push(current);
    }
    populationsByEpoch[s.id] = pops;
    maxPop = Math.max(maxPop, ...pops);
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
        <line
          key={pct}
          x1={pad.left}
          y1={pad.top + chartH * (1 - pct)}
          x2={width - pad.right}
          y2={pad.top + chartH * (1 - pct)}
          stroke="#1a1a2e"
          strokeWidth="1"
        />
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

        return (
          <g key={s.id}>
            <polyline points={points} fill="none" stroke={s.color} strokeWidth="2" />
            {pops.map((pop, i) => {
              const x = pad.left + (i / Math.max(epochs - 1, 1)) * chartW;
              const y = pad.top + chartH * (1 - pop / maxPop);
              return (
                <circle key={i} cx={x} cy={y} r="2.5" fill={s.color}>
                  <title>{`${s.name} 纪元${i + 1}: ${Math.round(pop)}`}</title>
                </circle>
              );
            })}
          </g>
        );
      })}
      {aliveSpecies.map((s, i) => (
        <text key={s.id} x={pad.left + i * 85} y={height - 3} fill={s.color} fontSize="9">
          {s.emoji} {s.name}
        </text>
      ))}
    </svg>
  );
}

