import { describe, it, expect } from 'vitest';
import {
  getSeasonalYield,
  calculateAdjustedFoodPerBush,
  calculateAdjustedRespawnTime,
  getSeasonalDescription,
  isGoodForagingSeason,
} from './SeasonalCrops';

describe('SeasonalCrops', () => {
  describe('getSeasonalYield', () => {
    it('returns correct data for spring', () => {
      const info = getSeasonalYield('spring');
      expect(info.season).toBe('spring');
      expect(info.growthRateModifier).toBe(0.7);
      expect(info.yieldModifier).toBe(1.1);
      expect(info.qualityBoost).toBe(0.05);
    });

    it('returns correct data for summer', () => {
      const info = getSeasonalYield('summer');
      expect(info.season).toBe('summer');
      expect(info.growthRateModifier).toBe(0.6);
      expect(info.yieldModifier).toBe(1.2);
      expect(info.qualityBoost).toBe(0.1);
    });

    it('returns correct data for autumn', () => {
      const info = getSeasonalYield('autumn');
      expect(info.season).toBe('autumn');
      expect(info.growthRateModifier).toBe(0.9);
      expect(info.yieldModifier).toBe(1.4);
      expect(info.qualityBoost).toBe(0.15);
    });

    it('returns correct data for winter', () => {
      const info = getSeasonalYield('winter');
      expect(info.season).toBe('winter');
      expect(info.growthRateModifier).toBe(1.5);
      expect(info.yieldModifier).toBe(0.5);
      expect(info.qualityBoost).toBe(0.0);
    });

    it('summer has the best growth rate', () => {
      const summer = getSeasonalYield('summer');
      const spring = getSeasonalYield('spring');
      const autumn = getSeasonalYield('autumn');
      const winter = getSeasonalYield('winter');
      expect(summer.growthRateModifier).toBeLessThan(spring.growthRateModifier);
      expect(summer.growthRateModifier).toBeLessThan(autumn.growthRateModifier);
      expect(summer.growthRateModifier).toBeLessThan(winter.growthRateModifier);
    });

    it('winter has the worst growth rate', () => {
      const winter = getSeasonalYield('winter');
      const spring = getSeasonalYield('spring');
      const summer = getSeasonalYield('summer');
      const autumn = getSeasonalYield('autumn');
      expect(winter.growthRateModifier).toBeGreaterThan(spring.growthRateModifier);
      expect(winter.growthRateModifier).toBeGreaterThan(summer.growthRateModifier);
      expect(winter.growthRateModifier).toBeGreaterThan(autumn.growthRateModifier);
    });

    it('autumn has the highest yield modifier', () => {
      const autumn = getSeasonalYield('autumn');
      const spring = getSeasonalYield('spring');
      const summer = getSeasonalYield('summer');
      const winter = getSeasonalYield('winter');
      expect(autumn.yieldModifier).toBeGreaterThan(spring.yieldModifier);
      expect(autumn.yieldModifier).toBeGreaterThan(summer.yieldModifier);
      expect(autumn.yieldModifier).toBeGreaterThan(winter.yieldModifier);
    });

    it('defaults to spring for unknown seasons', () => {
      const info = getSeasonalYield('monsoon');
      expect(info.season).toBe('spring');
      expect(info.growthRateModifier).toBe(0.7);
    });
  });

  describe('calculateAdjustedFoodPerBush', () => {
    it('applies yield modifier correctly', () => {
      expect(calculateAdjustedFoodPerBush(10, 'autumn')).toBe(14);
      expect(calculateAdjustedFoodPerBush(10, 'summer')).toBe(12);
      expect(calculateAdjustedFoodPerBush(10, 'spring')).toBe(11);
      expect(calculateAdjustedFoodPerBush(10, 'winter')).toBe(5);
    });

    it('returns at least 1', () => {
      expect(calculateAdjustedFoodPerBush(1, 'winter')).toBe(1);
      expect(calculateAdjustedFoodPerBush(0, 'summer')).toBe(1);
    });

    it('floors the result', () => {
      // 3 * 1.1 = 3.3 -> 3
      expect(calculateAdjustedFoodPerBush(3, 'spring')).toBe(3);
    });
  });

  describe('calculateAdjustedRespawnTime', () => {
    it('applies growth rate modifier correctly', () => {
      expect(calculateAdjustedRespawnTime(100, 'spring')).toBe(70);
      expect(calculateAdjustedRespawnTime(100, 'summer')).toBe(60);
      expect(calculateAdjustedRespawnTime(100, 'autumn')).toBe(90);
      expect(calculateAdjustedRespawnTime(100, 'winter')).toBe(150);
    });

    it('floors the result', () => {
      // 10 * 0.7 = 7
      expect(calculateAdjustedRespawnTime(10, 'spring')).toBe(7);
      // 15 * 0.9 = 13.5 -> 13
      expect(calculateAdjustedRespawnTime(15, 'autumn')).toBe(13);
    });
  });

  describe('getSeasonalDescription', () => {
    it('returns correct descriptions', () => {
      expect(getSeasonalDescription('spring')).toBe('Spring rains nurture new growth');
      expect(getSeasonalDescription('summer')).toBe('Peak growing season');
      expect(getSeasonalDescription('autumn')).toBe('Abundant harvest time');
      expect(getSeasonalDescription('winter')).toBe('Harsh conditions limit growth');
    });
  });

  describe('isGoodForagingSeason', () => {
    it('returns true for spring and summer', () => {
      expect(isGoodForagingSeason('spring')).toBe(true);
      expect(isGoodForagingSeason('summer')).toBe(true);
    });

    it('returns true for autumn', () => {
      expect(isGoodForagingSeason('autumn')).toBe(true);
    });

    it('returns false for winter', () => {
      expect(isGoodForagingSeason('winter')).toBe(false);
    });

    it('defaults gracefully for unknown seasons', () => {
      // Defaults to spring (yieldModifier 1.1 > 1.0)
      expect(isGoodForagingSeason('unknown')).toBe(true);
    });
  });
});
