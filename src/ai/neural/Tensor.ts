/**
 * Pure TypeScript Tensor class for neural network operations.
 * No external ML library dependencies.
 */
export class Tensor {
  data: Float32Array;
  shape: number[];

  constructor(data: Float32Array, shape: number[]) {
    this.data = data;
    this.shape = shape;
  }

  private static sizeFromShape(shape: number[]): number {
    let size = 1;
    for (let i = 0; i < shape.length; i++) size *= shape[i];
    return size;
  }

  private strides(): number[] {
    const strides = new Array(this.shape.length);
    strides[this.shape.length - 1] = 1;
    for (let i = this.shape.length - 2; i >= 0; i--) {
      strides[i] = strides[i + 1] * this.shape[i + 1];
    }
    return strides;
  }

  // --- Static constructors ---

  static zeros(shape: number[]): Tensor {
    return new Tensor(new Float32Array(Tensor.sizeFromShape(shape)), [...shape]);
  }

  static ones(shape: number[]): Tensor {
    const size = Tensor.sizeFromShape(shape);
    const data = new Float32Array(size);
    data.fill(1);
    return new Tensor(data, [...shape]);
  }

  static randn(shape: number[], mean = 0, std = 1): Tensor {
    const size = Tensor.sizeFromShape(shape);
    const data = new Float32Array(size);
    // Box-Muller transform
    for (let i = 0; i < size; i += 2) {
      const u1 = Math.max(Math.random(), 1e-10);
      const u2 = Math.random();
      const r = Math.sqrt(-2.0 * Math.log(u1));
      const theta = 2.0 * Math.PI * u2;
      data[i] = mean + std * r * Math.cos(theta);
      if (i + 1 < size) {
        data[i + 1] = mean + std * r * Math.sin(theta);
      }
    }
    return new Tensor(data, [...shape]);
  }

  // --- Element-wise operations ---

  add(other: Tensor): Tensor {
    const out = new Float32Array(this.data.length);
    for (let i = 0; i < out.length; i++) out[i] = this.data[i] + other.data[i];
    return new Tensor(out, [...this.shape]);
  }

  subtract(other: Tensor): Tensor {
    const out = new Float32Array(this.data.length);
    for (let i = 0; i < out.length; i++) out[i] = this.data[i] - other.data[i];
    return new Tensor(out, [...this.shape]);
  }

  multiply(other: Tensor): Tensor {
    const out = new Float32Array(this.data.length);
    for (let i = 0; i < out.length; i++) out[i] = this.data[i] * other.data[i];
    return new Tensor(out, [...this.shape]);
  }

  scale(scalar: number): Tensor {
    const out = new Float32Array(this.data.length);
    for (let i = 0; i < out.length; i++) out[i] = this.data[i] * scalar;
    return new Tensor(out, [...this.shape]);
  }

  // --- Matrix operations ---

  matmul(other: Tensor): Tensor {
    const M = this.shape[0];
    const K = this.shape[1];
    const N = other.shape[1];
    const out = new Float32Array(M * N);
    for (let i = 0; i < M; i++) {
      for (let j = 0; j < N; j++) {
        let sum = 0;
        for (let k = 0; k < K; k++) {
          sum += this.data[i * K + k] * other.data[k * N + j];
        }
        out[i * N + j] = sum;
      }
    }
    return new Tensor(out, [M, N]);
  }

