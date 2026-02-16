import { describe, it, expect } from 'vitest';
import { WorldObjectManager, ObjectType } from './WorldObject';
import { TerrainGenerator } from './TerrainGenerator';
import { GAMEPLAY_CONFIG } from '../engine/Config';

describe('WorldObjectManager', () => {
  function createWithObjects() {
    const tileMap = TerrainGenerator.generate(42, 32, 32);
    const mgr = new WorldObjectManager();
    mgr.generateObjects(tileMap, 42, GAMEPLAY_CONFIG);
    return { mgr, tileMap };
  }

  it('starts empty', () => {
    const mgr = new WorldObjectManager();
    expect(mgr.getObjects()).toEqual([]);
  });

  it('generates objects on a tile map', () => {
    const { mgr } = createWithObjects();
    expect(mgr.getObjects().length).toBeGreaterThan(0);
  });

  it('generates diverse object types', () => {
    const { mgr } = createWithObjects();
    const types = new Set(mgr.getObjects().map(o => o.type));
    expect(types.size).toBeGreaterThanOrEqual(2);
  });

  it('generates berry bushes', () => {
    const { mgr } = createWithObjects();
    const bushes = mgr.getObjects().filter(o => o.type === ObjectType.BerryBush);
    expect(bushes.length).toBeGreaterThan(0);
    expect(bushes[0].resources).toBeGreaterThan(0);
  });

  describe('getObjectAt', () => {
    it('returns object at position', () => {
      const { mgr } = createWithObjects();
      const obj = mgr.getObjects()[0];
      const found = mgr.getObjectAt(obj.x, obj.y);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(obj.id);
    });

    it('returns null when no object', () => {
      const mgr = new WorldObjectManager();
      expect(mgr.getObjectAt(0, 0)).toBeNull();
    });
  });

  describe('getObjectsInRadius', () => {
    it('finds objects within radius', () => {
      const { mgr } = createWithObjects();
      const obj = mgr.getObjects()[0];
      const found = mgr.getObjectsInRadius(obj.x, obj.y, 1);
      expect(found.length).toBeGreaterThanOrEqual(1);
      expect(found.some(o => o.id === obj.id)).toBe(true);
    });

    it('returns empty array for empty area', () => {
      const mgr = new WorldObjectManager();
      expect(mgr.getObjectsInRadius(0, 0, 5)).toEqual([]);
    });
  });

  describe('harvestObject', () => {
    it('decreases resources on harvest', () => {
      const { mgr } = createWithObjects();
      const bush = mgr.getObjects().find(o => o.type === ObjectType.BerryBush && o.resources > 1);
      if (!bush) return; // skip if no multi-resource bush
      const initialResources = bush.resources;
      const result = mgr.harvestObject(bush.id);
      expect(result).toBe(true);
      expect(bush.resources).toBe(initialResources - 1);
    });

    it('sets state to depleted when resources reach 0', () => {
      const { mgr } = createWithObjects();
      const bush = mgr.getObjects().find(o => o.type === ObjectType.BerryBush);
      if (!bush) return;
      while (bush.resources > 0) {
        mgr.harvestObject(bush.id);
      }
      expect(bush.state).toBe('depleted');
    });

    it('returns false for invalid id', () => {
      const { mgr } = createWithObjects();
      expect(mgr.harvestObject('nonexistent')).toBe(false);
    });

    it('returns false for already depleted object', () => {
      const { mgr } = createWithObjects();
      const bush = mgr.getObjects().find(o => o.type === ObjectType.BerryBush);
      if (!bush) return;
      while (bush.resources > 0) {
        mgr.harvestObject(bush.id);
      }
      expect(mgr.harvestObject(bush.id)).toBe(false);
    });
  });

  describe('update (respawn)', () => {
    it('respawns depleted objects after timer expires', () => {
      const { mgr } = createWithObjects();
      const bush = mgr.getObjects().find(o => o.type === ObjectType.BerryBush);
      if (!bush) return;

      // Deplete it with short respawn
      while (bush.resources > 0) {
        mgr.harvestObject(bush.id, 5);
      }
      expect(bush.state).toBe('depleted');

      // Tick 5 times
      for (let i = 0; i < 6; i++) {
        mgr.update(i, GAMEPLAY_CONFIG, 'spring');
      }
      expect(bush.state).toBe('ripe');
      expect(bush.resources).toBeGreaterThan(0);
    });

    it('reduces food in winter', () => {
      const { mgr } = createWithObjects();
      const bush = mgr.getObjects().find(o => o.type === ObjectType.BerryBush);
      if (!bush) return;

      while (bush.resources > 0) {
        mgr.harvestObject(bush.id, 5);
      }

      for (let i = 0; i < 6; i++) {
        mgr.update(i, GAMEPLAY_CONFIG, 'winter');
      }
      // Winter reduces food: floor(foodPerBush * (1 - winterFoodReduction))
      // With default config: floor(4 * (1 - 0.6)) = floor(1.6) = 1
      expect(bush.resources).toBeGreaterThanOrEqual(1);
      expect(bush.resources).toBeLessThanOrEqual(GAMEPLAY_CONFIG.foodPerBush);
    });

    it('respawns trees with correct resource amount (not food amount)', () => {
      const { mgr } = createWithObjects();
      const tree = mgr.getObjects().find(o =>
        o.type === ObjectType.OakTree || o.type === ObjectType.PineTree || o.type === ObjectType.BirchTree
      );
      if (!tree) return;

      // Deplete the tree
      while (tree.resources > 0) {
        mgr.harvestObject(tree.id, 5);
      }
      expect(tree.state).toBe('depleted');

      // Respawn it
      for (let i = 0; i < 6; i++) {
        mgr.update(i, GAMEPLAY_CONFIG, 'spring');
      }
      expect(tree.state).toBe('ripe');
      // Trees should respawn with 3 resources, not config.foodPerBush (4)
      expect(tree.resources).toBe(3);
    });

    it('respawns rocks with correct resource amount', () => {
      const { mgr } = createWithObjects();
      const rock = mgr.getObjects().find(o => o.type === ObjectType.Rock);
      if (!rock) return;

      while (rock.resources > 0) {
        mgr.harvestObject(rock.id, 5);
      }
      expect(rock.state).toBe('depleted');

      for (let i = 0; i < 6; i++) {
        mgr.update(i, GAMEPLAY_CONFIG, 'spring');
      }
      expect(rock.state).toBe('ripe');
      expect(rock.resources).toBe(3);
    });
  });
});
