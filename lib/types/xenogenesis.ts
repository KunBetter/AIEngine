// ============================================================
// 异星造物主 (Xenogenesis)
// ============================================================

export interface SpeciesTraits {
  size: number;
  metabolism: number;
  reproduction: number;
  intelligence: number;
  defense: number;
  adaptability: number;
  specialAbility?: string;
}

export interface SpeciesDef {
  id: string;
  name: string;
  type: "plant" | "herbivore" | "carnivore" | "omnivore" | "decomposer";
  traits: SpeciesTraits;
  population: number;
  status: "thriving" | "stable" | "declining" | "endangered" | "extinct";
  epochCreated: number;
  emoji: string;
  color: string;
}

export interface EnvironmentState {
  temperature: number;
  oxygenLevel: number;
  waterCoverage: number;
  terrainTypes: string[];
  activeDisasters: string[];
}

export interface EpochRecord {
  epochNumber: number;
  narrative: string;
  populationChanges: Record<string, number>;
  notableEvents: string[];
  environmentChanges: Partial<EnvironmentState>;
  interactions: SpeciesInteraction[];
}

export interface SpeciesInteraction {
  type: "predation" | "competition" | "symbiosis" | "decomposition";
  speciesA: string;
  speciesB: string;
  intensity: number;
  description: string;
}

export interface XenogenesisState {
  planetName: string;
  environment: EnvironmentState;
  species: Record<string, SpeciesDef>;
  epoch: number;
  timeline: EpochRecord[];
  isSimulating: boolean;
  disasters: DisasterEvent[];
  civilizations: Civilization[];
  achievements: string[];
  seed: string;
  error?: string;
}

export interface DisasterEvent {
  epoch: number;
  type: "meteor" | "ice_age" | "plague" | "solar_flare";
  name: string;
  description: string;
  effects: {
    temperature?: number;
    oxygenLevel?: number;
    waterCoverage?: number;
    massExtinction?: boolean;
  };
}

export interface Civilization {
  speciesId: string;
  speciesName: string;
  stage: "tools" | "tribal" | "agriculture" | "industrial" | "information" | "interstellar" | "collapsed";
  epochAwakened: number;
  history: string[];
}

export const ACHIEVEMENTS: Record<string, string> = {
  first_extinction: "💀 第一个灭绝: 见证一个物种的消亡",
  perfect_balance: "☯ 完美平衡: 10纪元内无物种灭绝",
  creator_mistake: "🤦 造物主的失误: 自己创建的物种灭绝",
  unexpected_genius: "🧠 意外的智慧: 最低智力(≤3)的物种觉醒文明",
  mass_extinction: "🌋 大灭绝: 一次灾难导致3个以上物种灭绝",
  interstellar: "🚀 星际文明: 一个文明达到星际阶段",
  ten_epochs: "📅 十年纪元: 完成10个纪元",
  apex_predator: "🦁 顶级掠食者: 肉食物种数量超过所有其他物种总和",
  resurrection: "🔄 物种复活: 灭绝物种的后代重新出现",
  perfect_food_chain: "🔗 完美食物链: 生态系统包含全部5种类型",
  disaster_survivor: "🏋 灾难幸存者: 在重大灾难后生态系统恢复",
  lonely_planet: "🪐 孤独星球: 5纪元内只有1个物种存活",
  diverse_world: "🌈 多样世界: 同时存在6个或以上物种",
  creator_hand: "✋ 造物主之手: 手动触发一次灾难",
  long_civilization: "🏛 长寿文明: 一个文明持续5个纪元以上",
};

export interface SpeciesUpdate {
  id: string;
  populationDelta: number;
  newPopulation: number;
  status: SpeciesDef["status"];
  reasoning: string;
}

export interface MutationEvent {
  speciesId: string;
  mutationName: string;
  description: string;
  effect: Partial<SpeciesTraits>;
}

export interface XenogenesisAIResponse {
  epoch: number;
  speciesUpdates: SpeciesUpdate[];
  newMutations: MutationEvent[];
  interactions: SpeciesInteraction[];
  environmentChange: Partial<EnvironmentState> & { cause?: string };
  narrative: string;
  extinctions: string[];
  notableEvents: string[];
  newDisaster?: {
    type: "meteor" | "ice_age" | "plague" | "solar_flare";
    name: string;
    description: string;
    effects: {
      temperature?: number;
      oxygenLevel?: number;
      waterCoverage?: number;
      massExtinction?: boolean;
    };
  };
  civilizationUpdate?: {
    speciesId: string;
    stage: "tools" | "tribal" | "agriculture" | "industrial" | "information" | "interstellar" | "collapsed";
    event: string;
  };
}

// ---- v2 ----

export type TerrainType = "ocean" | "coast" | "forest" | "grassland" | "desert" | "mountain" | "volcano" | "tundra";

export interface PlanetTile {
  x: number;
  y: number;
  terrain: TerrainType;
  resources: { food: number; water: number; shelter: number };
  temperatureMod: number;
  special?: "geothermal" | "fertile" | "toxic" | "radioactive";
  occupantIds: string[];
}

export interface SpeciesIndividual {
  id: string;
  speciesId: string;
  x: number;
  y: number;
  hunger: number;
  health: number;
  age: number;
  state: BehaviorState;
}

export type BehaviorState =
  | "idle"
  | "foraging"
  | "hunting"
  | "fleeing"
  | "mating"
  | "resting"
  | "migrating"
  | "dying";

export interface TickResult {
  tick: number;
  individuals: SpeciesIndividual[];
  events: TickEvent[];
  populationChanges: Record<string, number>;
  extinctions: string[];
}

export interface TickEvent {
  type: "predation" | "birth" | "death" | "mutation" | "migration" | "starvation" | "disaster";
  description: string;
  speciesId?: string;
  individualId?: string;
  location?: { x: number; y: number };
}

export interface InterventionAction {
  id: string;
  label: string;
  description: string;
  cost: number;
  targetType: "species" | "tile" | "global";
  apply: (state: XenogenesisStateV2) => XenogenesisStateV2;
}

export interface XenogenesisStateV2 extends XenogenesisState {
  planetTiles: PlanetTile[][];
  individuals: SpeciesIndividual[];
  interventionTokens: number;
  maxInterventionTokens: number;
  disasterWarnings: DisasterWarning[];
  speciesLab: SpeciesLabState;
  isEpochRunning: boolean;
  currentTick: number;
  totalTicks: number;
}

export interface DisasterWarning {
  type: "meteor" | "ice_age" | "plague" | "solar_flare";
  probability: number;
  description: string;
  suggestion: string;
}

export interface SpeciesLabState {
  candidates: SpeciesDesign[];
  bioEnergy: number;
  maxBioEnergy: number;
  bioEnergyRegen: number;
  geneBank: ArchivedGene[];
}

export interface SpeciesDesign {
  name: string;
  type: SpeciesDef["type"];
  traits: SpeciesTraits;
  predictedScore: number;
  foodChainPosition: number;
  synergyWithExisting: string[];
  riskFactors: string[];
}

export interface ArchivedGene {
  id: string;
  speciesName: string;
  epochExtinct: number;
  traits: SpeciesTraits;
  specialAbility?: string;
  extinctionCause: string;
}
