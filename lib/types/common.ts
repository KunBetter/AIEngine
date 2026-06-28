// ============================================================
// 通用类型 — 跨游戏共享
// ============================================================

export interface GameEvent {
  id: string;
  timestamp: number;
  type: string;
  description: string;
  data?: Record<string, unknown>;
}

export type GamePhase = "intro" | "exploration" | "climax" | "ending";

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

export interface SSEPhaseEvent {
  type: "npc_state_change" | "dialogue_start" | "dialogue_chunk" | "causal_fragment" | "timeline_update" | "done";
  data: Record<string, unknown>;
}
