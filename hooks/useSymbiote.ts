"use client";

import { useReducer, useCallback, useState, useEffect, useRef } from "react";
import type {
  SymbioteState,
  SymbioteAIResponse,
  SymbioteMessage,
  SymbioteStateV2,
  EvidenceCard,
  TrustState,
  SurvivalState,
  ConfrontationRound,
} from "@/lib/types";

const GOALS = [
  "回收远古外星文明遗物",
  "阻止探索者返回地球",
  "研究人类的恐惧和压力反应",
  "与远古AI融合",
  "拯救星球生态",
];

const SCENE_TRANSITIONS: Record<string, string[]> = {
  "着陆点": ["洞穴入口", "外星森林"],
  "洞穴入口": ["着陆点", "洞穴深处"],
  "洞穴深处": ["洞穴入口", "远古遗迹"],
  "外星森林": ["着陆点", "远古遗迹", "外星城市"],
  "远古遗迹": ["洞穴深处", "外星森林", "废弃实验室"],
  "外星城市": ["外星森林", "废弃实验室"],
  "废弃实验室": ["远古遗迹", "外星城市", "返回舱", "远古控制中心"],
  "返回舱": ["废弃实验室"],
  "远古控制中心": ["废弃实验室"],
};

const LOCATIONS = ["着陆点", "洞穴入口", "外星森林", "废弃实验室", "返回舱"];

// Quick local actions that can be handled without full AI round-trip
const LOCAL_ACTIONS = ["查看周围", "检查装备", "休息一下", "查看地图", "显示状态"];
// Movement actions that benefit from scene caching
const MOVE_ACTIONS = ["前往", "返回", "去"];

function checkEnding(state: SymbioteState): string | null {
  if (state.currentLocation === "返回舱" && state.turn > 10) {
    if (state.trustMeter > 70 && state.symbioteGoalProgress > 60) return "symbiote_win";
    if (state.trustMeter < 25 && state.discoveredClues.length >= 3) return "exposed";
    if (state.trustMeter > 50) return "trust";
    return "escape";
  }
  if (state.currentLocation === "远古控制中心" && state.symbioteGoal === "与远古AI融合") {
    if (state.trustMeter > 60) return "merge";
    return "sacrifice";
  }
  return null;
}

type Action =
  | { type: "SET_SCENE"; payload: SymbioteAIResponse }
  | { type: "ADD_DIALOGUE"; payload: SymbioteMessage }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string }
  | { type: "RESET" }
  | { type: "RANDOMIZE_GOAL" }
  | { type: "ADD_EVIDENCE"; payload: EvidenceCard[] }
  | { type: "DETECT_CONTRADICTION"; payload: { cardA: string; cardB: string; description: string } }
  | { type: "UPDATE_TRUST"; payload: Partial<TrustState> }
  | { type: "UPDATE_SURVIVAL"; payload: Partial<SurvivalState> }
  | { type: "START_CONFRONTATION" }
  | { type: "ADD_CONFRONTATION_ROUND"; payload: ConfrontationRound }
  | { type: "END_CONFRONTATION" }
  | { type: "MARK_EVIDENCE"; payload: { cardId: string; credibility: number } };

function createInitialState(): SymbioteStateV2 {
  return {
    phase: "intro",
    currentLocation: "着陆点",
    visitedLocations: ["着陆点"],
    trustMeter: 50,
    // Fixed initial goal for SSR stability — randomized on client mount
    symbioteGoal: GOALS[0],
    symbioteGoalProgress: 0,
    inventory: ["紧急信标"],
    discoveredClues: [],
    dialogueHistory: [],
    sceneDescription: "",
    symbioteMessage: "",
    availableActions: ["探索周围环境", "检查返回舱", "询问ECHO-7当前位置"],
    gameLog: [],
    turn: 0,
    storyFlags: [],
    branchChoice: null,
    flashbacks: [],
    ending: null,
    // V2 fields
    evidenceCards: [],
    trustState: { surfaceTrust: 50, trueTrust: 50, echo7Alertness: 0 },
    survival: { health: 100, energy: 100, oxygen: 100 },
    activeConfrontation: false,
    confrontationHistory: [],
    echo7Alertness: 0,
  };
}

