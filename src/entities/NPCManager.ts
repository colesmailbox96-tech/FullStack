import { Random } from '../utils/Random';
import { distance } from '../utils/Math';
import { TileMap } from '../world/TileMap';
import { WorldObjectManager } from '../world/WorldObject';
import { TimeSystem } from '../world/TimeSystem';
import type { WeatherState, Weather } from '../world/Weather';
import { WorldConfig } from '../engine/Config';
import { NPC } from './NPC';

export class NPCManager {
  private npcs: NPC[];
  private rng: Random;
  private nextId: number;

  constructor(seed: number) {
    this.npcs = [];
    this.rng = new Random(seed);
    this.nextId = 1;
  }

  spawnInitial(count: number, tileMap: TileMap, config: WorldConfig): void {
    for (let i = 0; i < count; i++) {
      this.spawnNPC(tileMap, config);
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
    for (const npc of this.npcs) {
      npc.update(config, weather, timeSystem, tileMap, objects, this.npcs, weatherSystem);
    }
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

  private spawnNPC(tileMap: TileMap, config: WorldConfig): void {
    const maxAttempts = 100;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = this.rng.nextInt(config.worldSize);
      const y = this.rng.nextInt(config.worldSize);
      if (tileMap.isWalkable(x, y)) {
        const id = `npc_${this.nextId++}`;
        const npc = new NPC(id, x, y, this.rng, config);
        this.npcs.push(npc);
        return;
      }
    }
  }

  private checkSpawning(config: WorldConfig, tileMap: TileMap): void {
    const alive = this.getAliveNPCs();

    // Maintain minimum population
    if (alive.length < config.minPopulation) {
      this.spawnNPC(tileMap, config);
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
            this.npcs.push(child);
            // Reset parents' social bond timers by reducing social slightly
            a.needs.social *= 0.5;
            b.needs.social *= 0.5;
            return;
          }
        }
      }
    }
  }
}
