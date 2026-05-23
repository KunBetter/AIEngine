"use client";

import { useReducer, useCallback } from "react";
import type { SymbioteState, SymbioteAIResponse, SymbioteMessage } from "@/lib/types";

const GOALS = [
  "回收远古外星文明遗物",
  "阻止探索者返回地球",
  "研究人类的恐惧和压力反应",
];

const LOCATIONS = ["着陆点", "洞穴入口", "外星森林", "废弃实验室", "返回舱"];

type Action =
  | { type: "SET_SCENE"; payload: SymbioteAIResponse }
  | { type: "ADD_DIALOGUE"; payload: SymbioteMessage }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string }
  | { type: "RESET" };

function createInitialState(): SymbioteState {
  return {
    phase: "intro",
    currentLocation: "着陆点",
    visitedLocations: ["着陆点"],
    trustMeter: 50,
    symbioteGoal: GOALS[Math.floor(Math.random() * GOALS.length)],
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
  };
}

function reducer(state: SymbioteState, action: Action): SymbioteState {
  switch (action.type) {
    case "SET_SCENE": {
      const r = action.payload;
      const newTrust = Math.max(0, Math.min(100, state.trustMeter + r.trustDelta));

      return {
        ...state,
        phase: state.turn > 3 ? "exploration" : state.phase,
        sceneDescription: r.sceneUpdate.description,
        symbioteMessage: r.symbioteAdvice.dialogue,
        availableActions: r.groundTruth.availableActions,
        trustMeter: newTrust,
        trustDelta: r.trustDelta,
        discoveredClues: [
          ...state.discoveredClues,
          ...(r.storyFlags?.filter((f) => !state.discoveredClues.includes(f)) || []),
        ],
        symbioteGoalProgress: Math.min(100, state.symbioteGoalProgress + Math.floor(Math.random() * 10) + 5),
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
    case "RESET":
      return createInitialState();
    default:
      return state;
  }
}

export function useSymbiote() {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);

  const sendAction = useCallback(
    async (playerAction: string) => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: "" });

      // 添加玩家对话
      const playerMsg: SymbioteMessage = { role: "player", content: playerAction };
      dispatch({ type: "ADD_DIALOGUE", payload: playerMsg });

      try {
        const res = await fetch("/api/symbiote/action", {
          method: "POST",
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
              if (event.type === "state_update") {
                dispatch({ type: "SET_SCENE", payload: event.data as SymbioteAIResponse });
                // 添加共生体对话
                const symMsg: SymbioteMessage = {
                  role: "symbiote",
                  content: (event.data as SymbioteAIResponse).symbioteAdvice.dialogue,
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
    [state]
  );

  const resetGame = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    state,
    sendAction,
    resetGame,
    isLoading: (state as SymbioteState & { isLoading?: boolean }).isLoading || false,
    error: (state as SymbioteState & { error?: string }).error || "",
  };
}
