import { TransformerBrain } from './TransformerBrain';
import { PerceptionEncoder } from './PerceptionEncoder';
import { ExperienceEncoder } from './ExperienceEncoder';
import { Tensor } from './Tensor';

export interface WeightData {
  version: string;
  architecture: {
    embeddingDim: number;
    numHeads: number;
    numLayers: number;
    ffnHiddenDim: number;
    numActions: number;
    numMemorySlots: number;
    perceptionInputDim: number;
  };
  totalParameters: number;
  trainedOn?: {
    samples: number;
    epochs: number;
    finalValAccuracy: number;
    timestamp: string;
  };
  weights: Record<string, number[]>;
}

export class WeightSerializer {
  serialize(
    brain: TransformerBrain,
    perceptionEncoder: PerceptionEncoder,
    experienceEncoder: ExperienceEncoder,
    trainingInfo?: WeightData['trainedOn']
  ): string {
    const weights: Record<string, number[]> = {};
    let totalParameters = 0;

    // Perception encoder layers
    const percLayers = perceptionEncoder.getLinearLayers();
    for (let i = 0; i < percLayers.length; i++) {
      weights[`perception.linear${i}.weight`] = Array.from(percLayers[i].weight.data);
      weights[`perception.linear${i}.bias`] = Array.from(percLayers[i].bias.data);
      totalParameters += percLayers[i].weight.data.length + percLayers[i].bias.data.length;
    }
    const percLN = perceptionEncoder.getLayerNormParams();
    for (let i = 0; i < percLN.length; i++) {
      weights[`perception.ln${i}.gamma`] = Array.from(percLN[i].gamma.data);
      weights[`perception.ln${i}.beta`] = Array.from(percLN[i].beta.data);
      totalParameters += percLN[i].gamma.data.length + percLN[i].beta.data.length;
    }

    // Experience encoder layers
    const expLayers = experienceEncoder.getLinearLayers();
    for (let i = 0; i < expLayers.length; i++) {
      weights[`experience.linear${i}.weight`] = Array.from(expLayers[i].weight.data);
      weights[`experience.linear${i}.bias`] = Array.from(expLayers[i].bias.data);
      totalParameters += expLayers[i].weight.data.length + expLayers[i].bias.data.length;
    }
    const expLN = experienceEncoder.getLayerNormParams();
    for (let i = 0; i < expLN.length; i++) {
      weights[`experience.ln${i}.gamma`] = Array.from(expLN[i].gamma.data);
      weights[`experience.ln${i}.beta`] = Array.from(expLN[i].beta.data);
      totalParameters += expLN[i].gamma.data.length + expLN[i].beta.data.length;
    }

    // Transformer brain layers
    const brainLayers = brain.getAllLinearLayers();
    for (let i = 0; i < brainLayers.length; i++) {
      weights[`brain.linear${i}.weight`] = Array.from(brainLayers[i].weight.data);
      weights[`brain.linear${i}.bias`] = Array.from(brainLayers[i].bias.data);
      totalParameters += brainLayers[i].weight.data.length + brainLayers[i].bias.data.length;
    }
    const brainLN = brain.getAllLayerNormParams();
    for (let i = 0; i < brainLN.length; i++) {
      weights[`brain.ln${i}.gamma`] = Array.from(brainLN[i].gamma.data);
      weights[`brain.ln${i}.beta`] = Array.from(brainLN[i].beta.data);
      totalParameters += brainLN[i].gamma.data.length + brainLN[i].beta.data.length;
    }

    // CLS token and positional offset
    weights['brain.clsToken'] = [...brain.clsToken];
    totalParameters += brain.clsToken.length;

    weights['brain.positionalOffset'] = Array.from(brain.positionalOffset.data);
    totalParameters += brain.positionalOffset.data.length;

    const data: WeightData = {
      version: '1.0',
      architecture: {
        embeddingDim: brain.embeddingDim,
        numHeads: brain.numHeads,
        numLayers: brain.numLayers,
        ffnHiddenDim: brain.ffnHiddenDim,
        numActions: brain.numActions,
        numMemorySlots: brain.numMemorySlots,
        perceptionInputDim: percLayers[0].weight.shape[1],
      },
      totalParameters,
      trainedOn: trainingInfo,
      weights,
    };

    return JSON.stringify(data);
  }

