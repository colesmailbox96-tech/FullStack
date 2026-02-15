import { describe, it, expect } from 'vitest';
import {
  getForecastAccuracy,
  generateForecast,
  getPreparationAdvice,
  WeatherForecast,
} from './WeatherForecast';

const VALID_WEATHER = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog'];

/** Creates a deterministic rng that returns values from a list, cycling. */
function makeRng(values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i++;
    return v;
  };
}

describe('WeatherForecast', () => {
  describe('getForecastAccuracy', () => {
    it('returns vague for skill < 0.2', () => {
      expect(getForecastAccuracy(0)).toBe('vague');
      expect(getForecastAccuracy(0.1)).toBe('vague');
      expect(getForecastAccuracy(0.19)).toBe('vague');
    });

    it('returns rough for skill 0.2–0.49', () => {
      expect(getForecastAccuracy(0.2)).toBe('rough');
      expect(getForecastAccuracy(0.35)).toBe('rough');
      expect(getForecastAccuracy(0.49)).toBe('rough');
    });

    it('returns accurate for skill 0.5–0.79', () => {
      expect(getForecastAccuracy(0.5)).toBe('accurate');
      expect(getForecastAccuracy(0.65)).toBe('accurate');
      expect(getForecastAccuracy(0.79)).toBe('accurate');
    });

    it('returns precise for skill >= 0.8', () => {
      expect(getForecastAccuracy(0.8)).toBe('precise');
      expect(getForecastAccuracy(0.95)).toBe('precise');
      expect(getForecastAccuracy(1.0)).toBe('precise');
    });
  });

  describe('generateForecast', () => {
    it('returns a valid forecast structure', () => {
      const rng = makeRng([0.5, 0.5, 0.5]);
      const forecast = generateForecast('clear', 'spring', 0.5, 100, rng);

      expect(forecast).toHaveProperty('predictedWeather');
      expect(forecast).toHaveProperty('confidence');
      expect(forecast).toHaveProperty('accuracy');
      expect(forecast).toHaveProperty('ticksUntilChange');
      expect(typeof forecast.predictedWeather).toBe('string');
      expect(typeof forecast.confidence).toBe('number');
      expect(typeof forecast.ticksUntilChange).toBe('number');
    });

    it('higher skill produces higher confidence', () => {
      const rng1 = makeRng([0.5, 0.9, 0.5]);
      const rng2 = makeRng([0.5, 0.9, 0.5]);

      const low = generateForecast('clear', 'spring', 0.1, 100, rng1);
      const high = generateForecast('clear', 'spring', 0.9, 100, rng2);

      expect(high.confidence).toBeGreaterThan(low.confidence);
    });

    it('confidence is capped at 0.9', () => {
      const rng = makeRng([0.5, 0.9, 0.5]);
      const forecast = generateForecast('clear', 'spring', 1.0, 100, rng);
      expect(forecast.confidence).toBeCloseTo(0.9, 10);
    });

    it('produces valid weather types', () => {
      for (const weather of VALID_WEATHER) {
        const rng = makeRng([0.5, 0.9, 0.5]);
        const forecast = generateForecast(weather, 'summer', 0.5, 50, rng);
        expect(VALID_WEATHER).toContain(forecast.predictedWeather);
      }
    });

    it('reduces ticksUntilChange when weatherAge > 150', () => {
      // Use identical rng sequences so only weatherAge differs
      const rng1 = makeRng([0.5, 0.9, 0.5]);
      const rng2 = makeRng([0.5, 0.9, 0.5]);

      const young = generateForecast('clear', 'spring', 0.5, 50, rng1);
      const old = generateForecast('clear', 'spring', 0.5, 300, rng2);

      expect(old.ticksUntilChange).toBeLessThan(young.ticksUntilChange);
    });

    it('assigns correct accuracy tier', () => {
      const rng = makeRng([0.5, 0.9, 0.5]);
      const forecast = generateForecast('rain', 'autumn', 0.9, 100, rng);
      expect(forecast.accuracy).toBe('precise');
    });
  });

  describe('getPreparationAdvice', () => {
    const baseForecast: Omit<WeatherForecast, 'predictedWeather'> = {
      confidence: 0.7,
      accuracy: 'accurate',
      ticksUntilChange: 200,
    };

    it('returns storm advice', () => {
      expect(getPreparationAdvice({ ...baseForecast, predictedWeather: 'storm' })).toBe(
        'Seek shelter soon!',
      );
    });

    it('returns rain advice', () => {
      expect(getPreparationAdvice({ ...baseForecast, predictedWeather: 'rain' })).toBe(
        'Rain approaching, find cover',
      );
    });

    it('returns snow advice', () => {
      expect(getPreparationAdvice({ ...baseForecast, predictedWeather: 'snow' })).toBe(
        'Snow expected, conserve energy',
      );
    });

    it('returns clear advice', () => {
      expect(getPreparationAdvice({ ...baseForecast, predictedWeather: 'clear' })).toBe(
        'Clear skies ahead',
      );
    });

    it('returns fog advice', () => {
      expect(getPreparationAdvice({ ...baseForecast, predictedWeather: 'fog' })).toBe(
        'Fog rolling in, stay close',
      );
    });

    it('returns cloudy advice', () => {
      expect(getPreparationAdvice({ ...baseForecast, predictedWeather: 'cloudy' })).toBe(
        'Overcast weather coming',
      );
    });
  });
});
