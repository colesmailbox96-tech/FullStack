import { describe, it, expect } from 'vitest';
import { evaluateTrade, executeTrade } from './Trading';
import { createEmptyInventory, addResource } from './Inventory';

describe('evaluateTrade', () => {
  it('returns no trade when affinity is too low', () => {
    const giver = createEmptyInventory();
    addResource(giver, 'berries', 5);
    const receiver = createEmptyInventory();
    const result = evaluateTrade(
      giver, { hunger: 0.8 },
      receiver, { hunger: 0.2 },
      0.05, // below MIN_TRADE_AFFINITY (0.15)
    );
    expect(result.occurred).toBe(false);
  });

  it('trades berries when giver has surplus and receiver is hungry', () => {
    const giver = createEmptyInventory();
    addResource(giver, 'berries', 6);
    const receiver = createEmptyInventory();
    const result = evaluateTrade(
      giver, { hunger: 0.8 },
      receiver, { hunger: 0.3 },
      0.3,
    );
    expect(result.occurred).toBe(true);
    expect(result.giverResource).toBe('berries');
    expect(result.amount).toBeGreaterThan(0);
    expect(result.amount).toBeLessThanOrEqual(2);
  });

  it('does not trade berries when receiver is not hungry', () => {
    const giver = createEmptyInventory();
    addResource(giver, 'berries', 6);
    const receiver = createEmptyInventory();
    const result = evaluateTrade(
      giver, { hunger: 0.8 },
      receiver, { hunger: 0.8 },
      0.3,
    );
    // berries trade condition not met, check wood/stone fallback
    expect(result.giverResource !== 'berries' || !result.occurred).toBe(true);
  });

  it('trades wood when giver has surplus and receiver has little', () => {
    const giver = createEmptyInventory();
    addResource(giver, 'wood', 5);
    const receiver = createEmptyInventory();
    addResource(receiver, 'wood', 1);
    const result = evaluateTrade(
      giver, { hunger: 0.8 },
      receiver, { hunger: 0.8 },
      0.3,
    );
    expect(result.occurred).toBe(true);
    expect(result.giverResource).toBe('wood');
    expect(result.amount).toBe(1);
  });

  it('trades stone when giver has surplus and receiver has little', () => {
    const giver = createEmptyInventory();
    addResource(giver, 'stone', 5);
    const receiver = createEmptyInventory();
    addResource(receiver, 'stone', 0);
    const result = evaluateTrade(
      giver, { hunger: 0.8 },
      receiver, { hunger: 0.8 },
      0.3,
    );
    expect(result.occurred).toBe(true);
    expect(result.giverResource).toBe('stone');
    expect(result.amount).toBe(1);
  });

  it('returns no trade when no surplus exists', () => {
    const giver = createEmptyInventory();
    addResource(giver, 'berries', 2);
    addResource(giver, 'wood', 1);
    addResource(giver, 'stone', 1);
    const receiver = createEmptyInventory();
    const result = evaluateTrade(
      giver, { hunger: 0.8 },
      receiver, { hunger: 0.3 },
      0.3,
    );
    expect(result.occurred).toBe(false);
  });

  it('prioritizes berries trade over wood/stone', () => {
    const giver = createEmptyInventory();
    addResource(giver, 'berries', 6);
    addResource(giver, 'wood', 5);
    const receiver = createEmptyInventory();
    const result = evaluateTrade(
      giver, { hunger: 0.8 },
      receiver, { hunger: 0.3 },
      0.3,
    );
    expect(result.occurred).toBe(true);
    expect(result.giverResource).toBe('berries');
  });
});

describe('executeTrade', () => {
  it('transfers resources between inventories', () => {
    const giver = createEmptyInventory();
    addResource(giver, 'berries', 6);
    const receiver = createEmptyInventory();

    const trade = { occurred: true, giverResource: 'berries' as const, receiverResource: null, amount: 2 };
    const success = executeTrade(giver, receiver, trade);

    expect(success).toBe(true);
    expect(giver.berries).toBe(4);
    expect(receiver.berries).toBe(2);
  });

  it('returns false for non-occurring trade', () => {
    const giver = createEmptyInventory();
    const receiver = createEmptyInventory();
    const trade = { occurred: false, giverResource: null, receiverResource: null, amount: 0 };
    expect(executeTrade(giver, receiver, trade)).toBe(false);
  });

  it('returns false when giver has insufficient resources', () => {
    const giver = createEmptyInventory();
    addResource(giver, 'wood', 0);
    const receiver = createEmptyInventory();
    const trade = { occurred: true, giverResource: 'wood' as const, receiverResource: null, amount: 1 };
    expect(executeTrade(giver, receiver, trade)).toBe(false);
  });
});
