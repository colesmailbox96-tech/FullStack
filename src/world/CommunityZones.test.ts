import { describe, it, expect } from 'vitest';
import {
  findCommunityZones,
  isInCommunityZone,
  getCommunityBenefits,
  getBestCommunityZone,
} from './CommunityZones';

describe('CommunityZones', () => {
  describe('findCommunityZones', () => {
    it('finds zones with NPCs nearby', () => {
      const campfires = [{ x: 10, y: 10 }];
      const npcs = [{ x: 12, y: 10 }, { x: 10, y: 13 }];
      const zones = findCommunityZones(campfires, npcs, 8);

      expect(zones).toHaveLength(1);
      expect(zones[0].centerX).toBe(10);
      expect(zones[0].centerY).toBe(10);
      expect(zones[0].memberCount).toBe(2);
      expect(zones[0].radius).toBe(8);
    });

    it('excludes campfires with no nearby NPCs', () => {
      const campfires = [{ x: 10, y: 10 }];
      const npcs = [{ x: 50, y: 50 }];
      const zones = findCommunityZones(campfires, npcs, 8);

      expect(zones).toHaveLength(0);
    });

    it('returns empty array when there are no campfires', () => {
      const zones = findCommunityZones([], [{ x: 5, y: 5 }], 8);
      expect(zones).toHaveLength(0);
    });

    it('uses default radius of 8', () => {
      const campfires = [{ x: 10, y: 10 }];
      const npcs = [{ x: 17, y: 10 }];
      const zones = findCommunityZones(campfires, npcs);

      expect(zones).toHaveLength(1);
      expect(zones[0].radius).toBe(8);
    });

    it('handles multiple campfires independently', () => {
      const campfires = [{ x: 10, y: 10 }, { x: 50, y: 50 }];
      const npcs = [{ x: 12, y: 10 }, { x: 51, y: 50 }, { x: 52, y: 50 }];
      const zones = findCommunityZones(campfires, npcs, 8);

      expect(zones).toHaveLength(2);
      expect(zones[0].memberCount).toBe(1);
      expect(zones[1].memberCount).toBe(2);
    });
  });

  describe('isInCommunityZone', () => {
    const zones = [
      { centerX: 10, centerY: 10, radius: 8, memberCount: 3 },
      { centerX: 50, centerY: 50, radius: 8, memberCount: 2 },
    ];

    it('returns true for positions inside a zone', () => {
      expect(isInCommunityZone(10, 10, zones)).toBe(true);
      expect(isInCommunityZone(14, 10, zones)).toBe(true);
      expect(isInCommunityZone(50, 55, zones)).toBe(true);
    });

    it('returns false for positions outside all zones', () => {
      expect(isInCommunityZone(30, 30, zones)).toBe(false);
      expect(isInCommunityZone(90, 90, zones)).toBe(false);
    });

    it('returns false when there are no zones', () => {
      expect(isInCommunityZone(10, 10, [])).toBe(false);
    });
  });

  describe('getCommunityBenefits', () => {
    it('scales bonuses with member count', () => {
      const benefits = getCommunityBenefits(2);
      expect(benefits.safetyBonus).toBeCloseTo(0.02);
      expect(benefits.socialBonus).toBeCloseTo(0.01);
      expect(benefits.hungerDrainReduction).toBeCloseTo(0.04);
    });

    it('caps safetyBonus at 0.05', () => {
      const benefits = getCommunityBenefits(10);
      expect(benefits.safetyBonus).toBe(0.05);
    });

    it('caps socialBonus at 0.03', () => {
      const benefits = getCommunityBenefits(10);
      expect(benefits.socialBonus).toBe(0.03);
    });

    it('caps hungerDrainReduction at 0.15', () => {
      const benefits = getCommunityBenefits(10);
      expect(benefits.hungerDrainReduction).toBe(0.15);
    });

    it('returns zero bonuses for zero members', () => {
      const benefits = getCommunityBenefits(0);
      expect(benefits.safetyBonus).toBe(0);
      expect(benefits.socialBonus).toBe(0);
      expect(benefits.hungerDrainReduction).toBe(0);
    });
  });

  describe('getBestCommunityZone', () => {
    it('returns the zone with the most members', () => {
      const zones = [
        { centerX: 10, centerY: 10, radius: 8, memberCount: 2 },
        { centerX: 12, centerY: 10, radius: 8, memberCount: 5 },
      ];
      const best = getBestCommunityZone(11, 10, zones);

      expect(best).not.toBeNull();
      expect(best!.memberCount).toBe(5);
    });

    it('returns null when not in any zone', () => {
      const zones = [{ centerX: 10, centerY: 10, radius: 8, memberCount: 3 }];
      expect(getBestCommunityZone(90, 90, zones)).toBeNull();
    });

    it('returns null for empty zones array', () => {
      expect(getBestCommunityZone(10, 10, [])).toBeNull();
    });

    it('ignores zones the position is not inside', () => {
      const zones = [
        { centerX: 10, centerY: 10, radius: 8, memberCount: 10 },
        { centerX: 50, centerY: 50, radius: 8, memberCount: 2 },
      ];
      const best = getBestCommunityZone(50, 50, zones);

      expect(best).not.toBeNull();
      expect(best!.memberCount).toBe(2);
    });
  });
});
