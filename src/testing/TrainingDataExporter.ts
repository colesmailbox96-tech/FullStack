import type { DecisionLog } from '../data/DataLogger';
import type { ActionType } from '../ai/Action';

/** Maps action types to integer labels for ML training. */
export const ACTION_LABELS: Record<string, number> = {
  FORAGE: 0,
  REST: 1,
  SEEK_SHELTER: 2,
  EXPLORE: 3,
  SOCIALIZE: 4,
  IDLE: 5,
  GATHER: 6,
  CRAFT: 7,
  BUILD: 8,
  FISH: 9,
};

/** The 5 core action types used for ML training analysis. */
const CORE_ACTIONS = ['FORAGE', 'REST', 'SEEK_SHELTER', 'EXPLORE', 'SOCIALIZE'];

/** Memory type to integer encoding. */
const MEMORY_TYPE_CODES: Record<string, number> = {
  found_food: 0,
  danger: 1,
  met_npc: 2,
  found_shelter: 3,
  discovered_area: 4,
  npc_died: 5,
  crafted_item: 6,
  gathered_resource: 7,
};

/** Weather to integer encoding. */
const WEATHER_CODES: Record<string, number> = {
  clear: 0,
  cloudy: 1,
  rain: 2,
  storm: 3,
  snow: 4,
  fog: 5,
};

/** Season to integer encoding. */
const SEASON_CODES: Record<string, number> = {
  spring: 0,
  summer: 1,
  autumn: 2,
  winter: 3,
};

/** Tile type name to integer encoding. */
const TILE_TYPE_CODES: Record<string, number> = {
  grass: 0,
  flower_grass: 0,
  dense_grass: 0,
  water: 1,
  stone: 2,
  dirt: 3,
};

/** The perception vector is 30 floats. */
export const PERCEPTION_VECTOR_LENGTH = 30;

export interface ExportMetadata {
  totalSamples: number;
  perceptionVectorLength: number;
  actionCount: number;
  actionDistribution: Record<string, number>;
  needsRanges: Record<string, { min: number; max: number; mean: number; std: number }>;
  correlationMatrix: number[][];
  exportTimestamp: string;
  schemaVersion: string;
  worldSeed: number;
  configProfile: string;
}

export interface DatasetStats {
  totalSamples: number;
  actionDistribution: Record<string, number>;
  needsMeans: Record<string, number>;
  needsStdDevs: Record<string, number>;
  featureCorrelations: CorrelationReport;
  temporalPatterns: TemporalReport;
  qualityScore: number;
}

export interface CorrelationReport {
  needsActionCorrelations: Record<string, Record<string, number>>;
}

export interface TemporalReport {
  tickRange: [number, number];
  samplesPerTimePeriod: Record<string, number>;
  weatherCoverage: Record<string, number>;
  seasonCoverage: Record<string, number>;
}

/**
 * Encode a single DecisionLog perception into a fixed-length 30-float vector.
 *
 * Layout:
 *  [0-4]   hunger, energy, social, curiosity, safety          — 5 needs
 *  [5-7]   timeOfDay, weatherCode, seasonCode                 — 3 environment
 *  [8-11]  nearbyGrass, nearbyWater, nearbyStone, nearbyDirt  — 4 terrain summary
 *  [12-13] nearbyFoodCount, nearbyFoodAvgDist                 — 2 food availability
 *  [14-15] nearbyNPCCount, nearbyNPCAvgDist                   — 2 social context
 *  [16-17] nearbyObjectCount, hasShelterNearby                — 2 object context
 *  [18-20] topMemory1Type, topMemory1Recency, topMemory1Sig   — 3 memory 1
 *  [21-23] topMemory2Type, topMemory2Recency, topMemory2Sig   — 3 memory 2
 *  [24-26] topMemory3Type, topMemory3Recency, topMemory3Sig   — 3 memory 3
 *  [27-29] cameraX, cameraY, cameraDwell                      — 3 player awareness
 */
