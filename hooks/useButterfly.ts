"use client";

import { useReducer, useCallback, useState } from "react";
import type {
  ButterflyStateV2,
  CausalNode,
  CausalFragment,
  TimelineNode,
  AnchoredCausal,
  NPCStateV2,
  JournalEntry,
  DialogueMessage,
  LoopPreparation,
} from "@/lib/types";

// Fields set dynamically per loop by createInitialNPCState / START_LOOP
type BaseNPCFields = Omit<
  NPCStateV2,
  "currentMood" | "location" | "dialogueToday" | "dejaVu" | "memoryAwakening" | "permanentMemories" | "awakeningStage"
>;

const BASE_NPCS: Record<string, BaseNPCFields> = {
  elias: {
    name: "Elias",
    role: "钟楼管理员",
    basePersonality: "沉默寡言，洞察力强",
    secret: "他知道钟楼地基下的远古装置，但40年来一直保守这个秘密，因为一旦公开钟楼会被拆除",
    desire: "在退休前找到值得托付钟楼秘密的继承人",
    memoryFragments: [],
    relationships: {},
    secretKnowledge: "钟楼地基下有远古装置",
  },
  rose: {
    name: "Rose",
    role: "花店老板",
    basePersonality: "温柔有心事",
    secret: "她的花枯萎是因为偷偷用钟楼地下的水浇花——水里的矿物质来自远古装置",
    desire: "治好花的病，然后向Marcus表白",
    memoryFragments: [],
    relationships: { marcus: 0.6 },
    secretKnowledge: "她的花枯萎与钟楼地基有关",
  },
  marcus: {
    name: "Marcus",
    role: "镇医生",
    basePersonality: "理性务实",
    secret: "他私下在研究一种血清，用钟楼地下的矿物质制成，能让人短暂看到'未来的记忆'",
    desire: "用血清证明时间循环的存在，保护小镇",
    memoryFragments: [],
    relationships: { rose: 0.6, brooks: 0.3 },
    secretKnowledge: "有强烈的既视感，隐约感知到时间循环",
  },
  brooks: {
    name: "Brooks",
    role: "警长",
    basePersonality: "强硬公正",
    secret: "她的父亲30年前在调查钟楼异常时神秘失踪，档案被封存",
    desire: "找到父亲失踪的真相，调离这个让她痛苦的小镇",
    memoryFragments: [],
    relationships: { elias: 0.4 },
    secretKnowledge: "注意到镇上的'异常痕迹'",
  },
  vera: {
    name: "Vera",
    role: "图书管理员",
    basePersonality: "知识渊博，羞涩",
    secret: "她在图书馆地下室发现了建造钟楼的原始图纸，上面标注了一个'非人类建造物'",
    desire: "保护知识不被销毁，揭露镇上被掩盖的历史",
    memoryFragments: [],
    relationships: {},
    secretKnowledge: "图书馆档案记载了钟楼建造时发生的怪事",
  },
  sam: {
    name: "Old Sam",
    role: "流浪汉",
    basePersonality: "疯癫但洞察真相",
    secret: "他是上一次循环中唯一保留了记忆的人——代价是精神崩溃。他已经经历了147次循环。",
    desire: "帮助'新的循环者'（玩家）打破循环，让自己安息",
    memoryFragments: [],
    relationships: {},
    secretKnowledge: "他其实知道循环的真相，但只能以谜语的方式表达",
  },
};

const LOCATIONS = ["钟楼", "花店", "诊所", "警局", "图书馆", "广场"];
const LOOP_ACTIONS = 8;

