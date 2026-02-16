import { describe, it, expect } from 'vitest';
import { TileMap, TileType, createTile } from './TileMap';

describe('createTile', () => {
  it('creates a tile with correct properties', () => {
    const tile = createTile(TileType.Grass, 0.5, 0.5, 0.5, 7);
    expect(tile.type).toBe(TileType.Grass);
    expect(tile.elevation).toBe(0.5);
    expect(tile.moisture).toBe(0.5);
    expect(tile.temperature).toBe(0.5);
    expect(tile.variant).toBe(3); // 7 & 3 = 3
    expect(tile.waterFrame).toBe(0);
    expect(tile.walkable).toBe(true);
    expect(tile.moveCost).toBe(1.0);
  });

  it('marks water tiles as non-walkable', () => {
    const deep = createTile(TileType.DeepWater, 0.1, 0.5, 0.5, 0);
    expect(deep.walkable).toBe(false);

    const shallow = createTile(TileType.ShallowWater, 0.2, 0.5, 0.5, 0);
    expect(shallow.walkable).toBe(false);
  });

  it('marks cave walls as non-walkable', () => {
    const cave = createTile(TileType.CaveWall, 0.9, 0.5, 0.5, 0);
    expect(cave.walkable).toBe(false);
  });

  it('assigns correct move costs', () => {
    const stone = createTile(TileType.Stone, 0.7, 0.5, 0.5, 0);
    expect(stone.moveCost).toBe(1.5);

    const dirt = createTile(TileType.DirtPath, 0.5, 0.5, 0.5, 0);
    expect(dirt.moveCost).toBe(0.8);

    const dryDirt = createTile(TileType.DryDirt, 0.5, 0.1, 0.5, 0);
    expect(dryDirt.moveCost).toBe(0.8);
  });

  it('masks variant to 2 bits', () => {
    const tile = createTile(TileType.Grass, 0.5, 0.5, 0.5, 255);
    expect(tile.variant).toBe(3); // 255 & 3 = 3
  });
});

describe('TileMap', () => {
  function makeTileMap(): TileMap {
    const tm = new TileMap(10, 10);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        tm.setTile(x, y, createTile(TileType.Grass, 0.5, 0.5, 0.5, 0));
      }
    }
    return tm;
  }

  it('stores and retrieves tiles', () => {
    const tm = makeTileMap();
    const tile = tm.getTile(5, 5);
    expect(tile).not.toBeNull();
    expect(tile!.type).toBe(TileType.Grass);
  });

  it('returns null for out-of-bounds', () => {
    const tm = makeTileMap();
    expect(tm.getTile(-1, 0)).toBeNull();
    expect(tm.getTile(0, -1)).toBeNull();
    expect(tm.getTile(10, 0)).toBeNull();
    expect(tm.getTile(0, 10)).toBeNull();
  });

  it('isInBounds always returns true for infinite map', () => {
    const tm = new TileMap(5, 5);
    expect(tm.isInBounds(0, 0)).toBe(true);
    expect(tm.isInBounds(4, 4)).toBe(true);
    expect(tm.isInBounds(-1, 0)).toBe(true);
    expect(tm.isInBounds(5, 0)).toBe(true);
    expect(tm.isInBounds(-100, -100)).toBe(true);
  });

  it('isWalkable returns true for walkable tiles', () => {
    const tm = makeTileMap();
    expect(tm.isWalkable(5, 5)).toBe(true);
  });

  it('isWalkable returns false for out-of-bounds', () => {
    const tm = makeTileMap();
    expect(tm.isWalkable(-1, 0)).toBe(false);
  });

  it('isWalkable returns false for water tiles', () => {
    const tm = makeTileMap();
    tm.setTile(3, 3, createTile(TileType.DeepWater, 0.1, 0.5, 0.5, 0));
    expect(tm.isWalkable(3, 3)).toBe(false);
  });

  it('getMoveCost returns correct cost', () => {
    const tm = makeTileMap();
    expect(tm.getMoveCost(5, 5)).toBe(1.0);
  });

  it('getMoveCost returns Infinity for out-of-bounds', () => {
    const tm = makeTileMap();
    expect(tm.getMoveCost(-1, 0)).toBe(Infinity);
  });

  it('isWater detects water tiles', () => {
    const tm = makeTileMap();
    tm.setTile(2, 2, createTile(TileType.DeepWater, 0.1, 0.5, 0.5, 0));
    tm.setTile(3, 2, createTile(TileType.ShallowWater, 0.2, 0.5, 0.5, 0));
    expect(tm.isWater(2, 2)).toBe(true);
    expect(tm.isWater(3, 2)).toBe(true);
    expect(tm.isWater(4, 2)).toBe(false);
  });

  it('getWaterEdgeMask detects land neighbors', () => {
    const tm = new TileMap(3, 3);
    // Fill all with water
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        tm.setTile(x, y, createTile(TileType.DeepWater, 0.1, 0.5, 0.5, 0));
      }
    }
    // Center is water, surrounded by water
    expect(tm.getWaterEdgeMask(1, 1)).toBe(0);

    // Place land on top
    tm.setTile(1, 0, createTile(TileType.Grass, 0.5, 0.5, 0.5, 0));
    expect(tm.getWaterEdgeMask(1, 1) & 1).toBe(1); // bit 0 = top has land
  });

  it('supports negative coordinates with setTile/getTile', () => {
    const tm = new TileMap(10, 10);
    const tile = createTile(TileType.Stone, 0.8, 0.3, 0.5, 0);
    tm.setTile(-5, -10, tile);
    const retrieved = tm.getTile(-5, -10);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.type).toBe(TileType.Stone);
  });

  it('generates tiles on demand with a tile generator', () => {
    const generator = () =>
      createTile(TileType.Sand, 0.35, 0.2, 0.5, 0);
    const tm = new TileMap(10, 10, generator);

    // Access tile far outside the initial region
    const tile = tm.getTile(500, 500);
    expect(tile).not.toBeNull();
    expect(tile!.type).toBe(TileType.Sand);

    // Negative coordinates also work
    const negTile = tm.getTile(-100, -200);
    expect(negTile).not.toBeNull();
    expect(negTile!.type).toBe(TileType.Sand);
  });

  it('chunk loading tracks which chunks are loaded', () => {
    const generator = () => createTile(TileType.Grass, 0.5, 0.5, 0.5, 0);
    const tm = new TileMap(10, 10, generator);

    expect(tm.isChunkLoaded(0, 0)).toBe(false);
    tm.getTile(0, 0);
    expect(tm.isChunkLoaded(0, 0)).toBe(true);
    expect(tm.isChunkLoaded(1, 0)).toBe(false);
  });
});
