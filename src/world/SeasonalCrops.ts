export interface CropYieldInfo {
  season: string;
  growthRateModifier: number;
  yieldModifier: number;
  qualityBoost: number;
  description: string;
}

const SEASONAL_CROP_DATA: Record<string, CropYieldInfo> = {
  spring: {
    season: 'spring',
    growthRateModifier: 0.7,
    yieldModifier: 1.1,
    qualityBoost: 0.05,
    description: 'Spring rains nurture new growth',
  },
  summer: {
    season: 'summer',
    growthRateModifier: 0.6,
    yieldModifier: 1.2,
    qualityBoost: 0.1,
    description: 'Peak growing season',
  },
  autumn: {
    season: 'autumn',
    growthRateModifier: 0.9,
    yieldModifier: 1.4,
    qualityBoost: 0.15,
    description: 'Abundant harvest time',
  },
  winter: {
    season: 'winter',
    growthRateModifier: 1.5,
    yieldModifier: 0.5,
    qualityBoost: 0.0,
    description: 'Harsh conditions limit growth',
  },
};

/** Returns the crop yield info for the given season, defaulting to spring for unknown seasons. */
export function getSeasonalYield(season: string): CropYieldInfo {
  return SEASONAL_CROP_DATA[season] ?? SEASONAL_CROP_DATA.spring;
}

/** Returns the adjusted food per bush after applying the seasonal yield modifier. */
export function calculateAdjustedFoodPerBush(baseFoodPerBush: number, season: string): number {
  const { yieldModifier } = getSeasonalYield(season);
  return Math.max(1, Math.floor(baseFoodPerBush * yieldModifier));
}

/** Returns the adjusted respawn time after applying the seasonal growth rate modifier. */
export function calculateAdjustedRespawnTime(baseRespawnTicks: number, season: string): number {
  const { growthRateModifier } = getSeasonalYield(season);
  return Math.floor(baseRespawnTicks * growthRateModifier);
}

/** Returns the seasonal description for the given season. */
export function getSeasonalDescription(season: string): string {
  return getSeasonalYield(season).description;
}

/** Returns true if the season is good for foraging (yield modifier above 1.0). */
export function isGoodForagingSeason(season: string): boolean {
  return getSeasonalYield(season).yieldModifier > 1.0;
}
