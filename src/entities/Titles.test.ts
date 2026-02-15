import { describe, it, expect } from 'vitest';
import { TitleTracker, checkTitleEligibility, TITLE_DEFINITIONS, TitleEligibilityParams } from './Titles';

function makeDefaultParams(overrides: Partial<TitleEligibilityParams> = {}): TitleEligibilityParams {
  return {
    age: 0,
    tilesVisited: 0,
    craftCount: 0,
    friendshipCount: 0,
    foragingSkill: 0,
    totalResources: 0,
    isOriginal: false,
    survivedStorm: false,
    mapWidth: 100,
    visitedPositions: new Set(),
    ...overrides,
  };
}

describe('TitleTracker', () => {
  it('starts with no titles', () => {
    const tracker = new TitleTracker();
    expect(tracker.getEarnedCount()).toBe(0);
    expect(tracker.getEarnedTitles()).toEqual([]);
    expect(tracker.getDisplayTitle()).toBeNull();
  });

  it('earns a title and returns true', () => {
    const tracker = new TitleTracker();
    expect(tracker.earnTitle('pioneer')).toBe(true);
    expect(tracker.hasTitle('pioneer')).toBe(true);
    expect(tracker.getEarnedCount()).toBe(1);
  });

  it('returns false when earning a duplicate title', () => {
    const tracker = new TitleTracker();
    tracker.earnTitle('pioneer');
    expect(tracker.earnTitle('pioneer')).toBe(false);
    expect(tracker.getEarnedCount()).toBe(1);
  });

  it('getEarnedTitles returns Title objects in earn order', () => {
    const tracker = new TitleTracker();
    tracker.earnTitle('veteran');
    tracker.earnTitle('wanderer');
    const titles = tracker.getEarnedTitles();
    expect(titles.length).toBe(2);
    expect(titles[0]).toEqual(TITLE_DEFINITIONS['veteran']);
    expect(titles[1]).toEqual(TITLE_DEFINITIONS['wanderer']);
  });

  it('getDisplayTitle returns the most recently earned title', () => {
    const tracker = new TitleTracker();
    tracker.earnTitle('first_builder');
    tracker.earnTitle('storm_survivor');
    const display = tracker.getDisplayTitle();
    expect(display).toEqual(TITLE_DEFINITIONS['storm_survivor']);
  });
});

describe('checkTitleEligibility', () => {
  it('returns empty array when no criteria met', () => {
    expect(checkTitleEligibility(makeDefaultParams())).toEqual([]);
  });

  it('returns first_builder when craftCount >= 1', () => {
    const result = checkTitleEligibility(makeDefaultParams({ craftCount: 1 }));
    expect(result).toContain('first_builder');
  });

  it('returns storm_survivor when survivedStorm is true', () => {
    const result = checkTitleEligibility(makeDefaultParams({ survivedStorm: true }));
    expect(result).toContain('storm_survivor');
  });

  it('returns elder_explorer when tilesVisited >= 200', () => {
    const result = checkTitleEligibility(makeDefaultParams({ tilesVisited: 200 }));
    expect(result).toContain('elder_explorer');
  });

  it('returns master_forager when foragingSkill >= 0.8', () => {
    const result = checkTitleEligibility(makeDefaultParams({ foragingSkill: 0.8 }));
    expect(result).toContain('master_forager');
  });

  it('returns social_leader when friendshipCount >= 5', () => {
    const result = checkTitleEligibility(makeDefaultParams({ friendshipCount: 5 }));
    expect(result).toContain('social_leader');
  });

  it('returns seasoned_crafter when craftCount >= 3', () => {
    const result = checkTitleEligibility(makeDefaultParams({ craftCount: 3 }));
    expect(result).toContain('seasoned_crafter');
    expect(result).toContain('first_builder');
  });

  it('returns pioneer when isOriginal is true', () => {
    const result = checkTitleEligibility(makeDefaultParams({ isOriginal: true }));
    expect(result).toContain('pioneer');
  });

  it('returns veteran when age >= 5000', () => {
    const result = checkTitleEligibility(makeDefaultParams({ age: 5000 }));
    expect(result).toContain('veteran');
  });

  it('returns resource_hoarder when totalResources >= 8', () => {
    const result = checkTitleEligibility(makeDefaultParams({ totalResources: 8 }));
    expect(result).toContain('resource_hoarder');
  });

  it('returns multiple titles when multiple criteria met', () => {
    const result = checkTitleEligibility(makeDefaultParams({
      craftCount: 1,
      age: 6000,
      isOriginal: true,
    }));
    expect(result).toContain('first_builder');
    expect(result).toContain('veteran');
    expect(result).toContain('pioneer');
  });
});

describe('wanderer title', () => {
  it('does not grant wanderer with positions in only some quadrants', () => {
    const positions = new Set(['10,10', '60,10', '10,60']);
    const result = checkTitleEligibility(makeDefaultParams({
      mapWidth: 100,
      visitedPositions: positions,
    }));
    expect(result).not.toContain('wanderer');
  });

  it('grants wanderer when all four quadrants visited', () => {
    const positions = new Set(['10,10', '60,10', '10,60', '60,60']);
    const result = checkTitleEligibility(makeDefaultParams({
      mapWidth: 100,
      visitedPositions: positions,
    }));
    expect(result).toContain('wanderer');
  });

  it('handles edge positions on quadrant boundaries', () => {
    const positions = new Set(['0,0', '50,0', '0,50', '50,50']);
    const result = checkTitleEligibility(makeDefaultParams({
      mapWidth: 100,
      visitedPositions: positions,
    }));
    expect(result).toContain('wanderer');
  });
});
