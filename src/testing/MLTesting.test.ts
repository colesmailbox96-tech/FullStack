import { describe, it, expect } from 'vitest';
import { TrainingDataExporter, encodePerception, encodeAction, pearsonCorrelation, shannonEntropy, PERCEPTION_VECTOR_LENGTH, ACTION_LABELS } from './TrainingDataExporter';
import { DataQualityAnalyzer } from './DataQualityAnalyzer';
import { IntelligenceBenchmark } from './IntelligenceBenchmark';
import { ABComparison } from './ABComparison';
import { MLReadinessValidator } from './MLReadinessValidator';
import { PerformanceProfiler } from './PerformanceProfiler';
import { RegressionDetector } from './RegressionDetector';
import { STANDARD_SCENARIOS } from './scenarios';
import { BehaviorTreeBrain } from '../ai/BehaviorTreeBrain';
import { generateSyntheticLog } from './test_helpers';
import type { DecisionLog } from '../data/DataLogger';
import type { IBrain } from '../ai/IBrain';
import type { Perception } from '../ai/Perception';
import type { Action, ActionType } from '../ai/Action';

// ---- Helper ----
const brain = new BehaviorTreeBrain();

function makeLog(count: number): DecisionLog[] {
  return generateSyntheticLog(brain, count);
}

// ======================================================================
// Part 1A: TrainingDataExporter
// ======================================================================
describe('TrainingDataExporter', () => {
  it('encodePerception produces 30-float vector', () => {
    const log = makeLog(1);
    const vec = encodePerception(log[0].perception, log[0].tick);
    expect(vec).toHaveLength(PERCEPTION_VECTOR_LENGTH);
    expect(vec.every(v => typeof v === 'number' && !isNaN(v))).toBe(true);
  });

  it('encodeAction maps known actions to integers', () => {
    expect(encodeAction('FORAGE')).toBe(0);
    expect(encodeAction('REST')).toBe(1);
    expect(encodeAction('SEEK_SHELTER')).toBe(2);
    expect(encodeAction('EXPLORE')).toBe(3);
    expect(encodeAction('SOCIALIZE')).toBe(4);
    expect(encodeAction('IDLE')).toBe(5);
  });

  it('encodeAction returns IDLE for unknown actions', () => {
    expect(encodeAction('UNKNOWN')).toBe(ACTION_LABELS['IDLE']);
  });

  it('exportToTensors returns correct shape', () => {
    const exporter = new TrainingDataExporter();
    const log = makeLog(50);
    const result = exporter.exportToTensors(log);

    expect(result.perceptionVectors).toHaveLength(50);
    expect(result.actionLabels).toHaveLength(50);
    expect(result.outcomeVectors).toHaveLength(50);
    expect(result.perceptionVectors[0]).toHaveLength(PERCEPTION_VECTOR_LENGTH);
    expect(result.outcomeVectors[0]).toHaveLength(5);
    expect(result.metadata.totalSamples).toBe(50);
    expect(result.metadata.perceptionVectorLength).toBe(PERCEPTION_VECTOR_LENGTH);
    expect(result.metadata.schemaVersion).toBe('1.0.0');
  });

  it('exportAsJSON returns valid JSON string', () => {
    const exporter = new TrainingDataExporter();
    const log = makeLog(10);
    const json = exporter.exportAsJSON(log);
    const parsed = JSON.parse(json);
    expect(parsed.perceptionVectors).toHaveLength(10);
  });

  it('exportAsCSV returns valid CSV', () => {
    const exporter = new TrainingDataExporter();
    const log = makeLog(10);
    const csv = exporter.exportAsCSV(log);
    const lines = csv.split('\n');
    expect(lines.length).toBe(11); // header + 10 data rows
    expect(lines[0]).toContain('feature_0');
    expect(lines[0]).toContain('action_label');
  });

  it('getDatasetStats returns valid stats', () => {
    const exporter = new TrainingDataExporter();
    const log = makeLog(100);
    const stats = exporter.getDatasetStats(log);
    expect(stats.totalSamples).toBe(100);
    expect(typeof stats.qualityScore).toBe('number');
    expect(stats.qualityScore).toBeGreaterThanOrEqual(0);
    expect(stats.qualityScore).toBeLessThanOrEqual(100);
  });

  it('perception vectors are consistent across samples', () => {
    const log = makeLog(20);
    const vectors = log.map(e => encodePerception(e.perception, e.tick));
    for (const vec of vectors) {
      expect(vec).toHaveLength(PERCEPTION_VECTOR_LENGTH);
    }
  });
});

