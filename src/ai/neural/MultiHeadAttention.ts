import { Tensor } from './Tensor';
import { LinearLayer } from './LinearLayer';

export class MultiHeadAttention {
  readonly numHeads: number;
  readonly headDim: number;
  readonly embDim: number;

  queryProj: LinearLayer;
  keyProj: LinearLayer;
  valueProj: LinearLayer;
  outputProj: LinearLayer;

  constructor(embDim = 64, numHeads = 4) {
    this.embDim = embDim;
    this.numHeads = numHeads;
    this.headDim = embDim / numHeads;

    this.queryProj = new LinearLayer(embDim, embDim);
    this.keyProj = new LinearLayer(embDim, embDim);
    this.valueProj = new LinearLayer(embDim, embDim);
    this.outputProj = new LinearLayer(embDim, embDim);
  }

  forward(input: Tensor, mask?: boolean[]): { output: Tensor; weights: Tensor } {
    const seqLen = input.shape[0];
    const scale = 1.0 / Math.sqrt(this.headDim);

    // Project Q, K, V: each [seqLen, embDim]
    const Q = this.queryProj.forward(input);
    const K = this.keyProj.forward(input);
    const V = this.valueProj.forward(input);

    // Collect per-head outputs and attention weights
    const headOutputs: Float32Array[] = [];
    const allWeights = new Float32Array(seqLen * this.numHeads * seqLen);

    for (let h = 0; h < this.numHeads; h++) {
      const hStart = h * this.headDim;

      // Extract head slices: [seqLen, headDim]
      const Qh = new Float32Array(seqLen * this.headDim);
      const Kh = new Float32Array(seqLen * this.headDim);
      const Vh = new Float32Array(seqLen * this.headDim);
      for (let s = 0; s < seqLen; s++) {
        for (let d = 0; d < this.headDim; d++) {
          Qh[s * this.headDim + d] = Q.data[s * this.embDim + hStart + d];
          Kh[s * this.headDim + d] = K.data[s * this.embDim + hStart + d];
          Vh[s * this.headDim + d] = V.data[s * this.embDim + hStart + d];
        }
      }

      // scores = Qh @ Kh^T * scale → [seqLen, seqLen]
      const scores = new Float32Array(seqLen * seqLen);
      for (let i = 0; i < seqLen; i++) {
        for (let j = 0; j < seqLen; j++) {
          let dot = 0;
          for (let d = 0; d < this.headDim; d++) {
            dot += Qh[i * this.headDim + d] * Kh[j * this.headDim + d];
          }
          scores[i * seqLen + j] = dot * scale;
        }
      }

      // Apply mask
      if (mask) {
        for (let i = 0; i < seqLen; i++) {
          for (let j = 0; j < seqLen; j++) {
            if (j < mask.length && !mask[j]) {
              scores[i * seqLen + j] = -1e9;
            }
          }
        }
      }

      // Softmax per row
      const weights = new Float32Array(seqLen * seqLen);
      for (let i = 0; i < seqLen; i++) {
        let max = -Infinity;
        for (let j = 0; j < seqLen; j++) {
          if (scores[i * seqLen + j] > max) max = scores[i * seqLen + j];
        }
        let sum = 0;
        for (let j = 0; j < seqLen; j++) {
          weights[i * seqLen + j] = Math.exp(scores[i * seqLen + j] - max);
          sum += weights[i * seqLen + j];
        }
        for (let j = 0; j < seqLen; j++) {
          weights[i * seqLen + j] /= sum;
        }
      }

      // Store weights for this head
      for (let i = 0; i < seqLen; i++) {
        for (let j = 0; j < seqLen; j++) {
          allWeights[(i * this.numHeads + h) * seqLen + j] = weights[i * seqLen + j];
        }
      }

      // context = weights @ Vh → [seqLen, headDim]
      const context = new Float32Array(seqLen * this.headDim);
      for (let i = 0; i < seqLen; i++) {
        for (let d = 0; d < this.headDim; d++) {
          let val = 0;
          for (let j = 0; j < seqLen; j++) {
            val += weights[i * seqLen + j] * Vh[j * this.headDim + d];
          }
          context[i * this.headDim + d] = val;
        }
      }

      headOutputs.push(context);
    }

    // Concatenate heads → [seqLen, embDim]
    const concatData = new Float32Array(seqLen * this.embDim);
    for (let s = 0; s < seqLen; s++) {
      for (let h = 0; h < this.numHeads; h++) {
        for (let d = 0; d < this.headDim; d++) {
          concatData[s * this.embDim + h * this.headDim + d] =
            headOutputs[h][s * this.headDim + d];
        }
      }
    }
    const concatTensor = new Tensor(concatData, [seqLen, this.embDim]);

    // Output projection
    const output = this.outputProj.forward(concatTensor);

    // Average weights across heads → [seqLen, seqLen]
    const avgWeights = new Float32Array(seqLen * seqLen);
    for (let i = 0; i < seqLen; i++) {
      for (let j = 0; j < seqLen; j++) {
        let sum = 0;
        for (let h = 0; h < this.numHeads; h++) {
          sum += allWeights[(i * this.numHeads + h) * seqLen + j];
        }
        avgWeights[i * seqLen + j] = sum / this.numHeads;
      }
    }

    return {
      output,
      weights: new Tensor(avgWeights, [seqLen, seqLen]),
    };
  }

  getLinearLayers(): LinearLayer[] {
    return [this.queryProj, this.keyProj, this.valueProj, this.outputProj];
  }
}
