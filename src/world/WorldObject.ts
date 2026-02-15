import { TileMap, TileType } from './TileMap';
import { WorldConfig } from '../engine/Config';
import { Random } from '../utils/Random';
import { distance } from '../utils/Math';

export enum ObjectType {
  OakTree = 'oak_tree',
  PineTree = 'pine_tree',
  BirchTree = 'birch_tree',
  BerryBush = 'berry_bush',
  Rock = 'rock',
  Mushroom = 'mushroom',
  Campfire = 'campfire',
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

  constructor() {
    this.objects = new Map();
    this.nextId = 0;
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

  generateObjects(tileMap: TileMap, seed: number, config: WorldConfig): void {
    const rng = new Random(seed);
    const occupied = new Set<string>();
    const campfireCount = 3 + rng.nextInt(3); // 3-5
    let campfiresPlaced = 0;

    for (let y = 0; y < tileMap.height; y++) {
      for (let x = 0; x < tileMap.width; x++) {
        const tile = tileMap.getTile(x, y);
        if (!tile || occupied.has(`${x},${y}`)) continue;

        const type = tile.type;
        const moisture = tile.moisture;
        const elevation = tile.elevation;

        // Berry bushes on grass
        if (isGrassTile(type) && rng.next() < config.bushDensity) {
          this.addObject(ObjectType.BerryBush, x, y, config.foodPerBush, 0);
          occupied.add(`${x},${y}`);
          continue;
        }

        // Oak trees on grass with moisture > 0.5
        if (isGrassTile(type) && moisture > 0.5 && rng.next() < config.treeDensity) {
          this.addObject(ObjectType.OakTree, x, y, 0, rng.next() * Math.PI * 2);
          occupied.add(`${x},${y}`);
          continue;
        }

        // Pine trees on grass with moisture > 0.6 and elevation > 0.55
        if (isGrassTile(type) && moisture > 0.6 && elevation > 0.55 && rng.next() < 0.05) {
          this.addObject(ObjectType.PineTree, x, y, 0, rng.next() * Math.PI * 2);
          occupied.add(`${x},${y}`);
          continue;
        }

        // Birch trees on grass with moisture 0.4-0.6
        if (isGrassTile(type) && moisture >= 0.4 && moisture <= 0.6 && rng.next() < 0.03) {
          this.addObject(ObjectType.BirchTree, x, y, 0, rng.next() * Math.PI * 2);
          occupied.add(`${x},${y}`);
          continue;
        }

        // Rocks on stone/dirt
        if ((type === TileType.Stone || type === TileType.DryDirt) && rng.next() < 0.05) {
          this.addObject(ObjectType.Rock, x, y, 0, 0);
          occupied.add(`${x},${y}`);
          continue;
        }

        // Mushrooms on grass adjacent to water
        if (isGrassTile(type) && rng.next() < 0.02) {
          const adjacentToWater =
            tileMap.isWater(x - 1, y) ||
            tileMap.isWater(x + 1, y) ||
            tileMap.isWater(x, y - 1) ||
            tileMap.isWater(x, y + 1);
          if (adjacentToWater) {
            this.addObject(ObjectType.Mushroom, x, y, 1, 0);
            occupied.add(`${x},${y}`);
            continue;
          }
        }
      }
    }

    // Place campfires on grass away from water
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
        const foodAmount = season === 'winter'
          ? Math.floor(config.foodPerBush * (1 - config.winterFoodReduction))
          : config.foodPerBush;
        obj.resources = Math.max(1, foodAmount);
        obj.state = 'ripe';
        obj.respawnTimer = 0;
      }
    }
  }

  harvestObject(id: string): boolean {
    const obj = this.objects.get(id);
    if (!obj || obj.state === 'depleted' || obj.resources <= 0) return false;

    obj.resources--;
    if (obj.resources <= 0) {
      obj.state = 'depleted';
      obj.respawnTimer = 250; // will be ticked down in update()
    }
    return true;
  }
}
