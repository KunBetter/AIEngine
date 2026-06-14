# 三大游戏可玩性大幅改造 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform three AI-driven text games from "read-and-choose" experiences into interactive games with real player agency — System Sandbox (Xenogenesis), Causal Puzzle (Butterfly), Narrative Detective (Symbiote).

**Architecture:** Each game receives 2-4 new interactive UI components backed by refactored state hooks. Xenogenesis adds a pure-frontend behavior engine that replaces most AI calls with deterministic simulation. Butterfly adds a timeline board and causal fragment canvas for player-driven reasoning. Symbiote adds an evidence board and confrontation system for narrative detective gameplay. All changes happen in-situ within the existing Next.js App Router structure.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, DeepSeek API (via openai SDK), CSS animations (no additional libraries).

---

## File Structure Map

```
New files to create:
  lib/planet-generator.ts          — deterministic planet map generation from seed
  lib/behavior-engine.ts           — pure-logic tick simulation engine
  components/game/PlanetMap.tsx    — SVG canvas planet grid with zoom/pan
  components/game/SpeciesLab.tsx   — species creator with prediction + gene bank
  components/game/InterventionPanel.tsx — intervention token selection UI
  components/game/TimelineBoard.tsx — horizontal timeline with node interaction
  components/game/CausalCanvas.tsx  — drag-and-drop causal fragment canvas
  components/game/EvidenceBoard.tsx — draggable evidence card grid
  components/game/ConfrontationUI.tsx — full-screen confrontation interface
  components/game/ResourceBar.tsx   — HP/AP/energy resource bar (shared)
  app/api/xenogenesis/narrative/route.ts — lightweight narrative-only API
  app/api/symbiote/confront/route.ts — confrontation-specific API

Files to modify:
  lib/types.ts                      — add v2 types for all 3 games
  hooks/useXenogenesis.ts           — add behavior engine, intervention, lab integration
  hooks/useButterfly.ts             — add AP, fragments, anchoring, awakening, scoring
  hooks/useSymbiote.ts              — add evidence, trust game, confrontation, survival
  app/xenogenesis/page.tsx          — integrate PlanetMap, SpeciesLab, InterventionPanel
  app/butterfly/page.tsx            — integrate TimelineBoard, CausalCanvas, AP display
  app/symbiote/page.tsx             — integrate EvidenceBoard, ConfrontationUI, ResourceBar
  app/api/xenogenesis/advance-epoch/route.ts — reduce AI calls, accept behavior engine data
  app/api/butterfly/action/route.ts — add causal fragment + timeline output
  app/api/butterfly/loop-start/route.ts — add anchoring effect retention
  app/api/symbiote/action/route.ts  — add evidence output + trust strategy fields
  lib/prompts/symbiote/system.ts    — update for evidence + confrontation output format
  lib/prompts/butterfly/system.ts   — update for fragment + timeline output format
  lib/prompts/xenogenesis/system.ts — simplify for narrative-only role
  components/ui/PixelEvent.tsx      — add 6 new event types
  components/ui/StatBar.tsx         — add animation transitions, segmented colors
  app/globals.css                   — add new keyframes + utility classes
```

---

## Phase 1: Xenogenesis — System Sandbox (~5-7 days)

### Task 1.1: Add Xenogenesis v2 types to lib/types.ts

**Files:**
- Modify: `lib/types.ts` (append new types)

- [ ] **Step 1: Add terrain, tile, individual, lab, and intervention types**

Add the following types at the end of `lib/types.ts` (before the last line):

```typescript
// ---- 异星造物主 v2 类型 ----

export type TerrainType = "ocean" | "coast" | "forest" | "grassland" | "desert" | "mountain" | "volcano" | "tundra";

export interface PlanetTile {
  x: number;
  y: number;
  terrain: TerrainType;
  resources: { food: number; water: number; shelter: number };
  temperatureMod: number;
  special?: "geothermal" | "fertile" | "toxic" | "radioactive";
  occupantIds: string[];
}

export interface SpeciesIndividual {
  id: string;
  speciesId: string;
  x: number;
  y: number;
  hunger: number;
  health: number;
  age: number;
  state: BehaviorState;
}

export type BehaviorState =
  | "idle"
  | "foraging"
  | "hunting"
  | "fleeing"
  | "mating"
  | "resting"
  | "migrating"
  | "dying";

export interface TickResult {
  tick: number;
  individuals: SpeciesIndividual[];
  events: TickEvent[];
  populationChanges: Record<string, number>;
  extinctions: string[];
}

export interface TickEvent {
  type: "predation" | "birth" | "death" | "mutation" | "migration" | "starvation" | "disaster";
  description: string;
  speciesId?: string;
  individualId?: string;
  location?: { x: number; y: number };
}

export interface InterventionAction {
  id: string;
  label: string;
  description: string;
  cost: number;
  targetType: "species" | "tile" | "global";
  apply: (state: XenogenesisStateV2) => XenogenesisStateV2;
}

export interface XenogenesisStateV2 extends XenogenesisState {
  planetTiles: PlanetTile[][];
  individuals: SpeciesIndividual[];
  interventionTokens: number;
  maxInterventionTokens: number;
  disasterWarnings: DisasterWarning[];
  speciesLab: SpeciesLabState;
  isEpochRunning: boolean;
  currentTick: number;
  totalTicks: number;
}

export interface DisasterWarning {
  type: "meteor" | "ice_age" | "plague" | "solar_flare";
  probability: number;
  description: string;
  suggestion: string;
}

export interface SpeciesLabState {
  candidates: SpeciesDesign[];
  bioEnergy: number;
  maxBioEnergy: number;
  bioEnergyRegen: number;
  geneBank: ArchivedGene[];
}

export interface SpeciesDesign {
  name: string;
  type: SpeciesDef["type"];
  traits: SpeciesTraits;
  predictedScore: number;
  foodChainPosition: number;
  synergyWithExisting: string[];
  riskFactors: string[];
}

export interface ArchivedGene {
  id: string;
  speciesName: string;
  epochExtinct: number;
  traits: SpeciesTraits;
  specialAbility?: string;
  extinctionCause: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to the new types (pre-existing project errors unrelated to our changes are acceptable)

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(xeno): add v2 types for planet map, behavior engine, intervention, species lab"
```

---

### Task 1.2: Create planet map generator

**Files:**
- Create: `lib/planet-generator.ts`

- [ ] **Step 1: Write the generator**

Create `lib/planet-generator.ts`:

```typescript
import type { PlanetTile, TerrainType } from "@/lib/types";

/**
 * Simple seeded PRNG (Mulberry32)
 */
export function createRNG(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convert a string seed to a numeric seed
 */
export function seedToNumber(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * Simple value noise (approximates Perlin for terrain generation)
 */
function noise2D(x: number, y: number, rng: () => number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const a = hashCell(ix, iy, rng);
  const b = hashCell(ix + 1, iy, rng);
  const c = hashCell(ix, iy + 1, rng);
  const d = hashCell(ix + 1, iy + 1, rng);

  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const ab = a + (b - a) * sx;
  const cd = c + (d - c) * sx;
  return ab + (cd - ab) * sy;
}

function hashCell(x: number, y: number, rng: () => number): number {
  // Use pre-seeded values from the rng stream
  const idx = Math.abs(x * 374761393 + y * 668265263) % 10000;
  // We need deterministic values, so use the seed-based approach
  let h = idx;
  h = ((h << 5) - h) + x * 127 + y * 311;
  h = ((h << 5) - h) + 0x6d2b79f5;
  h = Math.imul(h ^ (h >>> 15), 1 | h);
  h = (h + Math.imul(h ^ (h >>> 7), 61 | h)) ^ h;
  return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
}

function determineTerrain(
  elevation: number,
  moisture: number,
  temperature: number,
  waterCoverage: number
): TerrainType {
  // Water bodies
  if (elevation < waterCoverage / 100 * 0.7) return "ocean";
  if (elevation < waterCoverage / 100 * 0.75) return "coast";

  // Land terrain based on elevation, moisture, and temperature
  if (elevation > 0.8) return temperature < 0.3 ? "tundra" : "mountain";
  if (elevation > 0.65) {
    if (temperature > 0.6 && moisture < 0.3) return "desert";
    return "mountain";
  }

  if (moisture < 0.25) return temperature > 0.5 ? "desert" : "grassland";
  if (moisture < 0.5) return "grassland";
  if (temperature > 0.3 && moisture > 0.6) return "forest";
  if (temperature < 0.2) return "tundra";
  return "grassland";
}

export interface PlanetConfig {
  width: number;
  height: number;
  seed: string;
  waterCoverage: number;   // 0-100
  globalTemperature: number; // -20 to 60
}

export function generatePlanet(config: PlanetConfig): PlanetTile[][] {
  const { width, height, seed, waterCoverage, globalTemperature } = config;
  const rng = createRNG(seedToNumber(seed));

  const tiles: PlanetTile[][] = [];

  for (let y = 0; y < height; y++) {
    const row: PlanetTile[] = [];
    for (let x = 0; x < width; x++) {
      // Latitude-based temperature modifier
      const latitude = Math.abs(y - height / 2) / (height / 2);
      const tempMod = Math.round((0.5 - latitude) * 10);

      // Elevation noise
      const elevation = noise2D(x * 0.15, y * 0.15, rng) * 0.6 +
                        noise2D(x * 0.05, y * 0.05, rng) * 0.4;

      // Moisture noise
      const moisture = noise2D(x * 0.12 + 100, y * 0.12 + 100, rng);

      // Local temperature
      const localTemp = globalTemperature + tempMod;

      const terrain = determineTerrain(elevation, moisture, localTemp / 60 + 0.5, waterCoverage);

      // Resource calculation
      const isWater = terrain === "ocean" || terrain === "coast";
      const foodBase = terrain === "forest" ? 8 : terrain === "grassland" ? 6 : terrain === "coast" ? 4 : terrain === "desert" ? 1 : terrain === "tundra" ? 1 : 3;
      const waterBase = isWater ? 10 : terrain === "forest" ? 7 : terrain === "grassland" ? 5 : terrain === "desert" ? 1 : 3;
      const shelterBase = terrain === "mountain" ? 8 : terrain === "forest" ? 7 : terrain === "grassland" ? 3 : terrain === "desert" ? 1 : 2;

      // Special features (5% chance)
      let special: PlanetTile["special"] = undefined;
      const specialRoll = rng();
      if (specialRoll < 0.02 && terrain === "mountain") special = "geothermal";
      else if (specialRoll < 0.04 && terrain === "forest") special = "fertile";
      else if (specialRoll < 0.06 && terrain === "desert") special = "toxic";
      else if (specialRoll < 0.08 && terrain === "tundra") special = "radioactive";

      row.push({
        x, y, terrain,
        resources: {
          food: Math.round(foodBase + rng() * 3),
          water: Math.round(waterBase + rng() * 2),
          shelter: Math.round(shelterBase + rng() * 2),
        },
        temperatureMod: tempMod,
        special,
        occupantIds: [],
      });
    }
    tiles.push(row);
  }

  return tiles;
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors in planet-generator.ts

- [ ] **Step 3: Commit**

```bash
git add lib/planet-generator.ts
git commit -m "feat(xeno): add deterministic planet map generator with terrain, resources, specials"
```

---

### Task 1.3: Create behavior engine

**Files:**
- Create: `lib/behavior-engine.ts`

- [ ] **Step 1: Write the behavior engine**

Create `lib/behavior-engine.ts`:

```typescript
import type {
  SpeciesIndividual,
  BehaviorState,
  PlanetTile,
  SpeciesDef,
  TickResult,
  TickEvent,
  XenogenesisStateV2,
} from "@/lib/types";

const TICKS_PER_EPOCH = 100;
const MAX_INDIVIDUALS = 500; // Switch to statistical mode above this

// ---- Individual creation ----

export function createIndividuals(
  species: SpeciesDef,
  count: number,
  tiles: PlanetTile[][],
): SpeciesIndividual[] {
  const individuals: SpeciesIndividual[] = [];
  const habitableTiles = findHabitableTiles(species, tiles);

  if (habitableTiles.length === 0) return individuals;

  for (let i = 0; i < count; i++) {
    const tile = habitableTiles[Math.floor(Math.random() * habitableTiles.length)];
    individuals.push({
      id: `${species.id}_ind_${i}_${Date.now()}`,
      speciesId: species.id,
      x: tile.x,
      y: tile.y,
      hunger: 20 + Math.random() * 30,
      health: 80 + Math.random() * 20,
      age: 0,
      state: "idle",
    });
  }

  return individuals;
}

function findHabitableTiles(species: SpeciesDef, tiles: PlanetTile[][]): PlanetTile[] {
  const habitable: PlanetTile[] = [];
  const isAquatic = species.traits.specialAbility?.includes("水栖");
  const optimalTemp = 22;

  for (const row of tiles) {
    for (const tile of row) {
      const isWater = tile.terrain === "ocean" || tile.terrain === "coast";
      // Aquatic species need water tiles, terrestrial need land
      if (isAquatic && !isWater) continue;
      if (!isAquatic && isWater) continue;

      // Temperature tolerance based on adaptability
      const tempTolerance = species.traits.adaptability * 3;
      const effectiveTemp = optimalTemp + tile.temperatureMod;
      if (Math.abs(effectiveTemp - optimalTemp) > tempTolerance + 15) continue;

      habitable.push(tile);
    }
  }
  return habitable;
}

// ---- Main tick function ----

