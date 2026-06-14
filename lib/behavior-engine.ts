import type {
  SpeciesIndividual,
  BehaviorState,
  PlanetTile,
  SpeciesDef,
  TickResult,
  TickEvent,
  XenogenesisStateV2,
} from "@/lib/types";

export const TICKS_PER_EPOCH = 100;
export const MAX_INDIVIDUALS = 500; // Switch to statistical mode above this

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

export function findHabitableTiles(species: SpeciesDef, tiles: PlanetTile[][]): PlanetTile[] {
  const habitable: PlanetTile[] = [];
  const isAquatic = species.traits.specialAbility?.includes("水栖");
  const optimalTemp = 22;

  for (const row of tiles) {
    for (const tile of row) {
      const isWater = tile.terrain === "ocean" || tile.terrain === "coast";
      if (isAquatic && !isWater) continue;
      if (!isAquatic && isWater) continue;

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

  if (individuals.length === 0) {
    return { tick, individuals: [], events, populationChanges: {}, extinctions: [] };
  }

  // 1. Update hunger
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
              location: { x: ind.x, y: ind.y },
            });
          }
        }
        break;
      }
      case "fleeing": {
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
              location: { x: child.x, y: child.y },
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
        location: { x: ind.x, y: ind.y },
      });

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

  return { tick, individuals, events, populationChanges, extinctions };
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

  let avgDx = 0, avgDy = 0;
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

  let best = habitable[0];
  for (const tile of habitable) {
    const currentScore = best.resources.food + best.resources.water;
    const tileScore = tile.resources.food + tile.resources.water;
    if (tileScore > currentScore) best = tile;
  }

  individual.x = clamp(Math.round(best.x + (Math.random() - 0.5) * 4), 0, (tiles[0]?.length || 60) - 1);
  individual.y = clamp(Math.round(best.y + (Math.random() - 0.5) * 4), 0, tiles.length - 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---- Statistical mode (for large populations) ----

export function runTickStatistical(
  state: XenogenesisStateV2,
  tick: number,
): TickResult {
  const events: TickEvent[] = [];
  const populationChanges: Record<string, number> = {};
  const extinctions: string[] = [];

  for (const [speciesId, species] of Object.entries(state.species)) {
    if (species.status === "extinct") continue;

    const pop = species.population;
    const growthRate = calculateGrowthRate(species, state);
    const fluctuation = (Math.random() - 0.5) * pop * 0.05;
    const delta = Math.round(pop * growthRate + fluctuation);
    const newPop = Math.max(0, pop + delta);

    populationChanges[speciesId] = delta;

    if (newPop <= 0 && pop > 0) {
      extinctions.push(speciesId);
    }
  }

  return { tick, individuals: [], events, populationChanges, extinctions };
}

function calculateGrowthRate(species: SpeciesDef, state: XenogenesisStateV2): number {
  const base = 0.02;
  const foodBonus = (10 - species.traits.metabolism) * 0.005;
  const reproBonus = (species.traits.reproduction - 5) * 0.01;
  const adaptBonus = (species.traits.adaptability - 5) * 0.005;
  const carryingCapacity = 300;
  const popPressure = 1 - species.population / carryingCapacity;

  return (base + foodBonus + reproBonus + adaptBonus) * Math.max(-0.5, popPressure);
}