const MYSTERY_KEY_EVENTS: Record<string, ButterflyStateV2["keyEvent"]> = {
  tower: {
    description: "午夜12:00，钟楼倒塌，全镇毁灭。",
    prevented: false,
    requiredConditions: [
      "让Elias在午夜前检查钟楼地基",
      "让Marcus带着医疗设备在钟楼附近",
      "让警长Brooks封锁钟楼区域",
    ],
  },
  plague: {
    description: "一场诡异的瘟疫在午夜爆发，全镇陷入昏迷。",
    prevented: false,
    requiredConditions: [
      "找到Marcus的血清样本",
      "说服Rose停止使用钟楼地下水",
      "让Vera找到瘟疫的历史记录",
    ],
  },
  invasion: {
    description: "午夜时分，一群'外来者'闯入小镇，但他们看起来像是...未来的自己？",
    prevented: false,
    requiredConditions: [
      "与Old Sam深入对话",
      "让警长Brooks放弃武力对抗",
      "说服Elias打开钟楼秘密通道",
    ],
  },
};

function createInitialNPCState(name: string): NPCStateV2 {
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
    // ---- V2 fields ----
    memoryAwakening: name === "sam" ? 70 : 0,
    permanentMemories: [],
    awakeningStage: name === "sam" ? "ally" : "dormant",
  };
}

function getDefaultLocation(name: string): string {
  const map: Record<string, string> = {
    elias: "钟楼",
    rose: "花店",
    marcus: "诊所",
    brooks: "警局",
    vera: "图书馆",
    sam: "广场",
  };
  return map[name] || "广场";
}

/** Map memoryAwakening → awakeningStage using the V2 thresholds */
function getAwakeningStage(memoryAwakening: number): NPCStateV2["awakeningStage"] {
  if (memoryAwakening > 80) return "unstable";
  if (memoryAwakening > 60) return "ally";
  if (memoryAwakening > 40) return "aware";
  if (memoryAwakening > 20) return "deja_vu";
  return "dormant";
}

type Action =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string }
  | {
      type: "START_LOOP";
      payload: Record<
        string,
        {
          mood: string;
          location: string;
          dialogue: string;
          specialBehavior?: string;
          dejaVu?: string;
        }
      >;
    }
  | { type: "ADD_CAUSAL_NODE"; payload: CausalNode }
  | { type: "ADD_DIALOGUE"; payload: DialogueMessage }
  | { type: "ADD_JOURNAL"; payload: JournalEntry }
  | { type: "SET_LOCATION"; payload: string }
  | { type: "ADVANCE_TIME" }
  | { type: "RESET" }
  | { type: "SET_SCENE"; payload: { result: string; discovery?: string; newClue?: string } }
  // ---- V2 actions ----
  | { type: "USE_AP"; payload: number }
  | { type: "ADD_FRAGMENTS"; payload: CausalFragment[] }
  | { type: "PLACE_FRAGMENT"; payload: { fragmentId: string } }
  | { type: "ADD_INSIGHT"; payload: number }
  | { type: "UNLOCK_TIMELINE_NODES"; payload: TimelineNode[] }
  | { type: "ANCHOR_CHAIN"; payload: { fragmentIds: string[] } }
  | { type: "CONNECT_FRAGMENTS"; payload: { fromId: string; toId: string } };

// Use fixed initial mystery for SSR stability; RESET action randomizes on client
const initialMystery = "tower" as const;

const initialState: ButterflyStateV2 = {
  loopNumber: 1,
  timeOfDay: 7,
  currentLocation: "广场",
  causalGraph: [],
  npcs: Object.fromEntries(
    Object.keys(BASE_NPCS).map((k) => [k, createInitialNPCState(k)]),
  ),
  playerJournal: [],
  keyEvent: MYSTERY_KEY_EVENTS[initialMystery],
  gamePhase: "intro",
  activeDialogue: null,
  dialogueMessages: [],
  activeMystery: initialMystery,
  hypotheses: [],
  // ---- V2 fields ----
  actionPoints: 8,
  maxActionPoints: 8,
  timelineNodes: [],
  causalFragments: [],
  anchoredCausals: [],
  insightPoints: 0,
  isOverheated: false,
};

let causalIdCounter = 0;

