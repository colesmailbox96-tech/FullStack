# Living Worlds — Neural Network Brain Implementation

## CONTEXT FOR AGENT

The simulation is already built and running. NPCs currently use behavior trees that implement the `IBrain` interface. A comprehensive testing infrastructure exists with benchmarks, data quality analysis, A/B comparison, and regression detection. The simulation generates structured training data (perception → decision → outcome) in JSONL format.

**Your job:** Build the neural network system that replaces behavior tree brains with learned intelligence. The `IBrain` interface already exists. You are implementing `NeuralNetBrain` — a new class that implements the same interface, makes decisions through a trained neural network, and learns from experience.

**Do NOT modify the simulation, world, rendering, or UI systems.** The only integration point is the `IBrain` interface. Your neural network receives a `Perception` and returns an `Action`. Everything else is internal to your system.

**Work style:** Build this as a complete, working system. When you are finished, I should be able to toggle NPCs between behavior tree brains and neural network brains and see measurably different, intelligent behavior. The existing benchmark suite and A/B comparison framework will validate your work.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    NPC Entity                            │
│                                                         │
│  Perception ──→ IBrain.decide() ──→ Action              │
│                      │                                   │
│              ┌───────┴───────┐                           │
│              │               │                           │
│     BehaviorTreeBrain   NeuralNetBrain                   │
│     (existing)          (YOU BUILD THIS)                  │
│                              │                           │
│                    ┌─────────┴──────────┐                │
│                    │  TransformerCore   │                │
│                    │                    │                │
│                    │  ┌──────────────┐  │                │
│                    │  │PerceptionEnc │  │                │
│                    │  └──────┬───────┘  │                │
│                    │         │          │                │
│                    │  ┌──────┴───────┐  │                │
│                    │  │ MemoryAttn   │  │                │
│                    │  └──────┬───────┘  │                │
│                    │         │          │                │
│                    │  ┌──────┴───────┐  │                │
│                    │  │ EmotionHead  │  │                │
│                    │  └──────┬───────┘  │                │
│                    │         │          │                │
│                    │  ┌──────┴───────┐  │                │
│                    │  │ ActionHead   │  │                │
│                    │  └──────────────┘  │                │
│                    └────────────────────┘                │
└─────────────────────────────────────────────────────────┘
```

---

## Part 1: Perception Encoder

The simulation provides a `Perception` struct every tick. The neural network needs this as a flat numeric tensor.

### Perception Vector Specification

The existing `TrainingDataExporter` already defines a 30-float perception encoding. Your network input must match this exactly:

```typescript
// Input vector: 30 floats, all normalized to 0.0–1.0 range

interface PerceptionVector {
  // Internal needs [0–4] — 5 floats
  hunger: number;            // 0.0=starving, 1.0=full
  energy: number;
  social: number;
  curiosity: number;
  safety: number;

  // Environment [5–7] — 3 floats
  timeOfDay: number;         // 0.0–1.0
  weatherCode: number;       // clear=0, cloudy=0.2, rain=0.4, storm=0.6, snow=0.8, fog=1.0
  seasonCode: number;        // spring=0, summer=0.25, autumn=0.5, winter=0.75

  // Nearby terrain summary [8–11] — 4 floats (fraction of 8-tile radius)
  nearbyGrassFraction: number;
  nearbyWaterFraction: number;
  nearbyStoneFraction: number;
  nearbyDirtFraction: number;

  // Food context [12–13] — 2 floats
  nearbyFoodCount: number;        // normalized: count / 10, clamped to 1.0
  nearbyFoodAvgDistance: number;   // normalized: avg_dist / 8, clamped to 1.0 (lower = closer)

  // Social context [14–15] — 2 floats
  nearbyNPCCount: number;         // normalized: count / 10, clamped to 1.0
  nearbyNPCAvgDistance: number;    // normalized: avg_dist / 8, clamped to 1.0

  // Object context [16–17] — 2 floats
  nearbyObjectCount: number;      // normalized: count / 10, clamped to 1.0
  hasShelterNearby: number;       // 0.0 = no, 1.0 = yes

  // Top 3 memories [18–26] — 9 floats (3 per memory)
  memory1Type: number;            // encoded: found_food=0.2, danger=0.4, met_npc=0.6, found_shelter=0.8, discovered_area=1.0, none=0.0
  memory1Recency: number;         // normalized: 1.0 = just happened, 0.0 = ancient
  memory1Significance: number;    // 0.0–1.0 direct
  memory2Type: number;
  memory2Recency: number;
  memory2Significance: number;
  memory3Type: number;
  memory3Recency: number;
  memory3Significance: number;

  // Player awareness [27–29] — 3 floats
  cameraDistanceToNPC: number;    // normalized: 1.0 = camera on NPC, 0.0 = far away
  cameraZoom: number;             // normalized: zoom_level / max_zoom
  cameraDwellTime: number;        // normalized: dwell_ticks / 500, clamped to 1.0
}
```

### Perception Encoder Network

Do NOT feed the raw 30-float vector directly into the transformer. First, pass it through an encoder that projects it into a richer latent space.

```typescript
class PerceptionEncoder {
  // Architecture:
  // Input: 30 floats
  // Linear(30, 64) → LayerNorm → GELU
  // Linear(64, 64) → LayerNorm → GELU
  // Output: 64-dim perception embedding

  encode(perceptionVector: number[]): number[];  // returns 64-dim vector
}
```

**Why 64 dimensions:** 30 inputs is too small for the transformer's attention mechanism to find meaningful patterns. The encoder projects into a richer space where the transformer can work effectively. The two layers with nonlinearity allow the encoder to learn feature interactions (e.g., "low hunger AND food nearby" as a combined feature).

---

## Part 2: Episodic Memory System

This is the core innovation. Each NPC maintains a rolling buffer of past experiences encoded as embedding vectors. The transformer attends over this memory when making decisions.

### Memory Buffer

```typescript
class EpisodicMemoryBuffer {
  private buffer: MemoryEmbedding[];
  private maxSize: number;           // default: 32 memory slots
  private embeddingDim: number;      // 64, same as perception embedding