function reducer(state: SymbioteStateV2, action: Action): SymbioteStateV2 {
  switch (action.type) {
    case "SET_SCENE": {
      const r = action.payload;
      const newTrust = Math.max(0, Math.min(100, state.trustMeter + r.trustDelta));

      // Handle flashbacks
      const newFlashbacks = [...state.flashbacks];
      if (r.flashback?.triggered) {
        newFlashbacks.push({
          triggerLocation: state.currentLocation,
          content: r.flashback.content,
          revealed: true,
        });
      }

      // Handle item pickup via storyFlags (flags starting with "item:")
      const newInventory = [...state.inventory];
      if (r.storyFlags) {
        for (const flag of r.storyFlags) {
          if (flag.startsWith("item:")) {
            const itemName = flag.replace("item:", "");
            if (!newInventory.includes(itemName)) newInventory.push(itemName);
          }
        }
      }

      // Check ending
      const ending = r.endingTriggered || checkEnding({
        ...state,
        currentLocation: r.sceneUpdate.sceneId || state.currentLocation,
        trustMeter: newTrust,
        inventory: newInventory,
        flashbacks: newFlashbacks,
      });

      return {
        ...state,
        phase: ending ? "ending" : (state.turn > 3 ? "exploration" : state.phase),
        sceneDescription: r.sceneUpdate.description,
        symbioteMessage: r.symbioteAdvice.dialogue,
        availableActions: r.groundTruth.availableActions,
        trustMeter: newTrust,
        trustDelta: r.trustDelta,
        discoveredClues: [
          ...state.discoveredClues,
          ...(r.storyFlags?.filter((f: string) => !f.startsWith("item:") && !state.discoveredClues.includes(f)) || []),
        ],
        inventory: newInventory,
        flashbacks: newFlashbacks,
        ending,
        symbioteGoalProgress: Math.min(100, state.symbioteGoalProgress + Math.floor(Math.random() * 8) + 3),
        turn: state.turn + 1,
        gameLog: [
          ...state.gameLog,
          {
            id: `turn-${state.turn + 1}`,
            timestamp: Date.now(),
            type: "scene_update",
            description: r.sceneUpdate.atmosphere,
            data: r as unknown as Record<string, unknown>,
          },
        ],
      };
    }
    case "ADD_DIALOGUE":
      return {
        ...state,
        dialogueHistory: [...state.dialogueHistory, action.payload],
      };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };
    case "ADD_EVIDENCE": {
      const existingIds = new Set(state.evidenceCards.map(c => c.id));
      const newCards = action.payload.filter(c => !existingIds.has(c.id));
      if (newCards.length === 0) return state;
      return {
        ...state,
        evidenceCards: [...state.evidenceCards, ...newCards],
      };
    }
    case "DETECT_CONTRADICTION":
      return {
        ...state,
        discoveredClues: [
          ...state.discoveredClues,
          `矛盾: ${action.payload.description}`,
        ],
      };
    case "UPDATE_TRUST":
      return {
        ...state,
        trustState: { ...state.trustState, ...action.payload },
      };
    case "UPDATE_SURVIVAL": {
      const survival = { ...state.survival, ...action.payload };
      const ending = survival.health <= 0 ? "perish" : state.ending;
      return { ...state, survival, ending };
    }
    case "START_CONFRONTATION":
      return { ...state, activeConfrontation: true };
    case "ADD_CONFRONTATION_ROUND": {
      const round = action.payload;
      const confrontationHistory = [...state.confrontationHistory, round];
      const ending = round.outcome === "echo7_confesses" ? "exposed" : state.ending;
      return { ...state, confrontationHistory, ending, activeConfrontation: ending !== "exposed" };
    }
    case "END_CONFRONTATION":
      return { ...state, activeConfrontation: false };
    case "MARK_EVIDENCE":
      return {
        ...state,
        evidenceCards: state.evidenceCards.map(c =>
          c.id === action.payload.cardId
            ? { ...c, credibility: action.payload.credibility }
            : c
        ),
      };
    case "RESET": {
      // RESET only fires on client (user action) — Math.random is safe
      const newGoal = GOALS[Math.floor(Math.random() * GOALS.length)];
      const initial = createInitialState();
      return { ...initial, symbioteGoal: newGoal };
    }
    case "RANDOMIZE_GOAL":
      return {
        ...state,
        symbioteGoal: GOALS[Math.floor(Math.random() * GOALS.length)],
      };
    default:
      return state;
  }
}

