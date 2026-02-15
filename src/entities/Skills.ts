/**
 * Skill system that tracks NPC proficiency in various activities.
 *
 * Skills improve with practice (each action execution grants XP) and
 * provide efficiency bonuses — faster foraging, better rest recovery,
 * more effective socializing, etc.
 *
 * Each skill level is 0-1 where:
 * - 0.0 = novice (no bonus)
 * - 0.5 = experienced (moderate bonus)
 * - 1.0 = master (maximum bonus)
 *
 * XP gain is logarithmic — early levels come quickly, mastery takes time.
 */

export type SkillType = 'foraging' | 'building' | 'crafting' | 'socializing' | 'exploring';

export interface Skills {
  foraging: number;
  building: number;
  crafting: number;
  socializing: number;
  exploring: number;
}

export function createDefaultSkills(): Skills {
  return {
    foraging: 0,
    building: 0,
    crafting: 0,
    socializing: 0,
    exploring: 0,
  };
}

/**
 * Base XP gained per action execution. Actual gain is scaled by
 * diminishing returns as the skill increases.
 */
const BASE_XP_PER_ACTION = 0.02;

/**
 * Grant XP to a skill. Uses diminishing returns so that higher levels
 * take progressively more practice to reach.
 *
 * Formula: gain = baseXP * (1 - currentLevel)^2
 * At level 0.0 → full gain
 * At level 0.5 → 25% of base gain
 * At level 0.9 → 1% of base gain
 */
export function grantSkillXP(skills: Skills, skill: SkillType, baseXP: number = BASE_XP_PER_ACTION): void {
  const current = skills[skill];
  const diminished = baseXP * (1 - current) * (1 - current);
  skills[skill] = Math.min(1, current + diminished);
}

/**
 * Get the efficiency multiplier for a skill level.
 * Returns 1.0 (no bonus) at level 0, up to 1.5 (50% bonus) at level 1.
 */
export function getSkillBonus(skills: Skills, skill: SkillType): number {
  return 1.0 + skills[skill] * 0.5;
}

/**
 * Get a human-readable proficiency label for a skill level.
 */
export function getSkillLabel(level: number): string {
  if (level >= 0.8) return 'Master';
  if (level >= 0.6) return 'Expert';
  if (level >= 0.4) return 'Skilled';
  if (level >= 0.2) return 'Apprentice';
  return 'Novice';
}

/**
 * Get the highest skill and its label.
 */
export function getBestSkill(skills: Skills): { skill: SkillType; label: string } {
  const entries: { skill: SkillType; label: string }[] = [
    { skill: 'foraging', label: 'Forager' },
    { skill: 'building', label: 'Builder' },
    { skill: 'crafting', label: 'Crafter' },
    { skill: 'socializing', label: 'Diplomat' },
    { skill: 'exploring', label: 'Explorer' },
  ];

  let best = entries[0];
  for (let i = 1; i < entries.length; i++) {
    if (skills[entries[i].skill] > skills[best.skill]) {
      best = entries[i];
    }
  }
  return best;
}
