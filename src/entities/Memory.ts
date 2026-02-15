export type MemoryType = 'found_food' | 'danger' | 'met_npc' | 'found_shelter' | 'discovered_area' | 'npc_died' | 'crafted_item' | 'gathered_resource';

export interface Memory {
  type: MemoryType;
  tick: number;
  x: number;
  y: number;
  significance: number;
  relatedNpcId?: string;
  detail?: string;
}

export class MemorySystem {
  private memories: Memory[];
  private capacity: number;

  constructor(capacity: number) {
    this.memories = [];
    this.capacity = capacity;
  }

  addMemory(memory: Memory): void {
    this.memories.push(memory);
    if (this.memories.length > this.capacity) {
      let lowestIdx = 0;
      let lowestSig = this.memories[0].significance;
      for (let i = 1; i < this.memories.length; i++) {
        if (this.memories[i].significance < lowestSig) {
          lowestSig = this.memories[i].significance;
          lowestIdx = i;
        }
      }
      this.memories.splice(lowestIdx, 1);
    }
  }

  getMemories(): Memory[] {
    return this.memories;
  }

  getTopMemories(count: number): Memory[] {
    return [...this.memories]
      .sort((a, b) => b.significance - a.significance)
      .slice(0, count);
  }

  getMemoriesByType(type: MemoryType): Memory[] {
    return this.memories.filter(m => m.type === type);
  }

  update(decayRate: number): void {
    for (const memory of this.memories) {
      memory.significance = Math.max(0, memory.significance - decayRate);
    }
    this.memories = this.memories.filter(m => m.significance > 0);
  }

  getRecentFoodLocation(): { x: number; y: number } | null {
    const foodMemories = this.getMemoriesByType('found_food');
    if (foodMemories.length === 0) return null;
    const best = foodMemories.reduce((a, b) => a.significance > b.significance ? a : b);
    return { x: best.x, y: best.y };
  }

  getRecentShelterLocation(): { x: number; y: number } | null {
    const shelterMemories = this.getMemoriesByType('found_shelter');
    if (shelterMemories.length === 0) return null;
    const best = shelterMemories.reduce((a, b) => a.significance > b.significance ? a : b);
    return { x: best.x, y: best.y };
  }
}
