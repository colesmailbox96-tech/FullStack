import { describe, it, expect } from 'vitest';
import { TimeSystem } from './TimeSystem';
import { GAMEPLAY_CONFIG } from '../engine/Config';

describe('TimeSystem', () => {
  it('initializes at dawn (0.25)', () => {
    const ts = new TimeSystem(GAMEPLAY_CONFIG);
    expect(ts.timeOfDay).toBe(0.25);
    expect(ts.tick).toBe(0);
    expect(ts.day).toBe(0);
    expect(ts.season).toBe('spring');
  });

  it('advances tick on update', () => {
    const ts = new TimeSystem(GAMEPLAY_CONFIG);
    ts.update();
    expect(ts.tick).toBe(1);
  });

  it('calculates time of day correctly', () => {
    const ts = new TimeSystem(GAMEPLAY_CONFIG);
    // After 1200 ticks (half a day, TICKS_PER_DAY = 2400)
    for (let i = 0; i < 1200; i++) ts.update();
    expect(ts.timeOfDay).toBe(0.5);
  });

  it('increments day after 2400 ticks', () => {
    const ts = new TimeSystem(GAMEPLAY_CONFIG);
    for (let i = 0; i < 2400; i++) ts.update();
    expect(ts.day).toBe(1);
    expect(ts.timeOfDay).toBe(0);
  });

  describe('getTimePeriod', () => {
    it('returns day at start (timeOfDay = 0.25)', () => {
      const ts = new TimeSystem(GAMEPLAY_CONFIG);
      // timeOfDay starts at 0.25 which is in the day range [0.25, 0.70)
      expect(ts.getTimePeriod()).toBe('day');
    });

    it('returns dawn when timeOfDay is between 0.15 and 0.25', () => {
      const ts = new TimeSystem(GAMEPLAY_CONFIG);
      // Need tick where timeOfDay ~= 0.2 → tick = 0.2 * 2400 = 480
      for (let i = 0; i < 480; i++) ts.update();
      expect(ts.getTimePeriod()).toBe('dawn');
    });

    it('returns day when timeOfDay is between 0.25 and 0.70', () => {
      const ts = new TimeSystem(GAMEPLAY_CONFIG);
      // tick = 0.5 * 2400 = 1200
      for (let i = 0; i < 1200; i++) ts.update();
      expect(ts.getTimePeriod()).toBe('day');
    });

    it('returns dusk when timeOfDay is between 0.70 and 0.80', () => {
      const ts = new TimeSystem(GAMEPLAY_CONFIG);
      // tick = 0.75 * 2400 = 1800
      for (let i = 0; i < 1800; i++) ts.update();
      expect(ts.getTimePeriod()).toBe('dusk');
    });

    it('returns night late in the day', () => {
      const ts = new TimeSystem(GAMEPLAY_CONFIG);
      // tick = 0.85 * 2400 = 2040
      for (let i = 0; i < 2040; i++) ts.update();
      expect(ts.getTimePeriod()).toBe('night');
    });
  });

  describe('getSunAngle', () => {
    it('returns PI during night', () => {
      const ts = new TimeSystem(GAMEPLAY_CONFIG);
      // Advance to nighttime: tick = 0.85 * 2400 = 2040
      for (let i = 0; i < 2040; i++) ts.update();
      expect(ts.getSunAngle()).toBe(Math.PI);
    });

    it('returns value between 0 and PI during day', () => {
      const ts = new TimeSystem(GAMEPLAY_CONFIG);
      for (let i = 0; i < 1200; i++) ts.update();
      const angle = ts.getSunAngle();
      expect(angle).toBeGreaterThan(0);
      expect(angle).toBeLessThan(Math.PI);
    });
  });

  describe('isNight', () => {
    it('returns true at night', () => {
      const ts = new TimeSystem(GAMEPLAY_CONFIG);
      // Advance to nighttime: tick = 0.85 * 2400 = 2040
      for (let i = 0; i < 2040; i++) ts.update();
      expect(ts.isNight()).toBe(true);
    });

    it('returns false during day', () => {
      const ts = new TimeSystem(GAMEPLAY_CONFIG);
      for (let i = 0; i < 1200; i++) ts.update();
      expect(ts.isNight()).toBe(false);
    });
  });

  describe('getDayProgress', () => {
    it('returns timeOfDay', () => {
      const ts = new TimeSystem(GAMEPLAY_CONFIG);
      for (let i = 0; i < 600; i++) ts.update();
      expect(ts.getDayProgress()).toBe(ts.timeOfDay);
    });
  });

  describe('seasons', () => {
    it('cycles through seasons', () => {
      const config = { ...GAMEPLAY_CONFIG, seasonalCycleDays: 2 };
      const ts = new TimeSystem(config);
      // Day 0-1 = spring (seasonIndex 0), Day 2-3 = summer (1), etc.
      expect(ts.season).toBe('spring');

      // After 2 days (4800 ticks) → summer
      for (let i = 0; i < 4800; i++) ts.update();
      expect(ts.season).toBe('summer');

      // After 2 more days → autumn
      for (let i = 0; i < 4800; i++) ts.update();
      expect(ts.season).toBe('autumn');

      // After 2 more days → winter
      for (let i = 0; i < 4800; i++) ts.update();
      expect(ts.season).toBe('winter');
    });
  });
});
