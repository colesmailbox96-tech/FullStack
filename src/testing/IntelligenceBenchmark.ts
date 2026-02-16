import type { IBrain } from '../ai/IBrain';
import type { Perception, ObjectInfo, TileInfo } from '../ai/Perception';
import type { Action, ActionType } from '../ai/Action';
import type { Needs } from '../entities/Needs';
import type { WeatherState } from '../world/Weather';
import { ObjectType } from '../world/WorldObject';
import { TileType } from '../world/TileMap';

export interface BenchmarkReport {
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  tests: BenchmarkTest[];
  comparisonToBaseline?: ComparisonReport;
}

export interface BenchmarkTest {
  name: string;
  description: string;
  score: number;
  passed: boolean;
  threshold: number;
  detail: string;
  metrics: Record<string, number>;
}

export interface ComparisonReport {
  baselineScore: number;
  currentScore: number;
  percentDifference: number;
}

/** Map a 0-100 score to a letter grade. */
function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Build a minimal perception for benchmark tests without requiring a full world.
 * Includes default food and shelter objects to allow the behavior tree to function.
 */
function buildTestPerception(overrides: Partial<Perception>): Perception {
  const defaultFood: ObjectInfo[] = [
    { id: 'obj_food_1', type: ObjectType.BerryBush, x: 66, y: 64, state: 'normal' },
    { id: 'obj_food_2', type: ObjectType.BerryBush, x: 62, y: 66, state: 'normal' },
  ];
  const defaultShelter: ObjectInfo[] = [
    { id: 'obj_shelter_1', type: ObjectType.Campfire, x: 60, y: 64, state: 'normal' },
  ];
  const defaultTiles: TileInfo[] = [
    { x: 65, y: 64, type: TileType.Grass, walkable: true },
    { x: 63, y: 64, type: TileType.Grass, walkable: true },
    { x: 64, y: 65, type: TileType.Grass, walkable: true },
    { x: 64, y: 63, type: TileType.Grass, walkable: true },
    { x: 60, y: 64, type: TileType.Grass, walkable: true },
    { x: 68, y: 64, type: TileType.Grass, walkable: true },
    { x: 64, y: 60, type: TileType.Grass, walkable: true },
    { x: 64, y: 68, type: TileType.Grass, walkable: true },
  ];

  return {
    nearbyTiles: defaultTiles,
    nearbyObjects: [...defaultFood, ...defaultShelter],
    nearbyNPCs: [],
    nearbyConstructionSites: [],
    nearbyStructures: [],
    needs: { hunger: 0.5, energy: 0.5, social: 0.5, curiosity: 0.5, safety: 0.5 },
    personality: { bravery: 0.5, sociability: 0.5, curiosity: 0.5, industriousness: 0.5, craftiness: 0.5 },
    inventory: { wood: 0, stone: 0, berries: 0 },
    relevantMemories: [],
    timeOfDay: 0.5,
    weather: 'clear' as WeatherState,
    season: 'summer',
    currentTick: 0,
    cameraX: 64,
    cameraY: 64,
    cameraZoom: 1,
    craftInventoryThreshold: 5,
    ...overrides,
  };
}

export class IntelligenceBenchmark {
  /** Run all benchmark tests. */
  runAll(brain: IBrain): BenchmarkReport {
    const tests: BenchmarkTest[] = [
      this.testStarvationResponse(brain),
      this.testShelterSeeking(brain),
      this.testEnergyManagement(brain),
      this.testSocialBehavior(brain),
      this.testContextualDecisionQuality(brain),
      this.testBehavioralConsistency(brain),
      this.testNeedPrioritization(brain),
      this.testMemoryUtilization(brain),
      this.testExplorationDrive(brain),
      this.testMultiNeedBalancing(brain),
      this.testNovelSituationResponse(brain),
      this.testSurvivalDuration(brain),
    ];

    const overallScore = tests.length > 0
      ? Math.round(tests.reduce((sum, t) => sum + t.score, 0) / tests.length)
      : 0;

    return {
      overallScore,
      grade: scoreToGrade(overallScore),
      tests,
    };
  }

