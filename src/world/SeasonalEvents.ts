/** Type of seasonal event that can occur during gameplay. */
export type SeasonalEventType = 'spring_festival' | 'summer_bounty' | 'autumn_harvest' | 'winter_solstice';

/** Effects applied to gameplay while a seasonal event is active. */
export interface SeasonalEventEffects {
  /** Multiplied against hunger drain rate. */
  hungerDrainModifier: number;
  /** Multiplied against energy drain rate. */
  energyDrainModifier: number;
  /** Added to social recovery each tick. */
  socialBonus: number;
  /** Multiplied against food respawn time (lower = faster). */
  foodRegrowthModifier: number;
  /** Multiplied against XP gains. */
  skillXPModifier: number;
}

/** A seasonal event that affects gameplay for a limited duration. */
export interface SeasonalEvent {
  type: SeasonalEventType;
  name: string;
  description: string;
  icon: string;
  active: boolean;
  startTick: number;
  /** How many ticks the event lasts. */
  duration: number;
  effects: SeasonalEventEffects;
}

/** Mapping from season name to its corresponding event type. */
const SEASON_TO_EVENT: Record<string, SeasonalEventType> = {
  spring: 'spring_festival',
  summer: 'summer_bounty',
  autumn: 'autumn_harvest',
  winter: 'winter_solstice',
};

/** Predefined event definitions keyed by event type. */
export const EVENT_DEFINITIONS: Record<SeasonalEventType, Omit<SeasonalEvent, 'active' | 'startTick'>> = {
  spring_festival: {
    type: 'spring_festival',
    name: 'Spring Festival',
    description: 'New life brings joy!',
    icon: '🌸',
    duration: 200,
    effects: {
      hungerDrainModifier: 0.8,
      energyDrainModifier: 0.9,
      socialBonus: 0.005,
      foodRegrowthModifier: 0.7,
      skillXPModifier: 1.2,
    },
  },
  summer_bounty: {
    type: 'summer_bounty',
    name: 'Summer Bounty',
    description: 'Abundant resources!',
    icon: '☀️',
    duration: 300,
    effects: {
      hungerDrainModifier: 0.7,
      energyDrainModifier: 1.0,
      socialBonus: 0.0,
      foodRegrowthModifier: 0.5,
      skillXPModifier: 1.0,
    },
  },
  autumn_harvest: {
    type: 'autumn_harvest',
    name: 'Autumn Harvest',
    description: 'Time to gather!',
    icon: '🍂',
    duration: 200,
    effects: {
      hungerDrainModifier: 0.9,
      energyDrainModifier: 0.9,
      socialBonus: 0.003,
      foodRegrowthModifier: 0.8,
      skillXPModifier: 1.3,
    },
  },
  winter_solstice: {
    type: 'winter_solstice',
    name: 'Winter Solstice',
    description: 'The community gathers for warmth',
    icon: '❄️',
    duration: 150,
    effects: {
      hungerDrainModifier: 1.1,
      energyDrainModifier: 1.1,
      socialBonus: 0.01,
      foodRegrowthModifier: 1.2,
      skillXPModifier: 1.1,
    },
  },
};

/** Manages seasonal events, triggering them on season changes and tracking duration. */
export class SeasonalEventManager {
  private currentEvent: SeasonalEvent | null = null;
  private lastSeason: string = '';
  private eventTriggered: boolean = false;

  /**
   * Update the event manager each tick.
   * Starts a new event when the season changes and no event has been triggered yet.
   * Deactivates the event once its duration expires.
   * @param season - The current season name.
   * @param tick - The current simulation tick.
   * @returns The newly started event, or null if no new event was started.
   */
  update(season: string, tick: number): SeasonalEvent | null {
    // Reset trigger flag when season changes
    if (season !== this.lastSeason) {
      this.lastSeason = season;
      this.eventTriggered = false;
    }

    // Deactivate expired events
    if (this.currentEvent && this.currentEvent.active) {
      if (tick - this.currentEvent.startTick >= this.currentEvent.duration) {
        this.currentEvent.active = false;
      }
    }

    // Trigger a new event if we haven't already this season
    if (!this.eventTriggered) {
      const eventType = SEASON_TO_EVENT[season];
      if (eventType) {
        const def = EVENT_DEFINITIONS[eventType];
        this.currentEvent = {
          ...def,
          effects: { ...def.effects },
          active: true,
          startTick: tick,
        };
        this.eventTriggered = true;
        return this.currentEvent;
      }
    }

    return null;
  }

  /** Returns the current event if it is active, or null. */
  getCurrentEvent(): SeasonalEvent | null {
    if (this.currentEvent && this.currentEvent.active) {
      return this.currentEvent;
    }
    return null;
  }

  /** Returns true if there is an active event. */
  isEventActive(): boolean {
    return this.currentEvent !== null && this.currentEvent.active;
  }

  /** Returns the active event's effects, or null if no event is active. */
  getEffects(): SeasonalEvent['effects'] | null {
    if (this.currentEvent && this.currentEvent.active) {
      return this.currentEvent.effects;
    }
    return null;
  }
}
