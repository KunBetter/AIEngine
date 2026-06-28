// ============================================================
// 蝴蝶效应 (Butterfly Effect)
// ============================================================

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

// ---- v2 ----

export interface TimelineNode {
  id: string;
  time: number;
  location: string;
  npcsPresent: string[];
  events: string[];
  isUnlocked: boolean;
  isCritical: boolean;
  causalLinks: string[];
  mysteryStatus: "hidden" | "suspicious" | "revealed";
}

export interface CausalFragment {
  id: string;
  description: string;
  relatedNPCs: string[];
  relatedTime: number;
  relatedLocation: string;
  hints: string[];
  isPlaced: boolean;
  correctPosition?: {
    parentId?: string;
    childId?: string;
  };
}

export interface AnchoredCausal {
  causalChainId: string;
  anchorLevel: number;
  fragments: string[];
  effects: {
    npcMemoryRetained: string[];
    eventPreShifted: boolean;
    locationStateChanged: string;
  };
}

export interface ButterflyStateV2 extends ButterflyState {
  actionPoints: number;
  maxActionPoints: number;
  timelineNodes: TimelineNode[];
  causalFragments: CausalFragment[];
  anchoredCausals: AnchoredCausal[];
  insightPoints: number;
  isOverheated: boolean;
  score?: number;
  rating?: "S" | "A" | "B" | "C";
}

export interface NPCStateV2 extends NPCState {
  memoryAwakening: number;
  permanentMemories: string[];
  awakeningStage: "dormant" | "deja_vu" | "aware" | "ally" | "unstable";
}

export interface ButterflyAIResponseV2 {
  npcName?: string;
  dialogue?: string;
  tone?: string;
  hasCausalImpact?: boolean;
  causalNode?: CausalNode;
  result?: string;
  causalFragments: CausalFragment[];
  timelineNodesUnlocked: TimelineNode[];
  npcMemoryHint?: string;
  anchoringSuggestion?: {
    chainDescription: string;
    fragmentsInvolved: string[];
    predictedEffect: string;
  };
  mysteryProgress: {
    conditionMet: string[];
    conditionHint: string[];
  };
}

// ---- v3 ----

export interface DiscoverableClue {
  id: string;
  location: string;
  timeWindow: { start: number; end: number };
  description: string;
  requiredAction: string;
  revealsFragment: string;
}

export interface NPCScheduleEntry {
  timeStart: number;
  timeEnd: number;
  location: string;
}

export interface LoopKeyEvent {
  time: number;
  location: string;
  description: string;
  condition: string;
}

export interface LoopPreparation {
  npcSchedules: Record<string, NPCScheduleEntry[]>;
  discoverableClues: DiscoverableClue[];
  keyEvents: LoopKeyEvent[];
  loopGoal: string;
}

export interface ButterflyAchievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: number;
}

export const BUTTERFLY_ACHIEVEMENTS: Record<string, { name: string; description: string }> = {
  first_loop: { name: "🔄 初次回溯", description: "完成第1次循环" },
  five_loops: { name: "⏰ 时间旅人", description: "完成5次循环" },
  all_npcs: { name: "🤝 全镇皆知", description: "一轮内与所有6个NPC对话" },
  perfect_loop: { name: "✨ 完美循环", description: "一轮内发现3个以上因果链" },
  eureka: { name: "💡 灵光一现", description: "首次确认假设" },
  memory_awakened: { name: "🧠 记忆觉醒", description: "首个NPC达到 aware 阶段" },
  all_awakened: { name: "🌟 全员觉醒", description: "所有NPC觉醒" },
  speed_run: { name: "⚡ 闪电破局", description: "3轮内破解谜题" },
  s_rank: { name: "🏆 S级侦探", description: "获得S评级" },
};