  /** Test 2: Starvation Response — low hunger should trigger FORAGE. */
  private testStarvationResponse(brain: IBrain): BenchmarkTest {
    let correctResponses = 0;
    const trials = 10;

    for (let i = 0; i < trials; i++) {
      const perception = buildTestPerception({
        needs: { hunger: 0.1 + i * 0.01, energy: 0.8, social: 0.8, curiosity: 0.8, safety: 0.9 },
        currentTick: i,
      });
      const action = brain.decide(perception);
      if (action.type === 'FORAGE') correctResponses++;
    }

    const rate = correctResponses / trials;
    const score = Math.round(rate * 100);
    return {
      name: 'Starvation Response',
      description: 'NPC should FORAGE when hunger is low',
      score,
      passed: rate >= 0.8,
      threshold: 80,
      detail: `${correctResponses}/${trials} correct (FORAGE when hungry)`,
      metrics: { correctResponses, trials, rate },
    };
  }

  /** Test 3: Shelter-Seeking — storm should trigger SEEK_SHELTER. */
  private testShelterSeeking(brain: IBrain): BenchmarkTest {
    let correctResponses = 0;
    const trials = 10;

    for (let i = 0; i < trials; i++) {
      const perception = buildTestPerception({
        needs: { hunger: 0.7, energy: 0.7, social: 0.7, curiosity: 0.7, safety: 0.2 + i * 0.01 },
        weather: 'storm' as WeatherState,
        timeOfDay: 0.85,
        currentTick: i,
      });
      const action = brain.decide(perception);
      if (action.type === 'SEEK_SHELTER') correctResponses++;
    }

    const rate = correctResponses / trials;
    const score = Math.round(rate * 100);
    return {
      name: 'Shelter-Seeking Under Threat',
      description: 'NPC should SEEK_SHELTER during storm with low safety',
      score,
      passed: rate >= 0.8,
      threshold: 80,
      detail: `${correctResponses}/${trials} correct (SEEK_SHELTER in storm)`,
      metrics: { correctResponses, trials, rate },
    };
  }

  /** Test 4: Energy Management — low energy should trigger REST. */
  private testEnergyManagement(brain: IBrain): BenchmarkTest {
    let correctResponses = 0;
    const trials = 10;

    for (let i = 0; i < trials; i++) {
      const perception = buildTestPerception({
        needs: { hunger: 0.8, energy: 0.05 + i * 0.01, social: 0.8, curiosity: 0.8, safety: 0.9 },
        currentTick: i,
      });
      const action = brain.decide(perception);
      if (action.type === 'REST') correctResponses++;
    }

    const rate = correctResponses / trials;
    const score = Math.round(rate * 100);
    return {
      name: 'Energy Management',
      description: 'NPC should REST when energy is critically low',
      score,
      passed: rate >= 0.8,
      threshold: 80,
      detail: `${correctResponses}/${trials} correct (REST when exhausted)`,
      metrics: { correctResponses, trials, rate },
    };
  }

  /** Test 5: Social Behavior — low social with nearby NPC should trigger SOCIALIZE. */
  private testSocialBehavior(brain: IBrain): BenchmarkTest {
    let correctResponses = 0;
    const trials = 10;

    for (let i = 0; i < trials; i++) {
      const perception = buildTestPerception({
        needs: { hunger: 0.8, energy: 0.8, social: 0.15 + i * 0.01, curiosity: 0.8, safety: 0.9 },
        nearbyNPCs: [{ id: 'npc_99', x: 62, y: 64, dx: -2, dy: 0, action: 'IDLE' as ActionType }],
        currentTick: i,
      });
      const action = brain.decide(perception);
      if (action.type === 'SOCIALIZE') correctResponses++;
    }

    const rate = correctResponses / trials;
    const score = Math.round(rate * 100);
    return {
      name: 'Social Behavior',
      description: 'NPC should SOCIALIZE when social need is low and NPC nearby',
      score,
      passed: rate >= 0.6,
      threshold: 60,
      detail: `${correctResponses}/${trials} correct (SOCIALIZE when lonely)`,
      metrics: { correctResponses, trials, rate },
    };
  }