  // Add a new experience to memory
  store(experience: Experience): void;

  // Get all memories for transformer attention
  getMemorySequence(): number[][];   // returns [maxSize][embeddingDim]

  // Get memory attention mask (which slots are filled)
  getAttentionMask(): boolean[];     // true = real memory, false = padding

  // Internal: compute significance score for an experience
  private computeSignificance(experience: Experience): number;

  // Internal: decay all memory significance by a small amount
  private decayMemories(): void;

  // Internal: drop lowest-significance memory when buffer is full
  private evictLowestSignificance(): void;
}

interface Experience {
  perceptionEmbedding: number[];    // 64-dim encoded perception at time of experience
  actionTaken: number;              // action index
  needsDelta: number[];             // 5 floats: change in each need
  tick: number;                     // when this happened
  wasSuccessful: boolean;           // did the action achieve its goal?
  novelty: number;                  // how different was this from recent experiences?
}

interface MemoryEmbedding {
  vector: number[];                 // 64-dim embedding
  significance: number;             // 0.0–1.0, decays over time
  tick: number;                     // when stored
  originalExperience: Experience;   // retained for debugging/logging
}
```

### Experience Encoder

Convert raw experiences into memory embeddings:

```typescript
class ExperienceEncoder {
  // Architecture:
  // Input: concat(perceptionEmbedding[64], actionOneHot[6], needsDelta[5]) = 75 floats
  // Linear(75, 64) → LayerNorm → GELU
  // Linear(64, 64) → LayerNorm → GELU
  // Output: 64-dim memory embedding

  encode(experience: Experience): number[];  // returns 64-dim vector
}
```

### Significance Scoring

Not all memories are equally important. The significance score determines how long a memory persists.

```typescript
function computeSignificance(experience: Experience): number {
  let sig = 0.3;  // baseline significance

  // Large need changes are memorable
  const needChangeSum = experience.needsDelta
    .map(Math.abs)
    .reduce((a, b) => a + b, 0);
  sig += Math.min(needChangeSum * 2.0, 0.3);

  // Novel experiences are memorable
  sig += experience.novelty * 0.2;

  // Failures are memorable (you remember what went wrong)
  if (!experience.wasSuccessful) sig += 0.15;

  // Social interactions are memorable
  if (experience.actionTaken === ACTION_SOCIALIZE) sig += 0.1;

  // Near-death experiences are extremely memorable
  if (experience.perceptionEmbedding[0] < 0.1) sig += 0.3;  // hunger near zero
  if (experience.perceptionEmbedding[4] < 0.1) sig += 0.3;  // safety near zero

  return Math.min(sig, 1.0);
}
```

### Memory Decay

Every tick, all memories lose a tiny amount of significance:

```typescript
function decayMemories(buffer: MemoryEmbedding[], decayRate: number = 0.0005): void {
  for (const memory of buffer) {
    memory.significance -= decayRate;
    // High-significance memories decay slower (power law)
    if (memory.significance > 0.7) {
      memory.significance += decayRate * 0.5; // partial decay restoration
    }
  }
  // Remove memories that have decayed to zero
  buffer = buffer.filter(m => m.significance > 0);
}
```

This creates emergent behavior: traumatic events (high initial significance) persist for thousands of ticks. Routine events (low significance) fade within a few hundred ticks. An NPC that was attacked near the river will remember that experience long after it has forgotten yesterday's lunch.

---

## Part 3: Transformer Decision Network

The core decision-making architecture. This is a small transformer that attends over the NPC's current perception AND its episodic memories to produce an action distribution.

### Architecture

```
Input Sequence (33 tokens × 64 dims each):
  Token 0:      [CLS] — learned classification token
  Token 1:      Current perception embedding (64-dim)
  Tokens 2–33:  Memory buffer embeddings (32 slots × 64-dim, padded if needed)

Transformer Encoder (2 layers):
  Each layer:
    Multi-Head Self-Attention (4 heads, head_dim=16)
    LayerNorm
    Feed-Forward (64 → 128 → 64, GELU activation)
    LayerNorm
    Residual connections on both sublayers

Output Heads (from [CLS] token representation):
  Action Head:   Linear(64, 6) → Softmax → action probability distribution
  Emotion Head:  Linear(64, 3) → Tanh → [valence, arousal, dominance] in [-1, 1]
```

### Detailed Specifications

```typescript
class TransformerBrain {
  // Hyperparameters
  private readonly embeddingDim = 64;
  private readonly numHeads = 4;
  private readonly headDim = 16;       // embeddingDim / numHeads
  private readonly ffnHiddenDim = 128;
  private readonly numLayers = 2;
  private readonly numMemorySlots = 32;
  private readonly numActions = 6;
  private readonly sequenceLength = 34; // 1 CLS + 1 perception + 32 memories

  // Learned parameters
  private clsToken: number[];          // 64-dim, learned
  private positionalEncoding: number[][]; // [34][64], sinusoidal + learned offset

  // Per-layer parameters
  private layers: TransformerLayer[];

  // Output heads
  private actionHead: LinearLayer;     // 64 → 6
  private emotionHead: LinearLayer;    // 64 → 3

  // Forward pass
  forward(
    perceptionEmbedding: number[],     // 64-dim
    memorySequence: number[][],        // [32][64]
    attentionMask: boolean[]           // [32] — which memory slots are real
  ): {
    actionProbabilities: number[];     // [6] — softmax distribution
    emotionalState: number[];          // [3] — valence, arousal, dominance
    memoryAttentionWeights: number[][]; // [numLayers][32] — which memories were attended to
  }
}

