import type { IBrain } from '../IBrain';
import type { Perception, ObjectInfo, TileInfo, NPCInfo } from '../Perception';
import type { Action, ActionType } from '../Action';
import { PerceptionEncoder } from './PerceptionEncoder';
import { ExperienceEncoder, NUM_ACTIONS } from './ExperienceEncoder';
import type { Experience } from './ExperienceEncoder';
import { EpisodicMemoryBuffer } from './EpisodicMemory';
import { TransformerBrain } from './TransformerBrain';
import { ReplayBuffer } from './ReplayBuffer';
import { OnlineTrainer } from './OnlineTrainer';
import { PersonalityTracker } from './PersonalityTracker';

const ACTION_TYPES: ActionType[] = ['FORAGE', 'REST', 'SEEK_SHELTER', 'EXPLORE', 'SOCIALIZE', 'IDLE'];

const WEATHER_CODES: Record<string, number> = {
  clear: 0, cloudy: 0.2, rain: 0.4, storm: 0.6, snow: 0.8, fog: 1.0,
};

const SEASON_CODES: Record<string, number> = {
  spring: 0, summer: 0.25, autumn: 0.5, winter: 0.75,
};

const MEMORY_TYPE_CODES: Record<string, number> = {
  found_food: 0.2, danger: 0.4, met_npc: 0.6, found_shelter: 0.8, discovered_area: 1.0,
};

export class NeuralNetBrain implements IBrain {
  private perceptionEncoder: PerceptionEncoder;
  private experienceEncoder: ExperienceEncoder;
  private transformer: TransformerBrain;
  private memory: EpisodicMemoryBuffer;
  private replayBuffer: ReplayBuffer;
  private onlineTrainer: OnlineTrainer;
  private personalityTracker: PersonalityTracker;

  private lastPerception: Perception | null = null;
  private lastAction: Action | null = null;
  private lastActionIndex: number = 0;
  private emotionalState: number[] = [0, 0, 0];
  private ticksSinceLastUpdate: number = 0;
  private actionHistory: number[] = [];
  private lastAttentionWeights: number[][] = [];
  private cachedBaseBrain: TransformerBrain | null = null;

  constructor() {
    this.perceptionEncoder = new PerceptionEncoder();
    this.experienceEncoder = new ExperienceEncoder();
    this.transformer = new TransformerBrain();
    this.transformer.initializeWeights();
    this.memory = new EpisodicMemoryBuffer();
    this.replayBuffer = new ReplayBuffer();
    this.onlineTrainer = new OnlineTrainer();
    this.personalityTracker = new PersonalityTracker();
  }

  decide(perception: Perception): Action {
    // Encode perception to 30-float vector then to 64-dim embedding
    const percVector = this.encodePerception(perception);
    const percEmbedding = this.perceptionEncoder.encode(percVector);

    // Get memory sequence and mask
    const memorySeq = this.memory.getMemorySequence();
    const memoryMask = this.memory.getAttentionMask();

    // Forward pass through transformer
    const result = this.transformer.forward(percEmbedding, memorySeq, memoryMask);
    const { actionProbabilities, emotionalState, memoryAttentionWeights } = result;

    // Update emotional state
    this.emotionalState = emotionalState;
    this.lastAttentionWeights = memoryAttentionWeights;

    // Sample action
    const actionIndex = this.sampleAction(actionProbabilities);
    const action = this.indexToAction(actionIndex, perception);

    // Store experience from previous tick
    if (this.lastPerception && this.lastAction) {
      const experience = this.buildExperience(this.lastPerception, this.lastAction, perception);
      this.memory.store(experience, this.experienceEncoder);
      this.replayBuffer.add(experience);
    }

    // Online learning (amortized)
    this.ticksSinceLastUpdate++;
    if (this.ticksSinceLastUpdate >= this.onlineTrainer.updateInterval) {
      this.onlineTrainer.update(this.transformer, this.perceptionEncoder, this.replayBuffer);
      this.ticksSinceLastUpdate = 0;
    }

    // Decay memories
    this.memory.decayMemories();

    // Track for personality
    this.personalityTracker.recordAction(actionIndex);

    // Cache for next tick
    this.lastPerception = perception;
    this.lastAction = action;
    this.lastActionIndex = actionIndex;

    return action;
  }

