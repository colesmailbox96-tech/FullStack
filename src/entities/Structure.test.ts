import { describe, it, expect, beforeEach } from 'vitest';
import { StructureManager, STRUCTURE_DEFINITIONS, REPUTATION_PER_BUILD } from './Structure';
import { WorldObjectManager, ObjectType } from '../world/WorldObject';
import { createEmptyInventory, addResource } from './Inventory';
import { GAMEPLAY_CONFIG } from '../engine/Config';

describe('StructureManager', () => {
  let objects: WorldObjectManager;
  let manager: StructureManager;

  beforeEach(() => {
    objects = new WorldObjectManager();
    manager = new StructureManager(objects);
  });

  describe('placeBlueprint', () => {
    it('creates a ConstructionSite world object', () => {
      const id = manager.placeBlueprint('hut', 10, 10, 'npc_1', 100);
      expect(id).not.toBeNull();

      const obj = objects.getObjectById(id!);
      expect(obj).not.toBeNull();
      expect(obj!.type).toBe(ObjectType.ConstructionSite);
      expect(obj!.structureData).toBeDefined();
      expect(obj!.structureData!.structureType).toBe('hut');
      expect(obj!.structureData!.buildProgress).toBe(0);
      expect(obj!.structureData!.ownerId).toBe('npc_1');
      expect(obj!.structureData!.health).toBe(1);
      expect(obj!.structureData!.completedAt).toBeNull();
    });

    it('sets required resources from structure definitions', () => {
      const id = manager.placeBlueprint('hut', 10, 10, 'npc_1', 100);
      const obj = objects.getObjectById(id!);
      expect(obj!.structureData!.requiredResources).toEqual({ wood: 5, stone: 3 });
    });

    it('returns null for invalid structure type', () => {
      const id = manager.placeBlueprint('invalid' as any, 10, 10, 'npc_1', 100);
      expect(id).toBeNull();
    });
  });

  describe('contributeResources', () => {
    it('deducts one unit of a needed resource from NPC inventory', () => {
      const id = manager.placeBlueprint('hut', 10, 10, 'npc_1', 100)!;
      const inventory = createEmptyInventory();
      addResource(inventory, 'wood', 5);
      addResource(inventory, 'stone', 3);

      const contributed = manager.contributeResources(id, 'npc_2', inventory);
      expect(contributed).toBe(true);
      // Should have consumed 1 wood
      expect(inventory.wood).toBe(4);
    });

    it('tracks contributor IDs', () => {
      const id = manager.placeBlueprint('hut', 10, 10, 'npc_1', 100)!;
      const inventory = createEmptyInventory();
      addResource(inventory, 'wood', 3);

      manager.contributeResources(id, 'npc_2', inventory);
      const obj = objects.getObjectById(id);
      expect(obj!.structureData!.contributors).toContain('npc_2');
    });

    it('does not add duplicate contributor IDs', () => {
      const id = manager.placeBlueprint('hut', 10, 10, 'npc_1', 100)!;
      const inventory = createEmptyInventory();
      addResource(inventory, 'wood', 5);

      manager.contributeResources(id, 'npc_2', inventory);
      manager.contributeResources(id, 'npc_2', inventory);
      const obj = objects.getObjectById(id);
      expect(obj!.structureData!.contributors.filter(c => c === 'npc_2')).toHaveLength(1);
    });

    it('returns false when NPC has no needed resources', () => {
      const id = manager.placeBlueprint('hut', 10, 10, 'npc_1', 100)!;
      const inventory = createEmptyInventory();
      addResource(inventory, 'berries', 5); // hut doesn't need berries

      const contributed = manager.contributeResources(id, 'npc_2', inventory);
      expect(contributed).toBe(false);
    });

    it('updates build progress', () => {
      const id = manager.placeBlueprint('hut', 10, 10, 'npc_1', 100)!;
      const inventory = createEmptyInventory();
      addResource(inventory, 'wood', 5);

      manager.contributeResources(id, 'npc_2', inventory);
      const obj = objects.getObjectById(id);
      // Hut needs 5 wood + 3 stone = 8 total. 1 contributed = 1/8
      expect(obj!.structureData!.buildProgress).toBeCloseTo(1 / 8);
    });
  });

  describe('checkCompletion', () => {
    it('transitions ConstructionSite to completed structure when all resources met', () => {
      const id = manager.placeBlueprint('well', 10, 10, 'npc_1', 100)!;
      const inventory = createEmptyInventory();
      addResource(inventory, 'wood', 10);
      addResource(inventory, 'stone', 10);

      // Contribute all required resources (well: 2 wood, 5 stone)
      for (let i = 0; i < 7; i++) {
        manager.contributeResources(id, 'npc_1', inventory);
      }

      const completed = manager.checkCompletion(id, 200);
      expect(completed).toBe(true);

      const obj = objects.getObjectById(id);
      expect(obj!.type).toBe(ObjectType.Well);
      expect(obj!.structureData!.completedAt).toBe(200);
    });

    it('does not complete when resources are insufficient', () => {
      const id = manager.placeBlueprint('well', 10, 10, 'npc_1', 100)!;
      const inventory = createEmptyInventory();
      addResource(inventory, 'wood', 1);

      manager.contributeResources(id, 'npc_1', inventory);
      const completed = manager.checkCompletion(id, 200);
      expect(completed).toBe(false);
    });
  });

  describe('getStructuresInRadius', () => {
    it('returns only completed structures within radius', () => {
      // Place and complete a well
      const id = manager.placeBlueprint('well', 10, 10, 'npc_1', 100)!;
      const inventory = createEmptyInventory();
      addResource(inventory, 'wood', 10);
      addResource(inventory, 'stone', 10);
      for (let i = 0; i < 7; i++) {
        manager.contributeResources(id, 'npc_1', inventory);
      }
      manager.checkCompletion(id, 200);

      // Place an incomplete site nearby
      manager.placeBlueprint('hut', 11, 11, 'npc_1', 100);

      const structures = manager.getStructuresInRadius(10, 10, 5);
      expect(structures).toHaveLength(1);
      expect(structures[0].type).toBe(ObjectType.Well);
    });
  });

  describe('getActiveConstructionSites', () => {
    it('returns only incomplete construction sites', () => {
      manager.placeBlueprint('hut', 10, 10, 'npc_1', 100);
      manager.placeBlueprint('farm', 20, 20, 'npc_2', 100);

      const sites = manager.getActiveConstructionSites();
      expect(sites).toHaveLength(2);
    });
  });

  describe('health decay', () => {
    it('decays structure health over time', () => {
      const id = manager.placeBlueprint('well', 10, 10, 'npc_1', 100)!;
      const inventory = createEmptyInventory();
      addResource(inventory, 'wood', 10);
      addResource(inventory, 'stone', 10);
      for (let i = 0; i < 7; i++) {
        manager.contributeResources(id, 'npc_1', inventory);
      }
      manager.checkCompletion(id, 200);

      // Create a minimal TileMap mock
      const tileMap = { isWalkable: () => true } as any;

      // Run updates
      for (let i = 0; i < 100; i++) {
        manager.updateStructures(201 + i, GAMEPLAY_CONFIG, 'spring', tileMap);
      }

      const obj = objects.getObjectById(id);
      expect(obj!.structureData!.health).toBeLessThan(1);
      expect(obj!.structureData!.health).toBeGreaterThan(0);
    });
  });

  describe('getStructureEffects', () => {
    it('returns nearHut when a completed hut is within 3 tiles', () => {
      const id = manager.placeBlueprint('hut', 10, 10, 'npc_1', 100)!;
      const inventory = createEmptyInventory();
      addResource(inventory, 'wood', 10);
      addResource(inventory, 'stone', 10);
      for (let i = 0; i < 8; i++) {
        manager.contributeResources(id, 'npc_1', inventory);
      }
      manager.checkCompletion(id, 200);

      const effects = manager.getStructureEffects(11, 11);
      expect(effects.nearHut).toBe(true);
    });

    it('returns nearWell when a completed well is within 4 tiles', () => {
      const id = manager.placeBlueprint('well', 10, 10, 'npc_1', 100)!;
      const inventory = createEmptyInventory();
      addResource(inventory, 'wood', 10);
      addResource(inventory, 'stone', 10);
      for (let i = 0; i < 7; i++) {
        manager.contributeResources(id, 'npc_1', inventory);
      }
      manager.checkCompletion(id, 200);

      const effects = manager.getStructureEffects(13, 10);
      expect(effects.nearWell).toBe(true);
    });

    it('returns no effects when no completed structures nearby', () => {
      manager.placeBlueprint('hut', 10, 10, 'npc_1', 100);
      const effects = manager.getStructureEffects(10, 10);
      expect(effects.nearHut).toBe(false);
      expect(effects.nearWell).toBe(false);
    });
  });

  describe('structureNeedsResourceFromInventory', () => {
    it('returns true when structure needs a resource the NPC has', () => {
      const id = manager.placeBlueprint('hut', 10, 10, 'npc_1', 100)!;
      const inventory = createEmptyInventory();
      addResource(inventory, 'wood', 1);

      const obj = objects.getObjectById(id)!;
      expect(manager.structureNeedsResourceFromInventory(obj, inventory)).toBe(true);
    });

    it('returns false when NPC lacks needed resources', () => {
      const id = manager.placeBlueprint('hut', 10, 10, 'npc_1', 100)!;
      const inventory = createEmptyInventory();

      const obj = objects.getObjectById(id)!;
      expect(manager.structureNeedsResourceFromInventory(obj, inventory)).toBe(false);
    });
  });
});
