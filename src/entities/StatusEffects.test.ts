import { describe, it, expect } from 'vitest';
import {
  StatusEffectManager,
  evaluateStatusEffects,
  type StatusEffectType,
} from './StatusEffects';
import type { Needs } from './Needs';

function makeNeeds(overrides: Partial<Needs> = {}): Needs {
  return {
    hunger: 0.5,
    energy: 0.5,
    social: 0.5,
    curiosity: 0.5,
    safety: 0.5,
    ...overrides,
  };
}

describe('StatusEffectManager', () => {
  describe('addEffect / hasEffect', () => {
    it('adds an effect and reports it as active', () => {
      const mgr = new StatusEffectManager();
      mgr.addEffect('well_fed', 10);
      expect(mgr.hasEffect('well_fed')).toBe(true);
    });

    it('replaces an existing effect of the same type', () => {
      const mgr = new StatusEffectManager();
      mgr.addEffect('cold', 5);
      mgr.addEffect('cold', 20);
      const effects = mgr.getEffects();
      expect(effects.length).toBe(1);
      expect(effects[0].remainingTicks).toBe(20);
    });
  });

  describe('removeEffect', () => {
    it('removes an active effect', () => {
      const mgr = new StatusEffectManager();
      mgr.addEffect('exhausted', 10);
      mgr.removeEffect('exhausted');
      expect(mgr.hasEffect('exhausted')).toBe(false);
    });

    it('does nothing when removing a non-existent effect', () => {
      const mgr = new StatusEffectManager();
      mgr.removeEffect('inspired');
      expect(mgr.getEffects()).toEqual([]);
    });
  });

  describe('getEffects', () => {
    it('returns a copy of the effects array', () => {
      const mgr = new StatusEffectManager();
      mgr.addEffect('sheltered', 5);
      const effects = mgr.getEffects();
      effects.push({ type: 'cold', remainingTicks: 3 });
      expect(mgr.getEffects().length).toBe(1);
    });
  });

  describe('getActiveEffectTypes', () => {
    it('returns type strings of all active effects', () => {
      const mgr = new StatusEffectManager();
      mgr.addEffect('well_fed', 10);
      mgr.addEffect('inspired', 5);
      const types = mgr.getActiveEffectTypes();
      expect(types).toContain('well_fed');
      expect(types).toContain('inspired');
      expect(types.length).toBe(2);
    });
  });

  describe('update', () => {
    it('decrements remaining ticks', () => {
      const mgr = new StatusEffectManager();
      mgr.addEffect('energized', 5);
      mgr.update();
      expect(mgr.getEffects()[0].remainingTicks).toBe(4);
    });

    it('removes effects that reach zero', () => {
      const mgr = new StatusEffectManager();
      mgr.addEffect('cold', 1);
      mgr.update();
      expect(mgr.hasEffect('cold')).toBe(false);
    });

    it('keeps effects that still have ticks remaining', () => {
      const mgr = new StatusEffectManager();
      mgr.addEffect('well_fed', 3);
      mgr.addEffect('cold', 1);
      mgr.update();
      expect(mgr.hasEffect('well_fed')).toBe(true);
      expect(mgr.hasEffect('cold')).toBe(false);
    });
  });

  describe('getHungerDrainModifier', () => {
    it('returns 1.0 with no effects', () => {
      const mgr = new StatusEffectManager();
      expect(mgr.getHungerDrainModifier()).toBe(1.0);
    });

    it('returns 0.7 with well_fed', () => {
      const mgr = new StatusEffectManager();
      mgr.addEffect('well_fed', 10);
      expect(mgr.getHungerDrainModifier()).toBeCloseTo(0.7);
    });

    it('returns 1.3 with cold', () => {
      const mgr = new StatusEffectManager();
      mgr.addEffect('cold', 10);
      expect(mgr.getHungerDrainModifier()).toBeCloseTo(1.3);
    });

    it('multiplies modifiers when both apply', () => {
      const mgr = new StatusEffectManager();
      mgr.addEffect('well_fed', 10);
      mgr.addEffect('cold', 10);
      expect(mgr.getHungerDrainModifier()).toBeCloseTo(0.7 * 1.3);
    });
  });

  describe('getEnergyDrainModifier', () => {
    it('returns 1.0 with no effects', () => {
      const mgr = new StatusEffectManager();
      expect(mgr.getEnergyDrainModifier()).toBe(1.0);
    });

    it('returns 0.7 with energized', () => {
      const mgr = new StatusEffectManager();
      mgr.addEffect('energized', 10);
      expect(mgr.getEnergyDrainModifier()).toBeCloseTo(0.7);
    });

    it('returns 1.5 with exhausted', () => {
      const mgr = new StatusEffectManager();
      mgr.addEffect('exhausted', 10);
      expect(mgr.getEnergyDrainModifier()).toBeCloseTo(1.5);
    });

    it('multiplies modifiers when both apply', () => {
      const mgr = new StatusEffectManager();
      mgr.addEffect('energized', 10);
      mgr.addEffect('exhausted', 10);
      expect(mgr.getEnergyDrainModifier()).toBeCloseTo(0.7 * 1.5);
    });
  });

  describe('getSocialDrainModifier', () => {
    it('returns 1.0 with no effects', () => {
      const mgr = new StatusEffectManager();
      expect(mgr.getSocialDrainModifier()).toBe(1.0);
    });

    it('returns 0.5 with social_butterfly', () => {
      const mgr = new StatusEffectManager();
      mgr.addEffect('social_butterfly', 10);
      expect(mgr.getSocialDrainModifier()).toBeCloseTo(0.5);
    });

    it('returns 1.5 with lonely', () => {
      const mgr = new StatusEffectManager();
      mgr.addEffect('lonely', 10);
      expect(mgr.getSocialDrainModifier()).toBeCloseTo(1.5);
    });

    it('multiplies modifiers when both apply', () => {
      const mgr = new StatusEffectManager();
      mgr.addEffect('social_butterfly', 10);
      mgr.addEffect('lonely', 10);
      expect(mgr.getSocialDrainModifier()).toBeCloseTo(0.5 * 1.5);
    });
  });

  describe('getSkillXPModifier', () => {
    it('returns 1.0 with no effects', () => {
      const mgr = new StatusEffectManager();
      expect(mgr.getSkillXPModifier()).toBe(1.0);
    });

    it('returns 1.5 with inspired', () => {
      const mgr = new StatusEffectManager();
      mgr.addEffect('inspired', 10);
      expect(mgr.getSkillXPModifier()).toBeCloseTo(1.5);
    });
  });
});

