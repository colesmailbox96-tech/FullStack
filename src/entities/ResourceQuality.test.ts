import { describe, it, expect } from 'vitest';
import {
  determineQuality,
  getQualityMultiplier,
  getQualityLabel,
  QUALITY_TIERS,
  type QualityTier,
} from './ResourceQuality';

const ALL_TIERS: QualityTier[] = ['poor', 'normal', 'fine', 'excellent'];

describe('QUALITY_TIERS', () => {
  it('contains all four tiers', () => {
    for (const tier of ALL_TIERS) {
      expect(QUALITY_TIERS[tier]).toBeDefined();
      expect(QUALITY_TIERS[tier].tier).toBe(tier);
    }
  });
});

describe('getQualityMultiplier', () => {
  it('returns 0.6 for poor', () => {
    expect(getQualityMultiplier('poor')).toBe(0.6);
  });

  it('returns 1.0 for normal', () => {
    expect(getQualityMultiplier('normal')).toBe(1.0);
  });

  it('returns 1.3 for fine', () => {
    expect(getQualityMultiplier('fine')).toBe(1.3);
  });

  it('returns 1.6 for excellent', () => {
    expect(getQualityMultiplier('excellent')).toBe(1.6);
  });
});

describe('getQualityLabel', () => {
  it('returns △ Poor for poor', () => {
    expect(getQualityLabel('poor')).toBe('△ Poor');
  });

  it('returns Normal for normal', () => {
    expect(getQualityLabel('normal')).toBe('Normal');
  });

  it('returns ⭐ Fine for fine', () => {
    expect(getQualityLabel('fine')).toBe('⭐ Fine');
  });

  it('returns ✦ Excellent for excellent', () => {
    expect(getQualityLabel('excellent')).toBe('✦ Excellent');
  });
});

describe('determineQuality', () => {
  it('returns a valid quality tier', () => {
    const tier = determineQuality(0.5, () => 0.5);
    expect(ALL_TIERS).toContain(tier);
  });

  it('returns poor when roll is near zero at skill 0', () => {
    // At skill 0, poor has 30% chance — a roll of 0.0 should be poor
    expect(determineQuality(0, () => 0.0)).toBe('poor');
  });

  it('returns excellent when roll is near 1.0 at any skill', () => {
    expect(determineQuality(0, () => 0.999)).toBe('excellent');
    expect(determineQuality(1, () => 0.999)).toBe('excellent');
  });

  it('returns all four tiers with appropriate fixed rolls at skill 0', () => {
    // poor: 0–0.30, normal: 0.30–0.90, fine: 0.90–0.98, excellent: 0.98–1.0
    expect(determineQuality(0, () => 0.15)).toBe('poor');
    expect(determineQuality(0, () => 0.50)).toBe('normal');
    expect(determineQuality(0, () => 0.92)).toBe('fine');
    expect(determineQuality(0, () => 0.99)).toBe('excellent');
  });

  it('produces more fine/excellent at higher skill levels (statistical)', () => {
    const iterations = 5000;
    let highQualityLowSkill = 0;
    let highQualityHighSkill = 0;

    // Deterministic pseudo-random sequence
    let seed = 42;
    const rng = (): number => {
      seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (let i = 0; i < iterations; i++) {
      const tier = determineQuality(0, rng);
      if (tier === 'fine' || tier === 'excellent') highQualityLowSkill++;
    }

    // Reset seed for a fair comparison
    seed = 42;
    for (let i = 0; i < iterations; i++) {
      const tier = determineQuality(1.0, rng);
      if (tier === 'fine' || tier === 'excellent') highQualityHighSkill++;
    }

    expect(highQualityHighSkill).toBeGreaterThan(highQualityLowSkill);

    // At skill 0, fine+excellent = 10%; at skill 1, fine+excellent = 70%
    // With 5000 iterations these should be clearly separated
    const lowSkillRate = highQualityLowSkill / iterations;
    const highSkillRate = highQualityHighSkill / iterations;
    expect(lowSkillRate).toBeLessThan(0.20);
    expect(highSkillRate).toBeGreaterThan(0.55);
  });

  it('clamps skill level to valid range', () => {
    // Negative and >1 should not throw
    const tierLow = determineQuality(-0.5, () => 0.5);
    const tierHigh = determineQuality(2.0, () => 0.5);
    expect(ALL_TIERS).toContain(tierLow);
    expect(ALL_TIERS).toContain(tierHigh);
  });
});
