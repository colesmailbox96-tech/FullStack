declare const process: { exit: (code: number) => never };
/**
 * CLI runner: ML readiness validation only.
 *
 * Usage: npx tsx src/testing/run_readiness.ts
 */
import { BehaviorTreeBrain } from '../ai/BehaviorTreeBrain';
import { MLReadinessValidator } from './MLReadinessValidator';
import { generateSyntheticLog } from './test_helpers';

async function main(): Promise<void> {
  console.log('=== ML Readiness Validation ===\n');

  const brain = new BehaviorTreeBrain();
  const log = generateSyntheticLog(brain, 25000);

  const validator = new MLReadinessValidator();
  const report = validator.validate(brain, log);

  console.log(`${report.ready ? '✅ READY' : '❌ NOT READY'} (${report.overallScore}/100)\n`);

  // Architecture checks
  console.log('--- Architecture ---');
  for (const check of report.sections.architectureCheck.checks) {
    console.log(`  ${check.passed ? '✅' : '❌'} ${check.name}: ${check.detail}`);
  }

  // Performance
  console.log('\n--- Performance ---');
  const perf = report.sections.performanceCheck;
  console.log(`  TPS: ${perf.ticksPerSecond} (target: 60+)`);
  console.log(`  Decision time: ${perf.decisionMs}ms`);
  console.log(`  Meets target: ${perf.meetsTarget}`);

  // Blockers & warnings
  if (report.blockers.length > 0) {
    console.log('\n--- Blockers ---');
    for (const b of report.blockers) console.log(`  🔴 ${b}`);
  }
  if (report.warnings.length > 0) {
    console.log('\n--- Warnings ---');
    for (const w of report.warnings) console.log(`  🟡 ${w}`);
  }
  if (report.recommendations.length > 0) {
    console.log('\n--- Recommendations ---');
    for (const r of report.recommendations) console.log(`  💡 ${r}`);
  }

  process.exit(report.ready ? 0 : 1);
}

main().catch(err => {
  console.error('Readiness validation failed:', err);
  process.exit(1);
});
