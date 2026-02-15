interface Interaction {
  tick: number;
  type: string;
  data: Record<string, number>;
}

export class PlayerTracker {
  private interactions: Interaction[];

  constructor() {
    this.interactions = [];
  }

  trackCameraMove(tick: number, x: number, y: number, zoom: number): void {
    this.interactions.push({
      tick,
      type: 'camera_move',
      data: { x, y, zoom },
    });
  }

  trackNPCSelect(tick: number, npcId: string): void {
    this.interactions.push({
      tick,
      type: 'npc_select',
      data: { npcIdHash: this.hashString(npcId) },
    });
  }

  trackSpeedChange(tick: number, speed: number): void {
    this.interactions.push({
      tick,
      type: 'speed_change',
      data: { speed },
    });
  }

  getInteractions(): Interaction[] {
    return [...this.interactions];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return hash;
  }
}
