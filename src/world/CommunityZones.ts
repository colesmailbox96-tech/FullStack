import { distance } from '../utils/Math';

export interface CommunityZone {
  centerX: number;
  centerY: number;
  radius: number;
  memberCount: number;
}

export interface CommunityBenefit {
  safetyBonus: number;
  socialBonus: number;
  hungerDrainReduction: number;
}

/**
 * Finds community zones around campfires that have at least one nearby NPC.
 * Each campfire creates a circular zone; NPCs within the radius are counted as members.
 */
export function findCommunityZones(
  campfirePositions: Array<{ x: number; y: number }>,
  npcPositions: Array<{ x: number; y: number }>,
  radius: number = 8,
): CommunityZone[] {
  const zones: CommunityZone[] = [];

  for (const campfire of campfirePositions) {
    let memberCount = 0;
    for (const npc of npcPositions) {
      if (distance(campfire.x, campfire.y, npc.x, npc.y) <= radius) {
        memberCount++;
      }
    }
    if (memberCount > 0) {
      zones.push({
        centerX: campfire.x,
        centerY: campfire.y,
        radius,
        memberCount,
      });
    }
  }

  return zones;
}

/** Returns true if the given position falls within any community zone. */
export function isInCommunityZone(x: number, y: number, zones: CommunityZone[]): boolean {
  for (const zone of zones) {
    if (distance(x, y, zone.centerX, zone.centerY) <= zone.radius) {
      return true;
    }
  }
  return false;
}

/**
 * Calculates community benefits based on the number of members.
 * Bonuses scale linearly with member count but are capped at maximum values.
 */
export function getCommunityBenefits(memberCount: number): CommunityBenefit {
  return {
    safetyBonus: Math.min(memberCount * 0.01, 0.05),
    socialBonus: Math.min(memberCount * 0.005, 0.03),
    hungerDrainReduction: Math.min(memberCount * 0.02, 0.15),
  };
}

/**
 * Returns the community zone with the most members that contains the given position,
 * or null if the position is not in any zone.
 */
export function getBestCommunityZone(
  x: number,
  y: number,
  zones: CommunityZone[],
): CommunityZone | null {
  let best: CommunityZone | null = null;

  for (const zone of zones) {
    if (distance(x, y, zone.centerX, zone.centerY) <= zone.radius) {
      if (best === null || zone.memberCount > best.memberCount) {
        best = zone;
      }
    }
  }

  return best;
}
