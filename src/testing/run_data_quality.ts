declare const process: { exit: (code: number) => never };
/**
 * CLI runner: Data quality analysis only.
 *
 * Usage: npx tsx src/testing/run_data_quality.ts
 */
import { BehaviorTreeBrain } from '../ai/BehaviorTreeBrain';
import { DataQualityAnalyzer } from './DataQualityAnalyzer';
import { TrainingDataExporter } from './TrainingDataExporter';
import { generateSyntheticLog } from './test_helpers';

async function main(): Promise<void> {
  console.log('=== Data Quality Analysis ===\n');

  const brain = new BehaviorTreeBrain();
  const log = generateSyntheticLog(brain, 1000);

  const analyzer = new DataQualityAnalyzer();
  const report = analyzer.analyze(log);

  console.log(`Overall Score: ${report.overallScore}/100`);
  console.log(`Status: ${report.passed ? '✅ PASSED' : '❌ FAILED'}\n`);

  for (const check of report.checks) {
    const icon = check.passed ? '✅' : (check.severity === 'critical' ? '🔴' : check.severity === 'warning' ? '🟡' : 'ℹ️');
    console.log(`${icon} [${check.severity.toUpperCase()}] ${check.name}: ${check.score}/100`);
    console.log(`   ${check.detail}\n`);
  }

  // Dataset stats
  const exporter = new TrainingDataExporter();
  const stats = exporter.getDatasetStats(log);
  console.log('--- Dataset Statistics ---');
  console.log(`Total samples: ${stats.totalSamples}`);
  console.log(`Action distribution:`, stats.actionDistribution);
  console.log(`Quality score: ${stats.qualityScore}/100`);

  process.exit(report.passed ? 0 : 1);
}

main().catch(err => {
  console.error('Data quality analysis failed:', err);
  process.exit(1);
});
