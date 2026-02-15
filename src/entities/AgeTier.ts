/**
 * Age tier system for NPCs in the pixel world simulator.
 *
 * NPCs progress through life stages as they age, affecting their
 * movement speed, skill gain rate, and need decay rate. Each tier
 * applies a set of modifiers that shape gameplay behaviour.
 *
 * Age thresholds (in ticks):
 * - <500    child        (slow, fast learner, high metabolism)
 * - 500–1499  young_adult  (fastest movement, good learner)
 * - 1500–3999 adult        (baseline)
 * - 4000–6999 middle_aged  (slightly slower, reduced learning)
 * - >=7000   elder        (slowest, low learning, low metabolism)
 */

/** All possible age tiers, from youngest to oldest. */
export type AgeTierType = 'child' | 'young_adult' | 'adult' | 'middle_aged' | 'elder';

/** Describes an age tier and its gameplay modifiers. */
export interface AgeTierInfo {
  tier: AgeTierType;
  label: string;
  icon: string;
  /** Multiplier applied to base movement speed. */
  moveSpeedModifier: number;
  /** Multiplier applied to skill experience gain. */
  skillGainModifier: number;
  /** Multiplier applied to need decay rate. */
  needDecayModifier: number;
}

/** Static definitions for every age tier. */
export const AGE_TIER_DEFINITIONS: Record<AgeTierType, AgeTierInfo> = {
  child: {
    tier: 'child',
    label: 'Child',
    icon: '👶',
    moveSpeedModifier: 0.8,
    skillGainModifier: 1.5,
    needDecayModifier: 1.3,
  },
  young_adult: {
    tier: 'young_adult',
    label: 'Young Adult',
    icon: '🧑',
    moveSpeedModifier: 1.1,
    skillGainModifier: 1.2,
    needDecayModifier: 1.0,
  },
  adult: {
    tier: 'adult',
    label: 'Adult',
    icon: '🧔',
    moveSpeedModifier: 1.0,
    skillGainModifier: 1.0,
    needDecayModifier: 1.0,
  },
  middle_aged: {
    tier: 'middle_aged',
    label: 'Middle Aged',
    icon: '👤',
    moveSpeedModifier: 0.95,
    skillGainModifier: 0.8,
    needDecayModifier: 0.9,
  },
  elder: {
    tier: 'elder',
    label: 'Elder',
    icon: '🧓',
    moveSpeedModifier: 0.75,
    skillGainModifier: 0.5,
    needDecayModifier: 0.8,
  },
};

/**
 * Determine which age tier an NPC belongs to based on its age in ticks.
 */
export function getAgeTier(age: number): AgeTierType {
  if (age < 500) return 'child';
  if (age < 1500) return 'young_adult';
  if (age < 4000) return 'adult';
  if (age < 7000) return 'middle_aged';
  return 'elder';
}

/**
 * Return the full {@link AgeTierInfo} for a given age.
 */
export function getAgeTierInfo(age: number): AgeTierInfo {
  return AGE_TIER_DEFINITIONS[getAgeTier(age)];
}

/**
 * Return the human-readable label for the age tier at a given age.
 */
export function getAgeLabel(age: number): string {
  return getAgeTierInfo(age).label;
}

/**
 * Return the movement speed modifier for a given age.
 */
export function getMoveSpeedModifier(age: number): number {
  return getAgeTierInfo(age).moveSpeedModifier;
}

/**
 * Return the skill gain modifier for a given age.
 */
export function getSkillGainModifier(age: number): number {
  return getAgeTierInfo(age).skillGainModifier;
}

/**
 * Return the need decay modifier for a given age.
 */
export function getNeedDecayModifier(age: number): number {
  return getAgeTierInfo(age).needDecayModifier;
}
