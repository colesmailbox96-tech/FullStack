import { Random } from '../utils/Random';
import { Season } from './TimeSystem';
import { WorldConfig } from '../engine/Config';

export type WeatherState = 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';

const ALL_WEATHER: readonly WeatherState[] = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog'];

type SeasonWeights = Record<WeatherState, number>;

const SEASON_WEIGHTS: Record<Season, SeasonWeights> = {
  spring: { clear: 30, cloudy: 25, rain: 25, storm: 10, snow: 0, fog: 10 },
  summer: { clear: 40, cloudy: 20, rain: 15, storm: 15, snow: 0, fog: 10 },
  autumn: { clear: 20, cloudy: 30, rain: 25, storm: 10, snow: 5, fog: 10 },
  winter: { clear: 15, cloudy: 25, rain: 10, storm: 10, snow: 30, fog: 10 },
};

function pickWeighted(rng: Random, weights: SeasonWeights, minStormFrequency: number): WeatherState {
  // Enforce minimum storm frequency: adjust weights so storm has at least
  // minStormFrequency share of total weight.
  const adjustedWeights = { ...weights };
  let total = 0;
  for (const w of ALL_WEATHER) total += adjustedWeights[w];
  const stormPct = adjustedWeights.storm / total;
  if (stormPct < minStormFrequency && minStormFrequency > 0) {
    // Scale storm weight up to meet the minimum frequency
    const targetStormWeight = (minStormFrequency * (total - adjustedWeights.storm)) / (1 - minStormFrequency);
    adjustedWeights.storm = Math.max(adjustedWeights.storm, targetStormWeight);
    total = 0;
    for (const w of ALL_WEATHER) total += adjustedWeights[w];
  }

  let roll = rng.next() * total;
  for (const w of ALL_WEATHER) {
    roll -= adjustedWeights[w];
    if (roll <= 0) return w;
  }
  return 'clear';
}

export class Weather {
  current: WeatherState;
  windDirection: number;
  windStrength: number;
  intensity: number;
  private transitionTimer: number;
  private rng: Random;

  constructor(seed: number) {
    this.rng = new Random(seed);
    this.current = 'clear';
    this.windDirection = this.rng.next() * Math.PI * 2;
    this.windStrength = 0.2;
    this.intensity = 0;
    // Transitions every 200-400 ticks to ensure storms occur often enough
    // for meaningful training data generation.
    this.transitionTimer = 200 + this.rng.nextInt(200);
  }

  update(season: Season, config?: WorldConfig): void {
    this.transitionTimer--;

    if (this.transitionTimer <= 0) {
      const weights = SEASON_WEIGHTS[season];
      const minStormFreq = config?.stormFrequency ?? 0.08;
      this.current = pickWeighted(this.rng, weights, minStormFreq);

      // Fix 2: Storm duration must be at least minStormDuration ticks.
      // Non-storm weather transitions every 200-400 ticks.
      const minDuration = config?.minStormDuration ?? 150;
      if (this.current === 'storm') {
        this.transitionTimer = Math.max(minDuration, 200 + this.rng.nextInt(200));
      } else {
        this.transitionTimer = 200 + this.rng.nextInt(200);
      }

      // Randomize wind on transition
      this.windDirection = this.rng.next() * Math.PI * 2;
      this.windStrength = 0.1 + this.rng.next() * 0.9;

      // Set intensity based on weather type
      switch (this.current) {
        case 'storm':
          this.intensity = 0.7 + this.rng.next() * 0.3;
          break;
        case 'rain':
        case 'snow':
          this.intensity = 0.3 + this.rng.next() * 0.5;
          break;
        case 'fog':
          this.intensity = 0.4 + this.rng.next() * 0.4;
          break;
        case 'cloudy':
          this.intensity = 0.1 + this.rng.next() * 0.3;
          break;
        default:
          this.intensity = 0;
      }
    }
  }

  isStorm(): boolean {
    return this.current === 'storm';
  }

  isRaining(): boolean {
    return this.current === 'rain' || this.current === 'storm';
  }

  isSnowing(): boolean {
    return this.current === 'snow';
  }
}
