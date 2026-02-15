import type { DecisionLog } from '../data/DataLogger';
import {
  encodePerception,
  pearsonCorrelation,
  shannonEntropy,
  PERCEPTION_VECTOR_LENGTH,
} from './TrainingDataExporter';

export interface DataQualityReport {
  overallScore: number;
  passed: boolean;
  checks: QualityCheck[];
}

export interface QualityCheck {
  name: string;
  passed: boolean;
  score: number;
  detail: string;
  severity: 'critical' | 'warning' | 'info';
}

const CORE_ACTIONS = ['FORAGE', 'REST', 'SEEK_SHELTER', 'EXPLORE', 'SOCIALIZE'];
const NEED_KEYS = ['hunger', 'energy', 'social', 'curiosity', 'safety'];

/** Expected action-need correlations: when need is LOW, action fires. */
const EXPECTED_CORRELATIONS: Record<string, string> = {
  FORAGE: 'hunger',
  REST: 'energy',
  SEEK_SHELTER: 'safety',
  SOCIALIZE: 'social',
  EXPLORE: 'curiosity',
};

export class DataQualityAnalyzer {
  analyze(log: DecisionLog[]): DataQualityReport {
    const checks: QualityCheck[] = [
      this.checkActionDiversity(log),
      this.checkFeatureVariance(log),
      this.checkTemporalCoverage(log),
      this.checkNeedRangeCoverage(log),
      this.checkDecisionContextCorrelation(log),
      this.checkOutcomeValidity(log),
      this.checkMemoryUtilization(log),
      this.checkSampleSize(log),
      this.checkDuplicateDetection(log),
      this.checkEdgeCaseCoverage(log),
    ];

    const criticalChecks = checks.filter(c => c.severity === 'critical');
    const warningChecks = checks.filter(c => c.severity === 'warning');
    const infoChecks = checks.filter(c => c.severity === 'info');

    // Weighted scoring: critical 3x, warning 2x, info 1x
    let totalWeight = 0;
    let weightedSum = 0;
    for (const c of criticalChecks) { weightedSum += c.score * 3; totalWeight += 3; }
    for (const c of warningChecks) { weightedSum += c.score * 2; totalWeight += 2; }
    for (const c of infoChecks) { weightedSum += c.score * 1; totalWeight += 1; }

    const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    const passed = overallScore >= 70;

    return { overallScore, passed, checks };
  }

  /** Check 1: Action Diversity (critical) */
  private checkActionDiversity(log: DecisionLog[]): QualityCheck {
    const counts: Record<string, number> = {};
    for (const entry of log) {
      counts[entry.decision] = (counts[entry.decision] || 0) + 1;
    }
    const total = log.length;

    const missing = CORE_ACTIONS.filter(a => !counts[a] || counts[a] === 0);
    const tooLow = CORE_ACTIONS.filter(a => {
      const pct = ((counts[a] || 0) / (total || 1)) * 100;
      return pct > 0 && pct < 5;
    });
    const tooHigh = CORE_ACTIONS.filter(a => {
      const pct = ((counts[a] || 0) / (total || 1)) * 100;
      return pct > 50;
    });

    const entropy = shannonEntropy(counts);
    const maxEntropy = Math.log2(CORE_ACTIONS.length);
    const entropyRatio = maxEntropy > 0 ? entropy / maxEntropy : 0;

    const details: string[] = [];
    if (missing.length > 0) details.push(`Missing: ${missing.join(', ')}`);
    if (tooLow.length > 0) details.push(`Below 5%: ${tooLow.join(', ')}`);
    if (tooHigh.length > 0) details.push(`Above 50%: ${tooHigh.join(', ')}`);
    details.push(`Shannon entropy: ${entropy.toFixed(2)} / ${maxEntropy.toFixed(2)}`);

    const passed = missing.length === 0 && tooLow.length === 0 && tooHigh.length === 0 && entropy > 1.8;
    const score = Math.round(entropyRatio * 100);

    return {
      name: 'Action Diversity',
      passed,
      score,
      detail: details.join('. '),
      severity: 'critical',
    };
  }

