/* eslint-disable @typescript-eslint/no-explicit-any */
declare const process: { exit: (code: number) => never };
/**
 * CLI runner: Run all ML tests (data quality + benchmarks + readiness).
 *
 * Usage: npx tsx src/testing/run_tests.ts
 */
import { BehaviorTreeBrain } from '../ai/BehaviorTreeBrain';
import { DataQualityAnalyzer } from './DataQualityAnalyzer';
import { IntelligenceBenchmark } from './IntelligenceBenchmark';
import { MLReadinessValidator } from './MLReadinessValidator';
import type { DecisionLog } from '../data/DataLogger';
import { generateSyntheticLog } from './test_helpers';

async function main(): Promise<void> {
  const startTime = Date.now();
  console.log('=== ML Test Suite ===\n');

  const brain = new BehaviorTreeBrain();
  const log = generateSyntheticLog(brain, 25000);

  // 1. Data Quality
  console.log('--- Data Quality ---');
  const dqa = new DataQualityAnalyzer();
  const qualityReport = dqa.analyze(log);
  console.log(`Score: ${qualityReport.overallScore}/100 (${qualityReport.passed ? 'PASSED' : 'FAILED'})`);
  for (const check of qualityReport.checks) {
    console.log(`  ${check.passed ? '✅' : '❌'} ${check.name}: ${check.score}/100`);
  }

  // 2. Benchmarks
  console.log('\n--- Benchmarks ---');
  const benchmark = new IntelligenceBenchmark();
  const benchmarkReport = benchmark.runAll(brain);
  console.log(`Grade: ${benchmarkReport.grade} (${benchmarkReport.overallScore}/100)`);
  for (const test of benchmarkReport.tests) {
    console.log(`  ${test.passed ? '✅' : '❌'} ${test.name}: ${test.score}/100`);
  }

  // 3. ML Readiness
  console.log('\n--- ML Readiness ---');
  const validator = new MLReadinessValidator();
  const readiness = validator.validate(brain, log);
  console.log(`Ready: ${readiness.ready ? 'YES' : 'NO'} (${readiness.overallScore}/100)`);
  if (readiness.blockers.length > 0) {
    console.log('  Blockers:');
    for (const b of readiness.blockers) console.log(`    🔴 ${b}`);
  }
  if (readiness.warnings.length > 0) {
    console.log('  Warnings:');
    for (const w of readiness.warnings) console.log(`    🟡 ${w}`);
  }

  const elapsed = Date.now() - startTime;
  console.log(`\n=== Completed in ${elapsed}ms ===`);

  // Exit code based on benchmark grade
  const exitCode = benchmarkReport.grade === 'F' ? 1 : 0;
  process.exit(exitCode);
}

main().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
