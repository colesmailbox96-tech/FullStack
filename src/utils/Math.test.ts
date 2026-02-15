import { describe, it, expect } from 'vitest';
import {
  lerp,
  clamp,
  smoothstep,
  distance,
  manhattanDistance,
  vec2,
  vec2Add,
  vec2Sub,
  vec2Scale,
  vec2Length,
  vec2Normalize,
  hashCoord,
} from './Math';

describe('lerp', () => {
  it('returns a when t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it('returns b when t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('returns midpoint when t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });

  it('extrapolates beyond [0,1]', () => {
    expect(lerp(0, 10, 2)).toBe(20);
  });
});

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('returns boundary values', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('smoothstep', () => {
  it('returns 0 at edge0', () => {
    expect(smoothstep(0, 1, 0)).toBe(0);
  });

  it('returns 1 at edge1', () => {
    expect(smoothstep(0, 1, 1)).toBe(1);
  });

  it('returns ~0.5 at midpoint', () => {
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
  });

  it('clamps below edge0', () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
  });

  it('clamps above edge1', () => {
    expect(smoothstep(0, 1, 2)).toBe(1);
  });
});

describe('distance', () => {
  it('returns 0 for same point', () => {
    expect(distance(5, 5, 5, 5)).toBe(0);
  });

  it('returns correct Euclidean distance', () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
  });

  it('is symmetric', () => {
    expect(distance(1, 2, 4, 6)).toBe(distance(4, 6, 1, 2));
  });
});

describe('manhattanDistance', () => {
  it('returns 0 for same point', () => {
    expect(manhattanDistance(5, 5, 5, 5)).toBe(0);
  });

  it('returns correct Manhattan distance', () => {
    expect(manhattanDistance(0, 0, 3, 4)).toBe(7);
  });

  it('is symmetric', () => {
    expect(manhattanDistance(1, 2, 4, 6)).toBe(manhattanDistance(4, 6, 1, 2));
  });
});

describe('vec2 operations', () => {
  it('vec2 creates a vector', () => {
    const v = vec2(3, 4);
    expect(v).toEqual({ x: 3, y: 4 });
  });

  it('vec2Add adds two vectors', () => {
    expect(vec2Add(vec2(1, 2), vec2(3, 4))).toEqual({ x: 4, y: 6 });
  });

  it('vec2Sub subtracts two vectors', () => {
    expect(vec2Sub(vec2(5, 7), vec2(2, 3))).toEqual({ x: 3, y: 4 });
  });

  it('vec2Scale scales a vector', () => {
    expect(vec2Scale(vec2(3, 4), 2)).toEqual({ x: 6, y: 8 });
  });

  it('vec2Length returns correct length', () => {
    expect(vec2Length(vec2(3, 4))).toBe(5);
  });

  it('vec2Length of zero vector is 0', () => {
    expect(vec2Length(vec2(0, 0))).toBe(0);
  });

  it('vec2Normalize produces unit vector', () => {
    const n = vec2Normalize(vec2(3, 4));
    expect(n.x).toBeCloseTo(0.6);
    expect(n.y).toBeCloseTo(0.8);
  });

  it('vec2Normalize of zero vector returns zero', () => {
    expect(vec2Normalize(vec2(0, 0))).toEqual({ x: 0, y: 0 });
  });
});

describe('hashCoord', () => {
  it('is deterministic', () => {
    expect(hashCoord(10, 20)).toBe(hashCoord(10, 20));
  });

  it('produces different values for different coords', () => {
    expect(hashCoord(0, 0)).not.toBe(hashCoord(1, 0));
    expect(hashCoord(0, 0)).not.toBe(hashCoord(0, 1));
  });

  it('returns unsigned 32-bit integer', () => {
    const h = hashCoord(123, 456);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xFFFFFFFF);
  });
});
