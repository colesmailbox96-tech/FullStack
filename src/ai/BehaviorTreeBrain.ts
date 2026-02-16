import type { IBrain } from './IBrain';
import type { Perception, TileInfo, ObjectInfo } from './Perception';
import type { Action, ActionType } from './Action';
import { ObjectType } from '../world/WorldObject';
import { TileType } from '../world/TileMap';
import { distance } from '../utils/Math';
import { applyTraitModifier } from '../entities/Personality';
import { getAvailableRecipes } from '../engine/Crafting';
import { totalResources } from '../entities/Inventory';

/** Maximum distance (in tiles) from a campfire at which an NPC can rest. */
export const CAMPFIRE_REST_RANGE = 3;

/**
 * Behavior tree with tiered priority structure (Fix 6):
 *
 * ROOT (Selector)
 * ├── 1. EMERGENCY SURVIVE: hunger < 0.10 → FORAGE
 * ├── 2. EMERGENCY SHELTER: safety < 0.15 → SEEK_SHELTER
 * ├── 3. EMERGENCY REST: energy < 0.10 → REST
 * ├── 4. MODERATE SURVIVE: hunger < 0.25 → FORAGE
 * ├── 5. MODERATE SHELTER: safety < 0.35 OR (storm AND outdoors) → SEEK_SHELTER
 * ├── 6. MODERATE REST: energy < 0.30 → REST
 * ├── 7. SOCIAL NEED: social < 0.30 AND npc within 15 tiles → SOCIALIZE
 * ├── 8. CURIOSITY: curiosity < 0.30 → EXPLORE
 * ├── 9. PROACTIVE FORAGE: hunger < 0.50 → FORAGE
 * ├── 10. PROACTIVE REST: energy < 0.50 → REST
 * ├── 11. PROACTIVE SOCIAL: social < 0.50 AND npc within 10 tiles → SOCIALIZE
 * ├── 12. CRAFT: has enough resources for a recipe → CRAFT
 * ├── 12.5 BUILD: construction site nearby AND has resources → BUILD
 * ├── 13. GATHER: gatherable objects nearby AND inventory not full → GATHER
 * └── 14. DEFAULT: EXPLORE
 */
export class BehaviorTreeBrain implements IBrain {
  decide(perception: Perception): Action {
    const { needs, nearbyNPCs, weather, personality } = perception;

    // Apply personality modifiers to thresholds.
    // Higher trait = higher threshold = more eager to act on that need.
    // Bravery inversely affects safety thresholds (brave = less fearful).
    const fearfulness = 1 - personality.bravery;
    const hungerEmergency = applyTraitModifier(0.10, personality.industriousness);
    const hungerModerate = applyTraitModifier(0.25, personality.industriousness);
    const hungerProactive = applyTraitModifier(0.50, personality.industriousness);
    const safetyEmergency = applyTraitModifier(0.15, fearfulness);
    const safetyModerate = applyTraitModifier(0.35, fearfulness);
    const socialNeed = applyTraitModifier(0.30, personality.sociability);
    const socialProactive = applyTraitModifier(0.50, personality.sociability);
    const curiosityNeed = applyTraitModifier(0.30, personality.curiosity);

    // 1. EMERGENCY SURVIVE: hunger critically low
    if (needs.hunger < hungerEmergency) {
      const foodAction = this.findFood(perception);
      if (foodAction) return foodAction;
    }

    // 2. EMERGENCY SHELTER: safety critically low
    if (needs.safety < safetyEmergency) {
      const shelterAction = this.findShelter(perception);
      if (shelterAction) return shelterAction;
    }

    // 3. EMERGENCY REST: energy < 0.10
    if (needs.energy < 0.10) {
      return this.makeRest(perception);
    }

    // 4. MODERATE SURVIVE: hunger moderately low
    if (needs.hunger < hungerModerate) {
      const foodAction = this.findFood(perception);
      if (foodAction) return foodAction;
    }

    // 5. MODERATE SHELTER: safety below threshold OR (storm AND outdoors)
    if (needs.safety < safetyModerate || (weather === 'storm' && !this.isNearShelter(perception))) {
      const shelterAction = this.findShelter(perception);
      if (shelterAction) return shelterAction;
    }

    // 6. MODERATE REST: energy < 0.30
    if (needs.energy < 0.30) {
      return this.makeRest(perception);
    }

    // 7. SOCIAL NEED: social below threshold AND npc within 15 tiles
    if (needs.social < socialNeed && nearbyNPCs.length > 0) {
      const closest = this.findClosestNPC(perception);
      if (closest && distance(perception.cameraX, perception.cameraY, closest.x, closest.y) < 15) {
        return { type: 'SOCIALIZE', targetX: closest.x, targetY: closest.y, targetNpcId: closest.id };
      }
    }

    // 8. CURIOSITY: curiosity below threshold
    if (needs.curiosity < curiosityNeed) {
      return this.findExploreTarget(perception);
    }

    // 9. PROACTIVE FORAGE: hunger below proactive threshold
    if (needs.hunger < hungerProactive) {
      const foodAction = this.findFood(perception);
      if (foodAction) return foodAction;
    }

    // 10. PROACTIVE REST: energy < 0.50
    if (needs.energy < 0.50) {
      return this.makeRest(perception);
    }

    // 11. PROACTIVE SOCIAL: social below proactive threshold AND npc within 10 tiles
    if (needs.social < socialProactive && nearbyNPCs.length > 0) {
      const closest = this.findClosestNPC(perception);
      if (closest && distance(perception.cameraX, perception.cameraY, closest.x, closest.y) < 10) {
        return { type: 'SOCIALIZE', targetX: closest.x, targetY: closest.y, targetNpcId: closest.id };
      }
    }

    // 12. CRAFT: has enough resources for a recipe
    const craftAction = this.findCraftOpportunity(perception);
    if (craftAction) return craftAction;

    // 12.5 BUILD: construction site nearby AND has resources to contribute
    const buildAction = this.findBuildTarget(perception);
    if (buildAction) return buildAction;

    // 12.7 FISH: has fishing rod AND water nearby AND hunger not full
    const fishAction = this.findFishingSpot(perception);
    if (fishAction) return fishAction;

    // 13. GATHER: gatherable objects nearby and inventory not full
    const gatherAction = this.findGatherTarget(perception);
    if (gatherAction) return gatherAction;

    // 14. DEFAULT: EXPLORE (not IDLE — when nothing else is needed, go see new things)
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
    // NPCs can only rest near a campfire
    const nearbyCampfires = perception.nearbyObjects.filter(
      (obj: ObjectInfo) => obj.type === ObjectType.Campfire
    );
    const campfireInRange = nearbyCampfires.find(
      (obj: ObjectInfo) => distance(perception.cameraX, perception.cameraY, obj.x, obj.y) <= CAMPFIRE_REST_RANGE
    );
    if (campfireInRange) {
      return { type: 'REST', targetX: Math.round(perception.cameraX), targetY: Math.round(perception.cameraY) };
    }
    // Not near a campfire — navigate to the closest visible one
    if (nearbyCampfires.length > 0) {
      const closest = nearbyCampfires.reduce((a: ObjectInfo, b: ObjectInfo) =>
        distance(perception.cameraX, perception.cameraY, a.x, a.y) <
        distance(perception.cameraX, perception.cameraY, b.x, b.y) ? a : b
      );
      return { type: 'SEEK_SHELTER', targetX: closest.x, targetY: closest.y };
    }
    // No campfire visible — fall back to general shelter search
    return this.findShelterForRest(perception);
  }

