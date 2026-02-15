import { describe, it, expect } from 'vitest';
import { determineMood, getEmoteString, getMoodColor, MOOD_EMOTES } from './MoodEmotes';
import type { MoodType } from './MoodEmotes';

/** Helper that creates a full set of needs with sensible defaults. */
function makeNeeds(overrides: Partial<Record<string, number>> = {}) {
  return {
    hunger: 0.8,
    energy: 0.8,
    social: 0.8,
    curiosity: 0.8,
    safety: 0.8,
    ...overrides,
  };
}

describe('determineMood', () => {
  it('returns starving when hunger is critical', () => {
    const mood = determineMood(makeNeeds({ hunger: 0.05 }), 'IDLE');
    expect(mood.mood).toBe('starving');
    expect(mood.priority).toBe(10);
  });

  it('returns scared when safety is critical', () => {
    const mood = determineMood(makeNeeds({ safety: 0.1 }), 'IDLE');
    expect(mood.mood).toBe('scared');
    expect(mood.priority).toBe(9);
  });

  it('returns sleepy when energy is critical', () => {
    const mood = determineMood(makeNeeds({ energy: 0.1 }), 'IDLE');
    expect(mood.mood).toBe('sleepy');
    expect(mood.priority).toBe(8);
  });

  it('returns joyful when all needs are high', () => {
    const mood = determineMood(makeNeeds(), 'IDLE');
    expect(mood.mood).toBe('joyful');
    expect(mood.priority).toBe(2);
  });

  it('returns crafting when action is CRAFT', () => {
    const mood = determineMood(makeNeeds(), 'CRAFT');
    expect(mood.mood).toBe('crafting');
    expect(mood.priority).toBe(4);
  });

  it('returns working when action is FORAGE', () => {
    const mood = determineMood(makeNeeds(), 'FORAGE');
    expect(mood.mood).toBe('working');
    expect(mood.priority).toBe(4);
  });

  it('returns working when action is GATHER', () => {
    const mood = determineMood(makeNeeds(), 'GATHER');
    expect(mood.mood).toBe('working');
    expect(mood.priority).toBe(4);
  });

  it('returns curious when exploring with low curiosity', () => {
    const mood = determineMood(makeNeeds({ curiosity: 0.3 }), 'EXPLORE');
    expect(mood.mood).toBe('curious');
    expect(mood.priority).toBe(3);
  });

  it('returns lonely when social is low and not socializing', () => {
    const mood = determineMood(makeNeeds({ social: 0.15 }), 'IDLE');
    expect(mood.mood).toBe('lonely');
    expect(mood.priority).toBe(7);
  });

  it('does not return lonely when socializing', () => {
    const mood = determineMood(makeNeeds({ social: 0.15 }), 'SOCIALIZE');
    expect(mood.mood).not.toBe('lonely');
  });

  it('returns worried when a core need is below 0.3', () => {
    const mood = determineMood(makeNeeds({ hunger: 0.25 }), 'IDLE');
    expect(mood.mood).toBe('worried');
    expect(mood.priority).toBe(5);
  });

  it('returns content when all needs are moderate', () => {
    const mood = determineMood(makeNeeds({ hunger: 0.5, energy: 0.5, social: 0.5, curiosity: 0.5, safety: 0.5 }), 'IDLE');
    expect(mood.mood).toBe('content');
    expect(mood.priority).toBe(1);
  });

  it('returns neutral as the default mood', () => {
    const mood = determineMood(makeNeeds({ hunger: 0.35, curiosity: 0.35 }), 'IDLE');
    expect(mood.mood).toBe('neutral');
    expect(mood.priority).toBe(0);
  });

  describe('priority ordering', () => {
    it('starving beats worried (hunger < 0.1 triggers starving, not worried)', () => {
      const mood = determineMood(makeNeeds({ hunger: 0.05 }), 'IDLE');
      expect(mood.mood).toBe('starving');
      expect(mood.priority).toBeGreaterThan(5);
    });

    it('scared beats sleepy when both conditions are met', () => {
      const mood = determineMood(makeNeeds({ safety: 0.1, energy: 0.1 }), 'IDLE');
      expect(mood.mood).toBe('scared');
      expect(mood.priority).toBe(9);
    });

    it('critical needs beat action-based moods', () => {
      const mood = determineMood(makeNeeds({ hunger: 0.05 }), 'CRAFT');
      expect(mood.mood).toBe('starving');
    });
  });
});

describe('getEmoteString', () => {
  it('returns the correct emoji for each mood', () => {
    const expected: Record<MoodType, string> = {
      joyful: '😊',
      content: '🙂',
      neutral: '😐',
      worried: '😟',
      distressed: '😰',
      starving: '🤢',
      sleepy: '😴',
      lonely: '😢',
      curious: '🤔',
      scared: '😨',
      working: '💪',
      crafting: '🔨',
    };

    for (const [mood, emote] of Object.entries(expected)) {
      expect(getEmoteString(mood as MoodType)).toBe(emote);
    }
  });
});

describe('getMoodColor', () => {
  it('returns valid hex colors for every mood type', () => {
    const moods: MoodType[] = [
      'joyful', 'content', 'neutral', 'worried', 'distressed',
      'starving', 'sleepy', 'lonely', 'curious', 'scared',
      'working', 'crafting',
    ];

    for (const mood of moods) {
      const color = getMoodColor(mood);
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('returns the expected color for specific moods', () => {
    expect(getMoodColor('joyful')).toBe('#4CAF50');
    expect(getMoodColor('distressed')).toBe('#F44336');
    expect(getMoodColor('starving')).toBe('#B71C1C');
    expect(getMoodColor('crafting')).toBe('#795548');
  });
});

describe('MOOD_EMOTES constant', () => {
  it('has an entry for every mood type', () => {
    const moods: MoodType[] = [
      'joyful', 'content', 'neutral', 'worried', 'distressed',
      'starving', 'sleepy', 'lonely', 'curious', 'scared',
      'working', 'crafting',
    ];

    for (const mood of moods) {
      expect(MOOD_EMOTES[mood]).toBeDefined();
      expect(MOOD_EMOTES[mood].emote).toBeTruthy();
      expect(MOOD_EMOTES[mood].description).toBeTruthy();
    }
  });
});