  deserialize(
    json: string,
    brain: TransformerBrain,
    perceptionEncoder: PerceptionEncoder,
    experienceEncoder: ExperienceEncoder
  ): void {
    const data: WeightData = JSON.parse(json);

    // Validate basic structure to prevent prototype pollution
    if (!data || typeof data !== 'object' || !data.version || !data.weights || typeof data.weights !== 'object') {
      throw new Error('Invalid weight data format');
    }

    // Perception encoder
    const percLayers = perceptionEncoder.getLinearLayers();
    for (let i = 0; i < percLayers.length; i++) {
      const wKey = `perception.linear${i}.weight`;
      const bKey = `perception.linear${i}.bias`;
      if (data.weights[wKey]) percLayers[i].weight = new Tensor(new Float32Array(data.weights[wKey]), percLayers[i].weight.shape);
      if (data.weights[bKey]) percLayers[i].bias = new Tensor(new Float32Array(data.weights[bKey]), percLayers[i].bias.shape);
    }
    const percLN = perceptionEncoder.getLayerNormParams();
    for (let i = 0; i < percLN.length; i++) {
      const gKey = `perception.ln${i}.gamma`;
      const bKey = `perception.ln${i}.beta`;
      if (data.weights[gKey]) percLN[i].gamma.data.set(new Float32Array(data.weights[gKey]));
      if (data.weights[bKey]) percLN[i].beta.data.set(new Float32Array(data.weights[bKey]));
    }

    // Experience encoder
    const expLayers = experienceEncoder.getLinearLayers();
    for (let i = 0; i < expLayers.length; i++) {
      const wKey = `experience.linear${i}.weight`;
      const bKey = `experience.linear${i}.bias`;
      if (data.weights[wKey]) expLayers[i].weight = new Tensor(new Float32Array(data.weights[wKey]), expLayers[i].weight.shape);
      if (data.weights[bKey]) expLayers[i].bias = new Tensor(new Float32Array(data.weights[bKey]), expLayers[i].bias.shape);
    }
    const expLN = experienceEncoder.getLayerNormParams();
    for (let i = 0; i < expLN.length; i++) {
      const gKey = `experience.ln${i}.gamma`;
      const bKey = `experience.ln${i}.beta`;
      if (data.weights[gKey]) expLN[i].gamma.data.set(new Float32Array(data.weights[gKey]));
      if (data.weights[bKey]) expLN[i].beta.data.set(new Float32Array(data.weights[bKey]));
    }

    // Brain linear layers
    const brainLayers = brain.getAllLinearLayers();
    for (let i = 0; i < brainLayers.length; i++) {
      const wKey = `brain.linear${i}.weight`;
      const bKey = `brain.linear${i}.bias`;
      if (data.weights[wKey]) brainLayers[i].weight = new Tensor(new Float32Array(data.weights[wKey]), brainLayers[i].weight.shape);
      if (data.weights[bKey]) brainLayers[i].bias = new Tensor(new Float32Array(data.weights[bKey]), brainLayers[i].bias.shape);
    }
    const brainLN = brain.getAllLayerNormParams();
    for (let i = 0; i < brainLN.length; i++) {
      const gKey = `brain.ln${i}.gamma`;
      const bKey = `brain.ln${i}.beta`;
      if (data.weights[gKey]) brainLN[i].gamma.data.set(new Float32Array(data.weights[gKey]));
      if (data.weights[bKey]) brainLN[i].beta.data.set(new Float32Array(data.weights[bKey]));
    }

    // CLS token and positional offset
    if (data.weights['brain.clsToken']) {
      brain.clsToken = data.weights['brain.clsToken'];
    }
    if (data.weights['brain.positionalOffset']) {
      brain.positionalOffset = new Tensor(
        new Float32Array(data.weights['brain.positionalOffset']),
        brain.positionalOffset.shape
      );
    }
  }

  saveToStorage(
    worldSeed: number,
    brain: TransformerBrain,
    perceptionEncoder: PerceptionEncoder,
    experienceEncoder: ExperienceEncoder
  ): void {
    try {
      const json = this.serialize(brain, perceptionEncoder, experienceEncoder);
      localStorage.setItem(`neural_weights_${worldSeed}`, json);
    } catch {
      // localStorage may not be available
    }
  }

  loadFromStorage(
    worldSeed: number,
    brain: TransformerBrain,
    perceptionEncoder: PerceptionEncoder,
    experienceEncoder: ExperienceEncoder
  ): boolean {
    try {
      const json = localStorage.getItem(`neural_weights_${worldSeed}`);
      if (!json) return false;
      this.deserialize(json, brain, perceptionEncoder, experienceEncoder);
      return true;
    } catch {
      return false;
    }
  }

  exportWeights(
    brain: TransformerBrain,
    perceptionEncoder: PerceptionEncoder,
    experienceEncoder: ExperienceEncoder
  ): string {
    return this.serialize(brain, perceptionEncoder, experienceEncoder);
  }
}
