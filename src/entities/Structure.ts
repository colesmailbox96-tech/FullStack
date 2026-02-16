import { distance } from '../utils/Math';
import { WorldObjectManager, ObjectType, type WorldObject, type StructureType, type StructureData } from '../world/WorldObject';
import { TileMap } from '../world/TileMap';
import type { ResourceType, Inventory } from './Inventory';
import { removeResource } from './Inventory';
import type { WorldConfig } from '../engine/Config';

export type { StructureType } from '../world/WorldObject';

/** Resource costs and build ticks for each structure type. */
export const STRUCTURE_DEFINITIONS: Record<StructureType, {
  cost: Partial<Record<ResourceType, number>>;
  buildTicks: number;
  objectType: ObjectType;
}> = {
  hut: { cost: { wood: 5, stone: 3 }, buildTicks: 60, objectType: ObjectType.Hut },
  farm: { cost: { wood: 4, stone: 1, berries: 2 }, buildTicks: 80, objectType: ObjectType.Farm },
  well: { cost: { wood: 2, stone: 5 }, buildTicks: 50, objectType: ObjectType.Well },
  storehouse: { cost: { wood: 6, stone: 4 }, buildTicks: 100, objectType: ObjectType.Storehouse },
  watchtower: { cost: { wood: 3, stone: 6 }, buildTicks: 90, objectType: ObjectType.Watchtower },
  meeting_hall: { cost: { wood: 8, stone: 5 }, buildTicks: 120, objectType: ObjectType.MeetingHall },
};

/** Reputation gained per build contribution. */
export const REPUTATION_PER_BUILD = 3;

/** Effects provided by completed structures at a given position. */
export interface StructureEffects {
  /** Whether a Hut is within shelter radius */
  nearHut: boolean;
  /** Whether a Well is within radius */
  nearWell: boolean;
  /** Whether a Watchtower is within radius */
  nearWatchtower: boolean;
  /** Whether a Meeting Hall is within radius */
  nearMeetingHall: boolean;
  /** Whether a Storehouse is in nearby range */
  nearStorehouse: boolean;
}

/**
 * Manages structure placement, resource contribution, completion,
 * health decay, and farm production.
 */
export class StructureManager {
  private objects: WorldObjectManager;

  constructor(objects: WorldObjectManager) {
    this.objects = objects;
  }

  /**
   * Place a blueprint (ConstructionSite) at the given position.
   * Returns the id of the created world object, or null if invalid.
   */
  placeBlueprint(type: StructureType, x: number, y: number, ownerId: string, tick: number): string | null {
    const def = STRUCTURE_DEFINITIONS[type];
    if (!def) return null;

    const id = this.objects.addStructureObject(ObjectType.ConstructionSite, x, y, {
      structureType: type,
      buildProgress: 0,
      requiredResources: { ...def.cost },
      contributedResources: {},
      contributors: [],
      ownerId,
      settlementId: null,
      health: 1,
      completedAt: null,
    });
    return id;
  }

