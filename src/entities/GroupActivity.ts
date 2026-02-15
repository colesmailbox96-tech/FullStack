/**
 * Group activity system for NPCs with high social bonds.
 *
 * NPCs can perform activities together for efficiency bonuses:
 * - Bonus scales with participant count (diminishing returns)
 * - Higher affinity between participants yields greater efficiency
 * - Multiplier is capped at 2.0 to prevent runaway scaling
 */

export type GroupActivityType = 'group_forage' | 'group_gather' | 'group_explore' | 'group_rest';

export interface GroupBonus {
  activityType: GroupActivityType;
  efficiencyMultiplier: number;
  participantCount: number;
}

/**
 * Calculate the efficiency bonus for a group activity.
 *
 * - Base multiplier is 1.0 (solo, no bonus)
 * - Each additional participant adds a diminishing bonus:
 *   2nd: +0.15, 3rd: +0.15, 4th: +0.10, 5th+: +0.05 each
 * - Affinity scales the result: multiply by (1 + avgAffinity * 0.2)
 * - Final multiplier is capped at 2.0
 */
export function calculateGroupBonus(
  activityType: GroupActivityType,
  participantCount: number,
  avgAffinity: number,
): GroupBonus {
  if (participantCount < 1) {
    participantCount = 1;
  }

  let multiplier = 1.0;

  if (participantCount > 1) {
    const additionalParticipants = participantCount - 1;
    for (let i = 0; i < additionalParticipants; i++) {
      if (i < 2) {
        multiplier += 0.15;
      } else if (i < 3) {
        multiplier += 0.10;
      } else {
        multiplier += 0.05;
      }
    }

    multiplier *= 1 + avgAffinity * 0.2;
  }

  multiplier = Math.min(multiplier, 2.0);
  multiplier = Math.round(multiplier * 100) / 100;

  return {
    activityType,
    efficiencyMultiplier: multiplier,
    participantCount,
  };
}

/**
 * Determine whether an NPC can initiate a group activity.
 *
 * - Initiator must have social need > 0.3
 * - At least one participant must have affinity >= 0.3
 */
export function canFormGroup(initiatorSocial: number, participantAffinities: number[]): boolean {
  if (initiatorSocial <= 0.3) return false;
  return participantAffinities.some(a => a >= 0.3);
}

/**
 * Map an individual action type to its group activity equivalent.
 *
 * Returns null if the action has no group variant.
 */
export function getGroupActivityForAction(actionType: string): GroupActivityType | null {
  switch (actionType) {
    case 'FORAGE':
      return 'group_forage';
    case 'GATHER':
      return 'group_gather';
    case 'EXPLORE':
      return 'group_explore';
    case 'REST':
      return 'group_rest';
    default:
      return null;
  }
}
