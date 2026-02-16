import { describe, it, expect } from 'vitest';
import { getAvailableRecipes, craftItem, RECIPES, isToolRecipe, createTool, useTool, isToolBroken } from './Crafting';
import { createEmptyInventory, addResource } from '../entities/Inventory';

describe('RECIPES', () => {
  it('contains at least one recipe', () => {
    expect(RECIPES.length).toBeGreaterThan(0);
  });

  it('every resource type is used in at least one recipe', () => {
    const allIngredients = RECIPES.flatMap(r => Object.keys(r.ingredients));
    expect(allIngredients).toContain('wood');
    expect(allIngredients).toContain('stone');
    expect(allIngredients).toContain('berries');
  });

  it('campfire recipe requires wood and stone', () => {
    const campfire = RECIPES.find(r => r.name === 'Campfire');
    expect(campfire).toBeDefined();
    expect(campfire!.ingredients.wood).toBe(3);
    expect(campfire!.ingredients.stone).toBe(2);
  });

  it('tool recipes have toolResult set', () => {
    const toolRecipes = RECIPES.filter(r => r.toolResult !== undefined);
    expect(toolRecipes.length).toBe(4);
    expect(toolRecipes.map(r => r.name).sort()).toEqual(['Fishing Rod', 'Stone Pickaxe', 'Stone Shovel', 'Wooden Axe']);
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
    const recipeNames = recipes.map(r => r.name);
    expect(recipeNames).toContain('Campfire');
    expect(recipeNames).toContain('Stone Shovel');
  });

  it('returns empty when not enough resources', () => {
    const inv = createEmptyInventory();
    addResource(inv, 'wood', 1);
    addResource(inv, 'stone', 1);
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

  it('creates a stone shovel with correct target', () => {
    const tool = createTool('stone_shovel');
    expect(tool.type).toBe('stone_shovel');
    expect(tool.name).toBe('Stone Shovel');
    expect(tool.targetResource).toBe('berries');
    expect(tool.durability).toBe(45);
    expect(tool.gatherSpeedModifier).toBe(1.4);
  });

  it('creates a stone pickaxe with correct target', () => {
    const tool = createTool('stone_pickaxe');
    expect(tool.type).toBe('stone_pickaxe');
    expect(tool.name).toBe('Stone Pickaxe');
    expect(tool.targetResource).toBe('stone');
    expect(tool.durability).toBe(60);
  });
});

describe('tool durability', () => {
  it('useTool decrements durability', () => {
    const tool = createTool('wooden_axe');
    const initial = tool.durability;
    useTool(tool);
    expect(tool.durability).toBe(initial - 1);
  });

  it('isToolBroken returns true when durability reaches 0', () => {
    const tool = createTool('wooden_axe');
    tool.durability = 1;
    expect(isToolBroken(tool)).toBe(false);
    useTool(tool);
    expect(isToolBroken(tool)).toBe(true);
  });

  it('useTool returns false when tool is already broken', () => {
    const tool = createTool('stone_pickaxe');
    tool.durability = 0;
    expect(useTool(tool)).toBe(false);
  });
});
