export interface WorldEvent {
  tick: number;
  type: 'npc_born' | 'npc_died' | 'weather_change' | 'season_change' | 'npc_found_food' | 'npc_socialized';
  description: string;
  x?: number;
  y?: number;
  npcId?: string;
}

export class EventLog {
  private events: WorldEvent[];
  private maxEvents: number;

  constructor(maxEvents: number = 1000) {
    this.events = [];
    this.maxEvents = maxEvents;
  }

  addEvent(event: WorldEvent): void {
    if (this.events.length >= this.maxEvents) {
      this.events.shift();
    }
    this.events.push(event);
  }

  getRecentEvents(count: number): WorldEvent[] {
    return this.events.slice(-count);
  }

  getEvents(): WorldEvent[] {
    return [...this.events];
  }
}
