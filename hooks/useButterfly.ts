"use client";

import { useReducer, useCallback } from "react";
import type { ButterflyState, CausalNode, NPCState, JournalEntry, DialogueMessage } from "@/lib/types";

const BASE_NPCS: Record<string, Omit<NPCState, "currentMood" | "location" | "dialogueToday" | "dejaVu">> = {
  elias: {
    name: "Elias", role: "钟楼管理员", basePersonality: "沉默寡言，洞察力强",
    secret: "他知道钟楼地基下的远古装置，但40年来一直保守这个秘密，因为一旦公开钟楼会被拆除",
    desire: "在退休前找到值得托付钟楼秘密的继承人",
    memoryFragments: [], relationships: {}, secretKnowledge: "钟楼地基下有远古装置",
  },
  rose: {
    name: "Rose", role: "花店老板", basePersonality: "温柔有心事",
    secret: "她的花枯萎是因为偷偷用钟楼地下的水浇花——水里的矿物质来自远古装置",
    desire: "治好花的病，然后向Marcus表白",
    memoryFragments: [], relationships: { marcus: 0.6 }, secretKnowledge: "她的花枯萎与钟楼地基有关",
  },
  marcus: {
    name: "Marcus", role: "镇医生", basePersonality: "理性务实",
    secret: "他私下在研究一种血清，用钟楼地下的矿物质制成，能让人短暂看到'未来的记忆'",
    desire: "用血清证明时间循环的存在，保护小镇",
    memoryFragments: [], relationships: { rose: 0.6, brooks: 0.3 }, secretKnowledge: "有强烈的既视感，隐约感知到时间循环",
  },
  brooks: {
    name: "Brooks", role: "警长", basePersonality: "强硬公正",
    secret: "她的父亲30年前在调查钟楼异常时神秘失踪，档案被封存",
    desire: "找到父亲失踪的真相，调离这个让她痛苦的小镇",
    memoryFragments: [], relationships: { elias: 0.4 }, secretKnowledge: "注意到镇上的'异常痕迹'",
  },
  vera: {
    name: "Vera", role: "图书管理员", basePersonality: "知识渊博，羞涩",
    secret: "她在图书馆地下室发现了建造钟楼的原始图纸，上面标注了一个'非人类建造物'",
    desire: "保护知识不被销毁，揭露镇上被掩盖的历史",
    memoryFragments: [], relationships: {}, secretKnowledge: "图书馆档案记载了钟楼建造时发生的怪事",
  },
  sam: {
    name: "Old Sam", role: "流浪汉", basePersonality: "疯癫但洞察真相",
    secret: "他是上一次循环中唯一保留了记忆的人——代价是精神崩溃。他已经经历了147次循环。",
    desire: "帮助'新的循环者'（玩家）打破循环，让自己安息",
    memoryFragments: [], relationships: {}, secretKnowledge: "他其实知道循环的真相，但只能以谜语的方式表达",
  },
};

const LOCATIONS = ["钟楼", "花店", "诊所", "警局", "图书馆", "广场"];
const LOOP_ACTIONS = 8;

const MYSTERY_KEY_EVENTS: Record<string, ButterflyState["keyEvent"]> = {
  tower: {
    description: "午夜12:00，钟楼倒塌，全镇毁灭。",
    prevented: false,
    requiredConditions: ["让Elias在午夜前检查钟楼地基", "让Marcus带着医疗设备在钟楼附近", "让警长Brooks封锁钟楼区域"],
  },
  plague: {
    description: "一场诡异的瘟疫在午夜爆发，全镇陷入昏迷。",
    prevented: false,
    requiredConditions: ["找到Marcus的血清样本", "说服Rose停止使用钟楼地下水", "让Vera找到瘟疫的历史记录"],
  },
  invasion: {
    description: "午夜时分，一群'外来者'闯入小镇，但他们看起来像是...未来的自己？",
    prevented: false,
    requiredConditions: ["与Old Sam深入对话", "让警长Brooks放弃武力对抗", "说服Elias打开钟楼秘密通道"],
  },
};