// ======================================================================
// Part 1B: DataQualityAnalyzer
// ======================================================================
describe('DataQualityAnalyzer', () => {
  it('produces a report with all 10 checks', () => {
    const analyzer = new DataQualityAnalyzer();
    const log = makeLog(100);
    const report = analyzer.analyze(log);
    expect(report.checks).toHaveLength(10);
    expect(typeof report.overallScore).toBe('number');
    expect(typeof report.passed).toBe('boolean');
  });

  it('each check has required fields', () => {
    const analyzer = new DataQualityAnalyzer();
    const log = makeLog(100);
    const report = analyzer.analyze(log);
    for (const check of report.checks) {
      expect(check).toHaveProperty('name');
      expect(check).toHaveProperty('passed');
      expect(check).toHaveProperty('score');
      expect(check).toHaveProperty('detail');
      expect(check).toHaveProperty('severity');
      expect(['critical', 'warning', 'info']).toContain(check.severity);
    }
  });

  it('score is 0-100', () => {
    const analyzer = new DataQualityAnalyzer();
    const log = makeLog(100);
    const report = analyzer.analyze(log);
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
    for (const check of report.checks) {
      expect(check.score).toBeGreaterThanOrEqual(0);
      expect(check.score).toBeLessThanOrEqual(100);
    }
  });

  it('handles empty log gracefully', () => {
    const analyzer = new DataQualityAnalyzer();
    const report = analyzer.analyze([]);
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.checks.length).toBe(10);
  });
});

// ======================================================================
// Part 2: IntelligenceBenchmark
// ======================================================================
describe('IntelligenceBenchmark', () => {
  it('runs all benchmark tests', () => {
    const benchmark = new IntelligenceBenchmark();
    const report = benchmark.runAll(brain);
    expect(report.tests.length).toBeGreaterThanOrEqual(10);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(report.grade);
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
  });

  it('each test has required fields', () => {
    const benchmark = new IntelligenceBenchmark();
    const report = benchmark.runAll(brain);
    for (const test of report.tests) {
      expect(test).toHaveProperty('name');
      expect(test).toHaveProperty('description');
      expect(test).toHaveProperty('score');
      expect(test).toHaveProperty('passed');
      expect(test).toHaveProperty('threshold');
      expect(test).toHaveProperty('detail');
      expect(test).toHaveProperty('metrics');
    }
  });

  it('behavior tree passes starvation response test', () => {
    const benchmark = new IntelligenceBenchmark();
    const report = benchmark.runAll(brain);
    const starvation = report.tests.find(t => t.name === 'Starvation Response');
    expect(starvation).toBeDefined();
    expect(starvation!.passed).toBe(true);
  });

  it('behavior tree passes energy management test', () => {
    const benchmark = new IntelligenceBenchmark();
    const report = benchmark.runAll(brain);
    const energy = report.tests.find(t => t.name === 'Energy Management');
    expect(energy).toBeDefined();
    expect(energy!.passed).toBe(true);
  });

  it('behavior tree passes contextual decision quality', () => {
    const benchmark = new IntelligenceBenchmark();
    const report = benchmark.runAll(brain);
    const contextual = report.tests.find(t => t.name === 'Contextual Decision Quality');
    expect(contextual).toBeDefined();
    expect(contextual!.score).toBeGreaterThanOrEqual(70);
  });
});

