import { Tensor } from './Tensor';
import { LinearLayer } from './LinearLayer';
import { TransformerEncoderLayer } from './TransformerLayer';

export class TransformerBrain {
  readonly embeddingDim: number = 64;
  readonly numHeads: number = 4;
  readonly headDim: number = 16;
  readonly ffnHiddenDim: number = 128;
  readonly numLayers: number = 2;
  readonly numMemorySlots: number = 32;
  readonly numActions: number = 6;
  readonly sequenceLength: number = 34;

  clsToken: number[];
  positionalEncoding: number[][];
  positionalOffset: Tensor;

  layers: TransformerEncoderLayer[];
  actionHead: LinearLayer;
  emotionHead: LinearLayer;

  constructor() {
    // CLS token: small random
    const clsRand = Tensor.randn([this.embeddingDim], 0, 0.02);
    this.clsToken = clsRand.toArray();

    // Sinusoidal positional encoding
    this.positionalEncoding = [];
    for (let pos = 0; pos < this.sequenceLength; pos++) {
      const pe = new Array(this.embeddingDim);
      for (let i = 0; i < this.embeddingDim; i++) {
        const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / this.embeddingDim);
        pe[i] = i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
      }
      this.positionalEncoding.push(pe);
    }

    // Learned positional offset
    this.positionalOffset = Tensor.randn([this.sequenceLength, this.embeddingDim], 0, 0.01);

    // Transformer layers
    this.layers = [];
    for (let i = 0; i < this.numLayers; i++) {
      this.layers.push(new TransformerEncoderLayer(this.embeddingDim, this.numHeads, this.ffnHiddenDim));
    }

    // Output heads
    this.actionHead = new LinearLayer(this.embeddingDim, this.numActions);
    this.emotionHead = new LinearLayer(this.embeddingDim, 3);
  }

  forward(
    perceptionEmbedding: number[],
    memorySequence: number[][],
    attentionMask: boolean[]
  ): {
    actionProbabilities: number[];
    emotionalState: number[];
    memoryAttentionWeights: number[][];
  } {
    // Build input sequence: [CLS, perception, 32 memories] → [34, 64]
    const seqData = new Float32Array(this.sequenceLength * this.embeddingDim);
    // Position 0: CLS token
    for (let i = 0; i < this.embeddingDim; i++) {
      seqData[i] = this.clsToken[i];
    }
    // Position 1: perception embedding
    for (let i = 0; i < this.embeddingDim; i++) {
      seqData[this.embeddingDim + i] = perceptionEmbedding[i];
    }
    // Positions 2-33: memory embeddings
    for (let m = 0; m < this.numMemorySlots; m++) {
      const offset = (m + 2) * this.embeddingDim;
      for (let i = 0; i < this.embeddingDim; i++) {
        seqData[offset + i] = memorySequence[m][i];
      }
    }

    // Add positional encoding + learned offset
    for (let pos = 0; pos < this.sequenceLength; pos++) {
      for (let i = 0; i < this.embeddingDim; i++) {
        const idx = pos * this.embeddingDim + i;
        seqData[idx] += this.positionalEncoding[pos][i] + this.positionalOffset.data[idx];
      }
    }

    let input = new Tensor(seqData, [this.sequenceLength, this.embeddingDim]);

    // Build full attention mask: [true (CLS), true (perception), ...memoryMask]
    const fullMask: boolean[] = [true, true, ...attentionMask];

    // Pass through transformer layers, collect attention weights
    const layerAttentionWeights: number[][] = [];
    for (const layer of this.layers) {
      const { output, attentionWeights } = layer.forward(input, fullMask);
      input = output;

      // Extract memory attention from CLS token (row 0, columns 2..33)
      const memWeights: number[] = [];
      for (let j = 2; j < 2 + this.numMemorySlots; j++) {
        memWeights.push(attentionWeights.data[j]); // row 0, col j
      }
      layerAttentionWeights.push(memWeights);
    }

    // Extract CLS token representation (position 0)
    const clsOutput = input.slice(0, 0, 1).reshape([this.embeddingDim]);

    // Action head: Linear → softmax
    const actionLogits = this.actionHead.forward(clsOutput);
    const actionProbs = Tensor.softmax(actionLogits);
    const actionProbabilities = actionProbs.toArray();

    // Emotion head: Linear → tanh
    const emotionRaw = this.emotionHead.forward(clsOutput);
    const emotionalState = Tensor.tanh(emotionRaw).toArray();

    return {
      actionProbabilities,
      emotionalState,
      memoryAttentionWeights: layerAttentionWeights,
    };
  }

  getAllLinearLayers(): LinearLayer[] {
    const layers: LinearLayer[] = [];
    for (const layer of this.layers) {
      layers.push(...layer.getLinearLayers());
    }
    layers.push(this.actionHead, this.emotionHead);
    return layers;
  }

  getAllLayerNormParams(): Array<{ gamma: Tensor; beta: Tensor }> {
    const params: Array<{ gamma: Tensor; beta: Tensor }> = [];
    for (const layer of this.layers) {
      params.push(...layer.getLayerNormParams());
    }
    return params;
  }

  initializeWeights(): void {
    // Xavier/Glorot for all linear layers
    for (const layer of this.getAllLinearLayers()) {
      const fanIn = layer.weight.shape[1];
      const fanOut = layer.weight.shape[0];
      const std = Math.sqrt(2.0 / (fanIn + fanOut));
      layer.weight = Tensor.randn(layer.weight.shape, 0, std);
      layer.bias = Tensor.zeros(layer.bias.shape);
    }

    // LayerNorm: gamma = 1, beta = 0
    for (const { gamma, beta } of this.getAllLayerNormParams()) {
      gamma.data.fill(1);
      beta.data.fill(0);
    }

    // CLS token: randn(0, 0.02)
    const clsRand = Tensor.randn([this.embeddingDim], 0, 0.02);
    this.clsToken = clsRand.toArray();

    // Positional offset: randn(0, 0.01)
    this.positionalOffset = Tensor.randn(
      [this.sequenceLength, this.embeddingDim], 0, 0.01
    );
  }
}