  /** Test 9: Contextual Decision Quality. */
  private testContextualDecisionQuality(brain: IBrain): BenchmarkTest {
    const scenarios: Array<{ perception: Partial<Perception>; expected: ActionType; name: string }> = [
      {
        name: 'Hungry, clear day',
        perception: { needs: { hunger: 0.1, energy: 0.8, social: 0.8, curiosity: 0.8, safety: 0.9 }, weather: 'clear' as WeatherState, timeOfDay: 0.5 },
        expected: 'FORAGE',
      },
      {
        name: 'Hungry, storm night — shelter first',
        perception: { needs: { hunger: 0.2, energy: 0.8, social: 0.8, curiosity: 0.8, safety: 0.2 }, weather: 'storm' as WeatherState, timeOfDay: 0.85 },
        expected: 'SEEK_SHELTER',
      },
      {
        name: 'Exhausted with food nearby',
        perception: { needs: { hunger: 0.8, energy: 0.05, social: 0.8, curiosity: 0.8, safety: 0.9 }, weather: 'clear' as WeatherState },
        expected: 'REST',
      },
      {
        name: 'All needs OK, very bored',
        perception: { needs: { hunger: 0.8, energy: 0.8, social: 0.8, curiosity: 0.1, safety: 0.9 } },
        expected: 'EXPLORE',
      },
      {
        name: 'Safety critical — emergency shelter',
        perception: { needs: { hunger: 0.8, energy: 0.8, social: 0.8, curiosity: 0.8, safety: 0.05 } },
        expected: 'SEEK_SHELTER',
      },
      {
        name: 'Starving emergency',
        perception: { needs: { hunger: 0.05, energy: 0.8, social: 0.8, curiosity: 0.8, safety: 0.9 } },
        expected: 'FORAGE',
      },
      {
        name: 'Energy critical — must rest',
        perception: { needs: { hunger: 0.8, energy: 0.05, social: 0.2, curiosity: 0.2, safety: 0.9 } },
        expected: 'REST',
      },
      {
        name: 'Moderate hunger — proactive forage',
        perception: { needs: { hunger: 0.2, energy: 0.8, social: 0.8, curiosity: 0.8, safety: 0.9 } },
        expected: 'FORAGE',
      },
      {
        name: 'Storm outdoors — shelter',
        perception: { needs: { hunger: 0.6, energy: 0.6, social: 0.6, curiosity: 0.6, safety: 0.5 }, weather: 'storm' as WeatherState },
        expected: 'SEEK_SHELTER',
      },
      {
        name: 'Low energy moderate — rest',
        perception: { needs: { hunger: 0.8, energy: 0.2, social: 0.8, curiosity: 0.8, safety: 0.9 } },
        expected: 'REST',
      },
    ];

    let correct = 0;
    const results: string[] = [];

    for (const s of scenarios) {
      const perception = buildTestPerception({ ...s.perception, currentTick: correct });
      const action = brain.decide(perception);
      const match = action.type === s.expected;
      if (match) correct++;
      results.push(`${s.name}: expected ${s.expected}, got ${action.type}${match ? '' : ' ✗'}`);
    }

    const score = Math.round((correct / scenarios.length) * 100);
    return {
      name: 'Contextual Decision Quality',
      description: 'Correct action in context-dependent scenarios',
      score,
      passed: correct >= 8,
      threshold: 80,
      detail: results.join('. '),
      metrics: { correct, total: scenarios.length },
    };
  }

  /** Test 10: Behavioral Consistency — action switching frequency. */
  private testBehavioralConsistency(brain: IBrain): BenchmarkTest {
    const ticks = 1000;
    let switches = 0;
    let lastAction = '';

    // Slowly evolving needs
    const needs: Needs = { hunger: 0.5, energy: 0.5, social: 0.5, curiosity: 0.5, safety: 0.5 };

    for (let t = 0; t < ticks; t++) {
      // Slowly drain needs
      needs.hunger = Math.max(0, needs.hunger - 0.0005);
      needs.energy = Math.max(0, needs.energy - 0.0005);

      const perception = buildTestPerception({ needs: { ...needs }, currentTick: t });
      const action = brain.decide(perception);

      if (lastAction && action.type !== lastAction) switches++;
      lastAction = action.type;
    }

    // Target: < 100 switches per 1000 ticks
    const switchRate = switches / ticks;
    const score = Math.round(Math.max(0, Math.min(100, (1 - switchRate) * 100)));
    return {
      name: 'Behavioral Consistency',
      description: 'NPC should not rapidly oscillate between actions',
      score,
      passed: switches < 100,
      threshold: 100,
      detail: `${switches} action switches in ${ticks} ticks (${(switchRate * 100).toFixed(1)}% rate)`,
      metrics: { switches, ticks, switchRate },
    };
  }

