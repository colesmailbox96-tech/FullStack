import { Experience, ExperienceEncoder } from './ExperienceEncoder';

export interface MemoryEmbedding {
  vector: number[];
  significance: number;
  tick: number;
  originalExperience: Experience;
}

function computeSignificance(experience: Experience): number {
  let sig = 0.3;
  const needChangeSum = experience.needsDelta.map(Math.abs).reduce((a, b) => a + b, 0);
  sig += Math.min(needChangeSum * 2.0, 0.3);
  sig += experience.novelty * 0.2;
  if (!experience.wasSuccessful) sig += 0.15;
  if (experience.actionTaken === 4) sig += 0.1;
  if (experience.perceptionEmbedding[0] < 0.1) sig += 0.3;
  if (experience.perceptionEmbedding[4] < 0.1) sig += 0.3;
  return Math.min(sig, 1.0);
}

export class EpisodicMemoryBuffer {
  private buffer: MemoryEmbedding[];
  private maxSize: number;
  private embeddingDim: number;

  constructor(maxSize = 32, embeddingDim = 64) {
    this.buffer = [];
    this.maxSize = maxSize;
    this.embeddingDim = embeddingDim;
  }

  store(experience: Experience, experienceEncoder: ExperienceEncoder): void {
    const vector = experienceEncoder.encode(experience);
    const significance = computeSignificance(experience);
    const entry: MemoryEmbedding = {
      vector,
      significance,
      tick: experience.tick,
      originalExperience: experience,
    };

    if (this.buffer.length >= this.maxSize) {
      let minIdx = 0;
      let minSig = this.buffer[0].significance;
      for (let i = 1; i < this.buffer.length; i++) {
        if (this.buffer[i].significance < minSig) {
          minSig = this.buffer[i].significance;
          minIdx = i;
        }
      }
      this.buffer.splice(minIdx, 1);
    }

    this.buffer.push(entry);
  }

  getMemorySequence(): number[][] {
    const sequence: number[][] = [];
    for (let i = 0; i < this.maxSize; i++) {
      if (i < this.buffer.length) {
        sequence.push([...this.buffer[i].vector]);
      } else {
        sequence.push(new Array(this.embeddingDim).fill(0));
      }
    }
    return sequence;
  }

  getAttentionMask(): boolean[] {
    const mask: boolean[] = [];
    for (let i = 0; i < this.maxSize; i++) {
      mask.push(i < this.buffer.length);
    }
    return mask;
  }

  decayMemories(decayRate = 0.0005): void {
    for (const mem of this.buffer) {
      mem.significance -= decayRate;
      if (mem.significance > 0.7) {
        mem.significance += decayRate * 0.5;
      }
    }
    this.buffer = this.buffer.filter((mem) => mem.significance > 0);
  }

  getBufferSize(): number {
    return this.buffer.length;
  }

  getBuffer(): MemoryEmbedding[] {
    return this.buffer;
  }
}
