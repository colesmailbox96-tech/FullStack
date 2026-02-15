import { describe, it, expect } from 'vitest';
import { findPath } from './Pathfinding';
import { TileMap, TileType, createTile } from './TileMap';

function makeWalkableMap(w: number, h: number): TileMap {
  const tm = new TileMap(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      tm.setTile(x, y, createTile(TileType.Grass, 0.5, 0.5, 0.5, 0));
    }
  }
  return tm;
}

describe('findPath', () => {
  it('finds a path on an open map', () => {
    const tm = makeWalkableMap(10, 10);
    const path = findPath(tm, 0, 0, 5, 5);
    expect(path).not.toBeNull();
    expect(path![0]).toEqual({ x: 0, y: 0 });
    expect(path![path!.length - 1]).toEqual({ x: 5, y: 5 });
  });

  it('returns single-node path for same start and end', () => {
    const tm = makeWalkableMap(10, 10);
    const path = findPath(tm, 3, 3, 3, 3);
    expect(path).toEqual([{ x: 3, y: 3 }]);
  });

  it('returns null for out-of-bounds', () => {
    const tm = makeWalkableMap(10, 10);
    expect(findPath(tm, -1, 0, 5, 5)).toBeNull();
    expect(findPath(tm, 0, 0, 10, 10)).toBeNull();
  });

  it('returns null when destination is not walkable', () => {
    const tm = makeWalkableMap(10, 10);
    tm.setTile(5, 5, createTile(TileType.DeepWater, 0.1, 0.5, 0.5, 0));
    expect(findPath(tm, 0, 0, 5, 5)).toBeNull();
  });

  it('navigates around obstacles', () => {
    const tm = makeWalkableMap(10, 10);
    // Create a wall from (3,0) to (3,8)
    for (let y = 0; y <= 8; y++) {
      tm.setTile(3, y, createTile(TileType.DeepWater, 0.1, 0.5, 0.5, 0));
    }
    const path = findPath(tm, 0, 5, 5, 5);
    expect(path).not.toBeNull();
    // Path must go around the wall
    for (const node of path!) {
      // None of the path nodes should be on the wall
      if (node.y <= 8) {
        expect(node.x).not.toBe(3);
      }
    }
  });

  it('returns null when blocked completely', () => {
    const tm = makeWalkableMap(10, 10);
    // Create a complete wall
    for (let y = 0; y < 10; y++) {
      tm.setTile(5, y, createTile(TileType.DeepWater, 0.1, 0.5, 0.5, 0));
    }
    expect(findPath(tm, 0, 0, 9, 0)).toBeNull();
  });

  it('produces a contiguous path (each step is adjacent)', () => {
    const tm = makeWalkableMap(10, 10);
    const path = findPath(tm, 0, 0, 7, 7);
    expect(path).not.toBeNull();
    for (let i = 1; i < path!.length; i++) {
      const dx = Math.abs(path![i].x - path![i - 1].x);
      const dy = Math.abs(path![i].y - path![i - 1].y);
      expect(dx + dy).toBe(1); // only 4-directional movement
    }
  });

  it('respects maxLength parameter', () => {
    const tm = makeWalkableMap(100, 100);
    // Very short maxLength → shouldn't find a path to a distant point
    const path = findPath(tm, 0, 0, 50, 50, 5);
    // Path may be null due to maxLength constraint
    if (path) {
      expect(path.length).toBeLessThanOrEqual(10);
    }
  });
});
