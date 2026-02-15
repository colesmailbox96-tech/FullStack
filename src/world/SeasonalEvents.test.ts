import { describe, it, expect } from 'vitest';
import { SeasonalEventManager, EVENT_DEFINITIONS } from './SeasonalEvents';

describe('SeasonalEventManager', () => {
  it('triggers event on season change', () => {
    const mgr = new SeasonalEventManager();
    const event = mgr.update('spring', 0);
    expect(event).not.toBeNull();
    expect(event!.type).toBe('spring_festival');
    expect(event!.active).toBe(true);
    expect(event!.startTick).toBe(0);
  });

  it('event becomes inactive after duration expires', () => {
    const mgr = new SeasonalEventManager();
    mgr.update('spring', 0);
    expect(mgr.isEventActive()).toBe(true);

    // Advance past the spring_festival duration (200 ticks)
    mgr.update('spring', 200);
    expect(mgr.isEventActive()).toBe(false);
    expect(mgr.getCurrentEvent()).toBeNull();
  });

  it('only one event at a time', () => {
    const mgr = new SeasonalEventManager();
    const first = mgr.update('spring', 0);
    expect(first).not.toBeNull();

    // Same season should not trigger again
    const second = mgr.update('spring', 50);
    expect(second).toBeNull();
    expect(mgr.isEventActive()).toBe(true);
    expect(mgr.getCurrentEvent()!.type).toBe('spring_festival');
  });

  it('maps correct event types for each season', () => {
    const seasons: Array<[string, string]> = [
      ['spring', 'spring_festival'],
      ['summer', 'summer_bounty'],
      ['autumn', 'autumn_harvest'],
      ['winter', 'winter_solstice'],
    ];

    for (const [season, expectedType] of seasons) {
      const mgr = new SeasonalEventManager();
      const event = mgr.update(season, 0);
      expect(event).not.toBeNull();
      expect(event!.type).toBe(expectedType);
      expect(event!.name).toBe(EVENT_DEFINITIONS[event!.type].name);
    }
  });

  it('getEffects returns null when no active event', () => {
    const mgr = new SeasonalEventManager();
    expect(mgr.getEffects()).toBeNull();
  });

  it('getEffects returns effects when event is active', () => {
    const mgr = new SeasonalEventManager();
    mgr.update('summer', 100);
    const effects = mgr.getEffects();
    expect(effects).not.toBeNull();
    expect(effects!.hungerDrainModifier).toBe(0.7);
    expect(effects!.foodRegrowthModifier).toBe(0.5);
  });

  it('event not triggered twice for same season', () => {
    const mgr = new SeasonalEventManager();
    const first = mgr.update('autumn', 0);
    expect(first).not.toBeNull();

    // Let the event expire
    mgr.update('autumn', 200);
    expect(mgr.isEventActive()).toBe(false);

    // Still same season — should not re-trigger
    const again = mgr.update('autumn', 250);
    expect(again).toBeNull();
    expect(mgr.isEventActive()).toBe(false);
  });

  it('triggers new event when season changes', () => {
    const mgr = new SeasonalEventManager();
    mgr.update('spring', 0);

    // Change to summer
    const event = mgr.update('summer', 300);
    expect(event).not.toBeNull();
    expect(event!.type).toBe('summer_bounty');
    expect(event!.active).toBe(true);
  });
});
