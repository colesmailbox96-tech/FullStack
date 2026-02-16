import { TransformerBrain } from './TransformerBrain';
import type { ActionType } from '../Action';

const ACTION_NAMES: ActionType[] = [
  'FORAGE', 'REST', 'SEEK_SHELTER', 'EXPLORE', 'SOCIALIZE', 'IDLE', 'GATHER', 'CRAFT', 'BUILD', 'FISH'
];

export class PersonalityTracker {
  private actionHistory: number[];
  private maxHistory: number;

  constructor(maxHistory = 1000) {
    this.actionHistory = [];
    this.maxHistory = maxHistory;
  }

  recordAction(actionIndex: number): void {
    this.actionHistory.push(actionIndex);
    if (this.actionHistory.length > this.maxHistory) {
      this.actionHistory.shift();
    }
  }

  divergenceFromBase(npcBrain: TransformerBrain, baseBrain: TransformerBrain): number {
    const npcLayers = npcBrain.getAllLinearLayers();
    const baseLayers = baseBrain.getAllLinearLayers();
    let totalDiff = 0;
    let totalParams = 0;

    for (let l = 0; l < npcLayers.length; l++) {
      const npcW = npcLayers[l].weight.data;
      const baseW = baseLayers[l].weight.data;
      for (let i = 0; i < npcW.length; i++) {
        totalDiff += Math.abs(npcW[i] - baseW[i]);
        totalParams++;
      }
      const npcB = npcLayers[l].bias.data;
      const baseB = baseLayers[l].bias.data;
      for (let i = 0; i < npcB.length; i++) {
        totalDiff += Math.abs(npcB[i] - baseB[i]);
        totalParams++;
      }
    }

    return totalParams > 0 ? totalDiff / totalParams : 0;
  }

  interNPCDivergence(brainA: TransformerBrain, brainB: TransformerBrain): number {
    return this.divergenceFromBase(brainA, brainB);
  }

  classifyPersonality(): string {
    if (this.actionHistory.length === 0) return 'balanced';

    const dist = this.getActionDistribution();

    if ((dist['FORAGE'] ?? 0) > 0.4) return 'survivalist';
    if ((dist['EXPLORE'] ?? 0) > 0.3) return 'explorer';
    if ((dist['SEEK_SHELTER'] ?? 0) > 0.25) return 'cautious';
    if ((dist['SOCIALIZE'] ?? 0) > 0.25) return 'social';

    return 'balanced';
  }

  getActionDistribution(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const name of ACTION_NAMES) {
      counts[name] = 0;
    }

    for (const idx of this.actionHistory) {
      const name = ACTION_NAMES[idx] ?? 'IDLE';
      counts[name]++;
    }

    const total = this.actionHistory.length;
    const dist: Record<string, number> = {};
    for (const name of ACTION_NAMES) {
      dist[name] = counts[name] / total;
    }
    return dist;
  }
}
