const SAVE_VERSION = 1;

interface SaveSlot {
  game: "symbiote" | "butterfly" | "xenogenesis";
  state: Record<string, unknown>;
  timestamp: number;
  label: string;
  version: number;
}

function saveKey(game: string, slot: number): string {
  return `aiengine_save_${game}_${slot}`;
}

export function saveGame(
  game: string,
  slot: number,
  state: Record<string, unknown>,
  label = "自动存档"
): void {
  if (typeof window === "undefined") return;
  const data: SaveSlot = { game: game as SaveSlot["game"], state, timestamp: Date.now(), label, version: SAVE_VERSION };
  try {
    localStorage.setItem(saveKey(game, slot), JSON.stringify(data));
  } catch { /* storage full */ }
}

export function loadGame(game: string, slot: number): SaveSlot | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(saveKey(game, slot));
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SaveSlot;
    if (data.version !== SAVE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function listSaves(game: string): Array<{ slot: number; label: string; timestamp: number }> {
  if (typeof window === "undefined") return [];
  const saves: Array<{ slot: number; label: string; timestamp: number }> = [];
  for (let slot = 0; slot < 4; slot++) {
    const data = loadGame(game, slot);
    if (data) saves.push({ slot, label: data.label, timestamp: data.timestamp });
  }
  return saves.sort((a, b) => b.timestamp - a.timestamp);
}

export function getLatestSave(): {
  game: string;
  slot: number;
  state: Record<string, unknown>;
  timestamp: number;
  label: string;
} | null {
  if (typeof window === "undefined") return null;
  const games = ["symbiote", "butterfly", "xenogenesis"];
  let latest: (SaveSlot & { slot: number }) | null = null;
  for (const game of games) {
    for (let slot = 0; slot < 4; slot++) {
      const data = loadGame(game, slot);
      if (data && (!latest || data.timestamp > latest.timestamp)) {
        latest = { ...data, slot };
      }
    }
  }
  if (!latest) return null;
  return { game: latest.game, slot: latest.slot, state: latest.state, timestamp: latest.timestamp, label: latest.label };
}

export function deleteSave(game: string, slot: number): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(saveKey(game, slot));
}
