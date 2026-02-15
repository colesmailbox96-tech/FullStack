import { describe, it, expect } from 'vitest';
import { RelationshipSystem, getRelationshipLabel } from './Relationship';

describe('getRelationshipLabel', () => {
  it('returns stranger for low affinity', () => {
    expect(getRelationshipLabel(0)).toBe('stranger');
    expect(getRelationshipLabel(0.1)).toBe('stranger');
  });

  it('returns acquaintance for moderate affinity', () => {
    expect(getRelationshipLabel(0.15)).toBe('acquaintance');
    expect(getRelationshipLabel(0.3)).toBe('acquaintance');
  });

  it('returns friend for good affinity', () => {
    expect(getRelationshipLabel(0.4)).toBe('friend');
    expect(getRelationshipLabel(0.6)).toBe('friend');
  });

  it('returns close friend for high affinity', () => {
    expect(getRelationshipLabel(0.7)).toBe('close friend');
    expect(getRelationshipLabel(1.0)).toBe('close friend');
  });
});

describe('RelationshipSystem', () => {
  it('starts with no relationships', () => {
    const sys = new RelationshipSystem();
    expect(sys.getCount()).toBe(0);
    expect(sys.getRelationships()).toEqual([]);
  });

  describe('interact', () => {
    it('creates a new relationship on first interaction', () => {
      const sys = new RelationshipSystem();
      sys.interact('npc_2', 100);
      expect(sys.getCount()).toBe(1);
      const rel = sys.getRelationship('npc_2');
      expect(rel).not.toBeNull();
      expect(rel!.affinity).toBeCloseTo(0.05);
      expect(rel!.lastInteractionTick).toBe(100);
    });

    it('strengthens existing relationship', () => {
      const sys = new RelationshipSystem();
      sys.interact('npc_2', 100);
      sys.interact('npc_2', 200);
      const rel = sys.getRelationship('npc_2');
      expect(rel!.affinity).toBeCloseTo(0.10);
      expect(rel!.lastInteractionTick).toBe(200);
    });

    it('caps affinity at 1.0', () => {
      const sys = new RelationshipSystem();
      for (let i = 0; i < 30; i++) {
        sys.interact('npc_2', i * 10, 0.1);
      }
      const rel = sys.getRelationship('npc_2');
      expect(rel!.affinity).toBe(1);
    });

    it('accepts custom interaction amount', () => {
      const sys = new RelationshipSystem();
      sys.interact('npc_2', 100, 0.2);
      expect(sys.getRelationship('npc_2')!.affinity).toBeCloseTo(0.2);
    });
  });

  describe('capacity management', () => {
    it('removes weakest relationship when at capacity', () => {
      const sys = new RelationshipSystem(3);
      sys.interact('npc_1', 100, 0.3);
      sys.interact('npc_2', 100, 0.1); // weakest
      sys.interact('npc_3', 100, 0.5);
      expect(sys.getCount()).toBe(3);

      // Adding a 4th should evict npc_2 (weakest)
      sys.interact('npc_4', 100, 0.4);
      expect(sys.getCount()).toBe(3);
      expect(sys.getRelationship('npc_2')).toBeNull();
      expect(sys.getRelationship('npc_4')).not.toBeNull();
    });
  });

  describe('update (decay)', () => {
    it('decays all relationships', () => {
      const sys = new RelationshipSystem();
      sys.interact('npc_2', 100, 0.5);
      sys.update(0.1);
      expect(sys.getRelationship('npc_2')!.affinity).toBeCloseTo(0.4);
    });

    it('removes relationships that decay to zero', () => {
      const sys = new RelationshipSystem();
      sys.interact('npc_2', 100, 0.05);
      sys.update(0.1);
      expect(sys.getRelationship('npc_2')).toBeNull();
      expect(sys.getCount()).toBe(0);
    });
  });

  describe('getClosestFriend', () => {
    it('returns null when no relationships', () => {
      const sys = new RelationshipSystem();
      expect(sys.getClosestFriend()).toBeNull();
    });

    it('returns NPC with highest affinity', () => {
      const sys = new RelationshipSystem();
      sys.interact('npc_1', 100, 0.3);
      sys.interact('npc_2', 100, 0.7);
      sys.interact('npc_3', 100, 0.5);
      expect(sys.getClosestFriend()).toBe('npc_2');
    });
  });

  describe('getFriends', () => {
    it('returns only NPCs with affinity >= 0.4', () => {
      const sys = new RelationshipSystem();
      sys.interact('npc_1', 100, 0.3);
      sys.interact('npc_2', 100, 0.5);
      sys.interact('npc_3', 100, 0.6);
      const friends = sys.getFriends();
      expect(friends.length).toBe(2);
      expect(friends[0].npcId).toBe('npc_3');
      expect(friends[1].npcId).toBe('npc_2');
    });
  });

  describe('getRelationships', () => {
    it('returns relationships sorted by affinity descending', () => {
      const sys = new RelationshipSystem();
      sys.interact('npc_1', 100, 0.2);
      sys.interact('npc_2', 100, 0.8);
      sys.interact('npc_3', 100, 0.5);
      const rels = sys.getRelationships();
      expect(rels[0].npcId).toBe('npc_2');
      expect(rels[1].npcId).toBe('npc_3');
      expect(rels[2].npcId).toBe('npc_1');
    });
  });
});
