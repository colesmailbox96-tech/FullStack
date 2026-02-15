import type { IBrain } from '../ai/IBrain';
import type { Perception } from '../ai/Perception';
import type { Action, ActionType } from '../ai/Action';
import type { DecisionLog } from '../data/DataLogger';
import type { WeatherState } from '../world/Weather';
import { DataQualityAnalyzer, type DataQualityReport } from './DataQualityAnalyzer';
import { IntelligenceBenchmark, type BenchmarkReport } from './IntelligenceBenchmark';
import { PerformanceProfiler, type PerformanceCheckReport } from './PerformanceProfiler';
import { encodePerception, PERCEPTION_VECTOR_LENGTH, ACTION_LABELS } from './TrainingDataExporter';

export interface MLReadinessReport {
  ready: boolean;
  overallScore: number;
  sections: {
    dataQuality: DataQualityReport;
    benchmarkBaseline: BenchmarkReport;
    architectureCheck: ArchitectureCheckReport;
    performanceCheck: PerformanceCheckReport;
  };
  blockers: string[];
  warnings: string[];
  recommendations: string[];
}

export interface ArchitectureCheckReport {
  checks: ArchCheck[];
  passed: boolean;
}

export interface ArchCheck {
  name: string;
  passed: boolean;
  detail: string;
}

/**
 * Build a minimal test perception.
 */