describe('evaluateStatusEffects', () => {
  describe('well_fed', () => {
    it('adds well_fed when hunger > 0.8', () => {
      const result = evaluateStatusEffects(makeNeeds({ hunger: 0.9 }), false, 0, false, false);
      expect(result.add).toContain('well_fed');
    });

    it('removes well_fed when hunger <= 0.5', () => {
      const result = evaluateStatusEffects(makeNeeds({ hunger: 0.4 }), false, 0, false, false);
      expect(result.remove).toContain('well_fed');
    });
  });

  describe('exhausted', () => {
    it('adds exhausted when energy < 0.2', () => {
      const result = evaluateStatusEffects(makeNeeds({ energy: 0.1 }), false, 0, false, false);
      expect(result.add).toContain('exhausted');
    });

    it('removes exhausted when energy >= 0.5', () => {
      const result = evaluateStatusEffects(makeNeeds({ energy: 0.6 }), false, 0, false, false);
      expect(result.remove).toContain('exhausted');
    });
  });

  describe('inspired', () => {
    it('adds inspired when all needs > 0.6', () => {
      const needs = makeNeeds({ hunger: 0.8, energy: 0.8, social: 0.8, curiosity: 0.8, safety: 0.8 });
      const result = evaluateStatusEffects(needs, false, 0, false, false);
      expect(result.add).toContain('inspired');
    });

    it('removes inspired when any need < 0.3', () => {
      const needs = makeNeeds({ hunger: 0.9, energy: 0.9, social: 0.2, curiosity: 0.9, safety: 0.9 });
      const result = evaluateStatusEffects(needs, false, 0, false, false);
      expect(result.remove).toContain('inspired');
    });
  });

  describe('lonely', () => {
    it('adds lonely when social < 0.25 and nearbyNPCCount === 0', () => {
      const result = evaluateStatusEffects(makeNeeds({ social: 0.1 }), false, 0, false, false);
      expect(result.add).toContain('lonely');
    });

    it('removes lonely when social >= 0.4', () => {
      const result = evaluateStatusEffects(makeNeeds({ social: 0.5 }), false, 0, false, false);
      expect(result.remove).toContain('lonely');
    });

    it('removes lonely when nearbyNPCCount > 0', () => {
      const result = evaluateStatusEffects(makeNeeds({ social: 0.1 }), false, 1, false, false);
      expect(result.remove).toContain('lonely');
    });
  });

  describe('sheltered', () => {
    it('adds sheltered when isInShelter is true', () => {
      const result = evaluateStatusEffects(makeNeeds(), true, 0, false, false);
      expect(result.add).toContain('sheltered');
    });

    it('removes sheltered when not in shelter', () => {
      const result = evaluateStatusEffects(makeNeeds(), false, 0, false, false);
      expect(result.remove).toContain('sheltered');
    });
  });

  describe('cold', () => {
    it('adds cold during storm when not sheltered', () => {
      const result = evaluateStatusEffects(makeNeeds(), false, 0, true, false);
      expect(result.add).toContain('cold');
    });

    it('adds cold at night when not sheltered', () => {
      const result = evaluateStatusEffects(makeNeeds(), false, 0, false, true);
      expect(result.add).toContain('cold');
    });

    it('removes cold when sheltered during storm', () => {
      const result = evaluateStatusEffects(makeNeeds(), true, 0, true, false);
      expect(result.remove).toContain('cold');
    });

    it('removes cold when no storm and not night', () => {
      const result = evaluateStatusEffects(makeNeeds(), false, 0, false, false);
      expect(result.remove).toContain('cold');
    });
  });

  describe('energized', () => {
    it('adds energized when energy > 0.85', () => {
      const result = evaluateStatusEffects(makeNeeds({ energy: 0.9 }), false, 0, false, false);
      expect(result.add).toContain('energized');
    });

    it('removes energized when energy <= 0.5', () => {
      const result = evaluateStatusEffects(makeNeeds({ energy: 0.4 }), false, 0, false, false);
      expect(result.remove).toContain('energized');
    });
  });

  describe('social_butterfly', () => {
    it('adds social_butterfly when social > 0.8 and nearbyNPCCount >= 2', () => {
      const result = evaluateStatusEffects(makeNeeds({ social: 0.9 }), false, 3, false, false);
      expect(result.add).toContain('social_butterfly');
    });

    it('removes social_butterfly when social < 0.5', () => {
      const result = evaluateStatusEffects(makeNeeds({ social: 0.3 }), false, 3, false, false);
      expect(result.remove).toContain('social_butterfly');
    });

    it('removes social_butterfly when nearbyNPCCount < 1', () => {
      const result = evaluateStatusEffects(makeNeeds({ social: 0.9 }), false, 0, false, false);
      expect(result.remove).toContain('social_butterfly');
    });
  });
});
