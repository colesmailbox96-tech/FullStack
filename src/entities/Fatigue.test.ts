import { describe, it, expect } from 'vitest';
import { FatigueTracker } from './Fatigue';

describe('FatigueTracker', () => {
  describe('initial state', () => {
    it('starts rested with 0 fatigue', () => {
      const tracker = new FatigueTracker();
      expect(tracker.getFatigue()).toBe(0);
      expect(tracker.getLevel()).toBe('rested');
      expect(tracker.getEfficiencyModifier()).toBe(1.1);
      expect(tracker.needsRest()).toBe(false);
    });
  });

  describe('addWorkFatigue', () => {
    it('increases fatigue when working', () => {
      const tracker = new FatigueTracker();
      tracker.addWorkFatigue('FORAGE');
      expect(tracker.getFatigue()).toBeGreaterThan(0);
    });

    it('adds different fatigue amounts per action type', () => {
      const actions = ['FORAGE', 'GATHER', 'CRAFT', 'EXPLORE', 'SOCIALIZE'] as const;
      const rates = [0.002, 0.003, 0.004, 0.001, 0.0005];

      for (let i = 0; i < actions.length; i++) {
        const tracker = new FatigueTracker();
        tracker.addWorkFatigue(actions[i]);
        expect(tracker.getFatigue()).toBeCloseTo(rates[i], 10);
      }
    });

    it('adds zero fatigue for unknown action types', () => {
      const tracker = new FatigueTracker();
      tracker.addWorkFatigue('UNKNOWN');
      expect(tracker.getFatigue()).toBe(0);
    });

    it('doubles fatigue gain after 100 consecutive work ticks', () => {
      const tracker = new FatigueTracker();
      // Work 101 ticks to cross the threshold
      for (let i = 0; i < 101; i++) {
        tracker.addWorkFatigue('EXPLORE');
      }
      const before = tracker.getFatigue();
      tracker.addWorkFatigue('EXPLORE');
      const after = tracker.getFatigue();
      // The 102nd tick should add doubled fatigue (0.002 instead of 0.001)
      expect(after - before).toBeCloseTo(0.002, 10);
    });

    it('caps fatigue at 1.0', () => {
      const tracker = new FatigueTracker();
      for (let i = 0; i < 1000; i++) {
        tracker.addWorkFatigue('CRAFT');
      }
      expect(tracker.getFatigue()).toBe(1.0);
    });
  });

  describe('rest', () => {
    it('reduces fatigue', () => {
      const tracker = new FatigueTracker();
      for (let i = 0; i < 50; i++) tracker.addWorkFatigue('CRAFT');
      const before = tracker.getFatigue();
      tracker.rest(false);
      expect(tracker.getFatigue()).toBeLessThan(before);
    });

    it('recovers faster in shelter', () => {
      const outdoor = new FatigueTracker();
      const sheltered = new FatigueTracker();
      for (let i = 0; i < 50; i++) {
        outdoor.addWorkFatigue('CRAFT');
        sheltered.addWorkFatigue('CRAFT');
      }
      outdoor.rest(false);
      sheltered.rest(true);
      expect(sheltered.getFatigue()).toBeLessThan(outdoor.getFatigue());
    });

    it('floors fatigue at 0', () => {
      const tracker = new FatigueTracker();
      tracker.addWorkFatigue('SOCIALIZE');
      for (let i = 0; i < 100; i++) tracker.rest(true);
      expect(tracker.getFatigue()).toBe(0);
    });

    it('resets consecutive work ticks', () => {
      const tracker = new FatigueTracker();
      // Work 101 ticks
      for (let i = 0; i < 101; i++) tracker.addWorkFatigue('EXPLORE');
      // Rest resets the counter
      tracker.rest(false);
      // Work again — should use base rate, not doubled
      const before = tracker.getFatigue();
      tracker.addWorkFatigue('EXPLORE');
      const after = tracker.getFatigue();
      expect(after - before).toBeCloseTo(0.001, 10);
    });
  });

  describe('getLevel', () => {
    it('returns rested when fatigue < 0.15', () => {
      const tracker = new FatigueTracker();
      expect(tracker.getLevel()).toBe('rested');
    });

    it('returns normal when fatigue is 0.15–0.35', () => {
      const tracker = new FatigueTracker();
      // CRAFT adds 0.004 per tick; 50 ticks = 0.20
      for (let i = 0; i < 50; i++) tracker.addWorkFatigue('CRAFT');
      expect(tracker.getLevel()).toBe('normal');
    });

    it('returns tired when fatigue is 0.35–0.60', () => {
      const tracker = new FatigueTracker();
      // 100 ticks × 0.004 = 0.40
      for (let i = 0; i < 100; i++) tracker.addWorkFatigue('CRAFT');
      expect(tracker.getLevel()).toBe('tired');
    });

    it('returns exhausted when fatigue is 0.60–0.85', () => {
      const tracker = new FatigueTracker();
      // 140 ticks: 101 at base 0.004 + 39 at doubled 0.008 ≈ 0.716
      for (let i = 0; i < 140; i++) tracker.addWorkFatigue('CRAFT');
      const level = tracker.getLevel();
      expect(level).toBe('exhausted');
    });

    it('returns burnt_out when fatigue >= 0.85', () => {
      const tracker = new FatigueTracker();
      for (let i = 0; i < 500; i++) tracker.addWorkFatigue('CRAFT');
      expect(tracker.getLevel()).toBe('burnt_out');
    });
  });

  describe('getEfficiencyModifier', () => {
    it('returns 1.1 for rested', () => {
      const tracker = new FatigueTracker();
      expect(tracker.getEfficiencyModifier()).toBe(1.1);
    });

    it('returns 1.0 for normal', () => {
      const tracker = new FatigueTracker();
      for (let i = 0; i < 50; i++) tracker.addWorkFatigue('CRAFT');
      expect(tracker.getEfficiencyModifier()).toBe(1.0);
    });

    it('returns 0.85 for tired', () => {
      const tracker = new FatigueTracker();
      for (let i = 0; i < 100; i++) tracker.addWorkFatigue('CRAFT');
      expect(tracker.getEfficiencyModifier()).toBe(0.85);
    });

    it('returns 0.65 for exhausted', () => {
      const tracker = new FatigueTracker();
      for (let i = 0; i < 140; i++) tracker.addWorkFatigue('CRAFT');
      expect(tracker.getEfficiencyModifier()).toBe(0.65);
    });

    it('returns 0.4 for burnt_out', () => {
      const tracker = new FatigueTracker();
      for (let i = 0; i < 500; i++) tracker.addWorkFatigue('CRAFT');
      expect(tracker.getEfficiencyModifier()).toBe(0.4);
    });
  });

  describe('getInfo', () => {
    it('returns a complete FatigueInfo snapshot', () => {
      const tracker = new FatigueTracker();
      const info = tracker.getInfo();
      expect(info.level).toBe('rested');
      expect(info.value).toBe(0);
      expect(info.efficiencyModifier).toBe(1.1);
      expect(info.label).toBe('Well rested — peak performance');
    });
  });

  describe('needsRest', () => {
    it('returns false when not exhausted', () => {
      const tracker = new FatigueTracker();
      expect(tracker.needsRest()).toBe(false);
    });

    it('returns true when fatigue >= 0.6', () => {
      const tracker = new FatigueTracker();
      for (let i = 0; i < 140; i++) tracker.addWorkFatigue('CRAFT');
      expect(tracker.getFatigue()).toBeGreaterThanOrEqual(0.6);
      expect(tracker.needsRest()).toBe(true);
    });
  });
});
