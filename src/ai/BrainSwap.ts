import type { IBrain } from './IBrain';
import { BehaviorTreeBrain } from './BehaviorTreeBrain';
import { NeuralNetBrain } from './neural/NeuralNetBrain';

export type BrainType = 'behavior_tree' | 'neural_net';

export function createBrain(type: BrainType): IBrain {
  if (type === 'neural_net') {
    return new NeuralNetBrain();
  }
  return new BehaviorTreeBrain();
}

export function getBrainType(brain: IBrain): BrainType {
  if (brain instanceof NeuralNetBrain) return 'neural_net';
  return 'behavior_tree';
}

export function toggleBrainType(currentBrain: IBrain): IBrain {
  if (currentBrain instanceof NeuralNetBrain) {
    return new BehaviorTreeBrain();
  }
  return new NeuralNetBrain();
}

// Set a specific ratio of neural net brains in a population
export function setMixedBrains(brains: IBrain[], ratio: number): IBrain[] {
  const neuralCount = Math.round(brains.length * ratio);
  return brains.map((_, i) =>
    i < neuralCount ? new NeuralNetBrain() : new BehaviorTreeBrain()
  );
}