function reducer(state: ButterflyStateV2, action: Action): ButterflyStateV2 {
  switch (action.type) {
    case "START_LOOP": {
      const newNPCs = { ...state.npcs };
      for (const [name, data] of Object.entries(action.payload)) {
        if (newNPCs[name]) {
          // Spread the existing NPC (which is now NPCStateV2) and overwrite
          // only the loop-refresh fields; V2 persistent fields like
          // memoryAwakening / awakeningStage are preserved.
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
        gamePhase: state.gamePhase === "intro" ? "investigating" : state.gamePhase,
        // Reset AP for the new loop
        actionPoints: state.maxActionPoints,
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
      return {
        ...state,
        dialogueMessages: [...state.dialogueMessages, action.payload],
      };

    case "ADD_JOURNAL":
      return {
        ...state,
        playerJournal: [...state.playerJournal, action.payload],
      };

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
      const newMystery = (["tower", "plague", "invasion"] as const)[
        Math.floor(Math.random() * 3)
      ];
      return {
        ...initialState,
        activeMystery: newMystery,
        keyEvent: MYSTERY_KEY_EVENTS[newMystery],
        npcs: Object.fromEntries(
          Object.keys(BASE_NPCS).map((k) => [k, createInitialNPCState(k)]),
        ),
      };
    }

    // ================================================================
    // V2 actions
    // ================================================================

    case "USE_AP": {
      const newAP = state.actionPoints - action.payload;
      // If AP runs out the day ends immediately
      if (newAP <= 0) {
        return { ...state, actionPoints: 0, timeOfDay: 24 };
      }
      return { ...state, actionPoints: newAP };
    }

    case "ADD_FRAGMENTS": {
      const existingIds = new Set(state.causalFragments.map((f) => f.id));
      const newFrags = action.payload.filter((f) => !existingIds.has(f.id));
      return {
        ...state,
        causalFragments: [...state.causalFragments, ...newFrags],
      };
    }

    case "PLACE_FRAGMENT":
      return {
        ...state,
        causalFragments: state.causalFragments.map((f) =>
          f.id === action.payload.fragmentId ? { ...f, isPlaced: true } : f,
        ),
      };

    case "ADD_INSIGHT":
      return { ...state, insightPoints: state.insightPoints + action.payload };

    case "UNLOCK_TIMELINE_NODES": {
      const existingIds = new Set(state.timelineNodes.map((n) => n.id));
      const newNodes = action.payload.filter((n) => !existingIds.has(n.id));
      return {
        ...state,
        timelineNodes: [...state.timelineNodes, ...newNodes],
      };
    }

    case "ANCHOR_CHAIN": {
      const cost = Math.pow(2, state.anchoredCausals.length);
      // Cannot afford the insight cost — no-op
      if (state.insightPoints < cost) return state;

      const chainId = `anchor_${Date.now()}_${state.anchoredCausals.length + 1}`;
      const newAnchor: AnchoredCausal = {
        causalChainId: chainId,
        anchorLevel: state.anchoredCausals.length + 1,
        fragments: action.payload.fragmentIds,
        effects: {
          npcMemoryRetained: [],
          eventPreShifted: false,
          locationStateChanged: "",
        },
      };

      // Collect affected NPCs from the fragments being anchored
      const fragmentNPCs = new Set<string>();
      for (const fid of action.payload.fragmentIds) {
        const fragment = state.causalFragments.find((f) => f.id === fid);
        if (fragment) {
          fragment.relatedNPCs.forEach((npc) => fragmentNPCs.add(npc));
        }
      }

      const updatedNPCs = { ...state.npcs };
      const memoryRetained: string[] = [];
      for (const npcName of fragmentNPCs) {
        const npc = updatedNPCs[npcName] as NPCStateV2 | undefined;
        if (npc) {
          const newAwakening = Math.min(npc.memoryAwakening + 20, 100);
          memoryRetained.push(npcName);
          updatedNPCs[npcName] = {
            ...npc,
            memoryAwakening: newAwakening,
            awakeningStage: getAwakeningStage(newAwakening),
          } as NPCStateV2;
        }
      }
      newAnchor.effects.npcMemoryRetained = memoryRetained;

      const newAnchoredCausals = [...state.anchoredCausals, newAnchor];

      return {
        ...state,
        anchoredCausals: newAnchoredCausals,
        insightPoints: state.insightPoints - cost,
        isOverheated: newAnchoredCausals.length > 3,
        npcs: updatedNPCs,
      };
    }

    case "CONNECT_FRAGMENTS": {
      // Link fromId → toId: toId's correctPosition.parentId = fromId
      return {
        ...state,
        causalFragments: state.causalFragments.map((f) =>
          f.id === action.payload.toId
            ? {
                ...f,
                correctPosition: {
                  ...f.correctPosition,
                  parentId: action.payload.fromId,
                },
              }
            : f,
        ),
      };
    }

    default:
      return state;
  }
}

// ================================================================
// Scoring helpers (module-level)
// ================================================================

export function calculateScore(state: ButterflyStateV2): number {
  return Math.max(
    0,
    1000 -
      state.loopNumber * 50 -
      state.anchoredCausals.length * 30 +
      state.insightPoints * 20 +
      Object.values(state.npcs).reduce((sum, n) => {
        const npc = n as NPCStateV2;
        return (
          sum + (npc.awakeningStage === "unstable" ? -50 : npc.memoryAwakening)
        );
      }, 0),
  );
}

export function getRating(score: number): "S" | "A" | "B" | "C" {
  if (score >= 900) return "S";
  if (score >= 700) return "A";
  if (score >= 500) return "B";
  return "C";
}

// ================================================================
// Hook
// ================================================================

export function useButterfly() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loopPrep, setLoopPrep] = useState<LoopPreparation | null>(null);

  const startNewLoop = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
	      // Fire-and-forget: prepare-loop runs in background, doesn't block UI
	      fetch("/api/butterfly/prepare-loop", {
	        method: "POST",
	        headers: { "Content-Type": "application/json" },
	        body: JSON.stringify({
	          loopNumber: state.loopNumber,
	          previousCausalGraph: state.causalGraph,
	          npcStates: state.npcs,
	          activeMystery: state.activeMystery,
	        }),
	      }).then(async (prepRes) => {
	        if (prepRes.ok) {
	          const prepData = await prepRes.json();
	          if (!prepData.error) setLoopPrep(prepData as LoopPreparation);
	        }
	      }).catch(() => {}); // silent — prepare-loop is optional
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
      dispatch({
        type: "SET_ERROR",
        payload: err instanceof Error ? err.message : "AI调用失败",
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [state]);

  const sendAction = useCallback(
    async (
      actionType: "talk" | "investigate" | "intervene",
      playerInput: string,
      targetNPC?: string,
    ) => {
      // Route: investigate with possible local cache hit
      if (actionType === "investigate" && state.currentLocation) {
        const handled = quickInvestigate(state.currentLocation, playerInput);
        if (handled) return; // locally resolved, skip API
      }

      // ---- V2: Consume AP before fetch ----
      const apCost: Record<typeof actionType, number> = {
        talk: 1,
        investigate: 2,
        intervene: 3,
      };
      dispatch({ type: "USE_AP", payload: apCost[actionType] });

      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: "" });

      // Add player message
      if (targetNPC) {
        dispatch({
          type: "ADD_DIALOGUE",
          payload: {
            role: "player",
            npcName: targetNPC,
            content: playerInput,
          },
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
                    payload: {
                      role: "npc",
                      npcName: d.npcName,
                      content: d.dialogue,
                    },
                  });
                }

                // Handle causal impact
                if (d.hasCausalImpact && d.causalNode) {
                  dispatch({
                    type: "ADD_CAUSAL_NODE",
                    payload: d.causalNode,
                  });
                }

                // Handle result
                if (d.result) {
                  dispatch({ type: "SET_SCENE", payload: d });
                }

                // ---- V2: Collect causalFragments & timelineNodes from SSE ----
                if (d.causalFragments && d.causalFragments.length > 0) {
                  dispatch({
                    type: "ADD_FRAGMENTS",
                    payload: d.causalFragments,
                  });
                }

                if (
                  d.timelineNodesUnlocked &&
                  d.timelineNodesUnlocked.length > 0
                ) {
                  dispatch({
                    type: "UNLOCK_TIMELINE_NODES",
                    payload: d.timelineNodesUnlocked,
                  });
                }

                // Add to journal & award insight on discovery / newClue
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
                  // ---- V2: Award insight point ----
                  dispatch({ type: "ADD_INSIGHT", payload: 1 });
                }

                // Advance time
                dispatch({ type: "ADVANCE_TIME" });
              } else if (event.type === "error") {
                dispatch({ type: "SET_ERROR", payload: event.message });
              }
            } catch {
              // ignore parse errors on individual SSE chunks
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
    [state],
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
        ]),
      ),
    });
    // Update loop number (workaround)
    dispatch({
      type: "ADD_JOURNAL",
      payload: {
        loopNumber: nextLoop,
        timeOfDay: 7,
        content: `--- 第${nextLoop}次循环开始 ---`,
        type: "observation",
      },
    });
  }, [state]);

  // Quick move: update location locally, no API call
  const quickMove = useCallback((location: string) => {
    const LOCATIONS = ["钟楼", "花店", "诊所", "警局", "图书馆", "广场"];
    if (LOCATIONS.includes(location)) {
      dispatch({ type: "SET_LOCATION", payload: location });
      dispatch({ type: "ADD_JOURNAL", payload: {
        loopNumber: state.loopNumber,
        timeOfDay: state.timeOfDay,
        content: `移动到${location}`,
        type: "observation",
      }});
      dispatch({ type: "USE_AP", payload: 1 });
    }
  }, [state.loopNumber, state.timeOfDay]);

  // Quick investigate: check local prep cache first, returns true if handled locally
  const quickInvestigate = useCallback((location: string, action: string): boolean => {
    const matchedClue = loopPrep?.discoverableClues.find(
      c => c.location === location &&
           state.timeOfDay >= c.timeWindow.start &&
           state.timeOfDay <= c.timeWindow.end &&
           action.includes(c.requiredAction)
    );

    if (matchedClue) {
      dispatch({ type: "USE_AP", payload: 2 });
      dispatch({ type: "ADD_JOURNAL", payload: {
        loopNumber: state.loopNumber,
        timeOfDay: state.timeOfDay,
        content: `发现: ${matchedClue.description}`,
        type: "observation",
      }});
      dispatch({ type: "ADD_INSIGHT", payload: 1 });
      if (matchedClue.revealsFragment) {
        dispatch({ type: "ADD_FRAGMENTS", payload: [{
          id: matchedClue.revealsFragment,
          description: matchedClue.description,
          relatedNPCs: [],
          relatedTime: state.timeOfDay,
          relatedLocation: location,
          hints: [],
          isPlaced: false,
        }]});
      }
      return true;
    }
    return false;
  }, [loopPrep, state.timeOfDay, state.loopNumber]);

  const resetGame = useCallback(() => dispatch({ type: "RESET" }), []);

  // ---- V2: New exported functions ----

  const anchorChain = useCallback(
    (fragmentIds: string[]) => {
      dispatch({ type: "ANCHOR_CHAIN", payload: { fragmentIds } });
    },
    [],
  );

  const placeFragment = useCallback(
    (fragmentId: string, _x: number, _y: number) => {
      dispatch({ type: "PLACE_FRAGMENT", payload: { fragmentId } });
    },
    [],
  );

  const connectFragments = useCallback(
    (fromId: string, toId: string) => {
      dispatch({
        type: "CONNECT_FRAGMENTS",
        payload: { fromId, toId },
      });
    },
    [],
  );

  return {
    state,
    startNewLoop,
    sendAction,
    newLoop,
    resetGame,
    // ---- V2 exports ----
    anchorChain,
    placeFragment,
    connectFragments,
    quickMove,
    quickInvestigate,
    loopGoal: loopPrep?.loopGoal || "",
    // ---- convenience ----
    isLoading:
      (state as ButterflyStateV2 & { isLoading?: boolean }).isLoading || false,
    error:
      (state as ButterflyStateV2 & { error?: string }).error || "",
    timeOfDay: state.timeOfDay,
    isDayEnd: state.timeOfDay >= 24,
  };
}
