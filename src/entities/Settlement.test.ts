import { describe, it, expect, beforeEach } from 'vitest';
import { SettlementManager } from './Settlement';
import { WorldObjectManager, ObjectType } from '../world/WorldObject';
import { StructureManager } from './Structure';
import { createEmptyInventory, addResource } from './Inventory';
import { GAMEPLAY_CONFIG } from '../engine/Config';

function createCompletedStructure(
  structureManager: StructureManager,
  objects: WorldObjectManager,
  type: 'hut' | 'well' | 'farm' | 'storehouse' | 'watchtower' | 'meeting_hall',
  x: number,
  y: number,
): string {
  const id = structureManager.placeBlueprint(type, x, y, 'npc_1', 100)!;
  const inventory = createEmptyInventory();
  addResource(inventory, 'wood', 10);
  addResource(inventory, 'stone', 10);
  addResource(inventory, 'berries', 10);
  // Contribute enough resources to complete
  for (let i = 0; i < 20; i++) {
    structureManager.contributeResources(id, 'npc_1', inventory);
  }
  structureManager.checkCompletion(id, 200);
  return id;
}

describe('SettlementManager', () => {
  let objects: WorldObjectManager;
  let structureManager: StructureManager;
  let settlementManager: SettlementManager;

  beforeEach(() => {
    objects = new WorldObjectManager();
    structureManager = new StructureManager(objects);
    settlementManager = new SettlementManager();
  });

  describe('detectSettlements', () => {
    it('does not form a settlement with 2 structures (below minimum)', () => {
      createCompletedStructure(structureManager, objects, 'hut', 10, 10);
      createCompletedStructure(structureManager, objects, 'well', 12, 12);

      const completed = structureManager.getCompletedStructures();
      const formed = settlementManager.detectSettlements(completed, 300, GAMEPLAY_CONFIG);

      expect(formed).toHaveLength(0);
      expect(settlementManager.getCount()).toBe(0);
    });

    it('forms a settlement with 3+ structures within radius', () => {
      createCompletedStructure(structureManager, objects, 'hut', 10, 10);
      createCompletedStructure(structureManager, objects, 'well', 12, 12);
      createCompletedStructure(structureManager, objects, 'hut', 14, 10);

      const completed = structureManager.getCompletedStructures();
      const formed = settlementManager.detectSettlements(completed, 300, GAMEPLAY_CONFIG);

      expect(formed).toHaveLength(1);
      expect(settlementManager.getCount()).toBe(1);
      expect(formed[0].name).toBeTruthy();
      expect(formed[0].structureIds).toHaveLength(3);
    });

    it('does not form a settlement when structures are too far apart', () => {
      createCompletedStructure(structureManager, objects, 'hut', 10, 10);
      createCompletedStructure(structureManager, objects, 'well', 50, 50);
      createCompletedStructure(structureManager, objects, 'hut', 90, 90);

      const completed = structureManager.getCompletedStructures();
      const formed = settlementManager.detectSettlements(completed, 300, GAMEPLAY_CONFIG);

      expect(formed).toHaveLength(0);
    });

    it('dissolves settlements when structures are removed', () => {
      const id1 = createCompletedStructure(structureManager, objects, 'hut', 10, 10);
      createCompletedStructure(structureManager, objects, 'well', 12, 12);
      createCompletedStructure(structureManager, objects, 'hut', 14, 10);

      const completed = structureManager.getCompletedStructures();
      settlementManager.detectSettlements(completed, 300, GAMEPLAY_CONFIG);
      expect(settlementManager.getCount()).toBe(1);

      // Remove structures by only passing 1 (simulating destruction)
      const remaining = completed.filter(s => s.id !== id1);
      settlementManager.detectSettlements(remaining, 400, GAMEPLAY_CONFIG);
      expect(settlementManager.getCount()).toBe(0);
    });
  });

  describe('getSettlement', () => {
    it('returns settlement at a given position', () => {
      createCompletedStructure(structureManager, objects, 'hut', 10, 10);
      createCompletedStructure(structureManager, objects, 'well', 12, 12);
      createCompletedStructure(structureManager, objects, 'hut', 14, 10);

      const completed = structureManager.getCompletedStructures();
      settlementManager.detectSettlements(completed, 300, GAMEPLAY_CONFIG);

      const settlement = settlementManager.getSettlement(12, 11);
      expect(settlement).not.toBeNull();
      expect(settlement!.name).toBeTruthy();
    });

    it('returns null when no settlement at position', () => {
      const settlement = settlementManager.getSettlement(100, 100);
      expect(settlement).toBeNull();
    });
  });

  describe('generateSettlementName', () => {
    it('generates non-empty names', () => {
      const name = settlementManager.generateSettlementName(42);
      expect(name.length).toBeGreaterThan(0);
    });

    it('generates different names for different seeds', () => {
      const name1 = settlementManager.generateSettlementName(1);
      const name2 = settlementManager.generateSettlementName(5);
      expect(name1).not.toBe(name2);
    });
  });

  describe('assignResidents', () => {
    it('assigns NPCs whose territory home is within settlement radius', () => {
      createCompletedStructure(structureManager, objects, 'hut', 10, 10);
      createCompletedStructure(structureManager, objects, 'well', 12, 12);
      createCompletedStructure(structureManager, objects, 'hut', 14, 10);

      const completed = structureManager.getCompletedStructures();
      settlementManager.detectSettlements(completed, 300, GAMEPLAY_CONFIG);

      // Create mock NPCs with territory homes
      const mockNPC = {
        id: 'npc_1',
        alive: true,
        territory: {
          getHome: () => ({ x: 11, y: 11, claimedAt: 50, familiarity: 0.5 }),
        },
      } as any;

      settlementManager.assignResidents([mockNPC]);

      const settlement = settlementManager.getSettlements()[0];
      expect(settlement.residentNpcIds).toContain('npc_1');
    });
  });
});
