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
  socialRange: number;
  socialRecovery: number;
  curiosityStaleRadius: number;
  curiosityStaleTicks: number;
  stormFrequency: number;
  seasonalCycleDays: number;
  winterFoodReduction: number;
  starvationTicks: number;
  socialBondThreshold: number;
  socialBondTicks: number;
  memoryCapacity: number;
  memoryDecayRate: number;
}

export const GAMEPLAY_CONFIG: WorldConfig = {
  worldSize: 128,
  initialNPCCount: 25,
  minPopulation: 15,
  hungerDrain: 0.003,
  energyDrain: 0.004,
  socialDrain: 0.002,
  curiosityDrain: 0.002,
  safetyRecovery: 0.01,
  foodRespawnTicks: 250,
  foodPerBush: 6,
  bushDensity: 0.03,
  treeDensity: 0.08,
  nightEnergyMultiplier: 1.3,
  stormEnergyMultiplier: 1.5,
  stormSafetyPenalty: 0.05,
  socialRange: 5,
  socialRecovery: 0.01,
  curiosityStaleRadius: 10,
  curiosityStaleTicks: 500,
  stormFrequency: 0.04,
  seasonalCycleDays: 20,
  winterFoodReduction: 0.4,
  starvationTicks: 200,
  socialBondThreshold: 0.8,
  socialBondTicks: 500,
  memoryCapacity: 50,
  memoryDecayRate: 0.001,
};

export const TRAINING_CONFIG: WorldConfig = {
  ...GAMEPLAY_CONFIG,
  hungerDrain: 0.006,
  energyDrain: 0.008,
  socialDrain: 0.004,
  curiosityDrain: 0.004,
  safetyRecovery: 0.005,
  foodRespawnTicks: 500,
  foodPerBush: 3,
  bushDensity: 0.02,
  nightEnergyMultiplier: 1.8,
  stormEnergyMultiplier: 2.0,
  stormSafetyPenalty: 0.15,
  stormFrequency: 0.12,
  seasonalCycleDays: 10,
  winterFoodReduction: 0.8,
  starvationTicks: 150,
};
