export interface WorldConfig {
  worldSize: number;
  initialNPCCount: number;
  minPopulation: number;
  hungerDrain: number;
  energyDrain: number;
  socialDrain: number;
  curiosityDrain: number;
  safetyRecovery: number;
  foodRespawnTicks: number;
  foodPerBush: number;
  bushDensity: number;
  treeDensity: number;
  nightEnergyMultiplier: number;
  stormEnergyMultiplier: number;
  stormSafetyPenalty: number;
  /** Safety drain per tick during rain (mild weather pressure) */
  rainSafetyPenalty: number;
  /** Safety drain per tick when outdoors at night */
  nightSafetyPenalty: number;
  /** Hunger drain multiplier during storms (cold/wet burns calories) */
  stormHungerMultiplier: number;
  socialRange: number;
  socialRecovery: number;
  curiosityStaleRadius: number;
  curiosityStaleTicks: number;
  /** Curiosity reward for discovering a new tile */
  curiosityNewTileReward: number;
  /** Curiosity reward for discovering a new resource location */
  curiosityNewResourceReward: number;
  /** Ticks in same area before boredom acceleration kicks in (2x drain) */
  boredomAccelTicks: number;
  /** Ticks in same area before severe boredom (3x drain) */
  boredomSevereTicks: number;
  stormFrequency: number;
  /** Minimum storm duration in ticks */
  minStormDuration: number;
  seasonalCycleDays: number;
  winterFoodReduction: number;
  starvationTicks: number;
  socialBondThreshold: number;
  socialBondTicks: number;
  memoryCapacity: number;
  memoryDecayRate: number;
  /** Social debuff threshold — below this, NPC gets movement/efficiency penalties */
  socialDebuffThreshold: number;
  /** Energy drain multiplier when socially isolated (below socialDebuffThreshold) */
  socialIsolationEnergyMultiplier: number;
  /** Number of ticks required to gather a resource from a world object */
  gatherTicks: number;
  /** Number of ticks required to craft an item */
  craftTicks: number;
  /** Minimum total inventory resources before NPC considers crafting */
  craftInventoryThreshold: number;
}

/**
 * GAMEPLAY_CONFIG: Balanced for interactive play (gentler values).
 *
 * Key tuning rationale (see TRAINING_CONFIG for harsh training values):
 * - energyDrain 0.004/tick while idle, ~0.006 while moving → REST triggers
 *   every few minutes of gameplay.
 * - stormSafetyPenalty 0.04/tick → NPC hits safety threshold in ~18 ticks of storm.
 * - bushDensity 0.025, foodPerBush 4 → food exists but requires effort.
 * - winterFoodReduction 0.6 → 60% less food regrowth in winter.
 * - curiosityDrain 0.003/tick in familiar areas → EXPLORE triggers regularly.
 * - socialDrain 0.003/tick when alone → SOCIALIZE triggers when isolated.
 */
export const GAMEPLAY_CONFIG: WorldConfig = {
  worldSize: 128,
  initialNPCCount: 25,
  minPopulation: 15,
  hungerDrain: 0.004,
  energyDrain: 0.005,
  socialDrain: 0.003,
  curiosityDrain: 0.003,
  safetyRecovery: 0.008,
  foodRespawnTicks: 400,
  foodPerBush: 4,
  bushDensity: 0.025,
  treeDensity: 0.08,
  nightEnergyMultiplier: 1.5,
  stormEnergyMultiplier: 1.8,
  stormSafetyPenalty: 0.04,
  rainSafetyPenalty: 0.01,
  nightSafetyPenalty: 0.02,
  stormHungerMultiplier: 1.3,
  socialRange: 5,
  socialRecovery: 0.012,
  curiosityStaleRadius: 10,
  curiosityStaleTicks: 200,
  curiosityNewTileReward: 0.15,
  curiosityNewResourceReward: 0.25,
  boredomAccelTicks: 500,
  boredomSevereTicks: 1000,
  stormFrequency: 0.08,
  minStormDuration: 150,
  seasonalCycleDays: 20,
  winterFoodReduction: 0.6,
  starvationTicks: 200,
  socialBondThreshold: 0.8,
  socialBondTicks: 500,
  memoryCapacity: 50,
  memoryDecayRate: 0.001,
  socialDebuffThreshold: 0.4,
  socialIsolationEnergyMultiplier: 1.3,
  gatherTicks: 20,
  craftTicks: 40,
  craftInventoryThreshold: 5,
};

/**
 * TRAINING_CONFIG: Harsh values to produce diverse training data.
 *
 * Key tuning rationale:
 * - energyDrain 0.006/tick idle, ~0.009 moving → NPC at 1.0 energy hits REST
 *   threshold (0.2) after ~133 ticks of movement.
 * - stormSafetyPenalty 0.04/tick → NPC hits safety 0.3 within ~18 ticks.
 * - Night+storm stacks: 0.06/tick total safety drain → urgent shelter.
 * - bushDensity 0.02, foodPerBush 3, respawn 500 ticks → food requires search.
 * - curiosityDrain 0.003/tick with boredom acceleration → EXPLORE triggers often.
 * - socialDrain 0.003/tick alone, debuffs below 0.4 → SOCIALIZE is strategic.
 * - Storm frequency 8%+ per transition, transitions every 200-400 ticks → storm
 *   roughly every 2500-5000 ticks.
 * - Winter food regrowth drops 70% → seasonal starvation pressure.
 *
 * Target distribution after all fixes:
 *   FORAGE: 25-35%, REST: 15-25%, SEEK_SHELTER: 10-20%,
 *   EXPLORE: 15-25%, SOCIALIZE: 10-15%
 */
export const TRAINING_CONFIG: WorldConfig = {
  ...GAMEPLAY_CONFIG,
  hungerDrain: 0.006,
  energyDrain: 0.006,
  socialDrain: 0.003,
  curiosityDrain: 0.003,
  safetyRecovery: 0.005,
  foodRespawnTicks: 500,
  foodPerBush: 3,
  bushDensity: 0.02,
  nightEnergyMultiplier: 1.5,
  stormEnergyMultiplier: 1.8,
  stormSafetyPenalty: 0.04,
  rainSafetyPenalty: 0.01,
  nightSafetyPenalty: 0.02,
  stormHungerMultiplier: 1.3,
  stormFrequency: 0.12,
  minStormDuration: 150,
  seasonalCycleDays: 10,
  winterFoodReduction: 0.7,
  starvationTicks: 150,
  socialDebuffThreshold: 0.4,
  socialIsolationEnergyMultiplier: 1.3,
};
