/**
 * Achievement system that tracks world milestones and notable events.
 *
 * Achievements are unlocked when specific conditions are met during
 * simulation and provide a sense of progression and discovery.
 * Each achievement has a unique id, title, description, and the tick
 * it was unlocked at.
 */

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: number | null;
}

export type AchievementId =
  | 'first_shelter'
  | 'population_30'
  | 'survived_storm'
  | 'first_friendship'
  | 'master_forager'
  | 'explorer_100'
  | 'winter_survived'
  | 'population_peak';

const ACHIEVEMENT_DEFINITIONS: Record<AchievementId, Omit<Achievement, 'unlockedAt'>> = {
  first_shelter: {
    id: 'first_shelter',
    title: 'Home Sweet Home',
    description: 'An NPC crafted the first campfire shelter',
    icon: '🏕️',
  },
  population_30: {
    id: 'population_30',
    title: 'Growing Village',
    description: 'Population reached 30 NPCs',
    icon: '🏘️',
  },
  survived_storm: {
    id: 'survived_storm',
    title: 'Weathering the Storm',
    description: 'All NPCs survived a storm',
    icon: '⛈️',
  },
  first_friendship: {
    id: 'first_friendship',
    title: 'Best Friends',
    description: 'Two NPCs formed a close friendship',
    icon: '🤝',
  },
  master_forager: {
    id: 'master_forager',
    title: 'Master Forager',
    description: 'An NPC reached master-level foraging skill',
    icon: '🌿',
  },
  explorer_100: {
    id: 'explorer_100',
    title: 'Cartographer',
    description: 'An NPC explored 100 unique tiles',
    icon: '🗺️',
  },
  winter_survived: {
    id: 'winter_survived',
    title: 'Winter Is Over',
    description: 'The village survived its first winter',
    icon: '❄️',
  },
  population_peak: {
    id: 'population_peak',
    title: 'Thriving Community',
    description: 'Population reached 40 NPCs',
    icon: '🎉',
  },
};

export class AchievementSystem {
  private achievements: Map<AchievementId, Achievement>;
  private peakPopulation: number;
  private stormActive: boolean;
  private stormStartPopulation: number;
  private passedFirstWinter: boolean;

  constructor() {
    this.achievements = new Map();
    for (const [id, def] of Object.entries(ACHIEVEMENT_DEFINITIONS)) {
      this.achievements.set(id as AchievementId, { ...def, unlockedAt: null });
    }
    this.peakPopulation = 0;
    this.stormActive = false;
    this.stormStartPopulation = 0;
    this.passedFirstWinter = false;
  }

  /**
   * Check and unlock achievements based on current simulation state.
   */
  check(params: {
    tick: number;
    aliveCount: number;
    weather: string;
    season: string;
    craftedCampfire: boolean;
    hasCloseFriendship: boolean;
    hasMasterForager: boolean;
    maxTilesExplored: number;
  }): Achievement[] {
    const newlyUnlocked: Achievement[] = [];
    const unlock = (id: AchievementId) => {
      const ach = this.achievements.get(id);
      if (ach && ach.unlockedAt === null) {
        ach.unlockedAt = params.tick;
        newlyUnlocked.push(ach);
      }
    };

    // Track peak population
    if (params.aliveCount > this.peakPopulation) {
      this.peakPopulation = params.aliveCount;
    }

    // First shelter
    if (params.craftedCampfire) {
      unlock('first_shelter');
    }

    // Population milestones
    if (params.aliveCount >= 30) {
      unlock('population_30');
    }
    if (params.aliveCount >= 40) {
      unlock('population_peak');
    }

    // Storm survival
    if (params.weather === 'storm' && !this.stormActive) {
      this.stormActive = true;
      this.stormStartPopulation = params.aliveCount;
    }
    if (params.weather !== 'storm' && this.stormActive) {
      this.stormActive = false;
      if (params.aliveCount >= this.stormStartPopulation) {
        unlock('survived_storm');
      }
    }

    // Close friendship
    if (params.hasCloseFriendship) {
      unlock('first_friendship');
    }

    // Master forager
    if (params.hasMasterForager) {
      unlock('master_forager');
    }

    // Explorer
    if (params.maxTilesExplored >= 100) {
      unlock('explorer_100');
    }

    // Winter survived — track transition from winter to spring
    if (params.season === 'winter') {
      this.passedFirstWinter = true;
    }
    if (this.passedFirstWinter && params.season === 'spring') {
      unlock('winter_survived');
      this.passedFirstWinter = false; // reset so it can track again
    }

    return newlyUnlocked;
  }

  /**
   * Get all achievements (locked and unlocked).
   */
  getAll(): Achievement[] {
    return [...this.achievements.values()];
  }

  /**
   * Get only unlocked achievements.
   */
  getUnlocked(): Achievement[] {
    return this.getAll().filter(a => a.unlockedAt !== null);
  }

  /**
   * Get the total number of achievements.
   */
  getTotal(): number {
    return this.achievements.size;
  }

  /**
   * Get peak population observed.
   */
  getPeakPopulation(): number {
    return this.peakPopulation;
  }
}