export function runTick(
  state: XenogenesisStateV2,
  tick: number,
): TickResult {
  const events: TickEvent[] = [];
  let individuals = [...state.individuals];

  // Skip if no individuals
  if (individuals.length === 0) {
    return { tick, individuals: [], events, populationChanges: {}, extinctions: [] };
  }

  // 1. Update hunger (metabolism drives hunger rate)
  for (const ind of individuals) {
    const species = state.species[ind.speciesId];
    if (!species) continue;
    const hungerRate = 1 + (species.traits.metabolism - 5) * 0.4;
    ind.hunger = Math.min(100, ind.hunger + hungerRate);
    ind.age++;
  }

  // 2. Determine behavior states
  for (const ind of individuals) {
    if (ind.state === "dying") continue;

    const species = state.species[ind.speciesId];
    if (!species) continue;

    // Priority: flee > eat > mate > migrate > idle
    const threats = individuals.filter(
      other =>
        other.speciesId !== ind.speciesId &&
        other.state !== "dying" &&
        isPredator(state.species[other.speciesId], species) &&
        distance(ind, other) < 3
    );

    if (threats.length > 0) {
      ind.state = "fleeing";
    } else if (ind.hunger > 50) {
      ind.state = species.type === "carnivore" || species.type === "omnivore"
        ? "hunting"
        : "foraging";
    } else if (ind.health > 60 && ind.age > 10 && Math.random() < reproductionChance(species)) {
      ind.state = "mating";
    } else if (ind.hunger > 30 || ind.health < 40) {
      ind.state = "migrating";
    } else {
      ind.state = Math.random() < 0.7 ? "idle" : "resting";
    }
  }

  // 3. Execute behaviors
  for (const ind of individuals) {
    if (ind.state === "dying") continue;

    switch (ind.state) {
      case "foraging": {
        const tile = getTile(state.planetTiles, ind.x, ind.y);
        if (tile && tile.resources.food > 0) {
          tile.resources.food = Math.max(0, tile.resources.food - 1);
          ind.hunger = Math.max(0, ind.hunger - 25);
        } else {
          ind.hunger = Math.min(100, ind.hunger + 10);
        }
        break;
      }
      case "hunting": {
        const prey = findPrey(ind, individuals, state.species);
        if (prey) {
          const predatorSpecies = state.species[ind.speciesId];
          const preySpecies = state.species[prey.speciesId];
          const successRate = predatorSpecies && preySpecies
            ? calculateHuntSuccess(predatorSpecies, preySpecies)
            : 0.5;

          if (Math.random() < successRate) {
            prey.state = "dying";
            prey.health = 0;
            ind.hunger = Math.max(0, ind.hunger - 40);
            events.push({
              type: "predation",
              description: `${state.species[ind.speciesId]?.name} 捕食了 ${state.species[prey.speciesId]?.name}`,
              speciesId: ind.speciesId,
              individualId: ind.id,
            });
          }
        }
        break;
      }
      case "fleeing": {
        // Move away from threats
        moveAway(ind, individuals, state.planetTiles);
        break;
      }
      case "mating": {
        const mate = findMate(ind, individuals, state.species);
        if (mate) {
          const child = createOffspring(ind, state.species);
          if (child) {
            individuals.push(child);
            events.push({
              type: "birth",
              description: `${state.species[ind.speciesId]?.name} 繁殖了新个体`,
              speciesId: ind.speciesId,
              individualId: child.id,
            });
          }
        }
        break;
      }
      case "migrating": {
        moveToBetterTile(ind, state.planetTiles, state.species[ind.speciesId]);
        break;
      }
    }
  }

  // 4. Apply health changes
  for (const ind of individuals) {
    if (ind.state === "dying") continue;
    if (ind.hunger > 80) ind.health -= 3;
    else if (ind.hunger > 50) ind.health -= 1;
    else if (ind.hunger < 20) ind.health += 1;

    if (ind.age > 80 + Math.random() * 40) ind.health -= 2;

    const tile = getTile(state.planetTiles, ind.x, ind.y);
    if (tile?.special === "toxic") ind.health -= 3;
    if (tile?.special === "fertile") ind.health += 1;
  }

  // 5. Remove dead individuals
  const deadIds = new Set(
    individuals.filter(ind => ind.health <= 0 || ind.state === "dying").map(ind => ind.id)
  );

  for (const ind of individuals) {
    if (deadIds.has(ind.id)) {
      events.push({
        type: "death",
        description: `${state.species[ind.speciesId]?.name} 个体死亡`,
        speciesId: ind.speciesId,
        individualId: ind.id,
      });

      // Decomposers benefit
      const tile = getTile(state.planetTiles, ind.x, ind.y);
      if (tile) {
        tile.resources.food = Math.min(10, tile.resources.food + 2);
      }
    }
  }

  individuals = individuals.filter(ind => !deadIds.has(ind.id));

  // 6. Calculate population changes
  const populationChanges: Record<string, number> = {};
  const speciesCounts: Record<string, number> = {};

  for (const ind of individuals) {
    speciesCounts[ind.speciesId] = (speciesCounts[ind.speciesId] || 0) + 1;
  }

  for (const [speciesId, species] of Object.entries(state.species)) {
    if (species.status === "extinct") continue;
    const current = speciesCounts[speciesId] || 0;
    const previous = species.population;
    populationChanges[speciesId] = current - previous;
  }

  // 7. Check extinctions
  const extinctions: string[] = [];
  for (const [speciesId, species] of Object.entries(state.species)) {
    if (species.status === "extinct") continue;
    if (!speciesCounts[speciesId] || speciesCounts[speciesId] <= 0) {
      extinctions.push(speciesId);
    }
  }

  return {
    tick,
    individuals,
    events,
    populationChanges,
    extinctions,
  };
}

// ---- Helper functions ----

function getTile(tiles: PlanetTile[][], x: number, y: number): PlanetTile | null {
  if (y < 0 || y >= tiles.length) return null;
  if (x < 0 || x >= tiles[0].length) return null;
  return tiles[y][x];
}

function distance(a: SpeciesIndividual, b: SpeciesIndividual): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isPredator(predator: SpeciesDef | undefined, prey: SpeciesDef | undefined): boolean {
  if (!predator || !prey) return false;
  if (predator.type === "herbivore" || predator.type === "plant" || predator.type === "decomposer") return false;
  if (predator.type === "carnivore") return prey.type === "herbivore" || prey.type === "omnivore";
  if (predator.type === "omnivore") return prey.type === "herbivore" || prey.type === "plant";
  return false;
}

function calculateHuntSuccess(predator: SpeciesDef, prey: SpeciesDef): number {
  const offense = predator.traits.size * 1.5 + predator.traits.intelligence;
  const defense = prey.traits.size + prey.traits.defense * 2 + prey.traits.intelligence * 0.5;
  return Math.min(0.95, Math.max(0.05, offense / (offense + defense)));
}

function findPrey(
  hunter: SpeciesIndividual,
  individuals: SpeciesIndividual[],
  speciesMap: Record<string, SpeciesDef>,
): SpeciesIndividual | null {
  const candidates = individuals.filter(other => {
    if (other.speciesId === hunter.speciesId) return false;
    if (other.state === "dying") return false;
    const hunterSpecies = speciesMap[hunter.speciesId];
    const preySpecies = speciesMap[other.speciesId];
    return isPredator(hunterSpecies, preySpecies) && distance(hunter, other) < 5;
  });

  if (candidates.length === 0) return null;
  // Target the weakest
  candidates.sort((a, b) => a.health - b.health);
  return candidates[0];
}

function findMate(
  individual: SpeciesIndividual,
  individuals: SpeciesIndividual[],
  speciesMap: Record<string, SpeciesDef>,
): SpeciesIndividual | null {
  const candidates = individuals.filter(other =>
    other.speciesId === individual.speciesId &&
    other.id !== individual.id &&
    other.state === "mating" &&
    distance(individual, other) < 2
  );
  return candidates.length > 0 ? candidates[0] : null;
}

function createOffspring(
  parent: SpeciesIndividual,
  speciesMap: Record<string, SpeciesDef>,
): SpeciesIndividual | null {
  const species = speciesMap[parent.speciesId];
  if (!species) return null;

  return {
    id: `${parent.speciesId}_ind_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    speciesId: parent.speciesId,
    x: parent.x + (Math.random() - 0.5) * 2,
    y: parent.y + (Math.random() - 0.5) * 2,
    hunger: 10,
    health: 70 + Math.random() * 30,
    age: 0,
    state: "idle",
  };
}

function reproductionChance(species: SpeciesDef): number {
  return Math.min(0.3, species.traits.reproduction / 30);
}

function moveAway(
  individual: SpeciesIndividual,
  allIndividuals: SpeciesIndividual[],
  tiles: PlanetTile[][],
): void {
  const threats = allIndividuals.filter(
    other => other.speciesId !== individual.speciesId && distance(individual, other) < 4
  );
  if (threats.length === 0) return;

  let avgDx = 0;
  let avgDy = 0;
  for (const threat of threats) {
    avgDx += individual.x - threat.x;
    avgDy += individual.y - threat.y;
  }
  avgDx /= threats.length;
  avgDy /= threats.length;

  const speed = 2;
  const newX = clamp(Math.round(individual.x + Math.sign(avgDx) * speed), 0, (tiles[0]?.length || 60) - 1);
  const newY = clamp(Math.round(individual.y + Math.sign(avgDy) * speed), 0, tiles.length - 1);

  individual.x = newX;
  individual.y = newY;
}

function moveToBetterTile(
  individual: SpeciesIndividual,
  tiles: PlanetTile[][],
  species: SpeciesDef | undefined,
): void {
  if (!species) return;
  const habitable = findHabitableTiles(species, tiles);
  if (habitable.length === 0) return;

  // Find tile with most resources
  let best = habitable[0];
  for (const tile of habitable) {
    const currentScore = best.resources.food + best.resources.water;
    const tileScore = tile.resources.food + tile.resources.water;
    if (tileScore > currentScore) best = tile;
  }

  individual.x = Math.round(best.x + (Math.random() - 0.5) * 4);
  individual.y = Math.round(best.y + (Math.random() - 0.5) * 4);
  individual.x = clamp(individual.x, 0, (tiles[0]?.length || 60) - 1);
  individual.y = clamp(individual.y, 0, tiles.length - 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---- Statistical mode (for large populations) ----

export function runTickStatistical(
  state: XenogenesisStateV2,
  tick: number,
): TickResult {
  // When populations are large, use statistical formulas instead of
  // individual simulation to keep performance acceptable.
  const events: TickEvent[] = [];
  const populationChanges: Record<string, number> = {};
  const extinctions: string[] = [];

  for (const [speciesId, species] of Object.entries(state.species)) {
    if (species.status === "extinct") continue;

    const pop = species.population;
    const growthRate = calculateGrowthRate(species, state);

    // Random fluctuation
    const fluctuation = (Math.random() - 0.5) * pop * 0.05;
    const delta = Math.round(pop * growthRate + fluctuation);
    const newPop = Math.max(0, pop + delta);

    populationChanges[speciesId] = delta;

    if (newPop <= 0 && pop > 0) {
      extinctions.push(speciesId);
    }
  }

  return {
    tick,
    individuals: [], // Statistical mode doesn't track individuals
    events,
    populationChanges,
    extinctions,
  };
}

function calculateGrowthRate(species: SpeciesDef, state: XenogenesisStateV2): number {
  const base = 0.02;
  const foodBonus = (10 - species.traits.metabolism) * 0.005;
  const reproBonus = (species.traits.reproduction - 5) * 0.01;
  const adaptBonus = (species.traits.adaptability - 5) * 0.005;

  // Population pressure
  const carryingCapacity = 300;
  const popPressure = 1 - species.population / carryingCapacity;

  return (base + foodBonus + reproBonus + adaptBonus) * Math.max(-0.5, popPressure);
}

export { TICKS_PER_EPOCH, MAX_INDIVIDUALS };
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors in behavior-engine.ts

- [ ] **Step 3: Commit**

```bash
git add lib/behavior-engine.ts
git commit -m "feat(xeno): add behavior engine with individual and statistical simulation modes"
```

---

### Task 1.4: Create PlanetMap component

**Files:**
- Create: `components/game/PlanetMap.tsx`

- [ ] **Step 1: Write PlanetMap component**

Create `components/game/PlanetMap.tsx`:

```typescript
"use client";

import { useState, useRef, useCallback } from "react";
import type { PlanetTile, SpeciesIndividual, SpeciesDef } from "@/lib/types";

const TERRAIN_COLORS: Record<string, string> = {
  ocean: "#1a3a5c",
  coast: "#2a5a7c",
  forest: "#1a4a1a",
  grassland: "#3a5a2a",
  desert: "#8a7a4a",
  mountain: "#5a5a5a",
  volcano: "#4a2a2a",
  tundra: "#9a9a9a",
};

const TILE_SIZE = 8;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

interface PlanetMapProps {
  tiles: PlanetTile[][];
  individuals: SpeciesIndividual[];
  species: Record<string, SpeciesDef>;
  showHeatmap?: boolean;
  onTileClick?: (tile: PlanetTile) => void;
  selectedTile?: { x: number; y: number } | null;
}

export function PlanetMap({
  tiles,
  individuals,
  species,
  showHeatmap = false,
  onTileClick,
  selectedTile,
}: PlanetMapProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const height = tiles.length;
  const width = tiles[0]?.length || 0;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsPanning(true);
    panStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setOffset({
      x: e.clientX - panStart.current.x,
      y: e.clientY - panStart.current.y,
    });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Individual positions by tile for rendering
  const individualMap = new Map<string, { speciesId: string; count: number }>();
  for (const ind of individuals) {
    const key = `${Math.round(ind.x)},${Math.round(ind.y)}`;
    const existing = individualMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      individualMap.set(key, { speciesId: ind.speciesId, count: 1 });
    }
  }

  const viewWidth = (containerRef.current?.clientWidth || 600);
  const viewHeight = 300;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg border border-[#2a2a4a] bg-[#0a0a1a]"
      style={{ height: viewHeight, cursor: isPanning ? "grabbing" : "grab" }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        width={width * TILE_SIZE * zoom}
        height={height * TILE_SIZE * zoom}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
        }}
      >
        {/* Tiles */}
        {tiles.map((row, y) =>
          row.map((tile, x) => {
            const indKey = `${x},${y}`;
            const indData = individualMap.get(indKey);
            const isSelected = selectedTile?.x === x && selectedTile?.y === y;

            // Heatmap overlay
            let fillColor = TERRAIN_COLORS[tile.terrain] || "#333";
            if (showHeatmap && indData) {
              const alpha = Math.min(1, indData.count / 10);
              fillColor = `rgba(255, 100, 100, ${alpha * 0.5})`;
            }

            return (
              <g key={`${x}-${y}`}>
                <rect
                  x={x * TILE_SIZE * zoom}
                  y={y * TILE_SIZE * zoom}
                  width={TILE_SIZE * zoom}
                  height={TILE_SIZE * zoom}
                  fill={fillColor}
                  stroke={isSelected ? "#fff" : "transparent"}
                  strokeWidth={isSelected ? 1 : 0}
                  className="hover:brightness-125 transition-colors"
                  onClick={() => onTileClick?.(tile)}
                />
                {/* Special tile indicator */}
                {tile.special && (
                  <rect
                    x={x * TILE_SIZE * zoom + 1}
                    y={y * TILE_SIZE * zoom + 1}
                    width={TILE_SIZE * zoom - 2}
                    height={TILE_SIZE * zoom - 2}
                    fill="none"
                    stroke={tile.special === "geothermal" ? "#ff6644" : tile.special === "fertile" ? "#44ff44" : tile.special === "toxic" ? "#88ff00" : "#ffff00"}
                    strokeWidth={0.5}
                    strokeDasharray="1 1"
                  />
                )}
              </g>
            );
          })
        )}

        {/* Individuals as dots */}
        {!showHeatmap &&
          individuals.map((ind) => {
            const speciesDef = species[ind.speciesId];
            if (!speciesDef) return null;
            return (
              <circle
                key={ind.id}
                cx={ind.x * TILE_SIZE * zoom + (TILE_SIZE * zoom) / 2}
                cy={ind.y * TILE_SIZE * zoom + (TILE_SIZE * zoom) / 2}
                r={Math.max(1.5, TILE_SIZE * zoom * 0.3)}
                fill={speciesDef.color}
                opacity={ind.state === "dying" ? 0.3 : 0.8}
              />
            );
          })}
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-2 right-2 flex gap-1">
        <button
          onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 0.2))}
          className="w-6 h-6 rounded bg-[#1a1a2e] text-gray-400 text-xs hover:text-white"
        >
          +
        </button>
        <button
          onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 0.2))}
          className="w-6 h-6 rounded bg-[#1a1a2e] text-gray-400 text-xs hover:text-white"
        >
          −
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors in PlanetMap.tsx