export function encodePerception(p: DecisionLog['perception'], tick: number): number[] {
  const vec = new Array<number>(PERCEPTION_VECTOR_LENGTH).fill(0);

  // 0-4: needs
  vec[0] = p.needs.hunger ?? 0;
  vec[1] = p.needs.energy ?? 0;
  vec[2] = p.needs.social ?? 0;
  vec[3] = p.needs.curiosity ?? 0;
  vec[4] = p.needs.safety ?? 0;

  // 5-7: environment
  vec[5] = p.time_of_day ?? 0;
  vec[6] = WEATHER_CODES[p.weather] ?? 0;
  vec[7] = SEASON_CODES[p.season ?? ''] ?? 0;

  // 8-11: terrain summary
  const tileSummary = p.nearby_tiles_summary ?? {};
  vec[8] = tileSummary['grass'] ?? 0;
  vec[9] = tileSummary['water'] ?? 0;
  vec[10] = tileSummary['stone'] ?? 0;
  vec[11] = tileSummary['dirt'] ?? 0;

  // 12-13: food availability
  const foodObjects = (p.nearby_objects ?? []).filter(
    o => o.type === 'berry_bush' && o.state !== 'depleted',
  );
  vec[12] = foodObjects.length;
  if (foodObjects.length > 0) {
    const avgDist = foodObjects.reduce(
      (sum, o) => sum + Math.sqrt(o.dx * o.dx + o.dy * o.dy), 0,
    ) / foodObjects.length;
    vec[13] = avgDist;
  }

  // 14-15: social context
  const npcs = p.nearby_npcs ?? [];
  vec[14] = npcs.length;
  if (npcs.length > 0) {
    const avgDist = npcs.reduce(
      (sum, n) => sum + Math.sqrt(n.dx * n.dx + n.dy * n.dy), 0,
    ) / npcs.length;
    vec[15] = avgDist;
  }

  // 16-17: object context
  vec[16] = (p.nearby_objects ?? []).length;
  const shelterNearby = (p.nearby_objects ?? []).some(o => o.type === 'campfire') ? 1 : 0;
  vec[17] = shelterNearby;

  // 18-26: top 3 memories
  const memories = p.top_memories ?? [];
  for (let i = 0; i < 3; i++) {
    const base = 18 + i * 3;
    if (i < memories.length) {
      vec[base] = MEMORY_TYPE_CODES[memories[i].type] ?? 0;
      vec[base + 1] = memories[i].ticks_ago ?? 0;
      vec[base + 2] = memories[i].significance ?? 0;
    }
  }

  // 27-29: player awareness (camera)
  vec[27] = p.camera_x ?? 0;
  vec[28] = p.camera_y ?? 0;
  vec[29] = 0; // cameraDwell

  return vec;
}

/** Encode an action string to an integer label. */
export function encodeAction(action: string): number {
  return ACTION_LABELS[action] ?? ACTION_LABELS['IDLE'];
}

export class TrainingDataExporter {
  /** Convert raw decision logs to tensor-ready format. */
  exportToTensors(
    log: DecisionLog[],
    worldSeed: number = 0,
    configProfile: string = 'gameplay',
  ): {
    perceptionVectors: number[][];
    actionLabels: number[];
    outcomeVectors: number[][];
    metadata: ExportMetadata;
  } {
    const perceptionVectors: number[][] = [];
    const actionLabels: number[] = [];
    const outcomeVectors: number[][] = [];

    for (const entry of log) {
      perceptionVectors.push(encodePerception(entry.perception, entry.tick));
      actionLabels.push(encodeAction(entry.decision));

      const delta = entry.outcome?.needs_delta ?? {};
      outcomeVectors.push([
        delta.hunger ?? 0,
        delta.energy ?? 0,
        delta.social ?? 0,
        delta.curiosity ?? 0,
        delta.safety ?? 0,
      ]);
    }

    const metadata = this.buildMetadata(log, perceptionVectors, actionLabels, worldSeed, configProfile);

    return { perceptionVectors, actionLabels, outcomeVectors, metadata };
  }

  /** Export as downloadable JSON for Python training pipeline. */
  exportAsJSON(log: DecisionLog[]): string {
    const data = this.exportToTensors(log);
    return JSON.stringify(data, null, 2);
  }