// ======================================================================
// Part 3: ABComparison
// ======================================================================
describe('ABComparison', () => {
  it('compares two brains across scenarios', () => {
    const ab = new ABComparison();
    const report = ab.compare(brain, brain, STANDARD_SCENARIOS.slice(0, 2));
    expect(report.scenarioResults).toHaveLength(2);
    expect(['A', 'B', 'tie']).toContain(report.overallWinner);
    expect(report.summary).toContain('Brain A');
  });

  it('identical brains result in tie', () => {
    const ab = new ABComparison();
    const report = ab.compare(brain, brain, STANDARD_SCENARIOS.slice(0, 3));
    // Same brain should produce identical results = tie
    expect(report.overallWinner).toBe('tie');
  });

  it('scenario results have complete metrics', () => {
    const ab = new ABComparison();
    const report = ab.compare(brain, brain, [STANDARD_SCENARIOS[0]]);
    const result = report.scenarioResults[0];
    expect(result.brainA).toHaveProperty('survivalTicks');
    expect(result.brainA).toHaveProperty('averageNeeds');
    expect(result.brainA).toHaveProperty('needCrises');
    expect(result.brainA).toHaveProperty('actionDistribution');
    expect(result.brainA).toHaveProperty('actionConsistency');
  });
});

// ======================================================================
// Part 4: MLReadinessValidator
// ======================================================================
describe('MLReadinessValidator', () => {
  it('produces a readiness report', () => {
    const validator = new MLReadinessValidator();
    const log = makeLog(100);
    const report = validator.validate(brain, log);
    expect(report).toHaveProperty('ready');
    expect(report).toHaveProperty('overallScore');
    expect(report).toHaveProperty('sections');
    expect(report).toHaveProperty('blockers');
    expect(report).toHaveProperty('warnings');
    expect(report).toHaveProperty('recommendations');
  });

  it('architecture checks pass for BehaviorTreeBrain', () => {
    const validator = new MLReadinessValidator();
    const log = makeLog(100);
    const report = validator.validate(brain, log);
    const arch = report.sections.architectureCheck;

    // IBrain compliance should pass
    const compliance = arch.checks.find(c => c.name === 'IBrain Interface Compliance');
    expect(compliance?.passed).toBe(true);

    // Determinism should pass
    const determinism = arch.checks.find(c => c.name === 'Determinism Test');
    expect(determinism?.passed).toBe(true);

    // Brain swap should pass
    const brainSwap = arch.checks.find(c => c.name === 'Brain Swap Test');
    expect(brainSwap?.passed).toBe(true);
  });

  it('performance check runs successfully', () => {
    const validator = new MLReadinessValidator();
    const log = makeLog(10);
    const report = validator.validate(brain, log);
    const perf = report.sections.performanceCheck;
    expect(perf.ticksPerSecond).toBeGreaterThan(0);
    expect(perf.decisionMs).toBeGreaterThanOrEqual(0);
  });
});

// ======================================================================
// Part 5: PerformanceProfiler
// ======================================================================
describe('PerformanceProfiler', () => {
  it('records and reports performance samples', () => {
    const profiler = new PerformanceProfiler();
    for (let i = 0; i < 100; i++) {
      profiler.record({
        tick: i,
        tickMs: 10 + Math.random() * 5,
        perceptionMs: 0.1 + Math.random() * 0.1,
        decisionMs: 0.05 + Math.random() * 0.05,
        logMs: 0.01,
        heapMB: 50 + i * 0.01,
      });
    }

    const report = profiler.getReport();
    expect(report.ticksPerSecond).toBeGreaterThan(0);
    expect(report.perceptionBuildMs).toBeGreaterThan(0);
    expect(report.decisionMs).toBeGreaterThan(0);
    expect(report.memoryUsageMB).toBeGreaterThan(0);
  });

  it('detects memory leaks', () => {
    const profiler = new PerformanceProfiler();
    // Simulate memory growth
    for (let i = 0; i < 200; i++) {
      profiler.record({
        tick: i,
        tickMs: 10,
        perceptionMs: 0.1,
        decisionMs: 0.05,
        logMs: 0.01,
        heapMB: 50 + i * 0.1,
      });
    }
    const leak = profiler.detectMemoryLeak();
    expect(leak.leaked).toBe(true);
    expect(leak.growthMBPerK).toBeGreaterThan(0);
  });

  it('reports no leak for stable memory', () => {
    const profiler = new PerformanceProfiler();
    for (let i = 0; i < 200; i++) {
      profiler.record({
        tick: i,
        tickMs: 10,
        perceptionMs: 0.1,
        decisionMs: 0.05,
        logMs: 0.01,
        heapMB: 50 + Math.random() * 0.5,
      });
    }
    const leak = profiler.detectMemoryLeak();
    expect(leak.leaked).toBe(false);
  });
});

