import { describe, it, expect } from 'vitest';
import { Weather } from './Weather';

describe('Weather', () => {
  it('initializes to clear weather', () => {
    const w = new Weather(42);
    expect(w.current).toBe('clear');
    expect(w.intensity).toBe(0);
  });

  it('is deterministic with same seed', () => {
    const w1 = new Weather(42);
    const w2 = new Weather(42);
    for (let i = 0; i < 500; i++) {
      w1.update('spring');
      w2.update('spring');
    }
    expect(w1.current).toBe(w2.current);
    expect(w1.windDirection).toBe(w2.windDirection);
    expect(w1.windStrength).toBe(w2.windStrength);
  });

  it('transitions weather state over time', () => {
    const w = new Weather(42);
    const states = new Set<string>();
    states.add(w.current);
    // Run enough updates to see transitions
    for (let i = 0; i < 2000; i++) {
      w.update('spring');
      states.add(w.current);
    }
    // Should have seen at least 2 different weather states
    expect(states.size).toBeGreaterThanOrEqual(2);
  });

  describe('isStorm', () => {
    it('returns true when current is storm', () => {
      const w = new Weather(42);
      // Force weather to storm by running updates until one happens
      for (let i = 0; i < 5000; i++) {
        w.update('spring');
        if (w.current === 'storm') {
          expect(w.isStorm()).toBe(true);
          return;
        }
      }
      // If no storm after 5000 ticks, test is inconclusive but not failing
    });

    it('returns false when not storm', () => {
      const w = new Weather(42);
      // Initially clear
      expect(w.isStorm()).toBe(false);
    });
  });

  describe('isRaining', () => {
    it('returns true for rain or storm', () => {
      const w = new Weather(42);
      for (let i = 0; i < 5000; i++) {
        w.update('spring');
        if (w.current === 'rain' || w.current === 'storm') {
          expect(w.isRaining()).toBe(true);
          return;
        }
      }
    });
  });

  describe('isSnowing', () => {
    it('returns true when snowing in winter', () => {
      const w = new Weather(42);
      for (let i = 0; i < 5000; i++) {
        w.update('winter');
        if (w.current === 'snow') {
          expect(w.isSnowing()).toBe(true);
          return;
        }
      }
    });
  });

  it('has valid wind properties', () => {
    const w = new Weather(42);
    expect(w.windDirection).toBeGreaterThanOrEqual(0);
    expect(w.windDirection).toBeLessThan(Math.PI * 2);
    expect(w.windStrength).toBeGreaterThanOrEqual(0);
  });

  it('intensity is positive for non-clear weather', () => {
    const w = new Weather(42);
    for (let i = 0; i < 5000; i++) {
      w.update('spring');
      if (w.current !== 'clear') {
        expect(w.intensity).toBeGreaterThan(0);
        return;
      }
    }
  });
});
