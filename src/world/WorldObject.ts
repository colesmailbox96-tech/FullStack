import { TileMap, TileType, CHUNK_SIZE } from './TileMap';
import { WorldConfig } from '../engine/Config';
import { Random } from '../utils/Random';
import { distance, hashCoord } from '../utils/Math';
import type { ResourceType } from '../entities/Inventory';

export type StructureType = 'hut' | 'farm' | 'well' | 'storehouse' | 'watchtower' | 'meeting_hall';

export enum ObjectType {
  OakTree = 'oak_tree',
  PineTree = 'pine_tree',
  BirchTree = 'birch_tree',
  BerryBush = 'berry_bush',
  Rock = 'rock',
  Mushroom = 'mushroom',
  Campfire = 'campfire',
  Hut = 'hut',
  Farm = 'farm',
  Well = 'well',
  Storehouse = 'storehouse',
  Watchtower = 'watchtower',
  MeetingHall = 'meeting_hall',
  ConstructionSite = 'construction_site',
}

export interface StructureData {
  structureType: StructureType;
  buildProgress: number;
  requiredResources: Partial<Record<ResourceType, number>>;
  contributedResources: Partial<Record<ResourceType, number>>;
  contributors: string[];
  ownerId: string;
  settlementId: string | null;
  health: number;
  completedAt: number | null;
}

export interface WorldObject {
  id: string;
  type: ObjectType;
  x: number;
  y: number;
  state: 'normal' | 'depleted' | 'ripe';
  resources: number;
  respawnTimer: number;
  swayOffset: number;
  structureData?: StructureData;
}

function isGrassTile(type: TileType): boolean {
  return (
    type === TileType.Grass ||
    type === TileType.FlowerGrass ||
    type === TileType.DenseGrass
  );
}

export class WorldObjectManager {
  private objects: Map<string, WorldObject>;
  private nextId: number;
  private generatedChunks: Set<string>;
  private seed: number;

  constructor() {
    this.objects = new Map();
    this.nextId = 0;
    this.generatedChunks = new Set();
    this.seed = 0;
  }

  private addObject(type: ObjectType, x: number, y: number, resources: number, swayOffset: number): void {
    const id = `obj_${this.nextId++}`;
    this.objects.set(id, {
      id,
      type,
      x,
      y,
      state: resources > 0 ? 'ripe' : 'normal',
      resources,
      respawnTimer: 0,
      swayOffset,
    });
  }

