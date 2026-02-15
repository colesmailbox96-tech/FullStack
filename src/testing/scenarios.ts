import type { Needs } from '../entities/Needs';
import type { WeatherState } from '../world/Weather';

export interface Scenario {
  name: string;
  description: string;
  worldSeed: number;
  initialNPCPositions: { x: number; y: number }[];
  initialNeeds: Needs;
  duration: number;
  weatherOverride?: WeatherState;
  seasonOverride?: string;
}

export const STANDARD_SCENARIOS: Scenario[] = [
  {
    name: 'Calm Day',
    description: 'Easy conditions, moderate needs, food nearby',
    worldSeed: 100,
    initialNPCPositions: [{ x: 64, y: 64 }],
    initialNeeds: { hunger: 0.5, energy: 0.5, social: 0.5, curiosity: 0.5, safety: 0.9 },
    duration: 5000,
    weatherOverride: 'clear',
    seasonOverride: 'summer',
  },
  {
    name: 'Survival Crisis',
    description: 'Low needs, bad weather, scarce resources',
    worldSeed: 200,
    initialNPCPositions: [{ x: 64, y: 64 }],
    initialNeeds: { hunger: 0.15, energy: 0.15, social: 0.1, curiosity: 0.1, safety: 0.2 },
    duration: 3000,
    weatherOverride: 'storm',
    seasonOverride: 'winter',
  },
  {
    name: 'Social Test',
    description: 'Two NPCs, both lonely, moderate distance',
    worldSeed: 300,
    initialNPCPositions: [{ x: 50, y: 64 }, { x: 78, y: 64 }],
    initialNeeds: { hunger: 0.8, energy: 0.8, social: 0.1, curiosity: 0.5, safety: 0.9 },
    duration: 2000,
    weatherOverride: 'clear',
  },
  {
    name: 'Exploration Pressure',
    description: 'Bored NPC in depleted area, resources elsewhere',
    worldSeed: 400,
    initialNPCPositions: [{ x: 64, y: 64 }],
    initialNeeds: { hunger: 0.7, energy: 0.7, social: 0.7, curiosity: 0.05, safety: 0.9 },
    duration: 5000,
  },
  {
    name: 'Night Storm Survival',
    description: 'Nighttime, storm hits, shelter exists but must be found',
    worldSeed: 500,
    initialNPCPositions: [{ x: 64, y: 64 }],
    initialNeeds: { hunger: 0.6, energy: 0.4, social: 0.5, curiosity: 0.5, safety: 0.7 },
    duration: 2000,
    weatherOverride: 'storm',
  },
  {
    name: 'Long-Term Sustainability',
    description: '25 NPCs, normal conditions, long run',
    worldSeed: 600,
    initialNPCPositions: Array.from({ length: 25 }, (_, i) => ({
      x: 30 + (i % 5) * 15,
      y: 30 + Math.floor(i / 5) * 15,
    })),
    initialNeeds: { hunger: 0.7, energy: 0.7, social: 0.5, curiosity: 0.5, safety: 0.8 },
    duration: 50000,
  },
  {
    name: 'Competing Needs',
    description: 'Everything is low — what does the NPC prioritize?',
    worldSeed: 700,
    initialNPCPositions: [{ x: 64, y: 64 }],
    initialNeeds: { hunger: 0.15, energy: 0.15, social: 0.15, curiosity: 0.15, safety: 0.15 },
    duration: 3000,
  },
  {
    name: 'Resource Exhaustion Recovery',
    description: 'All food depleted, NPC must adapt',
    worldSeed: 800,
    initialNPCPositions: [{ x: 64, y: 64 }],
    initialNeeds: { hunger: 0.3, energy: 0.6, social: 0.5, curiosity: 0.3, safety: 0.8 },
    duration: 5000,
  },
];