  private encodePerception(p: Perception): number[] {
    const vec = new Array<number>(30).fill(0);

    // [0-4] Internal needs
    vec[0] = p.needs.hunger;
    vec[1] = p.needs.energy;
    vec[2] = p.needs.social;
    vec[3] = p.needs.curiosity;
    vec[4] = p.needs.safety;

    // [5-7] Environment
    vec[5] = p.timeOfDay;
    vec[6] = WEATHER_CODES[p.weather] ?? 0;
    vec[7] = SEASON_CODES[p.season] ?? 0;

    // [8-11] Terrain summary (fraction of tiles in perception radius)
    const totalTiles = Math.max(p.nearbyTiles.length, 1);
    let grass = 0, water = 0, stone = 0, dirt = 0;
    for (const t of p.nearbyTiles) {
      const type = t.type as string;
      if (type === 'grass' || type === 'flower_grass' || type === 'dense_grass') grass++;
      else if (type === 'water' || type === 'deep_water') water++;
      else if (type === 'stone' || type === 'cave_wall' || type === 'cave_floor') stone++;
      else if (type === 'dirt' || type === 'sand') dirt++;
    }
    vec[8] = grass / totalTiles;
    vec[9] = water / totalTiles;
    vec[10] = stone / totalTiles;
    vec[11] = dirt / totalTiles;

    // [12-13] Food context
    const foodObjects = p.nearbyObjects.filter(o =>
      (o.type as string) === 'berry_bush' && o.state !== 'depleted'
    );
    vec[12] = Math.min(foodObjects.length / 10, 1.0);
    if (foodObjects.length > 0) {
      const avgDist = foodObjects.reduce((sum, o) => {
        const dx = o.x - p.cameraX;
        const dy = o.y - p.cameraY;
        return sum + Math.sqrt(dx * dx + dy * dy);
      }, 0) / foodObjects.length;
      vec[13] = Math.min(avgDist / 8, 1.0);
    }

    // [14-15] Social context
    vec[14] = Math.min(p.nearbyNPCs.length / 10, 1.0);
    if (p.nearbyNPCs.length > 0) {
      const avgDist = p.nearbyNPCs.reduce((sum, n) => {
        const dx = n.x - p.cameraX;
        const dy = n.y - p.cameraY;
        return sum + Math.sqrt(dx * dx + dy * dy);
      }, 0) / p.nearbyNPCs.length;
      vec[15] = Math.min(avgDist / 8, 1.0);
    }

    // [16-17] Object context
    vec[16] = Math.min(p.nearbyObjects.length / 10, 1.0);
    const hasShelter = p.nearbyObjects.some(o =>
      (o.type as string) === 'campfire' || (o.type as string) === 'cave_floor'
    );
    vec[17] = hasShelter ? 1.0 : 0.0;

    // [18-26] Top 3 memories
    for (let i = 0; i < 3 && i < p.relevantMemories.length; i++) {
      const base = 18 + i * 3;
      const mem = p.relevantMemories[i];
      vec[base] = MEMORY_TYPE_CODES[mem.type] ?? 0;
      const ticksAgo = Math.max(0, p.currentTick - mem.tick);
      vec[base + 1] = Math.max(0, 1.0 - ticksAgo / 5000);
      vec[base + 2] = mem.significance;
    }

    // [27-29] Player awareness
    vec[27] = 0;
    vec[28] = Math.min(p.cameraZoom / 5, 1.0);
    vec[29] = 0;

    return vec;
  }

