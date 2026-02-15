import { Random } from '../utils/Random';
import { distance } from '../utils/Math';
import { TileMap } from '../world/TileMap';
import { WorldObjectManager } from '../world/WorldObject';
import { TimeSystem } from '../world/TimeSystem';
import type { WeatherState, Weather } from '../world/Weather';
import { WorldConfig } from '../engine/Config';
import { NPC } from './NPC';
import { LineageTracker } from './Lineage';
import type { SkillType } from './Skills';

/** Range within which alive NPCs observe a death and learn from it. */
const DEATH_OBSERVATION_RANGE = 15;

/** Fraction of a parent's skill level inherited by offspring (0–1). */
const SKILL_INHERITANCE_FACTOR = 0.3;

/** Fraction blending parent personality into offspring (0–1). */
const PERSONALITY_INHERITANCE_FACTOR = 0.4;

/** Number of top memories transferred from each parent to a child. */
const INHERITED_MEMORY_COUNT = 5;

/** Significance multiplier applied to inherited memories (decay over generations). */
const INHERITED_MEMORY_SIGNIFICANCE = 0.6;

export class NPCManager {
  private npcs: NPC[];
  private rng: Random;
  private nextId: number;
  readonly lineage: LineageTracker;

  constructor(seed: number) {
    this.npcs = [];
    this.rng = new Random(seed);
    this.nextId = 1;
    this.lineage = new LineageTracker();
  }

  spawnInitial(count: number, tileMap: TileMap, config: WorldConfig): void {
    for (let i = 0; i < count; i++) {
      this.spawnNPC(tileMap, config, true);
    }
  }

  update(
    config: WorldConfig,
    weather: WeatherState,
    timeSystem: TimeSystem,
    tileMap: TileMap,
    objects: WorldObjectManager,
    weatherSystem: Weather,
  ): void {
    // Snapshot alive set before NPC updates so we can detect new deaths
    const aliveBeforeUpdate = new Set(this.npcs.filter(n => n.alive).map(n => n.id));

    for (const npc of this.npcs) {
      npc.update(config, weather, timeSystem, tileMap, objects, this.npcs, weatherSystem);
    }

    // Detect newly dead NPCs and let nearby alive NPCs learn from the death
    for (const npc of this.npcs) {
      if (aliveBeforeUpdate.has(npc.id) && !npc.alive) {
        this.onNPCDeath(npc, config);
      }
    }

    // Remove dead NPCs whose death animation has completed
    this.npcs = this.npcs.filter(npc => npc.alive || npc.deathAnimation < 1);
    this.checkSpawning(config, tileMap);
  }

  getNPCs(): NPC[] {
    return this.npcs;
  }

  getAliveNPCs(): NPC[] {
    return this.npcs.filter(npc => npc.alive);
  }

  getNPCById(id: string): NPC | null {
    return this.npcs.find(npc => npc.id === id) ?? null;
  }