  transpose(): Tensor {
    const rank = this.shape.length;
    if (rank < 2) return this.clone();

    const newShape = [...this.shape];
    const d0 = rank - 2;
    const d1 = rank - 1;
    newShape[d0] = this.shape[d1];
    newShape[d1] = this.shape[d0];

    const totalSize = Tensor.sizeFromShape(newShape);
    const out = new Float32Array(totalSize);

    const rows = this.shape[d0];
    const cols = this.shape[d1];
    const matSize = rows * cols;
    const numMats = totalSize / matSize;

    for (let m = 0; m < numMats; m++) {
      const base = m * matSize;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          out[base + c * rows + r] = this.data[base + r * cols + c];
        }
      }
    }
    return new Tensor(out, newShape);
  }

  // --- Activation functions ---

  static gelu(x: Tensor): Tensor {
    const SQRT_2_OVER_PI = Math.sqrt(2.0 / Math.PI);
    const out = new Float32Array(x.data.length);
    for (let i = 0; i < out.length; i++) {
      const v = x.data[i];
      const inner = SQRT_2_OVER_PI * (v + 0.044715 * v * v * v);
      out[i] = 0.5 * v * (1.0 + Math.tanh(inner));
    }
    return new Tensor(out, [...x.shape]);
  }

  static relu(x: Tensor): Tensor {
    const out = new Float32Array(x.data.length);
    for (let i = 0; i < out.length; i++) {
      out[i] = x.data[i] > 0 ? x.data[i] : 0;
    }
    return new Tensor(out, [...x.shape]);
  }

  static sigmoid(x: Tensor): Tensor {
    const out = new Float32Array(x.data.length);
    for (let i = 0; i < out.length; i++) {
      out[i] = 1.0 / (1.0 + Math.exp(-x.data[i]));
    }
    return new Tensor(out, [...x.shape]);
  }

  static tanh(x: Tensor): Tensor {
    const out = new Float32Array(x.data.length);
    for (let i = 0; i < out.length; i++) {
      out[i] = Math.tanh(x.data[i]);
    }
    return new Tensor(out, [...x.shape]);
  }

  static softmax(x: Tensor, dim?: number): Tensor {
    const rank = x.shape.length;
    const d = dim !== undefined ? (dim < 0 ? dim + rank : dim) : rank - 1;
    const dimSize = x.shape[d];
    const outerSize = Tensor.sizeFromShape(x.shape.slice(0, d));
    const innerSize = Tensor.sizeFromShape(x.shape.slice(d + 1));
    const out = new Float32Array(x.data.length);

    for (let o = 0; o < outerSize; o++) {
      for (let inn = 0; inn < innerSize; inn++) {
        // Find max for numerical stability
        let max = -Infinity;
        for (let i = 0; i < dimSize; i++) {
          const idx = (o * dimSize + i) * innerSize + inn;
          if (x.data[idx] > max) max = x.data[idx];
        }
        // Compute exp and sum
        let sum = 0;
        for (let i = 0; i < dimSize; i++) {
          const idx = (o * dimSize + i) * innerSize + inn;
          const e = Math.exp(x.data[idx] - max);
          out[idx] = e;
          sum += e;
        }
        // Normalize
        for (let i = 0; i < dimSize; i++) {
          const idx = (o * dimSize + i) * innerSize + inn;
          out[idx] /= sum;
        }
      }
    }
    return new Tensor(out, [...x.shape]);
  }

  // --- Normalization ---

  static layerNorm(x: Tensor, gamma: Tensor, beta: Tensor, eps = 1e-5): Tensor {
    const lastDim = x.shape[x.shape.length - 1];
    const outerSize = x.data.length / lastDim;
    const out = new Float32Array(x.data.length);

    for (let o = 0; o < outerSize; o++) {
      const offset = o * lastDim;
      // Compute mean
      let mean = 0;
      for (let i = 0; i < lastDim; i++) mean += x.data[offset + i];
      mean /= lastDim;
      // Compute variance
      let variance = 0;
      for (let i = 0; i < lastDim; i++) {
        const diff = x.data[offset + i] - mean;
        variance += diff * diff;
      }
      variance /= lastDim;
      const invStd = 1.0 / Math.sqrt(variance + eps);
      // Normalize and apply affine
      for (let i = 0; i < lastDim; i++) {
        out[offset + i] = (x.data[offset + i] - mean) * invStd * gamma.data[i] + beta.data[i];
      }
    }
    return new Tensor(out, [...x.shape]);
  }

  // --- Utility ---

  reshape(shape: number[]): Tensor {
    const newShape = [...shape];
    // Handle -1 inference
    const negIdx = newShape.indexOf(-1);
    if (negIdx !== -1) {
      const known = newShape.filter((_, i) => i !== negIdx).reduce((a, b) => a * b, 1);
      newShape[negIdx] = this.data.length / known;
    }
    return new Tensor(this.data, newShape);
  }

  slice(dim: number, start: number, end: number): Tensor {
    const rank = this.shape.length;
    const d = dim < 0 ? dim + rank : dim;
    const newShape = [...this.shape];
    const sliceLen = end - start;
    newShape[d] = sliceLen;

    const outerSize = Tensor.sizeFromShape(this.shape.slice(0, d));
    const innerSize = Tensor.sizeFromShape(this.shape.slice(d + 1));
    const dimSize = this.shape[d];

    const out = new Float32Array(Tensor.sizeFromShape(newShape));
    let outIdx = 0;
    for (let o = 0; o < outerSize; o++) {
      for (let i = start; i < end; i++) {
        for (let inn = 0; inn < innerSize; inn++) {
          out[outIdx++] = this.data[(o * dimSize + i) * innerSize + inn];
        }
      }
    }
    return new Tensor(out, newShape);
  }

  concat(other: Tensor, dim: number): Tensor {
    const rank = this.shape.length;
    const d = dim < 0 ? dim + rank : dim;
    const newShape = [...this.shape];
    newShape[d] = this.shape[d] + other.shape[d];

    const outerSize = Tensor.sizeFromShape(this.shape.slice(0, d));
    const innerSize = Tensor.sizeFromShape(this.shape.slice(d + 1));
    const dimA = this.shape[d];
    const dimB = other.shape[d];

    const out = new Float32Array(Tensor.sizeFromShape(newShape));
    let outIdx = 0;
    for (let o = 0; o < outerSize; o++) {
      for (let i = 0; i < dimA; i++) {
        for (let inn = 0; inn < innerSize; inn++) {
          out[outIdx++] = this.data[(o * dimA + i) * innerSize + inn];
        }
      }
      for (let i = 0; i < dimB; i++) {
        for (let inn = 0; inn < innerSize; inn++) {
          out[outIdx++] = other.data[(o * dimB + i) * innerSize + inn];
        }
      }
    }
    return new Tensor(out, newShape);
  }

  clone(): Tensor {
    return new Tensor(new Float32Array(this.data), [...this.shape]);
  }

  toArray(): number[] {
    return Array.from(this.data);
  }

  get(indices: number[]): number {
    const s = this.strides();
    let idx = 0;
    for (let i = 0; i < indices.length; i++) idx += indices[i] * s[i];
    return this.data[idx];
  }

  set(indices: number[], value: number): void {
    const s = this.strides();
    let idx = 0;
    for (let i = 0; i < indices.length; i++) idx += indices[i] * s[i];
    this.data[idx] = value;
  }
}

export default Tensor;
