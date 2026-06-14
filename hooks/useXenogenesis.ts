"use client";

import { useReducer, useCallback } from "react";
import type {
  XenogenesisStateV2,
  SpeciesDesign,
  ArchivedGene,
  DisasterWarning,
  SpeciesDef,
  SpeciesIndividual,
} from "@/lib/types";
import {
  createIndividuals,
  runTick,
  runTickStatistical,
  TICKS_PER_EPOCH,
  MAX_INDIVIDUALS,
} from "@/lib/behavior-engine";
import { generatePlanet } from "@/lib/planet-generator";

// ---- Action types ----

type Action =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string }
  | { type: "SET_ENVIRONMENT"; payload: Partial<XenogenesisStateV2["environment"]> }
  | { type: "SET_PLANET_NAME"; payload: string }
  | { type: "RESET" }
  | { type: "START_EPOCH" }
  | {
      type: "ADVANCE_TICK";
      payload: {
        tick: number;
        individuals: SpeciesIndividual[];
        populationChanges: Record<string, number>;
        extinctions: string[];
      };
    }
  | { type: "END_EPOCH"; payload: { narrative: string } }
  | { type: "ADD_SPECIES"; payload: SpeciesDesign }
  | {
      type: "USE_INTERVENTION";
      payload: { cost: number; effects: Partial<XenogenesisStateV2> };
    }
  | { type: "ARCHIVE_GENE"; payload: ArchivedGene };

// ---- Constants ----

const DEFAULT_ENVIRONMENT = {
  temperature: 22,
  oxygenLevel: 21,
  waterCoverage: 65,
  terrainTypes: ["ocean", "forest", "grassland"],
  activeDisasters: [],
};

const SPECIES_COLORS = ["#00ff88", "#ff6b9d", "#64b5f6", "#ffaa00", "#bb66ff", "#ff6644"];
const SPECIES_EMOJIS: Record<string, string> = {
  plant: "🌱",
  herbivore: "🐑",
  carnivore: "🐺",
  omnivore: "🐻",
  decomposer: "🍄",
};

const INTERVENTIONS: Record<
  string,
  { cost: number; label: string; description: string }
> = {
  warm_climate: {
    cost: 2,
    label: "气候变暖",
    description: "提高全球温度2度，可能使寒带物种受益",
  },
  cool_climate: {
    cost: 2,
    label: "气候降温",
    description: "降低全球温度2度，可能使热带物种受益",
  },
  boost_oxygen: {
    cost: 1,
    label: "增氧",
    description: "提高大气氧气含量3%",
  },
  terraform_forest: {
    cost: 3,
    label: "造林",
    description: "将部分草原和沙漠转化为森林",
  },
  mass_breeding: {
    cost: 4,
    label: "促进繁殖",
    description: "所有存活物种获得繁殖buff，种群增长20%",
  },
  genetic_stabilize: {
    cost: 2,
    label: "基因稳定",
    description: "减少种群波动，避免濒危物种灭绝",
  },
  meteor_shield: {
    cost: 5,
    label: "陨石护盾",
    description: "大幅降低陨石撞击概率",
  },
  plague_cure: {
    cost: 3,
    label: "瘟疫解药",
    description: "治愈受影响物种，恢复种群健康",
  },
};

// ---- Module-level state (reset on RESET) ----

let colorIdx = 0;
let speciesCounter = 0;

// ---- Helpers ----

function generateSeed(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let seed = "";
  for (let i = 0; i < 6; i++)
    seed += chars[Math.floor(Math.random() * chars.length)];
  return seed;
}

function createInitialState(): XenogenesisStateV2 {
  colorIdx = 0;
  speciesCounter = 0;
  const seed = generateSeed();
  const planetTiles = generatePlanet({
    width: 20,
    height: 12,
    seed,
    waterCoverage: 65,
    globalTemperature: 22,
  });

  return {
    planetName: "曙光星",
    environment: { ...DEFAULT_ENVIRONMENT },
    species: {},
    epoch: 0,
    timeline: [],
    isSimulating: false,
    disasters: [],
    civilizations: [],
    achievements: [],
    seed,
    // V2 fields
    planetTiles,
    individuals: [],
    interventionTokens: 10,
    maxInterventionTokens: 10,
    disasterWarnings: [],
    speciesLab: {
      candidates: [],
      bioEnergy: 100,
      maxBioEnergy: 100,
      bioEnergyRegen: 25,
      geneBank: [],
    },
    isEpochRunning: false,
    currentTick: 0,
    totalTicks: TICKS_PER_EPOCH,
  };
}

