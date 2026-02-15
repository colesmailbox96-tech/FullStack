import type { IBrain } from './IBrain';
import type { Perception, TileInfo, ObjectInfo } from './Perception';
import type { Action, ActionType } from './Action';
import { ObjectType } from '../world/WorldObject';
import { TileType } from '../world/TileMap';
import { distance } from '../utils/Math';

export class BehaviorTreeBrain implements IBrain {
  decide(perception: Perception): Action {
    const { needs, nearbyTiles, nearbyObjects, nearbyNPCs, weather, relevantMemories } = perception;

    // 1. SURVIVE: hunger < 0.15
    if (needs.hunger < 0.15) {
      const foodAction = this.findFood(perception);
      if (foodAction) return foodAction;
    }

    // 2. SHELTER: safety < 0.3 OR storm and not sheltered
    if (needs.safety < 0.3 || (weather === 'storm' && !this.isNearShelter(perception))) {
      const shelterAction = this.findShelter(perception);
      if (shelterAction) return shelterAction;
    }

    // 3. REST: energy < 0.2
    if (needs.energy < 0.2) {
      return this.makeRest(perception);
    }

    // 4. SOCIALIZE: social < 0.3 and NPC within 15
    if (needs.social < 0.3 && nearbyNPCs.length > 0) {
      const closest = this.findClosestNPC(perception);
      if (closest && distance(perception.cameraX, perception.cameraY, closest.x, closest.y) < 15) {
        return { type: 'SOCIALIZE', targetX: closest.x, targetY: closest.y, targetNpcId: closest.id };
      }
    }

    // 5. EXPLORE: curiosity < 0.3
    if (needs.curiosity < 0.3) {
      return this.findExploreTarget(perception);
    }

    // 6. MAINTAIN
    if (needs.hunger < 0.5) {
      const foodAction = this.findFood(perception);
      if (foodAction) return foodAction;
    }
    if (needs.energy < 0.5) {
      return this.makeRest(perception);
    }
    if (needs.social < 0.5 && nearbyNPCs.length > 0) {
      const closest = this.findClosestNPC(perception);
      if (closest) {
        return { type: 'SOCIALIZE', targetX: closest.x, targetY: closest.y, targetNpcId: closest.id };
      }
    }

    // 7. DEFAULT: explore random direction
    return this.findExploreTarget(perception);
  }

  private findFood(perception: Perception): Action | null {
    // Look for berry bushes in nearby objects
    const berryBushes = perception.nearbyObjects.filter(
      (obj: ObjectInfo) => obj.type === ObjectType.BerryBush && obj.state !== 'depleted'
    );

    if (berryBushes.length > 0) {
      const closest = berryBushes.reduce((a: ObjectInfo, b: ObjectInfo) =>
        distance(perception.cameraX, perception.cameraY, a.x, a.y) <
        distance(perception.cameraX, perception.cameraY, b.x, b.y) ? a : b
      );
      return { type: 'FORAGE', targetX: closest.x, targetY: closest.y };
    }

    // Check food memory
    for (const mem of perception.relevantMemories) {
      if (mem.type === 'found_food') {
        return { type: 'FORAGE', targetX: mem.x, targetY: mem.y };
      }
    }

    return null;
  }

  private findShelter(perception: Perception): Action | null {
    // Look for campfires nearby
    const campfires = perception.nearbyObjects.filter(
      (obj: ObjectInfo) => obj.type === ObjectType.Campfire
    );
    if (campfires.length > 0) {
      return { type: 'SEEK_SHELTER', targetX: campfires[0].x, targetY: campfires[0].y };
    }

    // Look for cave walls nearby (shelter is adjacent tile)
    const caveAdjacent = perception.nearbyTiles.filter(
      (t: TileInfo) => t.type === TileType.CaveWall
    );
    if (caveAdjacent.length > 0) {
      // Find walkable tile near cave wall
      for (const cave of caveAdjacent) {
        const adjacent = perception.nearbyTiles.find(
          (t: TileInfo) => t.walkable && Math.abs(t.x - cave.x) + Math.abs(t.y - cave.y) === 1
        );
        if (adjacent) {
          return { type: 'SEEK_SHELTER', targetX: adjacent.x, targetY: adjacent.y };
        }
      }
    }

    // Check shelter memory
    for (const mem of perception.relevantMemories) {
      if (mem.type === 'found_shelter') {
        return { type: 'SEEK_SHELTER', targetX: mem.x, targetY: mem.y };
      }
    }

    return null;
  }

  private isNearShelter(perception: Perception): boolean {
    const hasCampfire = perception.nearbyObjects.some(
      (obj: ObjectInfo) => obj.type === ObjectType.Campfire && distance(perception.cameraX, perception.cameraY, obj.x, obj.y) < 3
    );
    const nearCave = perception.nearbyTiles.some(
      (t: TileInfo) => t.type === TileType.CaveWall && Math.abs(t.x - perception.cameraX) + Math.abs(t.y - perception.cameraY) <= 2
    );
    return hasCampfire || nearCave;
  }

  private makeRest(perception: Perception): Action {
    return { type: 'REST', targetX: Math.round(perception.cameraX), targetY: Math.round(perception.cameraY) };
  }

  private findClosestNPC(perception: Perception): { id: string; x: number; y: number } | null {
    if (perception.nearbyNPCs.length === 0) return null;
    let closest = perception.nearbyNPCs[0];
    let closestDist = distance(perception.cameraX, perception.cameraY, closest.x, closest.y);
    for (let i = 1; i < perception.nearbyNPCs.length; i++) {
      const d = distance(perception.cameraX, perception.cameraY, perception.nearbyNPCs[i].x, perception.nearbyNPCs[i].y);
      if (d < closestDist) {
        closestDist = d;
        closest = perception.nearbyNPCs[i];
      }
    }
    return { id: closest.id, x: closest.x, y: closest.y };
  }

  private findExploreTarget(perception: Perception): Action {
    const walkableTiles = perception.nearbyTiles.filter((t: TileInfo) => t.walkable);
    if (walkableTiles.length > 0) {
      // Pick a tile toward the edge of perception range for exploration
      const edgeTiles = walkableTiles.filter((t: TileInfo) => {
        const d = distance(perception.cameraX, perception.cameraY, t.x, t.y);
        return d >= 5;
      });
      const candidates = edgeTiles.length > 0 ? edgeTiles : walkableTiles;
      // Deterministic pick based on current tick
      const idx = perception.currentTick % candidates.length;
      return { type: 'EXPLORE', targetX: candidates[idx].x, targetY: candidates[idx].y };
    }
    return { type: 'IDLE', targetX: Math.round(perception.cameraX), targetY: Math.round(perception.cameraY) };
  }
}
