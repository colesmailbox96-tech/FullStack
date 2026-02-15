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

export interface DecisionLog {
  schema_version: string;
  tick: number;
  npc_id: string;
  perception: Perception;
  decision: string;
  outcome: Outcome;
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