function generateWarnings(state: XenogenesisStateV2): DisasterWarning[] {
  const warnings: DisasterWarning[] = [];
  const epoch = state.epoch;
  const baseProb = Math.min(60, 5 + epoch * 3);
  const unstableFactor = Object.values(state.species).filter(
    (s) => s.status === "declining"
  ).length;
  const diversityFactor = Math.max(
    0,
    5 - Object.values(state.species).filter((s) => s.status !== "extinct").length
  );

  const meteorProb = Math.min(85, baseProb + diversityFactor * 5);
  const plagueProb = Math.min(85, baseProb + unstableFactor * 10);
  const iceAgeProb = Math.min(
    60,
    baseProb - 10 + Math.abs(state.environment.temperature - 22) * 2
  );
  const solarFlareProb = Math.min(40, baseProb - 20);

  if (meteorProb > 20)
    warnings.push({
      type: "meteor",
      probability: Math.round(meteorProb),
      description: "陨石撞击威胁",
      suggestion: "保护高价值物种",
    });
  if (plagueProb > 25)
    warnings.push({
      type: "plague",
      probability: Math.round(plagueProb),
      description: "瘟疫爆发风险",
      suggestion: "提高物种防御特征",
    });
  if (iceAgeProb > 30)
    warnings.push({
      type: "ice_age",
      probability: Math.round(iceAgeProb),
      description: "冰河期可能来临",
      suggestion: "提高物种适应能力",
    });
  if (solarFlareProb > 35)
    warnings.push({
      type: "solar_flare",
      probability: Math.round(solarFlareProb),
      description: "太阳耀斑警报",
      suggestion: "确保种群多样性",
    });

  return warnings;
}

function checkAchievements(state: XenogenesisStateV2): string[] {
  const newAch = [...state.achievements];
  const alive = Object.values(state.species).filter(
    (s) => s.status !== "extinct"
  );
  const extinct = Object.values(state.species).filter(
    (s) => s.status === "extinct"
  );

  if (extinct.length >= 1 && !newAch.includes("first_extinction"))
    newAch.push("first_extinction");
  if (state.epoch >= 10 && extinct.length === 0 && !newAch.includes("perfect_balance"))
    newAch.push("perfect_balance");
  if (alive.length >= 6 && !newAch.includes("diverse_world"))
    newAch.push("diverse_world");
  if (state.epoch >= 10 && !newAch.includes("ten_epochs"))
    newAch.push("ten_epochs");

  return newAch;
}

// ---- Reducer ----

