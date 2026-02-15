import { describe, it, expect } from 'vitest';
import { rgba, lerpColor, adjustBrightness, colorToString } from './Color';

describe('rgba', () => {
  it('formats with default alpha', () => {
    expect(rgba(255, 128, 0)).toBe('rgba(255,128,0,1)');
  });

  it('formats with explicit alpha', () => {
    expect(rgba(100, 200, 50, 0.5)).toBe('rgba(100,200,50,0.5)');
  });

  it('rounds non-integer channels', () => {
    expect(rgba(100.7, 200.2, 50.9)).toBe('rgba(101,200,51,1)');
  });
});

describe('lerpColor', () => {
  it('returns c1 at t=0', () => {
    expect(lerpColor([0, 0, 0], [255, 255, 255], 0)).toEqual([0, 0, 0]);
  });

  it('returns c2 at t=1', () => {
    expect(lerpColor([0, 0, 0], [255, 255, 255], 1)).toEqual([255, 255, 255]);
  });

  it('returns midpoint at t=0.5', () => {
    const result = lerpColor([0, 0, 0], [200, 100, 50], 0.5);
    expect(result[0]).toBeCloseTo(100);
    expect(result[1]).toBeCloseTo(50);
    expect(result[2]).toBeCloseTo(25);
  });
});

describe('adjustBrightness', () => {
  it('doubles brightness at factor=2', () => {
    const result = adjustBrightness([100, 50, 25], 2);
    expect(result).toEqual([200, 100, 50]);
  });

  it('halves brightness at factor=0.5', () => {
    const result = adjustBrightness([100, 50, 20], 0.5);
    expect(result).toEqual([50, 25, 10]);
  });

  it('clamps to 255', () => {
    const result = adjustBrightness([200, 200, 200], 2);
    expect(result).toEqual([255, 255, 255]);
  });

  it('clamps to 0', () => {
    const result = adjustBrightness([100, 50, 25], -1);
    expect(result).toEqual([0, 0, 0]);
  });
});

describe('colorToString', () => {
  it('converts color tuple to rgba string', () => {
    expect(colorToString([255, 128, 0])).toBe('rgba(255,128,0,1)');
  });

  it('includes alpha parameter', () => {
    expect(colorToString([255, 128, 0], 0.5)).toBe('rgba(255,128,0,0.5)');
  });
});
