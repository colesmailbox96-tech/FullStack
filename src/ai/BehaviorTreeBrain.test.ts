import { describe, it, expect } from 'vitest';
import { BehaviorTreeBrain } from './BehaviorTreeBrain';
import type { Perception } from './Perception';
import { TileType } from '../world/TileMap';
import { ObjectType } from '../world/WorldObject';

function makePerception(overrides: Partial<Perception> = {}): Perception {
  return {
    nearbyTiles: [
      { x: 5, y: 5, type: TileType.Grass, walkable: true },
      { x: 6, y: 5, type: TileType.Grass, walkable: true },
      { x: 7, y: 5, type: TileType.Grass, walkable: true },
      { x: 5, y: 6, type: TileType.Grass, walkable: true },
      { x: 10, y: 10, type: TileType.Grass, walkable: true },
    ],
    nearbyObjects: [],
    nearbyNPCs: [],
    needs: { hunger: 0.8, energy: 0.8, social: 0.8, curiosity: 0.8, safety: 0.8 },
    relevantMemories: [],
    timeOfDay: 0.5,
    weather: 'clear',
    season: 'spring',
    currentTick: 100,
    cameraX: 5,
    cameraY: 5,
    cameraZoom: 1,
    ...overrides,
  };
}

describe('BehaviorTreeBrain', () => {
  const brain = new BehaviorTreeBrain();

  describe('emergency behaviors', () => {
    it('forages when hunger is critically low and food available', () => {
      const p = makePerception({
        needs: { hunger: 0.05, energy: 0.8, social: 0.8, curiosity: 0.8, safety: 0.8 },
        nearbyObjects: [
          { id: 'bush1', type: ObjectType.BerryBush, x: 7, y: 7, state: 'ripe' },
        ],
      });
      const action = brain.decide(p);
      expect(action.type).toBe('FORAGE');
    });

    it('seeks shelter when safety is critically low and campfire available', () => {
      const p = makePerception({
        needs: { hunger: 0.8, energy: 0.8, social: 0.8, curiosity: 0.8, safety: 0.1 },
        nearbyObjects: [
          { id: 'fire1', type: ObjectType.Campfire, x: 8, y: 8, state: 'normal' },
        ],
      });
      const action = brain.decide(p);
      expect(action.type).toBe('SEEK_SHELTER');
    });

    it('rests when energy is critically low', () => {
      const p = makePerception({
        needs: { hunger: 0.8, energy: 0.05, social: 0.8, curiosity: 0.8, safety: 0.8 },
      });
      const action = brain.decide(p);
      expect(action.type).toBe('REST');
    });
  });

  describe('moderate behaviors', () => {
    it('forages when hunger is moderately low', () => {
      const p = makePerception({
        needs: { hunger: 0.2, energy: 0.8, social: 0.8, curiosity: 0.8, safety: 0.8 },
        nearbyObjects: [
          { id: 'bush1', type: ObjectType.BerryBush, x: 7, y: 7, state: 'ripe' },
        ],
      });
      const action = brain.decide(p);
      expect(action.type).toBe('FORAGE');
    });

    it('seeks shelter during storm when outdoors', () => {
      const p = makePerception({
        needs: { hunger: 0.8, energy: 0.8, social: 0.8, curiosity: 0.8, safety: 0.8 },
        weather: 'storm',
        nearbyObjects: [
          { id: 'fire1', type: ObjectType.Campfire, x: 20, y: 20, state: 'normal' },
        ],
      });
      const action = brain.decide(p);
      expect(action.type).toBe('SEEK_SHELTER');
    });

    it('rests when energy is moderately low', () => {
      const p = makePerception({
        needs: { hunger: 0.8, energy: 0.25, social: 0.8, curiosity: 0.8, safety: 0.8 },
      });
      const action = brain.decide(p);
      expect(action.type).toBe('REST');
    });
  });

  describe('social behavior', () => {
    it('socializes when social need is low and NPCs nearby', () => {
      const p = makePerception({
        needs: { hunger: 0.8, energy: 0.8, social: 0.2, curiosity: 0.8, safety: 0.8 },
        nearbyNPCs: [
          { id: 'npc1', x: 6, y: 5, dx: 0, dy: 0, action: 'IDLE' },
        ],
      });
      const action = brain.decide(p);
      expect(action.type).toBe('SOCIALIZE');
      expect(action.targetNpcId).toBe('npc1');
    });
  });

  describe('curiosity behavior', () => {
    it('explores when curiosity is low', () => {
      const p = makePerception({
        needs: { hunger: 0.8, energy: 0.8, social: 0.8, curiosity: 0.2, safety: 0.8 },
      });
      const action = brain.decide(p);
      expect(action.type).toBe('EXPLORE');
    });
  });

  describe('default behavior', () => {
    it('explores when all needs are satisfied', () => {
      const p = makePerception();
      const action = brain.decide(p);
      expect(action.type).toBe('EXPLORE');
    });
  });

  describe('proactive behaviors', () => {
    it('forages proactively when hunger below 0.50', () => {
      const p = makePerception({
        needs: { hunger: 0.45, energy: 0.8, social: 0.8, curiosity: 0.8, safety: 0.8 },
        nearbyObjects: [
          { id: 'bush1', type: ObjectType.BerryBush, x: 7, y: 7, state: 'ripe' },
        ],
      });
      const action = brain.decide(p);
      expect(action.type).toBe('FORAGE');
    });

    it('rests proactively when energy below 0.50', () => {
      const p = makePerception({
        needs: { hunger: 0.8, energy: 0.45, social: 0.8, curiosity: 0.8, safety: 0.8 },
      });
      const action = brain.decide(p);
      expect(action.type).toBe('REST');
    });
  });

  it('always returns a valid action', () => {
    const validTypes = ['FORAGE', 'REST', 'SEEK_SHELTER', 'EXPLORE', 'SOCIALIZE', 'IDLE'];
    const p = makePerception();
    const action = brain.decide(p);
    expect(validTypes).toContain(action.type);
    expect(typeof action.targetX).toBe('number');
    expect(typeof action.targetY).toBe('number');
  });

  it('uses food memory when no berry bushes visible', () => {
    const p = makePerception({
      needs: { hunger: 0.05, energy: 0.8, social: 0.8, curiosity: 0.8, safety: 0.8 },
      relevantMemories: [
        { type: 'found_food', tick: 50, x: 20, y: 30, significance: 0.8 },
      ],
    });
    const action = brain.decide(p);
    expect(action.type).toBe('FORAGE');
    expect(action.targetX).toBe(20);
    expect(action.targetY).toBe(30);
  });

  it('ignores depleted berry bushes', () => {
    const p = makePerception({
      needs: { hunger: 0.05, energy: 0.8, social: 0.8, curiosity: 0.8, safety: 0.8 },
      nearbyObjects: [
        { id: 'bush1', type: ObjectType.BerryBush, x: 7, y: 7, state: 'depleted' },
      ],
    });
    const action = brain.decide(p);
    // Should not forage from depleted bush, so either explore or idle
    // (since no food memories either, findFood returns null)
    expect(action.type).not.toBe('FORAGE');
  });
});