function reducer(
  state: XenogenesisStateV2,
  action: Action
): XenogenesisStateV2 {
  switch (action.type) {
    // --- Kept from v1 ---
    case "SET_LOADING":
      return { ...state, isSimulating: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload, isSimulating: false };

    case "SET_ENVIRONMENT":
      return {
        ...state,
        environment: { ...state.environment, ...action.payload },
      };

    case "SET_PLANET_NAME":
      return { ...state, planetName: action.payload };

    case "RESET":
      return createInitialState();

    // --- New v2 actions ---

    case "START_EPOCH": {
      return {
        ...state,
        isEpochRunning: true,
        currentTick: 0,
        isSimulating: false,
        disasterWarnings: generateWarnings(state),
        error: undefined,
      };
    }

    case "ADVANCE_TICK": {
      const { tick, individuals, populationChanges, extinctions } = action.payload;
      const newSpecies = { ...state.species };
      const newGeneBank = [...state.speciesLab.geneBank];

      // Update species populations from tick result
      for (const [speciesId, delta] of Object.entries(populationChanges)) {
        if (newSpecies[speciesId]) {
          const newPop = Math.max(0, newSpecies[speciesId].population + delta);
          let status = newSpecies[speciesId].status;
          if (newPop <= 0) {
            status = "extinct";
          } else if (newPop < 20) {
            status = "endangered";
          } else if (delta > 0 && newPop > 100) {
            status = "thriving";
          } else if (delta < -5) {
            status = "declining";
          }
          newSpecies[speciesId] = {
            ...newSpecies[speciesId],
            population: newPop,
            status,
          };
        }
      }

      // Handle extinctions — auto-archive genes
      for (const speciesId of extinctions) {
        if (newSpecies[speciesId]) {
          newSpecies[speciesId] = {
            ...newSpecies[speciesId],
            status: "extinct",
            population: 0,
          };

          const species = state.species[speciesId];
          if (species && !newGeneBank.some((g) => g.id === speciesId)) {
            newGeneBank.push({
              id: speciesId,
              speciesName: species.name,
              epochExtinct: state.epoch,
              traits: { ...species.traits },
              specialAbility: species.traits.specialAbility,
              extinctionCause: "自然灭绝",
            });
          }
        }
      }

      return {
        ...state,
        currentTick: tick,
        individuals,
        species: newSpecies,
        speciesLab: { ...state.speciesLab, geneBank: newGeneBank },
      };
    }

    case "END_EPOCH": {
      const newEpoch = state.epoch + 1;
      const newBioEnergy = Math.min(
        state.speciesLab.maxBioEnergy,
        state.speciesLab.bioEnergy + state.speciesLab.bioEnergyRegen
      );

      const nextState: XenogenesisStateV2 = {
        ...state,
        epoch: newEpoch,
        isEpochRunning: false,
        currentTick: 0,
        isSimulating: false,
        individuals: [],
        speciesLab: {
          ...state.speciesLab,
          bioEnergy: newBioEnergy,
        },
        timeline: [
          ...state.timeline,
          {
            epochNumber: newEpoch,
            narrative: action.payload.narrative,
            populationChanges: {},
            notableEvents: [],
            environmentChanges: {},
            interactions: [],
          },
        ],
      };

      return {
        ...nextState,
        achievements: checkAchievements(nextState),
      };
    }

    case "ADD_SPECIES": {
      speciesCounter++;
      const id = `species_${speciesCounter}`;
      const color = SPECIES_COLORS[colorIdx % SPECIES_COLORS.length];
      colorIdx++;
      const emoji = SPECIES_EMOJIS[action.payload.type] || "❓";
      const initialPop = 100;

      const speciesDef: SpeciesDef = {
        id,
        name: action.payload.name,
        type: action.payload.type,
        traits: { ...action.payload.traits },
        population: initialPop,
        status: "stable",
        epochCreated: state.epoch,
        emoji,
        color,
      };

      const newIndividuals = createIndividuals(
        speciesDef,
        initialPop,
        state.planetTiles
      );

      return {
        ...state,
        species: {
          ...state.species,
          [id]: speciesDef,
        },
        individuals: [...state.individuals, ...newIndividuals],
      };
    }

    case "USE_INTERVENTION": {
      const { cost, effects } = action.payload;

      const next: XenogenesisStateV2 = {
        ...state,
        interventionTokens: state.interventionTokens - cost,
      };

      // Deep-merge nested objects from effects
      if (effects.environment) {
        next.environment = { ...state.environment, ...effects.environment };
      }
      if (effects.species) {
        next.species = { ...state.species, ...effects.species };
      }
      if (effects.speciesLab) {
        next.speciesLab = { ...state.speciesLab, ...effects.speciesLab };
      }
      if (effects.planetTiles) {
        next.planetTiles = effects.planetTiles;
      }
      if (effects.individuals !== undefined) {
        next.individuals = effects.individuals;
      }
      if (effects.disasterWarnings !== undefined) {
        next.disasterWarnings = effects.disasterWarnings;
      }

      return next;
    }

    case "ARCHIVE_GENE": {
      return {
        ...state,
        speciesLab: {
          ...state.speciesLab,
          geneBank: [...state.speciesLab.geneBank, action.payload],
        },
      };
    }

    default:
      return state;
  }
}

// ---- Hook ----