class TransformerLayer {
  // Multi-head self-attention
  private queryProjection: LinearLayer;   // 64 → 64
  private keyProjection: LinearLayer;     // 64 → 64
  private valueProjection: LinearLayer;   // 64 → 64
  private outputProjection: LinearLayer;  // 64 → 64

  // Feed-forward network
  private ffnUp: LinearLayer;            // 64 → 128
  private ffnDown: LinearLayer;          // 128 → 64

  // Layer norms
  private attnLayerNorm: LayerNorm;
  private ffnLayerNorm: LayerNorm;

  forward(
    input: number[][],                   // [seqLen][64]
    attentionMask: boolean[]             // [seqLen]
  ): {
    output: number[][];                  // [seqLen][64]
    attentionWeights: number[][];        // [numHeads][seqLen]
  }
}
```

### Why This Architecture

- **Small transformer (2 layers, 4 heads, 64 dims):** This is intentionally tiny. We're running inference for 25 NPCs at 60 ticks per second — that's 1,500 forward passes per second. The network must be fast. A 2-layer transformer with 64-dim embeddings has roughly 50,000 parameters — small enough for real-time inference in a browser.

- **Episodic memory as context:** The transformer's self-attention mechanism is the key innovation. When the NPC is near a river, the attention mechanism can activate high weights on a memory of being attacked near a river 2,000 ticks ago. This isn't programmed — the attention learns which memories are relevant to the current perception. This is what creates behavior that looks like "remembering."

- **Separate emotion head:** The emotion output (valence/arousal/dominance) is NOT used for decision-making directly. It's an auxiliary training signal that regularizes the internal representation. The emotion head forces the network to build an internal representation that captures emotional meaning, which incidentally improves the action head's decisions. It also provides a visible output for the player (NPC mood).

- **CLS token:** Standard transformer classification pattern. The CLS token's final representation aggregates information from the entire sequence (current perception + all relevant memories) and feeds into the output heads.

---

## Part 4: Implementation — All Math Operations

Implement every operation from scratch. Do NOT use any ML library. This runs in the browser with no dependencies.

### 4A: Tensor Operations

```typescript
class Tensor {
  data: Float32Array;
  shape: number[];

  static zeros(shape: number[]): Tensor;
  static ones(shape: number[]): Tensor;
  static randn(shape: number[], mean?: number, std?: number): Tensor;

  // Element-wise operations
  add(other: Tensor): Tensor;
  multiply(other: Tensor): Tensor;      // element-wise
  scale(scalar: number): Tensor;

  // Matrix operations
  matmul(other: Tensor): Tensor;         // matrix multiplication
  transpose(): Tensor;

  // Activation functions
  static gelu(x: Tensor): Tensor;
  static relu(x: Tensor): Tensor;
  static sigmoid(x: Tensor): Tensor;
  static tanh(x: Tensor): Tensor;
  static softmax(x: Tensor, dim?: number): Tensor;

  // Normalization
  static layerNorm(x: Tensor, gamma: Tensor, beta: Tensor, eps?: number): Tensor;

  // Utility
  reshape(shape: number[]): Tensor;
  slice(dim: number, start: number, end: number): Tensor;
  concat(other: Tensor, dim: number): Tensor;
  clone(): Tensor;
  toArray(): number[];
}
```

### 4B: Linear Layer

```typescript
class LinearLayer {
  weight: Tensor;   // [outputDim, inputDim]
  bias: Tensor;     // [outputDim]

  constructor(inputDim: number, outputDim: number);
  forward(input: Tensor): Tensor;  // output = input @ weight.T + bias

  // For training
  weightGrad: Tensor;
  biasGrad: Tensor;
  lastInput: Tensor;

  backward(gradOutput: Tensor): Tensor;  // returns grad w.r.t. input
}
```

### 4C: Multi-Head Self-Attention

```typescript
class MultiHeadAttention {
  numHeads: number;
  headDim: number;

  queryProj: LinearLayer;
  keyProj: LinearLayer;
  valueProj: LinearLayer;
  outputProj: LinearLayer;

  forward(
    input: Tensor,           // [seqLen, embDim]
    mask?: boolean[]         // [seqLen] — false positions get -inf attention
  ): {
    output: Tensor;          // [seqLen, embDim]
    weights: Tensor;         // [numHeads, seqLen, seqLen] — attention maps
  }

  // Attention computation per head:
  // Q = input @ Wq, K = input @ Wk, V = input @ Wv
  // Split into heads: Q[h], K[h], V[h] each [seqLen, headDim]
  // scores = Q[h] @ K[h].T / sqrt(headDim)
  // Apply mask: scores[masked] = -1e9
  // weights = softmax(scores, dim=-1)
  // context = weights @ V[h]
  // Concatenate heads, project through output layer
}
```

### 4D: Transformer Layer

```typescript
class TransformerEncoderLayer {
  attention: MultiHeadAttention;
  ffnUp: LinearLayer;       // embDim → ffnHiddenDim
  ffnDown: LinearLayer;     // ffnHiddenDim → embDim
  layerNorm1: LayerNormParams;
  layerNorm2: LayerNormParams;

