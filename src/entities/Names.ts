/**
 * NPC naming system for the pixel world simulator.
 *
 * Generates personality-flavored names by combining a title prefix
 * (derived from the NPC's dominant trait) with a gender-neutral
 * fantasy first name.
 */

import type { Personality, PersonalityTrait } from './Personality';

const FIRST_NAMES: readonly string[] = [
  'Alder', 'Ash', 'Briar', 'Cael', 'Darcy', 'Elara', 'Fenn', 'Gale',
  'Haven', 'Idris', 'Juniper', 'Kai', 'Lark', 'Maren', 'Nyx', 'Onyx',
  'Pax', 'Quinn', 'Rowan', 'Sage', 'Thorne', 'Umber', 'Vale', 'Wren',
  'Zephyr', 'Ember', 'Flint', 'Glen', 'Haze', 'Ivy', 'Jasper', 'Kestrel',
  'Lyric', 'Moss', 'Nova', 'Orin', 'Pike', 'Reed', 'Sable', 'Tarn',
] as const;

/** Title prefixes grouped by the personality trait they map to. */
const TITLE_PREFIXES: Record<PersonalityTrait, readonly string[]> = {
  bravery:         ['Bold', 'Brave', 'Fearless', 'Valiant', 'Daring'],
  sociability:     ['Gentle', 'Warm', 'Kind', 'Friendly', 'Charming'],
  curiosity:       ['Curious', 'Keen', 'Bright', 'Clever', 'Watchful'],
  industriousness: ['Steady', 'Diligent', 'Tireless', 'Hardy', 'Resolute'],
  craftiness:      ['Swift', 'Sly', 'Nimble', 'Shrewd', 'Witty'],
};

/**
 * Determine the dominant personality trait (highest value).
 * Ties are broken by declaration order.
 */
function dominantTrait(traits: Personality): PersonalityTrait {
  const keys: PersonalityTrait[] = [
    'bravery', 'sociability', 'curiosity', 'industriousness', 'craftiness',
  ];
  let best: PersonalityTrait = keys[0];
  for (let i = 1; i < keys.length; i++) {
    if (traits[keys[i]] > traits[best]) {
      best = keys[i];
    }
  }
  return best;
}

/**
 * Generate a full NPC name like "Bold Finn" or "Curious Elara".
 *
 * @param personalityTraits - The NPC's personality values (0-1 each).
 * @param rngNext           - A deterministic random function returning [0, 1).
 */
export function generateNPCName(
  personalityTraits: Personality,
  rngNext: () => number,
): string {
  const nameIndex = Math.floor(rngNext() * FIRST_NAMES.length);
  const firstName = FIRST_NAMES[nameIndex];

  const trait = dominantTrait(personalityTraits);
  const prefixes = TITLE_PREFIXES[trait];
  const prefixIndex = Math.floor(rngNext() * prefixes.length);
  const title = prefixes[prefixIndex];

  return `${title} ${firstName}`;
}

/**
 * Extract just the first-name portion from a full NPC name.
 *
 * @example getNameOnly("Bold Fenn") // "Fenn"
 */
export function getNameOnly(fullName: string): string {
  const parts = fullName.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : fullName;
}