  /** Generate objects for a specific chunk region using deterministic seeding. */
  generateObjectsForChunk(
    tileMap: TileMap,
    chunkX: number,
    chunkY: number,
    config: WorldConfig,
  ): void {
    const key = `${chunkX},${chunkY}`;
    if (this.generatedChunks.has(key)) return;
    this.generatedChunks.add(key);

    const chunkSeed = this.seed ^ hashCoord(chunkX, chunkY);
    const rng = new Random(chunkSeed);
    const baseX = chunkX * CHUNK_SIZE;
    const baseY = chunkY * CHUNK_SIZE;

    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const x = baseX + lx;
        const y = baseY + ly;
        const tile = tileMap.getTile(x, y);
        if (!tile) continue;

        const type = tile.type;
        const moisture = tile.moisture;
        const elevation = tile.elevation;

        if (isGrassTile(type) && rng.next() < config.bushDensity) {
          this.addObject(ObjectType.BerryBush, x, y, config.foodPerBush, 0);
          continue;
        }

        if (isGrassTile(type) && moisture > 0.5 && rng.next() < config.treeDensity) {
          this.addObject(ObjectType.OakTree, x, y, 3, rng.next() * Math.PI * 2);
          continue;
        }

        if (isGrassTile(type) && moisture > 0.6 && elevation > 0.55 && rng.next() < 0.05) {
          this.addObject(ObjectType.PineTree, x, y, 3, rng.next() * Math.PI * 2);
          continue;
        }

        if (isGrassTile(type) && moisture >= 0.4 && moisture <= 0.6 && rng.next() < 0.03) {
          this.addObject(ObjectType.BirchTree, x, y, 3, rng.next() * Math.PI * 2);
          continue;
        }

        if ((type === TileType.Stone || type === TileType.DryDirt) && rng.next() < 0.05) {
          this.addObject(ObjectType.Rock, x, y, 3, 0);
          continue;
        }

        if (isGrassTile(type) && rng.next() < 0.02) {
          const adjacentToWater =
            tileMap.isWater(x - 1, y) ||
            tileMap.isWater(x + 1, y) ||
            tileMap.isWater(x, y - 1) ||
            tileMap.isWater(x, y + 1);
          if (adjacentToWater) {
            this.addObject(ObjectType.Mushroom, x, y, 1, 0);
            continue;
          }
        }
      }
    }
  }

  /** Ensure objects are generated for all chunks visible in the given bounds. */
  ensureObjectsForBounds(
    tileMap: TileMap,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    config: WorldConfig,
  ): void {
    const cxMin = Math.floor(minX / CHUNK_SIZE);
    const cyMin = Math.floor(minY / CHUNK_SIZE);
    const cxMax = Math.floor(maxX / CHUNK_SIZE);
    const cyMax = Math.floor(maxY / CHUNK_SIZE);
    for (let cy = cyMin; cy <= cyMax; cy++) {
      for (let cx = cxMin; cx <= cxMax; cx++) {
        this.generateObjectsForChunk(tileMap, cx, cy, config);
      }
    }
  }

  generateObjects(tileMap: TileMap, seed: number, config: WorldConfig): void {
    this.seed = seed;
    const rng = new Random(seed);

    // Generate objects for the initial region using chunk-based generation
    this.ensureObjectsForBounds(tileMap, 0, 0, tileMap.width - 1, tileMap.height - 1, config);

    // Place campfires on grass away from water in the initial region
    const occupied = new Set<string>();
    for (const obj of this.objects.values()) {
      occupied.add(`${obj.x},${obj.y}`);
    }

    const campfireCount = 3 + rng.nextInt(3); // 3-5
    let campfiresPlaced = 0;

    const candidates: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < tileMap.height; y++) {
      for (let x = 0; x < tileMap.width; x++) {
        const tile = tileMap.getTile(x, y);
        if (!tile || !isGrassTile(tile.type) || occupied.has(`${x},${y}`)) continue;
        const nearWater =
          tileMap.isWater(x - 2, y) || tileMap.isWater(x + 2, y) ||
          tileMap.isWater(x, y - 2) || tileMap.isWater(x, y + 2) ||
          tileMap.isWater(x - 1, y) || tileMap.isWater(x + 1, y) ||
          tileMap.isWater(x, y - 1) || tileMap.isWater(x, y + 1);
        if (!nearWater) {
          candidates.push({ x, y });
        }
      }
    }

    rng.shuffle(candidates);
    for (const pos of candidates) {
      if (campfiresPlaced >= campfireCount) break;
      // Ensure spacing between campfires
      let tooClose = false;
      for (const [, obj] of this.objects) {
        if (obj.type === ObjectType.Campfire && distance(pos.x, pos.y, obj.x, obj.y) < 20) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        this.addObject(ObjectType.Campfire, pos.x, pos.y, 0, 0);
        campfiresPlaced++;
      }
    }
  }

  getObjects(): WorldObject[] {
    return Array.from(this.objects.values());
  }

  getObjectAt(x: number, y: number): WorldObject | null {
    for (const obj of this.objects.values()) {
      if (obj.x === x && obj.y === y) return obj;
    }
    return null;
  }

  getObjectsInRadius(x: number, y: number, radius: number): WorldObject[] {
    const results: WorldObject[] = [];
    const r2 = radius * radius;
    for (const obj of this.objects.values()) {
      const dx = obj.x - x;
      const dy = obj.y - y;
      if (dx * dx + dy * dy <= r2) {
        results.push(obj);
      }
    }
    return results;
  }

  update(tick: number, config: WorldConfig, season: string): void {
    for (const obj of this.objects.values()) {
      if (obj.state !== 'depleted') continue;

      obj.respawnTimer--;
      if (obj.respawnTimer <= 0) {
        const baseAmount = this.getBaseResources(obj.type, config);
        const amount = season === 'winter'
          ? Math.floor(baseAmount * (1 - config.winterFoodReduction))
          : baseAmount;
        obj.resources = Math.max(1, amount);
        obj.state = 'ripe';
        obj.respawnTimer = 0;
      }
    }
  }

  /** Return the default resource count for a given object type. */
  private getBaseResources(type: ObjectType, config: WorldConfig): number {
    switch (type) {
      case ObjectType.BerryBush:
        return config.foodPerBush;
      case ObjectType.OakTree:
      case ObjectType.PineTree:
      case ObjectType.BirchTree:
      case ObjectType.Rock:
        return 3;
      case ObjectType.Mushroom:
        return 1;
      default:
        return config.foodPerBush;
    }
  }

  harvestObject(id: string, respawnTicks: number = 400): boolean {
    const obj = this.objects.get(id);
    if (!obj || obj.state === 'depleted' || obj.resources <= 0) return false;

    obj.resources--;
    if (obj.resources <= 0) {
      obj.state = 'depleted';
      obj.respawnTimer = respawnTicks;
    }
    return true;
  }

  addObjectAt(type: ObjectType, x: number, y: number): void {
    const id = `obj_${this.nextId++}`;
    this.objects.set(id, {
      id,
      type,
      x,
      y,
      state: 'normal',
      resources: 0,
      respawnTimer: 0,
      swayOffset: 0,
    });
  }

  /** Add a structure object with structureData. Returns the object id. */
  addStructureObject(type: ObjectType, x: number, y: number, structureData: StructureData): string {
    const id = `obj_${this.nextId++}`;
    this.objects.set(id, {
      id,
      type,
      x,
      y,
      state: 'normal',
      resources: 0,
      respawnTimer: 0,
      swayOffset: 0,
      structureData,
    });
    return id;
  }

  /** Get a specific object by its id. */
  getObjectById(id: string): WorldObject | null {
    return this.objects.get(id) ?? null;
  }
}
