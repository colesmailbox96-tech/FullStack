import { Tensor } from './Tensor';
import { TransformerBrain } from './TransformerBrain';
import { PerceptionEncoder } from './PerceptionEncoder';
import { ExperienceEncoder } from './ExperienceEncoder';
import { NeuralNetLoss } from './NeuralNetLoss';
import { AdamOptimizer } from './AdamOptimizer';
import { EpisodicMemoryBuffer } from './EpisodicMemory';

const ACTION_TYPES = ['FORAGE', 'REST', 'SEEK_SHELTER', 'EXPLORE', 'SOCIALIZE', 'IDLE'];

export interface TrainingConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
  learningRateDecay: number;
  maxGradNorm: number;
  validationSplit: number;
  earlyStoppingPatience: number;
  shuffleData: boolean;
}

export interface TrainingReport {
  epochs: number;
  finalTrainLoss: number;
  finalValLoss: number;
  finalTrainAccuracy: number;
  finalValAccuracy: number;
  bestValLoss: number;
  bestValEpoch: number;
  lossHistory: Array<{ epoch: number; trainLoss: number; valLoss: number }>;
  accuracyHistory: Array<{ epoch: number; trainAcc: number; valAcc: number }>;
  perActionAccuracy: Record<string, number>;
  trainingTimeMs: number;
  totalParameters: number;
  convergenceEpoch: number;
}

export interface TrainingSample {
  perceptionVector: number[];
  actionLabel: number;
  outcomeVector: number[];
  needs: number[];
}

const DEFAULT_CONFIG: TrainingConfig = {
  epochs: 50,
  batchSize: 32,
  learningRate: 0.001,
  learningRateDecay: 0.95,
  maxGradNorm: 1.0,
  validationSplit: 0.2,
  earlyStoppingPatience: 5,
  shuffleData: true,
};

export class Trainer {
  private network: TransformerBrain;
  private perceptionEncoder: PerceptionEncoder;
  private optimizer: AdamOptimizer;
  private loss: NeuralNetLoss;

  constructor(
    network: TransformerBrain,
    perceptionEncoder: PerceptionEncoder
  ) {
    this.network = network;
    this.perceptionEncoder = perceptionEncoder;
    this.optimizer = new AdamOptimizer();
    this.loss = new NeuralNetLoss();
  }

  trainOffline(
    samples: TrainingSample[],
    config?: Partial<TrainingConfig>
  ): TrainingReport {
    const cfg: TrainingConfig = { ...DEFAULT_CONFIG, ...config };
    const startTime = performance.now();

    this.optimizer = new AdamOptimizer(cfg.learningRate);

    const splitIdx = Math.floor(samples.length * (1 - cfg.validationSplit));
    const allIndices = Array.from({ length: samples.length }, (_, i) => i);
    if (cfg.shuffleData) {
      this.shuffleArray(allIndices);
    }
    const trainSamples = allIndices.slice(0, splitIdx).map(i => samples[i]);
    const valSamples = allIndices.slice(splitIdx).map(i => samples[i]);

    const lossHistory: Array<{ epoch: number; trainLoss: number; valLoss: number }> = [];
    const accuracyHistory: Array<{ epoch: number; trainAcc: number; valAcc: number }> = [];

    let bestValLoss = Infinity;
    let bestValEpoch = 0;
    let patienceCounter = 0;
    let convergenceEpoch = cfg.epochs;
    let currentLr = cfg.learningRate;

    let finalTrainLoss = 0;
    let finalTrainAcc = 0;
    let finalValLoss = 0;
    let finalValAcc = 0;
    let finalPerActionAcc: Record<string, number> = {};

    const totalParameters = this.countParameters();

    for (let epoch = 0; epoch < cfg.epochs; epoch++) {
      // Shuffle training data each epoch
      const epochIndices = Array.from({ length: trainSamples.length }, (_, i) => i);
      if (cfg.shuffleData) {
        this.shuffleArray(epochIndices);
      }

      let trainLossSum = 0;
      let trainCorrect = 0;

      // Process training samples in batches
      for (let batchStart = 0; batchStart < trainSamples.length; batchStart += cfg.batchSize) {
        const batchEnd = Math.min(batchStart + cfg.batchSize, trainSamples.length);

        // Zero gradients for perception encoder layers
        for (const layer of this.perceptionEncoder.getLinearLayers()) {
          layer.zeroGrad();
        }

        for (let i = batchStart; i < batchEnd; i++) {
          const sample = trainSamples[epochIndices[i]];
          const result = this.forwardSample(sample);

          const sampleLoss = this.loss.total(
            result.actionProbabilities,
            sample.actionLabel,
            result.emotionalState,
            sample.needs
          );
          trainLossSum += sampleLoss;

          const predicted = argmax(result.actionProbabilities);
          if (predicted === sample.actionLabel) {
            trainCorrect++;
          }
        }

        // Compute approximate gradients and update perception encoder weights
        this.updateEncoderWeights(trainSamples, epochIndices, batchStart, batchEnd, currentLr, cfg.maxGradNorm);
      }

      finalTrainLoss = trainLossSum / trainSamples.length;
      finalTrainAcc = trainCorrect / trainSamples.length;

      // Validation
      const valResult = this.evaluate(valSamples);
      finalValLoss = valResult.loss;
      finalValAcc = valResult.accuracy;
      finalPerActionAcc = valResult.perActionAccuracy;

      lossHistory.push({ epoch, trainLoss: finalTrainLoss, valLoss: finalValLoss });
      accuracyHistory.push({ epoch, trainAcc: finalTrainAcc, valAcc: finalValAcc });

      // Early stopping check
      if (finalValLoss < bestValLoss) {
        bestValLoss = finalValLoss;
        bestValEpoch = epoch;
        patienceCounter = 0;
      } else {
        patienceCounter++;
        if (patienceCounter >= cfg.earlyStoppingPatience) {
          convergenceEpoch = epoch;
          break;
        }
      }

      // Learning rate decay
      currentLr *= cfg.learningRateDecay;
    }

    if (convergenceEpoch === cfg.epochs && lossHistory.length === cfg.epochs) {
      convergenceEpoch = cfg.epochs - 1;
    }

    const trainingTimeMs = performance.now() - startTime;

    return {
      epochs: lossHistory.length,
      finalTrainLoss,
      finalValLoss,
      finalTrainAccuracy: finalTrainAcc,
      finalValAccuracy: finalValAcc,
      bestValLoss,
      bestValEpoch,
      lossHistory,
      accuracyHistory,
      perActionAccuracy: finalPerActionAcc,
      trainingTimeMs,
      totalParameters,
      convergenceEpoch,
    };
  }