  forward(input: Tensor, mask?: boolean[]): {
    output: Tensor;
    attentionWeights: Tensor;
  } {
    // Pre-norm architecture (more stable for small models)
    // Sublayer 1: Attention
    let normed = layerNorm(input, this.layerNorm1);
    let { output: attnOut, weights } = this.attention.forward(normed, mask);
    let residual1 = input.add(attnOut);   // residual connection

    // Sublayer 2: Feed-forward
    normed = layerNorm(residual1, this.layerNorm2);
    let ffnOut = this.ffnUp.forward(normed);
    ffnOut = Tensor.gelu(ffnOut);
    ffnOut = this.ffnDown.forward(ffnOut);
    let residual2 = residual1.add(ffnOut); // residual connection

    return { output: residual2, attentionWeights: weights };
  }
}
```

### 4E: GELU Activation

```typescript
// Gaussian Error Linear Unit — smoother than ReLU, better for transformers
function gelu(x: number): number {
  return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x * x * x)));
}
```

### 4F: Layer Normalization

```typescript
function layerNorm(
  input: number[],
  gamma: number[],  // learned scale
  beta: number[],   // learned shift
  eps: number = 1e-5
): number[] {
  const mean = input.reduce((a, b) => a + b, 0) / input.length;
  const variance = input.reduce((a, b) => a + (b - mean) ** 2, 0) / input.length;
  const std = Math.sqrt(variance + eps);
  return input.map((x, i) => gamma[i] * ((x - mean) / std) + beta[i]);
}
```

### 4G: Positional Encoding

```typescript
function sinusoidalPositionalEncoding(seqLen: number, embDim: number): number[][] {
  const pe: number[][] = [];
  for (let pos = 0; pos < seqLen; pos++) {
    const row: number[] = [];
    for (let i = 0; i < embDim; i++) {
      const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / embDim);
      row.push(i % 2 === 0 ? Math.sin(angle) : Math.cos(angle));
    }
    pe.push(row);
  }
  return pe;
}
```

---

## Part 5: Training System

Train the network using the data logged by the simulation. Training happens in the browser using backpropagation on the collected data.

### 5A: Loss Function

```typescript
class NeuralNetLoss {
  // Primary loss: cross-entropy on action prediction
  actionLoss(predicted: number[], target: number): number {
    // predicted = softmax probabilities [6]
    // target = correct action index
    return -Math.log(predicted[target] + 1e-8);
  }

  // Auxiliary loss: MSE on need change prediction
  outcomeLoss(predictedNeeds: number[], actualNeeds: number[]): number {
    let sum = 0;
    for (let i = 0; i < predictedNeeds.length; i++) {
      sum += (predictedNeeds[i] - actualNeeds[i]) ** 2;
    }
    return sum / predictedNeeds.length;
  }

  // Emotion regularization: emotion should correlate with need levels
  emotionRegularization(emotionalState: number[], needs: number[]): number {
    // Valence should correlate with average need satisfaction
    const avgNeed = needs.reduce((a, b) => a + b, 0) / needs.length;
    const valenceLoss = (emotionalState[0] - (avgNeed * 2 - 1)) ** 2;  // map 0-1 to -1-1
    return valenceLoss * 0.1;  // low weight — regularization, not primary signal
  }

  // Total loss
  total(
    actionPred: number[], actionTarget: number,
    emotionalState: number[], needs: number[],
    outcomePred: number[], outcomeActual: number[]
  ): number {
    return this.actionLoss(actionPred, actionTarget)
         + this.outcomeLoss(outcomePred, outcomeActual) * 0.3
         + this.emotionRegularization(emotionalState, needs) * 0.1;
  }
}
```

### 5B: Backpropagation

Implement backpropagation through the entire network. Every layer must support backward pass.

```typescript
class Backpropagation {
  // Compute gradients for all parameters
  backward(
    loss: number,
    network: TransformerBrain,
    input: ForwardPassCache        // cached intermediate values from forward pass
  ): void;

  // Gradient clipping to prevent exploding gradients
  clipGradients(maxNorm: number): void;
}
```

**Gradient computation for each component:**

1. **Softmax + Cross-Entropy backward:** `dLogits[i] = pred[i] - (i === target ? 1 : 0)`
2. **Linear backward:** `dInput = dOutput @ weight`, `dWeight = dOutput.T @ input`, `dBias = sum(dOutput, dim=0)`
3. **GELU backward:** `dInput = dOutput * gelu'(input)` where `gelu'(x) = 0.5 * (1 + tanh(...)) + 0.5 * x * sech²(...) * sqrt(2/π) * (1 + 3 * 0.044715 * x²)`
4. **LayerNorm backward:** Standard layer norm gradient (compute through the normalization)
5. **Attention backward:** Chain rule through softmax, through Q/K/V projections, through the score computation
6. **Residual connection backward:** Gradient flows through both the skip connection and the sublayer

### 5C: Optimizer — Adam

```typescript
class AdamOptimizer {
  private lr: number;           // learning rate, default 0.001
  private beta1: number;        // default 0.9
  private beta2: number;        // default 0.999
  private eps: number;          // default 1e-8
  private t: number;            // timestep counter

  // Per-parameter state
  private m: Map<string, Tensor>;  // first moment estimates
  private v: Map<string, Tensor>;  // second moment estimates

  step(parameters: Map<string, Tensor>, gradients: Map<string, Tensor>): void {
    this.t++;
    for (const [name, param] of parameters) {
      const grad = gradients.get(name)!;
      const m = this.m.get(name)!;
      const v = this.v.get(name)!;

      // Update moments
      // m = beta1 * m + (1 - beta1) * grad
      // v = beta2 * v + (1 - beta2) * grad²
      // Bias correction
      // m_hat = m / (1 - beta1^t)
      // v_hat = v / (1 - beta2^t)
      // param = param - lr * m_hat / (sqrt(v_hat) + eps)
    }
  }
}
```

### 5D: Training Loop

```typescript
class Trainer {
  private network: TransformerBrain;
  private optimizer: AdamOptimizer;
  private loss: NeuralNetLoss;

  // Offline training on collected data
  trainOffline(
    dataset: TrainingDataset,
    config: TrainingConfig
  ): TrainingReport;

  // Online micro-update during gameplay
  onlineUpdate(
    replayBuffer: Experience[],
    config: OnlineTrainingConfig
  ): void;
}

interface TrainingConfig {
  epochs: number;              // default: 50
  batchSize: number;           // default: 32
  learningRate: number;        // default: 0.001
  learningRateDecay: number;   // default: 0.95 per epoch
  maxGradNorm: number;         // default: 1.0
  validationSplit: number;     // default: 0.2
  earlyStoppingPatience: number; // default: 5 epochs
  checkpointInterval: number;  // save every N epochs
  shuffleData: boolean;        // default: true
}

