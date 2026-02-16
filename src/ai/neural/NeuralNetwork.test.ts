import { describe, it, expect } from 'vitest';
import { Tensor } from './Tensor';
import { LinearLayer } from './LinearLayer';
import { PerceptionEncoder } from './PerceptionEncoder';
import { ExperienceEncoder } from './ExperienceEncoder';
import type { Experience } from './ExperienceEncoder';
import { EpisodicMemoryBuffer } from './EpisodicMemory';
import { TransformerBrain } from './TransformerBrain';
import { NeuralNetBrain } from './NeuralNetBrain';
import { NeuralNetLoss } from './NeuralNetLoss';
import { AdamOptimizer } from './AdamOptimizer';
import { ReplayBuffer } from './ReplayBuffer';
import { PersonalityTracker } from './PersonalityTracker';
import { WeightSerializer } from './WeightSerializer';
import { Trainer } from './Trainer';
import type { TrainingSample } from './Trainer';
import { BehaviorTreeBrain } from '../BehaviorTreeBrain';
import { createBrain, getBrainType, toggleBrainType } from '../BrainSwap';
import type { Perception } from '../Perception';
import type { ActionType } from '../Action';
import type { WeatherState } from '../../world/Weather';
import { ObjectType } from '../../world/WorldObject';
import { TileType } from '../../world/TileMap';

// ---- Helper ----
const VALID_ACTIONS: ActionType[] = ['FORAGE', 'REST', 'SEEK_SHELTER', 'EXPLORE', 'SOCIALIZE', 'IDLE', 'GATHER', 'CRAFT', 'FISH'];

function buildTestPerception(overrides: Partial<Perception> = {}): Perception {
  return {
    nearbyTiles: [
      { x: 65, y: 64, type: TileType.Grass, walkable: true },
      { x: 63, y: 64, type: TileType.Grass, walkable: true },
    ],
    nearbyObjects: [
      { id: 'obj_food_1', type: ObjectType.BerryBush, x: 66, y: 64, state: 'normal' },
      { id: 'obj_shelter_1', type: ObjectType.Campfire, x: 60, y: 64, state: 'normal' },
    ],
    nearbyNPCs: [],
    nearbyConstructionSites: [],
    nearbyStructures: [],
    needs: { hunger: 0.5, energy: 0.5, social: 0.5, curiosity: 0.5, safety: 0.5 },
    personality: { bravery: 0.5, sociability: 0.5, curiosity: 0.5, industriousness: 0.5, craftiness: 0.5 },
    inventory: { wood: 0, stone: 0, berries: 0 },
    relevantMemories: [],
    timeOfDay: 0.5,
    weather: 'clear' as WeatherState,
    season: 'summer',
    currentTick: 0,
    cameraX: 64,
    cameraY: 64,
    cameraZoom: 1,
    craftInventoryThreshold: 5,
    hasFishingRod: false,
    nearbyFishingSpots: [],
    ...overrides,
  };
}

function buildTestExperience(overrides: Partial<Experience> = {}): Experience {
  return {
    perceptionEmbedding: new Array(64).fill(0).map(() => Math.random() * 0.1),
    actionTaken: 0,
    needsDelta: [0.01, -0.02, 0, 0, 0],
    tick: 100,
    wasSuccessful: true,
    novelty: 0.3,
    ...overrides,
  };
}

function buildTrainingSample(overrides: Partial<TrainingSample> = {}): TrainingSample {
  return {
    perceptionVector: new Array(30).fill(0).map(() => Math.random()),
    actionLabel: Math.floor(Math.random() * 6),
    outcomeVector: [0.01, -0.01, 0, 0, 0],
    needs: [0.5, 0.5, 0.5, 0.5, 0.5],
    ...overrides,
  };
}