  private sampleAction(probabilities: number[], temperature: number = 0.8): number {
    const logits = probabilities.map(p => Math.log(p + 1e-8) / temperature);
    const maxLogit = Math.max(...logits);
    const expLogits = logits.map(l => Math.exp(l - maxLogit));
    const sumExp = expLogits.reduce((a, b) => a + b, 0);
    const scaled = expLogits.map(e => e / sumExp);

    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < scaled.length; i++) {
      cumulative += scaled[i];
      if (r < cumulative) return i;
    }
    return scaled.length - 1;
  }

  private indexToAction(index: number, perception: Perception): Action {
    const type = ACTION_TYPES[index] || 'IDLE';

    switch (type) {
      case 'FORAGE': {
        const food = perception.nearbyObjects
          .filter(o => (o.type as string) === 'berry_bush' && o.state !== 'depleted')
          .sort((a, b) => {
            const da = (a.x - perception.cameraX) ** 2 + (a.y - perception.cameraY) ** 2;
            const db = (b.x - perception.cameraX) ** 2 + (b.y - perception.cameraY) ** 2;
            return da - db;
          })[0];
        if (food) return { type, targetX: food.x, targetY: food.y };
        const foodMem = perception.relevantMemories.find(m => m.type === 'found_food');
        if (foodMem) return { type, targetX: foodMem.x, targetY: foodMem.y };
        return { type: 'EXPLORE', targetX: -1, targetY: -1 };
      }
      case 'SEEK_SHELTER': {
        const shelter = perception.nearbyObjects.find(o =>
          (o.type as string) === 'campfire'
        );
        if (shelter) return { type, targetX: shelter.x, targetY: shelter.y };
        const shelterMem = perception.relevantMemories.find(m => m.type === 'found_shelter');
        if (shelterMem) return { type, targetX: shelterMem.x, targetY: shelterMem.y };
        const stoneT = perception.nearbyTiles
          .filter(t => (t.type as string) === 'stone' || (t.type as string) === 'cave_floor')
          .sort((a, b) => {
            const da = (a.x - perception.cameraX) ** 2 + (a.y - perception.cameraY) ** 2;
            const db = (b.x - perception.cameraX) ** 2 + (b.y - perception.cameraY) ** 2;
            return da - db;
          })[0];
        if (stoneT) return { type, targetX: stoneT.x, targetY: stoneT.y };
        return { type, targetX: -1, targetY: -1 };
      }
      case 'SOCIALIZE': {
        const npc = perception.nearbyNPCs
          .sort((a, b) => {
            const da = (a.x - perception.cameraX) ** 2 + (a.y - perception.cameraY) ** 2;
            const db = (b.x - perception.cameraX) ** 2 + (b.y - perception.cameraY) ** 2;
            return da - db;
          })[0];
        if (npc) return { type, targetX: npc.x, targetY: npc.y, targetNpcId: npc.id };
        return { type: 'EXPLORE', targetX: -1, targetY: -1 };
      }
      case 'REST':
        return { type, targetX: -1, targetY: -1 };
      case 'EXPLORE':
        return { type, targetX: -1, targetY: -1 };
      default:
        return { type: 'IDLE', targetX: -1, targetY: -1 };
    }
  }

  private buildExperience(prev: Perception, prevAction: Action, current: Perception): Experience {
    const percVector = this.encodePerception(prev);
    const percEmbedding = this.perceptionEncoder.encode(percVector);

    const needsDelta = [
      current.needs.hunger - prev.needs.hunger,
      current.needs.energy - prev.needs.energy,
      current.needs.social - prev.needs.social,
      current.needs.curiosity - prev.needs.curiosity,
      current.needs.safety - prev.needs.safety,
    ];

    const actionIndex = ACTION_TYPES.indexOf(prevAction.type as ActionType);

    let wasSuccessful = false;
    if (prevAction.type === 'FORAGE' && needsDelta[0] > 0) wasSuccessful = true;
    if (prevAction.type === 'REST' && needsDelta[1] > 0) wasSuccessful = true;
    if (prevAction.type === 'SEEK_SHELTER' && needsDelta[4] > 0) wasSuccessful = true;
    if (prevAction.type === 'SOCIALIZE' && needsDelta[2] > 0) wasSuccessful = true;
    if (prevAction.type === 'EXPLORE' && needsDelta[3] > 0) wasSuccessful = true;

    const novelty = Math.min(1, needsDelta.map(Math.abs).reduce((a, b) => a + b, 0));

    return {
      perceptionEmbedding: percEmbedding,
      actionTaken: Math.max(0, actionIndex),
      needsDelta,
      tick: current.currentTick,
      wasSuccessful,
      novelty,
    };
  }

  getEmotionalState(): { valence: number; arousal: number; dominance: number } {
    return {
      valence: this.emotionalState[0],
      arousal: this.emotionalState[1],
      dominance: this.emotionalState[2],
    };
  }

  getMemoryAttentionWeights(): number[][] {
    return this.lastAttentionWeights;
  }

  getPersonalityType(): string {
    return this.personalityTracker.classifyPersonality();
  }

  getDivergenceFromBase(): number {
    if (!this.cachedBaseBrain) {
      this.cachedBaseBrain = new TransformerBrain();
      this.cachedBaseBrain.initializeWeights();
    }
    return this.personalityTracker.divergenceFromBase(this.transformer, this.cachedBaseBrain);
  }

  getTransformer(): TransformerBrain {
    return this.transformer;
  }

  getPerceptionEncoder(): PerceptionEncoder {
    return this.perceptionEncoder;
  }

  getExperienceEncoder(): ExperienceEncoder {
    return this.experienceEncoder;
  }

  getReplayBuffer(): ReplayBuffer {
    return this.replayBuffer;
  }

  getMemory(): EpisodicMemoryBuffer {
    return this.memory;
  }
}