interface TrainingReport {
  epochs: number;
  finalTrainLoss: number;
  finalValLoss: number;
  finalTrainAccuracy: number;  // % of actions correctly predicted
  finalValAccuracy: number;
  bestValLoss: number;
  bestValEpoch: number;
  lossHistory: { epoch: number; trainLoss: number; valLoss: number }[];
  accuracyHistory: { epoch: number; trainAcc: number; valAcc: number }[];
  perActionAccuracy: Record<string, number>;
  trainingTimeMs: number;
  totalParameters: number;
  convergenceEpoch: number;    // epoch where val loss stopped improving
}
```

### 5E: Training Data Preparation

```typescript
class TrainingDataset {
  perceptions: Tensor;    // [N, 30]
  actions: number[];      // [N] — action indices
  outcomes: Tensor;       // [N, 5] — needs deltas
  memories: Tensor;       // [N, 32, 64] — memory sequences (filled during encoding)
  masks: Tensor;          // [N, 32] — memory attention masks

  // Split into train/val
  split(ratio: number): [TrainingDataset, TrainingDataset];

  // Batch iterator
  batches(batchSize: number): Iterator<Batch>;

  // Shuffle in place
  shuffle(rng: SeededRandom): void;

  // Statistics
  stats(): DatasetStats;
}

// Build dataset from raw JSONL log
function buildDataset(log: DecisionLogEntry[]): TrainingDataset {
  // For each entry:
  // 1. Encode perception to 30-float vector
  // 2. Encode action to integer label
  // 3. Extract needs delta as outcome vector
  // 4. Build memory sequence from previous entries for this NPC
  //    (look back through the log for entries with same npc_id,
  //     encode each as a memory embedding, fill the 32-slot buffer)
  // 5. Create attention mask (true for real memories, false for padding)
}
```

---

## Part 6: Online Learning

After offline training, NPCs continue learning during gameplay. This is what makes them visibly get smarter while the player watches.

### 6A: Replay Buffer

```typescript
class ReplayBuffer {
  private buffer: Experience[];
  private maxSize: number;       // default: 500 per NPC
  private prioritized: boolean;  // use priority sampling

  add(experience: Experience): void;

  // Sample a mini-batch for training
  sample(batchSize: number): Experience[] {
    if (this.prioritized) {
      // Priority sampling: weight by |needsDelta| + novelty
      // Higher impact experiences get sampled more often
    } else {
      // Uniform random sampling
    }
  }
}
```

### 6B: Online Update Schedule

```typescript
class OnlineTrainer {
  private updateInterval: number;    // default: every 100 ticks
  private batchSize: number;         // default: 8 (small for speed)
  private learningRate: number;      // default: 0.0001 (10x lower than offline)
  private maxUpdateTimeMs: number;   // default: 5ms (budget per update)

  // Called every updateInterval ticks
  update(npc: NPC): void {
    if (npc.replayBuffer.size < this.batchSize) return;

    const batch = npc.replayBuffer.sample(this.batchSize);
    const startTime = performance.now();

    // One gradient step on the batch
    // Use the NPC's personal brain weights (not shared)
    const loss = this.trainStep(npc.brain, batch);

    const elapsed = performance.now() - startTime;
    if (elapsed > this.maxUpdateTimeMs) {
      // Reduce batch size or skip next update to stay in budget
      this.batchSize = Math.max(4, this.batchSize - 1);
    }
  }
}
```

### 6C: Personality Divergence

This is where the magic happens. All NPCs start with the same base weights (from offline training). Online learning updates each NPC's weights independently based on their personal experiences. Over time, their weight vectors diverge — each NPC develops a unique behavioral profile.

```typescript
class PersonalityTracker {
  // Measure how different this NPC's brain is from the base model
  divergenceFromBase(npcBrain: TransformerBrain, baseBrain: TransformerBrain): number {
    // Compute average absolute weight difference across all parameters
    // Returns 0.0 (identical to base) to 1.0+ (heavily diverged)
  }

  // Measure how different two NPCs' brains are from each other
  interNPCDivergence(brainA: TransformerBrain, brainB: TransformerBrain): number;

  // Classify personality type based on action distribution tendencies
  classifyPersonality(actionHistory: ActionType[]): string {
    // "cautious" — high shelter-seeking, early resting
    // "explorer" — high exploration, late resting
    // "social" — high socialization, follows other NPCs
    // "survivalist" — aggressive foraging, low exploration
    // "balanced" — even distribution
  }
}
```

---

## Part 7: Weight Serialization

Save and load trained weights so progress isn't lost.

```typescript
class WeightSerializer {
  // Save all weights to a JSON blob
  serialize(brain: TransformerBrain): string {
    // Returns JSON containing:
    // - All Linear layer weights and biases as flat arrays
    // - All LayerNorm gamma and beta
    // - CLS token
    // - Positional encoding
    // - Perception encoder weights
    // - Experience encoder weights
    // - Total parameter count for validation
  }

  // Load weights from JSON blob
  deserialize(json: string, brain: TransformerBrain): void;

  // Save to localStorage (per world seed)
  saveToStorage(worldSeed: number, brain: TransformerBrain): void;

  // Load from localStorage
  loadFromStorage(worldSeed: number, brain: TransformerBrain): boolean;

  // Export as downloadable file
  exportWeights(brain: TransformerBrain): Blob;