  evaluate(samples: TrainingSample[]): {
    loss: number;
    accuracy: number;
    perActionAccuracy: Record<string, number>;
  } {
    if (samples.length === 0) {
      const perActionAccuracy: Record<string, number> = {};
      for (const action of ACTION_TYPES) {
        perActionAccuracy[action] = 0;
      }
      return { loss: 0, accuracy: 0, perActionAccuracy };
    }

    let totalLoss = 0;
    let totalCorrect = 0;

    const actionCorrect = new Array(ACTION_TYPES.length).fill(0);
    const actionTotal = new Array(ACTION_TYPES.length).fill(0);

    for (const sample of samples) {
      const result = this.forwardSample(sample);

      totalLoss += this.loss.total(
        result.actionProbabilities,
        sample.actionLabel,
        result.emotionalState,
        sample.needs
      );

      const predicted = argmax(result.actionProbabilities);
      if (predicted === sample.actionLabel) {
        totalCorrect++;
        actionCorrect[sample.actionLabel]++;
      }
      actionTotal[sample.actionLabel]++;
    }

    const perActionAccuracy: Record<string, number> = {};
    for (let i = 0; i < ACTION_TYPES.length; i++) {
      perActionAccuracy[ACTION_TYPES[i]] =
        actionTotal[i] > 0 ? actionCorrect[i] / actionTotal[i] : 0;
    }

    return {
      loss: totalLoss / samples.length,
      accuracy: totalCorrect / samples.length,
      perActionAccuracy,
    };
  }

  private forwardSample(sample: TrainingSample): {
    actionProbabilities: number[];
    emotionalState: number[];
  } {
    const embedding = this.perceptionEncoder.encode(sample.perceptionVector);
    // Empty memory sequence and mask for initial training (no episodic memory).
    // TransformerBrain.forward handles empty arrays by padding internally.
    const emptyMemorySequence: number[][] = [];
    const emptyAttentionMask: boolean[] = [];

    const result = this.network.forward(embedding, emptyMemorySequence, emptyAttentionMask);
    return {
      actionProbabilities: result.actionProbabilities,
      emotionalState: result.emotionalState,
    };
  }

