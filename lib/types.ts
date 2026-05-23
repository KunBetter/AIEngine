// ============================================================
// 共享类型定义 — 三个游戏的状态、事件、动作类型
// ============================================================

// ---- 通用类型 ----

export interface GameEvent {
  id: string;
  timestamp: number;
  type: string;
  description: string;
  data?: Record<string, unknown>;
}

export type GamePhase = "intro" | "exploration" | "climax" | "ending";

// ---- 共生体 (Symbiote) ----

export interface SymbioteState {
  phase: GamePhase;
  currentLocation: string;
  visitedLocations: string[];
  trustMeter: number;
  symbioteGoal: string;
  symbioteGoalProgress: number;
  inventory: string[];
  discoveredClues: string[];
  dialogueHistory: SymbioteMessage[];
  sceneDescription: string;
  symbioteMessage: string;
  availableActions: string[];
  gameLog: GameEvent[];
  turn: number;
  storyFlags?: string[];
  trustDelta?: number;
  isLoading?: boolean;
  error?: string;
  branchChoice: string | null;
  flashbacks: FlashbackEntry[];
  ending: string | null;
}

export interface FlashbackEntry {
  triggerLocation: string;
  content: string;
  revealed: boolean;
}

export interface SceneDef {
  id: string;
  name: string;
  description: string;
  neighborIds: string[];
  branchPoint: boolean;
  flashbackGoal?: string;
}

export interface EndingDef {
  id: string;
  name: string;
  description: string;
  condition: (state: SymbioteState) => boolean;
}

export interface SymbioteMessage {
  role: "player" | "symbiote" | "narrator";
  content: string;
}

export interface SymbioteAIResponse {
  sceneUpdate: {
    description: string;
    atmosphere: string;
    visibleItems: string[];
    threats: string[];
    sceneId?: string;
    availableExits?: string[];
    branchPrompt?: string;
  };
  symbioteAdvice: {
    dialogue: string;
    suggestedAction: string;
    tone: "concerned" | "neutral" | "urgent" | "dismissive" | "evasive";
    hiddenAgendaInfluence: number;
  };
  groundTruth: {
    realThreatLevel: number;
    missedInformation: string;
    availableActions: string[];
    consequences: Record<string, string>;
  };
  trustDelta: number;
  storyFlags: string[];
  flashback?: { triggered: boolean; content: string };
  endingTriggered?: string;
}

// ---- 蝴蝶效应 (Butterfly Effect) ----

export interface CausalNode {
  id: string;
  loopNumber: number;
  action: string;
  affectedNPCs: string[];
  consequenceDescription: string;
  magnitude: number;
  parentNodeIds: string[];
}

export interface NPCState {
  name: string;
  role: string;
  basePersonality: string;
  currentMood: string;
  location: string;
  memoryFragments: string[];
  relationships: Record<string, number>;
  dialogueToday: string;
  secretKnowledge: string;
  dejaVu?: string;
  secret: string;
  desire: string;
}

export interface Hypothesis {
  id: string;
  loopNumber: number;
  content: string;
  status: "pending" | "confirmed" | "rejected";
}

export interface ButterflyState {
  loopNumber: number;
  timeOfDay: number;
  currentLocation: string;
  causalGraph: CausalNode[];
  npcs: Record<string, NPCState>;
  playerJournal: JournalEntry[];
  keyEvent: {
    description: string;
    prevented: boolean;
    requiredConditions: string[];
  };
  gamePhase: "intro" | "investigating" | "breakthrough" | "resolved";
  activeDialogue: string | null;
  dialogueMessages: DialogueMessage[];
  activeMystery: "tower" | "plague" | "invasion";
  hypotheses: Hypothesis[];
  isLoading?: boolean;
  error?: string;
  sceneResult?: string;
}

export interface JournalEntry {
  loopNumber: number;
  timeOfDay: number;
  content: string;
  type: "observation" | "hypothesis" | "breakthrough";
}

export interface DialogueMessage {
  role: "player" | "npc";
  npcName?: string;
  content: string;
}

// ---- 异星造物主 (Xenogenesis) ----

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

// ---- AI 调用通用类型 ----

export interface AIRequestOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface StreamEvent {
  type: "thinking" | "content" | "state_update" | "done" | "error";
  data?: unknown;
  message?: string;
}
