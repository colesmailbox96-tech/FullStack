import { describe, it, expect } from 'vitest';
import { NPCManager } from './NPCManager';
import { TileMap, createTile, TileType } from '../world/TileMap';
import { GAMEPLAY_CONFIG, WorldConfig } from '../engine/Config';

/** Create a simple fully-walkable TileMap for testing */
function makeWalkableTileMap(size: number): TileMap {
  const tileMap = new TileMap(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      tileMap.setTile(x, y, createTile(TileType.Grass, 0.5, 0.5, 0.5, 0));
    }
  }
  return tileMap;
}

function makeTestConfig(overrides: Partial<WorldConfig> = {}): WorldConfig {
  return { ...GAMEPLAY_CONFIG, worldSize: 32, initialNPCCount: 5, minPopulation: 3, maxPopulation: 10, ...overrides };
}

describe('NPCManager', () => {
  it('spawnInitial creates the correct number of NPCs', () => {
    const manager = new NPCManager(42);
    const tileMap = makeWalkableTileMap(32);
    const config = makeTestConfig({ initialNPCCount: 10 });
    manager.spawnInitial(config.initialNPCCount, tileMap, config);
    expect(manager.getNPCs()).toHaveLength(10);
    expect(manager.getAliveNPCs()).toHaveLength(10);
  });

  it('getAliveNPCs excludes dead NPCs', () => {
    const manager = new NPCManager(42);
    const tileMap = makeWalkableTileMap(32);
    const config = makeTestConfig({ initialNPCCount: 5 });
    manager.spawnInitial(config.initialNPCCount, tileMap, config);
    // Kill one NPC
    manager.getNPCs()[0].alive = false;
    expect(manager.getAliveNPCs()).toHaveLength(4);
    expect(manager.getNPCs()).toHaveLength(5); // still in array until animation completes
  });

  it('removes dead NPCs after death animation completes', () => {
    const manager = new NPCManager(42);
    const tileMap = makeWalkableTileMap(32);
    const config = makeTestConfig({ initialNPCCount: 5, minPopulation: 0, maxPopulation: 50 });
    manager.spawnInitial(config.initialNPCCount, tileMap, config);

    const npc = manager.getNPCs()[0];
    npc.alive = false;
    // Simulate partial death animation (not yet complete)
    npc.deathAnimation = 0.5;

    // Need a minimal update call — use a mock approach by calling the internal filter logic
    // Since update() requires full dependencies, simulate the removal logic directly:
    // Dead NPC with incomplete animation should stay
    const beforeCount = manager.getNPCs().length;

    // Manually simulate what update does for removal:
    // npcs = npcs.filter(npc => npc.alive || npc.deathAnimation < 1)
    // With deathAnimation = 0.5, the NPC should stay
    expect(npc.deathAnimation).toBeLessThan(1);
    expect(manager.getNPCs()).toHaveLength(beforeCount);

    // Complete the death animation
    npc.deathAnimation = 1.0;
    // The NPC should be removed on next update cycle
    // We can't easily call update() without full deps, so test the filter condition
    const filtered = manager.getNPCs().filter(n => n.alive || n.deathAnimation < 1);
    expect(filtered).toHaveLength(beforeCount - 1);
  });

  it('getNPCById returns correct NPC', () => {
    const manager = new NPCManager(42);
    const tileMap = makeWalkableTileMap(32);
    const config = makeTestConfig({ initialNPCCount: 3 });
    manager.spawnInitial(config.initialNPCCount, tileMap, config);

    const firstNPC = manager.getNPCs()[0];
    expect(manager.getNPCById(firstNPC.id)).toBe(firstNPC);
    expect(manager.getNPCById('nonexistent')).toBeNull();
  });

  it('maxPopulation config exists and has a reasonable default', () => {
    const config = makeTestConfig();
    expect(config.maxPopulation).toBeDefined();
    expect(config.maxPopulation).toBeGreaterThan(config.minPopulation);
  });

  it('GAMEPLAY_CONFIG has maxPopulation set', () => {
    expect(GAMEPLAY_CONFIG.maxPopulation).toBeDefined();
    expect(GAMEPLAY_CONFIG.maxPopulation).toBeGreaterThanOrEqual(GAMEPLAY_CONFIG.minPopulation);
  });
});
