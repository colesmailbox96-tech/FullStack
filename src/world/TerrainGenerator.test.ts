import { describe, it, expect } from 'vitest';
import { TerrainGenerator } from './TerrainGenerator';
import { TileType } from './TileMap';

describe('TerrainGenerator', () => {
  it('generates a TileMap of correct size', () => {
    const map = TerrainGenerator.generate(42, 32, 32);
    expect(map.width).toBe(32);
    expect(map.height).toBe(32);
  });

  it('fills all tiles', () => {
    const map = TerrainGenerator.generate(42, 16, 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        expect(map.getTile(x, y)).not.toBeNull();
      }
    }
  });

  it('is deterministic with same seed', () => {
    const map1 = TerrainGenerator.generate(42, 16, 16);
    const map2 = TerrainGenerator.generate(42, 16, 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const t1 = map1.getTile(x, y)!;
        const t2 = map2.getTile(x, y)!;
        expect(t1.type).toBe(t2.type);
        expect(t1.elevation).toBe(t2.elevation);
        expect(t1.moisture).toBe(t2.moisture);
      }
    }
  });

  it('generates different terrain with different seeds', () => {
    const map1 = TerrainGenerator.generate(1, 16, 16);
    const map2 = TerrainGenerator.generate(2, 16, 16);
    let differences = 0;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (map1.getTile(x, y)!.type !== map2.getTile(x, y)!.type) {
          differences++;
        }
      }
    }
    expect(differences).toBeGreaterThan(0);
  });

  it('generates diverse tile types', () => {
    const map = TerrainGenerator.generate(42, 64, 64);
    const types = new Set<TileType>();
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        types.add(map.getTile(x, y)!.type);
      }
    }
    // Should have multiple tile types
    expect(types.size).toBeGreaterThanOrEqual(3);
  });

  it('tiles have valid elevation/moisture/temperature', () => {
    const map = TerrainGenerator.generate(42, 16, 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const tile = map.getTile(x, y)!;
        expect(tile.elevation).toBeGreaterThanOrEqual(0);
        expect(tile.elevation).toBeLessThanOrEqual(1);
        expect(tile.moisture).toBeGreaterThanOrEqual(0);
        expect(tile.moisture).toBeLessThanOrEqual(1);
        expect(tile.temperature).toBeGreaterThanOrEqual(0);
        expect(tile.temperature).toBeLessThanOrEqual(1);
      }
    }
  });
});
