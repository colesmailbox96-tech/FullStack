import { Random } from '../utils/Random';
import { clamp, distance } from '../utils/Math';
import { findPath, PathNode } from '../world/Pathfinding';
import { TileMap, TileType } from '../world/TileMap';
import { WorldObjectManager, ObjectType } from '../world/WorldObject';
import { TimeSystem } from '../world/TimeSystem';
import type { WeatherState, Weather } from '../world/Weather';
import { WorldConfig } from '../engine/Config';
import { Needs, createDefaultNeeds } from './Needs';
import { MemorySystem } from './Memory';
import type { ActionType } from '../ai/Action';
import { BehaviorTreeBrain } from '../ai/BehaviorTreeBrain';
import { buildPerception } from '../ai/Perception';

export interface NPCAppearance {
  skinTone: number;
  hairColor: number;
  shirtColor: number;
  pantsColor: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

const MOVE_TICKS = 8;
const FORAGE_TICKS = 30;
const MOVING_HUNGER_MULTIPLIER = 1.67;
const REST_ENERGY_FACTOR = -0.5;

const brain = new BehaviorTreeBrain();

export class NPC {
  readonly id: string;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  needs: Needs;
  memory: MemorySystem;
  appearance: NPCAppearance;
  direction: Direction;
  isMoving: boolean;
  currentAction: ActionType;
  targetX: number;
  targetY: number;
  targetNpcId: string | null;
  path: PathNode[];
  pathIndex: number;
  alive: boolean;
  age: number;
  starvationTimer: number;
  moveTimer: number;
  actionTimer: number;
  tilesVisited: Set<string>;
  spawnAnimation: number;
  deathAnimation: number;
  idlePhase: number;

  private rng: Random;

  constructor(id: string, x: number, y: number, rng: Random, config: WorldConfig) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.rng = rng;
    this.needs = createDefaultNeeds(() => rng.next());
    this.memory = new MemorySystem(config.memoryCapacity);
    this.appearance = {
      skinTone: rng.nextInt(4),
      hairColor: rng.nextInt(6),
      shirtColor: rng.nextInt(8),
      pantsColor: rng.nextInt(6),
    };
    this.direction = 'down';
    this.isMoving = false;
    this.currentAction = 'IDLE';
    this.targetX = x;
    this.targetY = y;
    this.targetNpcId = null;
    this.path = [];
    this.pathIndex = 0;
    this.alive = true;
    this.age = 0;
    this.starvationTimer = 0;
    this.moveTimer = 0;
    this.actionTimer = 0;
    this.tilesVisited = new Set<string>();
    this.tilesVisited.add(`${Math.floor(x)},${Math.floor(y)}`);
    this.spawnAnimation = 0;
    this.deathAnimation = 0;
    this.idlePhase = rng.next() * Math.PI * 2;
  }

  update(
    config: WorldConfig,
    weather: WeatherState,
    timeSystem: TimeSystem,
    tileMap: TileMap,
    objects: WorldObjectManager,
    allNPCs: NPC[],
    weatherSystem: Weather,
  ): void {
    if (!this.alive) {
      this.deathAnimation = clamp(this.deathAnimation + 0.05, 0, 1);
      return;
    }

    this.age++;
    this.spawnAnimation = clamp(this.spawnAnimation + 0.05, 0, 1);
    this.idlePhase += 0.05;

    const nearbyNPCs = this.getNearbyNPCs(allNPCs, config.socialRange);
    this.updateNeeds(config, weather, timeSystem, nearbyNPCs, tileMap);
    this.memory.update(config.memoryDecayRate);

    // Check starvation
    if (this.needs.hunger <= 0) {
      this.starvationTimer++;
      if (this.starvationTimer >= config.starvationTicks) {
        this.alive = false;
        return;
      }
    } else {
      this.starvationTimer = 0;
    }

    // AI decision
    const perception = buildPerception(
      this, tileMap, objects, allNPCs, timeSystem, weatherSystem,
      this.x, this.y, 1,
    );
    const action = brain.decide(perception);
    this.currentAction = action.type;
    this.targetX = action.targetX;
    this.targetY = action.targetY;
    this.targetNpcId = action.targetNpcId ?? null;

    // Pathfind if target changed significantly
    const distToTarget = distance(this.x, this.y, this.targetX, this.targetY);
    if (distToTarget > 1.5 && (this.path.length === 0 || this.pathIndex >= this.path.length)) {
      const newPath = findPath(
        tileMap,
        Math.floor(this.x), Math.floor(this.y),
        Math.floor(this.targetX), Math.floor(this.targetY),
        50,
      );
      if (newPath) {
        this.path = newPath;
        this.pathIndex = 0;
      }
    }

    this.executeAction(tileMap, objects, config);
    this.moveAlongPath();
  }

