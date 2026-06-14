"use client";

import { useState } from "react";
import type { SpeciesTraits, SpeciesDef, SpeciesDesign, ArchivedGene, SpeciesLabState } from "@/lib/types";

type TraitKey = "size" | "metabolism" | "reproduction" | "intelligence" | "defense" | "adaptability";

const TRAIT_LABELS: Record<TraitKey, string> = {
  size: "体型", metabolism: "代谢", reproduction: "繁殖",
  intelligence: "智力", defense: "防御", adaptability: "适应",
};

interface SpeciesLabProps {
  lab: SpeciesLabState;
  existingSpecies: Record<string, SpeciesDef>;
  environment: { temperature: number; oxygenLevel: number; waterCoverage: number };
  onCreateSpecies: (design: SpeciesDesign) => void;
  onClose: () => void;
}

export function SpeciesLab({ lab, existingSpecies, environment, onCreateSpecies, onClose }: SpeciesLabProps) {
  const [candidates, setCandidates] = useState<SpeciesDesign[]>([...lab.candidates]);
  const [name, setName] = useState("");
  const [type, setType] = useState<SpeciesDef["type"]>("herbivore");
  const [traits, setTraits] = useState<SpeciesTraits>({
    size: 5, metabolism: 5, reproduction: 5,
    intelligence: 3, defense: 3, adaptability: 5,
  });
  const [geneSource, setGeneSource] = useState<string | null>(null);
  const [tab, setTab] = useState<"create" | "candidates" | "geneBank">("create");

  const predictedScore = calculatePredictedScore(traits, type, environment);
  const synergies = findSynergies(type, traits, existingSpecies);
  const risks = findRisks(type, traits, environment, existingSpecies);

  const handleAddCandidate = () => {
    if (!name.trim()) return;
    const design: SpeciesDesign = {
      name: name.trim(), type, traits: { ...traits },
      predictedScore, foodChainPosition: getFoodChainPosition(type, existingSpecies),
      synergyWithExisting: synergies, riskFactors: risks,
    };
    setCandidates(prev => [...prev, design].slice(0, 3));
    setName("");
  };

  const handleCreate = (design: SpeciesDesign) => {
    if (lab.bioEnergy < 20) return;
    onCreateSpecies(design);
    setCandidates(prev => prev.filter(d => d !== design));
  };

  const handleLoadGene = (gene: ArchivedGene) => {
    setTraits({ ...gene.traits });
    setGeneSource(gene.speciesName);
  };

  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">🧬 物种实验室</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">⚡ 生物能量: {lab.bioEnergy}/{lab.maxBioEnergy}</span>
          <button onClick={onClose} className="text-xs text-gray-600 hover:text-white">[关闭]</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 border-b border-[#2a2a4a] pb-2">
        {(["create", "candidates", "geneBank"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-xs px-3 py-1 rounded-t ${tab === t ? "bg-[#1a1a2e] text-[#64b5f6]" : "text-gray-500 hover:text-white"}`}>
            {t === "create" ? "🔬 设计" : t === "candidates" ? `📋 候选 (${candidates.length})` : `🧬 基因库 (${lab.geneBank.length})`}
          </button>
        ))}
      </div>

      {tab === "create" && (
        <div className="space-y-4">
          <div className="flex gap-4 flex-wrap items-end">
            <div>
              <label className="text-xs text-gray-500 block mb-1">物种名</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-32 px-3 py-1.5 rounded bg-[#0a0a1a] border border-[#2a2a4a] text-sm text-white" placeholder="如：鳞行者" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">类型</label>
              <select value={type} onChange={(e) => setType(e.target.value as SpeciesDef["type"])}
                className="px-3 py-1.5 rounded bg-[#0a0a1a] border border-[#2a2a4a] text-sm text-white">
                <option value="plant">🌱 植物</option>
                <option value="herbivore">🐑 草食</option>
                <option value="carnivore">🐺 肉食</option>
                <option value="omnivore">🐻 杂食</option>
                <option value="decomposer">🍄 分解者</option>
              </select>
            </div>
            {geneSource && <span className="text-xs text-[#64b5f6]">基于: {geneSource} 的基因</span>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(TRAIT_LABELS) as TraitKey[]).map((key) => (
              <div key={key}>
                <label className="text-xs text-gray-500 block mb-1">{TRAIT_LABELS[key]} ({traits[key]})</label>
                <input type="range" min="1" max="10" value={traits[key]}
                  onChange={(e) => setTraits(t => ({ ...t, [key]: Number(e.target.value) }))}
                  className="w-full" />
              </div>
            ))}
          </div>

          <div className="bg-[#1a1a2e] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">适应性预测</span>
              <span className={`text-sm font-bold ${predictedScore > 70 ? "text-green-400" : predictedScore > 40 ? "text-yellow-400" : "text-red-400"}`}>{predictedScore}/100</span>
            </div>
            {synergies.length > 0 && <div className="text-xs text-green-400/60">✓ {synergies.join("; ")}</div>}
            {risks.length > 0 && <div className="text-xs text-red-400/60">⚠ {risks.join("; ")}</div>}
          </div>

          <div className="flex gap-2">
            <button onClick={handleAddCandidate} disabled={!name.trim() || candidates.length >= 3}
              className="px-4 py-1.5 rounded bg-[#64b5f6]/20 border border-[#64b5f6]/40 text-[#64b5f6] text-xs hover:bg-[#64b5f6]/30 disabled:opacity-30">
              加入候选 ({candidates.length}/3)
            </button>
            {candidates.length > 0 && (
              <button onClick={() => handleCreate(candidates[0])} disabled={lab.bioEnergy < 20}
                className="px-4 py-1.5 rounded bg-[#00ff88]/20 border border-[#00ff88]/40 text-[#00ff88] text-xs hover:bg-[#00ff88]/30 disabled:opacity-30">
                投放 (消耗 20 能量)
              </button>
            )}
          </div>
        </div>
      )}

      {tab === "candidates" && (
        <div className="space-y-2">
          {candidates.length === 0 ? (
            <p className="text-xs text-gray-600">暂无候选物种。在"设计"标签创建。</p>
          ) : candidates.map((c, i) => (
            <div key={i} className="p-3 rounded-lg border border-[#2a2a4a]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white font-bold">{c.name}</span>
                <span className="text-xs text-gray-500">{c.type} | 评分: {c.predictedScore}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {Object.entries(c.traits).filter(([k]) => k !== "specialAbility").map(([k, v]) => (
                  <span key={k} className="text-[10px] px-1 py-0.5 rounded bg-[#1a1a2e] text-gray-400">{TRAIT_LABELS[k as TraitKey] || k}:{v}</span>
                ))}
              </div>
              {c.riskFactors.length > 0 && <p className="text-[10px] text-red-400/60 mt-1">⚠ {c.riskFactors.join(", ")}</p>}
              <button onClick={() => handleCreate(c)} disabled={lab.bioEnergy < 20}
                className="mt-2 px-3 py-1 rounded bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] text-[10px] hover:bg-[#00ff88]/20 disabled:opacity-30">
                投放此物种
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "geneBank" && (
        <div className="space-y-2">
          {lab.geneBank.length === 0 ? (
            <p className="text-xs text-gray-600">基因库为空。物种灭绝后其基因会自动存档。</p>
          ) : lab.geneBank.map((gene) => (
            <div key={gene.id} className="p-3 rounded-lg border border-[#2a2a4a] opacity-60 hover:opacity-100 transition-opacity">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400 line-through">{gene.speciesName}</span>
                <span className="text-xs text-red-400">灭绝于纪元{gene.epochExtinct}</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">死因: {gene.extinctionCause}</p>
              <button onClick={() => handleLoadGene(gene)}
                className="mt-2 px-3 py-1 rounded bg-[#bb66ff]/10 border border-[#bb66ff]/30 text-[#bb66ff] text-[10px] hover:bg-[#bb66ff]/20">
                以此基因为基础创建
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Prediction helpers ----

function calculatePredictedScore(traits: SpeciesTraits, type: SpeciesDef["type"], env: { temperature: number; oxygenLevel: number; waterCoverage: number }): number {
  let score = 50;
  const traitValues = Object.values(traits).filter(v => typeof v === "number") as number[];
  const avg = traitValues.reduce((a, b) => a + b, 0) / traitValues.length;
  const variance = traitValues.reduce((sum, v) => sum + (v - avg) ** 2, 0) / traitValues.length;
  score -= variance * 2;
  if (type === "plant") score += traits.adaptability * 2;
  if (type === "carnivore") score += (traits.intelligence + traits.size) * 0.5;
  if (type === "herbivore") score += traits.reproduction * 0.5;
  if (type === "decomposer") score += traits.metabolism * 0.5;
  if (env.oxygenLevel < 15) score -= 10;
  if (env.temperature > 40 || env.temperature < 0) score -= 15;
  return Math.round(Math.max(5, Math.min(95, score)));
}

function findSynergies(type: SpeciesDef["type"], traits: SpeciesTraits, existing: Record<string, SpeciesDef>): string[] {
  const result: string[] = [];
  const existingTypes = new Set(Object.values(existing).map(s => s.type));
  if (type === "decomposer" && !existingTypes.has("decomposer")) result.push("提供分解服务，完善营养循环");
  if (type === "plant" && existingTypes.has("herbivore")) result.push("为现有草食动物提供食物");
  if (type === "carnivore" && existingTypes.has("herbivore")) result.push("可控制草食物种数量");
  return result;
}

function findRisks(type: SpeciesDef["type"], traits: SpeciesTraits, env: { temperature: number; oxygenLevel: number; waterCoverage: number }, existing: Record<string, SpeciesDef>): string[] {
  const result: string[] = [];
  if (traits.metabolism > 8 && traits.reproduction < 3) result.push("高代谢低繁殖可能导致灭绝");
  if (traits.size < 3 && traits.defense < 4) result.push("脆弱易被捕食");
  if (type === "carnivore" && !Object.values(existing).some(s => s.type === "herbivore")) result.push("没有猎物物种");
  if (env.oxygenLevel < 12) result.push("低氧环境压力");
  if (env.temperature > 45 || env.temperature < -10) result.push("极端温度威胁");
  return result;
}

function getFoodChainPosition(type: SpeciesDef["type"], existing: Record<string, SpeciesDef>): number {
  switch (type) {
    case "plant": case "decomposer": return 1;
    case "herbivore": return 2;
    case "omnivore": return 3;
    case "carnivore": return Object.values(existing).some(s => s.type === "carnivore") ? 4 : 3;
    default: return 2;
  }
}