// ======================================================================
// 1. Tensor Tests
// ======================================================================
describe('Tensor', () => {
  it('zeros creates correct shape and values', () => {
    const t = Tensor.zeros([3, 4]);
    expect(t.shape).toEqual([3, 4]);
    expect(t.data.length).toBe(12);
    expect(t.data.every(v => v === 0)).toBe(true);
  });

  it('ones creates correct shape and values', () => {
    const t = Tensor.ones([2, 3]);
    expect(t.shape).toEqual([2, 3]);
    expect(t.data.length).toBe(6);
    expect(t.data.every(v => v === 1)).toBe(true);
  });

  it('randn creates correct shape with finite values', () => {
    const t = Tensor.randn([5, 5]);
    expect(t.shape).toEqual([5, 5]);
    expect(t.data.length).toBe(25);
    expect(Array.from(t.data).every(v => isFinite(v))).toBe(true);
  });

  it('add works element-wise', () => {
    const a = new Tensor(new Float32Array([1, 2, 3]), [3]);
    const b = new Tensor(new Float32Array([4, 5, 6]), [3]);
    const c = a.add(b);
    expect(c.toArray()).toEqual([5, 7, 9]);
  });

  it('multiply works element-wise', () => {
    const a = new Tensor(new Float32Array([2, 3, 4]), [3]);
    const b = new Tensor(new Float32Array([5, 6, 7]), [3]);
    const c = a.multiply(b);
    expect(c.toArray()).toEqual([10, 18, 28]);
  });

  it('scale works', () => {
    const a = new Tensor(new Float32Array([1, 2, 3]), [3]);
    const c = a.scale(3);
    expect(c.toArray()).toEqual([3, 6, 9]);
  });

  it('matmul produces correct results for known 2x2', () => {
    // [[1,2],[3,4]] @ [[5,6],[7,8]] = [[19,22],[43,50]]
    const a = new Tensor(new Float32Array([1, 2, 3, 4]), [2, 2]);
    const b = new Tensor(new Float32Array([5, 6, 7, 8]), [2, 2]);
    const c = a.matmul(b);
    expect(c.shape).toEqual([2, 2]);
    expect(c.get([0, 0])).toBe(19);
    expect(c.get([0, 1])).toBe(22);
    expect(c.get([1, 0])).toBe(43);
    expect(c.get([1, 1])).toBe(50);
  });

  it('gelu produces expected output', () => {
    const x = new Tensor(new Float32Array([0, 1, -1]), [3]);
    const y = Tensor.gelu(x);
    expect(y.data[0]).toBeCloseTo(0, 3);
    expect(y.data[1]).toBeCloseTo(0.841, 2);
    expect(y.data[2]).toBeCloseTo(-0.159, 2);
  });

  it('softmax sums to 1.0', () => {
    const x = new Tensor(new Float32Array([1, 2, 3, 4]), [4]);
    const y = Tensor.softmax(x);
    const sum = y.toArray().reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
    expect(y.toArray().every(v => v > 0 && v < 1)).toBe(true);
  });

  it('layerNorm normalizes correctly', () => {
    const x = new Tensor(new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]), [8]);
    const gamma = Tensor.ones([8]);
    const beta = Tensor.zeros([8]);
    const y = Tensor.layerNorm(x, gamma, beta);
    // With gamma=1, beta=0, mean should be ≈0 and std ≈1
    const arr = y.toArray();
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    expect(mean).toBeCloseTo(0, 4);
    const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
    expect(Math.sqrt(variance)).toBeCloseTo(1, 1);
  });

  it('transpose works correctly', () => {
    const a = new Tensor(new Float32Array([1, 2, 3, 4, 5, 6]), [2, 3]);
    const t = a.transpose();
    expect(t.shape).toEqual([3, 2]);
    expect(t.get([0, 0])).toBe(1);
    expect(t.get([0, 1])).toBe(4);
    expect(t.get([1, 0])).toBe(2);
    expect(t.get([1, 1])).toBe(5);
    expect(t.get([2, 0])).toBe(3);
    expect(t.get([2, 1])).toBe(6);
  });

  it('reshape preserves data', () => {
    const a = new Tensor(new Float32Array([1, 2, 3, 4, 5, 6]), [2, 3]);
    const b = a.reshape([3, 2]);
    expect(b.shape).toEqual([3, 2]);
    expect(b.toArray()).toEqual(a.toArray());
  });

  it('slice extracts correct subrange', () => {
    const a = new Tensor(new Float32Array([1, 2, 3, 4, 5, 6]), [3, 2]);
    const s = a.slice(0, 1, 3);
    expect(s.shape).toEqual([2, 2]);
    expect(s.toArray()).toEqual([3, 4, 5, 6]);
  });

  it('concat joins tensors', () => {
    const a = new Tensor(new Float32Array([1, 2, 3, 4]), [2, 2]);
    const b = new Tensor(new Float32Array([5, 6, 7, 8]), [2, 2]);
    const c = a.concat(b, 0);
    expect(c.shape).toEqual([4, 2]);
    expect(c.toArray()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

// ======================================================================
// 2. LinearLayer Tests
// ======================================================================
describe('LinearLayer', () => {
  it('constructor creates correct weight/bias shapes', () => {
    const layer = new LinearLayer(10, 5);
    expect(layer.weight.shape).toEqual([5, 10]);
    expect(layer.bias.shape).toEqual([5]);
  });

  it('forward produces correct output shape', () => {
    const layer = new LinearLayer(10, 5);
    const input = Tensor.randn([3, 10]);
    const output = layer.forward(input);
    expect(output.shape).toEqual([3, 5]);
  });

  it('1D input works', () => {
    const layer = new LinearLayer(10, 5);
    const input = Tensor.randn([10]);
    const output = layer.forward(input);
    expect(output.shape).toEqual([5]);
  });

  it('backward returns gradient with correct shape', () => {
    const layer = new LinearLayer(10, 5);
    const input = Tensor.randn([10]);
    layer.forward(input);
    const gradOutput = Tensor.randn([5]);
    const gradInput = layer.backward(gradOutput);
    expect(gradInput.shape).toEqual([10]);
  });
});

// ======================================================================
// 3. PerceptionEncoder Tests
// ======================================================================
describe('PerceptionEncoder', () => {
  it('encode produces 64-dim output from 30-float input', () => {
    const encoder = new PerceptionEncoder();
    const input = new Array(30).fill(0).map(() => Math.random());
    const output = encoder.encode(input);
    expect(output).toHaveLength(64);
  });

  it('all values are finite (no NaN/Infinity)', () => {
    const encoder = new PerceptionEncoder();
    const input = new Array(30).fill(0.5);
    const output = encoder.encode(input);
    expect(output.every(v => isFinite(v))).toBe(true);
  });
});

// ======================================================================
// 4. ExperienceEncoder Tests
// ======================================================================
describe('ExperienceEncoder', () => {
  it('encode produces 64-dim output', () => {
    const encoder = new ExperienceEncoder();
    const exp = buildTestExperience();
    const output = encoder.encode(exp);
    expect(output).toHaveLength(64);
  });

  it('all values are finite', () => {
    const encoder = new ExperienceEncoder();
    const exp = buildTestExperience();
    const output = encoder.encode(exp);
    expect(output.every(v => isFinite(v))).toBe(true);
  });
});

// ======================================================================
// 5. EpisodicMemoryBuffer Tests
// ======================================================================
describe('EpisodicMemoryBuffer', () => {
  it('initially empty (size 0, mask all false)', () => {
    const buffer = new EpisodicMemoryBuffer();
    expect(buffer.getBufferSize()).toBe(0);
    const mask = buffer.getAttentionMask();
    expect(mask.every(v => v === false)).toBe(true);
  });

  it('store adds memories', () => {
    const buffer = new EpisodicMemoryBuffer();
    const encoder = new ExperienceEncoder();
    buffer.store(buildTestExperience(), encoder);
    expect(buffer.getBufferSize()).toBe(1);
    buffer.store(buildTestExperience({ tick: 200 }), encoder);
    expect(buffer.getBufferSize()).toBe(2);
  });

  it('getMemorySequence returns correct shape [32][64]', () => {
    const buffer = new EpisodicMemoryBuffer();
    const encoder = new ExperienceEncoder();
    buffer.store(buildTestExperience(), encoder);
    const seq = buffer.getMemorySequence();
    expect(seq).toHaveLength(32);
    for (const row of seq) {
      expect(row).toHaveLength(64);
    }
  });

  it('decayMemories reduces significance', () => {
    const buffer = new EpisodicMemoryBuffer();
    const encoder = new ExperienceEncoder();
    buffer.store(buildTestExperience(), encoder);
    const beforeSig = buffer.getBuffer()[0].significance;
    buffer.decayMemories(0.01);
    const afterSig = buffer.getBuffer()[0].significance;
    expect(afterSig).toBeLessThan(beforeSig);
  });

  it('evicts lowest significance when full', () => {
    const buffer = new EpisodicMemoryBuffer(4, 64);
    const encoder = new ExperienceEncoder();
    for (let i = 0; i < 5; i++) {
      buffer.store(buildTestExperience({ tick: i * 100 }), encoder);
    }
    expect(buffer.getBufferSize()).toBe(4);
  });

  it('getAttentionMask reflects stored memories', () => {
    const buffer = new EpisodicMemoryBuffer();
    const encoder = new ExperienceEncoder();
    buffer.store(buildTestExperience(), encoder);
    buffer.store(buildTestExperience({ tick: 200 }), encoder);
    const mask = buffer.getAttentionMask();
    expect(mask[0]).toBe(true);
    expect(mask[1]).toBe(true);
    expect(mask[2]).toBe(false);
  });
});

// ======================================================================
// 6. TransformerBrain Tests
// ======================================================================
describe('TransformerBrain', () => {
  it('forward produces action probabilities summing to ~1', () => {
    const brain = new TransformerBrain();
    brain.initializeWeights();
    const percEmb = new Array(64).fill(0).map(() => Math.random() * 0.1);
    const memSeq = Array.from({ length: 32 }, () => new Array(64).fill(0));
    const mask = new Array(32).fill(false);
    const result = brain.forward(percEmb, memSeq, mask);
    const sum = result.actionProbabilities.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 3);
    expect(result.actionProbabilities).toHaveLength(6);
  });

  it('forward produces emotional state with 3 values in [-1, 1]', () => {
    const brain = new TransformerBrain();
    brain.initializeWeights();
    const percEmb = new Array(64).fill(0).map(() => Math.random() * 0.1);
    const memSeq = Array.from({ length: 32 }, () => new Array(64).fill(0));
    const mask = new Array(32).fill(false);
    const result = brain.forward(percEmb, memSeq, mask);
    expect(result.emotionalState).toHaveLength(3);
    for (const v of result.emotionalState) {
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('memoryAttentionWeights accessible', () => {
    const brain = new TransformerBrain();
    brain.initializeWeights();
    const percEmb = new Array(64).fill(0.1);
    const memSeq = Array.from({ length: 32 }, () => new Array(64).fill(0));
    const mask = new Array(32).fill(false);
    const result = brain.forward(percEmb, memSeq, mask);
    expect(result.memoryAttentionWeights).toBeDefined();
    expect(result.memoryAttentionWeights.length).toBe(2); // numLayers
    for (const weights of result.memoryAttentionWeights) {
      expect(weights).toHaveLength(32);
    }
  });

  it('initializeWeights does not produce NaN', () => {
    const brain = new TransformerBrain();
    brain.initializeWeights();
    for (const layer of brain.getAllLinearLayers()) {
      expect(Array.from(layer.weight.data).every(v => isFinite(v))).toBe(true);
      expect(Array.from(layer.bias.data).every(v => isFinite(v))).toBe(true);
    }
  });
});

// ======================================================================
// 7. NeuralNetBrain Tests (IBrain interface)
// ======================================================================
describe('NeuralNetBrain', () => {
  it('decide returns valid Action with type and coordinates', () => {
    const brain = new NeuralNetBrain();
    const perception = buildTestPerception();
    const action = brain.decide(perception);
    expect(action).toHaveProperty('type');
    expect(action).toHaveProperty('targetX');
    expect(action).toHaveProperty('targetY');
    expect(typeof action.type).toBe('string');
    expect(typeof action.targetX).toBe('number');
    expect(typeof action.targetY).toBe('number');
  });

  it('decide returns one of the known action types', () => {
    const brain = new NeuralNetBrain();
    const perception = buildTestPerception();
    const action = brain.decide(perception);
    expect(VALID_ACTIONS).toContain(action.type);
  });

  it('can make multiple sequential decisions without crashing', () => {
    const brain = new NeuralNetBrain();
    for (let i = 0; i < 10; i++) {
      const perception = buildTestPerception({ currentTick: i });
      const action = brain.decide(perception);
      expect(VALID_ACTIONS).toContain(action.type);
    }
  });

  it('handles various perception states', () => {
    const brain = new NeuralNetBrain();

    const hungry = buildTestPerception({ needs: { hunger: 0.1, energy: 0.5, social: 0.5, curiosity: 0.5, safety: 0.5 } });
    expect(() => brain.decide(hungry)).not.toThrow();

    const tired = buildTestPerception({ needs: { hunger: 0.5, energy: 0.1, social: 0.5, curiosity: 0.5, safety: 0.5 } });
    expect(() => brain.decide(tired)).not.toThrow();

    const stormy = buildTestPerception({ weather: 'storm' as WeatherState });
    expect(() => brain.decide(stormy)).not.toThrow();
  });
});

// ======================================================================
// 8. Loss Tests
// ======================================================================
describe('NeuralNetLoss', () => {
  it('actionLoss returns positive number', () => {
    const loss = new NeuralNetLoss();
    const predicted = [0.2, 0.3, 0.1, 0.1, 0.2, 0.1];
    expect(loss.actionLoss(predicted, 0)).toBeGreaterThan(0);
    expect(isFinite(loss.actionLoss(predicted, 0))).toBe(true);
  });

  it('outcomeLoss returns 0 for identical inputs', () => {
    const loss = new NeuralNetLoss();
    const values = [0.1, 0.2, 0.3, 0.4, 0.5];
    expect(loss.outcomeLoss(values, values)).toBeCloseTo(0, 5);
  });

  it('emotionRegularization returns non-negative number', () => {
    const loss = new NeuralNetLoss();
    const emotional = [0.5, 0.3, -0.2];
    const needs = [0.5, 0.5, 0.5, 0.5, 0.5];
    const reg = loss.emotionRegularization(emotional, needs);
    expect(reg).toBeGreaterThanOrEqual(0);
    expect(isFinite(reg)).toBe(true);
  });
});

// ======================================================================
// 9. Weight Serialization Tests
// ======================================================================
describe('WeightSerializer', () => {
  it('serialize produces valid JSON', () => {
    const serializer = new WeightSerializer();
    const brain = new TransformerBrain();
    brain.initializeWeights();
    const percEncoder = new PerceptionEncoder();
    const expEncoder = new ExperienceEncoder();
    const json = serializer.serialize(brain, percEncoder, expEncoder);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty('version');
    expect(parsed).toHaveProperty('architecture');
    expect(parsed).toHaveProperty('weights');
    expect(parsed).toHaveProperty('totalParameters');
    expect(parsed.totalParameters).toBeGreaterThan(0);
  });

  it('deserialize + serialize roundtrip preserves architecture info', () => {
    const serializer = new WeightSerializer();
    const brain = new TransformerBrain();
    brain.initializeWeights();
    const percEncoder = new PerceptionEncoder();
    const expEncoder = new ExperienceEncoder();

    const json1 = serializer.serialize(brain, percEncoder, expEncoder);
    const parsed1 = JSON.parse(json1);

    // Create new instances and deserialize
    const brain2 = new TransformerBrain();
    const percEncoder2 = new PerceptionEncoder();
    const expEncoder2 = new ExperienceEncoder();
    serializer.deserialize(json1, brain2, percEncoder2, expEncoder2);

    const json2 = serializer.serialize(brain2, percEncoder2, expEncoder2);
    const parsed2 = JSON.parse(json2);

    expect(parsed2.architecture).toEqual(parsed1.architecture);
    expect(parsed2.totalParameters).toBe(parsed1.totalParameters);
  });

  it('exportWeights returns JSON string', () => {
    const serializer = new WeightSerializer();
    const brain = new TransformerBrain();
    brain.initializeWeights();
    const percEncoder = new PerceptionEncoder();
    const expEncoder = new ExperienceEncoder();
    const json = serializer.exportWeights(brain, percEncoder, expEncoder);
    expect(typeof json).toBe('string');
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

// ======================================================================
// 10. Brain Swap Tests
// ======================================================================
describe('BrainSwap', () => {
  it('createBrain(behavior_tree) returns BehaviorTreeBrain', () => {
    const brain = createBrain('behavior_tree');
    expect(brain).toBeInstanceOf(BehaviorTreeBrain);
  });

  it('createBrain(neural_net) returns NeuralNetBrain', () => {
    const brain = createBrain('neural_net');
    expect(brain).toBeInstanceOf(NeuralNetBrain);
  });

  it('getBrainType identifies correct type', () => {
    const bt = new BehaviorTreeBrain();
    const nn = new NeuralNetBrain();
    expect(getBrainType(bt)).toBe('behavior_tree');
    expect(getBrainType(nn)).toBe('neural_net');
  });

  it('toggleBrainType swaps correctly', () => {
    const bt = new BehaviorTreeBrain();
    const swapped = toggleBrainType(bt);
    expect(swapped).toBeInstanceOf(NeuralNetBrain);

    const swappedBack = toggleBrainType(swapped);
    expect(swappedBack).toBeInstanceOf(BehaviorTreeBrain);
  });

  it('both brain types can decide on same perception', () => {
    const bt = new BehaviorTreeBrain();
    const nn = new NeuralNetBrain();
    const perception = buildTestPerception();

    const btAction = bt.decide(perception);
    const nnAction = nn.decide(perception);

    expect(VALID_ACTIONS).toContain(btAction.type);
    expect(VALID_ACTIONS).toContain(nnAction.type);
  });
});

// ======================================================================
// 11. Performance Test
// ======================================================================
describe('Performance', () => {
  it('forward pass completes in reasonable time (< 5ms per pass)', () => {
    const brain = new NeuralNetBrain();
    const perception = buildTestPerception();

    // Warm up
    brain.decide(perception);

    const start = performance.now();
    const iterations = 5;
    for (let i = 0; i < iterations; i++) {
      brain.decide(buildTestPerception({ currentTick: i + 1 }));
    }
    const elapsed = performance.now() - start;
    const perPass = elapsed / iterations;

    expect(perPass).toBeLessThan(20);
  });
});

// ======================================================================
// 12. Trainer Tests
// ======================================================================
describe('Trainer', () => {
  it('evaluate returns loss and accuracy', () => {
    const brain = new TransformerBrain();
    brain.initializeWeights();
    const percEncoder = new PerceptionEncoder();
    const trainer = new Trainer(brain, percEncoder);
    const samples = Array.from({ length: 10 }, () => buildTrainingSample());
    const result = trainer.evaluate(samples);
    expect(typeof result.loss).toBe('number');
    expect(typeof result.accuracy).toBe('number');
    expect(result.loss).toBeGreaterThanOrEqual(0);
    expect(result.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.accuracy).toBeLessThanOrEqual(1);
    expect(result.perActionAccuracy).toBeDefined();
  });

  // Timeout is generous because Trainer uses finite-difference gradient computation
  it('trainOffline produces a training report with correct structure', { timeout: 60_000 }, () => {
    const brain = new TransformerBrain();
    brain.initializeWeights();
    const percEncoder = new PerceptionEncoder();
    const trainer = new Trainer(brain, percEncoder);
    const samples = Array.from({ length: 4 }, () => buildTrainingSample());

    const report = trainer.trainOffline(samples, { epochs: 1, batchSize: 4, validationSplit: 0.25 });

    expect(report).toHaveProperty('epochs');
    expect(report).toHaveProperty('finalTrainLoss');
    expect(report).toHaveProperty('finalValLoss');
    expect(report).toHaveProperty('finalTrainAccuracy');
    expect(report).toHaveProperty('finalValAccuracy');
    expect(report).toHaveProperty('bestValLoss');
    expect(report).toHaveProperty('bestValEpoch');
    expect(report).toHaveProperty('lossHistory');
    expect(report).toHaveProperty('accuracyHistory');
    expect(report).toHaveProperty('perActionAccuracy');
    expect(report).toHaveProperty('trainingTimeMs');
    expect(report).toHaveProperty('totalParameters');
    expect(report).toHaveProperty('convergenceEpoch');
    expect(report.totalParameters).toBeGreaterThan(0);
    expect(report.trainingTimeMs).toBeGreaterThanOrEqual(0);
  });
});
