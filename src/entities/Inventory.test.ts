import { describe, it, expect } from 'vitest';
import {
  createEmptyInventory,
  addResource,
  removeResource,
  hasResources,
  consumeResources,
  totalResources,
} from './Inventory';

describe('createEmptyInventory', () => {
  it('creates inventory with all zeroes', () => {
    const inv = createEmptyInventory();
    expect(inv.wood).toBe(0);
    expect(inv.stone).toBe(0);
    expect(inv.berries).toBe(0);
  });
});

describe('addResource', () => {
  it('adds resource to inventory', () => {
    const inv = createEmptyInventory();
    addResource(inv, 'wood', 3);
    expect(inv.wood).toBe(3);
  });

  it('caps resource at 10', () => {
    const inv = createEmptyInventory();
    addResource(inv, 'wood', 15);
    expect(inv.wood).toBe(10);
  });

  it('adds to existing resource', () => {
    const inv = createEmptyInventory();
    addResource(inv, 'stone', 2);
    addResource(inv, 'stone', 3);
    expect(inv.stone).toBe(5);
  });
});

describe('removeResource', () => {
  it('removes resource from inventory', () => {
    const inv = createEmptyInventory();
    addResource(inv, 'wood', 5);
    const result = removeResource(inv, 'wood', 3);
    expect(result).toBe(true);
    expect(inv.wood).toBe(2);
  });

  it('returns false when insufficient resources', () => {
    const inv = createEmptyInventory();
    addResource(inv, 'wood', 2);
    const result = removeResource(inv, 'wood', 5);
    expect(result).toBe(false);
    expect(inv.wood).toBe(2);
  });
});

describe('hasResources', () => {
  it('returns true when inventory has enough', () => {
    const inv = createEmptyInventory();
    addResource(inv, 'wood', 3);
    addResource(inv, 'stone', 2);
    expect(hasResources(inv, { wood: 3, stone: 2 })).toBe(true);
  });

  it('returns false when inventory is short', () => {
    const inv = createEmptyInventory();
    addResource(inv, 'wood', 1);
    expect(hasResources(inv, { wood: 3 })).toBe(false);
  });

  it('returns true for empty requirements', () => {
    const inv = createEmptyInventory();
    expect(hasResources(inv, {})).toBe(true);
  });
});

describe('consumeResources', () => {
  it('consumes resources and returns true', () => {
    const inv = createEmptyInventory();
    addResource(inv, 'wood', 5);
    addResource(inv, 'stone', 3);
    const result = consumeResources(inv, { wood: 3, stone: 2 });
    expect(result).toBe(true);
    expect(inv.wood).toBe(2);
    expect(inv.stone).toBe(1);
  });

  it('returns false and does not consume when insufficient', () => {
    const inv = createEmptyInventory();
    addResource(inv, 'wood', 1);
    const result = consumeResources(inv, { wood: 3 });
    expect(result).toBe(false);
    expect(inv.wood).toBe(1);
  });
});

describe('totalResources', () => {
  it('sums all resource types', () => {
    const inv = createEmptyInventory();
    addResource(inv, 'wood', 3);
    addResource(inv, 'stone', 2);
    addResource(inv, 'berries', 1);
    expect(totalResources(inv)).toBe(6);
  });

  it('returns 0 for empty inventory', () => {
    expect(totalResources(createEmptyInventory())).toBe(0);
  });
});
