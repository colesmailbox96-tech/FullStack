import { describe, it, expect } from 'vitest';
import {
  ReputationSystem,
  REPUTATION_PER_TRADE,
  REPUTATION_PER_CRAFT,
  REPUTATION_PER_SOCIAL,
  type ReputationTier,
} from './Reputation';

describe('ReputationSystem', () => {
  it('starts with score 0 and neutral tier', () => {
    const rep = new ReputationSystem();
    expect(rep.getScore()).toBe(0);
    expect(rep.getTier()).toBe('neutral');
  });

  it('adds reputation and increases score', () => {
    const rep = new ReputationSystem();
    rep.addReputation(10, 'helped a villager');
    expect(rep.getScore()).toBe(10);
  });

  it('caps score at 100', () => {
    const rep = new ReputationSystem();
    rep.addReputation(150, 'legendary deed');
    expect(rep.getScore()).toBe(100);
  });

  it('removes reputation and decreases score', () => {
    const rep = new ReputationSystem();
    rep.removeReputation(5, 'broke a promise');
    expect(rep.getScore()).toBe(-5);
  });

  it('floors score at -20', () => {
    const rep = new ReputationSystem();
    rep.removeReputation(50, 'terrible act');
    expect(rep.getScore()).toBe(-20);
  });
});

describe('getTier', () => {
  it('returns unknown for negative scores', () => {
    const rep = new ReputationSystem();
    rep.removeReputation(1, 'minor offense');
    expect(rep.getTier()).toBe('unknown');
  });

  it('returns neutral for score 0', () => {
    const rep = new ReputationSystem();
    expect(rep.getTier()).toBe('neutral');
  });

  it('returns neutral for score 19', () => {
    const rep = new ReputationSystem();
    rep.addReputation(19, 'small help');
    expect(rep.getTier()).toBe('neutral');
  });

  it('returns liked for score 20', () => {
    const rep = new ReputationSystem();
    rep.addReputation(20, 'good trade');
    expect(rep.getTier()).toBe('liked');
  });

  it('returns liked for score 49', () => {
    const rep = new ReputationSystem();
    rep.addReputation(49, 'many trades');
    expect(rep.getTier()).toBe('liked');
  });

  it('returns respected for score 50', () => {
    const rep = new ReputationSystem();
    rep.addReputation(50, 'community service');
    expect(rep.getTier()).toBe('respected');
  });

  it('returns respected for score 79', () => {
    const rep = new ReputationSystem();
    rep.addReputation(79, 'great deeds');
    expect(rep.getTier()).toBe('respected');
  });

  it('returns renowned for score 80', () => {
    const rep = new ReputationSystem();
    rep.addReputation(80, 'legendary');
    expect(rep.getTier()).toBe('renowned');
  });

  it('returns renowned for score 100', () => {
    const rep = new ReputationSystem();
    rep.addReputation(100, 'maximum fame');
    expect(rep.getTier()).toBe('renowned');
  });
});

describe('getTradeModifier', () => {
  const cases: { tier: ReputationTier; score: number; expected: number }[] = [
    { tier: 'unknown', score: -10, expected: 0.5 },
    { tier: 'neutral', score: 0, expected: 1.0 },
    { tier: 'liked', score: 30, expected: 1.2 },
    { tier: 'respected', score: 60, expected: 1.4 },
    { tier: 'renowned', score: 90, expected: 1.8 },
  ];

  for (const { tier, score, expected } of cases) {
    it(`returns ${expected} for ${tier} tier`, () => {
      const rep = new ReputationSystem();
      if (score > 0) rep.addReputation(score, 'test');
      if (score < 0) rep.removeReputation(Math.abs(score), 'test');
      expect(rep.getTradeModifier()).toBe(expected);
    });
  }
});

describe('getLabel', () => {
  it('returns capitalized tier name', () => {
    const rep = new ReputationSystem();
    expect(rep.getLabel()).toBe('Neutral');

    rep.addReputation(50, 'test');
    expect(rep.getLabel()).toBe('Respected');
  });
});

describe('getInfo', () => {
  it('returns complete reputation info', () => {
    const rep = new ReputationSystem();
    rep.addReputation(25, 'trading');

    const info = rep.getInfo();
    expect(info.tier).toBe('liked');
    expect(info.score).toBe(25);
    expect(info.label).toBe('Liked');
    expect(info.tradeModifier).toBe(1.2);
  });
});

describe('reputation constants', () => {
  it('has correct reputation amounts for activities', () => {
    expect(REPUTATION_PER_TRADE).toBe(3);
    expect(REPUTATION_PER_CRAFT).toBe(2);
    expect(REPUTATION_PER_SOCIAL).toBe(1);
  });
});
