export interface PerformanceCheckReport {
  ticksPerSecond: number;
  perceptionBuildMs: number;
  decisionMs: number;
  dataLogMs: number;
  memoryUsageMB: number;
  meetsTarget: boolean;
}

export interface PerformanceSample {
  tick: number;
  tickMs: number;
  perceptionMs: number;
  decisionMs: number;
  logMs: number;
  heapMB: number;
}

export class PerformanceProfiler {
  private samples: PerformanceSample[] = [];
  private maxSamples: number;

  constructor(maxSamples: number = 1000) {
    this.maxSamples = maxSamples;
  }

  /** Record a performance sample. */
  record(sample: PerformanceSample): void {
    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  /** Get the latest N samples. */
  getRecentSamples(count: number = 60): PerformanceSample[] {
    return this.samples.slice(-count);
  }

  /** Generate a performance report from collected samples. */
  getReport(): PerformanceCheckReport {
    if (this.samples.length === 0) {
      return {
        ticksPerSecond: 0,
        perceptionBuildMs: 0,
        decisionMs: 0,
        dataLogMs: 0,
        memoryUsageMB: 0,
        meetsTarget: false,
      };
    }

    const recent = this.getRecentSamples(60);
    const avgTickMs = recent.reduce((s, r) => s + r.tickMs, 0) / recent.length;
    const tps = avgTickMs > 0 ? 1000 / avgTickMs : 0;
    const avgPerceptionMs = recent.reduce((s, r) => s + r.perceptionMs, 0) / recent.length;
    const avgDecisionMs = recent.reduce((s, r) => s + r.decisionMs, 0) / recent.length;
    const avgLogMs = recent.reduce((s, r) => s + r.logMs, 0) / recent.length;
    const latestHeap = recent[recent.length - 1]?.heapMB ?? 0;

    return {
      ticksPerSecond: Math.round(tps * 100) / 100,
      perceptionBuildMs: Math.round(avgPerceptionMs * 1000) / 1000,
      decisionMs: Math.round(avgDecisionMs * 1000) / 1000,
      dataLogMs: Math.round(avgLogMs * 1000) / 1000,
      memoryUsageMB: Math.round(latestHeap * 100) / 100,
      meetsTarget: tps >= 60,
    };
  }

  /** Check for memory leaks by comparing early and late heap usage. */
  detectMemoryLeak(): { leaked: boolean; growthMBPerK: number } {
    if (this.samples.length < 100) {
      return { leaked: false, growthMBPerK: 0 };
    }

    const earlyAvg = this.samples.slice(0, 50).reduce((s, r) => s + r.heapMB, 0) / 50;
    const lateAvg = this.samples.slice(-50).reduce((s, r) => s + r.heapMB, 0) / 50;
    const growthMB = lateAvg - earlyAvg;
    const tickSpan = this.samples[this.samples.length - 1].tick - this.samples[0].tick;
    const growthPerKTicks = tickSpan > 0 ? (growthMB / tickSpan) * 1000 : 0;

    return {
      leaked: growthPerKTicks > 5, // > 5 MB per 1000 ticks suggests a leak
      growthMBPerK: Math.round(growthPerKTicks * 100) / 100,
    };
  }

  /** Clear all samples. */
  clear(): void {
    this.samples = [];
  }
}
