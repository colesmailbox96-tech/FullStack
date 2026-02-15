import { describe, it, expect } from 'vitest';
import { getAvailableRecipes, craftItem, RECIPES } from './Crafting';
import { createEmptyInventory, addResource } from '../entities/Inventory';

describe('RECIPES', () => {
  it('contains at least one recipe', () => {
    expect(RECIPES.length).toBeGreaterThan(0);
  });

  it('campfire recipe requires wood and stone', () => {
    const campfire = RECIPES.find(r => r.name === 'Campfire');
    expect(campfire).toBeDefined();
    expect(campfire!.ingredients.wood).toBe(3);
    expect(campfire!.ingredients.stone).toBe(2);
  });
});

describe('getAvailableRecipes', () => {
  it('returns empty when inventory is empty', () => {
    const inv = createEmptyInventory();
    expect(getAvailableRecipes(inv)).toEqual([]);
  });

  it('returns campfire recipe when enough resources', () => {
    const inv = createEmptyInventory();
    addResource(inv, 'wood', 3);
    addResource(inv, 'stone', 2);
    const recipes = getAvailableRecipes(inv);
    expect(recipes.length).toBe(1);
    expect(recipes[0].name).toBe('Campfire');
  });

  it('returns empty when not enough resources', () => {
    const inv = createEmptyInventory();
    addResource(inv, 'wood', 2);
    addResource(inv, 'stone', 2);
    expect(getAvailableRecipes(inv)).toEqual([]);
  });
});

describe('craftItem', () => {
  it('consumes resources and returns true', () => {
    const inv = createEmptyInventory();
    addResource(inv, 'wood', 5);
    addResource(inv, 'stone', 3);
    const recipe = RECIPES[0];
    const result = craftItem(inv, recipe);
    expect(result).toBe(true);
    expect(inv.wood).toBe(2);
    expect(inv.stone).toBe(1);
  });

  it('returns false when resources insufficient', () => {
    const inv = createEmptyInventory();
    addResource(inv, 'wood', 1);
    const recipe = RECIPES[0];
    const result = craftItem(inv, recipe);
    expect(result).toBe(false);
    expect(inv.wood).toBe(1);
  });
});
