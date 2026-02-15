import { describe, it, expect } from 'vitest';
import { getAvailableRecipes, craftItem, RECIPES, isToolRecipe, createTool } from './Crafting';
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

  it('tool recipes have toolResult set', () => {
    const toolRecipes = RECIPES.filter(r => r.toolResult !== undefined);
    expect(toolRecipes.length).toBe(3);
    expect(toolRecipes.map(r => r.name).sort()).toEqual(['Fishing Rod', 'Stone Pickaxe', 'Wooden Axe']);
  });

  it('campfire recipe is not a tool recipe', () => {
    const campfire = RECIPES.find(r => r.name === 'Campfire')!;
    expect(isToolRecipe(campfire)).toBe(false);
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

describe('isToolRecipe', () => {
  it('returns true for tool recipes', () => {
    const axe = RECIPES.find(r => r.name === 'Wooden Axe')!;
    expect(isToolRecipe(axe)).toBe(true);
  });

  it('returns false for campfire recipe', () => {
    const campfire = RECIPES.find(r => r.name === 'Campfire')!;
    expect(isToolRecipe(campfire)).toBe(false);
  });
});

describe('createTool', () => {
  it('creates a wooden axe with full durability', () => {
    const tool = createTool('wooden_axe');
    expect(tool.type).toBe('wooden_axe');
    expect(tool.name).toBe('Wooden Axe');
    expect(tool.durability).toBe(tool.maxDurability);
    expect(tool.gatherSpeedModifier).toBe(1.5);
  });

  it('creates a fishing rod with correct target', () => {
    const tool = createTool('fishing_rod');
    expect(tool.type).toBe('fishing_rod');
    expect(tool.targetResource).toBe('food');
  });
});