  private updateEncoderWeights(
    trainSamples: TrainingSample[],
    epochIndices: number[],
    batchStart: number,
    batchEnd: number,
    lr: number,
    maxGradNorm: number
  ): void {
    const layers = this.perceptionEncoder.getLinearLayers();
    const lnParams = this.perceptionEncoder.getLayerNormParams();

    const parameters = new Map<string, Tensor>();
    const gradients = new Map<string, Tensor>();

    // Collect parameters and compute numerical gradients for encoder weights
    // Finite-difference epsilon: small enough for accuracy, large enough for numerical stability
    const eps = 1e-4;
    let layerIdx = 0;
    for (const layer of layers) {
      const wKey = `enc_layer${layerIdx}_weight`;
      const bKey = `enc_layer${layerIdx}_bias`;
      parameters.set(wKey, layer.weight);
      parameters.set(bKey, layer.bias);

      // Use accumulated gradients from forward/backward if available,
      // otherwise compute finite-difference approximation for a subset
      const wGrad = Tensor.zeros(layer.weight.shape);
      const bGrad = Tensor.zeros(layer.bias.shape);

      // Sample a subset of weight indices (cap at 64) to balance gradient accuracy vs compute cost
      const numWeightSamples = Math.min(layer.weight.data.length, 64);
      const weightStep = Math.max(1, Math.floor(layer.weight.data.length / numWeightSamples));

      for (let wi = 0; wi < layer.weight.data.length; wi += weightStep) {
        const origVal = layer.weight.data[wi];

        layer.weight.data[wi] = origVal + eps;
        const lossPlus = this.batchLoss(trainSamples, epochIndices, batchStart, batchEnd);

        layer.weight.data[wi] = origVal - eps;
        const lossMinus = this.batchLoss(trainSamples, epochIndices, batchStart, batchEnd);

        layer.weight.data[wi] = origVal;
        wGrad.data[wi] = (lossPlus - lossMinus) / (2 * eps);
      }

      // Bias gradients (all elements, since bias is small)
      for (let bi = 0; bi < layer.bias.data.length; bi++) {
        const origVal = layer.bias.data[bi];

        layer.bias.data[bi] = origVal + eps;
        const lossPlus = this.batchLoss(trainSamples, epochIndices, batchStart, batchEnd);

        layer.bias.data[bi] = origVal - eps;
        const lossMinus = this.batchLoss(trainSamples, epochIndices, batchStart, batchEnd);

        layer.bias.data[bi] = origVal;
        bGrad.data[bi] = (lossPlus - lossMinus) / (2 * eps);
      }

      // Clip gradients
      this.clipGradients(wGrad, maxGradNorm);
      this.clipGradients(bGrad, maxGradNorm);

      gradients.set(wKey, wGrad);
      gradients.set(bKey, bGrad);
      layerIdx++;
    }

    // Also handle layer norm parameters
    let lnIdx = 0;
    for (const { gamma, beta } of lnParams) {
      const gKey = `enc_ln${lnIdx}_gamma`;
      const bKey = `enc_ln${lnIdx}_beta`;
      parameters.set(gKey, gamma);
      parameters.set(bKey, beta);

      const gGrad = Tensor.zeros(gamma.shape);
      const bGrad = Tensor.zeros(beta.shape);

      for (let i = 0; i < gamma.data.length; i++) {
        const origVal = gamma.data[i];
        gamma.data[i] = origVal + eps;
        const lossPlus = this.batchLoss(trainSamples, epochIndices, batchStart, batchEnd);
        gamma.data[i] = origVal - eps;
        const lossMinus = this.batchLoss(trainSamples, epochIndices, batchStart, batchEnd);
        gamma.data[i] = origVal;
        gGrad.data[i] = (lossPlus - lossMinus) / (2 * eps);
      }

      for (let i = 0; i < beta.data.length; i++) {
        const origVal = beta.data[i];
        beta.data[i] = origVal + eps;
        const lossPlus = this.batchLoss(trainSamples, epochIndices, batchStart, batchEnd);
        beta.data[i] = origVal - eps;
        const lossMinus = this.batchLoss(trainSamples, epochIndices, batchStart, batchEnd);
        beta.data[i] = origVal;
        bGrad.data[i] = (lossPlus - lossMinus) / (2 * eps);
      }

      this.clipGradients(gGrad, maxGradNorm);
      this.clipGradients(bGrad, maxGradNorm);

      gradients.set(gKey, gGrad);
      gradients.set(bKey, bGrad);
      lnIdx++;
    }

    this.optimizer.step(parameters, gradients);
  }

  private batchLoss(
    trainSamples: TrainingSample[],
    epochIndices: number[],
    batchStart: number,
    batchEnd: number
  ): number {
    let totalLoss = 0;
    for (let i = batchStart; i < batchEnd; i++) {
      const sample = trainSamples[epochIndices[i]];
      const result = this.forwardSample(sample);
      totalLoss += this.loss.total(
        result.actionProbabilities,
        sample.actionLabel,
        result.emotionalState,
        sample.needs
      );
    }
    return totalLoss / (batchEnd - batchStart);
  }

  private clipGradients(grad: Tensor, maxNorm: number): void {
    let norm = 0;
    for (let i = 0; i < grad.data.length; i++) {
      norm += grad.data[i] * grad.data[i];
    }
    norm = Math.sqrt(norm);
    if (norm > maxNorm) {
      const scale = maxNorm / norm;
      for (let i = 0; i < grad.data.length; i++) {
        grad.data[i] *= scale;
      }
    }
  }

  private countParameters(): number {
    let total = 0;

    // Perception encoder parameters
    for (const layer of this.perceptionEncoder.getLinearLayers()) {
      total += layer.weight.data.length + layer.bias.data.length;
    }
    for (const { gamma, beta } of this.perceptionEncoder.getLayerNormParams()) {
      total += gamma.data.length + beta.data.length;
    }

    // TransformerBrain parameters
    for (const layer of this.network.getAllLinearLayers()) {
      total += layer.weight.data.length + layer.bias.data.length;
    }
    for (const { gamma, beta } of this.network.getAllLayerNormParams()) {
      total += gamma.data.length + beta.data.length;
    }

    return total;
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

function argmax(arr: number[]): number {
  let maxIdx = 0;
  let maxVal = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > maxVal) {
      maxVal = arr[i];
      maxIdx = i;
    }
  }
  return maxIdx;
}
