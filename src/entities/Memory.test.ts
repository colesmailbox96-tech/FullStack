import { describe, it, expect } from 'vitest';
import { MemorySystem, Memory } from './Memory';

function makeMemory(type: Memory['type'], significance: number, x = 0, y = 0): Memory {
  return { type, tick: 100, x, y, significance };
}

describe('MemorySystem', () => {
  it('starts empty', () => {
    const ms = new MemorySystem(10);
    expect(ms.getMemories()).toEqual([]);
  });

  it('adds and retrieves memories', () => {
    const ms = new MemorySystem(10);
    ms.addMemory(makeMemory('found_food', 0.8));
    expect(ms.getMemories().length).toBe(1);
  });

  describe('capacity management', () => {
    it('evicts lowest significance when over capacity', () => {
      const ms = new MemorySystem(3);
      ms.addMemory(makeMemory('found_food', 0.5));
      ms.addMemory(makeMemory('danger', 0.3));
      ms.addMemory(makeMemory('met_npc', 0.8));
      ms.addMemory(makeMemory('found_shelter', 0.9)); // triggers eviction

      expect(ms.getMemories().length).toBe(3);
      // The danger memory (sig 0.3) should have been evicted
      const types = ms.getMemories().map(m => m.type);
      expect(types).not.toContain('danger');
    });
  });

  describe('getTopMemories', () => {
    it('returns top N by significance', () => {
      const ms = new MemorySystem(10);
      ms.addMemory(makeMemory('found_food', 0.3));
      ms.addMemory(makeMemory('danger', 0.9));
      ms.addMemory(makeMemory('met_npc', 0.5));
      ms.addMemory(makeMemory('found_shelter', 0.7));

      const top = ms.getTopMemories(2);
      expect(top.length).toBe(2);
      expect(top[0].significance).toBe(0.9);
      expect(top[1].significance).toBe(0.7);
    });
  });

  describe('getMemoriesByType', () => {
    it('filters by type', () => {
      const ms = new MemorySystem(10);
      ms.addMemory(makeMemory('found_food', 0.5, 10, 20));
      ms.addMemory(makeMemory('danger', 0.3));
      ms.addMemory(makeMemory('found_food', 0.8, 30, 40));

      const food = ms.getMemoriesByType('found_food');
      expect(food.length).toBe(2);
      expect(food.every(m => m.type === 'found_food')).toBe(true);
    });

    it('returns empty array when no matches', () => {
      const ms = new MemorySystem(10);
      ms.addMemory(makeMemory('danger', 0.5));
      expect(ms.getMemoriesByType('found_food')).toEqual([]);
    });
  });

  describe('update (decay)', () => {
    it('reduces significance over time', () => {
      const ms = new MemorySystem(10);
      ms.addMemory(makeMemory('found_food', 0.5));
      ms.update(0.1);
      expect(ms.getMemories()[0].significance).toBeCloseTo(0.4);
    });

    it('removes memories when significance reaches 0', () => {
      const ms = new MemorySystem(10);
      ms.addMemory(makeMemory('found_food', 0.05));
      ms.update(0.1);
      expect(ms.getMemories().length).toBe(0);
    });

    it('clamps significance to 0 minimum', () => {
      const ms = new MemorySystem(10);
      ms.addMemory(makeMemory('danger', 0.02));
      ms.update(0.01);
      expect(ms.getMemories()[0].significance).toBeCloseTo(0.01);
    });
  });

  describe('getRecentFoodLocation', () => {
    it('returns location of highest significance food memory', () => {
      const ms = new MemorySystem(10);
      ms.addMemory(makeMemory('found_food', 0.3, 10, 20));
      ms.addMemory(makeMemory('found_food', 0.8, 30, 40));
      const loc = ms.getRecentFoodLocation();
      expect(loc).toEqual({ x: 30, y: 40 });
    });

    it('returns null when no food memories', () => {
      const ms = new MemorySystem(10);
      ms.addMemory(makeMemory('danger', 0.5));
      expect(ms.getRecentFoodLocation()).toBeNull();
    });
  });

  describe('getRecentShelterLocation', () => {
    it('returns location of highest significance shelter memory', () => {
      const ms = new MemorySystem(10);
      ms.addMemory(makeMemory('found_shelter', 0.4, 5, 10));
      ms.addMemory(makeMemory('found_shelter', 0.9, 15, 25));
      const loc = ms.getRecentShelterLocation();
      expect(loc).toEqual({ x: 15, y: 25 });
    });

    it('returns null when no shelter memories', () => {
      const ms = new MemorySystem(10);
      expect(ms.getRecentShelterLocation()).toBeNull();
    });
  });
});
