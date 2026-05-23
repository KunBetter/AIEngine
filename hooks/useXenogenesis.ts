"use client";

import { useReducer, useCallback } from "react";
import type { XenogenesisState, XenogenesisAIResponse, SpeciesDef } from "@/lib/types";

type Action =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string }
  | { type: "APPLY_EPOCH"; payload: XenogenesisAIResponse }
  | { type: "ADD_SPECIES"; payload: SpeciesDef }
  | { type: "SET_ENVIRONMENT"; payload: Partial<XenogenesisState["environment"]> }
  | { type: "SET_PLANET_NAME"; payload: string }
  | { type: "RESET" };

const DEFAULT_ENVIRONMENT = {
  temperature: 22,
  oxygenLevel: 21,
  waterCoverage: 65,
  terrainTypes: ["ocean", "forest", "grassland"],
  activeDisasters: [],
};

const SPECIES_COLORS = ["#00ff88", "#ff6b9d", "#64b5f6", "#ffaa00", "#bb66ff", "#ff6644"];
const SPECIES_EMOJIS: Record<string, string> = {
  plant: "🌱",
  herbivore: "🐑",
  carnivore: "🐺",
  omnivore: "🐻",
  decomposer: "🍄",
};

let colorIdx = 0;
let speciesCounter = 0;

function createInitialState(): XenogenesisState {
  colorIdx = 0;
  speciesCounter = 0;
  return {
    planetName: "曙光星",
    environment: { ...DEFAULT_ENVIRONMENT },
    species: {},
    epoch: 0,
    timeline: [],
    isSimulating: false,
  };
}

function reducer(state: XenogenesisState, action: Action): XenogenesisState {
  switch (action.type) {
    case "APPLY_EPOCH": {
      const r = action.payload;
      const newSpecies = { ...state.species };

      for (const update of r.speciesUpdates) {
        if (newSpecies[update.id]) {
          newSpecies[update.id] = {
            ...newSpecies[update.id],
            population: update.newPopulation,
            status: update.status,
          };
        }
      }

      for (const mutation of r.newMutations) {
        if (newSpecies[mutation.speciesId]) {
          newSpecies[mutation.speciesId] = {
            ...newSpecies[mutation.speciesId],
            traits: {
              ...newSpecies[mutation.speciesId].traits,
              ...mutation.effect,
            },
          };
        }
      }

      for (const extinction of r.extinctions) {
        if (newSpecies[extinction]) {
          newSpecies[extinction] = { ...newSpecies[extinction], status: "extinct", population: 0 };
        }
      }

      return {
        ...state,
        epoch: r.epoch || state.epoch + 1,
        environment: {
          ...state.environment,
          ...r.environmentChange,
        },
        species: newSpecies,
        timeline: [
          ...state.timeline,
          {
            epochNumber: r.epoch || state.epoch + 1,
            narrative: r.narrative,
            populationChanges: Object.fromEntries(
              r.speciesUpdates.map((u) => [u.id, u.populationDelta])
            ),
            notableEvents: r.notableEvents,
            environmentChanges: r.environmentChange,
            interactions: r.interactions,
          },
        ],
        isSimulating: false,
        error: undefined,
      };
    }
    case "ADD_SPECIES": {
      speciesCounter++;
      const id = `species_${speciesCounter}`;
      const color = SPECIES_COLORS[colorIdx % SPECIES_COLORS.length];
      colorIdx++;
      const emoji = SPECIES_EMOJIS[action.payload.type] || "❓";

      return {
        ...state,
        species: {
          ...state.species,
          [id]: {
            ...action.payload,
            id,
            emoji,
            color,
            epochCreated: state.epoch,
            population: action.payload.population || 100,
            status: "stable",
            traits: { ...action.payload.traits },
          },
        },
      };
    }
    case "SET_ENVIRONMENT":
      return { ...state, environment: { ...state.environment, ...action.payload } };
    case "SET_PLANET_NAME":
      return { ...state, planetName: action.payload };
    case "SET_LOADING":
      return { ...state, isSimulating: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, isSimulating: false };
    case "RESET":
      return createInitialState();
    default:
      return state;
  }
}

export function useXenogenesis() {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);

  const advanceEpoch = useCallback(async () => {
    const aliveSpecies = Object.values(state.species).filter((s) => s.status !== "extinct");
    if (aliveSpecies.length === 0 && state.epoch > 0) {
      dispatch({ type: "SET_ERROR", payload: "所有物种已灭绝，无法继续演化" });
      return;
    }

    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: "" });

    try {
      const res = await fetch("/api/xenogenesis/advance-epoch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameState: state }),
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
              dispatch({
                type: "APPLY_EPOCH",
                payload: event.data as XenogenesisAIResponse,
              });
            } else if (event.type === "error") {
              dispatch({ type: "SET_ERROR", payload: event.message });
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        payload: err instanceof Error ? err.message : "网络错误",
      });
    }
  }, [state]);

  const addSpecies = useCallback((species: Omit<SpeciesDef, "id" | "emoji" | "color">) => {
    dispatch({ type: "ADD_SPECIES", payload: species as SpeciesDef });
  }, []);

  const updateEnvironment = useCallback(
    (env: Partial<XenogenesisState["environment"]>) => {
      dispatch({ type: "SET_ENVIRONMENT", payload: env });
    },
    []
  );

  const resetGame = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    state,
    advanceEpoch,
    addSpecies,
    updateEnvironment,
    resetGame,
    error: (state as XenogenesisState & { error?: string }).error || "",
  };
}
