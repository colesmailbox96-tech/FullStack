/**
 * Comfort system for NPCs in the pixel world simulator.
 *
 * NPCs near campfires, in groups, or sheltered from harsh weather
 * receive comfort bonuses that reduce need decay rates. Comfort is
 * scored 0-100 and mapped to a named level, each with its own
 * need-decay modifier.
 *
 * Score breakdown:
 * - <=20  freezing  (×1.50 drain)
 * - <=35  cold      (×1.25 drain)
 * - <=45  cool      (×1.10 drain)
 * - <=60  comfortable (×1.00 drain)
 * - <=80  cozy      (×0.85 drain)
 * - >80   warm      (×0.70 drain)
 */

/** All possible comfort levels, from worst to best. */
export type ComfortLevel = 'freezing' | 'cold' | 'cool' | 'comfortable' | 'cozy' | 'warm';

/** Describes a comfort state and its effect on need decay. */
export interface ComfortInfo {
  level: ComfortLevel;
  needDecayModifier: number;
  description: string;
}

/** Parameters used to evaluate an NPC's current comfort. */
export interface ComfortParams {
  nearCampfire: boolean;
  nearbyNPCCount: number;
  isInShelter: boolean;
  weather: string;
  isNight: boolean;
  season: string;
}

/** Static definitions for every comfort level. */
export const COMFORT_LEVELS: Record<ComfortLevel, ComfortInfo> = {
  freezing: { level: 'freezing', needDecayModifier: 1.5, description: 'Freezing — needs drain rapidly' },
  cold: { level: 'cold', needDecayModifier: 1.25, description: 'Cold — needs drain faster' },
  cool: { level: 'cool', needDecayModifier: 1.1, description: 'Cool — slightly increased drain' },
  comfortable: { level: 'comfortable', needDecayModifier: 1.0, description: 'Comfortable — normal' },
  cozy: { level: 'cozy', needDecayModifier: 0.85, description: 'Cozy — needs drain slower' },
  warm: { level: 'warm', needDecayModifier: 0.7, description: 'Warm — needs drain slowly' },
};

/**
 * Map a raw comfort score (0-100) to a named comfort level.
 */
function scoreToLevel(score: number): ComfortLevel {
  if (score <= 20) return 'freezing';
  if (score <= 35) return 'cold';
  if (score <= 45) return 'cool';
  if (score <= 60) return 'comfortable';
  if (score <= 80) return 'cozy';
  return 'warm';
}

/**
 * Calculate the comfort level for an NPC based on environment and
 * social context.
 *
 * Starts with a base score of 50 and applies additive modifiers for
 * campfire proximity, nearby NPCs, shelter, weather, time of day,
 * and season. The final score is clamped to 0-100 and mapped to a
 * {@link ComfortLevel}.
 */
export function calculateComfort(params: ComfortParams): ComfortInfo {
  let score = 50;

  // Warmth sources
  if (params.nearCampfire) score += 25;

  // Social warmth
  if (params.nearbyNPCCount >= 3) score += 15;
  else if (params.nearbyNPCCount >= 1) score += 8;

  // Shelter
  if (params.isInShelter) score += 10;

  // Weather penalties
  switch (params.weather) {
    case 'storm': score -= 30; break;
    case 'rain':  score -= 15; break;
    case 'snow':  score -= 20; break;
    case 'fog':   score -= 5;  break;
  }

  // Time of day
  if (params.isNight) score -= 10;

  // Season
  switch (params.season) {
    case 'winter': score -= 15; break;
    case 'autumn': score -= 5;  break;
    case 'spring': score += 5;  break;
    case 'summer': score += 10; break;
  }

  const level = scoreToLevel(score);
  return { ...COMFORT_LEVELS[level] };
}

/**
 * Convenience helper that returns only the need-decay modifier for
 * the given environmental conditions.
 */
export function getComfortModifier(params: ComfortParams): number {
  return calculateComfort(params).needDecayModifier;
}
