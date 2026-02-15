import { describe, it, expect } from 'vitest';
import { DataLogger, validateTrainingData, diagnoseActionDistribution } from './DataLogger';
import type { DecisionLog } from './DataLogger';

function makeLogEntry(decision: string): DecisionLog {
  return {
    schema_version: '1.0',
    tick: 1,
    npc_id: 'npc_1',
    perception: {
      nearby_tiles_summary: {},
      nearby_npcs: [],
      nearby_objects: [],
      needs: { hunger: 0.5, energy: 0.5, social: 0.5, curiosity: 0.5, safety: 0.5 },
      top_memories: [],
      weather: 'clear',
      time_of_day: 0.5,
    },
    decision,
    outcome: { needs_delta: {} },
  };
}

describe('DataLogger', () => {
  it('starts empty', () => {
    const logger = new DataLogger();
    expect(logger.getBufferSize()).toBe(0);
    expect(logger.getBuffer()).toEqual([]);
  });

  it('logs entries', () => {
    const logger = new DataLogger();
    logger.log(makeLogEntry('FORAGE'));
    expect(logger.getBufferSize()).toBe(1);
  });

  it('returns a copy of the buffer', () => {
    const logger = new DataLogger();
    logger.log(makeLogEntry('FORAGE'));
    const buf = logger.getBuffer();
    buf.push(makeLogEntry('REST'));
    expect(logger.getBufferSize()).toBe(1);
  });

  it('respects max buffer size', () => {
    const logger = new DataLogger(3);
    logger.log(makeLogEntry('FORAGE'));
    logger.log(makeLogEntry('REST'));
    logger.log(makeLogEntry('EXPLORE'));
    logger.log(makeLogEntry('SOCIALIZE'));
    expect(logger.getBufferSize()).toBe(3);
    expect(logger.getBuffer()[0].decision).toBe('REST'); // oldest removed
  });

  it('clears the buffer', () => {
    const logger = new DataLogger();
    logger.log(makeLogEntry('FORAGE'));
    logger.log(makeLogEntry('REST'));
    logger.clear();
    expect(logger.getBufferSize()).toBe(0);
    expect(logger.getBuffer()).toEqual([]);
  });
});

describe('validateTrainingData', () => {
  it('passes with balanced data', () => {
    const log = [
      ...Array(20).fill({ decision: 'FORAGE' }),
      ...Array(20).fill({ decision: 'REST' }),
      ...Array(20).fill({ decision: 'SEEK_SHELTER' }),
      ...Array(20).fill({ decision: 'EXPLORE' }),
      ...Array(20).fill({ decision: 'SOCIALIZE' }),
    ];
    const { valid, report } = validateTrainingData(log);
    expect(valid).toBe(true);
    expect(report).toContain('PASSED');
  });

  it('fails when an action is missing', () => {
    const log = [
      ...Array(50).fill({ decision: 'FORAGE' }),
      ...Array(50).fill({ decision: 'REST' }),
    ];
    const { valid, report } = validateTrainingData(log);
    expect(valid).toBe(false);
    expect(report).toContain('FAILED');
  });

  it('fails when an action is dominant (> 50%)', () => {
    const log = [
      ...Array(60).fill({ decision: 'FORAGE' }),
      ...Array(10).fill({ decision: 'REST' }),
      ...Array(10).fill({ decision: 'SEEK_SHELTER' }),
      ...Array(10).fill({ decision: 'EXPLORE' }),
      ...Array(10).fill({ decision: 'SOCIALIZE' }),
    ];
    const { valid } = validateTrainingData(log);
    expect(valid).toBe(false);
  });

  it('handles empty log', () => {
    const { valid, report } = validateTrainingData([]);
    expect(valid).toBe(false);
    expect(report).toContain('FAILED');
  });
});

describe('diagnoseActionDistribution', () => {
  it('counts actions across ticks', () => {
    let tickCount = 0;
    const npcs = [
      { currentAction: 'FORAGE' },
      { currentAction: 'REST' },
    ];

    const counts = diagnoseActionDistribution(
      () => { tickCount++; },
      () => npcs,
      5,
    );

    expect(tickCount).toBe(5);
    expect(counts['FORAGE']).toBe(5); // 5 ticks × 1 NPC = 5
    expect(counts['REST']).toBe(5);
  });
});
