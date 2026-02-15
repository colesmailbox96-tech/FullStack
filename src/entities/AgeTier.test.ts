import { describe, it, expect } from 'vitest';
import {
  getAgeTier,
  getAgeTierInfo,
  getAgeLabel,
  getMoveSpeedModifier,
  getSkillGainModifier,
  getNeedDecayModifier,
  AGE_TIER_DEFINITIONS,
} from './AgeTier';

describe('AGE_TIER_DEFINITIONS', () => {
  it('defines all five tiers', () => {
    expect(Object.keys(AGE_TIER_DEFINITIONS)).toHaveLength(5);
  });
});

describe('getAgeTier', () => {
  it('returns child for age < 500', () => {
    expect(getAgeTier(0)).toBe('child');
    expect(getAgeTier(499)).toBe('child');
  });

  it('returns young_adult for age 500–1499', () => {
    expect(getAgeTier(500)).toBe('young_adult');
    expect(getAgeTier(1499)).toBe('young_adult');
  });

  it('returns adult for age 1500–3999', () => {
    expect(getAgeTier(1500)).toBe('adult');
    expect(getAgeTier(3999)).toBe('adult');
  });

  it('returns middle_aged for age 4000–6999', () => {
    expect(getAgeTier(4000)).toBe('middle_aged');
    expect(getAgeTier(6999)).toBe('middle_aged');
  });

  it('returns elder for age >= 7000', () => {
    expect(getAgeTier(7000)).toBe('elder');
    expect(getAgeTier(99999)).toBe('elder');
  });
});

describe('children', () => {
  it('have faster skill gain than adults', () => {
    expect(getSkillGainModifier(100)).toBeGreaterThan(getSkillGainModifier(2000));
  });

  it('have slower movement than adults', () => {
    expect(getMoveSpeedModifier(100)).toBeLessThan(getMoveSpeedModifier(2000));
  });

  it('have higher need decay (faster metabolism)', () => {
    expect(getNeedDecayModifier(100)).toBeGreaterThan(getNeedDecayModifier(2000));
  });
});

describe('elders', () => {
  it('have the slowest movement of all tiers', () => {
    const elderSpeed = getMoveSpeedModifier(8000);
    expect(elderSpeed).toBeLessThan(getMoveSpeedModifier(100));   // child
    expect(elderSpeed).toBeLessThan(getMoveSpeedModifier(1000));  // young_adult
    expect(elderSpeed).toBeLessThan(getMoveSpeedModifier(2000));  // adult
    expect(elderSpeed).toBeLessThan(getMoveSpeedModifier(5000));  // middle_aged
  });

  it('have the lowest skill gain of all tiers', () => {
    const elderGain = getSkillGainModifier(8000);
    expect(elderGain).toBeLessThan(getSkillGainModifier(100));
    expect(elderGain).toBeLessThan(getSkillGainModifier(1000));
    expect(elderGain).toBeLessThan(getSkillGainModifier(2000));
    expect(elderGain).toBeLessThan(getSkillGainModifier(5000));
  });
});

describe('young adults', () => {
  it('have the fastest movement of all tiers', () => {
    const yaSpeed = getMoveSpeedModifier(1000);
    expect(yaSpeed).toBeGreaterThan(getMoveSpeedModifier(100));   // child
    expect(yaSpeed).toBeGreaterThan(getMoveSpeedModifier(2000));  // adult
    expect(yaSpeed).toBeGreaterThan(getMoveSpeedModifier(5000));  // middle_aged
    expect(yaSpeed).toBeGreaterThan(getMoveSpeedModifier(8000));  // elder
  });
});

describe('modifier ranges', () => {
  const ages = [0, 499, 500, 1499, 1500, 3999, 4000, 6999, 7000, 10000];

  it('all move speed modifiers are between 0.5 and 1.5', () => {
    for (const age of ages) {
      const mod = getMoveSpeedModifier(age);
      expect(mod).toBeGreaterThanOrEqual(0.5);
      expect(mod).toBeLessThanOrEqual(1.5);
    }
  });

  it('all skill gain modifiers are between 0.3 and 2.0', () => {
    for (const age of ages) {
      const mod = getSkillGainModifier(age);
      expect(mod).toBeGreaterThanOrEqual(0.3);
      expect(mod).toBeLessThanOrEqual(2.0);
    }
  });

  it('all need decay modifiers are between 0.5 and 1.5', () => {
    for (const age of ages) {
      const mod = getNeedDecayModifier(age);
      expect(mod).toBeGreaterThanOrEqual(0.5);
      expect(mod).toBeLessThanOrEqual(1.5);
    }
  });
});

describe('getAgeTierInfo', () => {
  it('returns full info matching the tier definition', () => {
    const info = getAgeTierInfo(2000);
    expect(info).toEqual(AGE_TIER_DEFINITIONS.adult);
  });
});

describe('getAgeLabel', () => {
  it('returns the correct label for each tier', () => {
    expect(getAgeLabel(0)).toBe('Child');
    expect(getAgeLabel(500)).toBe('Young Adult');
    expect(getAgeLabel(2000)).toBe('Adult');
    expect(getAgeLabel(5000)).toBe('Middle Aged');
    expect(getAgeLabel(8000)).toBe('Elder');
  });
});