  private updateNeeds(
    config: WorldConfig,
    weather: WeatherState,
    timeSystem: TimeSystem,
    nearbyNPCs: NPC[],
    tileMap: TileMap,
  ): void {
    // Hunger drain
    let hungerDrain = config.hungerDrain;
    if (this.isMoving) hungerDrain *= MOVING_HUNGER_MULTIPLIER;
    if (weather === 'storm' || weather === 'snow') hungerDrain *= 2;
    this.needs.hunger = clamp(this.needs.hunger - hungerDrain, 0, 1);

    // Energy drain
    let energyDrain = config.energyDrain;
    if (this.isMoving) energyDrain *= 1.5;
    if (this.currentAction === 'REST') energyDrain *= REST_ENERGY_FACTOR;
    if (timeSystem.isNight()) energyDrain *= config.nightEnergyMultiplier;
    this.needs.energy = clamp(this.needs.energy - energyDrain, 0, 1);

    // Social drain
    if (nearbyNPCs.length === 0) {
      this.needs.social = clamp(this.needs.social - config.socialDrain, 0, 1);
    }

    // Curiosity drain: when in same area for too long
    const tileKey = `${Math.floor(this.x)},${Math.floor(this.y)}`;
    if (this.tilesVisited.has(tileKey) && this.age > config.curiosityStaleTicks) {
      this.needs.curiosity = clamp(this.needs.curiosity - config.curiosityDrain, 0, 1);
    }

    // Safety
    if (weather === 'storm') {
      this.needs.safety = clamp(this.needs.safety - config.stormSafetyPenalty, 0, 1);
    }
    if (timeSystem.isNight() && !this.isInShelter(tileMap)) {
      this.needs.safety = clamp(this.needs.safety - 0.03, 0, 1);
    }

    // Safety recovery in shelter or daytime
    if (!timeSystem.isNight() || this.isInShelter(tileMap)) {
      this.needs.safety = clamp(this.needs.safety + config.safetyRecovery, 0, 1);
    }
  }

  private executeAction(tileMap: TileMap, objects: WorldObjectManager, config: WorldConfig): void {
    this.actionTimer++;

    switch (this.currentAction) {
      case 'FORAGE': {
        if (this.actionTimer >= FORAGE_TICKS) {
          // Try to harvest a nearby object
          const obj = objects.getObjectAt(Math.floor(this.targetX), Math.floor(this.targetY));
          if (obj && obj.type === ObjectType.BerryBush) {
            const harvested = objects.harvestObject(obj.id);
            if (harvested) {
              this.needs.hunger = clamp(this.needs.hunger + 0.3, 0, 1);
              this.memory.addMemory({
                type: 'found_food',
                tick: this.age,
                x: obj.x,
                y: obj.y,
                significance: 0.8,
              });
            }
          }
          this.actionTimer = 0;
          this.currentAction = 'IDLE';
        }
        break;
      }
      case 'REST': {
        let recovery = 0.02;
        if (this.isInShelter(tileMap)) recovery *= 2;
        this.needs.energy = clamp(this.needs.energy + recovery, 0, 1);
        break;
      }
      case 'SOCIALIZE': {
        this.needs.social = clamp(
          this.needs.social + config.socialRecovery,
          0, 1,
        );
        break;
      }
      case 'EXPLORE': {
        const tileKey = `${Math.floor(this.x)},${Math.floor(this.y)}`;
        if (!this.tilesVisited.has(tileKey)) {
          this.needs.curiosity = clamp(this.needs.curiosity + 0.2, 0, 1);
          this.tilesVisited.add(tileKey);
          this.memory.addMemory({
            type: 'discovered_area',
            tick: this.age,
            x: Math.floor(this.x),
            y: Math.floor(this.y),
            significance: 0.3,
          });
        }
        break;
      }
      case 'SEEK_SHELTER': {
        const d = distance(this.x, this.y, this.targetX, this.targetY);
        if (d < 2) {
          this.memory.addMemory({
            type: 'found_shelter',
            tick: this.age,
            x: Math.floor(this.targetX),
            y: Math.floor(this.targetY),
            significance: 0.7,
          });
        }
        break;
      }
      case 'IDLE': {
        this.needs.safety = clamp(this.needs.safety + 0.005, 0, 1);
        break;
      }
    }
  }

  private moveAlongPath(): void {
    if (this.path.length === 0 || this.pathIndex >= this.path.length) {
      this.isMoving = false;
      return;
    }

    this.moveTimer++;
    if (this.moveTimer < MOVE_TICKS) return;
    this.moveTimer = 0;

    const next = this.path[this.pathIndex];
    this.prevX = this.x;
    this.prevY = this.y;

    // Update direction based on movement
    const dx = next.x - this.x;
    const dy = next.y - this.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.direction = dx > 0 ? 'right' : 'left';
    } else {
      this.direction = dy > 0 ? 'down' : 'up';
    }

    this.x = next.x;
    this.y = next.y;
    this.isMoving = true;
    this.pathIndex++;

    // Mark tile as visited
    const tileKey = `${Math.floor(this.x)},${Math.floor(this.y)}`;
    this.tilesVisited.add(tileKey);
  }

  getNearbyNPCs(allNPCs: NPC[], radius: number): NPC[] {
    return allNPCs.filter(other =>
      other.id !== this.id &&
      other.alive &&
      distance(this.x, this.y, other.x, other.y) <= radius
    );
  }

  isInShelter(tileMap: TileMap): boolean {
    // Near cave wall
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const tile = tileMap.getTile(Math.floor(this.x) + dx, Math.floor(this.y) + dy);
        if (tile && tile.type === TileType.CaveWall) return true;
      }
    }
    return false;
  }
}
