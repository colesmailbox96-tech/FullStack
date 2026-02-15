interface NearbyNPC {
  id: string;
  dx: number;
  dy: number;
}

interface NearbyObject {
  type: string;
  dx: number;
  dy: number;
  state: string;
}

interface MemoryEntry {
  type: string;
  ticks_ago: number;
}

interface Perception {
  nearby_tiles_summary: Record<string, number>;
  nearby_npcs: NearbyNPC[];
  nearby_objects: NearbyObject[];
  needs: Record<string, number>;
  top_memories: MemoryEntry[];
  weather: string;
  time_of_day: number;
}

interface Outcome {
  needs_delta: Record<string, number>;
  event?: string;
}

export interface DecisionLogEntry {
  decision: string;
}

export interface DecisionLog {
  schema_version: string;
  tick: number;
  npc_id: string;
  perception: Perception;
  decision: string;
  outcome: Outcome;
}

/**
 * Validates training data diversity (Fix 7).
 * Returns { valid, report } where valid is false if any expected action
 * is below 5% or above 50%. Called automatically every 5,000 ticks.
 */
export function validateTrainingData(log: DecisionLogEntry[]): { valid: boolean; report: string } {
  const counts: Record<string, number> = {};
  for (const entry of log) {
    counts[entry.decision] = (counts[entry.decision] || 0) + 1;
  }
  const total = log.length;
  const lines: string[] = ['=== Training Data Validation ==='];
  let valid = true;
  const expectedActions = ['FORAGE', 'REST', 'SEEK_SHELTER', 'EXPLORE', 'SOCIALIZE'];

  for (const action of expectedActions) {
    const count = counts[action] || 0;
    const pct = total > 0 ? (count / total) * 100 : 0;
    const status = pct < 5 ? '❌ FAIL' : pct > 50 ? '⚠️ DOMINANT' : '✅ OK';
    lines.push(`  ${action.padEnd(15)} ${pct.toFixed(1).padStart(5)}%  ${status}`);
    if (pct < 5 || pct > 50) valid = false;
  }

  lines.push('');
  lines.push(valid ? '✅ Data diversity: PASSED' : '❌ Data diversity: FAILED — adjust world parameters');

  return { valid, report: lines.join('\n') };
}

/**
 * Runs the simulation for a number of ticks and prints the action distribution
 * across all NPCs. Use before/after parameter changes to measure impact.
 */
export function diagnoseActionDistribution(
  tickFn: () => void,
  getNPCs: () => Array<{ currentAction: string }>,
  ticks: number,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (let i = 0; i < ticks; i++) {
    tickFn();
    for (const npc of getNPCs()) {
      const action = npc.currentAction;
      counts[action] = (counts[action] || 0) + 1;
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log('=== Action Distribution ===');
  for (const [action, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / total) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count / total * 40));
    console.log(`  ${action.padEnd(15)} ${bar} ${pct}%`);
  }
  return counts;
}

export class DataLogger {
  private buffer: DecisionLog[];
  private maxBuffer: number;

  constructor(maxBuffer: number = 10000) {
    this.buffer = [];
    this.maxBuffer = maxBuffer;
  }

  log(entry: DecisionLog): void {
    if (this.buffer.length >= this.maxBuffer) {
      this.buffer.shift();
    }
    this.buffer.push(entry);
  }

  getBuffer(): DecisionLog[] {
    return [...this.buffer];
  }

  downloadAsJSONL(): void {
    const lines = this.buffer.map((entry) => JSON.stringify(entry)).join('\n');
    const blob = new Blob([lines], { type: 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `decisions_${Date.now()}.jsonl`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  getBufferSize(): number {
    return this.buffer.length;
  }

  clear(): void {
    this.buffer = [];
  }
}
