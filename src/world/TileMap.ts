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

export class TileMap {
  readonly width: number;
  readonly height: number;
  private tiles: Tile[];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.tiles = new Array<Tile>(width * height);
  }

  getTile(x: number, y: number): Tile | null {
    if (!this.isInBounds(x, y)) return null;
    return this.tiles[y * this.width + x] ?? null;
  }

  setTile(x: number, y: number, tile: Tile): void {
    if (!this.isInBounds(x, y)) return;
    this.tiles[y * this.width + x] = tile;
  }

  isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile !== null && tile.walkable;
  }

  getMoveCost(x: number, y: number): number {
    const tile = this.getTile(x, y);
    return tile !== null ? tile.moveCost : Infinity;
  }

  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
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
}
