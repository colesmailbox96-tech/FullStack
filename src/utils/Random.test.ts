import { describe, it, expect } from 'vitest';
import { Random } from './Random';

describe('Random', () => {
  it('produces deterministic sequences from same seed', () => {
    const rng1 = new Random(42);
    const rng2 = new Random(42);
    for (let i = 0; i < 10; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('produces different sequences from different seeds', () => {
    const rng1 = new Random(1);
    const rng2 = new Random(2);
    const seq1 = Array.from({ length: 5 }, () => rng1.next());
    const seq2 = Array.from({ length: 5 }, () => rng2.next());
    expect(seq1).not.toEqual(seq2);
  });

  describe('next', () => {
    it('returns values in [0, 1)', () => {
      const rng = new Random(99);
      for (let i = 0; i < 100; i++) {
        const val = rng.next();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe('nextInt', () => {
    it('returns integers in [0, max)', () => {
      const rng = new Random(55);
      for (let i = 0; i < 100; i++) {
        const val = rng.nextInt(10);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(10);
        expect(Number.isInteger(val)).toBe(true);
      }
    });
  });

  describe('nextRange', () => {
    it('returns values in [min, max)', () => {
      const rng = new Random(77);
      for (let i = 0; i < 100; i++) {
        const val = rng.nextRange(5, 15);
        expect(val).toBeGreaterThanOrEqual(5);
        expect(val).toBeLessThan(15);
      }
    });
  });

  describe('nextBool', () => {
    it('returns boolean', () => {
      const rng = new Random(33);
      for (let i = 0; i < 10; i++) {
        expect(typeof rng.nextBool()).toBe('boolean');
      }
    });

    it('always true with probability=1', () => {
      const rng = new Random(33);
      for (let i = 0; i < 10; i++) {
        expect(rng.nextBool(1)).toBe(true);
      }
    });

    it('always false with probability=0', () => {
      const rng = new Random(33);
      for (let i = 0; i < 10; i++) {
        expect(rng.nextBool(0)).toBe(false);
      }
    });
  });

  describe('shuffle', () => {
    it('maintains all elements', () => {
      const rng = new Random(11);
      const arr = [1, 2, 3, 4, 5];
      rng.shuffle(arr);
      expect(arr.sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('modifies array in-place', () => {
      const rng = new Random(11);
      const arr = [1, 2, 3, 4, 5];
      const result = rng.shuffle(arr);
      expect(result).toBe(arr);
    });
  });

  describe('pick', () => {
    it('returns an element from the array', () => {
      const rng = new Random(22);
      const arr = ['a', 'b', 'c'];
      for (let i = 0; i < 20; i++) {
        expect(arr).toContain(rng.pick(arr));
      }
    });
  });
});