  private spawnNPC(tileMap: TileMap, config: WorldConfig, isOriginal: boolean = false): void {
    const maxAttempts = 100;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = this.rng.nextInt(config.worldSize);
      const y = this.rng.nextInt(config.worldSize);
      if (tileMap.isWalkable(x, y)) {
        const id = `npc_${this.nextId++}`;
        const npc = new NPC(id, x, y, this.rng, config);
        npc.isOriginal = isOriginal;
        this.npcs.push(npc);
        this.lineage.registerOriginal(id, npc.age);
        return;
      }
    }
  }

  /**
   * Called when an NPC dies. Nearby alive NPCs observe the death and learn
   * from the deceased's experience — they receive a death memory plus any
   * food/shelter/danger memories the dead NPC had, helping them avoid the
   * same fate.
   */
  private onNPCDeath(dead: NPC, config: WorldConfig): void {
    const alive = this.getAliveNPCs();
    for (const observer of alive) {
      if (distance(observer.x, observer.y, dead.x, dead.y) > DEATH_OBSERVATION_RANGE) {
        continue;
      }

      // Record the death itself
      observer.memory.addMemory({
        type: 'npc_died',
        tick: observer.age,
        x: Math.floor(dead.x),
        y: Math.floor(dead.y),
        significance: 0.9,
        relatedNpcId: dead.id,
        detail: dead.needs.hunger <= 0 ? 'starvation' : 'unknown',
      });

      // Transfer useful survival memories from the deceased
      const usefulTypes: Array<'found_food' | 'found_shelter' | 'danger'> =
        ['found_food', 'found_shelter', 'danger'];
      for (const memType of usefulTypes) {
        const memories = dead.memory.getMemoriesByType(memType);
        for (const mem of memories) {
          observer.memory.addMemory({
            type: mem.type,
            tick: observer.age,
            x: mem.x,
            y: mem.y,
            significance: mem.significance * INHERITED_MEMORY_SIGNIFICANCE,
            detail: mem.detail,
          });
        }
      }
    }
  }

  private checkSpawning(config: WorldConfig, tileMap: TileMap): void {
    const alive = this.getAliveNPCs();

    // Do not exceed maximum population
    if (alive.length >= config.maxPopulation) {
      return;
    }

    // Social bond spawning: two NPCs with high social near each other
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i];
        const b = alive[j];
        if (
          a.needs.social > config.socialBondThreshold &&
          b.needs.social > config.socialBondThreshold &&
          distance(a.x, a.y, b.x, b.y) <= config.socialRange &&
          a.age > config.socialBondTicks &&
          b.age > config.socialBondTicks
        ) {
          // Spawn child near midpoint
          const cx = Math.floor((a.x + b.x) / 2);
          const cy = Math.floor((a.y + b.y) / 2);
          if (tileMap.isWalkable(cx, cy)) {
            const id = `npc_${this.nextId++}`;
            const child = new NPC(id, cx, cy, this.rng, config);
            // Inherit traits from parents (natural selection)
            this.inheritTraits(child, a, b);
            this.npcs.push(child);
            // Register birth in lineage system
            this.lineage.registerBirth(id, a.id, b.id, child.age);
            // Reset parents' social bond timers by reducing social slightly
            a.needs.social *= 0.5;
            b.needs.social *= 0.5;
            return;
          }
        }
      }
    }
  }

  /**
   * Offspring inherit a blend of both parents' skills, personality, and
   * top memories. This simulates generational knowledge transfer — children
   * of experienced survivors start life with a head-start, driving natural
   * selection over successive generations.
   */
  private inheritTraits(child: NPC, parentA: NPC, parentB: NPC): void {
    // Blend skills: child gets a weighted average of parents' skills
    const skillKeys: SkillType[] = ['foraging', 'building', 'crafting', 'socializing', 'exploring'];
    for (const key of skillKeys) {
      const blended = (parentA.skills[key] + parentB.skills[key]) / 2;
      child.skills[key] = blended * SKILL_INHERITANCE_FACTOR;
    }

    // Blend personality: mix parents with some random variation
    const pKeys: (keyof typeof child.personality)[] = ['bravery', 'sociability', 'curiosity', 'industriousness', 'craftiness'];
    for (const key of pKeys) {
      const parentAvg = (parentA.personality[key] + parentB.personality[key]) / 2;
      // Weighted blend: PERSONALITY_INHERITANCE_FACTOR from parents, rest is child's own random
      child.personality[key] =
        parentAvg * PERSONALITY_INHERITANCE_FACTOR +
        child.personality[key] * (1 - PERSONALITY_INHERITANCE_FACTOR);
    }

    // Transfer top memories from each parent
    const parentAMemories = parentA.memory.getTopMemories(INHERITED_MEMORY_COUNT);
    const parentBMemories = parentB.memory.getTopMemories(INHERITED_MEMORY_COUNT);
    const inherited = [...parentAMemories, ...parentBMemories];
    for (const mem of inherited) {
      child.memory.addMemory({
        type: mem.type,
        tick: 0,
        x: mem.x,
        y: mem.y,
        significance: mem.significance * INHERITED_MEMORY_SIGNIFICANCE,
        relatedNpcId: mem.relatedNpcId,
        detail: mem.detail,
      });
    }
  }
}
