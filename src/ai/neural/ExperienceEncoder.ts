import { Tensor } from './Tensor';
import { LinearLayer } from './LinearLayer';

export const NUM_ACTIONS = 6;

export interface Experience {
  perceptionEmbedding: number[];
  actionTaken: number;
  needsDelta: number[];
  tick: number;
  wasSuccessful: boolean;
  novelty: number;
}

export class ExperienceEncoder {
  private linear1: LinearLayer;
  private ln1Gamma: Tensor;
  private ln1Beta: Tensor;
  private linear2: LinearLayer;
  private ln2Gamma: Tensor;
  private ln2Beta: Tensor;

  constructor() {
    this.linear1 = new LinearLayer(75, 64);
    this.ln1Gamma = Tensor.ones([64]);
    this.ln1Beta = Tensor.zeros([64]);
    this.linear2 = new LinearLayer(64, 64);
    this.ln2Gamma = Tensor.ones([64]);
    this.ln2Beta = Tensor.zeros([64]);
  }

  encode(experience: Experience): number[] {
    const actionOneHot = new Array(NUM_ACTIONS).fill(0);
    actionOneHot[experience.actionTaken] = 1;

    const inputArray = [
      ...experience.perceptionEmbedding,
      ...actionOneHot,
      ...experience.needsDelta,
    ];
    const input = new Tensor(new Float32Array(inputArray), [75]);
    return this.forward(input).toArray();
  }

  forward(input: Tensor): Tensor {
    let x = this.linear1.forward(input);
    x = Tensor.layerNorm(x, this.ln1Gamma, this.ln1Beta);
    x = Tensor.gelu(x);
    x = this.linear2.forward(x);
    x = Tensor.layerNorm(x, this.ln2Gamma, this.ln2Beta);
    x = Tensor.gelu(x);
    return x;
  }

  getLinearLayers(): LinearLayer[] {
    return [this.linear1, this.linear2];
  }

  getLayerNormParams(): Array<{ gamma: Tensor; beta: Tensor }> {
    return [
      { gamma: this.ln1Gamma, beta: this.ln1Beta },
      { gamma: this.ln2Gamma, beta: this.ln2Beta },
    ];
  }
}
