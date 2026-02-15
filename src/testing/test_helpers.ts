import type { IBrain } from '../ai/IBrain';
import type { Perception } from '../ai/Perception';
import type { DecisionLog } from '../data/DataLogger';
import type { ActionType } from '../ai/Action';
import type { WeatherState } from '../world/Weather';

const WEATHER_TYPES: WeatherState[] = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog'];
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

/**
 * Generate a synthetic decision log by running a brain against
 * procedurally-generated perceptions. Used for headless testing.
 */
export function generateSyntheticLog(brain: IBrain, count: number): DecisionLog[] {
  const log: DecisionLog[] = [];
  const needs = { hunger: 0.7, energy: 0.7, social: 0.6, curiosity: 0.6, safety: 0.8 };

  for (let i = 0; i < count; i++) {
    // Slowly vary needs to create diverse data
    needs.hunger = Math.max(0.05, Math.min(0.95, needs.hunger - 0.003 + Math.sin(i * 0.01) * 0.005));
    needs.energy = Math.max(0.05, Math.min(0.95, needs.energy - 0.004 + Math.sin(i * 0.013) * 0.005));
    needs.social = Math.max(0.05, Math.min(0.95, needs.social - 0.002 + Math.sin(i * 0.008) * 0.004));
    needs.curiosity = Math.max(0.05, Math.min(0.95, needs.curiosity - 0.002 + Math.sin(i * 0.007) * 0.004));
    needs.safety = Math.max(0.05, Math.min(0.95, needs.safety - 0.001 + Math.cos(i * 0.02) * 0.006));

    const timeOfDay = (i % 2400) / 2400;
    const weatherIdx = Math.floor(i / 300) % WEATHER_TYPES.length;
    const weather = WEATHER_TYPES[weatherIdx];
    const seasonIdx = Math.floor(i / 2400) % SEASONS.length;

    const nearbyNPCs = needs.social < 0.4
      ? [{ id: 'npc_99', dx: -3, dy: 0 }]
      : [];

    const nearbyObjects = needs.hunger < 0.4
      ? [{ type: 'berry_bush', dx: 2, dy: 1, state: 'normal' }]
      : [];

    const topMemories = i > 100
      ? [{ type: 'found_food', ticks_ago: i - 50 }]
      : [];

    const perception: Perception = {
      nearbyTiles: [],
      nearbyObjects: nearbyObjects.map((o, idx) => ({
        id: `obj_${idx}`,
        type: o.type as any,
        x: 64 + o.dx,
        y: 64 + o.dy,
        state: o.state,
      })),
      nearbyNPCs: nearbyNPCs.map(n => ({
        id: n.id,
        x: 64 + n.dx,
        y: 64 + n.dy,
        dx: n.dx,
        dy: n.dy,
        action: 'IDLE' as ActionType,
      })),
      needs: { ...needs },
      personality: { bravery: 0.5, sociability: 0.5, curiosity: 0.5, industriousness: 0.5, craftiness: 0.5 },
      inventory: { wood: 0, stone: 0, berries: 0 },
      relevantMemories: topMemories.map(m => ({
        type: m.type as any,
        tick: i - m.ticks_ago,
        x: 50,
        y: 50,
        significance: 0.7,
      })),
      timeOfDay,
      weather,
      season: SEASONS[seasonIdx],
      currentTick: i,
      cameraX: 64,
      cameraY: 64,
      cameraZoom: 1,
      craftInventoryThreshold: 5,
    };

    const action = brain.decide(perception);

    // Build DecisionLog-format perception
    const dlPerception = {
      nearby_tiles_summary: { grass: 20, water: 2, stone: 3, dirt: 1 },
      nearby_npcs: nearbyNPCs,
      nearby_objects: nearbyObjects,
      needs: { ...needs },
      top_memories: topMemories,
      weather,
      time_of_day: timeOfDay,
    };

    // Simulate outcome
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