export function useXenogenesisV2() {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);

  // Advance one tick of the behavior engine.
  const advanceTick = useCallback(() => {
    if (!state.isEpochRunning) return;
    if (state.currentTick >= state.totalTicks) return;

    const nextTick = state.currentTick + 1;
    const useStatistical = state.individuals.length > MAX_INDIVIDUALS;

    const result = useStatistical
      ? runTickStatistical(state, nextTick)
      : runTick(state, nextTick);

    dispatch({
      type: "ADVANCE_TICK",
      payload: {
        tick: nextTick,
        individuals: result.individuals,
        populationChanges: result.populationChanges,
        extinctions: result.extinctions,
      },
    });
  }, [state]);

  // Start a new epoch: generate disaster warnings, set isEpochRunning.
  const startEpoch = useCallback(() => {
    dispatch({ type: "START_EPOCH" });
  }, []);

  // End the current epoch. Fetches AI narrative every 3–5 epochs.
  const endEpoch = useCallback(async () => {
    const nextEpoch = state.epoch + 1;
    const shouldFetchNarrative = nextEpoch > 1 && nextEpoch % 3 === 0;
    let narrative = `纪元 ${nextEpoch} 结束 — 生命在星球上继续演化`;

    if (shouldFetchNarrative) {
      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const res = await fetch("/api/xenogenesis/narrative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameState: state }),
        });
        if (res.ok) {
          const data = await res.json();
          narrative = data.narrative || narrative;
        }
      } catch {
        // Fall back to default narrative
      }
      dispatch({ type: "SET_LOADING", payload: false });
    }

    dispatch({ type: "END_EPOCH", payload: { narrative } });
  }, [state]);

  // Add a new species design to the planet (creates individuals via behavior engine).
  const addSpecies = useCallback(
    (design: SpeciesDesign) => {
      dispatch({ type: "ADD_SPECIES", payload: design });
    },
    []
  );

  // Spend intervention tokens to apply an effect.
  const useIntervention = useCallback(
    (actionId: string) => {
      const intervention = INTERVENTIONS[actionId];
      if (!intervention) return;
      if (state.interventionTokens < intervention.cost) return;

      let effects: Partial<XenogenesisStateV2> = {};

      switch (actionId) {
        case "warm_climate":
          effects = {
            environment: {
              ...state.environment,
              temperature: Math.min(
                60,
                state.environment.temperature + 2
              ),
            },
          };
          break;
        case "cool_climate":
          effects = {
            environment: {
              ...state.environment,
              temperature: Math.max(
                -20,
                state.environment.temperature - 2
              ),
            },
          };
          break;
        case "boost_oxygen":
          effects = {
            environment: {
              ...state.environment,
              oxygenLevel: Math.min(
                100,
                state.environment.oxygenLevel + 3
              ),
            },
          };
          break;
        case "terraform_forest": {
          const newTiles = state.planetTiles.map((row) =>
            row.map((tile) => {
              if (
                (tile.terrain === "grassland" || tile.terrain === "desert") &&
                Math.random() < 0.3
              ) {
                return {
                  ...tile,
                  terrain: "forest" as const,
                  resources: {
                    food: 8,
                    water: 7,
                    shelter: 7,
                  },
                };
              }
              return tile;
            })
          );
          effects = { planetTiles: newTiles };
          break;
        }
        case "mass_breeding": {
          const boostedSpecies: Record<string, SpeciesDef> = {};
          for (const [key, s] of Object.entries(state.species)) {
            if (s.status !== "extinct") {
              boostedSpecies[key] = {
                ...s,
                population: Math.round(s.population * 1.2),
              };
            } else {
              boostedSpecies[key] = s;
            }
          }
          effects = { species: boostedSpecies };
          break;
        }
        case "genetic_stabilize": {
          const stabilizedSpecies: Record<string, SpeciesDef> = {};
          for (const [key, s] of Object.entries(state.species)) {
            if (s.status === "declining" || s.status === "endangered") {
              stabilizedSpecies[key] = {
                ...s,
                status: "stable" as const,
              };
            } else {
              stabilizedSpecies[key] = s;
            }
          }
          effects = { species: stabilizedSpecies };
          break;
        }
        case "meteor_shield":
          effects = {
            disasterWarnings: state.disasterWarnings.filter(
              (w) => w.type !== "meteor"
            ),
          };
          break;
        case "plague_cure": {
          const curedSpecies: Record<string, SpeciesDef> = {};
          for (const [key, s] of Object.entries(state.species)) {
            if (s.status === "declining" || s.status === "endangered") {
              curedSpecies[key] = {
                ...s,
                population: Math.round(s.population * 1.5),
                status: "stable" as const,
              };
            } else {
              curedSpecies[key] = s;
            }
          }
          effects = { species: curedSpecies };
          break;
        }
      }

      dispatch({
        type: "USE_INTERVENTION",
        payload: { cost: intervention.cost, effects },
      });
    },
    [state]
  );

  const updateEnvironment = useCallback(
    (env: Partial<XenogenesisStateV2["environment"]>) => {
      dispatch({ type: "SET_ENVIRONMENT", payload: env });
    },
    []
  );

  const resetGame = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    state,
    advanceTick,
    startEpoch,
    endEpoch,
    addSpecies,
    useIntervention,
    updateEnvironment,
    resetGame,
    error: (state as XenogenesisStateV2 & { error?: string }).error || "",
  };
}
