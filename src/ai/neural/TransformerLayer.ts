import { Tensor } from './Tensor';
import { LinearLayer } from './LinearLayer';
import { MultiHeadAttention } from './MultiHeadAttention';

export class TransformerEncoderLayer {
  attention: MultiHeadAttention;
  ffnUp: LinearLayer;
  ffnDown: LinearLayer;
  ln1Gamma: Tensor;
  ln1Beta: Tensor;
  ln2Gamma: Tensor;
  ln2Beta: Tensor;

  constructor(embDim = 64, numHeads = 4, ffnHiddenDim = 128) {
    this.attention = new MultiHeadAttention(embDim, numHeads);
    this.ffnUp = new LinearLayer(embDim, ffnHiddenDim);
    this.ffnDown = new LinearLayer(ffnHiddenDim, embDim);
    this.ln1Gamma = Tensor.ones([embDim]);
    this.ln1Beta = Tensor.zeros([embDim]);
    this.ln2Gamma = Tensor.ones([embDim]);
    this.ln2Beta = Tensor.zeros([embDim]);
  }

  forward(input: Tensor, mask?: boolean[]): { output: Tensor; attentionWeights: Tensor } {
    // Pre-norm: LayerNorm → Attention → Residual
    const normed1 = Tensor.layerNorm(input, this.ln1Gamma, this.ln1Beta);
    const { output: attnOut, weights: attentionWeights } = this.attention.forward(normed1, mask);
    const residual1 = input.add(attnOut);

    // Pre-norm: LayerNorm → FFN → Residual
    const normed2 = Tensor.layerNorm(residual1, this.ln2Gamma, this.ln2Beta);
    const ffnHidden = Tensor.gelu(this.ffnUp.forward(normed2));
    const ffnOut = this.ffnDown.forward(ffnHidden);
    const output = residual1.add(ffnOut);

    return { output, attentionWeights };
  }

  getLinearLayers(): LinearLayer[] {
    return [...this.attention.getLinearLayers(), this.ffnUp, this.ffnDown];
  }

  getLayerNormParams(): Array<{ gamma: Tensor; beta: Tensor }> {
    return [
      { gamma: this.ln1Gamma, beta: this.ln1Beta },
      { gamma: this.ln2Gamma, beta: this.ln2Beta },
    ];
  }
}
