import { describe, it, expect } from 'vitest';
import { AchievementSystem } from './Achievements';

function defaultParams(overrides: Partial<Parameters<AchievementSystem['check']>[0]> = {}) {
  return {
    tick: 100,
    aliveCount: 25,
    weather: 'clear',
    season: 'spring',
    craftedCampfire: false,
    hasCloseFriendship: false,
    hasMasterForager: false,
    maxTilesExplored: 10,
    ...overrides,
  };
}

describe('AchievementSystem', () => {
  it('initializes with all achievements locked', () => {
    const sys = new AchievementSystem();
    const all = sys.getAll();
    expect(all.length).toBeGreaterThan(0);
    expect(sys.getUnlocked()).toEqual([]);
    for (const ach of all) {
      expect(ach.unlockedAt).toBeNull();
    }
  });

  it('unlocks first_shelter when campfire is crafted', () => {
    const sys = new AchievementSystem();
    const unlocked = sys.check(defaultParams({ craftedCampfire: true }));
    expect(unlocked.length).toBe(1);
    expect(unlocked[0].id).toBe('first_shelter');
    expect(unlocked[0].unlockedAt).toBe(100);
  });

  it('does not unlock same achievement twice', () => {
    const sys = new AchievementSystem();
    sys.check(defaultParams({ craftedCampfire: true }));
    const second = sys.check(defaultParams({ craftedCampfire: true, tick: 200 }));
    expect(second.length).toBe(0);
    expect(sys.getUnlocked().length).toBe(1);
  });

  it('unlocks population_30 when population reaches 30', () => {
    const sys = new AchievementSystem();
    const unlocked = sys.check(defaultParams({ aliveCount: 30 }));
    expect(unlocked.some(a => a.id === 'population_30')).toBe(true);
  });

  it('unlocks population_peak when population reaches 40', () => {
    const sys = new AchievementSystem();
    const unlocked = sys.check(defaultParams({ aliveCount: 40 }));
    expect(unlocked.some(a => a.id === 'population_peak')).toBe(true);
  });

  it('unlocks survived_storm when all NPCs survive a storm', () => {
    const sys = new AchievementSystem();
    // Start storm
    sys.check(defaultParams({ weather: 'storm', aliveCount: 25 }));
    // End storm with same population
    const unlocked = sys.check(defaultParams({ weather: 'clear', aliveCount: 25, tick: 200 }));
    expect(unlocked.some(a => a.id === 'survived_storm')).toBe(true);
  });

  it('does not unlock survived_storm if NPCs died during storm', () => {
    const sys = new AchievementSystem();
    sys.check(defaultParams({ weather: 'storm', aliveCount: 25 }));
    const unlocked = sys.check(defaultParams({ weather: 'clear', aliveCount: 23, tick: 200 }));
    expect(unlocked.some(a => a.id === 'survived_storm')).toBe(false);
  });

  it('unlocks first_friendship when close friendship forms', () => {
    const sys = new AchievementSystem();
    const unlocked = sys.check(defaultParams({ hasCloseFriendship: true }));
    expect(unlocked.some(a => a.id === 'first_friendship')).toBe(true);
  });

  it('unlocks master_forager when NPC reaches master foraging', () => {
    const sys = new AchievementSystem();
    const unlocked = sys.check(defaultParams({ hasMasterForager: true }));
    expect(unlocked.some(a => a.id === 'master_forager')).toBe(true);
  });

  it('unlocks explorer_100 when NPC explores 100 tiles', () => {
    const sys = new AchievementSystem();
    const unlocked = sys.check(defaultParams({ maxTilesExplored: 100 }));
    expect(unlocked.some(a => a.id === 'explorer_100')).toBe(true);
  });

  it('unlocks winter_survived on transition from winter to spring', () => {
    const sys = new AchievementSystem();
    // Enter winter
    sys.check(defaultParams({ season: 'winter', tick: 100 }));
    // Transition to spring
    const unlocked = sys.check(defaultParams({ season: 'spring', tick: 200 }));
    expect(unlocked.some(a => a.id === 'winter_survived')).toBe(true);
  });

  it('does not unlock winter_survived without passing through winter', () => {
    const sys = new AchievementSystem();
    const unlocked = sys.check(defaultParams({ season: 'spring' }));
    expect(unlocked.some(a => a.id === 'winter_survived')).toBe(false);
  });

  it('tracks peak population', () => {
    const sys = new AchievementSystem();
    sys.check(defaultParams({ aliveCount: 25 }));
    sys.check(defaultParams({ aliveCount: 35, tick: 200 }));
    sys.check(defaultParams({ aliveCount: 28, tick: 300 }));
    expect(sys.getPeakPopulation()).toBe(35);
  });

  it('getTotal returns correct count', () => {
    const sys = new AchievementSystem();
    expect(sys.getTotal()).toBe(13);
  });
});
