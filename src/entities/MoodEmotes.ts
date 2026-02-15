/**
 * Mood emotes system for NPCs in the pixel world simulator.
 *
 * NPCs display emoji-like mood indicators based on their current
 * emotional state. Moods are derived from an NPC's needs and their
 * current action, with a priority system ensuring the most urgent
 * state is always shown first.
 *
 * Priority breakdown (highest wins):
 *
 * - 10  starving    hunger < 0.1
 * - 9   scared      safety < 0.15
 * - 8   sleepy      energy < 0.15
 * - 7   lonely      social < 0.2 (not socializing)
 * - 5   worried     any core need < 0.3
 * - 4   crafting    action is CRAFT
 * - 4   working     action is FORAGE or GATHER
 * - 3   curious     action is EXPLORE and curiosity < 0.4
 * - 2   joyful      all needs > 0.7
 * - 1   content     all needs > 0.4
 * - 0   neutral     default
 */

/** All possible mood types an NPC can display. */
export type MoodType =
  | 'joyful'
  | 'content'
  | 'neutral'
  | 'worried'
  | 'distressed'
  | 'starving'
  | 'sleepy'
  | 'lonely'
  | 'curious'
  | 'scared'
  | 'working'
  | 'crafting';

/** Describes a mood with its emote, priority, and human-readable description. */
export interface MoodEmote {
  mood: MoodType;
  emote: string;
  priority: number;
  description: string;
}

/** Static emote and description for every mood type. */
export const MOOD_EMOTES: Record<MoodType, Omit<MoodEmote, 'priority'>> = {
  joyful: { mood: 'joyful', emote: '😊', description: 'Feeling great!' },
  content: { mood: 'content', emote: '🙂', description: 'Doing well' },
  neutral: { mood: 'neutral', emote: '😐', description: 'Getting by' },
  worried: { mood: 'worried', emote: '😟', description: "Something's wrong" },
  distressed: { mood: 'distressed', emote: '😰', description: 'In trouble!' },
  starving: { mood: 'starving', emote: '🤢', description: 'Desperately hungry' },
  sleepy: { mood: 'sleepy', emote: '😴', description: 'Very tired' },
  lonely: { mood: 'lonely', emote: '😢', description: 'Feeling isolated' },
  curious: { mood: 'curious', emote: '🤔', description: 'Exploring the unknown' },
  scared: { mood: 'scared', emote: '😨', description: 'Feeling unsafe' },
  working: { mood: 'working', emote: '💪', description: 'Hard at work' },
  crafting: { mood: 'crafting', emote: '🔨', description: 'Crafting something' },
};

/** Hex color associated with each mood for UI rendering. */
const MOOD_COLORS: Record<MoodType, string> = {
  joyful: '#4CAF50',
  content: '#8BC34A',
  neutral: '#9E9E9E',
  worried: '#FF9800',
  distressed: '#F44336',
  starving: '#B71C1C',
  sleepy: '#7986CB',
  lonely: '#5C6BC0',
  curious: '#29B6F6',
  scared: '#FF5722',
  working: '#FFC107',
  crafting: '#795548',
};

/** NPC need values used for mood determination. */
interface MoodNeeds {
  hunger: number;
  energy: number;
  social: number;
  curiosity: number;
  safety: number;
}

/**
 * Build a {@link MoodEmote} from a mood type and priority value.
 */
function buildMoodEmote(mood: MoodType, priority: number): MoodEmote {
  const base = MOOD_EMOTES[mood];
  return { ...base, priority };
}

/**
 * Determine the most appropriate mood for an NPC based on their
 * current needs and action.
 *
 * Checks are evaluated in strict priority order (highest first).
 * The first matching condition wins.
 */
export function determineMood(needs: MoodNeeds, currentAction: string): MoodEmote {
  // Priority 10 — starving
  if (needs.hunger < 0.1) {
    return buildMoodEmote('starving', 10);
  }

  // Priority 9 — scared
  if (needs.safety < 0.15) {
    return buildMoodEmote('scared', 9);
  }

  // Priority 8 — sleepy
  if (needs.energy < 0.15) {
    return buildMoodEmote('sleepy', 8);
  }

  // Priority 7 — lonely (only when not socializing)
  if (needs.social < 0.2 && currentAction !== 'SOCIALIZE') {
    return buildMoodEmote('lonely', 7);
  }

  // Priority 5 — worried (any core need dipping low)
  if (needs.hunger < 0.3 || needs.energy < 0.3 || needs.safety < 0.3) {
    return buildMoodEmote('worried', 5);
  }

  // Priority 4 — crafting
  if (currentAction === 'CRAFT') {
    return buildMoodEmote('crafting', 4);
  }

  // Priority 4 — working
  if (currentAction === 'FORAGE' || currentAction === 'GATHER') {
    return buildMoodEmote('working', 4);
  }

  // Priority 3 — curious
  if (currentAction === 'EXPLORE' && needs.curiosity < 0.4) {
    return buildMoodEmote('curious', 3);
  }

  // Priority 2 — joyful (all needs above 0.7)
  if (
    needs.hunger > 0.7 &&
    needs.energy > 0.7 &&
    needs.social > 0.7 &&
    needs.curiosity > 0.7 &&
    needs.safety > 0.7
  ) {
    return buildMoodEmote('joyful', 2);
  }

  // Priority 1 — content (all needs above 0.4)
  if (
    needs.hunger > 0.4 &&
    needs.energy > 0.4 &&
    needs.social > 0.4 &&
    needs.curiosity > 0.4 &&
    needs.safety > 0.4
  ) {
    return buildMoodEmote('content', 1);
  }

  // Priority 0 — neutral (default)
  return buildMoodEmote('neutral', 0);
}

/**
 * Return just the emoji string for the given mood type.
 */
export function getEmoteString(mood: MoodType): string {
  return MOOD_EMOTES[mood].emote;
}

/**
 * Return the hex color associated with the given mood type.
 */
export function getMoodColor(mood: MoodType): string {
  return MOOD_COLORS[mood];
}
