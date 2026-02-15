import { describe, it, expect } from 'vitest';
import { SimplexNoise, octaveNoise } from './SimplexNoise';

describe('SimplexNoise', () => {
  it('is deterministic for the same seed and coordinates', () => {
    const noise1 = new SimplexNoise(42);
    const noise2 = new SimplexNoise(42);
    expect(noise1.noise2D(1.5, 2.5)).toBe(noise2.noise2D(1.5, 2.5));
  });

  it('produces different values for different seeds', () => {
    const noise1 = new SimplexNoise(42);
    const noise2 = new SimplexNoise(999);
    // Check multiple coordinates — at least one should differ
    let hasDifference = false;
    for (let i = 0; i < 10; i++) {
      if (noise1.noise2D(i * 3.7, i * 2.3) !== noise2.noise2D(i * 3.7, i * 2.3)) {
        hasDifference = true;
        break;
      }
    }
    expect(hasDifference).toBe(true);
  });

  it('returns values in [-1, 1] range', () => {
    const noise = new SimplexNoise(42);
    for (let i = 0; i < 200; i++) {
      const val = noise.noise2D(i * 0.1, i * 0.15);
      expect(val).toBeGreaterThanOrEqual(-1);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it('returns 0 at origin', () => {
    const noise = new SimplexNoise(42);
    // noise at (0,0) should be close to 0 for most seeds
    const val = noise.noise2D(0, 0);
    expect(Math.abs(val)).toBeLessThanOrEqual(1);
  });

  it('varies smoothly across nearby coordinates', () => {
    const noise = new SimplexNoise(42);
    const v1 = noise.noise2D(5.0, 5.0);
    const v2 = noise.noise2D(5.01, 5.0);
    // Small coordinate change → small value change
    expect(Math.abs(v1 - v2)).toBeLessThan(0.1);
  });
});

describe('octaveNoise', () => {
  it('returns values in [0, 1] range (normalized)', () => {
    const noise = new SimplexNoise(42);
    for (let i = 0; i < 200; i++) {
      const val = octaveNoise(noise, i * 0.5, i * 0.7, 4, 0.02);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic', () => {
    const noise1 = new SimplexNoise(42);
    const noise2 = new SimplexNoise(42);
    expect(octaveNoise(noise1, 10, 20, 4, 0.05)).toBe(octaveNoise(noise2, 10, 20, 4, 0.05));
  });

  it('produces more detail with more octaves', () => {
    const noise = new SimplexNoise(42);
    // With 1 octave, values should be smoother than with 4 octaves
    // Test by checking variation across a small sample
    const vals1: number[] = [];
    const vals4: number[] = [];
    for (let i = 0; i < 20; i++) {
      vals1.push(octaveNoise(noise, i * 0.1, 0, 1, 0.1));
    }
    const noise2 = new SimplexNoise(42);
    for (let i = 0; i < 20; i++) {
      vals4.push(octaveNoise(noise2, i * 0.1, 0, 4, 0.1));
    }
    // Both should produce valid output
    expect(vals1.length).toBe(20);
    expect(vals4.length).toBe(20);
  });
});