  // Import from uploaded file
  importWeights(file: File, brain: TransformerBrain): Promise<void>;
}
```

### Weight Format

```json
{
  "version": "1.0",
  "architecture": {
    "embeddingDim": 64,
    "numHeads": 4,
    "numLayers": 2,
    "ffnHiddenDim": 128,
    "numActions": 6,
    "numMemorySlots": 32,
    "perceptionInputDim": 30
  },
  "totalParameters": 49826,
  "trainedOn": {
    "samples": 100000,
    "epochs": 50,
    "finalValAccuracy": 0.73,
    "timestamp": "2026-02-15T12:00:00Z"
  },
  "weights": {
    "perceptionEncoder.linear1.weight": [/* flat Float32 array */],
    "perceptionEncoder.linear1.bias": [/* ... */],
    "perceptionEncoder.linear2.weight": [/* ... */],
    "perceptionEncoder.linear2.bias": [/* ... */],
    "clsToken": [/* 64 floats */],
    "layers.0.attention.queryProj.weight": [/* ... */],
    "layers.0.attention.queryProj.bias": [/* ... */],
    // ... all parameters listed with full paths
    "actionHead.weight": [/* ... */],
    "actionHead.bias": [/* ... */],
    "emotionHead.weight": [/* ... */],
    "emotionHead.bias": [/* ... */]
  }
}
```

---

## Part 8: NeuralNetBrain — The IBrain Implementation

This is the final class that connects everything.

```typescript
class NeuralNetBrain implements IBrain {
  private perceptionEncoder: PerceptionEncoder;
  private experienceEncoder: ExperienceEncoder;
  private transformer: TransformerBrain;
  private memory: EpisodicMemoryBuffer;
  private replayBuffer: ReplayBuffer;
  private onlineTrainer: OnlineTrainer;
  private personalityTracker: PersonalityTracker;

  private lastPerception: Perception | null;
  private lastAction: Action | null;
  private emotionalState: number[];         // [valence, arousal, dominance]
  private ticksSinceLastUpdate: number;

  // The IBrain interface — this is the only method the simulation calls
  decide(perception: Perception): Action {
    // 1. Encode perception to vector
    const percVector = encodePerception(perception);
    const percEmbedding = this.perceptionEncoder.encode(percVector);

    // 2. Get memory sequence
    const memorySeq = this.memory.getMemorySequence();
    const memoryMask = this.memory.getAttentionMask();

    // 3. Run transformer forward pass
    const { actionProbabilities, emotionalState, memoryAttentionWeights } =
      this.transformer.forward(percEmbedding, memorySeq, memoryMask);

    // 4. Update emotional state
    this.emotionalState = emotionalState;

    // 5. Sample action from probability distribution
    const actionIndex = this.sampleAction(actionProbabilities);
    const action = this.indexToAction(actionIndex, perception);

    // 6. Store experience from PREVIOUS tick (now we know the outcome)
    if (this.lastPerception && this.lastAction) {
      const experience = this.buildExperience(
        this.lastPerception, this.lastAction, perception
      );
      this.memory.store(experience);
      this.replayBuffer.add(experience);
    }

    // 7. Online learning update (every N ticks)
    this.ticksSinceLastUpdate++;
    if (this.ticksSinceLastUpdate >= this.onlineTrainer.updateInterval) {
      this.onlineTrainer.update(this);
      this.ticksSinceLastUpdate = 0;
    }

    // 8. Decay memories
    this.memory.decayMemories();

    // 9. Cache for next tick
    this.lastPerception = perception;
    this.lastAction = action;

    return action;
  }

  // Convert action index to Action struct with target coordinates
  private indexToAction(index: number, perception: Perception): Action {
    const type = ACTION_TYPES[index];
    switch (type) {
      case 'FORAGE':
        // Find nearest food from perception
        const food = perception.nearbyObjects
          .filter(o => o.type === 'berry_bush' && o.state === 'ripe')
          .sort((a, b) => (a.dx*a.dx + a.dy*a.dy) - (b.dx*b.dx + b.dy*b.dy))[0];
        if (food) return { type, targetX: food.x, targetY: food.y };
        // No food visible — check memories
        const foodMemory = perception.relevantMemories
          .find(m => m.type === 'found_food');
        if (foodMemory) return { type, targetX: foodMemory.x, targetY: foodMemory.y };
        // No memory — explore to find food
        return { type: 'EXPLORE', targetX: -1, targetY: -1 };

      case 'SEEK_SHELTER':
        const shelter = perception.nearbyObjects
          .find(o => o.type === 'cave_floor' || o.type === 'shelter_hut');
        if (shelter) return { type, targetX: shelter.x, targetY: shelter.y };
        const shelterMemory = perception.relevantMemories
          .find(m => m.type === 'found_shelter');
        if (shelterMemory) return { type, targetX: shelterMemory.x, targetY: shelterMemory.y };
        // Move toward stone/cave tiles as a guess
        const stone = perception.nearbyTiles
          .filter(t => t.type === 'stone' || t.type === 'cave_floor')
          .sort((a, b) => (a.dx*a.dx + a.dy*a.dy) - (b.dx*b.dx + b.dy*b.dy))[0];
        if (stone) return { type, targetX: stone.x, targetY: stone.y };
        return { type, targetX: -1, targetY: -1 };

      case 'SOCIALIZE':
        const npc = perception.nearbyNPCs
          .sort((a, b) => (a.dx*a.dx + a.dy*a.dy) - (b.dx*b.dx + b.dy*b.dy))[0];
        if (npc) return { type, targetX: npc.x, targetY: npc.y, targetNpcId: npc.id };
        return { type: 'EXPLORE', targetX: -1, targetY: -1 };

      case 'REST':
        return { type, targetX: -1, targetY: -1 };  // rest in place

      case 'EXPLORE':
        // Pick a random direction biased toward unvisited areas
        return { type, targetX: -1, targetY: -1 };

      default:
        return { type: 'IDLE', targetX: -1, targetY: -1 };
    }
  }

