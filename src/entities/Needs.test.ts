import { describe, it, expect } from 'vitest';
import { createDefaultNeeds, getMostUrgentNeed, getMood, Needs } from './Needs';

describe('createDefaultNeeds', () => {
  it('creates needs with all values between 0.6 and 0.9', () => {
    const needs = createDefaultNeeds(() => 0.5);
    // rand() = 0.5 → value = 0.6 + 0.5 * 0.3 = 0.75
    expect(needs.hunger).toBeCloseTo(0.75);
    expect(needs.energy).toBeCloseTo(0.75);
    expect(needs.social).toBeCloseTo(0.75);
    expect(needs.curiosity).toBeCloseTo(0.75);
    expect(needs.safety).toBeCloseTo(0.75);
  });

  it('uses provided random function', () => {
    const needs0 = createDefaultNeeds(() => 0);
    expect(needs0.hunger).toBeCloseTo(0.6);

    const needs1 = createDefaultNeeds(() => 1);
    expect(needs1.hunger).toBeCloseTo(0.9);
  });
});

describe('getMostUrgentNeed', () => {
  it('returns the need with lowest value', () => {
    const needs: Needs = {
      hunger: 0.5,
      energy: 0.8,
      social: 0.3,
      curiosity: 0.7,
      safety: 0.6,
    };
    expect(getMostUrgentNeed(needs)).toBe('social');
  });

  it('returns hunger when hunger is lowest', () => {
    const needs: Needs = {
      hunger: 0.1,
      energy: 0.5,
      social: 0.5,
      curiosity: 0.5,
      safety: 0.5,
    };
    expect(getMostUrgentNeed(needs)).toBe('hunger');
  });

  it('returns first lowest if tied (hunger has priority)', () => {
    const needs: Needs = {
      hunger: 0.3,
      energy: 0.3,
      social: 0.3,
      curiosity: 0.3,
      safety: 0.3,
    };
    // When all equal, hunger is checked first as initial value
    expect(getMostUrgentNeed(needs)).toBe('hunger');
  });
});

describe('getMood', () => {
  it('returns happy when average > 0.7', () => {
    const needs: Needs = {
      hunger: 0.9,
      energy: 0.9,
      social: 0.9,
      curiosity: 0.9,
      safety: 0.9,
    };
    expect(getMood(needs)).toBe('happy');
  });

  it('returns content when average > 0.5 and <= 0.7', () => {
    const needs: Needs = {
      hunger: 0.6,
      energy: 0.6,
      social: 0.6,
      curiosity: 0.6,
      safety: 0.6,
    };
    expect(getMood(needs)).toBe('content');
  });

  it('returns worried when average > 0.3 and <= 0.5', () => {
    const needs: Needs = {
      hunger: 0.4,
      energy: 0.4,
      social: 0.4,
      curiosity: 0.4,
      safety: 0.4,
    };
    expect(getMood(needs)).toBe('worried');
  });

  it('returns distressed when average <= 0.3', () => {
    const needs: Needs = {
      hunger: 0.1,
      energy: 0.1,
      social: 0.1,
      curiosity: 0.1,
      safety: 0.1,
    };
    expect(getMood(needs)).toBe('distressed');
  });
});
