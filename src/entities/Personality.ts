/**
 * Personality traits influence NPC behavior thresholds.
 *
 * Each trait is a 0-1 value that shifts when an NPC triggers certain actions:
 * - bravery: higher = less likely to seek shelter, lower safety thresholds
 * - sociability: higher = more eager to socialize, wider social range tolerance
 * - curiosity: higher = explores more proactively, lower curiosity thresholds
 * - industriousness: higher = forages more proactively, lower hunger thresholds
 */

export interface Personality {
  bravery: number;
  sociability: number;
  curiosity: number;
  industriousness: number;
  craftiness: number;
}

export type PersonalityTrait = keyof Personality;

/**
 * Generate a random personality using the provided random function.
 * Values are distributed between 0.2 and 0.8 to avoid extreme outliers.
 */
export function createRandomPersonality(rand: () => number): Personality {
  return {
    bravery: 0.2 + rand() * 0.6,
    sociability: 0.2 + rand() * 0.6,
    curiosity: 0.2 + rand() * 0.6,
    industriousness: 0.2 + rand() * 0.6,
    craftiness: 0.2 + rand() * 0.6,
  };
}

/**
 * Get a human-readable label for the dominant personality trait.
 */
export function getDominantTrait(personality: Personality): { trait: PersonalityTrait; label: string } {
  const traits: { trait: PersonalityTrait; label: string }[] = [
    { trait: 'bravery', label: 'Brave' },
    { trait: 'sociability', label: 'Social' },
    { trait: 'curiosity', label: 'Curious' },
    { trait: 'industriousness', label: 'Industrious' },
    { trait: 'craftiness', label: 'Crafty' },
  ];

  let best = traits[0];
  for (let i = 1; i < traits.length; i++) {
    if (personality[traits[i].trait] > personality[best.trait]) {
      best = traits[i];
    }
  }
  return best;
}

/**
 * Apply a personality modifier to a behavior threshold.
 * Higher trait value = lower threshold (more eager to act).
 *
 * Example: base threshold 0.30, trait 0.8 → 0.30 * (1 + (0.8 - 0.5) * 0.5) = 0.30 * 1.15 = 0.345
 * Example: base threshold 0.30, trait 0.2 → 0.30 * (1 + (0.2 - 0.5) * 0.5) = 0.30 * 0.85 = 0.255
 *
 * The modifier strength (0.5) keeps adjustments moderate (±15% at extremes).
 */
export function applyTraitModifier(baseThreshold: number, traitValue: number, strength: number = 0.5): number {
  return baseThreshold * (1 + (traitValue - 0.5) * strength);
}
