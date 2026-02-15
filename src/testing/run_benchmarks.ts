declare const process: { exit: (code: number) => never };
/**
 * CLI runner: Benchmark tests only.
 *
 * Usage: npx tsx src/testing/run_benchmarks.ts
 */
import { BehaviorTreeBrain } from '../ai/BehaviorTreeBrain';
import { IntelligenceBenchmark } from './IntelligenceBenchmark';
import { ABComparison } from './ABComparison';
import { STANDARD_SCENARIOS } from './scenarios';

async function main(): Promise<void> {
  console.log('=== Intelligence Benchmarks ===\n');

  const brain = new BehaviorTreeBrain();
  const benchmark = new IntelligenceBenchmark();
  const report = benchmark.runAll(brain);

  console.log(`Overall Grade: ${report.grade} (${report.overallScore}/100)\n`);

  for (const test of report.tests) {
    const icon = test.passed ? '✅' : '❌';
    console.log(`${icon} ${test.name}: ${test.score}/100 (threshold: ${test.threshold})`);
    console.log(`   ${test.detail}\n`);
  }

  // A/B comparison: behavior tree vs itself (baseline)
  console.log('--- A/B Comparison (BT vs BT) ---');
  const ab = new ABComparison();
  const abReport = ab.compare(brain, brain, STANDARD_SCENARIOS.slice(0, 4));
  console.log(`Winner: ${abReport.overallWinner}`);
  console.log(`Summary: ${abReport.summary}`);
  for (const result of abReport.scenarioResults) {
    console.log(`  ${result.scenario}: winner=${result.winner}`);
  }

  process.exit(report.grade === 'F' ? 1 : 0);
}

main().catch(err => {
  console.error('Benchmark runner failed:', err);
  process.exit(1);
});