  /** Check 2: Feature Variance (critical) */
  private checkFeatureVariance(log: DecisionLog[]): QualityCheck {
    if (log.length < 2) {
      return { name: 'Feature Variance', passed: false, score: 0, detail: 'Insufficient samples', severity: 'critical' };
    }

    const vectors = log.map(e => encodePerception(e.perception, e.tick));
    const variances: number[] = [];
    const lowVarianceFeatures: number[] = [];
    const zeroVarianceFeatures: number[] = [];

    for (let f = 0; f < PERCEPTION_VECTOR_LENGTH; f++) {
      const values = vectors.map(v => v[f]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      variances.push(variance);
      if (variance === 0) zeroVarianceFeatures.push(f);
      else if (variance < 0.01) lowVarianceFeatures.push(f);
    }

    const activeFeatures = PERCEPTION_VECTOR_LENGTH - zeroVarianceFeatures.length;
    const score = Math.round((activeFeatures / PERCEPTION_VECTOR_LENGTH) * 100);

    const details: string[] = [];
    if (zeroVarianceFeatures.length > 0) details.push(`Zero variance features: ${zeroVarianceFeatures.join(', ')}`);
    if (lowVarianceFeatures.length > 0) details.push(`Low variance (<0.01) features: ${lowVarianceFeatures.join(', ')}`);
    details.push(`${activeFeatures}/${PERCEPTION_VECTOR_LENGTH} features have non-zero variance`);

    return {
      name: 'Feature Variance',
      passed: zeroVarianceFeatures.length === 0,
      score,
      detail: details.join('. '),
      severity: 'critical',
    };
  }

  /** Check 3: Temporal Coverage (warning) */
  private checkTemporalCoverage(log: DecisionLog[]): QualityCheck {
    const timePeriods = { dawn: 0, day: 0, dusk: 0, night: 0 };
    const weatherTypes: Record<string, number> = {};

    for (const entry of log) {
      const t = entry.perception.time_of_day;
      if (t < 0.15 || t >= 0.80) timePeriods.night++;
      else if (t < 0.25) timePeriods.dawn++;
      else if (t < 0.70) timePeriods.day++;
      else timePeriods.dusk++;

      weatherTypes[entry.perception.weather] = (weatherTypes[entry.perception.weather] || 0) + 1;
    }

    // Check for tick gaps > 500
    const ticks = log.map(e => e.tick).sort((a, b) => a - b);
    let maxGap = 0;
    for (let i = 1; i < ticks.length; i++) {
      maxGap = Math.max(maxGap, ticks[i] - ticks[i - 1]);
    }

    const periodsPresent = Object.values(timePeriods).filter(c => c > 0).length;
    const weatherPresent = Object.keys(weatherTypes).length;

    const details: string[] = [];
    details.push(`Time periods: ${periodsPresent}/4`);
    details.push(`Weather types: ${weatherPresent}`);
    if (maxGap > 500) details.push(`Max tick gap: ${maxGap} (> 500)`);

    const passed = periodsPresent >= 4 && maxGap <= 500;
    const score = Math.round(
      ((periodsPresent / 4) * 50 + (maxGap <= 500 ? 50 : Math.max(0, 50 - (maxGap - 500) / 100)))
    );

    return {
      name: 'Temporal Coverage',
      passed,
      score: Math.max(0, Math.min(100, score)),
      detail: details.join('. '),
      severity: 'warning',
    };
  }

  /** Check 4: Need Range Coverage (warning) */
  private checkNeedRangeCoverage(log: DecisionLog[]): QualityCheck {
    const total = log.length || 1;
    const results: string[] = [];
    let passCount = 0;

    for (const need of NEED_KEYS) {
      const values = log.map(e => (e.perception.needs as Record<string, number>)[need] ?? 0);
      const lowCount = values.filter(v => v < 0.3).length;
      const highCount = values.filter(v => v > 0.7).length;
      const lowPct = (lowCount / total) * 100;
      const highPct = (highCount / total) * 100;

      const needPassed = lowPct >= 10 && highPct >= 10;
      if (needPassed) passCount++;
      results.push(`${need}: low=${lowPct.toFixed(1)}%, high=${highPct.toFixed(1)}%${needPassed ? '' : ' ✗'}`);
    }

    const score = Math.round((passCount / NEED_KEYS.length) * 100);
    return {
      name: 'Need Range Coverage',
      passed: passCount === NEED_KEYS.length,
      score,
      detail: results.join('. '),
      severity: 'warning',
    };
  }

  /** Check 5: Decision-Context Correlation (critical) */
  private checkDecisionContextCorrelation(log: DecisionLog[]): QualityCheck {
    if (log.length < 10) {
      return { name: 'Decision-Context Correlation', passed: false, score: 0, detail: 'Insufficient samples', severity: 'critical' };
    }

    const results: string[] = [];
    let passCount = 0;

    for (const [action, need] of Object.entries(EXPECTED_CORRELATIONS)) {
      const needValues = log.map(e => (e.perception.needs as Record<string, number>)[need] ?? 0);
      const actionBinary = log.map(e => e.decision === action ? 1 : 0);
      const r = pearsonCorrelation(needValues, actionBinary);

      // We expect NEGATIVE correlation: low need → high action probability
      const absR = Math.abs(r);
      const passed = absR > 0.3;
      if (passed) passCount++;
      results.push(`${action}↔${need}: r=${r.toFixed(3)}${passed ? '' : ' ✗'}`);
    }

    const score = Math.round((passCount / Object.keys(EXPECTED_CORRELATIONS).length) * 100);
    return {
      name: 'Decision-Context Correlation',
      passed: passCount === Object.keys(EXPECTED_CORRELATIONS).length,
      score,
      detail: results.join('. '),
      severity: 'critical',
    };
  }

  /** Check 6: Outcome Validity (warning) */
  private checkOutcomeValidity(log: DecisionLog[]): QualityCheck {
    const actionOutcomes: Record<string, number[][]> = {};
    for (const entry of log) {
      if (!entry.outcome?.needs_delta) continue;
      if (!actionOutcomes[entry.decision]) actionOutcomes[entry.decision] = [];
      const d = entry.outcome.needs_delta;
      actionOutcomes[entry.decision].push([
        d.hunger ?? 0, d.energy ?? 0, d.social ?? 0, d.curiosity ?? 0, d.safety ?? 0,
      ]);
    }

    const details: string[] = [];
    let nonZeroActions = 0;

    for (const [action, outcomes] of Object.entries(actionOutcomes)) {
      const avgOutcome = outcomes[0]?.map((_, i) =>
        outcomes.reduce((s, o) => s + o[i], 0) / outcomes.length,
      ) ?? [];
      const anyNonZero = avgOutcome.some(v => Math.abs(v) > 0.001);
      if (anyNonZero) nonZeroActions++;
      details.push(`${action}: avg=[${avgOutcome.map(v => v.toFixed(3)).join(',')}]`);
    }

    const totalActions = Object.keys(actionOutcomes).length || 1;
    const score = Math.round((nonZeroActions / totalActions) * 100);
    return {
      name: 'Outcome Validity',
      passed: nonZeroActions > 0,
      score,
      detail: details.join('. ') || 'No outcome data available',
      severity: 'warning',
    };
  }

  /** Check 7: Memory Utilization (info) */
  private checkMemoryUtilization(log: DecisionLog[]): QualityCheck {
    let withMemories = 0;
    const memoryTypes: Record<string, number> = {};

    for (const entry of log) {
      const memories = entry.perception.top_memories ?? [];
      if (memories.length > 0) {
        withMemories++;
        for (const mem of memories) {
          memoryTypes[mem.type] = (memoryTypes[mem.type] || 0) + 1;
        }
      }
    }

    const pctWithMemories = log.length > 0 ? (withMemories / log.length) * 100 : 0;
    const memTypeCount = Object.keys(memoryTypes).length;
    const details = `${pctWithMemories.toFixed(1)}% samples have memories. ${memTypeCount} memory types.`;
    const score = Math.round(Math.min(100, pctWithMemories));

    return {
      name: 'Memory Utilization',
      passed: pctWithMemories > 10,
      score,
      detail: details,
      severity: 'info',
    };
  }

  /** Check 8: Sample Size (critical) */
  private checkSampleSize(log: DecisionLog[]): QualityCheck {
    const total = log.length;
    const actionCounts: Record<string, number> = {};
    for (const entry of log) {
      actionCounts[entry.decision] = (actionCounts[entry.decision] || 0) + 1;
    }

    const minPerAction = Math.min(...CORE_ACTIONS.map(a => actionCounts[a] || 0));

    const details: string[] = [];
    details.push(`Total: ${total}`);
    details.push(`Min per action: ${minPerAction}`);
    if (total < 10000) details.push('Below 10,000 minimum');
    if (total < 50000) details.push('Below 50,000 recommended');
    if (minPerAction < 2000) details.push('Some actions have < 2,000 samples');

    let score: number;
    if (total >= 50000 && minPerAction >= 2000) score = 100;
    else if (total >= 10000 && minPerAction >= 1000) score = 70;
    else if (total >= 1000) score = 40;
    else score = Math.round((total / 1000) * 40);

    return {
      name: 'Sample Size',
      passed: total >= 10000 && minPerAction >= 2000,
      score,
      detail: details.join('. '),
      severity: 'critical',
    };
  }

  /** Check 9: Duplicate Detection (warning) */
  private checkDuplicateDetection(log: DecisionLog[]): QualityCheck {
    if (log.length < 10) {
      return { name: 'Duplicate Detection', passed: true, score: 100, detail: 'Too few samples to check', severity: 'warning' };
    }

    // Sample up to 1000 entries for performance
    const sampleSize = Math.min(log.length, 1000);
    const step = Math.max(1, Math.floor(log.length / sampleSize));
    const vectors: number[][] = [];
    for (let i = 0; i < log.length; i += step) {
      vectors.push(encodePerception(log[i].perception, log[i].tick));
    }

    let duplicates = 0;
    const epsilon = 0.01;
    for (let i = 0; i < vectors.length; i++) {
      for (let j = i + 1; j < Math.min(i + 10, vectors.length); j++) {
        let allClose = true;
        for (let f = 0; f < vectors[i].length; f++) {
          if (Math.abs(vectors[i][f] - vectors[j][f]) > epsilon) {
            allClose = false;
            break;
          }
        }
        if (allClose) duplicates++;
      }
    }

    const dupRate = duplicates / (vectors.length || 1);
    const passed = dupRate < 0.2;
    const score = Math.round(Math.max(0, (1 - dupRate) * 100));

    return {
      name: 'Duplicate Detection',
      passed,
      score,
      detail: `${(dupRate * 100).toFixed(1)}% near-duplicate rate (threshold: 20%)`,
      severity: 'warning',
    };
  }

  /** Check 10: Class Balance for Edge Cases (info) */
  private checkEdgeCaseCoverage(log: DecisionLog[]): QualityCheck {
    let starvationRisk = 0;
    let stormNight = 0;
    let socialBonding = 0;

    for (const entry of log) {
      const needs = entry.perception.needs;
      if ((needs.hunger ?? 1) < 0.1) starvationRisk++;
      if (entry.perception.weather === 'storm' &&
          (entry.perception.time_of_day < 0.15 || entry.perception.time_of_day >= 0.80)) {
        stormNight++;
      }
      if (entry.decision === 'SOCIALIZE' && (needs.social ?? 1) < 0.2) socialBonding++;
    }

    const edgeCases = [
      { name: 'Starvation risk', count: starvationRisk },
      { name: 'Storm + night', count: stormNight },
      { name: 'Social bonding', count: socialBonding },
    ];

    const present = edgeCases.filter(e => e.count > 0).length;
    const score = Math.round((present / edgeCases.length) * 100);
    const detail = edgeCases.map(e => `${e.name}: ${e.count} samples`).join('. ');

    return {
      name: 'Edge Case Coverage',
      passed: present >= 2,
      score,
      detail,
      severity: 'info',
    };
  }
}
