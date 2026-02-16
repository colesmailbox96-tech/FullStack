/**
 * Trading system that enables NPCs to exchange resources during socialization.
 *
 * When two NPCs are socializing, they can trade resources based on their needs
 * and inventory. An NPC with excess berries but low energy might trade berries
 * for nothing (gift) to a hungry NPC to build social bonds. More advanced trades
 * involve exchanging different resource types.
 *
 * Trade conditions:
 * - Both NPCs must be socializing (within social range)
 * - NPCs must have a minimum relationship level (acquaintance+)
 * - Donor must have surplus resources (> threshold)
 * - Recipient must need the resource (respective need below threshold)
 */

import type { Inventory, ResourceType } from '../entities/Inventory';
import { addResource, removeResource } from '../entities/Inventory';

export interface TradeResult {
  occurred: boolean;
  giverResource: ResourceType | null;
  receiverResource: ResourceType | null;
  amount: number;
}

/** Minimum relationship affinity required to consider trading */
const MIN_TRADE_AFFINITY = 0.15;

/** Resource surplus threshold — NPC must have more than this to give */
const SURPLUS_THRESHOLD = 3;

/** Need deficit threshold — NPC must have need below this to receive */
const NEED_DEFICIT_THRESHOLD = 0.5;

/**
 * Evaluate whether a trade should occur between two socializing NPCs.
 *
 * Returns a TradeResult describing what was traded, or { occurred: false }
 * if no trade conditions were met.
 */
export function evaluateTrade(
  giverInventory: Inventory,
  giverNeeds: { hunger: number },
  receiverInventory: Inventory,
  receiverNeeds: { hunger: number },
  affinity: number,
): TradeResult {
  const noTrade: TradeResult = { occurred: false, giverResource: null, receiverResource: null, amount: 0 };

  // Relationship check
  if (affinity < MIN_TRADE_AFFINITY) return noTrade;

  // Check if giver has surplus berries and receiver needs food
  if (giverInventory.berries > SURPLUS_THRESHOLD && receiverNeeds.hunger < NEED_DEFICIT_THRESHOLD) {
    const amount = Math.min(2, giverInventory.berries - SURPLUS_THRESHOLD);
    if (amount > 0) {
      return { occurred: true, giverResource: 'berries', receiverResource: null, amount };
    }
  }

  // Check if giver has surplus wood and receiver has little
  if (giverInventory.wood > SURPLUS_THRESHOLD && receiverInventory.wood < 2) {
    return { occurred: true, giverResource: 'wood', receiverResource: null, amount: 1 };
  }

  // Check if giver has surplus stone and receiver has little
  if (giverInventory.stone > SURPLUS_THRESHOLD && receiverInventory.stone < 2) {
    return { occurred: true, giverResource: 'stone', receiverResource: null, amount: 1 };
  }

  // Bidirectional exchange: giver trades surplus wood for berries from receiver
  if (giverInventory.wood > SURPLUS_THRESHOLD && giverNeeds.hunger < NEED_DEFICIT_THRESHOLD &&
      receiverInventory.berries > SURPLUS_THRESHOLD) {
    return { occurred: true, giverResource: 'wood', receiverResource: 'berries', amount: 1 };
  }

  // Bidirectional exchange: giver trades surplus stone for berries from receiver
  if (giverInventory.stone > SURPLUS_THRESHOLD && giverNeeds.hunger < NEED_DEFICIT_THRESHOLD &&
      receiverInventory.berries > SURPLUS_THRESHOLD) {
    return { occurred: true, giverResource: 'stone', receiverResource: 'berries', amount: 1 };
  }

  return noTrade;
}

/**
 * Execute a trade between two NPCs. Modifies inventories in place.
 * Returns true if the trade was successfully executed.
 */
export function executeTrade(
  giverInventory: Inventory,
  receiverInventory: Inventory,
  trade: TradeResult,
): boolean {
  if (!trade.occurred || !trade.giverResource) return false;

  const removed = removeResource(giverInventory, trade.giverResource, trade.amount);
  if (!removed) return false;

  addResource(receiverInventory, trade.giverResource, trade.amount);

  // Handle bidirectional exchange: receiver gives back their resource
  if (trade.receiverResource) {
    const receiverRemoved = removeResource(receiverInventory, trade.receiverResource, trade.amount);
    if (receiverRemoved) {
      addResource(giverInventory, trade.receiverResource, trade.amount);
    }
  }

  return true;
}
