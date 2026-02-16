import type { IBrain } from '../ai/IBrain';
import type { Perception, TileInfo, ObjectInfo } from '../ai/Perception';
import type { DecisionLog } from '../data/DataLogger';
import type { ActionType } from '../ai/Action';
import type { WeatherState } from '../world/Weather';
import { TileType } from '../world/TileMap';
import { ObjectType } from '../world/WorldObject';

const WEATHER_TYPES: WeatherState[] = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog'];
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

const MEMORY_TYPES = ['found_food', 'danger', 'met_npc', 'found_shelter', 'discovered_area'] as const;

/**
 * Triangle-wave function cycling between 0 and 1 with the given period.
 * Provides full-range coverage of need values over time.
 */
function triangleWave(tick: number, period: number, phase: number = 0): number {
  const t = (((tick + phase) % period) + period) % period / period;
  return t < 0.5 ? t * 2 : 2 - t * 2;
}

/**
 * Generate walkable tiles around the NPC position for the behavior tree
 * to use when selecting EXPLORE targets.
 */
function buildNearbyTiles(cx: number, cy: number, tick: number): TileInfo[] {
  const tiles: TileInfo[] = [];
  const radius = 8;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      // Deterministic tile type selection based on position
      const hash = ((x * 31 + y * 17 + tick) & 0xffff) % 20;
      let type: TileType;
      let walkable = true;
      if (hash < 12) { type = TileType.Grass; }
      else if (hash < 14) { type = TileType.FlowerGrass; }
      else if (hash < 16) { type = TileType.DenseGrass; }
      else if (hash < 17) { type = TileType.Sand; }
      else if (hash < 18) { type = TileType.ShallowWater; walkable = false; }
      else if (hash < 19) { type = TileType.Stone; }
      else { type = TileType.CaveWall; walkable = false; }
      tiles.push({ x, y, type, walkable });
    }
  }
  return tiles;
}

/**
 * Generate a synthetic decision log by running a brain against
 * procedurally-generated perceptions. Used for headless testing.
 */