function createInitialNPCState(name: string): NPCState {
  const base = BASE_NPCS[name];
  return {
    ...base,
    currentMood: "平静",
    location: getDefaultLocation(name),
    dialogueToday: "",
    memoryFragments: [],
    dejaVu: "",
    secret: base.secret,
    desire: base.desire,
  };
}

function getDefaultLocation(name: string): string {
  const map: Record<string, string> = {
    elias: "钟楼", rose: "花店", marcus: "诊所",
    brooks: "警局", vera: "图书馆", sam: "广场",
  };
  return map[name] || "广场";
}

type Action =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string }
  | { type: "START_LOOP"; payload: Record<string, { mood: string; location: string; dialogue: string; specialBehavior?: string; dejaVu?: string }> }
  | { type: "ADD_CAUSAL_NODE"; payload: CausalNode }
  | { type: "ADD_DIALOGUE"; payload: DialogueMessage }
  | { type: "ADD_JOURNAL"; payload: JournalEntry }
  | { type: "SET_LOCATION"; payload: string }
  | { type: "ADVANCE_TIME" }
  | { type: "RESET" }
  | { type: "SET_SCENE"; payload: { result: string; discovery?: string; newClue?: string } };

const mystery = (["tower", "plague", "invasion"] as const)[Math.floor(Math.random() * 3)];

const initialState: ButterflyState = {
  loopNumber: 1,
  timeOfDay: 7,
  currentLocation: "广场",
  causalGraph: [],
  npcs: Object.fromEntries(
    Object.keys(BASE_NPCS).map((k) => [k, createInitialNPCState(k)])
  ),
  playerJournal: [],
  keyEvent: MYSTERY_KEY_EVENTS[mystery],
  gamePhase: "intro",
  activeDialogue: null,
  dialogueMessages: [],
  activeMystery: mystery,
  hypotheses: [],
};

let causalIdCounter = 0;

function reducer(state: ButterflyState, action: Action): ButterflyState {
  switch (action.type) {
    case "START_LOOP": {
      const newNPCs = { ...state.npcs };
      for (const [name, data] of Object.entries(action.payload)) {
        if (newNPCs[name]) {
          newNPCs[name] = {
            ...newNPCs[name],
            currentMood: data.mood || newNPCs[name].currentMood,
            location: data.location || newNPCs[name].location,
            dialogueToday: data.dialogue || newNPCs[name].dialogueToday || "",
            dejaVu: data.dejaVu || "",
          };
        }
      }
      return {
        ...state,
        npcs: newNPCs,
        timeOfDay: 7,
        currentLocation: "广场",
        dialogueMessages: [],
      };
    }
    case "ADD_CAUSAL_NODE": {
      causalIdCounter++;
      const node: CausalNode = {
        ...action.payload,
        id: `causal_${causalIdCounter}`,
        loopNumber: state.loopNumber,
      };
      return { ...state, causalGraph: [...state.causalGraph, node] };
    }
    case "ADD_DIALOGUE":
      return { ...state, dialogueMessages: [...state.dialogueMessages, action.payload] };
    case "ADD_JOURNAL":
      return { ...state, playerJournal: [...state.playerJournal, action.payload] };
    case "SET_LOCATION":
      return { ...state, currentLocation: action.payload };
    case "ADVANCE_TIME":
      return { ...state, timeOfDay: state.timeOfDay + 1 };
    case "SET_SCENE":
      return { ...state, sceneResult: action.payload.result };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };
    case "RESET": {
      const mystery = (["tower", "plague", "invasion"] as const)[Math.floor(Math.random() * 3)];
      return {
        ...initialState,
        activeMystery: mystery,
        keyEvent: MYSTERY_KEY_EVENTS[mystery],
        npcs: Object.fromEntries(Object.keys(BASE_NPCS).map((k) => [k, createInitialNPCState(k)])),
      };
    }
    default:
      return state;
  }
}

