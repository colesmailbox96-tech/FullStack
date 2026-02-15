import { describe, it, expect } from 'vitest';
import { TerritorySystem } from './Territory';

describe('TerritorySystem', () => {
  describe('claimHome', () => {
    it('sets a home base with correct position and tick', () => {
      const ts = new TerritorySystem();
      ts.claimHome(10, 20, 100);
      const home = ts.getHome();
      expect(home).not.toBeNull();
      expect(home!.x).toBe(10);
      expect(home!.y).toBe(20);
      expect(home!.claimedAt).toBe(100);
      expect(home!.familiarity).toBe(0);
    });

    it('reports hasHome as true after claiming', () => {
      const ts = new TerritorySystem();
      expect(ts.hasHome()).toBe(false);
      ts.claimHome(5, 5, 0);
      expect(ts.hasHome()).toBe(true);
    });
  });

  describe('isInTerritory', () => {
    it('returns true when within territory radius', () => {
      const ts = new TerritorySystem(8);
      ts.claimHome(10, 10, 0);
      expect(ts.isInTerritory(10, 10)).toBe(true);
      expect(ts.isInTerritory(14, 14)).toBe(true); // ~5.66 < 8
    });

    it('returns false when outside territory radius', () => {
      const ts = new TerritorySystem(8);
      ts.claimHome(10, 10, 0);
      expect(ts.isInTerritory(20, 20)).toBe(false); // ~14.14 > 8
    });

    it('returns false when no home is claimed', () => {
      const ts = new TerritorySystem();
      expect(ts.isInTerritory(0, 0)).toBe(false);
    });
  });

  describe('getDistanceFromHome', () => {
    it('returns correct Euclidean distance', () => {
      const ts = new TerritorySystem();
      ts.claimHome(0, 0, 0);
      expect(ts.getDistanceFromHome(3, 4)).toBe(5); // 3-4-5 triangle
    });

    it('returns 0 when at home', () => {
      const ts = new TerritorySystem();
      ts.claimHome(5, 5, 0);
      expect(ts.getDistanceFromHome(5, 5)).toBe(0);
    });

    it('returns Infinity when no home is claimed', () => {
      const ts = new TerritorySystem();
      expect(ts.getDistanceFromHome(10, 10)).toBe(Infinity);
    });
  });

  describe('updateFamiliarity', () => {
    it('increases familiarity when in territory', () => {
      const ts = new TerritorySystem(8);
      ts.claimHome(10, 10, 0);
      ts.updateFamiliarity(10, 10);
      expect(ts.getFamiliarity()).toBeCloseTo(0.001);
    });

    it('decreases familiarity when outside territory', () => {
      const ts = new TerritorySystem(8);
      ts.claimHome(10, 10, 0);
      // Build up some familiarity first
      for (let i = 0; i < 10; i++) ts.updateFamiliarity(10, 10);
      const before = ts.getFamiliarity();
      ts.updateFamiliarity(100, 100); // far away
      expect(ts.getFamiliarity()).toBeLessThan(before);
      expect(ts.getFamiliarity()).toBeCloseTo(before - 0.0005);
    });

    it('caps familiarity at 1.0', () => {
      const ts = new TerritorySystem(8);
      ts.claimHome(10, 10, 0);
      for (let i = 0; i < 1100; i++) ts.updateFamiliarity(10, 10);
      expect(ts.getFamiliarity()).toBe(1.0);
    });

    it('floors familiarity at 0', () => {
      const ts = new TerritorySystem(8);
      ts.claimHome(10, 10, 0);
      // Familiarity starts at 0, decrease should stay at 0
      ts.updateFamiliarity(100, 100);
      expect(ts.getFamiliarity()).toBe(0);
    });

    it('does nothing when no home is claimed', () => {
      const ts = new TerritorySystem();
      ts.updateFamiliarity(10, 10);
      expect(ts.getFamiliarity()).toBe(0);
    });
  });

  describe('getRestBonus', () => {
    it('returns 1.0 at familiarity 0', () => {
      const ts = new TerritorySystem();
      ts.claimHome(5, 5, 0);
      expect(ts.getRestBonus()).toBe(1.0);
    });

    it('scales with familiarity up to 1.3', () => {
      const ts = new TerritorySystem(8);
      ts.claimHome(5, 5, 0);
      // Max out familiarity
      for (let i = 0; i < 1100; i++) ts.updateFamiliarity(5, 5);
      expect(ts.getRestBonus()).toBeCloseTo(1.3);
    });

    it('returns intermediate values at partial familiarity', () => {
      const ts = new TerritorySystem(8);
      ts.claimHome(5, 5, 0);
      // 500 ticks → familiarity 0.5
      for (let i = 0; i < 500; i++) ts.updateFamiliarity(5, 5);
      expect(ts.getRestBonus()).toBeCloseTo(1.15);
    });
  });

  describe('shouldReturnHome', () => {
    it('returns true when energy is low', () => {
      const ts = new TerritorySystem();
      ts.claimHome(10, 10, 0);
      expect(ts.shouldReturnHome(0.3, false)).toBe(true);
    });

    it('returns true when it is night', () => {
      const ts = new TerritorySystem();
      ts.claimHome(10, 10, 0);
      expect(ts.shouldReturnHome(0.8, true)).toBe(true);
    });

    it('returns false when energy is high and not night', () => {
      const ts = new TerritorySystem();
      ts.claimHome(10, 10, 0);
      expect(ts.shouldReturnHome(0.8, false)).toBe(false);
    });

    it('returns false when no home is claimed', () => {
      const ts = new TerritorySystem();
      expect(ts.shouldReturnHome(0.1, true)).toBe(false);
    });
  });

  describe('abandonHome', () => {
    it('clears the home base', () => {
      const ts = new TerritorySystem();
      ts.claimHome(10, 10, 0);
      expect(ts.hasHome()).toBe(true);
      ts.abandonHome();
      expect(ts.hasHome()).toBe(false);
      expect(ts.getHome()).toBeNull();
    });

    it('resets familiarity to 0', () => {
      const ts = new TerritorySystem(8);
      ts.claimHome(5, 5, 0);
      for (let i = 0; i < 100; i++) ts.updateFamiliarity(5, 5);
      expect(ts.getFamiliarity()).toBeGreaterThan(0);
      ts.abandonHome();
      expect(ts.getFamiliarity()).toBe(0);
    });
  });
});
