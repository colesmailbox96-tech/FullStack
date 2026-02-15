/**
 * Status effects system for NPCs in the pixel world simulator.
 *
 * Status effects are temporary modifiers applied to NPCs based on their
 * current needs, environment, and social context. They adjust drain rates
 * for hunger, energy, and social needs, as well as skill XP gain.
 *
 * Effects tick down each update and are automatically removed when expired.
 */

import type { Needs } from './Needs';

/** All possible status effect types an NPC can have. */
export type StatusEffectType =
  | 'well_fed'
  | 'exhausted'
  | 'inspired'
  | 'lonely'
  | 'sheltered'
  | 'cold'
  | 'energized'
  | 'social_butterfly';

/** A single active status effect with a remaining duration. */
export interface StatusEffect {
  type: StatusEffectType;
  remainingTicks: number;
}

/**
 * Manages the set of active status effects on an NPC.
 *
 * Handles adding, removing, ticking, and computing aggregate
 * modifier values from all active effects.
 */
export class StatusEffectManager {
  private effects: StatusEffect[] = [];

  /** Adds an effect, replacing any existing effect of the same type. */
  addEffect(type: StatusEffectType, duration: number): void {
    this.removeEffect(type);
    this.effects.push({ type, remainingTicks: duration });
  }

  /** Removes an effect by type, if present. */
  removeEffect(type: StatusEffectType): void {
    this.effects = this.effects.filter(e => e.type !== type);
  }

  /** Returns true if the given effect type is currently active. */
  hasEffect(type: StatusEffectType): boolean {
    return this.effects.some(e => e.type === type);
  }

  /** Returns a shallow copy of all active effects. */
  getEffects(): StatusEffect[] {
    return [...this.effects];
  }

  /** Returns the type strings of all active effects. */
  getActiveEffectTypes(): StatusEffectType[] {
    return this.effects.map(e => e.type);
  }

  /** Decrements all remaining ticks and removes expired effects. */
  update(): void {
    for (const effect of this.effects) {
      effect.remainingTicks--;
    }
    this.effects = this.effects.filter(e => e.remainingTicks > 0);
  }

  /**
   * Computes the aggregate hunger drain modifier.
   * well_fed reduces drain (×0.7), cold increases it (×1.3).
   */
  getHungerDrainModifier(): number {
    let modifier = 1.0;
    if (this.hasEffect('well_fed')) modifier *= 0.7;
    if (this.hasEffect('cold')) modifier *= 1.3;
    return modifier;
  }

  /**
   * Computes the aggregate energy drain modifier.
   * energized reduces drain (×0.7), exhausted increases it (×1.5).
   */
  getEnergyDrainModifier(): number {
    let modifier = 1.0;
    if (this.hasEffect('energized')) modifier *= 0.7;
    if (this.hasEffect('exhausted')) modifier *= 1.5;
    return modifier;
  }

  /**
   * Computes the aggregate social drain modifier.
   * social_butterfly reduces drain (×0.5), lonely increases it (×1.5).
   */
  getSocialDrainModifier(): number {
    let modifier = 1.0;
    if (this.hasEffect('social_butterfly')) modifier *= 0.5;
    if (this.hasEffect('lonely')) modifier *= 1.5;
    return modifier;
  }

  /**
   * Computes the skill XP gain modifier.
   * inspired grants a ×1.5 bonus.
   */
  getSkillXPModifier(): number {
    let modifier = 1.0;
    if (this.hasEffect('inspired')) modifier *= 1.5;
    return modifier;
  }
}

/**
 * Evaluates current NPC state and environment to determine which
 * status effects should be added or removed.
 *
 * @param needs        - Current NPC needs (hunger, energy, social, curiosity, safety)
 * @param isInShelter  - Whether the NPC is currently inside a shelter
 * @param nearbyNPCCount - Number of other NPCs nearby
 * @param isStorm      - Whether a storm is currently active
 * @param isNight      - Whether it is currently nighttime
 * @returns An object with arrays of effects to add and remove
 */
export function evaluateStatusEffects(
  needs: Needs,
  isInShelter: boolean,
  nearbyNPCCount: number,
  isStorm: boolean,
  isNight: boolean,
): { add: StatusEffectType[]; remove: StatusEffectType[] } {
  const add: StatusEffectType[] = [];
  const remove: StatusEffectType[] = [];

  // well_fed
  if (needs.hunger > 0.8) add.push('well_fed');
  else if (needs.hunger <= 0.5) remove.push('well_fed');

  // exhausted
  if (needs.energy < 0.2) add.push('exhausted');
  else if (needs.energy >= 0.5) remove.push('exhausted');

  // inspired — all needs above 0.6
  const allHigh =
    needs.hunger > 0.6 &&
    needs.energy > 0.6 &&
    needs.social > 0.6 &&
    needs.curiosity > 0.6 &&
    needs.safety > 0.6;
  const anyLow =
    needs.hunger < 0.3 ||
    needs.energy < 0.3 ||
    needs.social < 0.3 ||
    needs.curiosity < 0.3 ||
    needs.safety < 0.3;
  if (allHigh) add.push('inspired');
  else if (anyLow) remove.push('inspired');

  // lonely
  if (needs.social < 0.25 && nearbyNPCCount === 0) add.push('lonely');
  else if (needs.social >= 0.4 || nearbyNPCCount > 0) remove.push('lonely');

  // sheltered
  if (isInShelter) add.push('sheltered');
  else remove.push('sheltered');

  // cold
  if ((isStorm || isNight) && !isInShelter) add.push('cold');
  else remove.push('cold');

  // energized
  if (needs.energy > 0.85) add.push('energized');
  else if (needs.energy <= 0.5) remove.push('energized');

  // social_butterfly
  if (needs.social > 0.8 && nearbyNPCCount >= 2) add.push('social_butterfly');
  else if (needs.social < 0.5 || nearbyNPCCount < 1) remove.push('social_butterfly');

  return { add, remove };
}
