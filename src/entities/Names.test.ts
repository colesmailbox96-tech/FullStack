import { describe, it, expect } from 'vitest';
import { generateNPCName, getNameOnly } from './Names';
import type { Personality } from './Personality';

describe('generateNPCName', () => {
  it('returns a non-empty string', () => {
    const traits: Personality = {
      bravery: 0.5, sociability: 0.5, curiosity: 0.5,
      industriousness: 0.5, craftiness: 0.5,
    };
    const name = generateNPCName(traits, () => 0.5);
    expect(name).toBeTruthy();
    expect(name.length).toBeGreaterThan(0);
  });

  it('returns a two-word name (title + first name)', () => {
    const traits: Personality = {
      bravery: 0.5, sociability: 0.5, curiosity: 0.5,
      industriousness: 0.5, craftiness: 0.5,
    };
    const name = generateNPCName(traits, () => 0.3);
    const parts = name.split(' ');
    expect(parts).toHaveLength(2);
  });

  it('uses a bravery title when bravery is dominant', () => {
    const traits: Personality = {
      bravery: 0.9, sociability: 0.2, curiosity: 0.2,
      industriousness: 0.2, craftiness: 0.2,
    };
    const name = generateNPCName(traits, () => 0);
    expect(name.startsWith('Bold')).toBe(true);
  });

  it('uses a curiosity title when curiosity is dominant', () => {
    const traits: Personality = {
      bravery: 0.2, sociability: 0.2, curiosity: 0.9,
      industriousness: 0.2, craftiness: 0.2,
    };
    const name = generateNPCName(traits, () => 0);
    expect(name.startsWith('Curious')).toBe(true);
  });

  it('uses a sociability title when sociability is dominant', () => {
    const traits: Personality = {
      bravery: 0.2, sociability: 0.9, curiosity: 0.2,
      industriousness: 0.2, craftiness: 0.2,
    };
    const name = generateNPCName(traits, () => 0);
    expect(name.startsWith('Gentle')).toBe(true);
  });

  it('uses an industriousness title when industriousness is dominant', () => {
    const traits: Personality = {
      bravery: 0.2, sociability: 0.2, curiosity: 0.2,
      industriousness: 0.9, craftiness: 0.2,
    };
    const name = generateNPCName(traits, () => 0);
    expect(name.startsWith('Steady')).toBe(true);
  });

  it('uses a craftiness title when craftiness is dominant', () => {
    const traits: Personality = {
      bravery: 0.2, sociability: 0.2, curiosity: 0.2,
      industriousness: 0.2, craftiness: 0.9,
    };
    const name = generateNPCName(traits, () => 0);
    expect(name.startsWith('Swift')).toBe(true);
  });

  it('produces different titles for different dominant traits', () => {
    const brave: Personality = {
      bravery: 0.9, sociability: 0.2, curiosity: 0.2,
      industriousness: 0.2, craftiness: 0.2,
    };
    const curious: Personality = {
      bravery: 0.2, sociability: 0.2, curiosity: 0.9,
      industriousness: 0.2, craftiness: 0.2,
    };
    const rng = () => 0;
    const braveName = generateNPCName(brave, rng);
    const curiousName = generateNPCName(curious, rng);
    const braveTitle = braveName.split(' ')[0];
    const curiousTitle = curiousName.split(' ')[0];
    expect(braveTitle).not.toBe(curiousTitle);
  });

  it('picks different names for different rng values', () => {
    const traits: Personality = {
      bravery: 0.5, sociability: 0.5, curiosity: 0.5,
      industriousness: 0.5, craftiness: 0.5,
    };
    const nameA = generateNPCName(traits, () => 0.0);
    const nameB = generateNPCName(traits, () => 0.5);
    expect(nameA).not.toBe(nameB);
  });
});

describe('getNameOnly', () => {
  it('extracts just the first name from a full name', () => {
    expect(getNameOnly('Bold Fenn')).toBe('Fenn');
  });

  it('returns the input unchanged when there is no title', () => {
    expect(getNameOnly('Fenn')).toBe('Fenn');
  });

  it('works with names produced by generateNPCName', () => {
    const traits: Personality = {
      bravery: 0.7, sociability: 0.3, curiosity: 0.3,
      industriousness: 0.3, craftiness: 0.3,
    };
    const fullName = generateNPCName(traits, () => 0.1);
    const nameOnly = getNameOnly(fullName);
    expect(nameOnly).toBeTruthy();
    expect(nameOnly.includes(' ')).toBe(false);
  });
});
