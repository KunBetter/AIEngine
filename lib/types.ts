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
  error?: string;
}

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