export function useSymbiote() {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);
  const [sceneCache, setSceneCache] = useState<Record<string, SymbioteAIResponse>>({});
  const abortRef = useRef<AbortController | null>(null);
  const lastActionRef = useRef<string | null>(null);

  // Randomize symbiote goal on first client mount (SSR-safe)
  useEffect(() => {
    dispatch({ type: "RANDOMIZE_GOAL" });
  }, []);

  const sendAction = useCallback(
    async (playerAction: string) => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: "" });

      // Quick action routing: check if this is a basic local action
      const isLocalAction = LOCAL_ACTIONS.some(a => playerAction.includes(a));
      // Save for potential retry
      lastActionRef.current = playerAction;
      // Movement actions: check scene cache for instant navigation
      const cached = MOVE_ACTIONS.some(a => playerAction.includes(a)) ? sceneCache[playerAction] : null;

      if (cached) {
        // Use cached scene data, skip API call
        dispatch({ type: "SET_SCENE", payload: cached });
        const symMsg: SymbioteMessage = {
          role: "symbiote",
          content: cached.symbioteAdvice.dialogue,
        };
        dispatch({ type: "ADD_DIALOGUE", payload: symMsg });
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      // Add preferLocal flag for basic actions — AI can respond faster
      const preferLocal = isLocalAction;

      // 添加玩家对话
      const playerMsg: SymbioteMessage = { role: "player", content: playerAction };
      dispatch({ type: "ADD_DIALOGUE", payload: playerMsg });

      // Apply survival costs
      const isQuestioning = playerAction.includes("质疑") || playerAction.includes("调查") || playerAction.includes("检查");
      const energyCost = isQuestioning ? 10 : 3;
      dispatch({
        type: "UPDATE_SURVIVAL",
        payload: {
          energy: Math.max(0, state.survival.energy - energyCost),
          oxygen: Math.max(0, state.survival.oxygen - 3),
        },
      });

      try {
        // Cancel any in-flight request
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const res = await fetch("/api/symbiote/action", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameState: {
              currentLocation: state.currentLocation,
              visitedLocations: state.visitedLocations,
              trustMeter: state.trustMeter,
              inventory: state.inventory,
              discoveredClues: state.discoveredClues,
              turn: state.turn,
              symbioteGoal: state.symbioteGoal,
              symbioteGoalProgress: state.symbioteGoalProgress,
              dialogueHistory: state.dialogueHistory,
            },
            playerAction,
            useStream: true,
            preferLocal,
          }),
        });

        if (!res.ok) {
          dispatch({ type: "SET_ERROR", payload: `HTTP ${res.status}` });
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          dispatch({ type: "SET_ERROR", payload: "无法读取响应流" });
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);
              if (event.type === "trust_update") {
                // Early trust delta — update trust meter immediately
                const delta = event.data?.delta ?? 0;
                const newTrust = Math.max(0, Math.min(100, state.trustMeter + delta));
                dispatch({
                  type: "UPDATE_TRUST",
                  payload: { surfaceTrust: newTrust },
                });
              } else if (event.type === "state_update") {
                const eventData = event.data;
                dispatch({ type: "SET_SCENE", payload: eventData as SymbioteAIResponse });

                // Cache movement results for repeat navigation
                if (MOVE_ACTIONS.some(a => playerAction.includes(a))) {
                  setSceneCache(prev => ({ ...prev, [playerAction]: eventData as SymbioteAIResponse }));
                }

                // Extract evidence cards from response
                if (eventData.evidenceCards) {
                  dispatch({ type: "ADD_EVIDENCE", payload: eventData.evidenceCards });
                }

                // Extract echo7 strategy
                if (eventData.echo7Strategy) {
                  dispatch({
                    type: "UPDATE_TRUST",
                    payload: { echo7Alertness: eventData.echo7Strategy.alertnessLevel },
                  });
                }

                // 添加共生体对话
                const symMsg: SymbioteMessage = {
                  role: "symbiote",
                  content: (eventData as SymbioteAIResponse).symbioteAdvice.dialogue,
                };
                dispatch({ type: "ADD_DIALOGUE", payload: symMsg as SymbioteMessage });
                dispatch({ type: "SET_LOADING", payload: false });
              } else if (event.type === "error") {
                dispatch({ type: "SET_ERROR", payload: event.message || "未知错误" });
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      } catch (err) {
        dispatch({
          type: "SET_ERROR",
          payload: err instanceof Error ? err.message : "网络错误",
        });
      }
    },
    [state, sceneCache]
  );

  const sendConfrontAction = useCallback(async (claim: string, evidenceIds: string[]) => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const res = await fetch("/api/symbiote/confront", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameState: {
            evidenceCards: state.evidenceCards,
            symbioteGoal: state.symbioteGoal,
            trustState: state.trustState,
            confrontationHistory: state.confrontationHistory,
          },
          claim,
          evidenceIds,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const round: ConfrontationRound = {
        playerClaim: claim,
        evidenceUsed: evidenceIds,
        echo7Response: data.echo7Response?.dialogue || "...",
        echo7EmotionalState: data.echo7Response?.emotionalState || "defensive",
        outcome: data.echo7Response?.revealsTruth ? "echo7_confesses" : "echo7_deflects",
      };
      dispatch({ type: "ADD_CONFRONTATION_ROUND", payload: round });
      if (data.echo7Response?.revealsTruth) {
        // Trigger ending
        dispatch({ type: "SET_SCENE", payload: { ...data, endingTriggered: "exposed" } as any });
      }
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "对峙失败" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [state]);

  const resetGame = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const connectEvidence = useCallback((cardA: string, cardB: string) => {
    const card1 = state.evidenceCards.find(c => c.id === cardA);
    const card2 = state.evidenceCards.find(c => c.id === cardB);
    if (card1 && card2 && card1.hiddenContradiction && card2.hiddenContradiction) {
      dispatch({
        type: "DETECT_CONTRADICTION",
        payload: { cardA, cardB, description: `"${card1.title}"与"${card2.title}"存在矛盾` },
      });
    }
  }, [state.evidenceCards]);

  const markEvidence = useCallback((cardId: string, credibility: number) => {
    dispatch({ type: "MARK_EVIDENCE", payload: { cardId, credibility } });
  }, []);

  const startConfrontation = useCallback(() => {
    dispatch({ type: "START_CONFRONTATION" });
  }, []);

  const endConfrontation = useCallback(() => {
    dispatch({ type: "END_CONFRONTATION" });
  }, []);

  const retry = useCallback(() => {
    if (lastActionRef.current) {
      sendAction(lastActionRef.current);
    }
  }, [sendAction]);

  return {
    state,
    sendAction,
    sendConfrontAction,
    resetGame,
    connectEvidence,
    markEvidence,
    startConfrontation,
    endConfrontation,
    retry,
    isLoading: state.isLoading || false,
    error: state.error || "",
  };
}
