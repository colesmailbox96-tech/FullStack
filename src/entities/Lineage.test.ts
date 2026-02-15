import { describe, it, expect } from 'vitest';
import { LineageTracker } from './Lineage';

describe('LineageTracker', () => {
  describe('registerOriginal', () => {
    it('creates a generation 0 record with no parents', () => {
      const tracker = new LineageTracker();
      tracker.registerOriginal('npc_1', 100);
      const record = tracker.getRecord('npc_1');
      expect(record).not.toBeNull();
      expect(record!.npcId).toBe('npc_1');
      expect(record!.parentIds).toBeNull();
      expect(record!.childIds).toEqual([]);
      expect(record!.generation).toBe(0);
      expect(record!.birthTick).toBe(100);
    });
  });

  describe('registerBirth', () => {
    it('correctly links parents and child', () => {
      const tracker = new LineageTracker();
      tracker.registerOriginal('parent_1', 0);
      tracker.registerOriginal('parent_2', 0);
      tracker.registerBirth('child_1', 'parent_1', 'parent_2', 50);

      const childRecord = tracker.getRecord('child_1');
      expect(childRecord).not.toBeNull();
      expect(childRecord!.parentIds).toEqual(['parent_1', 'parent_2']);
      expect(childRecord!.generation).toBe(1);
      expect(childRecord!.birthTick).toBe(50);

      // Parents should list the child
      expect(tracker.getChildren('parent_1')).toContain('child_1');
      expect(tracker.getChildren('parent_2')).toContain('child_1');
    });

    it('increments generation correctly for grandchildren', () => {
      const tracker = new LineageTracker();
      tracker.registerOriginal('g0_a', 0);
      tracker.registerOriginal('g0_b', 0);
      tracker.registerBirth('g1_a', 'g0_a', 'g0_b', 10);

      tracker.registerOriginal('g0_c', 0);
      tracker.registerBirth('g2_a', 'g1_a', 'g0_c', 20);

      expect(tracker.getGeneration('g0_a')).toBe(0);
      expect(tracker.getGeneration('g1_a')).toBe(1);
      expect(tracker.getGeneration('g2_a')).toBe(2);
    });

    it('uses max parent generation when parents differ', () => {
      const tracker = new LineageTracker();
      tracker.registerOriginal('p1', 0);
      tracker.registerOriginal('p2', 0);
      tracker.registerBirth('c1', 'p1', 'p2', 10); // gen 1

      tracker.registerOriginal('p3', 0); // gen 0
      tracker.registerBirth('c2', 'c1', 'p3', 20); // max(1,0)+1 = 2

      expect(tracker.getGeneration('c2')).toBe(2);
    });
  });

  describe('getParents', () => {
    it('returns parent IDs for a child', () => {
      const tracker = new LineageTracker();
      tracker.registerOriginal('p1', 0);
      tracker.registerOriginal('p2', 0);
      tracker.registerBirth('c1', 'p1', 'p2', 10);

      expect(tracker.getParents('c1')).toEqual(['p1', 'p2']);
    });

    it('returns null for an original NPC', () => {
      const tracker = new LineageTracker();
      tracker.registerOriginal('p1', 0);
      expect(tracker.getParents('p1')).toBeNull();
    });

    it('returns null for unknown NPC', () => {
      const tracker = new LineageTracker();
      expect(tracker.getParents('unknown')).toBeNull();
    });
  });

  describe('getChildren', () => {
    it('returns child IDs for a parent', () => {
      const tracker = new LineageTracker();
      tracker.registerOriginal('p1', 0);
      tracker.registerOriginal('p2', 0);
      tracker.registerBirth('c1', 'p1', 'p2', 10);
      tracker.registerBirth('c2', 'p1', 'p2', 20);

      const children = tracker.getChildren('p1');
      expect(children).toContain('c1');
      expect(children).toContain('c2');
      expect(children.length).toBe(2);
    });

    it('returns empty array for NPC with no children', () => {
      const tracker = new LineageTracker();
      tracker.registerOriginal('p1', 0);
      expect(tracker.getChildren('p1')).toEqual([]);
    });

    it('returns empty array for unknown NPC', () => {
      const tracker = new LineageTracker();
      expect(tracker.getChildren('unknown')).toEqual([]);
    });
  });

  describe('getSiblings', () => {
    it('returns correct siblings excluding self', () => {
      const tracker = new LineageTracker();
      tracker.registerOriginal('p1', 0);
      tracker.registerOriginal('p2', 0);
      tracker.registerBirth('c1', 'p1', 'p2', 10);
      tracker.registerBirth('c2', 'p1', 'p2', 20);
      tracker.registerBirth('c3', 'p1', 'p2', 30);

      const siblings = tracker.getSiblings('c1');
      expect(siblings).toContain('c2');
      expect(siblings).toContain('c3');
      expect(siblings).not.toContain('c1');
      expect(siblings.length).toBe(2);
    });

    it('returns empty array for original NPCs', () => {
      const tracker = new LineageTracker();
      tracker.registerOriginal('p1', 0);
      expect(tracker.getSiblings('p1')).toEqual([]);
    });

    it('does not include half-siblings from different parent pairs', () => {
      const tracker = new LineageTracker();
      tracker.registerOriginal('p1', 0);
      tracker.registerOriginal('p2', 0);
      tracker.registerOriginal('p3', 0);
      tracker.registerBirth('c1', 'p1', 'p2', 10);
      tracker.registerBirth('c2', 'p1', 'p3', 20);

      expect(tracker.getSiblings('c1')).toEqual([]);
      expect(tracker.getSiblings('c2')).toEqual([]);
    });
  });

  describe('getMaxGeneration', () => {
    it('returns 0 when no records exist', () => {
      const tracker = new LineageTracker();
      expect(tracker.getMaxGeneration()).toBe(0);
    });

    it('returns the highest generation across all records', () => {
      const tracker = new LineageTracker();
      tracker.registerOriginal('g0_a', 0);
      tracker.registerOriginal('g0_b', 0);
      tracker.registerBirth('g1_a', 'g0_a', 'g0_b', 10);
      tracker.registerBirth('g2_a', 'g1_a', 'g0_b', 20);

      expect(tracker.getMaxGeneration()).toBe(2);
    });
  });

  describe('getFamilySize', () => {
    it('counts parents, children, and siblings', () => {
      const tracker = new LineageTracker();
      tracker.registerOriginal('p1', 0);
      tracker.registerOriginal('p2', 0);
      tracker.registerBirth('c1', 'p1', 'p2', 10);
      tracker.registerBirth('c2', 'p1', 'p2', 20);

      // c1 has 2 parents + 0 children + 1 sibling = 3
      expect(tracker.getFamilySize('c1')).toBe(3);

      // p1 has 0 parents + 2 children + 0 siblings = 2
      expect(tracker.getFamilySize('p1')).toBe(2);
    });

    it('returns 0 for unknown NPC', () => {
      const tracker = new LineageTracker();
      expect(tracker.getFamilySize('unknown')).toBe(0);
    });
  });

  describe('getRecordCount', () => {
    it('returns total number of records', () => {
      const tracker = new LineageTracker();
      expect(tracker.getRecordCount()).toBe(0);

      tracker.registerOriginal('p1', 0);
      tracker.registerOriginal('p2', 0);
      expect(tracker.getRecordCount()).toBe(2);

      tracker.registerBirth('c1', 'p1', 'p2', 10);
      expect(tracker.getRecordCount()).toBe(3);
    });
  });
});