  // Stochastic action sampling with temperature
  private sampleAction(probabilities: number[], temperature: number = 0.8): number {
    // Apply temperature scaling
    const logits = probabilities.map(p => Math.log(p + 1e-8) / temperature);
    const maxLogit = Math.max(...logits);
    const expLogits = logits.map(l => Math.exp(l - maxLogit));
    const sumExp = expLogits.reduce((a, b) => a + b, 0);
    const scaled = expLogits.map(e => e / sumExp);

    // Sample from distribution
    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < scaled.length; i++) {
      cumulative += scaled[i];
      if (r < cumulative) return i;
    }
    return scaled.length - 1;
  }

  // Accessible for UI / debug overlay
  getEmotionalState(): { valence: number; arousal: number; dominance: number } {
    return {
      valence: this.emotionalState[0],
      arousal: this.emotionalState[1],
      dominance: this.emotionalState[2]
    };
  }

  getMemoryAttentionWeights(): number[][] {
    return this.lastAttentionWeights;
  }

  getPersonalityType(): string {
    return this.personalityTracker.classifyPersonality(this.actionHistory);
  }

  getDivergenceFromBase(): number {
    return this.personalityTracker.divergenceFromBase(this.transformer, this.baseWeights);
  }
}
```

---

## Part 9: Training UI

Add a training panel to the existing testing dashboard.

### Training Tab

```
┌─────────────────────────────────────────────────┐
│  NEURAL NETWORK TRAINING                         │
│                                                   │
│  Dataset: 47,231 samples from behavior tree data  │
│  Quality Score: 87/100 ✅                         │
│                                                   │
│  [Train Offline]  [Stop]  Epochs: [50]  LR: [.001]│
│                                                   │
│  Progress: ████████████████░░░░  Epoch 38/50      │
│  Train Loss: 0.842  Val Loss: 0.891               │
│  Train Acc:  71.3%  Val Acc:  68.7%               │
│                                                   │
│  ┌───────────────────────────────────────────┐    │
│  │  Loss Curve                                │    │
│  │  1.5 ┤                                     │    │
│  │      │╲                                    │    │
│  │  1.0 ┤ ╲___                                │    │
│  │      │     ╲___                            │    │
│  │  0.5 ┤         ╲________                   │    │
│  │      │                   ╲_____            │    │
│  │  0.0 ┤                         ╲__________ │    │
│  │      └───────────────────────────────────  │    │
│  │        0    10    20    30    40    50      │    │
│  └───────────────────────────────────────────┘    │
│                                                   │
│  Per-Action Accuracy:                             │
│  FORAGE:      ████████████░░  82%                 │
│  REST:        █████████░░░░░  65%                 │
│  SHELTER:     ████████░░░░░░  59%                 │
│  EXPLORE:     ███████████░░░  76%                 │
│  SOCIALIZE:   ██████░░░░░░░░  48%                 │
│                                                   │
│  [Deploy to NPCs]  [Export Weights]               │
└─────────────────────────────────────────────────┘
```

### Live Monitoring Tab

```
┌─────────────────────────────────────────────────┐
│  LIVE NEURAL NETWORK MONITORING                   │
│                                                   │
│  Active Neural Brains: 12 / 25 NPCs              │
│  Behavior Tree Brains: 13 / 25 NPCs              │
│                                                   │
│  [Toggle All Neural]  [Toggle All BT]  [50/50]   │
│                                                   │
│  ┌─ Selected NPC: Villager #14 (Neural) ───────┐ │
│  │                                              │ │
│  │  Emotional State:                            │ │
│  │  Valence:   ████████░░  +0.62 (positive)     │ │
│  │  Arousal:   ███░░░░░░░  -0.41 (calm)         │ │
│  │  Dominance: █████░░░░░  +0.12 (neutral)      │ │
│  │                                              │ │
│  │  Memory Attention (what it's remembering):   │ │
│  │  █████ Found food [12,45] (200 ticks ago)    │ │
│  │  ███   Met npc_03 [20,30] (450 ticks ago)    │ │
│  │  ██    Storm shelter [34,22] (800 ticks ago)  │ │
│  │  ░     Found area [50,60] (1200 ticks ago)   │ │
│  │                                              │ │
│  │  Action Probabilities:                       │ │
│  │  FORAGE     ████████████████  68%            │ │
│  │  REST       ████░░░░░░░░░░░░  12%           │ │
│  │  SHELTER    ██░░░░░░░░░░░░░░   7%           │ │
│  │  EXPLORE    ███░░░░░░░░░░░░░   9%           │ │
│  │  SOCIALIZE  ░░░░░░░░░░░░░░░░   4%           │ │
│  │                                              │ │
│  │  Personality: Explorer (divergence: 0.23)    │ │
│  │  Online updates: 47                          │ │
│  │  Replay buffer: 312 / 500                    │ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  Population Divergence Map:                       │
│  npc_01 ████████  0.31 (cautious)                 │
│  npc_02 ███░░░░░  0.12 (balanced)                 │
│  npc_03 █████████ 0.38 (explorer)                  │
│  npc_14 ██████░░  0.23 (explorer)                  │
│  npc_07 ████░░░░  0.15 (social)                    │
│  ...                                              │
└─────────────────────────────────────────────────┘
```

---

## Part 10: Integration With Existing Systems

### Brain Swapping

The simulation's NPC manager must support mixed populations:

```typescript
// In NPCManager or wherever brains are assigned
function setBrainType(npc: NPC, type: 'behavior_tree' | 'neural_net'): void {
  if (type === 'neural_net') {
    npc.brain = new NeuralNetBrain(baseWeights);
  } else {
    npc.brain = new BehaviorTreeBrain();
  }
  // That's it. The simulation doesn't know or care which type is running.
}

// Bulk operations
function setAllBrains(type: 'behavior_tree' | 'neural_net'): void;
function setMixedBrains(ratio: number): void;  // 0.5 = half and half
function toggleNPCBrain(npcId: string): void;   // swap individual NPC
```

### Debug Visualization Integration

The existing NPC renderer needs to show neural-net-specific info when debug mode is on:

- **Mood aura color** driven by the emotion head output instead of the behavior tree's simpler mood
- **Memory attention visualization:** When an NPC is selected, show which memories are currently being attended to (highlight the memory locations on the world map with fading circles)
- **Action probability bars** shown above the NPC (small, semi-transparent) showing the distribution the network is considering
- **Personality label** shown next to NPC name in info panel
- **"Neural" badge** on NPCs using neural brains vs "BT" badge on behavior tree NPCs

### Benchmark Integration

The existing benchmark suite must work with NeuralNetBrain:

```typescript
// The benchmark already accepts IBrain — just pass NeuralNetBrain
const btResults = benchmark.runAll(new BehaviorTreeBrain(), config);
const nnResults = benchmark.runAll(new NeuralNetBrain(trainedWeights), config);
const comparison = abComparison.compare(
  new BehaviorTreeBrain(),
  new NeuralNetBrain(trainedWeights),
  STANDARD_SCENARIOS,
  config
);
```

---

## Part 11: Weight Initialization

Before training, initialize weights properly. Bad initialization = training doesn't converge.

```typescript
function initializeWeights(brain: TransformerBrain): void {
  // Xavier/Glorot initialization for linear layers
  for (const layer of brain.getAllLinearLayers()) {
    const fanIn = layer.weight.shape[1];
    const fanOut = layer.weight.shape[0];
    const std = Math.sqrt(2.0 / (fanIn + fanOut));
    layer.weight = Tensor.randn(layer.weight.shape, 0, std);
    layer.bias = Tensor.zeros(layer.bias.shape);
  }

  // Layer norm: gamma = 1, beta = 0
  for (const ln of brain.getAllLayerNorms()) {
    ln.gamma = Tensor.ones(ln.gamma.shape);
    ln.beta = Tensor.zeros(ln.beta.shape);
  }

  // CLS token: small random
  brain.clsToken = Tensor.randn([64], 0, 0.02).toArray();

  // Positional encoding: sinusoidal (not learned, but add small learnable offset)
  brain.positionalEncoding = sinusoidalPositionalEncoding(34, 64);
  brain.positionalOffset = Tensor.randn([34, 64], 0, 0.01);
}
```

---

## Performance Budget

The neural network must operate within these constraints:

| Operation | Budget per NPC per tick | Total budget (25 NPCs × 60 TPS) |
|---|---|---|
| Perception encoding | 0.05ms | 75ms/sec |
| Memory sequence retrieval | 0.02ms | 30ms/sec |
| Transformer forward pass | 0.3ms | 450ms/sec |
| Action sampling | 0.01ms | 15ms/sec |
| Experience storage | 0.02ms | 30ms/sec |
| Online learning (amortized) | 0.1ms | 150ms/sec |
| **Total** | **0.5ms** | **750ms/sec** |

This leaves 250ms/sec for rendering, UI, and everything else. Profile every component and optimize if any exceeds its budget.

**Optimization strategies:**
- Use `Float32Array` for all tensor data (not regular arrays)
- Pre-allocate all tensors at initialization, reuse buffers
- Avoid garbage collection by never creating temporary arrays in the hot path
- Batch matrix multiplications where possible
- Consider using Web Workers for training (not inference — inference must be on main thread for timing consistency)

---

## Validation Checklist

- [ ] `NeuralNetBrain` implements `IBrain` interface correctly
- [ ] Tensor class supports all required operations (matmul, softmax, GELU, layerNorm)
- [ ] Perception encoder produces 64-dim embeddings from 30-float input
- [ ] Experience encoder produces 64-dim memory embeddings
- [ ] Episodic memory buffer stores, decays, and evicts memories correctly
- [ ] Transformer forward pass produces action probabilities and emotional state
- [ ] Attention weights are accessible for debug visualization
- [ ] Backpropagation computes correct gradients (verify with numerical gradient check)
- [ ] Adam optimizer updates weights correctly
- [ ] Offline training runs to completion and produces a training report
- [ ] Training loss decreases over epochs (learning is happening)
- [ ] Validation accuracy exceeds 50% (better than random for 6 actions)
- [ ] Per-action accuracy shows learning for all action types
- [ ] Weights serialize to JSON and deserialize without loss
- [ ] Weights save to localStorage and load correctly
- [ ] Online learning updates weights without crashing or NaN
- [ ] Brain swap works: toggle NPC between BT and neural with no crash
- [ ] Mixed population runs: 12 neural + 13 BT NPCs simultaneously
- [ ] Neural NPCs survive at least 80% as long as BT NPCs (benchmark test 1)
- [ ] Neural NPCs respond to hunger within 10 ticks (benchmark test 2)
- [ ] Neural NPCs seek shelter during storms (benchmark test 3)
- [ ] Personality divergence measurable after 5,000 ticks of online learning
- [ ] Forward pass completes in < 0.5ms per NPC (performance budget)
- [ ] No memory leaks during extended neural operation (10,000+ ticks)
- [ ] Training UI tab shows loss curves and accuracy metrics
- [ ] Live monitoring tab shows emotional state and memory attention for selected NPC
- [ ] All existing benchmarks still pass with neural brains
- [ ] A/B comparison shows neural vs BT results

---

## Summary

You are building a brain. Not a chatbot, not a classifier — a brain that perceives, remembers, feels, decides, and learns. It lives inside a 16×16 pixel character in a tiny world, but the architecture is real: transformer attention over episodic memory, continuous emotional modeling, online learning from experience, and emergent personality through weight divergence.

When you're done, I should be able to watch an NPC with a neural brain and see it do something the behavior tree would never do — avoid a specific location because of a bad memory, seek out a particular NPC it trusts, rest proactively before exhaustion, explore with apparent purpose. The behavior tree follows rules. The neural network follows experience. The difference should be visible.

Build the brain. Make it learn. Make it remember. Make it feel.