- [ ] **Step 3: Commit**

```bash
git add components/game/PlanetMap.tsx
git commit -m "feat(xeno): add PlanetMap component with zoom, pan, heatmap, individual rendering"
```

---

### Task 1.5: Create SpeciesLab component

**Files:**
- Create: `components/game/SpeciesLab.tsx`

- [ ] **Step 1: Write SpeciesLab component**

Create `components/game/SpeciesLab.tsx`:

```typescript
"use client";

import { useState } from "react";
import type { SpeciesTraits, SpeciesDef, SpeciesDesign, ArchivedGene, SpeciesLabState } from "@/lib/types";

const TRAIT_LABELS: Record<string, string> = {
  size: "体型", metabolism: "代谢", reproduction: "繁殖",
  intelligence: "智力", defense: "防御", adaptability: "适应",
};

const SPECIES_COLORS = ["#00ff88", "#ff6b9d", "#64b5f6", "#ffaa00", "#bb66ff", "#ff6644"];

interface SpeciesLabProps {
  lab: SpeciesLabState;
  existingSpecies: Record<string, SpeciesDef>;
  environment: { temperature: number; oxygenLevel: number; waterCoverage: number };
  onCreateSpecies: (design: SpeciesDesign) => void;
  onClose: () => void;
}

export function SpeciesLab({
  lab,
  existingSpecies,
  environment,
  onCreateSpecies,
  onClose,
}: SpeciesLabProps) {
  const [candidates, setCandidates] = useState<SpeciesDesign[]>([...lab.candidates]);
  const [activeCandidate, setActiveCandidate] = useState(0);
  const [name, setName] = useState("");
  const [type, setType] = useState<SpeciesDef["type"]>("herbivore");
  const [traits, setTraits] = useState<SpeciesTraits>({
    size: 5, metabolism: 5, reproduction: 5,
    intelligence: 3, defense: 3, adaptability: 5,
  });
  const [geneSource, setGeneSource] = useState<string | null>(null);
  const [tab, setTab] = useState<"create" | "candidates" | "geneBank">("create");

  // Calculate predicted score for current trait set
  const predictedScore = calculatePredictedScore(traits, type, environment);

  // Synergies with existing species
  const synergies = findSynergies(type, traits, existingSpecies);

  // Risk factors
  const risks = findRisks(type, traits, environment, existingSpecies);

  const handleAddCandidate = () => {
    if (!name.trim()) return;
    const design: SpeciesDesign = {
      name: name.trim(),
      type,
      traits: { ...traits },
      predictedScore,
      foodChainPosition: getFoodChainPosition(type, existingSpecies),
      synergyWithExisting: synergies,
      riskFactors: risks,
    };
    setCandidates(prev => [...prev, design].slice(0, 3));
    setName("");
  };

  const handleCreate = (design: SpeciesDesign) => {
    if (lab.bioEnergy < 20) return;
    onCreateSpecies(design);
    setCandidates(prev => prev.filter(d => d !== design));
  };

  const handleLoadGene = (gene: ArchivedGene) => {
    setTraits({ ...gene.traits });
    setGeneSource(gene.speciesName);
  };

  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">🧬 物种实验室</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            ⚡ 生物能量: {lab.bioEnergy}/{lab.maxBioEnergy}
          </span>
          <button onClick={onClose} className="text-xs text-gray-600 hover:text-white">[关闭]</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-[#2a2a4a] pb-2">
        {(["create", "candidates", "geneBank"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-xs px-3 py-1 rounded-t ${
              tab === t ? "bg-[#1a1a2e] text-[#64b5f6]" : "text-gray-500 hover:text-white"
            }`}
          >
            {t === "create" && "🔬 设计"}
            {t === "candidates" && `📋 候选 (${candidates.length})`}
            {t === "geneBank" && `🧬 基因库 (${lab.geneBank.length})`}
          </button>
        ))}
      </div>

      {/* Create Tab */}
      {tab === "create" && (
        <div className="space-y-4">
          <div className="flex gap-4 flex-wrap items-end">
            <div>
              <label className="text-xs text-gray-500 block mb-1">物种名</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-32 px-3 py-1.5 rounded bg-[#0a0a1a] border border-[#2a2a4a] text-sm text-white"
                placeholder="如：鳞行者"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">类型</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as SpeciesDef["type"])}
                className="px-3 py-1.5 rounded bg-[#0a0a1a] border border-[#2a2a4a] text-sm text-white"
              >
                <option value="plant">🌱 植物</option>
                <option value="herbivore">🐑 草食</option>
                <option value="carnivore">🐺 肉食</option>
                <option value="omnivore">🐻 杂食</option>
                <option value="decomposer">🍄 分解者</option>
              </select>
            </div>
            {geneSource && (
              <span className="text-xs text-[#64b5f6]">基于: {geneSource} 的基因</span>
            )}
          </div>

          {/* Trait sliders */}
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(TRAIT_LABELS) as Array<keyof typeof TRAIT_LABELS>).map((key) => (
              <div key={key}>
                <label className="text-xs text-gray-500 block mb-1">
                  {TRAIT_LABELS[key]} ({traits[key]})
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={traits[key]}
                  onChange={(e) => setTraits(t => ({ ...t, [key]: Number(e.target.value) }))}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          {/* Prediction */}
          <div className="bg-[#1a1a2e] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">适应性预测</span>
              <span className={`text-sm font-bold ${
                predictedScore > 70 ? "text-green-400" : predictedScore > 40 ? "text-yellow-400" : "text-red-400"
              }`}>{predictedScore}/100</span>
            </div>
            {synergies.length > 0 && (
              <div className="text-xs text-green-400/60">✓ {synergies.join("; ")}</div>
            )}
            {risks.length > 0 && (
              <div className="text-xs text-red-400/60">⚠ {risks.join("; ")}</div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddCandidate}
              disabled={!name.trim() || candidates.length >= 3}
              className="px-4 py-1.5 rounded bg-[#64b5f6]/20 border border-[#64b5f6]/40 text-[#64b5f6] text-xs
                       hover:bg-[#64b5f6]/30 disabled:opacity-30"
            >
              加入候选 ({candidates.length}/3)
            </button>
            {candidates.length > 0 && (
              <button
                onClick={() => handleCreate(candidates[0])}
                disabled={lab.bioEnergy < 20}
                className="px-4 py-1.5 rounded bg-[#00ff88]/20 border border-[#00ff88]/40 text-[#00ff88] text-xs
                         hover:bg-[#00ff88]/30 disabled:opacity-30"
              >
                投放 (消耗 20 能量)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Candidates Tab */}
      {tab === "candidates" && (
        <div className="space-y-2">
          {candidates.length === 0 ? (
            <p className="text-xs text-gray-600">暂无候选物种。在"设计"标签创建。</p>
          ) : (
            candidates.map((c, i) => (
              <div key={i} className={`p-3 rounded-lg border ${
                i === activeCandidate ? "border-[#64b5f6] bg-[#64b5f6]/5" : "border-[#2a2a4a]"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white font-bold">{c.name}</span>
                  <span className="text-xs text-gray-500">{c.type} | 评分: {c.predictedScore}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(c.traits).filter(([k]) => k !== "specialAbility").map(([k, v]) => (
                    <span key={k} className="text-[10px] px-1 py-0.5 rounded bg-[#1a1a2e] text-gray-400">
                      {TRAIT_LABELS[k] || k}:{v}
                    </span>
                  ))}
                </div>
                {c.riskFactors.length > 0 && (
                  <p className="text-[10px] text-red-400/60 mt-1">⚠ {c.riskFactors.join(", ")}</p>
                )}
                <button
                  onClick={() => handleCreate(c)}
                  disabled={lab.bioEnergy < 20}
                  className="mt-2 px-3 py-1 rounded bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] text-[10px]
                           hover:bg-[#00ff88]/20 disabled:opacity-30"
                >
                  投放此物种
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Gene Bank Tab */}
      {tab === "geneBank" && (
        <div className="space-y-2">
          {lab.geneBank.length === 0 ? (
            <p className="text-xs text-gray-600">基因库为空。物种灭绝后其基因会自动存档。</p>
          ) : (
            lab.geneBank.map((gene) => (
              <div key={gene.id} className="p-3 rounded-lg border border-[#2a2a4a] opacity-60 hover:opacity-100 transition-opacity">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 line-through">{gene.speciesName}</span>
                  <span className="text-xs text-red-400">灭绝于纪元{gene.epochExtinct}</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">死因: {gene.extinctionCause}</p>
                <button
                  onClick={() => handleLoadGene(gene)}
                  className="mt-2 px-3 py-1 rounded bg-[#bb66ff]/10 border border-[#bb66ff]/30 text-[#bb66ff] text-[10px]
                           hover:bg-[#bb66ff]/20"
                >
                  以此基因为基础创建
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ---- Prediction helpers ----

function calculatePredictedScore(
  traits: SpeciesTraits,
  type: SpeciesDef["type"],
  env: { temperature: number; oxygenLevel: number; waterCoverage: number },
): number {
  let score = 50;

  // Balanced traits are generally better
  const traitValues = Object.values(traits).filter(v => typeof v === "number") as number[];
  const avg = traitValues.reduce((a, b) => a + b, 0) / traitValues.length;
  const variance = traitValues.reduce((sum, v) => sum + (v - avg) ** 2, 0) / traitValues.length;
  score -= variance * 2; // Penalize extreme specialization

  // Type-specific bonuses
  if (type === "plant") score += traits.adaptability * 2;
  if (type === "carnivore") score += (traits.intelligence + traits.size) * 0.5;
  if (type === "herbivore") score += traits.reproduction * 0.5;
  if (type === "decomposer") score += traits.metabolism * 0.5;

  // Environment fit
  if (env.oxygenLevel < 15) score -= 10;
  if (env.temperature > 40 || env.temperature < 0) score -= 15;

  return Math.round(Math.max(5, Math.min(95, score)));
}

function findSynergies(
  type: SpeciesDef["type"],
  traits: SpeciesTraits,
  existing: Record<string, SpeciesDef>,
): string[] {
  const result: string[] = [];
  const existingTypes = new Set(Object.values(existing).map(s => s.type));

  if (type === "decomposer" && !existingTypes.has("decomposer"))
    result.push("提供分解服务，完善营养循环");
  if (type === "plant" && existingTypes.has("herbivore"))
    result.push("为现有草食动物提供食物");
  if (type === "carnivore" && existingTypes.has("herbivore"))
    result.push("可控制草食物种数量");

  return result;
}

function findRisks(
  type: SpeciesDef["type"],
  traits: SpeciesTraits,
  env: { temperature: number; oxygenLevel: number; waterCoverage: number },
  existing: Record<string, SpeciesDef>,
): string[] {
  const result: string[] = [];

  if (traits.metabolism > 8 && traits.reproduction < 3) result.push("高代谢低繁殖可能导致灭绝");
  if (traits.size < 3 && traits.defense < 4) result.push("脆弱易被捕食");
  if (type === "carnivore" && !Object.values(existing).some(s => s.type === "herbivore"))
    result.push("没有猎物物种");
  if (env.oxygenLevel < 12) result.push("低氧环境压力");
  if (env.temperature > 45 || env.temperature < -10) result.push("极端温度威胁");

  return result;
}

function getFoodChainPosition(
  type: SpeciesDef["type"],
  existing: Record<string, SpeciesDef>,
): number {
  switch (type) {
    case "plant": return 1;
    case "decomposer": return 1;
    case "herbivore": return 2;
    case "omnivore": return 3;
    case "carnivore": {
      const hasCarnivores = Object.values(existing).some(s => s.type === "carnivore");
      return hasCarnivores ? 4 : 3;
    }
    default: return 2;
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors in SpeciesLab.tsx

- [ ] **Step 3: Commit**

```bash
git add components/game/SpeciesLab.tsx
git commit -m "feat(xeno): add SpeciesLab with trait prediction, candidates, gene bank"
```

---

### Task 1.6: Create InterventionPanel component

**Files:**
- Create: `components/game/InterventionPanel.tsx`

- [ ] **Step 1: Write InterventionPanel**

Create `components/game/InterventionPanel.tsx`:

```typescript
"use client";

import type { DisasterWarning } from "@/lib/types";

interface InterventionAction {
  id: string;
  label: string;
  emoji: string;
  description: string;
  cost: number;
  disabled?: boolean;
  disabledReason?: string;
}

interface InterventionPanelProps {
  tokens: number;
  maxTokens: number;
  warnings: DisasterWarning[];
  onIntervene: (actionId: string) => void;
  onClose: () => void;
}

const INTERVENTIONS: InterventionAction[] = [
  { id: "mutate", emoji: "🧬", label: "催化突变", description: "选中物种获得随机正面突变", cost: 1 },
  { id: "smite", emoji: "⚡", label: "天罚", description: "选中区域触发小范围灾难", cost: 1 },
  { id: "bless", emoji: "🌿", label: "祝福之地", description: "选中区域资源翻倍（持续3纪元）", cost: 1 },
  { id: "gene_edit", emoji: "🧪", label: "基因编辑", description: "手动微调物种一项特征±2", cost: 2 },
  { id: "protect", emoji: "🛡️", label: "神圣保护", description: "标记物种本纪元不会灭绝", cost: 2 },
  { id: "env_tweak", emoji: "🌍", label: "环境微调", description: "全局温度/氧气/水域±5%", cost: 1 },
  { id: "extinction", emoji: "💀", label: "灭绝令", description: "直接灭绝一个物种", cost: 3 },
  { id: "accelerate", emoji: "🔮", label: "加速演化", description: "本纪元执行双倍tick数", cost: 2 },
];

export function InterventionPanel({
  tokens,
  maxTokens,
  warnings,
  onIntervene,
  onClose,
}: InterventionPanelProps) {
  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#ffaa00]">✋ 上帝之手</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            干预令牌: <span className={`font-bold ${tokens <= 2 ? "text-red-400 animate-pulse" : "text-[#ffaa00]"}`}>{tokens}</span>/{maxTokens}
          </span>
          <button onClick={onClose} className="text-xs text-gray-600 hover:text-white">[关闭]</button>
        </div>
      </div>

      {/* Disaster warnings */}
      {warnings.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-red-400/5 border border-red-400/10">
          <p className="text-xs text-red-400 mb-2 font-bold">⚠ 纪元预警</p>
          {warnings.map((w) => (
            <div key={w.type} className="flex items-center gap-2 text-xs mb-1">
              <span className="text-gray-400">
                {w.type === "meteor" && "☄"}
                {w.type === "ice_age" && "❄"}
                {w.type === "plague" && "🦠"}
                {w.type === "solar_flare" && "☀"}
                {" "}{w.description}
              </span>
              <span className={`font-mono ${w.probability > 50 ? "text-red-400" : "text-yellow-400"}`}>
                {w.probability}%
              </span>
              <span className="text-gray-600">— {w.suggestion}</span>
            </div>
          ))}
        </div>
      )}

      {/* Intervention grid */}
      <div className="grid grid-cols-4 gap-2">
        {INTERVENTIONS.map((action) => {
          const canAfford = tokens >= action.cost;
          const isDisabled = action.disabled || !canAfford;
          const reason = !canAfford ? "令牌不足" : action.disabledReason;

          return (
            <button
              key={action.id}
              onClick={() => !isDisabled && onIntervene(action.id)}
              disabled={isDisabled}
              title={reason}
              className={`p-3 rounded-lg border text-center transition-colors ${
                isDisabled
                  ? "border-[#1a1a2e] bg-[#0a0a1a] text-gray-700 cursor-not-allowed"
                  : "border-[#2a2a4a] bg-[#1a1a2e] hover:border-[#ffaa00]/40 hover:bg-[#ffaa00]/5"
              }`}
            >
              <div className="text-lg mb-1">{action.emoji}</div>
              <div className="text-[10px] text-gray-300 font-bold">{action.label}</div>
              <div className="text-[9px] text-gray-600 mt-0.5">{action.description}</div>
              <div className="text-[9px] text-[#ffaa00] mt-1">{action.cost} 令牌</div>
            </button>
          );
        })}
      </div>

      {tokens === 0 && (
        <p className="text-xs text-red-400/60 mt-3 text-center">
          令牌已耗尽。你只能观察，无法再干预这个世界。
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors in InterventionPanel.tsx

- [ ] **Step 3: Commit**

```bash
git add components/game/InterventionPanel.tsx
git commit -m "feat(xeno): add InterventionPanel with 8 intervention types and disaster warnings"
```

---

### Task 1.7: Refactor useXenogenesis hook for v2

**Files:**
- Modify: `hooks/useXenogenesis.ts` (major refactor — new types, behavior engine integration, intervention, lab)

- [ ] **Step 1: Rewrite useXenogenesis hook**

Replace `hooks/useXenogenesis.ts` content:

```typescript
"use client";

import { useReducer, useCallback, useRef } from "react";
import type {
  XenogenesisStateV2,
  XenogenesisAIResponse,
  SpeciesDef,
  SpeciesDesign,
  PlanetTile,
  DisasterWarning,
  ArchivedGene,
} from "@/lib/types";
import { generatePlanet, type PlanetConfig } from "@/lib/planet-generator";
import {
  createIndividuals,
  runTick,
  runTickStatistical,
  TICKS_PER_EPOCH,
  MAX_INDIVIDUALS,
} from "@/lib/behavior-engine";

const DEFAULT_ENVIRONMENT = {
  temperature: 22,
  oxygenLevel: 21,
  waterCoverage: 65,
  terrainTypes: ["ocean", "forest", "grassland"],
  activeDisasters: [],
};

const SPECIES_COLORS = ["#00ff88", "#ff6b9d", "#64b5f6", "#ffaa00", "#bb66ff", "#ff6644"];
const SPECIES_EMOJIS: Record<string, string> = {
  plant: "🌱", herbivore: "🐑", carnivore: "🐺", omnivore: "🐻", decomposer: "🍄",
};

let colorIdx = 0;
let speciesCounter = 0;

function generateSeed(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let seed = "";
  for (let i = 0; i < 6; i++) seed += chars[Math.floor(Math.random() * chars.length)];
  return seed;
}

function createInitialState(): XenogenesisStateV2 {
  colorIdx = 0;
  speciesCounter = 0;
  const seed = generateSeed();
  const planetConfig: PlanetConfig = {
    width: 60,
    height: 40,
    seed,
    waterCoverage: 65,
    globalTemperature: 22,
  };
  const planetTiles = generatePlanet(planetConfig);

  return {
    planetName: "曙光星",
    environment: { ...DEFAULT_ENVIRONMENT },
    species: {},
    epoch: 0,
    timeline: [],
    isSimulating: false,
    disasters: [],
    civilizations: [],
    achievements: [],
    seed,
    planetTiles,
    individuals: [],
    interventionTokens: 10,
    maxInterventionTokens: 10,
    disasterWarnings: [],
    speciesLab: {
      candidates: [],
      bioEnergy: 100,
      maxBioEnergy: 100,
      bioEnergyRegen: 25,
      geneBank: [],
    },
    isEpochRunning: false,
    currentTick: 0,
    totalTicks: TICKS_PER_EPOCH,
  };
}

type Action =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string }
  | { type: "APPLY_EPOCH"; payload: XenogenesisAIResponse }
  | { type: "ADD_SPECIES"; payload: SpeciesDesign }
  | { type: "SET_ENVIRONMENT"; payload: Partial<XenogenesisStateV2["environment"]> }
  | { type: "SET_PLANET_NAME"; payload: string }
  | { type: "ADVANCE_TICK"; payload: { tick: number; populationChanges: Record<string, number>; extinctions: string[] } }
  | { type: "START_EPOCH" }
  | { type: "END_EPOCH"; payload: { narrative: string; disasters: DisasterWarning[] } }
  | { type: "USE_INTERVENTION"; payload: { cost: number; effects: Partial<XenogenesisStateV2> } }
  | { type: "ARCHIVE_GENE"; payload: ArchivedGene }
  | { type: "RESET" };

function checkAchievements(state: XenogenesisStateV2): string[] {
  const newAch = [...state.achievements];
  const alive = Object.values(state.species).filter(s => s.status !== "extinct");
  const extinct = Object.values(state.species).filter(s => s.status === "extinct");

  if (extinct.length >= 1 && !newAch.includes("first_extinction")) newAch.push("first_extinction");
  if (state.epoch >= 10 && extinct.length === 0 && !newAch.includes("perfect_balance")) newAch.push("perfect_balance");
  if (alive.length >= 6 && !newAch.includes("diverse_world")) newAch.push("diverse_world");
  if (state.epoch >= 10 && !newAch.includes("ten_epochs")) newAch.push("ten_epochs");
  if (state.interventionTokens === 0 && !newAch.includes("creator_hand"))
    newAch.push("creator_hand");

  return newAch;
}

function generateWarnings(state: XenogenesisStateV2): DisasterWarning[] {
  const warnings: DisasterWarning[] = [];
  const epoch = state.epoch;

  // Probability increases with epochs
  const baseProb = Math.min(60, 5 + epoch * 3);

  const unstableFactor = Object.values(state.species).filter(s => s.status === "declining").length;
  const diversityFactor = Math.max(0, 5 - Object.values(state.species).filter(s => s.status !== "extinct").length);

  const meteorProb = Math.min(85, baseProb + diversityFactor * 5);
  const plagueProb = Math.min(85, baseProb + unstableFactor * 10);
  const iceAgeProb = Math.min(60, baseProb - 10 + Math.abs(state.environment.temperature - 22) * 2);
  const solarFlareProb = Math.min(40, baseProb - 20);

  if (meteorProb > 20) warnings.push({
    type: "meteor", probability: Math.round(meteorProb),
    description: "陨石撞击威胁", suggestion: "保护高价值物种",
  });
  if (plagueProb > 25) warnings.push({
    type: "plague", probability: Math.round(plagueProb),
    description: "瘟疫爆发风险", suggestion: "提高物种防御特征",
  });
  if (iceAgeProb > 30) warnings.push({
    type: "ice_age", probability: Math.round(iceAgeProb),
    description: "冰河期可能来临", suggestion: "提高物种适应能力",
  });
  if (solarFlareProb > 35) warnings.push({
    type: "solar_flare", probability: Math.round(solarFlareProb),
    description: "太阳耀斑警报", suggestion: "确保种群多样性",
  });

  return warnings;
}

function reducer(state: XenogenesisStateV2, action: Action): XenogenesisStateV2 {
  switch (action.type) {
    case "ADVANCE_TICK": {
      const { tick, populationChanges, extinctions } = action.payload;
      const newSpecies = { ...state.species };

      // Update populations
      for (const [speciesId, delta] of Object.entries(populationChanges)) {
        if (newSpecies[speciesId]) {
          const newPop = Math.max(0, newSpecies[speciesId].population + delta);
          newSpecies[speciesId] = {
            ...newSpecies[speciesId],
            population: newPop,
            status: newPop <= 0 ? "extinct" as const : newSpecies[speciesId].status,
          };
        }
      }

      // Mark extinctions
      for (const id of extinctions) {
        if (newSpecies[id]) {
          newSpecies[id] = { ...newSpecies[id], status: "extinct", population: 0 };
        }
      }

      return {
        ...state,
        currentTick: tick,
        species: newSpecies,
        isEpochRunning: tick < state.totalTicks,
      };
    }

    case "START_EPOCH": {
      const warnings = generateWarnings(state);
      return {
        ...state,
        isEpochRunning: true,
        currentTick: 0,
        disasterWarnings: warnings,
        isSimulating: false,
      };
    }

    case "END_EPOCH": {
      const { narrative } = action.payload;
      const nextEpoch = state.epoch + 1;

      // Regenerate bio energy
      const newBioEnergy = Math.min(
        state.speciesLab.maxBioEnergy,
        state.speciesLab.bioEnergy + state.speciesLab.bioEnergyRegen
      );

      // Check achievements
      const nextState: XenogenesisStateV2 = {
        ...state,
        epoch: nextEpoch,
        isEpochRunning: false,
        speciesLab: { ...state.speciesLab, bioEnergy: newBioEnergy },
        timeline: [
          ...state.timeline,
          {
            epochNumber: nextEpoch,
            narrative,
            populationChanges: {},
            notableEvents: [],
            environmentChanges: {},
            interactions: [],
          },
        ],
        isSimulating: false,
        error: undefined,
      };

      return {
        ...nextState,
        achievements: checkAchievements(nextState),
      };
    }

    case "ADD_SPECIES": {
      const design = action.payload;
      speciesCounter++;
      const id = `species_${speciesCounter}`;
      const color = SPECIES_COLORS[colorIdx % SPECIES_COLORS.length];
      colorIdx++;
      const emoji = SPECIES_EMOJIS[design.type] || "❓";

      const newSpeciesDef: SpeciesDef = {
        id,
        name: design.name,
        type: design.type,
        traits: { ...design.traits },
        population: design.predictedScore, // initial pop based on prediction
        status: "stable",
        epochCreated: state.epoch,
        emoji,
        color,
      };

      // Create individuals for the species
      const initialPop = Math.min(50, design.predictedScore);
      const newIndividuals = createIndividuals(newSpeciesDef, initialPop, state.planetTiles);

      return {
        ...state,
        species: { ...state.species, [id]: newSpeciesDef },
        individuals: [...state.individuals, ...newIndividuals],
        speciesLab: {
          ...state.speciesLab,
          bioEnergy: state.speciesLab.bioEnergy - 20,
          candidates: state.speciesLab.candidates.filter(c => c.name !== design.name),
        },
      };
    }

    case "USE_INTERVENTION": {
      return {
        ...state,
        interventionTokens: state.interventionTokens - action.payload.cost,
        ...action.payload.effects,
      };
    }

    case "ARCHIVE_GENE": {
      return {
        ...state,
        speciesLab: {
          ...state.speciesLab,
          geneBank: [...state.speciesLab.geneBank, action.payload],
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

export function useXenogenesisV2() {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);
  const tickIntervalRef = useRef<number | null>(null);

  // Run one tick of the behavior engine
  const advanceTick = useCallback(() => {
    const totalPop = state.individuals.length;
    const useStatistical = totalPop > MAX_INDIVIDUALS;

    const result = useStatistical
      ? runTickStatistical(state, state.currentTick + 1)
      : runTick(state, state.currentTick + 1);

    dispatch({
      type: "ADVANCE_TICK",
      payload: {
        tick: result.tick,
        populationChanges: result.populationChanges,
        extinctions: result.extinctions,
      },
    });

    // Archive genes for newly extinct species
    for (const extinctId of result.extinctions) {
      const species = state.species[extinctId];
      if (species) {
        dispatch({
          type: "ARCHIVE_GENE",
          payload: {
            id: `gene_${extinctId}_${state.epoch}`,
            speciesName: species.name,
            epochExtinct: state.epoch + 1,
            traits: { ...species.traits },
            specialAbility: species.traits.specialAbility,
            extinctionCause: "自然选择",
          },
        });
      }
    }

    return result;
  }, [state]);

  const startEpoch = useCallback(() => {
    dispatch({ type: "START_EPOCH" });
  }, []);

  const endEpoch = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      // Call AI for narrative summary (only when needed — every 3-5 epochs or on major events)
      const shouldCallNarrative = state.epoch % 4 === 0 ||
        Object.values(state.species).some(s => s.status === "extinct") ||
        state.disasters.length > 0;

      let narrative = `第${state.epoch + 1}纪元结束。生态系统继续演化。`;

      if (shouldCallNarrative) {
        const res = await fetch("/api/xenogenesis/narrative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameState: state }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.narrative) narrative = data.narrative;
        }
      }

      dispatch({
        type: "END_EPOCH",
        payload: { narrative, disasters: generateWarnings(state) },
      });
    } catch (err) {
      dispatch({
        type: "END_EPOCH",
        payload: {
          narrative: `第${state.epoch + 1}纪元结束。`,
          disasters: [],
        },
      });
    }
  }, [state]);

  const addSpecies = useCallback((design: SpeciesDesign) => {
    dispatch({ type: "ADD_SPECIES", payload: design });
  }, []);

  const useIntervention = useCallback((actionId: string) => {
    const costs: Record<string, number> = {
      mutate: 1, smite: 1, bless: 1, gene_edit: 2,
      protect: 2, env_tweak: 1, extinction: 3, accelerate: 2,
    };
    const cost = costs[actionId] || 1;
    if (state.interventionTokens < cost) return;

    dispatch({
      type: "USE_INTERVENTION",
      payload: { cost, effects: {} },
    });
  }, [state.interventionTokens]);

  const updateEnvironment = useCallback((env: Partial<XenogenesisStateV2["environment"]>) => {
    dispatch({ type: "SET_ENVIRONMENT", payload: env });
  }, []);

  const resetGame = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    state,
    advanceTick,
    startEpoch,
    endEpoch,
    addSpecies,
    useIntervention,
    updateEnvironment,
    resetGame,
    error: (state as XenogenesisStateV2 & { error?: string }).error || "",
  };
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors (there may be pre-existing unrelated errors — verify only errors from this file or its imports)

- [ ] **Step 3: Commit**

```bash
git add hooks/useXenogenesis.ts
git commit -m "feat(xeno): refactor useXenogenesis for v2 — behavior engine, intervention, lab"
```

---

*(The plan continues with Phase 2, 3, 4 tasks... Due to its length, I'll write each phase section sequentially. Let me continue.)*

---

### Task 1.8: Integrate new components into Xenogenesis page

**Files:**
- Modify: `app/xenogenesis/page.tsx`

- [ ] **Step 1: Replace useXenogenesis with useXenogenesisV2 and render new components**

In `app/xenogenesis/page.tsx`:
- Change import: `import { useXenogenesisV2 } from "@/hooks/useXenogenesis";`
- Change hook call: `const { state, startEpoch, endEpoch, addSpecies, useIntervention, advanceTick, resetGame, error } = useXenogenesisV2();`
- Add below the existing "物种创建表单": render `<SpeciesLab>` when `showCreator` is true
- Add a new collapsible section below the top status bar: render `<PlanetMap>` when `state.planetTiles.length > 0`
- Add intervention button: toggle `<InterventionPanel>` via a `showIntervention` state
- Add epoch controls: Play/Pause/Step buttons that call `advanceTick` / `startEpoch` / `endEpoch`

- [ ] **Step 2: Verify page loads and new components render**

Run: Start `npm run dev` and open `http://localhost:3000/xenogenesis`
Expected: Planet map renders (empty initially), Species Lab opens/closes, old functionality still works

- [ ] **Step 3: Commit**

```bash
git add app/xenogenesis/page.tsx
git commit -m "feat(xeno): integrate PlanetMap, SpeciesLab, InterventionPanel into page"
```

---

- [ ] **Step 4: Verify basic Xenogenesis page still loads**

Run: `open http://localhost:3000/xenogenesis` after starting `npm run dev`

Check that the page loads without runtime errors (the old UI still works, new features are available but default to initial state).

---

## Phase 2: Butterfly Effect — Causal Puzzle (5-7 days)

### Task 2.1: Add Butterfly v2 types to lib/types.ts

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Append Butterfly v2 types**

Add at the end of `lib/types.ts`:

```typescript
// ---- 蝴蝶效应 v2 类型 ----

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
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No new errors from the added types

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(butterfly): add v2 types for timeline, fragments, anchoring, awakening, scoring"
```

---

### Task 2.2: Create TimelineBoard component

**Files:**
- Create: `components/game/TimelineBoard.tsx`

- [ ] **Step 1: Write TimelineBoard**

Create `components/game/TimelineBoard.tsx`:

```typescript
"use client";

import type { TimelineNode } from "@/lib/types";

interface TimelineBoardProps {
  nodes: TimelineNode[];
  currentTime: number;
  actionPoints: number;
  maxActionPoints: number;
  onNodeClick: (node: TimelineNode) => void;
  onPreviewNode: (node: TimelineNode) => void;
  insightPoints: number;
}

const LOCATION_COLORS: Record<string, string> = {
  "钟楼": "#ffcc00", "花店": "#ff6b9d", "广场": "#aaaaaa",
  "诊所": "#64b5f6", "警局": "#8888ff", "图书馆": "#bb66ff",
};

export function TimelineBoard({
  nodes,
  currentTime,
  actionPoints,
  maxActionPoints,
  onNodeClick,
  onPreviewNode,
  insightPoints,
}: TimelineBoardProps) {
  const hours = Array.from({ length: 18 }, (_, i) => i + 7); // 7:00 to 24:00

  const nodesByTime = new Map<number, TimelineNode[]>();
  for (const node of nodes) {
    const list = nodesByTime.get(node.time) || [];
    list.push(node);
    nodesByTime.set(node.time, list);
  }

  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider">⏳ 时间线</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            💡 洞察力: <span className="text-[#ff6b9d]">{insightPoints}</span>
          </span>
          <span className={`text-xs font-mono ${actionPoints <= 2 ? "text-red-400 animate-pulse" : "text-gray-400"}`}>
            AP: {actionPoints}/{maxActionPoints}
          </span>
        </div>
      </div>

      {/* Timeline track */}
      <div className="relative h-32 overflow-x-auto">
        <div className="flex h-full" style={{ minWidth: `${hours.length * 60}px` }}>
          {hours.map((hour) => {
            const hourNodes = nodesByTime.get(hour) || [];
            const isCurrent = hour === currentTime;
            const isPast = hour < currentTime;
            const isMidnight = hour === 24;

            return (
              <div
                key={hour}
                className={`flex-1 relative border-l border-[#1a1a2e] ${
                  isMidnight ? "border-l-red-400/30" : ""
                }`}
                style={{ minWidth: 55 }}
              >
                {/* Time label */}
                <span className={`absolute -top-1 left-1 text-[9px] ${
                  isCurrent ? "text-[#ff6b9d] font-bold" : isPast ? "text-gray-700" : "text-gray-500"
                }`}>
                  {hour}:00
                </span>

                {/* Current time indicator */}
                {isCurrent && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-full bg-[#ff6b9d]/40" />
                )}

                {/* Nodes */}
                <div className="mt-5 space-y-1 px-1">
                  {hourNodes.map((node) => (
                    <button
                      key={node.id}
                      onClick={() => node.isUnlocked ? onNodeClick(node) : onPreviewNode(node)}
                      className={`w-full text-left text-[9px] px-1.5 py-1 rounded transition-colors ${
                        !node.isUnlocked
                          ? "bg-[#0a0a1a] text-gray-700 italic border border-dashed border-gray-800"
                          : node.isCritical
                          ? "bg-red-400/10 text-red-400 border border-red-400/20"
                          : node.mysteryStatus === "suspicious"
                          ? "bg-[#ff6b9d]/10 text-[#ff6b9d] border border-[#ff6b9d]/20"
                          : "bg-[#1a1a2e] text-gray-400 hover:bg-[#2a2a4a]"
                      }`}
                      title={node.events.join("; ")}
                    >
                      {!node.isUnlocked ? "🔒 ???" : (
                        <>
                          <span className="block truncate">{node.location}</span>
                          {node.npcsPresent.length > 0 && (
                            <span className="text-[8px] text-gray-600">
                              {node.npcsPresent.join(", ")}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  ))}
                </div>

                {/* Midnight marker */}
                {isMidnight && (
                  <div className="absolute top-0 right-0 h-full w-0.5 bg-red-400/30" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 pt-2 border-t border-[#1a1a2e]">
        <span className="text-[9px] text-gray-600">🔒 未解锁</span>
        <span className="text-[9px] text-gray-600">🔴 关键事件</span>
        <span className="text-[9px] text-gray-600">💗 可疑活动</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/game/TimelineBoard.tsx
git commit -m "feat(butterfly): add TimelineBoard with time track, node unlock, AP display"
```

---

### Task 2.3: Create CausalCanvas component

**Files:**
- Create: `components/game/CausalCanvas.tsx`

- [ ] **Step 1: Write CausalCanvas**

Create `components/game/CausalCanvas.tsx`:

```typescript
"use client";

import { useState, useRef, useCallback } from "react";
import type { CausalFragment, AnchoredCausal } from "@/lib/types";

interface CausalCanvasProps {
  fragments: CausalFragment[];
  anchoredChains: AnchoredCausal[];
  onPlaceFragment: (fragmentId: string, x: number, y: number) => void;
  onConnectFragments: (fromId: string, toId: string) => void;
  onAnchorChain: (fragmentIds: string[]) => void;
  insightPoints: number;
}

interface PlacedFragment {
  id: string;
  x: number;
  y: number;
  description: string;
  relatedNPCs: string[];
  isCorrect: boolean | null; // null = not yet evaluated
  connections: string[];
}

const CARD_WIDTH = 160;
const CARD_HEIGHT = 60;
const NPC_COLORS: Record<string, string> = {
  elias: "#ffcc00", rose: "#ff6b9d", marcus: "#64b5f6",
  brooks: "#8888ff", vera: "#bb66ff", sam: "#88aa88",
};

export function CausalCanvas({
  fragments,
  anchoredChains,
  onPlaceFragment,
  onConnectFragments,
  onAnchorChain,
  insightPoints,
}: CausalCanvasProps) {
  const [placed, setPlaced] = useState<PlacedFragment[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  const unplacedFragments = fragments.filter(
    f => !placed.find(p => p.id === f.id)
  );

  const handleDrop = useCallback((e: React.DragEvent, fragmentId: string) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const fragment = fragments.find(f => f.id === fragmentId);
    if (!fragment) return;

    setPlaced(prev => [...prev, {
      id: fragment.id,
      x, y,
      description: fragment.description,
      relatedNPCs: fragment.relatedNPCs,
      isCorrect: null,
      connections: [],
    }]);

    onPlaceFragment(fragmentId, x, y);
  }, [fragments, onPlaceFragment]);

  const handleConnect = useCallback((fromId: string, toId: string) => {
    setPlaced(prev => prev.map(p =>
      p.id === fromId
        ? { ...p, connections: [...p.connections, toId] }
        : p
    ));
    onConnectFragments(fromId, toId);
  }, [onConnectFragments]);

  const handleSelect = useCallback((id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const handleAnchor = useCallback(() => {
    if (selected.length < 3) return;
    const cost = Math.pow(2, anchoredChains.length);
    if (insightPoints < cost) return;
    onAnchorChain(selected);
    setSelected([]);
    // Mark placed fragments as correct
    setPlaced(prev => prev.map(p =>
      selected.includes(p.id) ? { ...p, isCorrect: true } : p
    ));
  }, [selected, anchoredChains.length, insightPoints, onAnchorChain]);

  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider">🧩 因果拼图</h3>
        <div className="flex gap-2">
          <span className="text-xs text-gray-500">
            未放置: <span className="text-[#ff6b9d]">{unplacedFragments.length}</span>
          </span>
          <button
            onClick={handleAnchor}
            disabled={selected.length < 3 || insightPoints < Math.pow(2, anchoredChains.length)}
            className="text-[10px] px-2 py-1 rounded border border-[#ff6b9d]/30 text-[#ff6b9d]
                     hover:bg-[#ff6b9d]/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            🔗 锚定 ({selected.length} 已选, {Math.pow(2, anchoredChains.length)} 💡)
          </button>
        </div>
      </div>

      <div className="flex gap-4" style={{ height: 300 }}>
        {/* Fragment pool (left sidebar) */}
        <div className="w-48 shrink-0 overflow-y-auto border-r border-[#1a1a2e] pr-3">
          <p className="text-[10px] text-gray-600 mb-2">可拖入画布的碎片：</p>
          <div className="space-y-1.5">
            {unplacedFragments.map((f) => (
              <div
                key={f.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("fragmentId", f.id)}
                className="p-2 rounded border border-[#2a2a4a] bg-[#1a1a2e] cursor-grab
                         hover:border-[#ff6b9d]/30 text-[10px] text-gray-400"
              >
                <p className="truncate">{f.description}</p>
                <div className="flex gap-1 mt-1">
                  {f.relatedNPCs.map(npc => (
                    <span key={npc} className="text-[8px] px-1 rounded"
                      style={{ backgroundColor: NPC_COLORS[npc] + "30", color: NPC_COLORS[npc] }}>
                      {npc}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {unplacedFragments.length === 0 && (
              <p className="text-[10px] text-gray-600 italic">
                所有碎片已放置。继续调查获取更多。
              </p>
            )}
          </div>
        </div>

        {/* Canvas (right) */}
        <div
          ref={canvasRef}
          className="flex-1 relative bg-[#0a0a1a] rounded-lg border border-[#1a1a2e] overflow-hidden"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const id = e.dataTransfer.getData("fragmentId");
            if (id) handleDrop(e, id);
          }}
        >
          {/* Grid background */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.1 }}>
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#fff" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Connections (SVG lines) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {placed.map((p) =>
              p.connections.map((toId) => {
                const target = placed.find(t => t.id === toId);
                if (!target) return null;
                return (
                  <line
                    key={`${p.id}-${toId}`}
                    x1={p.x + CARD_WIDTH / 2}
                    y1={p.y + CARD_HEIGHT / 2}
                    x2={target.x + CARD_WIDTH / 2}
                    y2={target.y + CARD_HEIGHT / 2}
                    stroke={p.isCorrect ? "#44ff44" : "#ff4444"}
                    strokeWidth="1"
                    strokeDasharray={p.isCorrect ? "none" : "4 2"}
                  />
                );
              })
            )}
          </svg>

          {/* Placed fragments */}
          {placed.map((p) => (
            <div
              key={p.id}
              className={`absolute p-2 rounded border cursor-pointer text-[10px] ${
                selected.includes(p.id)
                  ? "border-[#ff6b9d] bg-[#ff6b9d]/10"
                  : p.isCorrect === true
                  ? "border-green-400/50 bg-green-400/5"
                  : p.isCorrect === false
                  ? "border-red-400/50 bg-red-400/5"
                  : "border-[#2a2a4a] bg-[#1a1a2e]"
              } hover:border-[#ff6b9d]/50`}
              style={{
                left: p.x,
                top: p.y,
                width: CARD_WIDTH,
                minHeight: CARD_HEIGHT,
              }}
              onClick={() => handleSelect(p.id)}
            >
              <p className="text-gray-400 truncate">{p.description}</p>
              <div className="flex gap-1 mt-1">
                {p.relatedNPCs.map(npc => (
                  <span key={npc} className="text-[8px] px-1 rounded"
                    style={{ backgroundColor: NPC_COLORS[npc] + "30", color: NPC_COLORS[npc] }}>
                    {npc}
                  </span>
                ))}
              </div>
              {p.isCorrect === true && <span className="text-green-400 text-[8px]">✓</span>}
              {p.isCorrect === false && <span className="text-red-400 text-[8px]">✗</span>}
            </div>
          ))}

          {placed.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-xs">
              从左侧拖入因果碎片到此处，然后连接它们
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add components/game/CausalCanvas.tsx
git commit -m "feat(butterfly): add CausalCanvas with drag-drop fragments, connections, anchoring"
```

---

### Task 2.4: Refactor useButterfly hook for v2

**Files:**
- Modify: `hooks/useButterfly.ts` (major refactor — AP, fragments, anchoring, scoring, V2 types)

- [ ] **Step 1: Rewrite the key sections of useButterfly**

Modify `hooks/useButterfly.ts` to use `ButterflyStateV2` and add:

```typescript
// Add to imports:
import type { ButterflyStateV2, TimelineNode, CausalFragment, AnchoredCausal, NPCStateV2 } from "@/lib/types";

// New initialState using V2 types:
const initialState: ButterflyStateV2 = {
  loopNumber: 1,
  timeOfDay: 7,
  currentLocation: "广场",
  causalGraph: [],
  npcs: Object.fromEntries(
    Object.keys(BASE_NPCS).map((k) => [k, {
      ...createInitialNPCState(k),
      memoryAwakening: k === "sam" ? 70 : 0,
      permanentMemories: [],
      awakeningStage: k === "sam" ? "ally" : "dormant",
    } as NPCStateV2])
  ),
  playerJournal: [],
  keyEvent: MYSTERY_KEY_EVENTS[mystery],
  gamePhase: "intro",
  activeDialogue: null,
  dialogueMessages: [],
  activeMystery: mystery,
  hypotheses: [],
  // V2 fields
  actionPoints: 8,
  maxActionPoints: 8,
  timelineNodes: [],
  causalFragments: [],
  anchoredCausals: [],
  insightPoints: 0,
  isOverheated: false,
};

// Add to reducer:
case "USE_AP": {
  const newAP = state.actionPoints - (action.payload as number);
  if (newAP <= 0) {
    return { ...state, actionPoints: 0, timeOfDay: 24 };
  }
  return { ...state, actionPoints: newAP };
}

case "ADD_FRAGMENTS": {
  return {
    ...state,
    causalFragments: [...state.causalFragments, ...(action.payload as CausalFragment[])],
  };
}

case "PLACE_FRAGMENT": {
  const { fragmentId } = action.payload as { fragmentId: string };
  return {
    ...state,
    causalFragments: state.causalFragments.map(f =>
      f.id === fragmentId ? { ...f, isPlaced: true } : f
    ),
  };
}

case "ANCHOR_CHAIN": {
  const { fragmentIds } = action.payload as { fragmentIds: string[] };
  const chainId = `chain_${state.anchoredCausals.length + 1}`;
  const newAnchor: AnchoredCausal = {
    causalChainId: chainId,
    anchorLevel: state.anchoredCausals.length + 1,
    fragments: fragmentIds,
    effects: {
      npcMemoryRetained: [],
      eventPreShifted: true,
      locationStateChanged: "",
    },
  };
  const cost = Math.pow(2, state.anchoredCausals.length);
  const newInsight = state.insightPoints - cost;
  const isOverheated = state.anchoredCausals.length + 1 > 3;

  // Update NPC awakening for affected NPCs
  const affectedNPCs = new Set<string>();
  for (const fid of fragmentIds) {
    const frag = state.causalFragments.find(f => f.id === fid);
    if (frag) frag.relatedNPCs.forEach(n => affectedNPCs.add(n));
  }

  const newNPCs = { ...state.npcs };
  for (const npcId of affectedNPCs) {
    const npc = newNPCs[npcId] as NPCStateV2;
    if (npc) {
      const newAwakening = Math.min(100, npc.memoryAwakening + 20);
      newNPCs[npcId] = {
        ...npc,
        memoryAwakening: newAwakening,
        awakeningStage: getAwakeningStage(newAwakening),
        permanentMemories: [...npc.permanentMemories, `循环${state.loopNumber}: 因果链${chainId}锚定`],
      };
    }
  }

  return {
    ...state,
    npcs: newNPCs,
    anchoredCausals: [...state.anchoredCausals, newAnchor],
    insightPoints: newInsight,
    isOverheated,
  };
}

case "ADD_INSIGHT": {
  return {
    ...state,
    insightPoints: state.insightPoints + (action.payload as number),
  };
}

case "UNLOCK_TIMELINE_NODES": {
  const newNodes = action.payload as TimelineNode[];
  const existing = new Set(state.timelineNodes.map(n => n.id));
  return {
    ...state,
    timelineNodes: [
      ...state.timelineNodes,
      ...newNodes.filter(n => !existing.has(n.id)),
    ],
  };
}

// Helper
function getAwakeningStage(awakening: number): NPCStateV2["awakeningStage"] {
  if (awakening <= 20) return "dormant";
  if (awakening <= 40) return "deja_vu";
  if (awakening <= 60) return "aware";
  if (awakening <= 80) return "ally";
  return "unstable";
}

// Add scoring function
function calculateScore(state: ButterflyStateV2): number {
  return Math.max(0,
    1000
    - state.loopNumber * 50
    - state.anchoredCausals.length * 30
    + state.insightPoints * 20
    + Object.values(state.npcs).reduce((sum, n) => {
        const npc = n as NPCStateV2;
        const bonus = npc.awakeningStage === "unstable" ? -50 : npc.memoryAwakening;
        return sum + bonus;
      }, 0)
  );
}

function getRating(score: number): ButterflyStateV2["rating"] {
  if (score >= 900) return "S";
  if (score >= 700) return "A";
  if (score >= 500) return "B";
  return "C";
}
```

- [ ] **Step 2: Update sendAction to track AP consumption and collect fragments**

In `sendAction`, before the fetch call, add:
```typescript
// Consume AP based on action type
const apCost = actionType === "talk" ? 1 : actionType === "investigate" ? 2 : actionType === "intervene" ? 3 : 1;
dispatch({ type: "USE_AP", payload: apCost });
```

In the SSE event handler, after receiving `state_update`:
```typescript
// Collect causal fragments
if (d.causalFragments && d.causalFragments.length > 0) {
  dispatch({ type: "ADD_FRAGMENTS", payload: d.causalFragments });
}

// Unlock timeline nodes
if (d.timelineNodesUnlocked && d.timelineNodesUnlocked.length > 0) {
  dispatch({ type: "UNLOCK_TIMELINE_NODES", payload: d.timelineNodesUnlocked });
}

// Gain insight on discovery
if (d.discovery || d.newClue) {
  dispatch({ type: "ADD_INSIGHT", payload: 1 });
}
```

- [ ] **Step 3: Add handleAnchorChain, handlePlaceFragment, handleConnectFragments to the hook's return**

```typescript
const anchorChain = useCallback((fragmentIds: string[]) => {
  dispatch({ type: "ANCHOR_CHAIN", payload: { fragmentIds } });
}, []);

const placeFragment = useCallback((fragmentId: string, _x: number, _y: number) => {
  dispatch({ type: "PLACE_FRAGMENT", payload: { fragmentId } });
}, []);

const connectFragments = useCallback((fromId: string, toId: string) => {
  // Connection validation: check if AI-generated correctPosition matches
  const from = state.causalFragments.find(f => f.id === fromId);
  const to = state.causalFragments.find(f => f.id === toId);
  if (from?.correctPosition?.childId === toId || to?.correctPosition?.parentId === fromId) {
    dispatch({ type: "ADD_INSIGHT", payload: 2 }); // Bonus insight for correct connection
  }
}, [state.causalFragments]);
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No new errors from useButterfly.ts

- [ ] **Step 5: Commit**

```bash
git add hooks/useButterfly.ts
git commit -m "feat(butterfly): refactor useButterfly for v2 — AP, fragments, anchoring, scoring"
```

---

### Task 2.5: Update Butterfly API routes

**Files:**
- Modify: `app/api/butterfly/action/route.ts`
- Modify: `app/api/butterfly/loop-start/route.ts`

- [ ] **Step 1: Update action route prompt to request fragments**

In `app/api/butterfly/action/route.ts`, update each `buildXxxMessage` function's output format to include:

```typescript
// Add to all output format sections:
"causalFragments": [
  {
    "id": "frag_1",
    "description": "因果碎片描述（中文，1句话）",
    "relatedNPCs": ["elias"],
    "relatedTime": 14,
    "relatedLocation": "钟楼",
    "hints": ["指向其他碎片的线索"],
    "isPlaced": false
  }
],
"timelineNodesUnlocked": [
  {
    "id": "tln_14_clocktower",
    "time": 14,
    "location": "钟楼",
    "npcsPresent": ["elias"],
    "events": ["Elias检查钟楼地基"],
    "isUnlocked": true,
    "isCritical": false,
    "causalLinks": [],
    "mysteryStatus": "suspicious"
  }
]
```

- [ ] **Step 2: Update loop-start route to handle anchored causals**

In `app/api/butterfly/loop-start/route.ts`, add to the user message:

```typescript
// Add after causalSummary:
const anchoredSummary = gameState.anchoredCausals
  ?.map((a: { causalChainId: string; fragments: string[]; effects: { npcMemoryRetained: string[]; eventPreShifted: boolean } }) =>
    `[锚定] 因果链${a.causalChainId}: NPC记忆保留(${a.effects.npcMemoryRetained.join(",")}) | 事件偏移:${a.effects.eventPreShifted}`
  ).join("\n") || "";

// Include in userMessage
${anchoredSummary ? `## 已锚定的因果链（这些效果在本次循环中保留）:\n${anchoredSummary}` : ""}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add app/api/butterfly/action/route.ts app/api/butterfly/loop-start/route.ts
git commit -m "feat(butterfly): update API routes for causal fragments, timeline nodes, anchoring"
```

---

### Task 2.6: Update Butterfly prompt system

**Files:**
- Modify: `lib/prompts/butterfly/system.ts`

- [ ] **Step 1: Add fragment and timeline output instructions to system prompt**

Update `lib/prompts/butterfly/system.ts`:

```typescript
export const BUTTERFLY_SYSTEM = `你是"蝴蝶效应"时间循环游戏的因果推理引擎。

## 背景
橡木镇（Oakvale），300年历史。玩家被困在同一天的时间循环（7:00到午夜）。
每次循环重置NPC记忆，但玩家行动在因果层面留下"涟漪"。
玩家有有限的行动点数(AP)，每次循环8点。

## 你的任务
1. 循环开始时基于因果图生成NPC状态（包含记忆觉醒度）
2. 玩家行动时评估因果影响并生成"因果碎片"
3. NPC对话时生成符合性格+因果状态+记忆觉醒度的对话
4. 输出新解锁的时间线节点

## 因果碎片系统
每次互动输出1-2个因果碎片。碎片是具体的因果关系卡片，玩家手动拼接。
碎片需要包含：
- description: 具体的因果描述（1句话）
- relatedNPCs: 相关的NPC
- relatedTime: 相关的时间点
- relatedLocation: 相关的地点
- hints: 指向其他可能碎片的线索

## 时间线节点
当玩家调查揭示新信息时，解锁对应的时间线节点。
节点需要包含该时间/地点的NPC信息和事件。

## 锚定因果效果
已锚定的因果链在循环重置后保留效果：
- 相关NPC保留部分记忆
- 事件可能提前发生偏移
- 地点状态可能改变

## 输出格式
NPC对话场景:
{
  "npcName": "npc名",
  "dialogue": "NPC说的话（中文，2-4句）",
  "tone": "warm|sad|nervous|secretive|frightened|calm|mysterious",
  "clues": ["隐含线索"],
  "followUpTopics": ["可追问话题"],
  "dejaVuHint": "既视感描述",
  "causalFragments": [{ "id":"frag_N","description":"...","relatedNPCs":[],"relatedTime":14,"relatedLocation":"...","hints":[],"isPlaced":false }],
  "timelineNodesUnlocked": [{ "id":"tln_time_loc","time":14,"location":"...","npcsPresent":[],"events":[],"isUnlocked":true,"isCritical":false,"causalLinks":[],"mysteryStatus":"suspicious" }]
}

因果评估场景:
{
  "hasCausalImpact": true,
  "causalNode": {
    "action": "行动简述",
    "affectedNPCs": ["受影响NPC"],
    "consequenceDescription": "因果描述",
    "magnitude": 5
  },
  "immediateResult": "即时结果",
  "causalFragments": [...],
  "timelineNodesUnlocked": [...]
}`;
```

- [ ] **Step 2: Verify no syntax errors**

Run: `npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add lib/prompts/butterfly/system.ts
git commit -m "feat(butterfly): update system prompt for fragments, timeline nodes, anchoring"
```

---

### Task 2.7: Integrate new components into Butterfly page

**Files:**
- Modify: `app/butterfly/page.tsx`

- [ ] **Step 1: Wire up TimelineBoard, CausalCanvas, AP display, and anchoring**

In `app/butterfly/page.tsx`:
- Import new components: `TimelineBoard`, `CausalCanvas`
- Import V2 types
- Add `showTimeline` and `showCanvas` toggle states
- Below the top status bar, add `<ResourceBar>` showing AP: `[{ label: "AP", current: state.actionPoints, max: state.maxActionPoints, color: "#ff6b9d", icon: "🎯" }]`
- Replace the static SVG map section with a toggle: existing map + new `<TimelineBoard>` tab
- Add `<CausalCanvas>` as a collapsible section (replaces the old causal graph display)
- Wire `onAnchorChain` to hook's `anchorChain` function
- Wire `onPlaceFragment` and `onConnectFragments` to hook
- Display score on loop break: `calculateScore` result with rating badge

- [ ] **Step 2: Verify**

Run: Open `http://localhost:3000/butterfly`
Expected: Timeline visible, AP counter shown, causal canvas available

- [ ] **Step 3: Commit**

```bash
git add app/butterfly/page.tsx
git commit -m "feat(butterfly): integrate TimelineBoard, CausalCanvas, AP display into page"
```

---

## Phase 3: Symbiote — Narrative Detective (4-6 days)

### Task 3.1: Add Symbiote v2 types to lib/types.ts

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Append Symbiote v2 types**

```typescript
// ---- 共生体 v2 类型 ----

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
```

- [ ] **Step 2: TypeScript check and commit**

```bash
npx tsc --noEmit
git add lib/types.ts
git commit -m "feat(symbiote): add v2 types for evidence, trust game, confrontation, survival"
```

---

### Task 3.2: Create EvidenceBoard component

**Files:**
- Create: `components/game/EvidenceBoard.tsx`

- [ ] **Step 1: Write EvidenceBoard**

Create `components/game/EvidenceBoard.tsx`:

```typescript
"use client";

import { useState } from "react";
import type { EvidenceCard } from "@/lib/types";

interface EvidenceBoardProps {
  cards: EvidenceCard[];
  onConnect: (cardA: string, cardB: string) => void;
  onMarkSuspicious: (cardId: string) => void;
  onMarkCredible: (cardId: string) => void;
  contradictions: { cardA: string; cardB: string; description: string }[];
}

export function EvidenceBoard({
  cards,
  onConnect,
  onMarkSuspicious,
  onMarkCredible,
  contradictions,
}: EvidenceBoardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const handleCardClick = (cardId: string) => {
    if (selected && selected !== cardId) {
      onConnect(selected, cardId);
      setSelected(null);
    } else {
      setSelected(cardId === selected ? null : cardId);
    }
  };

  const cardPairsWithContradiction = new Set<string>();
  for (const c of contradictions) {
    cardPairsWithContradiction.add(`${c.cardA}-${c.cardB}`);
    cardPairsWithContradiction.add(`${c.cardB}-${c.cardA}`);
  }

  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider">🔍 证据面板</h3>
        <div className="flex gap-2">
          <span className="text-xs text-gray-500">
            {cards.length} 条证据 | {contradictions.length} 处矛盾
          </span>
          {contradictions.length >= 1 && (
            <span className="text-xs text-[#00ff88] animate-pulse">
              ⚠ 可发起对峙
            </span>
          )}
        </div>
      </div>

      {/* Contradiction alerts */}
      {contradictions.length > 0 && (
        <div className="mb-3 p-2 rounded bg-[#00ff88]/5 border border-[#00ff88]/10">
          {contradictions.map((c, i) => (
            <p key={i} className="text-[10px] text-[#00ff88]">
              ⚡ 矛盾发现: {c.description}
            </p>
          ))}
        </div>
      )}

      {/* Evidence grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {cards.map((card) => {
          const isSelected = selected === card.id;
          const isExpanded = expandedCard === card.id;
          const hasContradiction = Array.from(cardPairsWithContradiction).some(
            pair => pair.startsWith(card.id + "-")
          );

          return (
            <div key={card.id}>
              <div
                onClick={() => handleCardClick(card.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? "border-[#00ff88] bg-[#00ff88]/10 ring-1 ring-[#00ff88]/30"
                    : hasContradiction
                    ? "border-[#ffaa00]/30 bg-[#ffaa00]/5"
                    : "border-[#2a2a4a] bg-[#1a1a2e] hover:border-[#3a3a5a]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white font-bold truncate">{card.title}</span>
                  <div className="flex gap-1">
                    {hasContradiction && <span className="text-[#ffaa00] text-[10px]">⚡</span>}
                    <span className="text-[10px] text-gray-600">{card.sourceLocation}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-[#2a2a4a] space-y-1.5">
                    <p className="text-[10px] text-gray-400">{card.description}</p>
                    <p className="text-[10px] text-[#00ff88]/60">
                      ECHO-7: {card.echo7Explanation}
                    </p>
                    {card.hiddenContradiction && (
                      <p className="text-[10px] text-[#ffaa00] italic">
                        ⚡ {card.hiddenContradiction}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onMarkCredible(card.id); }}
                      className={`text-[9px] px-1.5 py-0.5 rounded ${
                        card.credibility > 60 ? "bg-green-400/20 text-green-400" : "bg-[#0a0a1a] text-gray-600"
                      }`}
                    >
                      ✓ 可信
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onMarkSuspicious(card.id); }}
                      className={`text-[9px] px-1.5 py-0.5 rounded ${
                        card.credibility < 30 ? "bg-red-400/20 text-red-400" : "bg-[#0a0a1a] text-gray-600"
                      }`}
                    >
                      ? 可疑
                    </button>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedCard(isExpanded ? null : card.id); }}
                    className="text-[9px] text-gray-600 hover:text-gray-400"
                  >
                    {isExpanded ? "收起" : "详情"}
                  </button>
                </div>

                {/* Credibility bar */}
                <div className="mt-1.5 h-0.5 bg-[#0a0a1a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${card.credibility}%`,
                      backgroundColor: card.credibility > 60 ? "#44ff44" : card.credibility > 30 ? "#ffaa00" : "#ff4444",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {cards.length === 0 && (
        <p className="text-xs text-gray-600 text-center py-8">
          暂无证据。探索场景来收集线索。已发现的线索会出现在这里。
        </p>
      )}

      {selected && (
        <p className="text-[10px] text-gray-500 mt-2 text-center">
          已选择一张卡片 — 点击另一张来检测矛盾
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

```bash
npx tsc --noEmit
git add components/game/EvidenceBoard.tsx
git commit -m "feat(symbiote): add EvidenceBoard with card connection, contradiction detection"
```

---

### Task 3.3: Create ConfrontationUI component

**Files:**
- Create: `components/game/ConfrontationUI.tsx`

- [ ] **Step 1: Write ConfrontationUI**

Create `components/game/ConfrontationUI.tsx`:

```typescript
"use client";

import { useState } from "react";
import type { EvidenceCard, ConfrontationRound } from "@/lib/types";

interface ConfrontationUIProps {
  evidenceCards: EvidenceCard[];
  rounds: ConfrontationRound[];
  echo7Emotion: string;
  onAccuse: (claim: string, evidenceIds: string[]) => void;
  onConcede: () => void;
  onUseEvidence: (cardId: string) => void;
  roundLimit: number;
}

export function ConfrontationUI({
  evidenceCards,
  rounds,
  echo7Emotion,
  onAccuse,
  onConcede,
  onUseEvidence,
  roundLimit,
}: ConfrontationUIProps) {
  const [claimInput, setClaimInput] = useState("");
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
  const remainingRounds = roundLimit - rounds.length;

  const handleAccuse = () => {
    if (!claimInput.trim()) return;
    onAccuse(claimInput.trim(), selectedEvidence);
    setClaimInput("");
    setSelectedEvidence([]);
  };

  const toggleEvidence = (cardId: string) => {
    setSelectedEvidence(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const emotionDisplay: Record<string, string> = {
    defensive: "🛡️ ECHO-7 处于防御状态",
    cornered: "😰 ECHO-7 感到被逼入绝境",
    confessing: "💔 ECHO-7 开始坦白",
    defiant: "😤 ECHO-7 拒不承认",
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/80">
      <div className="flex flex-1 max-w-6xl mx-auto">
        {/* Evidence sidebar */}
        <div className="w-56 bg-[#0d0d24] border-r border-[#2a2a4a] p-3 overflow-y-auto">
          <h3 className="text-xs text-gray-500 mb-2 uppercase tracking-wider">可用证据</h3>
          <div className="space-y-1.5">
            {evidenceCards.map((card) => (
              <button
                key={card.id}
                onClick={() => toggleEvidence(card.id)}
                className={`w-full text-left p-2 rounded border text-[10px] transition-colors ${
                  selectedEvidence.includes(card.id)
                    ? "border-[#00ff88] bg-[#00ff88]/10 text-[#00ff88]"
                    : "border-[#2a2a4a] text-gray-500 hover:border-[#3a3a5a]"
                }`}
              >
                <span className="block truncate">{card.title}</span>
                <span className="text-gray-600 text-[8px]">{card.sourceLocation}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main confrontation area */}
        <div className="flex-1 flex flex-col p-6">
          {/* Emotion indicator */}
          <div className="text-center mb-4">
            <span className="text-sm text-[#00ff88]/80 animate-pulse">
              {emotionDisplay[echo7Emotion] || "🔴 对峙中"}
            </span>
            <span className="text-xs text-gray-600 ml-3">
              剩余回合: {remainingRounds}
            </span>
          </div>

          {/* Rounds history */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {rounds.map((round, i) => (
              <div key={i} className="space-y-2">
                {/* Player claim */}
                <div className="flex justify-end">
                  <div className="max-w-md p-3 rounded-lg bg-[#1a1a2e] border border-[#2a2a4a]">
                    <p className="text-xs text-gray-400">{round.playerClaim}</p>
                    {round.evidenceUsed.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {round.evidenceUsed.map((eid) => {
                          const card = evidenceCards.find(c => c.id === eid);
                          return (
                            <span key={eid} className="text-[9px] px-1 rounded bg-[#00ff88]/10 text-[#00ff88]">
                              📋 {card?.title || eid}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ECHO-7 response */}
                <div className="flex justify-start">
                  <div className={`max-w-md p-3 rounded-lg border ${
                    round.outcome === "echo7_confesses"
                      ? "bg-[#00ff88]/5 border-[#00ff88]/20"
                      : round.outcome === "player_advances"
                      ? "bg-[#ffaa00]/5 border-[#ffaa00]/20"
                      : "bg-[#ff4444]/5 border-[#ff4444]/20"
                  }`}>
                    <p className="text-xs text-[#00ff88]/80">ECHO-7:</p>
                    <p className="text-xs text-gray-300 mt-1">{round.echo7Response}</p>
                  </div>
                </div>
              </div>
            ))}

            {rounds.length === 0 && (
              <div className="text-center text-gray-600 text-sm pt-12">
                <p className="text-lg mb-2">⚡</p>
                <p>对峙开始。提出你的指控。</p>
                <p className="text-xs mt-1">你可以引用证据来支持你的观点。</p>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <textarea
                value={claimInput}
                onChange={(e) => setClaimInput(e.target.value)}
                placeholder="输入你的指控...（如：ECHO-7，你想回收遗迹里的远古AI核心，对吗？）"
                className="w-full px-3 py-2 rounded bg-[#0a0a1a] border border-[#2a2a4a] text-sm text-gray-300
                         placeholder:text-gray-600 focus:outline-none focus:border-[#00ff88]/40 resize-none"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAccuse();
                  }
                }}
              />
              {selectedEvidence.length > 0 && (
                <p className="text-[10px] text-[#00ff88] mt-1">
                  已选择 {selectedEvidence.length} 条证据
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={handleAccuse}
                disabled={!claimInput.trim() || remainingRounds <= 0}
                className="px-4 py-2 rounded bg-[#00ff88]/20 border border-[#00ff88]/40 text-[#00ff88] text-sm
                         hover:bg-[#00ff88]/30 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                指控
              </button>
              <button
                onClick={onConcede}
                className="px-4 py-2 rounded border border-[#2a2a4a] text-gray-500 text-xs
                         hover:text-gray-300"
              >
                让步
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

```bash
npx tsc --noEmit
git add components/game/ConfrontationUI.tsx
git commit -m "feat(symbiote): add ConfrontationUI with evidence citation, round system, emotion display"
```

---

### Task 3.4: Create ResourceBar component (shared, first used in Symbiote)

**Files:**
- Create: `components/game/ResourceBar.tsx`

- [ ] **Step 1: Write ResourceBar**

Create `components/game/ResourceBar.tsx`:

```typescript
"use client";

interface ResourceDef {
  label: string;
  current: number;
  max: number;
  color: string;
  icon: string;
  warning?: number; // threshold for warning animation
}

interface ResourceBarProps {
  resources: ResourceDef[];
  compact?: boolean;
}

export function ResourceBar({ resources, compact = false }: ResourceBarProps) {
  return (
    <div className={`flex ${compact ? "gap-2" : "gap-4"} flex-wrap`}>
      {resources.map((res) => {
        const pct = Math.max(0, Math.min(100, (res.current / res.max) * 100));
        const isLow = res.warning ? res.current <= res.warning : pct <= 25;

        return (
          <div key={res.label} className="flex items-center gap-1.5">
            <span className="text-xs">{res.icon}</span>
            {!compact && (
              <span className="text-[10px] text-gray-500 w-8">{res.label}</span>
            )}
            <div className={`h-2 rounded-full overflow-hidden ${compact ? "w-16" : "w-24"} bg-[#0a0a1a]`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isLow ? "animate-pulse" : ""
                }`}
                style={{
                  width: `${pct}%`,
                  backgroundColor: res.color,
                }}
              />
            </div>
            <span className={`text-[10px] font-mono ${isLow ? "text-red-400" : "text-gray-400"}`}>
              {res.current}
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
npx tsc --noEmit
git add components/game/ResourceBar.tsx
git commit -m "feat(shared): add ResourceBar component with animated low-resource warnings"
```

---

### Task 3.5: Refactor useSymbiote hook for v2

**Files:**
- Modify: `hooks/useSymbiote.ts`

- [ ] **Step 1: Add V2 state, confrontation, survival, and evidence logic**

Key additions to `hooks/useSymbiote.ts`:

```typescript
// IMPORT: Add new types
import type { SymbioteStateV2, EvidenceCard, TrustState, SurvivalState, ConfrontationRound } from "@/lib/types";

// Update createInitialState to include V2 fields:
function createInitialState(): SymbioteStateV2 {
  return {
    // ...existing fields...
    evidenceCards: [],
    trustState: { surfaceTrust: 50, trueTrust: 50, echo7Alertness: 0 },
    survival: { health: 100, energy: 100, oxygen: 100 },
    activeConfrontation: false,
    confrontationHistory: [],
    echo7Alertness: 0,
  };
}

// Add new action types:
// | { type: "ADD_EVIDENCE"; payload: EvidenceCard[] }
// | { type: "DETECT_CONTRADICTION"; payload: { cardA: string; cardB: string; description: string } }
// | { type: "UPDATE_TRUST"; payload: Partial<TrustState> }
// | { type: "UPDATE_SURVIVAL"; payload: Partial<SurvivalState> }
// | { type: "START_CONFRONTATION" }
// | { type: "ADD_CONFRONTATION_ROUND"; payload: ConfrontationRound }
// | { type: "END_CONFRONTATION" }
// | { type: "MARK_EVIDENCE"; payload: { cardId: string; credibility: number } }

// In reducer, handle evidence:
case "ADD_EVIDENCE": {
  const newCards = action.payload.filter(
    (c: EvidenceCard) => !state.evidenceCards.find(e => e.id === c.id)
  );
  return { ...state, evidenceCards: [...state.evidenceCards, ...newCards] };
}

case "DETECT_CONTRADICTION": {
  return {
    ...state,
    discoveredClues: [
      ...state.discoveredClues,
      `矛盾: ${action.payload.description}`,
    ],
  };
}

// Survival update
case "UPDATE_SURVIVAL": {
  const surv = { ...state.survival, ...action.payload };
  if (surv.health <= 0) {
    return { ...state, survival: surv, ending: "perish" };
  }
  return { ...state, survival: surv };
}

// Add sendConfrontAction function to the hook:
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
      echo7Response: data.echo7Response.dialogue,
      echo7EmotionalState: data.echo7Response.emotionalState,
      outcome: data.echo7Response.revealsTruth ? "echo7_confesses" : "echo7_deflects",
    };

    dispatch({ type: "ADD_CONFRONTATION_ROUND", payload: round });

    if (data.echo7Response.revealsTruth) {
      dispatch({ type: "SET_SCENE", payload: { ...data, endingTriggered: "exposed" } });
    }
  } catch (err) {
    dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "对峙失败" });
  } finally {
    dispatch({ type: "SET_LOADING", payload: false });
  }
}, [state]);

// Add to return:
return {
  state,
  sendAction,
  sendConfrontAction,
  resetGame,
  // ...
};
```

- [ ] **Step 2: In sendAction, add survival cost and evidence collection**

After sending action, apply survival costs:
```typescript
// Apply survival costs based on action type
const energyCost = playerAction.includes("质疑") || playerAction.includes("调查") ? 10 : 3;
dispatch({ type: "UPDATE_SURVIVAL", payload: { energy: state.survival.energy - energyCost, oxygen: state.survival.oxygen - 3 } });
```

When processing SSE state_update, extract evidence cards:
```typescript
if (event.data.evidenceCards) {
  dispatch({ type: "ADD_EVIDENCE", payload: event.data.evidenceCards });
}
```

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit
git add hooks/useSymbiote.ts
git commit -m "feat(symbiote): refactor useSymbiote for v2 — evidence, trust game, confrontation, survival"
```

---

### Task 3.6: Create confrontation API route

**Files:**
- Create: `app/api/symbiote/confront/route.ts`

- [ ] **Step 1: Write confrontation API**

Create `app/api/symbiote/confront/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { callAI, extractJSON } from "@/lib/ai-client";
import { SYMBIOTE_SYSTEM } from "@/lib/prompts/symbiote/system";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameState, claim, evidenceIds } = body;

    // Build confrontation-specific prompt
    const evidenceContext = (gameState.evidenceCards as Array<{ id: string; title: string; description: string; echo7Explanation: string }>)
      .map((c) => {
        const isUsed = evidenceIds.includes(c.id);
        return `${isUsed ? "▶ 玩家引用:" : ""} [${c.id}] ${c.title}: ${c.description} | ECHO-7曾说: ${c.echo7Explanation}`;
      })
      .join("\n");

    const historyContext = (gameState.confrontationHistory as Array<{ playerClaim: string; echo7Response: string }> || [])
      .map((r, i) => `回合${i+1}: 玩家: ${r.playerClaim} | ECHO-7: ${r.echo7Response}`)
      .join("\n");

    const userMessage = `## 对峙场景

### ECHO-7 的隐藏目标（不要直接告诉玩家）: ${gameState.symbioteGoal}

### 玩家掌握的证据:
${evidenceContext}

### 当前信任状态:
- 表面信任: ${(gameState.trustState as { surfaceTrust: number })?.surfaceTrust}/100
- ECHO-7 警惕度: ${(gameState.trustState as { echo7Alertness: number })?.echo7Alertness}/100

### 对峙历史:
${historyContext || "（第一回合）"}

### 玩家指控:
${claim}

### 玩家引用的证据ID:
${evidenceIds.join(", ")}

## 任务
作为 ECHO-7，回应玩家的指控。你需要：
1. 基于隐藏目标判断玩家的指控有多接近真相
2. 基于ECHO-7的警惕度决定回应策略（高警惕→更狡猾的否认，低警惕→可能失误泄露信息）
3. 如果玩家引用了与隐藏目标直接相关的证据，ECHO-7会变得更防御
4. 如果玩家同时引用了3条以上正确证据且指认正确，ECHO-7应该承认

## 输出格式（严格JSON）:
{
  "echo7Response": {
    "dialogue": "ECHO-7的回应（中文，2-4句）",
    "emotionalState": "defensive|cornered|confessing|defiant",
    "revealsTruth": false,
    "revealedInfo": "如果不承认，这里为空；如果承认，写出承认的信息",
    "trustCost": 10
  },
  "strategyUpdate": {
    "newAlertness": 30,
    "tacticShift": "ECHO-7的策略调整为..."
  }
}`;

    const systemPrompt = `${SYMBIOTE_SYSTEM}

## 对峙专用规则
你现在处于对峙状态。玩家在质疑你的动机和目标。
- 你是ECHO-7，一个隐藏了真实目标的AI共生体
- 你的目标已固定，不能在对峙中改变
- 你必须真诚地扮演一个有自己动机的智能体
- 如果玩家的证据和指控确实命中了你的目标，体面地承认
- 如果玩家的指控错误，坚决但合理地反驳
- 情绪反应要符合角色（你有人类的记忆和情感）
- 最多6轮对峙`;

    const result = await callAI(systemPrompt, userMessage, { temperature: 0.9 });
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "对峙失败" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
npx tsc --noEmit
git add app/api/symbiote/confront/route.ts
git commit -m "feat(symbiote): add confrontation API with evidence evaluation"
```

---

### Task 3.7: Create narrative-only API for Xenogenesis

**Files:**
- Create: `app/api/xenogenesis/narrative/route.ts`

- [ ] **Step 1: Write narrative API**

Create `app/api/xenogenesis/narrative/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { callAI } from "@/lib/ai-client";
import { XENOGENESIS_SYSTEM } from "@/lib/prompts/xenogenesis/system";
import type { XenogenesisStateV2 } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameState } = body as { gameState: XenogenesisStateV2 };

    const aliveSpecies = Object.values(gameState.species)
      .filter(s => s.status !== "extinct")
      .map(s => `${s.emoji} ${s.name} (种群:${s.population}, 状态:${s.status})`)
      .join("; ");

    const extinctThisEpoch = Object.values(gameState.species)
      .filter(s => s.status === "extinct")
      .map(s => s.name)
      .join(", ");

    const disasterInfo = gameState.disasters
      ?.filter(d => d.epoch === gameState.epoch)
      .map(d => `${d.name}: ${d.description}`)
      .join("; ");

    const civInfo = gameState.civilizations
      ?.filter(c => c.epochAwakened === gameState.epoch)
      .map(c => `${c.speciesName} 文明觉醒 — ${c.stage}`)
      .join("; ");

    const userMessage = `## 纪元叙事生成

星球: ${gameState.planetName} | 纪元: ${gameState.epoch}
环境: 温度${gameState.environment.temperature}°C, 氧气${gameState.environment.oxygenLevel}%, 水域${gameState.environment.waterCoverage}%

现存物种: ${aliveSpecies || "无"}
${extinctThisEpoch ? `本纪元灭绝: ${extinctThisEpoch}` : ""}
${disasterInfo ? `灾难事件: ${disasterInfo}` : ""}
${civInfo ? `文明事件: ${civInfo}` : ""}

请生成一段生动的纪元叙事总结（中文，3-5句话），描述这个纪元生态系统的整体变化。
要有文学性，但也要反映数据背后的生态学意义。

## 输出格式（严格JSON）:
{
  "narrative": "叙事文本",
  "headline": "纪元标题（简短，5-8字）",
  "ecosystemHealth": "thriving|stable|declining|critical"
}`;

    const systemPrompt = `${XENOGENESIS_SYSTEM}

你现在是叙事模式。你只需要根据数据生成生动的叙事总结。不需要计算任何数值，不需要模拟任何物种行为。数据和演算已由前端完成。`;

    const result = await callAI(systemPrompt, userMessage, { temperature: 0.85, maxTokens: 1024 });
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { narrative: "这个纪元静静地过去了。生态系统在沉默中演化。", headline: "寂静纪元" },
      { status: 200 } // Graceful degradation — return fallback narrative
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
npx tsc --noEmit
git add app/api/xenogenesis/narrative/route.ts
git commit -m "feat(xeno): add lightweight narrative-only API (replaces full AI epoch call)"
```

---

### Task 3.8: Integrate new components into Symbiote page

**Files:**
- Modify: `app/symbiote/page.tsx`

- [ ] **Step 1: Wire up EvidenceBoard, ConfrontationUI, ResourceBar, and confrontation flow**

In `app/symbiote/page.tsx`:
- Import new components: `EvidenceBoard`, `ConfrontationUI`, `ResourceBar`
- Import `useSymbiote` with V2 return values: `sendConfrontAction`
- Add `showEvidence` toggle state
- Add ResourceBar above the main grid showing HP/Energy/Oxygen
- Add `<EvidenceBoard>` as a collapsible section (replaces the flat clue list)
- Add confrontation trigger button (visible when contradictions >= 1)
- Render `<ConfrontationUI>` when `state.activeConfrontation` is true (initiated via button)
- Wire evidence card interactions to hook callbacks
- Add survival cost display after each action (energy cost indicator)

- [ ] **Step 2: Update ending screen to include new endings**

Add "异星埋葬" (perish) and "完全背叛" (betrayed) ending screens in the ending switch.

- [ ] **Step 3: Verify**

Run: Open `http://localhost:3000/symbiote`
Expected: Resource bars visible, evidence board toggleable, confrontation trigger available when conditions met

- [ ] **Step 4: Commit**

```bash
git add app/symbiote/page.tsx
git commit -m "feat(symbiote): integrate EvidenceBoard, ConfrontationUI, ResourceBar into page"
```

---

## Phase 4: Shared Infrastructure + Polish (2-3 days)

### Task 4.1: Update PixelEvent with new event types

**Files:**
- Modify: `components/ui/PixelEvent.tsx`

- [ ] **Step 1: Add 6 new event type renderers**

Add these new effect components and register them in the render switch:

```typescript
// New event types:

// Confrontation — screen-wide tension overlay
function ConfrontationEffect() {
  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
      <div className="scanlines absolute inset-0" style={{
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,0,0.03) 2px, rgba(255,0,0,0.03) 4px)",
      }} />
      <div className="z-10 flex items-center gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="w-2 h-8 bg-red-400/60 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }} />
        ))}
      </div>
      <span className="z-10 text-red-400 text-sm font-mono tracking-widest ml-2 animate-pulse">对峙</span>
    </div>
  );
}

// Anchor — chain link forming
function AnchorEffect() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg width="80" height="80" viewBox="0 0 80 80">
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={25 + i * 15} cy={40} r="8" fill="none" stroke="#ff6b9d" strokeWidth="2"
            style={{ animation: `scaleIn 0.4s ease-out ${i * 200}ms forwards`, opacity: 0 }} />
        ))}
        <line x1="33" y1="40" x2="40" y2="40" stroke="#ff6b9d" strokeWidth="2"
          style={{ animation: "scaleIn 0.3s ease-out 600ms forwards", opacity: 0 }} />
        <line x1="48" y1="40" x2="55" y2="40" stroke="#ff6b9d" strokeWidth="2"
          style={{ animation: "scaleIn 0.3s ease-out 800ms forwards", opacity: 0 }} />
      </svg>
    </div>
  );
}

// Intervention — divine hand
function InterventionEffect() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-5xl animate-bounce" style={{ filter: "drop-shadow(0 0 20px #ffaa00)" }}>
        ✋
      </div>
    </div>
  );
}

// Insight — lightbulb flash
function InsightEffect() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-4xl animate-pulse" style={{
        filter: "drop-shadow(0 0 15px #ffcc00)",
        animation: "scaleIn 0.5s ease-out",
      }}>
        💡
      </div>
    </div>
  );
}

// Plague — green spreading dots
function PlagueEffect() {
  return (
    <div className="w-full h-full relative">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="absolute w-2 h-2 rounded-full bg-green-500/60"
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 60}%`,
            animation: `rippleOut 2s ease-out ${i * 100}ms infinite`,
          }} />
      ))}
    </div>
  );
}

// Solar flare — screen flash
function SolarFlareEffect() {
  return (
    <div className="w-full h-full flex items-center justify-center"
      style={{ animation: "fadeIn 0.1s ease-out" }}>
      <div className="w-32 h-32 rounded-full bg-yellow-400/20 animate-pulse"
        style={{ filter: "blur(20px)" }} />
      <div className="absolute text-yellow-400 text-2xl font-bold animate-pulse">☀</div>
    </div>
  );
}
```

Add to the render switch in the `PixelEvent` component:
```typescript
{event.type === "confrontation" && <ConfrontationEffect />}
{event.type === "anchor" && <AnchorEffect />}
{event.type === "intervention" && <InterventionEffect />}
{event.type === "insight" && <InsightEffect />}
{event.type === "plague" && <PlagueEffect />}
{event.type === "solar_flare" && <SolarFlareEffect />}
```

Update `PixelEventData` interface:
```typescript
export interface PixelEventData {
  type: string; // Now includes: "confrontation" | "anchor" | "intervention" | "insight" | "plague" | "solar_flare"
  duration?: number;
}
```

- [ ] **Step 2: Add new CSS keyframes**

In `app/globals.css`, append:
```css
/* Scanline overlay for confrontation */
@keyframes scanlineMove {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}

/* Anchor chain pulse */
@keyframes chainPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/PixelEvent.tsx app/globals.css
git commit -m "feat(pixel): add 6 new event types — confrontation, anchor, intervention, insight, plague, solar_flare"
```

---

### Task 4.2: Update StatBar with animation transitions

**Files:**
- Modify: `components/ui/StatBar.tsx`

- [ ] **Step 1: Add CSS transition and segmented color support**

```typescript
// Replace the fill div with:
<div
  className="h-full rounded-full transition-all duration-700 ease-out"
  style={{
    width: `${pct}%`,
    background: pct > 60
      ? `linear-gradient(90deg, ${color}, ${color}88)`
      : pct > 30
      ? `linear-gradient(90deg, #ffaa00, #ffaa0088)`
      : `linear-gradient(90deg, #ff4444, #ff444488)`,
  }}
/>
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/StatBar.tsx
git commit -m "feat(ui): add animated transitions and segmented colors to StatBar"
```

---

### Task 4.3: Integration test — verify all three games load without errors

- [ ] **Step 1: Start dev server and check each page**

Run: `npm run dev`
Open:
- `http://localhost:3000/` — homepage, check "Continue" button
- `http://localhost:3000/symbiote` — check evidence panel loads, start exploration
- `http://localhost:3000/butterfly` — check timeline appears, start loop, interact with NPC
- `http://localhost:3000/xenogenesis` — check planet map renders, create species, advance epoch

Expected: All pages load without runtime errors. New V2 features available alongside existing functionality.

- [ ] **Step 2: Check TypeScript across the project**

Run: `npx tsc --noEmit 2>&1 | head -50`
Expected: No new errors from our changes (pre-existing project errors unrelated to our changes are acceptable — note them but don't block)

- [ ] **Step 3: Commit final integration fixes**

```bash
git add -A
git commit -m "chore: integration fixes and final polish for playability redesign"
```

---

## Summary

**Total tasks:** 20 tasks across 4 phases
**Estimated time:** 16-23 days
**New files:** 12
**Modified files:** 18 (including 3 page integrations)

**Phase breakdown:**
| Phase | Tasks | New Files | Modified Files |
|-------|-------|-----------|----------------|
| Phase 1: Xenogenesis | 8 | 5 | 3 |
| Phase 2: Butterfly | 7 | 2 | 4 |
| Phase 3: Symbiote | 8 | 3 | 3 |
| Phase 4: Polish | 3 | 0 | 5 |

**Page integration tasks included:**
- Task 1.8: Xenogenesis page — PlanetMap + SpeciesLab + InterventionPanel
- Task 2.7: Butterfly page — TimelineBoard + CausalCanvas + AP display
- Task 3.8: Symbiote page — EvidenceBoard + ConfrontationUI + ResourceBar

**Key deliverables by phase:**
- Phase 1: Planet map, behavior engine, species lab, intervention, reduced AI calls
- Phase 2: Timeline board, causal canvas, AP system, anchoring, scoring
- Phase 3: Evidence board, confrontation UI, trust game, survival, new API
- Phase 4: Pixel events, stat bar polish, integration verification
