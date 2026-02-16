import type { IBrain } from '../ai/IBrain';
import type { Perception } from '../ai/Perception';
import type { Action, ActionType } from '../ai/Action';
import type { Needs } from '../entities/Needs';
import type { WeatherState } from '../world/Weather';
import type { Scenario } from './scenarios';

export interface ABReport {
  scenarioResults: ScenarioResult[];
  overallWinner: 'A' | 'B' | 'tie';
  significanceLevel: number;
  summary: string;
}

export interface ScenarioResult {
  scenario: string;
  brainA: BrainMetrics;
  brainB: BrainMetrics;
  winner: 'A' | 'B' | 'tie';
}

export interface BrainMetrics {
  survivalTicks: number;
  averageNeeds: Record<string, number>;
  needCrises: number;
  tilesExplored: number;
  socialInteractions: number;
  actionDistribution: Record<string, number>;
  decisionQuality: number;
  actionConsistency: number;
}

/**
 * Build a minimal perception for A/B comparisons without requiring a full world.
 */
function buildPerception(
  needs: Needs,
  tick: number,
  weather: WeatherState = 'clear',
  season: string = 'summer',
): Perception {
  return {
    nearbyTiles: [],
    nearbyObjects: [],
    nearbyNPCs: [],
    nearbyConstructionSites: [],
    nearbyStructures: [],
    needs: { ...needs },
    personality: { bravery: 0.5, sociability: 0.5, curiosity: 0.5, industriousness: 0.5, craftiness: 0.5 },
    inventory: { wood: 0, stone: 0, berries: 0 },
    relevantMemories: [],
    timeOfDay: (tick % 2400) / 2400,
    weather,
    season,
    currentTick: tick,
    cameraX: 64,
    cameraY: 64,
    cameraZoom: 1,
    craftInventoryThreshold: 5,
  };
}

/** Run a single NPC through a simplified simulation loop. */
function runScenario(
  brain: IBrain,
  scenario: Scenario,
): BrainMetrics {
  const needs: Needs = { ...scenario.initialNeeds };
  const actionCounts: Record<string, number> = {};
  let crises = 0;
  let socialInteractions = 0;
  let switches = 0;
  let lastAction = '';
  const tilesVisited = new Set<string>();
  const needSums: Record<string, number> = { hunger: 0, energy: 0, social: 0, curiosity: 0, safety: 0 };
  const weather = scenario.weatherOverride ?? 'clear';
  const season = scenario.seasonOverride ?? 'summer';

  // Cap duration for performance
  const maxDuration = Math.min(scenario.duration, 5000);

  let survived = 0;
  for (let t = 0; t < maxDuration; t++) {
    const perception = buildPerception(needs, t, weather, season);
    const action = brain.decide(perception);

    actionCounts[action.type] = (actionCounts[action.type] || 0) + 1;

    if (lastAction && action.type !== lastAction) switches++;
    lastAction = action.type;
    if (action.type === 'SOCIALIZE') socialInteractions++;

    tilesVisited.add(`${action.targetX},${action.targetY}`);

    // Simulate need changes
    needs.hunger = Math.max(0, needs.hunger - 0.004);
    needs.energy = Math.max(0, needs.energy - 0.005);
    needs.social = Math.max(0, needs.social - 0.002);
    needs.curiosity = Math.max(0, needs.curiosity - 0.002);
    if (weather === 'storm') needs.safety = Math.max(0, needs.safety - 0.03);

    if (action.type === 'FORAGE') needs.hunger = Math.min(1, needs.hunger + 0.01);
    if (action.type === 'REST') needs.energy = Math.min(1, needs.energy + 0.015);
    if (action.type === 'SEEK_SHELTER') needs.safety = Math.min(1, needs.safety + 0.01);
    if (action.type === 'SOCIALIZE') needs.social = Math.min(1, needs.social + 0.01);
    if (action.type === 'EXPLORE') needs.curiosity = Math.min(1, needs.curiosity + 0.01);

    for (const [key, val] of Object.entries(needs)) {
      needSums[key] += val;
      if (val <= 0) crises++;
    }

    survived = t + 1;
    if (needs.hunger <= 0 && t > 200) break;
  }

  const avgNeeds: Record<string, number> = {};
  for (const [key, sum] of Object.entries(needSums)) {
    avgNeeds[key] = survived > 0 ? sum / survived : 0;
  }

  return {
    survivalTicks: survived,
    averageNeeds: avgNeeds,
    needCrises: crises,
    tilesExplored: tilesVisited.size,
    socialInteractions,
    actionDistribution: actionCounts,
    decisionQuality: 0, // Set below
    actionConsistency: survived > 0 ? 1 - switches / survived : 0,
  };
}

export class ABComparison {
  /** Run identical scenarios with two different brains. */
  compare(
    brainA: IBrain,
    brainB: IBrain,
    scenarios: Scenario[],
  ): ABReport {
    const scenarioResults: ScenarioResult[] = [];
    let aWins = 0;
    let bWins = 0;

    for (const scenario of scenarios) {
      const metricsA = runScenario(brainA, scenario);
      const metricsB = runScenario(brainB, scenario);

      // Score based on survival, need management, and consistency
      const scoreA = this.computeScore(metricsA);
      const scoreB = this.computeScore(metricsB);
      metricsA.decisionQuality = scoreA;
      metricsB.decisionQuality = scoreB;

      let winner: 'A' | 'B' | 'tie';
      if (Math.abs(scoreA - scoreB) < 5) winner = 'tie';
      else if (scoreA > scoreB) { winner = 'A'; aWins++; }
      else { winner = 'B'; bWins++; }

      scenarioResults.push({ scenario: scenario.name, brainA: metricsA, brainB: metricsB, winner });
    }

    let overallWinner: 'A' | 'B' | 'tie';
    if (aWins > bWins) overallWinner = 'A';
    else if (bWins > aWins) overallWinner = 'B';
    else overallWinner = 'tie';

    const summary = `Brain A: ${aWins} wins, Brain B: ${bWins} wins, Ties: ${scenarios.length - aWins - bWins}`;

    return {
      scenarioResults,
      overallWinner,
      significanceLevel: aWins === bWins ? 1.0 : Math.min(1, 0.05 * Math.abs(aWins - bWins)),
      summary,
    };
  }

  private computeScore(metrics: BrainMetrics): number {
    const survivalScore = Math.min(100, (metrics.survivalTicks / 5000) * 100);
    const crisisScore = Math.max(0, 100 - metrics.needCrises * 5);
    const consistencyScore = metrics.actionConsistency * 100;
    return Math.round((survivalScore * 0.4 + crisisScore * 0.4 + consistencyScore * 0.2));
  }
}
