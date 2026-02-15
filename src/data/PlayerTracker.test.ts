import { describe, it, expect } from 'vitest';
import { PlayerTracker } from './PlayerTracker';

describe('PlayerTracker', () => {
  it('starts with no interactions', () => {
    const tracker = new PlayerTracker();
    expect(tracker.getInteractions()).toEqual([]);
  });

  describe('trackCameraMove', () => {
    it('records camera movements', () => {
      const tracker = new PlayerTracker();
      tracker.trackCameraMove(100, 10, 20, 1.5);
      const interactions = tracker.getInteractions();
      expect(interactions.length).toBe(1);
      expect(interactions[0].type).toBe('camera_move');
      expect(interactions[0].tick).toBe(100);
      expect(interactions[0].data).toEqual({ x: 10, y: 20, zoom: 1.5 });
    });
  });

  describe('trackNPCSelect', () => {
    it('records NPC selections with hashed ID', () => {
      const tracker = new PlayerTracker();
      tracker.trackNPCSelect(200, 'npc_42');
      const interactions = tracker.getInteractions();
      expect(interactions.length).toBe(1);
      expect(interactions[0].type).toBe('npc_select');
      expect(interactions[0].tick).toBe(200);
      expect(typeof interactions[0].data.npcIdHash).toBe('number');
    });

    it('produces same hash for same ID', () => {
      const tracker = new PlayerTracker();
      tracker.trackNPCSelect(1, 'test');
      tracker.trackNPCSelect(2, 'test');
      const interactions = tracker.getInteractions();
      expect(interactions[0].data.npcIdHash).toBe(interactions[1].data.npcIdHash);
    });
  });

  describe('trackSpeedChange', () => {
    it('records speed changes', () => {
      const tracker = new PlayerTracker();
      tracker.trackSpeedChange(300, 2);
      const interactions = tracker.getInteractions();
      expect(interactions.length).toBe(1);
      expect(interactions[0].type).toBe('speed_change');
      expect(interactions[0].data).toEqual({ speed: 2 });
    });
  });

  it('returns a copy of interactions', () => {
    const tracker = new PlayerTracker();
    tracker.trackCameraMove(1, 0, 0, 1);
    const copy = tracker.getInteractions();
    copy.push({ tick: 999, type: 'fake', data: {} });
    expect(tracker.getInteractions().length).toBe(1);
  });

  it('tracks multiple interaction types in order', () => {
    const tracker = new PlayerTracker();
    tracker.trackCameraMove(1, 0, 0, 1);
    tracker.trackNPCSelect(2, 'npc1');
    tracker.trackSpeedChange(3, 3);
    const interactions = tracker.getInteractions();
    expect(interactions.length).toBe(3);
    expect(interactions[0].type).toBe('camera_move');
    expect(interactions[1].type).toBe('npc_select');
    expect(interactions[2].type).toBe('speed_change');
  });
});
