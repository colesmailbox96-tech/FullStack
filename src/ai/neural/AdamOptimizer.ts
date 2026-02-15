import { Tensor } from './Tensor';

export class AdamOptimizer {
  private lr: number;
  private beta1: number;
  private beta2: number;
  private eps: number;
  private t: number;
  private m: Map<string, Float32Array>;
  private v: Map<string, Float32Array>;

  constructor(lr = 0.001, beta1 = 0.9, beta2 = 0.999, eps = 1e-8) {
    this.lr = lr;
    this.beta1 = beta1;
    this.beta2 = beta2;
    this.eps = eps;
    this.t = 0;
    this.m = new Map();
    this.v = new Map();
  }

  step(parameters: Map<string, Tensor>, gradients: Map<string, Tensor>): void {
    this.t++;

    for (const [key, param] of parameters) {
      const grad = gradients.get(key);
      if (!grad) continue;

      if (!this.m.has(key)) {
        this.m.set(key, new Float32Array(param.data.length));
        this.v.set(key, new Float32Array(param.data.length));
      }

      const m = this.m.get(key)!;
      const v = this.v.get(key)!;

      for (let i = 0; i < param.data.length; i++) {
        m[i] = this.beta1 * m[i] + (1 - this.beta1) * grad.data[i];
        v[i] = this.beta2 * v[i] + (1 - this.beta2) * grad.data[i] * grad.data[i];

        const mHat = m[i] / (1 - Math.pow(this.beta1, this.t));
        const vHat = v[i] / (1 - Math.pow(this.beta2, this.t));

        param.data[i] -= this.lr * mHat / (Math.sqrt(vHat) + this.eps);
      }
    }
  }

  reset(): void {
    this.t = 0;
    this.m.clear();
    this.v.clear();
  }
}
