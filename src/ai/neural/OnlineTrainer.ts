import { TransformerBrain } from './TransformerBrain';
import { PerceptionEncoder } from './PerceptionEncoder';
import { NeuralNetLoss } from './NeuralNetLoss';
import { AdamOptimizer } from './AdamOptimizer';
import { ReplayBuffer } from './ReplayBuffer';

export interface OnlineTrainingConfig {
  updateInterval: number;
  batchSize: number;
  learningRate: number;
  maxUpdateTimeMs: number;
}

const DEFAULT_CONFIG: OnlineTrainingConfig = {
  updateInterval: 100,
  batchSize: 8,
  learningRate: 0.0001,
  maxUpdateTimeMs: 5,
};

export class OnlineTrainer {
  readonly updateInterval: number;
  private batchSize: number;
  private optimizer: AdamOptimizer;
  private loss: NeuralNetLoss;
  private maxUpdateTimeMs: number;

  constructor(config?: Partial<OnlineTrainingConfig>) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    this.updateInterval = cfg.updateInterval;
    this.batchSize = cfg.batchSize;
    this.optimizer = new AdamOptimizer(cfg.learningRate);
    this.loss = new NeuralNetLoss();
    this.maxUpdateTimeMs = cfg.maxUpdateTimeMs;
  }

  update(
    brain: TransformerBrain,
    perceptionEncoder: PerceptionEncoder,
    replayBuffer: ReplayBuffer
  ): number | null {
    if (replayBuffer.size < this.batchSize) return null;

    const batch = replayBuffer.sample(this.batchSize);
    let totalLoss = 0;
    const startTime = performance.now();

    for (const experience of batch) {
      if (performance.now() - startTime > this.maxUpdateTimeMs) break;

      // Build a dummy memory sequence from the perception embedding
      const memorySequence: number[][] = [];
      const attentionMask: boolean[] = [];
      for (let i = 0; i < brain.numMemorySlots; i++) {
        memorySequence.push(new Array(brain.embeddingDim).fill(0));
        attentionMask.push(false);
      }

      const { actionProbabilities, emotionalState } = brain.forward(
        experience.perceptionEmbedding,
        memorySequence,
        attentionMask
      );

      const sampleLoss = this.loss.total(
        actionProbabilities,
        experience.actionTaken,
        emotionalState,
        experience.needsDelta
      );

      totalLoss += sampleLoss;
    }

    return totalLoss / batch.length;
  }
}
