import { describe, it, expect } from 'vitest';
import { calculateGroupBonus, canFormGroup, getGroupActivityForAction } from './GroupActivity';

describe('calculateGroupBonus', () => {
  it('returns 1.0 multiplier for solo participant', () => {
    const bonus = calculateGroupBonus('group_forage', 1, 0.5);
    expect(bonus.efficiencyMultiplier).toBe(1.0);
    expect(bonus.participantCount).toBe(1);
    expect(bonus.activityType).toBe('group_forage');
  });

  it('gives bonus for duo', () => {
    const bonus = calculateGroupBonus('group_gather', 2, 0.5);
    // base 1.0 + 0.15 = 1.15, then * (1 + 0.5*0.2) = 1.15 * 1.1 = 1.265 → rounds to 1.27
    expect(bonus.efficiencyMultiplier).toBe(1.26);
  });

  it('gives diminishing returns for larger groups', () => {
    const duo = calculateGroupBonus('group_forage', 2, 0.5);
    const trio = calculateGroupBonus('group_forage', 3, 0.5);
    const quad = calculateGroupBonus('group_forage', 4, 0.5);
    const quint = calculateGroupBonus('group_forage', 5, 0.5);

    // Each additional participant adds less
    const duoGain = duo.efficiencyMultiplier - 1.0;
    const trioGain = trio.efficiencyMultiplier - duo.efficiencyMultiplier;
    const quadGain = quad.efficiencyMultiplier - trio.efficiencyMultiplier;
    const quintGain = quint.efficiencyMultiplier - quad.efficiencyMultiplier;

    expect(trioGain).toBeLessThanOrEqual(duoGain + 0.01);
    expect(quadGain).toBeLessThan(trioGain);
    expect(quintGain).toBeLessThan(quadGain);
  });

  it('caps multiplier at 2.0', () => {
    const bonus = calculateGroupBonus('group_explore', 20, 1.0);
    expect(bonus.efficiencyMultiplier).toBe(2.0);
  });

  it('treats participantCount < 1 as 1', () => {
    const bonus = calculateGroupBonus('group_rest', 0, 0.5);
    expect(bonus.efficiencyMultiplier).toBe(1.0);
    expect(bonus.participantCount).toBe(1);
  });

  it('higher affinity gives better bonus', () => {
    const lowAffinity = calculateGroupBonus('group_forage', 3, 0.1);
    const highAffinity = calculateGroupBonus('group_forage', 3, 0.9);
    expect(highAffinity.efficiencyMultiplier).toBeGreaterThan(lowAffinity.efficiencyMultiplier);
  });

  it('zero affinity still gives participant bonus', () => {
    const bonus = calculateGroupBonus('group_forage', 3, 0.0);
    // base 1.0 + 0.15 + 0.15 = 1.30, * (1 + 0) = 1.30
    expect(bonus.efficiencyMultiplier).toBe(1.3);
  });

  it('rounds multiplier to 2 decimal places', () => {
    const bonus = calculateGroupBonus('group_gather', 2, 0.5);
    const str = bonus.efficiencyMultiplier.toString();
    const decimals = str.includes('.') ? str.split('.')[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });
});

describe('canFormGroup', () => {
  it('returns true when social and affinity thresholds are met', () => {
    expect(canFormGroup(0.5, [0.4, 0.2])).toBe(true);
  });

  it('returns false when initiator social is too low', () => {
    expect(canFormGroup(0.2, [0.5, 0.6])).toBe(false);
  });

  it('returns false when social is exactly 0.3', () => {
    expect(canFormGroup(0.3, [0.5])).toBe(false);
  });

  it('returns false when no participant has sufficient affinity', () => {
    expect(canFormGroup(0.5, [0.1, 0.2])).toBe(false);
  });

  it('returns true when affinity is exactly 0.3', () => {
    expect(canFormGroup(0.5, [0.3])).toBe(true);
  });

  it('returns false with empty participant list', () => {
    expect(canFormGroup(0.5, [])).toBe(false);
  });
});

describe('getGroupActivityForAction', () => {
  it('maps FORAGE to group_forage', () => {
    expect(getGroupActivityForAction('FORAGE')).toBe('group_forage');
  });

  it('maps GATHER to group_gather', () => {
    expect(getGroupActivityForAction('GATHER')).toBe('group_gather');
  });

  it('maps EXPLORE to group_explore', () => {
    expect(getGroupActivityForAction('EXPLORE')).toBe('group_explore');
  });

  it('maps REST to group_rest', () => {
    expect(getGroupActivityForAction('REST')).toBe('group_rest');
  });

  it('returns null for unknown action', () => {
    expect(getGroupActivityForAction('ATTACK')).toBeNull();
    expect(getGroupActivityForAction('')).toBeNull();
  });
});
