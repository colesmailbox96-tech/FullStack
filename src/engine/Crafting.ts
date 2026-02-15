import { ObjectType } from '../world/WorldObject';
import type { Inventory } from '../entities/Inventory';
import { hasResources, consumeResources, type ResourceType } from '../entities/Inventory';

export interface CraftingRecipe {
  name: string;
  result: ObjectType;
  ingredients: Partial<Record<ResourceType, number>>;
  craftTicks: number;
}

/** Tool types that NPCs can craft and equip for efficiency bonuses */
export type ToolType = 'wooden_axe' | 'stone_pickaxe' | 'fishing_rod';

export interface ToolInfo {
  type: ToolType;
  name: string;
  description: string;
  icon: string;
  /** Gathering speed multiplier when using this tool */
  gatherSpeedModifier: number;
  /** Which resource this tool helps gather faster */
  targetResource: ResourceType | 'food';
  durability: number;
  maxDurability: number;
}

export const TOOL_DEFINITIONS: Record<ToolType, Omit<ToolInfo, 'durability'>> = {
  wooden_axe: {
    type: 'wooden_axe',
    name: 'Wooden Axe',
    description: 'Chops wood faster',
    icon: '🪓',
    gatherSpeedModifier: 1.5,
    targetResource: 'wood',
    maxDurability: 50,
  },
  stone_pickaxe: {
    type: 'stone_pickaxe',
    name: 'Stone Pickaxe',
    description: 'Mines stone faster',
    icon: '⛏️',
    gatherSpeedModifier: 1.5,
    targetResource: 'stone',
    maxDurability: 60,
  },
  fishing_rod: {
    type: 'fishing_rod',
    name: 'Fishing Rod',
    description: 'Catch food from water',
    icon: '🎣',
    gatherSpeedModifier: 1.3,
    targetResource: 'food',
    maxDurability: 40,
  },
};

export function createTool(type: ToolType): ToolInfo {
  const def = TOOL_DEFINITIONS[type];
  return { ...def, durability: def.maxDurability };
}

export function useTool(tool: ToolInfo): boolean {
  if (tool.durability <= 0) return false;
  tool.durability--;
  return true;
}

export function isToolBroken(tool: ToolInfo): boolean {
  return tool.durability <= 0;
}

export const RECIPES: CraftingRecipe[] = [
  {
    name: 'Campfire',
    result: ObjectType.Campfire,
    ingredients: { wood: 3, stone: 2 },
    craftTicks: 40,
  },
  {
    name: 'Wooden Axe',
    result: ObjectType.Campfire, // Uses campfire as placeholder result type
    ingredients: { wood: 4 },
    craftTicks: 30,
  },
  {
    name: 'Stone Pickaxe',
    result: ObjectType.Campfire,
    ingredients: { wood: 2, stone: 3 },
    craftTicks: 35,
  },
  {
    name: 'Fishing Rod',
    result: ObjectType.Campfire,
    ingredients: { wood: 3, berries: 1 },
    craftTicks: 25,
  },
];

export function getAvailableRecipes(inventory: Inventory): CraftingRecipe[] {
  return RECIPES.filter(recipe => hasResources(inventory, recipe.ingredients));
}

export function craftItem(inventory: Inventory, recipe: CraftingRecipe): boolean {
  return consumeResources(inventory, recipe.ingredients);
}