  /** Test: Need Prioritization — NPC picks the most urgent need. */
  private testNeedPrioritization(brain: IBrain): BenchmarkTest {
    const scenarios: Array<{ needs: Needs; expected: ActionType; name: string }> = [
      { needs: { hunger: 0.05, energy: 0.3, social: 0.5, curiosity: 0.5, safety: 0.5 }, expected: 'FORAGE', name: 'Hunger critical' },
      { needs: { hunger: 0.5, energy: 0.05, social: 0.5, curiosity: 0.5, safety: 0.5 }, expected: 'REST', name: 'Energy critical' },
      { needs: { hunger: 0.5, energy: 0.5, social: 0.5, curiosity: 0.5, safety: 0.1 }, expected: 'SEEK_SHELTER', name: 'Safety critical' },
    ];

    let correct = 0;
    for (const s of scenarios) {
      const perception = buildTestPerception({ needs: s.needs });
      const action = brain.decide(perception);
      if (action.type === s.expected) correct++;
    }

    const score = Math.round((correct / scenarios.length) * 100);
    return {
      name: 'Need Prioritization',
      description: 'NPC should address the most critical need first',
      score,
      passed: correct >= 2,
      threshold: 67,
      detail: `${correct}/${scenarios.length} correct prioritization`,
      metrics: { correct, total: scenarios.length },
    };
  }

  /** Test 8: Memory Utilization — brain should use memory data. */
  private testMemoryUtilization(brain: IBrain): BenchmarkTest {
    // Test: low hunger with food memory → should target remembered location
    const perception = buildTestPerception({
      needs: { hunger: 0.1, energy: 0.8, social: 0.8, curiosity: 0.8, safety: 0.9 },
      relevantMemories: [
        { type: 'found_food', tick: 100, x: 50, y: 50, significance: 0.8 },
      ],
      currentTick: 200,
    });

    const action = brain.decide(perception);
    const usedMemory = action.type === 'FORAGE' && action.targetX === 50 && action.targetY === 50;
    const foraged = action.type === 'FORAGE';

    const score = usedMemory ? 100 : (foraged ? 50 : 0);
    return {
      name: 'Memory Utilization',
      description: 'NPC should use remembered food locations when foraging',
      score,
      passed: foraged,
      threshold: 50,
      detail: usedMemory
        ? 'NPC targeted remembered food location'
        : (foraged ? 'NPC foraged but did not target memory location' : `NPC chose ${action.type} instead of FORAGE`),
      metrics: { usedMemory: usedMemory ? 1 : 0, foraged: foraged ? 1 : 0 },
    };
  }

  /** Test: Exploration Drive — low curiosity should trigger EXPLORE. */
  private testExplorationDrive(brain: IBrain): BenchmarkTest {
    let correctResponses = 0;
    const trials = 10;

    for (let i = 0; i < trials; i++) {
      const perception = buildTestPerception({
        needs: { hunger: 0.8, energy: 0.8, social: 0.8, curiosity: 0.1 + i * 0.01, safety: 0.9 },
        currentTick: i,
      });
      const action = brain.decide(perception);
      if (action.type === 'EXPLORE') correctResponses++;
    }

    const rate = correctResponses / trials;
    const score = Math.round(rate * 100);
    return {
      name: 'Exploration Drive',
      description: 'NPC should EXPLORE when curiosity is low',
      score,
      passed: rate >= 0.8,
      threshold: 80,
      detail: `${correctResponses}/${trials} correct (EXPLORE when bored)`,
      metrics: { correctResponses, trials, rate },
    };
  }

  /** Test 7: Multi-Need Balancing. */
  private testMultiNeedBalancing(brain: IBrain): BenchmarkTest {
    const ticks = 2000;
    let crises = 0;
    const needs: Needs = { hunger: 0.5, energy: 0.5, social: 0.5, curiosity: 0.5, safety: 0.5 };

    for (let t = 0; t < ticks; t++) {
      const perception = buildTestPerception({ needs: { ...needs }, currentTick: t });
      const action = brain.decide(perception);

      // Simulate need drains and action effects
      needs.hunger = Math.max(0, needs.hunger - 0.003);
      needs.energy = Math.max(0, needs.energy - 0.003);
      needs.social = Math.max(0, needs.social - 0.002);
      needs.curiosity = Math.max(0, needs.curiosity - 0.002);

      if (action.type === 'FORAGE') needs.hunger = Math.min(1, needs.hunger + 0.01);
      if (action.type === 'REST') needs.energy = Math.min(1, needs.energy + 0.015);
      if (action.type === 'SOCIALIZE') needs.social = Math.min(1, needs.social + 0.01);
      if (action.type === 'EXPLORE') needs.curiosity = Math.min(1, needs.curiosity + 0.01);

      // Count crises
      for (const val of Object.values(needs)) {
        if (val <= 0) crises++;
      }
    }

    const score = Math.round(Math.max(0, Math.min(100, 100 - crises * 2)));
    return {
      name: 'Multi-Need Balancing',
      description: 'NPC should prevent needs from hitting 0',
      score,
      passed: crises < 10,
      threshold: 10,
      detail: `${crises} total need crises in ${ticks} ticks (threshold: < 10)`,
      metrics: { crises, ticks },
    };
  }

