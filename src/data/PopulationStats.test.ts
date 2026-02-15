import { describe, it, expect } from 'vitest';
import { PopulationTracker } from './PopulationStats';

function makeNPC(overrides: Partial<{
  needs: { hunger: number; energy: number; social: number; safety: number; curiosity: number };
  skills: { foraging: number; building: number; crafting: number; socializing: number; exploring: number };
}> = {}) {
  return {
    needs: { hunger: 0.5, energy: 0.6, social: 0.4, safety: 0.7, curiosity: 0.3, ...overrides.needs },
    skills: { foraging: 2, building: 1, crafting: 3, socializing: 4, exploring: 5, ...overrides.skills },
  };
}

describe('PopulationTracker', () => {
  it('starts with empty state', () => {
    const tracker = new PopulationTracker();
    expect(tracker.getPopulationHistory()).toEqual([]);
    expect(tracker.getPeakPopulation()).toBe(0);
  });

  it('recordTick stores snapshots', () => {
    const tracker = new PopulationTracker();
    tracker.recordTick(1, 10, 2, 1);
    tracker.recordTick(2, 11, 1, 0);
    const history = tracker.getPopulationHistory();
    expect(history).toHaveLength(2);
    expect(history[0]).toEqual({ tick: 1, alive: 10, born: 2, died: 1 });
    expect(history[1]).toEqual({ tick: 2, alive: 11, born: 1, died: 0 });
  });

  it('getPopulationHistory returns a copy', () => {
    const tracker = new PopulationTracker();
    tracker.recordTick(1, 10, 0, 0);
    const history = tracker.getPopulationHistory();
    history.push({ tick: 99, alive: 99, born: 99, died: 99 });
    expect(tracker.getPopulationHistory()).toHaveLength(1);
  });

  it('recordDeath tracks lifespans', () => {
    const tracker = new PopulationTracker();
    tracker.recordDeath(50);
    tracker.recordDeath(100);
    tracker.recordTick(0, 5, 0, 0);
    tracker.recordTick(100, 5, 0, 0);
    const summary = tracker.getSummary([makeNPC()]);
    expect(summary.averageLifespan).toBe(75);
  });

  it('getSummary returns correct need averages', () => {
    const tracker = new PopulationTracker();
    tracker.recordTick(0, 2, 0, 0);
    const npc1 = makeNPC({ needs: { hunger: 0.2, energy: 0.4, social: 0.6, safety: 0.8, curiosity: 1.0 } });
    const npc2 = makeNPC({ needs: { hunger: 0.8, energy: 0.6, social: 0.4, safety: 0.2, curiosity: 0.0 } });
    const summary = tracker.getSummary([npc1, npc2]);
    expect(summary.avgHunger).toBe(0.5);
    expect(summary.avgEnergy).toBe(0.5);
    expect(summary.avgSocial).toBe(0.5);
    expect(summary.avgSafety).toBe(0.5);
    expect(summary.avgCuriosity).toBe(0.5);
  });

  it('getSummary returns correct skill averages', () => {
    const tracker = new PopulationTracker();
    tracker.recordTick(0, 2, 0, 0);
    const npc1 = makeNPC({ skills: { foraging: 2, building: 4, crafting: 6, socializing: 8, exploring: 10 } });
    const npc2 = makeNPC({ skills: { foraging: 4, building: 6, crafting: 8, socializing: 10, exploring: 2 } });
    const summary = tracker.getSummary([npc1, npc2]);
    expect(summary.skillDistribution.foraging).toBe(3);
    expect(summary.skillDistribution.building).toBe(5);
    expect(summary.skillDistribution.crafting).toBe(7);
    expect(summary.skillDistribution.socializing).toBe(9);
    expect(summary.skillDistribution.exploring).toBe(6);
  });

  it('getSummary handles empty NPC list', () => {
    const tracker = new PopulationTracker();
    const summary = tracker.getSummary([]);
    expect(summary.currentPopulation).toBe(0);
    expect(summary.avgHunger).toBe(0);
    expect(summary.skillDistribution.foraging).toBe(0);
  });

  it('ring buffer caps snapshots at 500', () => {
    const tracker = new PopulationTracker();
    for (let i = 0; i < 550; i++) {
      tracker.recordTick(i, 10, 0, 0);
    }
    const history = tracker.getPopulationHistory();
    expect(history).toHaveLength(500);
    expect(history[0].tick).toBe(50);
    expect(history[history.length - 1].tick).toBe(549);
  });

  it('ring buffer caps lifespans at 100', () => {
    const tracker = new PopulationTracker();
    for (let i = 0; i < 120; i++) {
      tracker.recordDeath(i);
    }
    // Record ticks so getSummary can calculate
    tracker.recordTick(0, 1, 0, 0);
    tracker.recordTick(1000, 1, 0, 0);
    const summary = tracker.getSummary([makeNPC()]);
    // Lifespans should be 20..119, average = (20+119)/2 = 69.5
    expect(summary.averageLifespan).toBe(69.5);
  });

  it('birth and death rates calculated correctly', () => {
    const tracker = new PopulationTracker();
    tracker.recordTick(0, 10, 5, 2);
    tracker.recordTick(500, 13, 3, 0);
    // tickSpan = 500, totalBirths = 8, totalDeaths = 2
    const summary = tracker.getSummary([makeNPC()]);
    expect(summary.birthRate).toBe((8 / 500) * 1000);
    expect(summary.deathRate).toBe((2 / 500) * 1000);
    expect(summary.totalBirths).toBe(8);
    expect(summary.totalDeaths).toBe(2);
  });

  it('rates are zero with fewer than two snapshots', () => {
    const tracker = new PopulationTracker();
    tracker.recordTick(0, 10, 5, 2);
    const summary = tracker.getSummary([makeNPC()]);
    expect(summary.birthRate).toBe(0);
    expect(summary.deathRate).toBe(0);
  });

  it('peak population is tracked across ticks', () => {
    const tracker = new PopulationTracker();
    tracker.recordTick(1, 10, 0, 0);
    tracker.recordTick(2, 25, 0, 0);
    tracker.recordTick(3, 15, 0, 0);
    expect(tracker.getPeakPopulation()).toBe(25);
    const summary = tracker.getSummary([makeNPC()]);
    expect(summary.peakPopulation).toBe(25);
  });
});
