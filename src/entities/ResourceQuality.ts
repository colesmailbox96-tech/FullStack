/**
 * Resource quality system for the pixel world simulator.
 *
 * When NPCs produce resources (foraging, crafting, building), the output
 * quality depends on their skill level. Higher skill gives better odds
 * of producing fine or excellent resources, which provide effectiveness
 * multipliers when consumed or used.
 *
 * Quality tiers:
 * - poor      (0.6×) — subpar output, common at low skill
 * - normal    (1.0×) — baseline quality
 * - fine      (1.3×) — above-average, needs moderate skill
 * - excellent (1.6×) — top-tier, rare even at high skill
 */

export type QualityTier = 'poor' | 'normal' | 'fine' | 'excellent';

export interface QualityInfo {
  tier: QualityTier;
  multiplier: number;
  label: string;
}

export const QUALITY_TIERS: Record<QualityTier, QualityInfo> = {
  poor:      { tier: 'poor',      multiplier: 0.6, label: '△ Poor' },
  normal:    { tier: 'normal',    multiplier: 1.0, label: 'Normal' },
  fine:      { tier: 'fine',      multiplier: 1.3, label: '⭐ Fine' },
  excellent: { tier: 'excellent', multiplier: 1.6, label: '✦ Excellent' },
};

/**
 * Probability tables at three skill breakpoints.
 * Order: [poor, normal, fine, excellent]
 */
const SKILL_0:   readonly number[] = [0.30, 0.60, 0.08, 0.02];
const SKILL_05:  readonly number[] = [0.10, 0.50, 0.30, 0.10];
const SKILL_1:   readonly number[] = [0.02, 0.28, 0.45, 0.25];

const TIER_ORDER: readonly QualityTier[] = ['poor', 'normal', 'fine', 'excellent'];

/**
 * Linearly interpolate between two values.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Build the probability distribution for a given skill level by
 * linearly interpolating between the three breakpoint tables.
 */
function getProbabilities(skillLevel: number): number[] {
  const clamped = Math.max(0, Math.min(1, skillLevel));

  if (clamped <= 0.5) {
    const t = clamped / 0.5;
    return SKILL_0.map((v, i) => lerp(v, SKILL_05[i], t));
  }

  const t = (clamped - 0.5) / 0.5;
  return SKILL_05.map((v, i) => lerp(v, SKILL_1[i], t));
}

/**
 * Determine the quality tier of a produced resource based on the NPC's
 * skill level and a random roll.
 *
 * @param skillLevel 0–1 proficiency (clamped internally)
 * @param rngNext    function returning a uniform random number in [0, 1)
 */
export function determineQuality(skillLevel: number, rngNext: () => number): QualityTier {
  const probs = getProbabilities(skillLevel);
  const roll = rngNext();

  let cumulative = 0;
  for (let i = 0; i < TIER_ORDER.length; i++) {
    cumulative += probs[i];
    if (roll < cumulative) {
      return TIER_ORDER[i];
    }
  }

  // Fallback for floating-point edge case (roll ≈ 1.0)
  return TIER_ORDER[TIER_ORDER.length - 1];
}

/**
 * Get the effectiveness multiplier for a quality tier.
 */
export function getQualityMultiplier(tier: QualityTier): number {
  return QUALITY_TIERS[tier].multiplier;
}

/**
 * Get the display label for a quality tier.
 */
export function getQualityLabel(tier: QualityTier): string {
  return QUALITY_TIERS[tier].label;
}
