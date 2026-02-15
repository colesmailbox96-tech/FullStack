export interface PopulationSnapshot {
  tick: number;
  alive: number;
  born: number;
  died: number;
}

export interface PopulationSummary {
  currentPopulation: number;
  peakPopulation: number;
  totalBirths: number;
  totalDeaths: number;
  averageLifespan: number;
  birthRate: number;
  deathRate: number;
  avgHunger: number;
  avgEnergy: number;
  avgSocial: number;
  avgSafety: number;
  avgCuriosity: number;
  skillDistribution: Record<string, number>;
}

interface NPCStats {
  needs: {
    hunger: number;
    energy: number;
    social: number;
    safety: number;
    curiosity: number;
  };
  skills: {
    foraging: number;
    building: number;
    crafting: number;
    socializing: number;
    exploring: number;
  };
}

const MAX_SNAPSHOTS = 500;
const MAX_LIFESPANS = 100;

export class PopulationTracker {
  private snapshots: PopulationSnapshot[];
  private totalBirths: number;
  private totalDeaths: number;
  private lifespans: number[];
  private peakPopulation: number;

  constructor() {
    this.snapshots = [];
    this.totalBirths = 0;
    this.totalDeaths = 0;
    this.lifespans = [];
    this.peakPopulation = 0;
  }

  recordTick(tick: number, alive: number, births: number, deaths: number): void {
    this.snapshots.push({ tick, alive, born: births, died: deaths });
    if (this.snapshots.length > MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }
    this.totalBirths += births;
    this.totalDeaths += deaths;
    if (alive > this.peakPopulation) {
      this.peakPopulation = alive;
    }
  }

  recordDeath(ageAtDeath: number): void {
    this.lifespans.push(ageAtDeath);
    if (this.lifespans.length > MAX_LIFESPANS) {
      this.lifespans.shift();
    }
  }

  getSummary(currentNPCs: NPCStats[]): PopulationSummary {
    const currentPopulation = currentNPCs.length;
    const averageLifespan =
      this.lifespans.length > 0
        ? this.lifespans.reduce((sum, v) => sum + v, 0) / this.lifespans.length
        : 0;

    const tickSpan = this.getTickSpan();
    const birthRate = tickSpan > 0 ? (this.totalBirths / tickSpan) * 1000 : 0;
    const deathRate = tickSpan > 0 ? (this.totalDeaths / tickSpan) * 1000 : 0;

    const avgNeeds = this.averageNeeds(currentNPCs);
    const skillDistribution = this.averageSkills(currentNPCs);

    return {
      currentPopulation,
      peakPopulation: this.peakPopulation,
      totalBirths: this.totalBirths,
      totalDeaths: this.totalDeaths,
      averageLifespan,
      birthRate,
      deathRate,
      avgHunger: avgNeeds.hunger,
      avgEnergy: avgNeeds.energy,
      avgSocial: avgNeeds.social,
      avgSafety: avgNeeds.safety,
      avgCuriosity: avgNeeds.curiosity,
      skillDistribution,
    };
  }

  getPopulationHistory(): PopulationSnapshot[] {
    return [...this.snapshots];
  }

  getPeakPopulation(): number {
    return this.peakPopulation;
  }

  private getTickSpan(): number {
    if (this.snapshots.length < 2) return 0;
    return this.snapshots[this.snapshots.length - 1].tick - this.snapshots[0].tick;
  }

  private averageNeeds(npcs: NPCStats[]): Record<string, number> {
    if (npcs.length === 0) {
      return { hunger: 0, energy: 0, social: 0, safety: 0, curiosity: 0 };
    }
    const totals = { hunger: 0, energy: 0, social: 0, safety: 0, curiosity: 0 };
    for (const npc of npcs) {
      totals.hunger += npc.needs.hunger;
      totals.energy += npc.needs.energy;
      totals.social += npc.needs.social;
      totals.safety += npc.needs.safety;
      totals.curiosity += npc.needs.curiosity;
    }
    const n = npcs.length;
    return {
      hunger: totals.hunger / n,
      energy: totals.energy / n,
      social: totals.social / n,
      safety: totals.safety / n,
      curiosity: totals.curiosity / n,
    };
  }

  private averageSkills(npcs: NPCStats[]): Record<string, number> {
    if (npcs.length === 0) {
      return { foraging: 0, building: 0, crafting: 0, socializing: 0, exploring: 0 };
    }
    const totals = { foraging: 0, building: 0, crafting: 0, socializing: 0, exploring: 0 };
    for (const npc of npcs) {
      totals.foraging += npc.skills.foraging;
      totals.building += npc.skills.building;
      totals.crafting += npc.skills.crafting;
      totals.socializing += npc.skills.socializing;
      totals.exploring += npc.skills.exploring;
    }
    const n = npcs.length;
    return {
      foraging: totals.foraging / n,
      building: totals.building / n,
      crafting: totals.crafting / n,
      socializing: totals.socializing / n,
      exploring: totals.exploring / n,
    };
  }
}
