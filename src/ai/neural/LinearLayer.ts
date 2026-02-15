import { Tensor } from './Tensor';

export class LinearLayer {
  weight: Tensor;
  bias: Tensor;

  weightGrad: Tensor;
  biasGrad: Tensor;
  lastInput: Tensor | null;

  constructor(inputDim: number, outputDim: number) {
    const std = Math.sqrt(2.0 / (inputDim + outputDim));
    this.weight = Tensor.randn([outputDim, inputDim], 0, std);
    this.bias = Tensor.zeros([outputDim]);

    this.weightGrad = Tensor.zeros([outputDim, inputDim]);
    this.biasGrad = Tensor.zeros([outputDim]);
    this.lastInput = null;
  }

  forward(input: Tensor): Tensor {
    const squeezed = input.shape.length === 1;
    const inp = squeezed ? input.reshape([1, input.shape[0]]) : input;
    this.lastInput = inp;

    // output = inp @ weight.T + bias, shape [N, outputDim]
    const wt = this.weight.transpose();
    const result = inp.matmul(wt);

    // Add bias to each row
    const N = result.shape[0];
    const outDim = result.shape[1];
    const out = new Float32Array(result.data.length);
    for (let i = 0; i < N; i++) {
      const rowOff = i * outDim;
      for (let j = 0; j < outDim; j++) {
        out[rowOff + j] = result.data[rowOff + j] + this.bias.data[j];
      }
    }
    const output = new Tensor(out, [N, outDim]);

    return squeezed ? output.reshape([outDim]) : output;
  }

  backward(gradOutput: Tensor): Tensor {
    const squeezed = gradOutput.shape.length === 1;
    const grad = squeezed
      ? gradOutput.reshape([1, gradOutput.shape[0]])
      : gradOutput;

    if (!this.lastInput) {
      throw new Error('backward() called before forward()');
    }

    // dWeight += grad.T @ lastInput
    const dw = grad.transpose().matmul(this.lastInput);
    const wgData = this.weightGrad.data;
    for (let i = 0; i < wgData.length; i++) {
      wgData[i] += dw.data[i];
    }

    // dBias += sum(grad, dim=0)
    const N = grad.shape[0];
    const outDim = grad.shape[1];
    for (let i = 0; i < N; i++) {
      const rowOff = i * outDim;
      for (let j = 0; j < outDim; j++) {
        this.biasGrad.data[j] += grad.data[rowOff + j];
      }
    }

    // gradInput = grad @ weight
    const gradInput = grad.matmul(this.weight);

    return squeezed
      ? gradInput.reshape([gradInput.shape[1]])
      : gradInput;
  }

  zeroGrad(): void {
    this.weightGrad = Tensor.zeros(this.weight.shape);
    this.biasGrad = Tensor.zeros(this.bias.shape);
  }
}
