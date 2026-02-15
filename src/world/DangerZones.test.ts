import { describe, it, expect } from 'vitest';
import { getDangerLevel, getDangerPenalty, isDangerous } from './DangerZones';

const MAP_W = 100;
const MAP_H = 100;

describe('DangerZones', () => {
  describe('getDangerLevel', () => {
    it('center of map is safe', () => {
      const info = getDangerLevel(50, 50, MAP_W, MAP_H, 'grass');
      expect(info.level).toBe('safe');
      expect(info.safetyPenalty).toBe(0);
    });

    it('edge tiles are moderate', () => {
      // Left edge
      const left = getDangerLevel(2, 50, MAP_W, MAP_H, 'grass');
      expect(left.level).toBe('moderate');

      // Right edge
      const right = getDangerLevel(98, 50, MAP_W, MAP_H, 'grass');
      expect(right.level).toBe('moderate');

      // Top edge
      const top = getDangerLevel(50, 2, MAP_W, MAP_H, 'grass');
      expect(top.level).toBe('moderate');

      // Bottom edge
      const bottom = getDangerLevel(50, 98, MAP_W, MAP_H, 'grass');
      expect(bottom.level).toBe('moderate');
    });

    it('corner tiles are dangerous', () => {
      const topLeft = getDangerLevel(1, 1, MAP_W, MAP_H, 'grass');
      expect(topLeft.level).toBe('dangerous');

      const bottomRight = getDangerLevel(99, 99, MAP_W, MAP_H, 'grass');
      expect(bottomRight.level).toBe('dangerous');
    });

    it('cave walls are mild danger', () => {
      const info = getDangerLevel(50, 50, MAP_W, MAP_H, 'cave_wall');
      expect(info.level).toBe('mild');
      expect(info.safetyPenalty).toBe(0.005);
    });

    it('corners take priority over cave walls', () => {
      const info = getDangerLevel(1, 1, MAP_W, MAP_H, 'cave_wall');
      expect(info.level).toBe('dangerous');
    });

    it('edges take priority over cave walls', () => {
      const info = getDangerLevel(2, 50, MAP_W, MAP_H, 'cave_wall');
      expect(info.level).toBe('moderate');
    });
  });

  describe('getDangerPenalty', () => {
    it('returns 0 for safe areas', () => {
      expect(getDangerPenalty(50, 50, MAP_W, MAP_H, 'grass')).toBe(0);
    });

    it('returns 0.005 for mild areas', () => {
      expect(getDangerPenalty(50, 50, MAP_W, MAP_H, 'cave_wall')).toBe(0.005);
    });

    it('returns 0.015 for moderate areas', () => {
      expect(getDangerPenalty(2, 50, MAP_W, MAP_H, 'grass')).toBe(0.015);
    });

    it('returns 0.03 for dangerous areas', () => {
      expect(getDangerPenalty(1, 1, MAP_W, MAP_H, 'grass')).toBe(0.03);
    });
  });

  describe('isDangerous', () => {
    it('returns false for safe areas', () => {
      expect(isDangerous(50, 50, MAP_W, MAP_H, 'grass')).toBe(false);
    });

    it('returns false for mild areas', () => {
      expect(isDangerous(50, 50, MAP_W, MAP_H, 'cave_wall')).toBe(false);
    });

    it('returns true for moderate areas', () => {
      expect(isDangerous(2, 50, MAP_W, MAP_H, 'grass')).toBe(true);
    });

    it('returns true for dangerous areas', () => {
      expect(isDangerous(1, 1, MAP_W, MAP_H, 'grass')).toBe(true);
    });
  });
});