  /**
   * Contribute one unit of a needed resource from the NPC's inventory
   * to a construction site. Returns true if a contribution was made.
   */
  contributeResources(structureId: string, npcId: string, inventory: Inventory): boolean {
    const obj = this.objects.getObjectById(structureId);
    if (!obj || !obj.structureData || obj.structureData.completedAt !== null) return false;

    const { requiredResources, contributedResources } = obj.structureData;

    // Find a resource type that still needs contributions and the NPC has
    for (const [res, needed] of Object.entries(requiredResources) as [ResourceType, number][]) {
      const contributed = contributedResources[res] ?? 0;
      if (contributed < needed && inventory[res] > 0) {
        if (removeResource(inventory, res, 1)) {
          contributedResources[res] = contributed + 1;
          if (!obj.structureData.contributors.includes(npcId)) {
            obj.structureData.contributors.push(npcId);
          }
          // Update build progress
          this.updateBuildProgress(obj);
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if a structure has all required resources and mark it as complete.
   */
  checkCompletion(structureId: string, tick: number): boolean {
    const obj = this.objects.getObjectById(structureId);
    if (!obj || !obj.structureData || obj.structureData.completedAt !== null) return false;

    if (obj.structureData.buildProgress >= 1) {
      const def = STRUCTURE_DEFINITIONS[obj.structureData.structureType];
      obj.type = def.objectType;
      obj.structureData.completedAt = tick;
      return true;
    }
    return false;
  }

  /** Get completed structures within a radius. */
  getStructuresInRadius(x: number, y: number, radius: number): WorldObject[] {
    return this.objects.getObjectsInRadius(x, y, radius).filter(
      obj => obj.structureData && obj.structureData.completedAt !== null
    );
  }

  /** Get all incomplete construction sites. */
  getActiveConstructionSites(): WorldObject[] {
    return this.objects.getObjects().filter(
      obj => obj.type === ObjectType.ConstructionSite && obj.structureData && obj.structureData.completedAt === null
    );
  }

  /** Get all completed structures. */
  getCompletedStructures(): WorldObject[] {
    return this.objects.getObjects().filter(
      obj => obj.structureData && obj.structureData.completedAt !== null
    );
  }

  /**
   * Update structures: health decay and farm production.
   */
  updateStructures(tick: number, config: WorldConfig, season: string, tileMap: TileMap): void {
    for (const obj of this.objects.getObjects()) {
      if (!obj.structureData) continue;
      if (obj.structureData.completedAt === null) continue;

      // Health decay
      obj.structureData.health = Math.max(0, obj.structureData.health - config.structureHealthDecay);

      // Farm production: spawn berry bush every farmProductionTicks (not in winter)
      if (obj.structureData.structureType === 'farm' && season !== 'winter') {
        if (tick % config.farmProductionTicks === 0 && obj.structureData.health > 0) {
          // Find an adjacent walkable tile that doesn't already have an object
          const farmX = obj.x;
          const farmY = obj.y;
          const offsets = [
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
            { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
            { dx: -1, dy: 1 }, { dx: 1, dy: 1 },
          ];
          for (const { dx, dy } of offsets) {
            const tx = farmX + dx;
            const ty = farmY + dy;
            if (tileMap.isWalkable(tx, ty) && !this.objects.getObjectAt(tx, ty)) {
              this.objects.addObjectAt(ObjectType.BerryBush, tx, ty);
              // Set it to ripe with 1 resource
              const bush = this.objects.getObjectAt(tx, ty);
              if (bush) {
                bush.state = 'ripe';
                bush.resources = 1;
              }
              break;
            }
          }
        }
      }
    }
  }

  /**
   * Returns aggregate structure effects for a given position.
   */
  getStructureEffects(x: number, y: number): StructureEffects {
    const effects: StructureEffects = {
      nearHut: false,
      nearWell: false,
      nearWatchtower: false,
      nearMeetingHall: false,
      nearStorehouse: false,
    };

    for (const obj of this.objects.getObjects()) {
      if (!obj.structureData || obj.structureData.completedAt === null || obj.structureData.health <= 0) continue;

      const d = distance(x, y, obj.x, obj.y);

      switch (obj.structureData.structureType) {
        case 'hut':
          if (d <= 3) effects.nearHut = true;
          break;
        case 'well':
          if (d <= 4) effects.nearWell = true;
          break;
        case 'watchtower':
          if (d <= 8) effects.nearWatchtower = true;
          break;
        case 'meeting_hall':
          if (d <= 5) effects.nearMeetingHall = true;
          break;
        case 'storehouse':
          if (d <= 8) effects.nearStorehouse = true;
          break;
      }
    }

    return effects;
  }

  /** Whether a structure needs a specific resource that the NPC has. */
  structureNeedsResourceFromInventory(obj: WorldObject, inventory: Inventory): boolean {
    if (!obj.structureData || obj.structureData.completedAt !== null) return false;
    const { requiredResources, contributedResources } = obj.structureData;
    for (const [res, needed] of Object.entries(requiredResources) as [ResourceType, number][]) {
      const contributed = contributedResources[res] ?? 0;
      if (contributed < needed && inventory[res] > 0) return true;
    }
    return false;
  }

  private updateBuildProgress(obj: WorldObject): void {
    if (!obj.structureData) return;
    const { requiredResources, contributedResources } = obj.structureData;
    let totalNeeded = 0;
    let totalContributed = 0;
    for (const [res, needed] of Object.entries(requiredResources) as [ResourceType, number][]) {
      totalNeeded += needed;
      totalContributed += Math.min(contributedResources[res] ?? 0, needed);
    }
    obj.structureData.buildProgress = totalNeeded > 0 ? totalContributed / totalNeeded : 0;
  }
}
