export type ResourceType = 'wood' | 'stone' | 'berries';

export interface Inventory {
  wood: number;
  stone: number;
  berries: number;
}

export function createEmptyInventory(): Inventory {
  return { wood: 0, stone: 0, berries: 0 };
}

export const MAX_INVENTORY_PER_RESOURCE = 10;

export function addResource(inventory: Inventory, type: ResourceType, amount: number): void {
  inventory[type] = Math.min(inventory[type] + amount, MAX_INVENTORY_PER_RESOURCE);
}

export function removeResource(inventory: Inventory, type: ResourceType, amount: number): boolean {
  if (inventory[type] < amount) return false;
  inventory[type] -= amount;
  return true;
}

export function hasResources(inventory: Inventory, requirements: Partial<Record<ResourceType, number>>): boolean {
  for (const [resource, amount] of Object.entries(requirements)) {
    if (inventory[resource as ResourceType] < (amount as number)) return false;
  }
  return true;
}

export function consumeResources(inventory: Inventory, requirements: Partial<Record<ResourceType, number>>): boolean {
  if (!hasResources(inventory, requirements)) return false;
  for (const [resource, amount] of Object.entries(requirements)) {
    inventory[resource as ResourceType] -= amount as number;
  }
  return true;
}

export function totalResources(inventory: Inventory): number {
  return inventory.wood + inventory.stone + inventory.berries;
}