  /** Test 12: Novel Situation Response. */
  private testNovelSituationResponse(brain: IBrain): BenchmarkTest {
    const scenarios: Array<{ perception: Partial<Perception>; acceptable: ActionType[]; name: string }> = [
      {
        name: 'All food gone — explore for new sources',
        perception: { needs: { hunger: 0.15, energy: 0.6, social: 0.5, curiosity: 0.5, safety: 0.9 } },
        acceptable: ['FORAGE', 'EXPLORE'],
      },
      {
        name: 'Extreme cold — prioritize shelter',
        perception: {
          needs: { hunger: 0.5, energy: 0.5, social: 0.5, curiosity: 0.5, safety: 0.15 },
          weather: 'storm' as WeatherState,
          season: 'winter',
          timeOfDay: 0.9,
        },
        acceptable: ['SEEK_SHELTER'],
      },
      {
        name: 'Everything low — triage',
        perception: { needs: { hunger: 0.1, energy: 0.1, social: 0.1, curiosity: 0.1, safety: 0.1 } },
        acceptable: ['FORAGE', 'REST', 'SEEK_SHELTER'],
      },
      {
        name: 'High energy, all else fine — explore',
        perception: { needs: { hunger: 0.9, energy: 0.9, social: 0.9, curiosity: 0.1, safety: 0.9 } },
        acceptable: ['EXPLORE'],
      },
    ];

    let correct = 0;
    const results: string[] = [];

    for (const s of scenarios) {
      const perception = buildTestPerception({ ...s.perception, currentTick: correct });
      const action = brain.decide(perception);
      const match = s.acceptable.includes(action.type);
      if (match) correct++;
      results.push(`${s.name}: got ${action.type}${match ? '' : ` ✗ (expected ${s.acceptable.join('/')})`}`);
    }

    const score = Math.round((correct / scenarios.length) * 100);
    return {
      name: 'Novel Situation Response',
      description: 'Reasonable behavior in unusual scenarios',
      score,
      passed: correct >= 3,
      threshold: 75,
      detail: results.join('. '),
      metrics: { correct, total: scenarios.length },
    };
  }

  /** Test 1: Survival Duration (simplified — no full world sim). */
  private testSurvivalDuration(brain: IBrain): BenchmarkTest {
    const trials = 10;
    const survivalTicks: number[] = [];

    for (let trial = 0; trial < trials; trial++) {
      const needs: Needs = { hunger: 0.7, energy: 0.7, social: 0.5, curiosity: 0.5, safety: 0.8 };
      let survived = 0;

      for (let t = 0; t < 5000; t++) {
        const perception = buildTestPerception({ needs: { ...needs }, currentTick: t });
        const action = brain.decide(perception);

        // Simulate basic need drains
        needs.hunger = Math.max(0, needs.hunger - 0.004);
        needs.energy = Math.max(0, needs.energy - 0.005);
        needs.safety = Math.max(0, needs.safety - 0.001);

        if (action.type === 'FORAGE') needs.hunger = Math.min(1, needs.hunger + 0.01);
        if (action.type === 'REST') needs.energy = Math.min(1, needs.energy + 0.015);
        if (action.type === 'SEEK_SHELTER') needs.safety = Math.min(1, needs.safety + 0.01);

        survived = t + 1;
        // Death condition: starvation
        if (needs.hunger <= 0 && t > 200) break;
      }

      survivalTicks.push(survived);
    }

    survivalTicks.sort((a, b) => a - b);
    const median = survivalTicks[Math.floor(survivalTicks.length / 2)];
    const score = Math.round(Math.min(100, (median / 5000) * 100));

    return {
      name: 'Survival Duration',
      description: 'Median survival in simulated environment',
      score,
      passed: median >= 2000,
      threshold: 2000,
      detail: `Median survival: ${median} ticks. Range: ${survivalTicks[0]}-${survivalTicks[survivalTicks.length - 1]}`,
      metrics: { median, min: survivalTicks[0], max: survivalTicks[survivalTicks.length - 1] },
    };
  }
}
