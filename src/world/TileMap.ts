export enum TileType {
  DeepWater = 'deep_water',
  ShallowWater = 'shallow_water',
  Sand = 'sand',
  DryDirt = 'dry_dirt',
  Grass = 'grass',
  FlowerGrass = 'flower_grass',
  DenseGrass = 'dense_grass',
  DirtPath = 'dirt_path',
  Stone = 'stone',
  CaveWall = 'cave_wall',
}

export interface Tile {
  type: TileType;
  elevation: number;
  moisture: number;
  temperature: number;
  variant: number;
  waterFrame: number;
  walkable: boolean;
  moveCost: number;
}

const NON_WALKABLE: ReadonlySet<TileType> = new Set([
  TileType.DeepWater,
  TileType.ShallowWater,
  TileType.CaveWall,
]);

const WATER_TILES: ReadonlySet<TileType> = new Set([
  TileType.DeepWater,
  TileType.ShallowWater,
]);

function moveCostForType(type: TileType): number {
  switch (type) {
    case TileType.Stone:
      return 1.5;
    case TileType.DryDirt:
    case TileType.DirtPath:
      return 0.8;
    default:
      return 1.0;
  }
}

export function createTile(
  type: TileType,
  elevation: number,
  moisture: number,
  temperature: number,
  variant: number,
): Tile {
  return {
    type,
    elevation,
    moisture,
    temperature,
    variant: variant & 3,
    waterFrame: 0,
    walkable: !NON_WALKABLE.has(type),
    moveCost: moveCostForType(type),
  };
}

export const CHUNK_SIZE = 32;

function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

export type TileGenerator = (x: number, y: number) => Tile;

export class TileMap {
  readonly width: number;
  readonly height: number;
  private chunks: Map<string, Tile[]>;
  private tileGenerator: TileGenerator | null;

  constructor(width: number, height: number, tileGenerator?: TileGenerator) {
    this.width = width;
    this.height = height;
    this.chunks = new Map();
    this.tileGenerator = tileGenerator ?? null;
  }

  private getChunk(cx: number, cy: number): Tile[] {
    const key = chunkKey(cx, cy);
    let chunk = this.chunks.get(key);
    if (chunk) return chunk;

    chunk = new Array<Tile>(CHUNK_SIZE * CHUNK_SIZE);
    if (this.tileGenerator) {
      const baseX = cx * CHUNK_SIZE;
      const baseY = cy * CHUNK_SIZE;
      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          chunk[ly * CHUNK_SIZE + lx] = this.tileGenerator(baseX + lx, baseY + ly);
        }
      }
    }
    this.chunks.set(key, chunk);
    return chunk;
  }

  getTile(x: number, y: number): Tile | null {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cy = Math.floor(y / CHUNK_SIZE);
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const chunk = this.getChunk(cx, cy);
    return chunk[ly * CHUNK_SIZE + lx] ?? null;
  }

  setTile(x: number, y: number, tile: Tile): void {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cy = Math.floor(y / CHUNK_SIZE);
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const chunk = this.getChunk(cx, cy);
    chunk[ly * CHUNK_SIZE + lx] = tile;
  }

  isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile !== null && tile.walkable;
  }

  getMoveCost(x: number, y: number): number {
    const tile = this.getTile(x, y);
    return tile !== null ? tile.moveCost : Infinity;
  }

  isInBounds(_x: number, _y: number): boolean {
    return true;
  }

  isWater(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile !== null && WATER_TILES.has(tile.type);
  }

  /** 4-bit bitmask: bit 0=top has land, bit 1=right, bit 2=bottom, bit 3=left */
  getWaterEdgeMask(x: number, y: number): number {
    let mask = 0;
    if (!this.isWater(x, y - 1)) mask |= 1;
    if (!this.isWater(x + 1, y)) mask |= 2;
    if (!this.isWater(x, y + 1)) mask |= 4;
    if (!this.isWater(x - 1, y)) mask |= 8;
    return mask;
  }

  /** Check if a chunk has already been loaded/generated */
  isChunkLoaded(cx: number, cy: number): boolean {
    return this.chunks.has(chunkKey(cx, cy));
  }

  /** Get all loaded chunk keys */
  getLoadedChunkKeys(): string[] {
    return Array.from(this.chunks.keys());
  }
}
