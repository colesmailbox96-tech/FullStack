import type { BenchmarkReport, BenchmarkTest } from './IntelligenceBenchmark';

export interface RegressionReport {
  regressions: Regression[];
  improvements: Improvement[];
  stable: string[];
}

export interface Regression {
  testName: string;
  previousScore: number;
  currentScore: number;
  percentChange: number;
  significance: number;
  severity: 'critical' | 'moderate' | 'minor';
}

export interface Improvement {
  testName: string;
  previousScore: number;
  currentScore: number;
  percentChange: number;
}

export class RegressionDetector {
  /** Load historical benchmark results from JSON strings. */
  loadHistory(jsonStrings: string[]): BenchmarkReport[] {
    const reports: BenchmarkReport[] = [];
    for (const str of jsonStrings) {
      try {
        reports.push(JSON.parse(str) as BenchmarkReport);
      } catch {
        // Skip invalid entries
      }
    }
    return reports;
  }

  /** Compare current results against history. */
  detectRegression(
    current: BenchmarkReport,
    history: BenchmarkReport[],
  ): RegressionReport {
    const regressions: Regression[] = [];
    const improvements: Improvement[] = [];
    const stable: string[] = [];

    if (history.length === 0) {
      // No history — everything is stable by default
      for (const test of current.tests) {
        stable.push(test.name);
      }
      return { regressions, improvements, stable };
    }

    // Use last 5 runs for comparison
    const recentHistory = history.slice(-5);

    for (const currentTest of current.tests) {
      const historicalScores: number[] = [];
      for (const report of recentHistory) {
        const match = report.tests.find(t => t.name === currentTest.name);
        if (match) historicalScores.push(match.score);
      }

      if (historicalScores.length === 0) {
        stable.push(currentTest.name);
        continue;
      }

      const avgPrevious = historicalScores.reduce((a, b) => a + b, 0) / historicalScores.length;
      const percentChange = avgPrevious > 0
        ? ((currentTest.score - avgPrevious) / avgPrevious) * 100
        : currentTest.score > 0 ? 100 : 0;

      // Compute significance using Welch's t-test approximation
      const significance = this.computeSignificance(currentTest.score, historicalScores);

      if (percentChange < -10 && significance < 0.05) {
        let severity: 'critical' | 'moderate' | 'minor';
        if (!currentTest.passed) severity = 'critical';
        else if (percentChange < -25) severity = 'critical';
        else if (percentChange < -15) severity = 'moderate';
        else severity = 'minor';

        regressions.push({
          testName: currentTest.name,
          previousScore: Math.round(avgPrevious),
          currentScore: currentTest.score,
          percentChange: Math.round(percentChange * 10) / 10,
          significance: Math.round(significance * 1000) / 1000,
          severity,
        });
      } else if (percentChange > 10 && significance < 0.05) {
        improvements.push({
          testName: currentTest.name,
          previousScore: Math.round(avgPrevious),
          currentScore: currentTest.score,
          percentChange: Math.round(percentChange * 10) / 10,
        });
      } else {
        stable.push(currentTest.name);
      }
    }

    return { regressions, improvements, stable };
  }

  /**
   * Approximate p-value using z-test against historical mean.
   * Uses the normal probability density function: p ≈ 2 * exp(-z²/2)
   * as a fast two-tailed approximation for moderate z values.
   */
  private computeSignificance(current: number, history: number[]): number {
    if (history.length < 2) return 1.0;

    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const variance = history.reduce((s, v) => s + (v - mean) ** 2, 0) / (history.length - 1);
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return current === mean ? 1.0 : 0.01;

    const z = Math.abs(current - mean) / stdDev;
    // Approximate p-value from z-score (two-tailed)
    return Math.exp(-0.5 * z * z) * 2;
  }
}
