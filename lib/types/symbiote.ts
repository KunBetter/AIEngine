import type { GamePhase, GameEvent } from "./common";

// ============================================================
// 共生体 (Symbiote)
// ============================================================

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

// ---- v2 ----

export interface EvidenceCard {
  id: string;
  title: string;
  description: string;
  sourceLocation: string;
  echo7Explanation: string;
  hiddenContradiction?: string;
  connectedTo: string[];
  credibility: number;
}

export interface TrustState {
  surfaceTrust: number;
  trueTrust: number;
  echo7Alertness: number;
}

export interface SurvivalState {
  health: number;
  energy: number;
  oxygen: number;
}

export interface SymbioteStateV2 extends SymbioteState {
  evidenceCards: EvidenceCard[];
  trustState: TrustState;
  survival: SurvivalState;
  activeConfrontation: boolean;
  confrontationHistory: ConfrontationRound[];
  echo7Alertness: number;
}

export interface ConfrontationRound {
  playerClaim: string;
  evidenceUsed: string[];
  echo7Response: string;
  echo7EmotionalState: "defensive" | "cornered" | "confessing" | "defiant";
  outcome: "player_advances" | "echo7_deflects" | "echo7_confesses" | "stalemate";
}

export interface SymbioteAIResponseV2 extends SymbioteAIResponse {
  echo7Strategy: {
    alertnessLevel: number;
    isLying: boolean;
    lieTarget: string;
    manipulationType: "misdirect" | "omit" | "gaslight" | "none";
  };
  evidenceCards: EvidenceCard[];
  contradictionDetected?: {
    cardA: string;
    cardB: string;
    description: string;
  };
  confrontationResponse?: {
    dialogue: string;
    emotionalState: "defensive" | "cornered" | "confessing" | "defiant";
    revealsTruth: boolean;
    revealedInfo: string;
    trustCost: number;
  };
}