export function generateSyntheticLog(brain: IBrain, count: number): DecisionLog[] {
  const log: DecisionLog[] = [];

  // Use triangle waves with different periods so needs cycle independently
  // through their full range, producing diverse action triggers.
  const HUNGER_PERIOD = 120;
  const ENERGY_PERIOD = 97;
  const SOCIAL_PERIOD = 151;
  const CURIOSITY_PERIOD = 133;
  const SAFETY_PERIOD = 109;

  const needs = { hunger: 0.7, energy: 0.7, social: 0.6, curiosity: 0.6, safety: 0.8 };
  const cx = 64;
  const cy = 64;

  for (let i = 0; i < count; i++) {
    // Use triangle waves to cycle each need through its full [0.05, 0.95] range
    // with different periods so all combinations are exercised.
    needs.hunger = 0.05 + triangleWave(i, HUNGER_PERIOD, 0) * 0.9;
    needs.energy = 0.05 + triangleWave(i, ENERGY_PERIOD, 30) * 0.9;
    needs.social = 0.05 + triangleWave(i, SOCIAL_PERIOD, 60) * 0.9;
    needs.curiosity = 0.05 + triangleWave(i, CURIOSITY_PERIOD, 45) * 0.9;
    needs.safety = 0.05 + triangleWave(i, SAFETY_PERIOD, 15) * 0.9;

    // Use a shorter day cycle (200 ticks) so all 4 time periods are covered
    const timeOfDay = (i % 200) / 200;
    // Use a shorter weather cycle (50 ticks) so storm overlaps with night
    const weatherIdx = Math.floor(i / 50) % WEATHER_TYPES.length;
    const weather = WEATHER_TYPES[weatherIdx];
    const seasonIdx = Math.floor(i / 250) % SEASONS.length;

    // Always provide walkable tiles so EXPLORE can fire instead of IDLE
    const nearbyTiles = buildNearbyTiles(cx, cy, i);

    // Build nearby objects with varied counts for feature variance
    const objectInfos: ObjectInfo[] = [];
    // Berry bush — available for FORAGE; vary count (0-2)
    const berryCount = i % 3; // 0, 1, or 2 bushes
    for (let b = 0; b < berryCount; b++) {
      objectInfos.push({
        id: `obj_berry_${b}`,
        type: ObjectType.BerryBush,
        x: cx + 2 + b,
        y: cy + 1,
        state: 'normal',
      });
    }
    // Campfire — available for SEEK_SHELTER; present ~60% of the time for variance
    if (i % 5 !== 0) {
      objectInfos.push({
        id: 'obj_campfire_0',
        type: ObjectType.Campfire,
        x: cx + 4,
        y: cy - 2,
        state: 'normal',
      });
    }
    // Occasionally add trees for GATHER variety
    if (i % 3 === 0) {
      objectInfos.push({
        id: 'obj_tree_0',
        type: ObjectType.OakTree,
        x: cx - 3,
        y: cy + 2,
        state: 'normal',
      });
    }

    // Provide NPCs with varied count (0-2) for feature variance
    const npcCount = i % 4 === 0 ? 0 : (i % 3 === 0 ? 2 : 1);
    const nearbyNPCInfos = [];
    for (let n = 0; n < npcCount; n++) {
      const npcDist = 3 + (i % 5) + n * 2;
      nearbyNPCInfos.push({
        id: `npc_${10 + n + (i % 3)}`,
        x: cx - npcDist,
        y: cy + n,
        dx: -1,
        dy: 0,
        action: 'IDLE' as ActionType,
      });
    }

    // Diverse memories with varying counts (1-3) and types
    const memTypeIdx = i % MEMORY_TYPES.length;
    const memTicksAgo = 10 + (i % 200);
    const topMemories = [
      { type: MEMORY_TYPES[memTypeIdx], ticks_ago: memTicksAgo },
    ];
    // Add second memory ~50% of the time
    if (i % 2 === 0) {
      const memTypeIdx2 = (i + 2) % MEMORY_TYPES.length;
      topMemories.push({ type: MEMORY_TYPES[memTypeIdx2], ticks_ago: memTicksAgo + 50 });
    }
    // Add third memory ~25% of the time
    if (i % 4 === 0) {
      const memTypeIdx3 = (i + 4) % MEMORY_TYPES.length;
      topMemories.push({ type: MEMORY_TYPES[memTypeIdx3], ticks_ago: memTicksAgo + 100 });
    }

    const relevantMemories = topMemories.map(m => ({
      type: m.type as any,
      tick: Math.max(0, i - m.ticks_ago),
      x: 50 + (i % 20),
      y: 50 + ((i * 7) % 20),
      significance: 0.3 + (i % 7) * 0.1,
    }));

    const perception: Perception = {
      nearbyTiles,
      nearbyObjects: objectInfos,
      nearbyNPCs: nearbyNPCInfos,
      nearbyConstructionSites: [],
      nearbyStructures: [],
      needs: { ...needs },
      personality: { bravery: 0.5, sociability: 0.5, curiosity: 0.5, industriousness: 0.5, craftiness: 0.5 },
      inventory: { wood: 0, stone: 0, berries: 0 },
      relevantMemories,
      timeOfDay,
      weather,
      season: SEASONS[seasonIdx],
      currentTick: i,
      cameraX: cx,
      cameraY: cy,
      cameraZoom: 1,
      craftInventoryThreshold: 5,
      hasFishingRod: false,
      nearbyFishingSpots: [],
    };

    const action = brain.decide(perception);

    // Build DecisionLog-format perception with varied tile summaries
    const grassCount = 12 + (i % 10);
    const waterCount = 1 + (i % 4);
    const stoneCount = 2 + (i % 3);
    const dirtCount = 1 + (i % 2);

    const dlNearbyNPCs = nearbyNPCInfos.map(n => ({
      id: n.id,
      dx: n.x - cx,
      dy: n.y - cy,
    }));

    const dlNearbyObjects = objectInfos.map(o => ({
      type: o.type,
      dx: o.x - cx,
      dy: o.y - cy,
      state: o.state,
    }));

    const dlPerception = {
      nearby_tiles_summary: { grass: grassCount, water: waterCount, stone: stoneCount, dirt: dirtCount },
      nearby_npcs: dlNearbyNPCs,
      nearby_objects: dlNearbyObjects,
      needs: { ...needs },
      top_memories: topMemories,
      weather,
      time_of_day: timeOfDay,
    };

    // Simulate outcome — apply need restoration when action fires
    const needsDelta: Record<string, number> = { hunger: 0, energy: 0, social: 0, curiosity: 0, safety: 0 };
    if (action.type === 'FORAGE') { needsDelta.hunger = 0.1; needs.hunger = Math.min(1, needs.hunger + 0.1); }
    if (action.type === 'REST') { needsDelta.energy = 0.15; needs.energy = Math.min(1, needs.energy + 0.15); }
    if (action.type === 'SOCIALIZE') { needsDelta.social = 0.1; needs.social = Math.min(1, needs.social + 0.1); }
    if (action.type === 'EXPLORE') { needsDelta.curiosity = 0.1; needs.curiosity = Math.min(1, needs.curiosity + 0.1); }
    if (action.type === 'SEEK_SHELTER') { needsDelta.safety = 0.1; needs.safety = Math.min(1, needs.safety + 0.1); }

    log.push({
      schema_version: '1.0.0',
      tick: i,
      npc_id: 'npc_1',
      perception: dlPerception as any,
      decision: action.type,
      outcome: { needs_delta: needsDelta },
    });
  }

  return log;
}