// ======================================================================
// Part 7: RegressionDetector
// ======================================================================
describe('RegressionDetector', () => {
  it('detects no regressions with no history', () => {
    const detector = new RegressionDetector();
    const benchmark = new IntelligenceBenchmark();
    const report = benchmark.runAll(brain);
    const result = detector.detectRegression(report, []);
    expect(result.regressions).toHaveLength(0);
    expect(result.improvements).toHaveLength(0);
    expect(result.stable.length).toBeGreaterThan(0);
  });

  it('detects regression when score drops significantly', () => {
    const detector = new RegressionDetector();

    const baseReport = {
      overallScore: 80,
      grade: 'B' as const,
      tests: [{ name: 'Test1', description: '', score: 80, passed: true, threshold: 50, detail: '', metrics: {} }],
    };

    const history = Array(5).fill(null).map(() => ({
      ...baseReport,
      tests: [{ ...baseReport.tests[0], score: 80 }],
    }));

    const current = {
      ...baseReport,
      tests: [{ ...baseReport.tests[0], score: 50 }],
    };

    const result = detector.detectRegression(current, history);
    expect(result.regressions.length).toBeGreaterThanOrEqual(1);
    expect(result.regressions[0].testName).toBe('Test1');
  });

  it('detects improvement when score increases significantly', () => {
    const detector = new RegressionDetector();

    const baseReport = {
      overallScore: 50,
      grade: 'D' as const,
      tests: [{ name: 'Test1', description: '', score: 50, passed: true, threshold: 50, detail: '', metrics: {} }],
    };

    const history = Array(5).fill(null).map(() => ({
      ...baseReport,
      tests: [{ ...baseReport.tests[0], score: 50 }],
    }));

    const current = {
      ...baseReport,
      tests: [{ ...baseReport.tests[0], score: 85 }],
    };

    const result = detector.detectRegression(current, history);
    expect(result.improvements.length).toBeGreaterThanOrEqual(1);
  });

  it('loads history from JSON strings', () => {
    const detector = new RegressionDetector();
    const report = { overallScore: 80, grade: 'B', tests: [] };
    const history = detector.loadHistory([JSON.stringify(report), 'invalid json']);
    expect(history).toHaveLength(1);
  });
});

// ======================================================================
// Scenarios
// ======================================================================
describe('STANDARD_SCENARIOS', () => {
  it('has 8 predefined scenarios', () => {
    expect(STANDARD_SCENARIOS).toHaveLength(8);
  });

  it('each scenario has required fields', () => {
    for (const scenario of STANDARD_SCENARIOS) {
      expect(scenario).toHaveProperty('name');
      expect(scenario).toHaveProperty('description');
      expect(scenario).toHaveProperty('worldSeed');
      expect(scenario).toHaveProperty('initialNPCPositions');
      expect(scenario).toHaveProperty('initialNeeds');
      expect(scenario).toHaveProperty('duration');
      expect(scenario.initialNPCPositions.length).toBeGreaterThan(0);
    }
  });
});

// ======================================================================
// Utility functions
// ======================================================================
describe('pearsonCorrelation', () => {
  it('returns 1 for perfectly correlated arrays', () => {
    const r = pearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
    expect(r).toBeCloseTo(1.0, 5);
  });

  it('returns -1 for perfectly anti-correlated arrays', () => {
    const r = pearsonCorrelation([1, 2, 3, 4, 5], [10, 8, 6, 4, 2]);
    expect(r).toBeCloseTo(-1.0, 5);
  });

  it('returns 0 for empty arrays', () => {
    expect(pearsonCorrelation([], [])).toBe(0);
  });

  it('returns 0 for constant arrays', () => {
    expect(pearsonCorrelation([5, 5, 5], [1, 2, 3])).toBe(0);
  });
});

describe('shannonEntropy', () => {
  it('returns 0 for single-class distribution', () => {
    expect(shannonEntropy({ A: 100 })).toBe(0);
  });

  it('returns max entropy for uniform distribution', () => {
    const entropy = shannonEntropy({ A: 25, B: 25, C: 25, D: 25 });
    expect(entropy).toBeCloseTo(2.0, 1); // log2(4) = 2
  });

  it('handles empty distribution', () => {
    expect(shannonEntropy({})).toBe(0);
  });
});
