import { ObjectType } from '../world/WorldObject';
import type { Inventory } from '../entities/Inventory';
import { hasResources, consumeResources, type ResourceType } from '../entities/Inventory';

export interface CraftingRecipe {
  name: string;
  result: ObjectType;
  ingredients: Partial<Record<ResourceType, number>>;
  craftTicks: number;
}

export const RECIPES: CraftingRecipe[] = [
  {
    name: 'Campfire',
    result: ObjectType.Campfire,
    ingredients: { wood: 3, stone: 2 },
    craftTicks: 40,
  },
];

export function getAvailableRecipes(inventory: Inventory): CraftingRecipe[] {
  return RECIPES.filter(recipe => hasResources(inventory, recipe.ingredients));
}

export function craftItem(inventory: Inventory, recipe: CraftingRecipe): boolean {
  return consumeResources(inventory, recipe.ingredients);
}
