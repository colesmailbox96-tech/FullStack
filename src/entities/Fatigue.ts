/**
 * Fatigue system for NPCs in the pixel world simulator.
 *
 * NPCs accumulate fatigue from continuous work, reducing their
 * efficiency over time. They must rest to recover. Resting in a
 * shelter provides faster recovery than resting outdoors.
 *
 * Fatigue is scored 0–1 and mapped to a named level, each with
 * its own efficiency modifier:
 *
 * - <0.15   rested      (×1.10 efficiency — slight boost)
 * - 0.15–0.35  normal   (×1.00 efficiency)
 * - 0.35–0.60  tired    (×0.85 efficiency)
 * - 0.60–0.85  exhausted (×0.65 efficiency)
 * - >=0.85  burnt_out   (×0.40 efficiency)
 *
 * Working for more than 100 consecutive ticks doubles fatigue gain
 * (overwork penalty).
 */

/** All possible fatigue levels, from best to worst. */
export type FatigueLevel = 'rested' | 'normal' | 'tired' | 'exhausted' | 'burnt_out';

/** Describes a fatigue state and its effect on efficiency. */
export interface FatigueInfo {
  level: FatigueLevel;
  value: number;
  efficiencyModifier: number;
  label: string;
}

/** Fatigue gain per tick for each known action type. */
const FATIGUE_RATES: Record<string, number> = {
  FORAGE: 0.002,
  GATHER: 0.003,
  CRAFT: 0.004,
  EXPLORE: 0.001,
  SOCIALIZE: 0.0005,
};

/** Human-readable labels for each fatigue level. */
const LEVEL_LABELS: Record<FatigueLevel, string> = {
  rested: 'Well rested — peak performance',
  normal: 'Normal — steady pace',
  tired: 'Tired — slowing down',
  exhausted: 'Exhausted — needs rest soon',
  burnt_out: 'Burnt out — barely functional',
};

/** Efficiency multiplier for each fatigue level. */
const EFFICIENCY: Record<FatigueLevel, number> = {
  rested: 1.1,
  normal: 1.0,
  tired: 0.85,
  exhausted: 0.65,
  burnt_out: 0.4,
};

/** Consecutive work ticks before the overwork penalty kicks in. */
const OVERWORK_THRESHOLD = 100;

/**
 * Tracks an NPC's fatigue over time.
 *
 * Call {@link addWorkFatigue} each tick the NPC works and
 * {@link rest} each tick the NPC rests. Query the current state
 * with {@link getInfo}, {@link getLevel}, and {@link needsRest}.
 */
export class FatigueTracker {
  /** Current fatigue value, clamped to 0–1. */
  private fatigue: number = 0;

  /** Number of consecutive work ticks without rest. */
  private consecutiveWorkTicks: number = 0;

  /**
   * Increase fatigue based on the type of work performed.
   *
   * Unknown action types add zero fatigue. If the NPC has been
   * working for more than {@link OVERWORK_THRESHOLD} consecutive
   * ticks the fatigue gain is doubled.
   */
  addWorkFatigue(actionType: string): void {
    const base = FATIGUE_RATES[actionType] ?? 0.0;
    const gain = this.consecutiveWorkTicks > OVERWORK_THRESHOLD ? base * 2 : base;

    if (gain > 0) {
      this.consecutiveWorkTicks++;
    }

    this.fatigue = Math.min(1.0, this.fatigue + gain);
  }

  /**
   * Reduce fatigue during a rest tick.
   *
   * Shelter doubles the recovery rate. Resets the consecutive
   * work tick counter.
   */
  rest(inShelter: boolean): void {
    const recovery = inShelter ? 0.008 : 0.004;
    this.fatigue = Math.max(0, this.fatigue - recovery);
    this.consecutiveWorkTicks = 0;
  }

  /** Return the raw fatigue value (0–1). */
  getFatigue(): number {
    return this.fatigue;
  }

  /** Map the current fatigue value to a named level. */
  getLevel(): FatigueLevel {
    if (this.fatigue < 0.15) return 'rested';
    if (this.fatigue < 0.35) return 'normal';
    if (this.fatigue < 0.6) return 'tired';
    if (this.fatigue < 0.85) return 'exhausted';
    return 'burnt_out';
  }

  /** Return the efficiency multiplier for the current fatigue level. */
  getEfficiencyModifier(): number {
    return EFFICIENCY[this.getLevel()];
  }

  /** Return a full snapshot of the current fatigue state. */
  getInfo(): FatigueInfo {
    const level = this.getLevel();
    return {
      level,
      value: this.fatigue,
      efficiencyModifier: EFFICIENCY[level],
      label: LEVEL_LABELS[level],
    };
  }

  /** Returns true when the NPC should seek rest (fatigue >= 0.6). */
  needsRest(): boolean {
    return this.fatigue >= 0.6;
  }
}
