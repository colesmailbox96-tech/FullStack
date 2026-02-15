import { describe, it, expect } from 'vitest';
import { EventLog, WorldEvent } from './EventLog';

describe('EventLog', () => {
  it('starts empty', () => {
    const log = new EventLog();
    expect(log.getEvents()).toEqual([]);
  });

  it('adds events', () => {
    const log = new EventLog();
    const event: WorldEvent = {
      tick: 1,
      type: 'npc_born',
      description: 'An NPC was born',
      npcId: 'npc1',
    };
    log.addEvent(event);
    expect(log.getEvents().length).toBe(1);
    expect(log.getEvents()[0]).toEqual(event);
  });

  it('returns a copy of events', () => {
    const log = new EventLog();
    log.addEvent({ tick: 1, type: 'npc_born', description: 'born' });
    const events = log.getEvents();
    events.push({ tick: 2, type: 'npc_died', description: 'died' });
    expect(log.getEvents().length).toBe(1); // original unmodified
  });

  describe('capacity management', () => {
    it('removes oldest events when at capacity', () => {
      const log = new EventLog(3);
      log.addEvent({ tick: 1, type: 'npc_born', description: 'first' });
      log.addEvent({ tick: 2, type: 'npc_born', description: 'second' });
      log.addEvent({ tick: 3, type: 'npc_born', description: 'third' });
      log.addEvent({ tick: 4, type: 'npc_born', description: 'fourth' });

      const events = log.getEvents();
      expect(events.length).toBe(3);
      expect(events[0].description).toBe('second');
      expect(events[2].description).toBe('fourth');
    });
  });

  describe('getRecentEvents', () => {
    it('returns the last N events', () => {
      const log = new EventLog();
      log.addEvent({ tick: 1, type: 'npc_born', description: 'first' });
      log.addEvent({ tick: 2, type: 'npc_died', description: 'second' });
      log.addEvent({ tick: 3, type: 'weather_change', description: 'third' });

      const recent = log.getRecentEvents(2);
      expect(recent.length).toBe(2);
      expect(recent[0].description).toBe('second');
      expect(recent[1].description).toBe('third');
    });

    it('returns all events if count exceeds length', () => {
      const log = new EventLog();
      log.addEvent({ tick: 1, type: 'npc_born', description: 'only' });
      const recent = log.getRecentEvents(10);
      expect(recent.length).toBe(1);
    });
  });
});
