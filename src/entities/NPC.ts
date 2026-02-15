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
import { Personality, createRandomPersonality } from './Personality';
import { RelationshipSystem } from './Relationship';
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
const MOVING_ENERGY_MULTIPLIER = 1.5;
const IDLE_ENERGY_DRAIN_BASE = 0.003;

const brain = new BehaviorTreeBrain();

export class NPC {
  readonly id: string;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  needs: Needs;
  memory: MemorySystem;
  personality: Personality;
  relationships: RelationshipSystem;
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
  /** Ticks the NPC has spent within its familiar area (for boredom acceleration) */
  staleAreaTicks: number;
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
    this.personality = createRandomPersonality(() => rng.next());
    this.relationships = new RelationshipSystem();
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
    this.staleAreaTicks = 0;
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
    this.relationships.update(config.memoryDecayRate * 0.5);

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
    const isStorm = weather === 'storm';
    const isRain = weather === 'rain';
    const isNight = timeSystem.isNight();
    const inShelter = this.isInShelter(tileMap);

    // --- Hunger drain ---
    // Fix 1 & 2: Moving costs more hunger; storms burn extra calories.
    let hungerDrain = config.hungerDrain;
    if (this.isMoving) hungerDrain *= 1.5;
    if (isStorm || weather === 'snow') hungerDrain *= config.stormHungerMultiplier;
    this.needs.hunger = clamp(this.needs.hunger - hungerDrain, 0, 1);

    // --- Energy drain ---
    // Fix 1: Significant drain while moving (at least 0.006/tick); idle still
    // drains (0.003/tick minimum). Night × 1.5, storm × 1.8. REST recovery is
    // +0.015/tick standing, +0.03/tick in shelter — slow enough to cost time.
    let energyDrain: number;
    if (this.currentAction === 'REST') {
      // REST provides net recovery instead of drain
      const restRecovery = inShelter ? 0.03 : 0.015;
      this.needs.energy = clamp(this.needs.energy + restRecovery, 0, 1);
      energyDrain = 0; // skip normal drain path
    } else {
      energyDrain = this.isMoving
        ? config.energyDrain * MOVING_ENERGY_MULTIPLIER
        : Math.max(IDLE_ENERGY_DRAIN_BASE, config.energyDrain * 0.6);
      if (isNight) energyDrain *= config.nightEnergyMultiplier;
      if (isStorm) energyDrain *= config.stormEnergyMultiplier;
      // Fix 5: Social isolation increases energy drain
      if (this.needs.social < config.socialDebuffThreshold && nearbyNPCs.length === 0) {
        energyDrain *= config.socialIsolationEnergyMultiplier;
      }
      this.needs.energy = clamp(this.needs.energy - energyDrain, 0, 1);
    }

    // --- Social drain ---
    // Fix 5: Drains when no NPC within socialRange; recovers when nearby NPCs.
    if (nearbyNPCs.length === 0) {
      this.needs.social = clamp(this.needs.social - config.socialDrain, 0, 1);
    }

    // --- Curiosity drain ---
    // Drains when NPC is on already-visited tiles. staleAreaTicks tracks
    // consecutive ticks on familiar ground; resets when a new tile is visited.
    // Boredom acceleration: 2× after boredomAccelTicks, 3× after boredomSevereTicks.
    const tileKey = `${Math.floor(this.x)},${Math.floor(this.y)}`;
    if (this.tilesVisited.has(tileKey)) {
      this.staleAreaTicks++;
      if (this.staleAreaTicks > config.curiosityStaleTicks) {
        let curiosityMultiplier = 1;
        if (this.staleAreaTicks > config.boredomSevereTicks) {
          curiosityMultiplier = 3;
        } else if (this.staleAreaTicks > config.boredomAccelTicks) {
          curiosityMultiplier = 2;
        }
        this.needs.curiosity = clamp(
          this.needs.curiosity - config.curiosityDrain * curiosityMultiplier, 0, 1,
        );
      }
    } else {
      // New tile discovered — reset stale area counter
      this.staleAreaTicks = 0;
    }

    // --- Safety drain ---
    // Fix 2: Storm drops safety 0.04/tick, rain 0.01/tick, night outdoors
    // 0.02/tick. Night + storm stacks to 0.06/tick.
    if (isStorm) {
      this.needs.safety = clamp(this.needs.safety - config.stormSafetyPenalty, 0, 1);
    }
    if (isRain && !isStorm) {
      this.needs.safety = clamp(this.needs.safety - config.rainSafetyPenalty, 0, 1);
    }
    if (isNight && !inShelter) {
      this.needs.safety = clamp(this.needs.safety - config.nightSafetyPenalty, 0, 1);
    }

    // Safety recovery in shelter or calm daytime
    if (!isNight || inShelter) {
      if (!isStorm) {
        this.needs.safety = clamp(this.needs.safety + config.safetyRecovery, 0, 1);
      }
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
            const harvested = objects.harvestObject(obj.id, config.foodRespawnTicks);
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
        // REST recovery is handled in updateNeeds to ensure consistent
        // drain/recovery ordering each tick. No additional recovery here.
        break;
      }
      case 'SOCIALIZE': {
        this.needs.social = clamp(
          this.needs.social + config.socialRecovery,
          0, 1,
        );
        if (this.targetNpcId) {
          this.relationships.interact(this.targetNpcId, this.age);
        }
        break;
      }
      case 'EXPLORE': {
        // Fix 4: New tile discovery gives configurable curiosity reward.
        // Discovering a resource location gives a stronger reward.
        const tileKey = `${Math.floor(this.x)},${Math.floor(this.y)}`;
        if (!this.tilesVisited.has(tileKey)) {
          // Check if there's a resource here for the stronger reward
          const obj = objects.getObjectAt(Math.floor(this.x), Math.floor(this.y));
          const reward = obj ? config.curiosityNewResourceReward : config.curiosityNewTileReward;
          this.needs.curiosity = clamp(this.needs.curiosity + reward, 0, 1);
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
