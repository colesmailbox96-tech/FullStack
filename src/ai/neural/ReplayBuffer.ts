import type { Experience } from './ExperienceEncoder';

export class ReplayBuffer {
  private buffer: Experience[];
  private maxSize: number;

  constructor(maxSize = 500) {
    this.buffer = [];
    this.maxSize = maxSize;
  }

  add(experience: Experience): void {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift();
    }
    this.buffer.push(experience);
  }

  sample(batchSize: number): Experience[] {
    if (this.buffer.length === 0) return [];
    const count = Math.min(batchSize, this.buffer.length);

    // Priority weights based on |needsDelta| sum + novelty
    const weights = this.buffer.map(exp => {
      const needsImpact = exp.needsDelta.reduce((sum, d) => sum + Math.abs(d), 0);
      return needsImpact + exp.novelty;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const sampled: Experience[] = [];
    const usedIndices = new Set<number>();

    for (let s = 0; s < count; s++) {
      let r = Math.random() * totalWeight;
      let idx = 0;
      for (let i = 0; i < this.buffer.length; i++) {
        r -= weights[i];
        if (r <= 0) {
          idx = i;
          break;
        }
      }
      // Avoid duplicates when possible
      if (usedIndices.has(idx) && usedIndices.size < this.buffer.length) {
        for (let i = 0; i < this.buffer.length; i++) {
          if (!usedIndices.has(i)) {
            idx = i;
            break;
          }
        }
      }
      usedIndices.add(idx);
      sampled.push(this.buffer[idx]);
    }

    return sampled;
  }

  get size(): number {
    return this.buffer.length;
  }

  clear(): void {
    this.buffer = [];
  }
}
