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

  const a = hashCell(ix, iy);
  const b = hashCell(ix + 1, iy);
  const c = hashCell(ix, iy + 1);
  const d = hashCell(ix + 1, iy + 1);

  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const ab = a + (b - a) * sx;
  const cd = c + (d - c) * sx;
  return ab + (cd - ab) * sy;
}

function hashCell(x: number, y: number): number {
  let h = Math.abs(x * 374761393 + y * 668265263) % 10000;
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