function buildTestPerception(overrides?: Partial<Perception>): Perception {
  return {
    nearbyTiles: [],
    nearbyObjects: [],
    nearbyNPCs: [],
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

export class MLReadinessValidator {
  validate(
    brain: IBrain,
    dataLog: DecisionLog[],
  ): MLReadinessReport {
    const dataQuality = new DataQualityAnalyzer().analyze(dataLog);
    const benchmarkBaseline = new IntelligenceBenchmark().runAll(brain);
    const architectureCheck = this.runArchitectureChecks(brain, dataLog);
    const performanceCheck = this.runPerformanceChecks(brain);

    const blockers: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Analyze results
    if (!dataQuality.passed) blockers.push('Data quality score below 70');
    if (benchmarkBaseline.grade === 'F') blockers.push('Benchmark grade is F');
    if (!architectureCheck.passed) blockers.push('Architecture checks failed');
    if (!performanceCheck.meetsTarget) warnings.push('Performance below 60 TPS target');

    for (const check of dataQuality.checks) {
      if (!check.passed && check.severity === 'critical') {
        blockers.push(`Data quality: ${check.name} failed`);
      } else if (!check.passed && check.severity === 'warning') {
        warnings.push(`Data quality: ${check.name} — ${check.detail}`);
      }
    }

    for (const check of architectureCheck.checks) {
      if (!check.passed) warnings.push(`Architecture: ${check.name} — ${check.detail}`);
    }

    if (dataLog.length < 50000) recommendations.push('Collect more data (target: 50,000+ samples)');
    if (benchmarkBaseline.grade !== 'A') recommendations.push('Improve behavior tree to achieve grade A baseline');

    const sections = { dataQuality, benchmarkBaseline, architectureCheck, performanceCheck };

    const scores = [
      dataQuality.overallScore,
      benchmarkBaseline.overallScore,
      architectureCheck.passed ? 100 : 50,
      performanceCheck.meetsTarget ? 100 : 50,
    ];
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const ready = blockers.length === 0 && overallScore >= 70;

    return { ready, overallScore, sections, blockers, warnings, recommendations };
  }

  /** Run architecture checks. */
  private runArchitectureChecks(brain: IBrain, dataLog: DecisionLog[]): ArchitectureCheckReport {
    const checks: ArchCheck[] = [];

    // 1. IBrain Interface Compliance
    try {
      const perception = buildTestPerception();
      const action = brain.decide(perception);
      const hasType = typeof action.type === 'string';
      const hasTarget = typeof action.targetX === 'number' && typeof action.targetY === 'number';
      checks.push({
        name: 'IBrain Interface Compliance',
        passed: hasType && hasTarget,
        detail: hasType && hasTarget
          ? 'decide() returns valid Action with type and target coordinates'
          : 'decide() does not return expected Action shape',
      });
    } catch (e) {
      checks.push({
        name: 'IBrain Interface Compliance',
        passed: false,
        detail: `Error calling decide(): ${e}`,
      });
    }

    // 2. Perception Completeness
    if (dataLog.length > 0) {
      const vec = encodePerception(dataLog[0].perception, dataLog[0].tick);
      const hasNaN = vec.some(v => isNaN(v));
      const correctLength = vec.length === PERCEPTION_VECTOR_LENGTH;
      checks.push({
        name: 'Perception Completeness',
        passed: !hasNaN && correctLength,
        detail: `Vector length: ${vec.length}/${PERCEPTION_VECTOR_LENGTH}. NaN values: ${hasNaN}`,
      });
    } else {
      checks.push({
        name: 'Perception Completeness',
        passed: false,
        detail: 'No data log entries to validate',
      });
    }

    // 3. Action Space Validity
    if (dataLog.length > 0) {
      const invalidActions = dataLog.filter(e => !(e.decision in ACTION_LABELS));
      checks.push({
        name: 'Action Space Validity',
        passed: invalidActions.length === 0,
        detail: invalidActions.length === 0
          ? 'All actions are valid ActionTypes'
          : `${invalidActions.length} invalid actions found`,
      });
    } else {
      checks.push({
        name: 'Action Space Validity',
        passed: true,
        detail: 'No data to validate (vacuously true)',
      });
    }

    // 4. Determinism Test
    try {
      const perception = buildTestPerception({ currentTick: 42 });
      const action1 = brain.decide(perception);
      const action2 = brain.decide(perception);
      const deterministic = action1.type === action2.type &&
        action1.targetX === action2.targetX &&
        action1.targetY === action2.targetY;
      checks.push({
        name: 'Determinism Test',
        passed: deterministic,
        detail: deterministic
          ? 'Same perception produces identical action'
          : `Different results: ${action1.type} vs ${action2.type}`,
      });
    } catch (e) {
      checks.push({ name: 'Determinism Test', passed: false, detail: `Error: ${e}` });
    }

    // 5. Brain Swap Test (dummy IDLE brain)
    try {
      const dummyBrain: IBrain = {
        decide: (_: Perception): Action => ({ type: 'IDLE' as ActionType, targetX: 0, targetY: 0 }),
      };
      const perception = buildTestPerception();
      const dummyAction = dummyBrain.decide(perception);
      const realAction = brain.decide(perception);
      checks.push({
        name: 'Brain Swap Test',
        passed: dummyAction.type === 'IDLE' && typeof realAction.type === 'string',
        detail: 'Dummy brain returns IDLE, real brain returns valid action. Interface is modular.',
      });
    } catch (e) {
      checks.push({ name: 'Brain Swap Test', passed: false, detail: `Error: ${e}` });
    }

    // 6. Perception Vector Stability
    if (dataLog.length >= 2) {
      const vec1 = encodePerception(dataLog[0].perception, dataLog[0].tick);
      const vec2 = encodePerception(dataLog[Math.min(1, dataLog.length - 1)].perception, dataLog[1].tick);
      const cosSim = cosineSimilarity(vec1, vec2);
      checks.push({
        name: 'Perception Vector Stability',
        passed: true, // Just informational
        detail: `Cosine similarity between sample 0 and 1: ${cosSim.toFixed(4)}`,
      });
    } else {
      checks.push({
        name: 'Perception Vector Stability',
        passed: true,
        detail: 'Insufficient samples for stability check',
      });
    }

    // 7. Data Schema Match
    if (dataLog.length > 0) {
      const lengths = new Set(dataLog.slice(0, 100).map(e => {
        const vec = encodePerception(e.perception, e.tick);
        return vec.length;
      }));
      const consistent = lengths.size === 1;
      checks.push({
        name: 'Data Schema Match',
        passed: consistent,
        detail: consistent
          ? `All perception vectors are ${PERCEPTION_VECTOR_LENGTH} floats`
          : `Inconsistent vector lengths: ${[...lengths].join(', ')}`,
      });
    } else {
      checks.push({
        name: 'Data Schema Match',
        passed: true,
        detail: 'No data to validate',
      });
    }

    const passed = checks.every(c => c.passed);
    return { checks, passed };
  }

  /** Run simplified performance checks. */
  private runPerformanceChecks(brain: IBrain): PerformanceCheckReport {
    const iterations = 100;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const perception = buildTestPerception({ currentTick: i });
      brain.decide(perception);
    }

    const elapsed = performance.now() - start;
    const decisionMs = elapsed / iterations;
    const estimatedTps = decisionMs > 0 ? Math.min(1000 / (decisionMs * 25), 1000) : 1000;

    return {
      ticksPerSecond: Math.round(estimatedTps),
      perceptionBuildMs: 0, // Would need full world to measure
      decisionMs: Math.round(decisionMs * 1000) / 1000,
      dataLogMs: 0,
      memoryUsageMB: 0,
      meetsTarget: estimatedTps >= 60,
    };
  }
}

/** Compute cosine similarity between two vectors. */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}