  private findShelterForRest(perception: Perception): Action {
    // Check campfire memories
    for (const mem of perception.relevantMemories) {
      if (mem.type === 'found_shelter') {
        return { type: 'SEEK_SHELTER', targetX: mem.x, targetY: mem.y };
      }
    }
    // No campfire or shelter memory — explore to find one
    return this.findExploreTarget(perception);
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

  private findGatherTarget(perception: Perception): Action | null {
    if (totalResources(perception.inventory) >= 10) return null;

    const gatherables = perception.nearbyObjects.filter(
      (obj: ObjectInfo) =>
        obj.state !== 'depleted' &&
        (obj.type === ObjectType.OakTree ||
         obj.type === ObjectType.PineTree ||
         obj.type === ObjectType.BirchTree ||
         obj.type === ObjectType.Rock)
    );

    if (gatherables.length === 0) return null;

    // Prefer the resource type the NPC has less of
    const needWood = perception.inventory.wood < perception.inventory.stone;
    const preferred = gatherables.filter((obj: ObjectInfo) => {
      if (needWood) {
        return obj.type === ObjectType.OakTree || obj.type === ObjectType.PineTree || obj.type === ObjectType.BirchTree;
      }
      return obj.type === ObjectType.Rock;
    });

    const candidates = preferred.length > 0 ? preferred : gatherables;
    const closest = candidates.reduce((a: ObjectInfo, b: ObjectInfo) =>
      distance(perception.cameraX, perception.cameraY, a.x, a.y) <
      distance(perception.cameraX, perception.cameraY, b.x, b.y) ? a : b
    );

    return { type: 'GATHER', targetX: closest.x, targetY: closest.y };
  }

  private findBuildTarget(perception: Perception): Action | null {
    const { nearbyConstructionSites, inventory, personality } = perception;

    // Check for incomplete construction sites within perception radius
    if (nearbyConstructionSites.length > 0) {
      // NPC has at least 1 unit of any resource → go contribute
      if (inventory.wood > 0 || inventory.stone > 0 || inventory.berries > 0) {
        const closest = nearbyConstructionSites.reduce((a: ObjectInfo, b: ObjectInfo) =>
          distance(perception.cameraX, perception.cameraY, a.x, a.y) <
          distance(perception.cameraX, perception.cameraY, b.x, b.y) ? a : b
        );
        return { type: 'BUILD', targetX: closest.x, targetY: closest.y };
      }
    }

    // High craftiness NPCs prefer building over exploring when idle
    if (personality.craftiness >= 0.6 && nearbyConstructionSites.length > 0) {
      const closest = nearbyConstructionSites[0];
      return { type: 'BUILD', targetX: closest.x, targetY: closest.y };
    }

    return null;
  }

  private findCraftOpportunity(perception: Perception): Action | null {
    const recipes = getAvailableRecipes(perception.inventory);
    if (recipes.length === 0) return null;

    const craftThreshold = applyTraitModifier(perception.craftInventoryThreshold, perception.personality.craftiness);
    if (totalResources(perception.inventory) < craftThreshold) return null;

    return {
      type: 'CRAFT',
      targetX: Math.round(perception.cameraX),
      targetY: Math.round(perception.cameraY),
    };
  }

  private findFishingSpot(perception: Perception): Action | null {
    if (!perception.hasFishingRod) return null;
    if (perception.needs.hunger > 0.7) return null;
    if (perception.nearbyFishingSpots.length === 0) return null;

    // Pick closest fishing spot
    const closest = perception.nearbyFishingSpots.reduce((a, b) =>
      distance(perception.cameraX, perception.cameraY, a.x, a.y) <
      distance(perception.cameraX, perception.cameraY, b.x, b.y) ? a : b
    );
    return { type: 'FISH', targetX: closest.x, targetY: closest.y };
  }
}