  /** Export as CSV for quick analysis. */
  exportAsCSV(log: DecisionLog[]): string {
    const { perceptionVectors, actionLabels, outcomeVectors } = this.exportToTensors(log);

    const headers: string[] = [];
    for (let i = 0; i < PERCEPTION_VECTOR_LENGTH; i++) {
      headers.push(`feature_${i}`);
    }
    headers.push('action_label');
    headers.push('outcome_hunger', 'outcome_energy', 'outcome_social', 'outcome_curiosity', 'outcome_safety');

    const rows = [headers.join(',')];
    for (let i = 0; i < perceptionVectors.length; i++) {
      const row = [
        ...perceptionVectors[i].map(v => v.toFixed(6)),
        actionLabels[i].toString(),
        ...outcomeVectors[i].map(v => v.toFixed(6)),
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  /** Compute dataset statistics. */
  getDatasetStats(log: DecisionLog[]): DatasetStats {
    const actionCounts: Record<string, number> = {};
    const needsValues: Record<string, number[]> = {
      hunger: [], energy: [], social: [], curiosity: [], safety: [],
    };

    for (const entry of log) {
      actionCounts[entry.decision] = (actionCounts[entry.decision] || 0) + 1;
      const needs = entry.perception.needs;
      needsValues.hunger.push(needs.hunger ?? 0);
      needsValues.energy.push(needs.energy ?? 0);
      needsValues.social.push(needs.social ?? 0);
      needsValues.curiosity.push(needs.curiosity ?? 0);
      needsValues.safety.push(needs.safety ?? 0);
    }

    const needsMeans: Record<string, number> = {};
    const needsStdDevs: Record<string, number> = {};
    for (const [need, values] of Object.entries(needsValues)) {
      const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
      needsMeans[need] = mean;
      const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length || 1);
      needsStdDevs[need] = Math.sqrt(variance);
    }

    const featureCorrelations = this.computeCorrelations(log);
    const temporalPatterns = this.computeTemporalPatterns(log);

    // Quality score: simple composite
    const actionTypes = Object.keys(actionCounts).length;
    const diversityScore = Math.min(100, (actionTypes / 5) * 100);
    const sizeScore = Math.min(100, (log.length / 50000) * 100);
    const qualityScore = Math.round((diversityScore + sizeScore) / 2);

    return {
      totalSamples: log.length,
      actionDistribution: actionCounts,
      needsMeans,
      needsStdDevs,
      featureCorrelations,
      temporalPatterns,
      qualityScore,
    };
  }

  private buildMetadata(
    log: DecisionLog[],
    perceptionVectors: number[][],
    actionLabels: number[],
    worldSeed: number,
    configProfile: string,
  ): ExportMetadata {
    const actionDist: Record<string, number> = {};
    for (const entry of log) {
      actionDist[entry.decision] = (actionDist[entry.decision] || 0) + 1;
    }

    const needsRanges: Record<string, { min: number; max: number; mean: number; std: number }> = {};
    const needKeys = ['hunger', 'energy', 'social', 'curiosity', 'safety'];
    for (const need of needKeys) {
      const values = log.map(e => (e.perception.needs as Record<string, number>)[need] ?? 0);
      if (values.length === 0) {
        needsRanges[need] = { min: 0, max: 0, mean: 0, std: 0 };
        continue;
      }
      const min = Math.min(...values);
      const max = Math.max(...values);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      needsRanges[need] = { min, max, mean, std: Math.sqrt(variance) };
    }

    // Build correlation matrix: needs × actions
    const correlationMatrix = this.buildCorrelationMatrix(log, needKeys);

    return {
      totalSamples: log.length,
      perceptionVectorLength: PERCEPTION_VECTOR_LENGTH,
      actionCount: Object.keys(ACTION_LABELS).length,
      actionDistribution: actionDist,
      needsRanges,
      correlationMatrix,
      exportTimestamp: new Date().toISOString(),
      schemaVersion: '1.0.0',
      worldSeed,
      configProfile,
    };
  }

  private buildCorrelationMatrix(log: DecisionLog[], needKeys: string[]): number[][] {
    const matrix: number[][] = [];
    for (const need of needKeys) {
      const row: number[] = [];
      for (const action of CORE_ACTIONS) {
        const r = pearsonCorrelation(
          log.map(e => (e.perception.needs as Record<string, number>)[need] ?? 0),
          log.map(e => e.decision === action ? 1 : 0),
        );
        row.push(r);
      }
      matrix.push(row);
    }
    return matrix;
  }

  private computeCorrelations(log: DecisionLog[]): CorrelationReport {
    const needKeys = ['hunger', 'energy', 'social', 'curiosity', 'safety'];
    const result: Record<string, Record<string, number>> = {};
    for (const need of needKeys) {
      result[need] = {};
      for (const action of CORE_ACTIONS) {
        result[need][action] = pearsonCorrelation(
          log.map(e => (e.perception.needs as Record<string, number>)[need] ?? 0),
          log.map(e => e.decision === action ? 1 : 0),
        );
      }
    }
    return { needsActionCorrelations: result };
  }

  private computeTemporalPatterns(log: DecisionLog[]): TemporalReport {
    const ticks = log.map(e => e.tick);
    const tickRange: [number, number] = ticks.length > 0
      ? [Math.min(...ticks), Math.max(...ticks)]
      : [0, 0];

    const samplesPerTimePeriod: Record<string, number> = { dawn: 0, day: 0, dusk: 0, night: 0 };
    for (const entry of log) {
      const t = entry.perception.time_of_day;
      if (t < 0.15 || t >= 0.80) samplesPerTimePeriod['night']++;
      else if (t < 0.25) samplesPerTimePeriod['dawn']++;
      else if (t < 0.70) samplesPerTimePeriod['day']++;
      else samplesPerTimePeriod['dusk']++;
    }

    const weatherCoverage: Record<string, number> = {};
    for (const entry of log) {
      const w = entry.perception.weather;
      weatherCoverage[w] = (weatherCoverage[w] || 0) + 1;
    }

    const seasonCoverage: Record<string, number> = {};

    return { tickRange, samplesPerTimePeriod, weatherCoverage, seasonCoverage };
  }
}

/** Compute Pearson correlation coefficient between two arrays. */
export function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n === 0) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
    sumXY += xs[i] * ys[i];
    sumX2 += xs[i] * xs[i];
    sumY2 += ys[i] * ys[i];
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/** Compute Shannon entropy of a distribution (given counts). */
export function shannonEntropy(counts: Record<string, number>): number {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;

  let entropy = 0;
  for (const count of Object.values(counts)) {
    if (count === 0) continue;
    const p = count / total;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}
