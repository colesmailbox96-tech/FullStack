import { WeatherState } from './Weather';

export type ForecastAccuracy = 'vague' | 'rough' | 'accurate' | 'precise';

export interface WeatherForecast {
  /** Predicted next weather state. */
  predictedWeather: string;
  /** 0-1 confidence in the prediction. */
  confidence: number;
  /** Accuracy tier based on exploring skill. */
  accuracy: ForecastAccuracy;
  /** Estimated ticks until weather changes. */
  ticksUntilChange: number;
}

const ALL_WEATHER: readonly WeatherState[] = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog'];

/** Error chance per accuracy tier. */
const ERROR_RATES: Record<ForecastAccuracy, number> = {
  vague: 0.4,
  rough: 0.25,
  accurate: 0.1,
  precise: 0.05,
};

/**
 * Determines forecast accuracy tier from an NPC's exploring skill (0-1).
 */
export function getForecastAccuracy(exploringSkill: number): ForecastAccuracy {
  if (exploringSkill < 0.2) return 'vague';
  if (exploringSkill < 0.5) return 'rough';
  if (exploringSkill < 0.8) return 'accurate';
  return 'precise';
}

/**
 * Picks the correct next-weather prediction based on current weather and season.
 */
function predictNextWeather(
  currentWeather: string,
  season: string,
  rngNext: () => number,
): string {
  switch (currentWeather) {
    case 'storm':
      return rngNext() < 0.5 ? 'cloudy' : 'rain';
    case 'rain':
      return rngNext() < 0.5 ? 'cloudy' : 'clear';
    case 'snow':
      return season === 'winter' ? 'cloudy' : 'clear';
    case 'fog':
      return rngNext() < 0.5 ? 'clear' : 'cloudy';
    case 'cloudy': {
      const rainLikely = season === 'spring' || season === 'summer';
      return rainLikely ? (rngNext() < 0.6 ? 'rain' : 'clear') : (rngNext() < 0.4 ? 'rain' : 'clear');
    }
    case 'clear':
      return 'cloudy';
    default:
      return 'clear';
  }
}

/**
 * Picks a random weather state different from the given one.
 */
function pickRandomDifferent(current: string, rngNext: () => number): string {
  const options = ALL_WEATHER.filter((w) => w !== current);
  return options[Math.floor(rngNext() * options.length)];
}

/**
 * Generates a weather forecast for an NPC based on their exploring skill,
 * the current weather, season, and how long the current weather has persisted.
 */
export function generateForecast(
  currentWeather: string,
  season: string,
  exploringSkill: number,
  weatherAge: number,
  rngNext: () => number,
): WeatherForecast {
  const accuracy = getForecastAccuracy(exploringSkill);
  const confidence = Math.min(0.9, 0.3 + exploringSkill * 0.6);

  let predictedWeather = predictNextWeather(currentWeather, season, rngNext);

  const errorRate = ERROR_RATES[accuracy];
  if (rngNext() < errorRate) {
    predictedWeather = pickRandomDifferent(currentWeather, rngNext);
  }

  // Base ticks estimate: 200-400 range, reduced when weather has persisted long.
  let ticksUntilChange = 200 + Math.floor(rngNext() * 200);
  if (weatherAge > 150) {
    ticksUntilChange = Math.max(0, ticksUntilChange - Math.floor(weatherAge / 2));
  }

  return { predictedWeather, confidence, accuracy, ticksUntilChange };
}

/**
 * Returns a human-readable preparation tip based on the forecast.
 */
export function getPreparationAdvice(forecast: WeatherForecast): string {
  switch (forecast.predictedWeather) {
    case 'storm':
      return 'Seek shelter soon!';
    case 'rain':
      return 'Rain approaching, find cover';
    case 'snow':
      return 'Snow expected, conserve energy';
    case 'clear':
      return 'Clear skies ahead';
    case 'fog':
      return 'Fog rolling in, stay close';
    case 'cloudy':
      return 'Overcast weather coming';
    default:
      return 'Weather uncertain';
  }
}
