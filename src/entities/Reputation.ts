/**
 * Reputation system for tracking NPC standing in the pixel world.
 *
 * NPCs earn reputation through helping others, trading, and crafting.
 * Reputation affects trade willingness — higher reputation means
 * better trade modifiers, while negative reputation reduces it.
 *
 * Score is clamped to [-20, 100] and maps to tiers:
 * - < 0:    unknown   (trade modifier 0.5)
 * - 0-19:   neutral   (trade modifier 1.0)
 * - 20-49:  liked     (trade modifier 1.2)
 * - 50-79:  respected (trade modifier 1.4)
 * - >= 80:  renowned  (trade modifier 1.8)
 */

export type ReputationTier = 'unknown' | 'neutral' | 'liked' | 'respected' | 'renowned';

export interface ReputationInfo {
  tier: ReputationTier;
  score: number;
  label: string;
  tradeModifier: number;
}

/** Reputation gained per completed trade. */
export const REPUTATION_PER_TRADE = 3;

/** Reputation gained per crafted item. */
export const REPUTATION_PER_CRAFT = 2;

/** Reputation gained per social interaction. */
export const REPUTATION_PER_SOCIAL = 1;

const MAX_SCORE = 100;
const MIN_SCORE = -20;

const TRADE_MODIFIERS: Record<ReputationTier, number> = {
  unknown: 0.5,
  neutral: 1.0,
  liked: 1.2,
  respected: 1.4,
  renowned: 1.8,
};

export class ReputationSystem {
  private score: number;

  constructor() {
    this.score = 0;
  }

  /**
   * Add reputation for a positive action. Score is capped at 100.
   */
  addReputation(amount: number, _reason: string): void {
    this.score = Math.min(MAX_SCORE, this.score + amount);
  }

  /**
   * Remove reputation for a negative action. Score floor is -20.
   */
  removeReputation(amount: number, _reason: string): void {
    this.score = Math.max(MIN_SCORE, this.score - amount);
  }

  /**
   * Get the current reputation score.
   */
  getScore(): number {
    return this.score;
  }

  /**
   * Map the current score to a reputation tier.
   */
  getTier(): ReputationTier {
    if (this.score < 0) return 'unknown';
    if (this.score < 20) return 'neutral';
    if (this.score < 50) return 'liked';
    if (this.score < 80) return 'respected';
    return 'renowned';
  }

  /**
   * Get the trade willingness modifier for the current tier.
   */
  getTradeModifier(): number {
    return TRADE_MODIFIERS[this.getTier()];
  }

  /**
   * Get a human-readable label for the current tier.
   */
  getLabel(): string {
    const tier = this.getTier();
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  }

  /**
   * Get a complete snapshot of the current reputation state.
   */
  getInfo(): ReputationInfo {
    return {
      tier: this.getTier(),
      score: this.score,
      label: this.getLabel(),
      tradeModifier: this.getTradeModifier(),
    };
  }
}
