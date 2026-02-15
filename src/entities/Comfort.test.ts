import { describe, it, expect } from 'vitest';
import {
  calculateComfort,
  getComfortModifier,
  COMFORT_LEVELS,
  type ComfortParams,
} from './Comfort';

/** Baseline params: clear weather, daytime, spring, alone, no shelter/campfire. */
function baseParams(overrides: Partial<ComfortParams> = {}): ComfortParams {
  return {
    nearCampfire: false,
    nearbyNPCCount: 0,
    isInShelter: false,
    weather: 'clear',
    isNight: false,
    season: 'spring',
    ...overrides,
  };
}

describe('COMFORT_LEVELS', () => {
  it('defines all six levels with correct modifiers', () => {
    expect(COMFORT_LEVELS.freezing.needDecayModifier).toBe(1.5);
    expect(COMFORT_LEVELS.cold.needDecayModifier).toBe(1.25);
    expect(COMFORT_LEVELS.cool.needDecayModifier).toBe(1.1);
    expect(COMFORT_LEVELS.comfortable.needDecayModifier).toBe(1.0);
    expect(COMFORT_LEVELS.cozy.needDecayModifier).toBe(0.85);
    expect(COMFORT_LEVELS.warm.needDecayModifier).toBe(0.7);
  });
});

describe('calculateComfort', () => {
  describe('baseline', () => {
    it('returns comfortable with no extreme modifiers (clear, day, spring)', () => {
      // base 50 + spring 5 = 55 → comfortable (<=60)
      const result = calculateComfort(baseParams());
      expect(result.level).toBe('comfortable');
      expect(result.needDecayModifier).toBe(1.0);
    });
  });

  describe('campfire and group bonuses', () => {
    it('campfire + large group produces cozy or warm', () => {
      // base 50 + campfire 25 + group 15 + spring 5 = 95 → warm
      const result = calculateComfort(baseParams({ nearCampfire: true, nearbyNPCCount: 4 }));
      expect(['cozy', 'warm']).toContain(result.level);
    });

    it('campfire alone pushes toward cozy', () => {
      // base 50 + campfire 25 + spring 5 = 80 → cozy
      const result = calculateComfort(baseParams({ nearCampfire: true }));
      expect(result.level).toBe('cozy');
    });
  });

  describe('harsh conditions', () => {
    it('storm at night in winter gives freezing or cold', () => {
      // base 50 - storm 30 - night 10 - winter 15 + spring→winter so no spring bonus
      // base 50 - 30 - 10 - 15 = -5 → freezing
      const result = calculateComfort(baseParams({ weather: 'storm', isNight: true, season: 'winter' }));
      expect(['freezing', 'cold']).toContain(result.level);
    });

    it('snow at night in winter gives freezing', () => {
      // base 50 - snow 20 - night 10 - winter 15 = 5 → freezing
      const result = calculateComfort(baseParams({ weather: 'snow', isNight: true, season: 'winter' }));
      expect(result.level).toBe('freezing');
    });
  });

  describe('individual factor directions', () => {
    it('nearCampfire increases comfort', () => {
      const without = calculateComfort(baseParams());
      const withCampfire = calculateComfort(baseParams({ nearCampfire: true }));
      expect(withCampfire.needDecayModifier).toBeLessThanOrEqual(without.needDecayModifier);
    });

    it('nearby NPCs increase comfort', () => {
      const alone = calculateComfort(baseParams());
      const withGroup = calculateComfort(baseParams({ nearbyNPCCount: 3 }));
      expect(withGroup.needDecayModifier).toBeLessThanOrEqual(alone.needDecayModifier);
    });

    it('shelter increases comfort', () => {
      const outside = calculateComfort(baseParams());
      const sheltered = calculateComfort(baseParams({ isInShelter: true }));
      expect(sheltered.needDecayModifier).toBeLessThanOrEqual(outside.needDecayModifier);
    });

    it('storm weather decreases comfort', () => {
      const clear = calculateComfort(baseParams());
      const storm = calculateComfort(baseParams({ weather: 'storm' }));
      expect(storm.needDecayModifier).toBeGreaterThanOrEqual(clear.needDecayModifier);
    });

    it('rain weather decreases comfort', () => {
      const clear = calculateComfort(baseParams());
      const rain = calculateComfort(baseParams({ weather: 'rain' }));
      expect(rain.needDecayModifier).toBeGreaterThanOrEqual(clear.needDecayModifier);
    });

    it('night decreases comfort', () => {
      const day = calculateComfort(baseParams());
      const night = calculateComfort(baseParams({ isNight: true }));
      expect(night.needDecayModifier).toBeGreaterThanOrEqual(day.needDecayModifier);
    });

    it('winter decreases comfort compared to summer', () => {
      const summer = calculateComfort(baseParams({ season: 'summer' }));
      const winter = calculateComfort(baseParams({ season: 'winter' }));
      expect(winter.needDecayModifier).toBeGreaterThanOrEqual(summer.needDecayModifier);
    });
  });
});

describe('getComfortModifier', () => {
  it('returns the needDecayModifier matching calculateComfort', () => {
    const params = baseParams({ nearCampfire: true, nearbyNPCCount: 2 });
    const info = calculateComfort(params);
    const modifier = getComfortModifier(params);
    expect(modifier).toBe(info.needDecayModifier);
  });

  it('returns 1.0 for comfortable baseline', () => {
    expect(getComfortModifier(baseParams())).toBe(1.0);
  });

  it('returns < 1.0 for warm conditions', () => {
    const modifier = getComfortModifier(baseParams({ nearCampfire: true, nearbyNPCCount: 5 }));
    expect(modifier).toBeLessThan(1.0);
  });

  it('returns > 1.0 for harsh conditions', () => {
    const modifier = getComfortModifier(baseParams({ weather: 'storm', isNight: true, season: 'winter' }));
    expect(modifier).toBeGreaterThan(1.0);
  });
});
