import React from 'react';
import { useSimulation } from '../engine/SimulationState';

const TIME_EMOJI: Record<string, string> = {
  day: '☀️',
  dawn: '🌅',
  dusk: '🌅',
  night: '🌙',
};

const WEATHER_EMOJI: Record<string, string> = {
  clear: '☀️',
  cloudy: '☁️',
  rain: '🌧️',
  storm: '⛈️',
  snow: '🌨️',
  fog: '🌫️',
};

function temperatureFeel(season: string, weather: string): string {
  if (weather === 'snow') return '🥶 Freezing';
  if (season === 'winter') return '❄️ Cold';
  if (season === 'summer' && weather === 'clear') return '🔥 Hot';
  if (season === 'summer') return '☀️ Warm';
  if (season === 'spring') return '🌸 Mild';
  if (season === 'autumn') return '🍂 Cool';
  return '🌡️ Moderate';
}

const HUD: React.FC = () => {
  const state = useSimulation(s => s.state);

  if (!state) return null;

  const { timeSystem, weather, npcs, settlementManager } = state;
  const day = timeSystem.day;
  const timePeriod = timeSystem.getTimePeriod();
  const season = timeSystem.season;
  const weatherState = weather.current;
  const aliveCount = npcs.filter(n => n.alive).length;
  const settlementCount = settlementManager.getCount();

  return (
    <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
      <div className="bg-black/60 backdrop-blur-sm border-b border-gray-700/50 px-4 py-2">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-200">
          {/* Day */}
          <span className="font-mono">
            📅 <span className="hidden sm:inline">Day </span>{day + 1}
          </span>

          {/* Time */}
          <span className="font-mono">
            {TIME_EMOJI[timePeriod] ?? '☀️'}{' '}
            <span className="hidden sm:inline capitalize">{timePeriod}</span>
          </span>

          {/* Weather */}
          <span className="font-mono">
            {WEATHER_EMOJI[weatherState] ?? '☀️'}{' '}
            <span className="hidden sm:inline capitalize">{weatherState}</span>
          </span>

          {/* Season */}
          <span className="font-mono capitalize">
            <span className="hidden sm:inline">🗓️ </span>{season}
          </span>

          {/* Temperature */}
          <span className="font-mono hidden sm:inline">
            {temperatureFeel(season, weatherState)}
          </span>

          {/* NPC Count */}
          <span className="font-mono">
            👤 {aliveCount}
          </span>

          {/* Settlement Count */}
          {settlementCount > 0 && (
            <span className="font-mono">
              🏘️ {settlementCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default HUD;