export function useButterfly() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const startNewLoop = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const res = await fetch("/api/butterfly/loop-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameState: state }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.error) {
        dispatch({ type: "SET_ERROR", payload: data.error });
        return;
      }

      dispatch({ type: "START_LOOP", payload: data.npcs || {} });

      // Add journal entry
      if (data.atmosphere || data.initialClues) {
        dispatch({
          type: "ADD_JOURNAL",
          payload: {
            loopNumber: state.loopNumber,
            timeOfDay: 7,
            content: `${data.atmosphere || ""} ${(data.initialClues || []).join("; ")}`,
            type: "observation",
          },
        });
      }
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "AI调用失败" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [state]);

  const sendAction = useCallback(
    async (actionType: "talk" | "investigate" | "intervene", playerInput: string, targetNPC?: string) => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: "" });

      // Add player message
      if (targetNPC) {
        dispatch({
          type: "ADD_DIALOGUE",
          payload: { role: "player", npcName: targetNPC, content: playerInput },
        });
      }

      try {
        const res = await fetch("/api/butterfly/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameState: {
              ...state,
              npcs: state.npcs,
            },
            actionType,
            targetNPC,
            playerInput,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body?.getReader();
        if (!reader) throw new Error("无法读取响应流");

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
                const d = event.data;

                // Handle dialogue
                if (d.npcName && d.dialogue) {
                  dispatch({
                    type: "ADD_DIALOGUE",
                    payload: { role: "npc", npcName: d.npcName, content: d.dialogue },
                  });
                }

                // Handle causal impact
                if (d.hasCausalImpact && d.causalNode) {
                  dispatch({ type: "ADD_CAUSAL_NODE", payload: d.causalNode });
                }

                // Handle result
                if (d.result) {
                  dispatch({ type: "SET_SCENE", payload: d });
                }

                // Add to journal
                if (d.discovery || d.newClue) {
                  dispatch({
                    type: "ADD_JOURNAL",
                    payload: {
                      loopNumber: state.loopNumber,
                      timeOfDay: state.timeOfDay,
                      content: d.discovery || d.newClue || d.result,
                      type: d.discovery ? "observation" : "breakthrough",
                    },
                  });
                }

                // Advance time
                dispatch({ type: "ADVANCE_TIME" });
              } else if (event.type === "error") {
                dispatch({ type: "SET_ERROR", payload: event.message });
              }
            } catch {
              // ignore
            }
          }
        }
      } catch (err) {
        dispatch({
          type: "SET_ERROR",
          payload: err instanceof Error ? err.message : "网络错误",
        });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [state]
  );

  const newLoop = useCallback(() => {
    const nextLoop = state.loopNumber + 1;
    // Manually dispatch a reset-like action but preserve causal graph and journal
    dispatch({
      type: "START_LOOP",
      payload: Object.fromEntries(
        Object.entries(state.npcs).map(([name, npc]) => [
          name,
          {
            mood: npc.currentMood,
            location: npc.location,
            dialogue: "",
            dejaVu: "",
          },
        ])
      ),
    });
    // Update loop number (via a workaround)
    dispatch({ type: "ADD_JOURNAL", payload: { loopNumber: nextLoop, timeOfDay: 7, content: `--- 第${nextLoop}次循环开始 ---`, type: "observation" } });
  }, [state]);

  const resetGame = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    state,
    startNewLoop,
    sendAction,
    newLoop,
    resetGame,
    isLoading: (state as ButterflyState & { isLoading?: boolean }).isLoading || false,
    error: (state as ButterflyState & { error?: string }).error || "",
    timeOfDay: state.timeOfDay,
    isDayEnd: state.timeOfDay >= 24,
  };
}
