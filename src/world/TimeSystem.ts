import { WorldConfig } from '../engine/Config';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type TimeOfDayPeriod = 'night' | 'dawn' | 'day' | 'dusk';

const TICKS_PER_DAY = 2400;
const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];

export class TimeSystem {
  tick: number;
  timeOfDay: number;
  day: number;
  season: Season;
  private config: WorldConfig;

  constructor(config: WorldConfig) {
    this.config = config;
    this.tick = 0;
    this.timeOfDay = 0.25; // start at dawn
    this.day = 0;
    this.season = 'spring';
  }

  update(): void {
    this.tick++;
    this.timeOfDay = (this.tick % TICKS_PER_DAY) / TICKS_PER_DAY;
    this.day = Math.floor(this.tick / TICKS_PER_DAY);

    const totalSeasonDays = this.config.seasonalCycleDays;
    const seasonIndex = Math.floor((this.day % (totalSeasonDays * 4)) / totalSeasonDays);
    this.season = SEASONS[seasonIndex];
  }

  getTimePeriod(): TimeOfDayPeriod {
    const t = this.timeOfDay;
    if (t < 0.15 || t >= 0.80) return 'night';
    if (t < 0.25) return 'dawn';
    if (t < 0.70) return 'day';
    return 'dusk';
  }

  getSunAngle(): number {
    // Map day portion (0.15-0.80) to 0-PI for shadow direction
    const dayStart = 0.15;
    const dayEnd = 0.80;
    const t = this.timeOfDay;
    if (t < dayStart || t >= dayEnd) return Math.PI; // sun below horizon
    const progress = (t - dayStart) / (dayEnd - dayStart);
    return progress * Math.PI;
  }

  getDayProgress(): number {
    return this.timeOfDay;
  }

  isNight(): boolean {
    return this.getTimePeriod() === 'night';
  }
}
