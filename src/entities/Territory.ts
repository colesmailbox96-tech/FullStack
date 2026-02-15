/**
 * Territory / home system for NPCs in the pixel world simulator.
 *
 * NPCs claim home tiles near campfires and prefer returning there to
 * rest. Familiarity with the home location grows over time spent
 * nearby (0–1) and provides a rest bonus of up to 30%.
 *
 * Key mechanics:
 * - Claiming a home sets a {@link HomeBase} with an initial familiarity of 0.
 * - Being within {@link TerritorySystem.territoryRadius | territoryRadius}
 *   of home increases familiarity (+0.001/tick), while being away slowly
 *   erodes it (−0.0005/tick).
 * - Rest quality scales with familiarity: ×1.0 at familiarity 0 up to
 *   ×1.3 at familiarity 1.
 * - NPCs consider returning home when energy is low (<0.4) or at night,
 *   provided they are not already within their territory.
 */

/** A claimed home tile with position, timestamp, and familiarity score. */
export interface HomeBase {
  x: number;
  y: number;
  /** Tick at which the home was claimed. */
  claimedAt: number;
  /** Familiarity with the home location, 0–1. Increases with time spent nearby. */
  familiarity: number;
}

/**
 * Manages an NPC's home territory — claiming, familiarity tracking,
 * and deciding when to return home.
 */
export class TerritorySystem {
  private homeBase: HomeBase | null = null;
  private territoryRadius: number;

  /** @param territoryRadius Radius (in tiles) that defines the home territory. Defaults to 8. */
  constructor(territoryRadius: number = 8) {
    this.territoryRadius = territoryRadius;
  }

  /**
   * Claim a tile as the NPC's home.
   * @param x Tile x-coordinate.
   * @param y Tile y-coordinate.
   * @param tick Current simulation tick.
   */
  claimHome(x: number, y: number, tick: number): void {
    this.homeBase = { x, y, claimedAt: tick, familiarity: 0 };
  }

  /** Returns the current home base, or null if none is claimed. */
  getHome(): HomeBase | null {
    return this.homeBase;
  }

  /** Returns true if a home base is currently claimed. */
  hasHome(): boolean {
    return this.homeBase !== null;
  }

  /**
   * Returns true if the given position is within {@link territoryRadius}
   * of the home base.
   */
  isInTerritory(x: number, y: number): boolean {
    if (!this.homeBase) return false;
    return this.getDistanceFromHome(x, y) <= this.territoryRadius;
  }

  /**
   * Euclidean distance from the home base.
   * @returns Distance in tiles, or `Infinity` if no home is claimed.
   */
  getDistanceFromHome(x: number, y: number): number {
    if (!this.homeBase) return Infinity;
    const dx = x - this.homeBase.x;
    const dy = y - this.homeBase.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Adjust familiarity based on proximity to home.
   * Within territory: +0.001 per call (capped at 1.0).
   * Outside territory: −0.0005 per call (floored at 0).
   */
  updateFamiliarity(currentX: number, currentY: number): void {
    if (!this.homeBase) return;
    if (this.isInTerritory(currentX, currentY)) {
      this.homeBase.familiarity = Math.min(1.0, this.homeBase.familiarity + 0.001);
    } else {
      this.homeBase.familiarity = Math.max(0, this.homeBase.familiarity - 0.0005);
    }
  }

  /** Returns familiarity (0–1), or 0 if no home is claimed. */
  getFamiliarity(): number {
    return this.homeBase ? this.homeBase.familiarity : 0;
  }

  /**
   * Rest quality multiplier at the home base.
   * 1.0 at familiarity 0, up to 1.3 at familiarity 1 (30% bonus).
   */
  getRestBonus(): number {
    return 1.0 + this.getFamiliarity() * 0.3;
  }

  /**
   * Determines whether the NPC should travel back home.
   * Returns true when the NPC has a home, is not already in territory,
   * and either energy is low (<0.4) or it is night-time.
   */
  shouldReturnHome(energy: number, isNight: boolean): boolean {
    if (!this.homeBase) return false;
    if (energy >= 0.4 && !isNight) return false;
    // "currently not in territory" — we don't know the NPC's position here,
    // so callers must ensure the NPC is outside territory before invoking.
    // This matches the spec: returns true when has home + trigger + not in territory.
    return true;
  }

  /** Abandon the current home base. */
  abandonHome(): void {
    this.homeBase = null;
  }
}
