import { describe, it, expect } from 'vitest';
import {
  createRandomPersonality,
  getDominantTrait,
  applyTraitModifier,
  Personality,
} from './Personality';

describe('createRandomPersonality', () => {
  it('creates personality with all values between 0.2 and 0.8', () => {
    const personality = createRandomPersonality(() => 0.5);
    // rand() = 0.5 → value = 0.2 + 0.5 * 0.6 = 0.5
    expect(personality.bravery).toBeCloseTo(0.5);
    expect(personality.sociability).toBeCloseTo(0.5);
    expect(personality.curiosity).toBeCloseTo(0.5);
    expect(personality.industriousness).toBeCloseTo(0.5);
    expect(personality.craftiness).toBeCloseTo(0.5);
  });

  it('lower bound when rand returns 0', () => {
    const personality = createRandomPersonality(() => 0);
    expect(personality.bravery).toBeCloseTo(0.2);
    expect(personality.sociability).toBeCloseTo(0.2);
  });

  it('upper bound when rand returns 1', () => {
    const personality = createRandomPersonality(() => 1);
    expect(personality.bravery).toBeCloseTo(0.8);
    expect(personality.sociability).toBeCloseTo(0.8);
  });
});

describe('getDominantTrait', () => {
  it('returns the trait with the highest value', () => {
    const personality: Personality = {
      bravery: 0.3,
      sociability: 0.7,
      curiosity: 0.4,
      industriousness: 0.5,
      craftiness: 0.3,
    };
    const result = getDominantTrait(personality);
    expect(result.trait).toBe('sociability');
    expect(result.label).toBe('Social');
  });

  it('returns bravery when it is highest', () => {
    const personality: Personality = {
      bravery: 0.8,
      sociability: 0.3,
      curiosity: 0.4,
      industriousness: 0.5,
      craftiness: 0.3,
    };
    expect(getDominantTrait(personality).trait).toBe('bravery');
    expect(getDominantTrait(personality).label).toBe('Brave');
  });

  it('returns curiosity when it is highest', () => {
    const personality: Personality = {
      bravery: 0.3,
      sociability: 0.3,
      curiosity: 0.8,
      industriousness: 0.3,
      craftiness: 0.3,
    };
    expect(getDominantTrait(personality).trait).toBe('curiosity');
    expect(getDominantTrait(personality).label).toBe('Curious');
  });

  it('returns industriousness when it is highest', () => {
    const personality: Personality = {
      bravery: 0.3,
      sociability: 0.3,
      curiosity: 0.3,
      industriousness: 0.8,
      craftiness: 0.3,
    };
    expect(getDominantTrait(personality).trait).toBe('industriousness');
    expect(getDominantTrait(personality).label).toBe('Industrious');
  });

  it('returns first trait when all equal', () => {
    const personality: Personality = {
      bravery: 0.5,
      sociability: 0.5,
      curiosity: 0.5,
      industriousness: 0.5,
      craftiness: 0.5,
    };
    expect(getDominantTrait(personality).trait).toBe('bravery');
  });
});

describe('applyTraitModifier', () => {
  it('returns base threshold when trait is exactly 0.5 (neutral)', () => {
    expect(applyTraitModifier(0.30, 0.5)).toBeCloseTo(0.30);
  });

  it('increases threshold for high trait values (more eager to act)', () => {
    const result = applyTraitModifier(0.30, 0.8);
    expect(result).toBeGreaterThan(0.30);
  });

  it('decreases threshold for low trait values (less eager to act)', () => {
    const result = applyTraitModifier(0.30, 0.2);
    expect(result).toBeLessThan(0.30);
  });

  it('respects custom strength parameter', () => {
    const weak = applyTraitModifier(0.30, 0.8, 0.2);
    const strong = applyTraitModifier(0.30, 0.8, 1.0);
    expect(strong).toBeGreaterThan(weak);
  });

  it('produces symmetric adjustments', () => {
    const high = applyTraitModifier(0.30, 0.8);
    const low = applyTraitModifier(0.30, 0.2);
    // The displacement from 0.30 should be equal in magnitude
    expect(Math.abs(high - 0.30)).toBeCloseTo(Math.abs(low - 0.30));
  });
});
