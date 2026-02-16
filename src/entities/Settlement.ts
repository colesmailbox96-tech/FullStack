import { distance } from '../utils/Math';
import type { WorldObject } from '../world/WorldObject';
import type { NPC } from './NPC';
import type { WorldConfig } from '../engine/Config';

export interface Settlement {
  id: string;
  name: string;
  centerX: number;
  centerY: number;
  radius: number;
  structureIds: string[];
  residentNpcIds: string[];
  foundedAt: number;
  founderIds: string[];
}

const NAME_PREFIXES = [
  'Oak', 'Stone', 'Fern', 'Willow', 'Cedar', 'Pine', 'Birch', 'Moss',
  'River', 'Lake', 'Dawn', 'Dusk', 'Sun', 'Moon', 'Star', 'Cloud',
];

const NAME_SUFFIXES = [
  'vale', 'hearth', 'hollow', 'brook', 'field', 'haven', 'ridge', 'stead',
  'wood', 'glen', 'crest', 'ford', 'dale', 'hold', 'wick', 'moor',
];

/**
 * Manages automatic settlement detection, resident assignment,
 * and settlement lifecycle.
 */
export class SettlementManager {
  private settlements: Map<string, Settlement>;
  private nextId: number;

  constructor() {
    this.settlements = new Map();
    this.nextId = 0;
  }

  /**
   * Detect settlements by clustering completed structures within
   * a configurable radius. Creates, updates, or dissolves settlements
   * as structures change.
   */
  detectSettlements(structures: WorldObject[], tick: number, config: WorldConfig): Settlement[] {
    const radius = config.settlementDetectionRadius;
    const minStructures = config.settlementMinStructures;
    const newlyFormed: Settlement[] = [];

    // Simple greedy clustering: for each unassigned structure, find all
    // structures within radius and form a cluster if >= minStructures.
    const assigned = new Set<string>();
    const clusters: WorldObject[][] = [];

    for (const s of structures) {
      if (assigned.has(s.id)) continue;
      const cluster = [s];
      assigned.add(s.id);

      for (const other of structures) {
        if (assigned.has(other.id)) continue;
        // Check if this structure is within radius of any structure in the cluster
        const inRange = cluster.some(c => distance(c.x, c.y, other.x, other.y) <= radius);
        if (inRange) {
          cluster.push(other);
          assigned.add(other.id);
        }
      }

      if (cluster.length >= minStructures) {
        clusters.push(cluster);
      }
    }

    // Match existing settlements to clusters or create new ones
    const matchedSettlements = new Set<string>();

    for (const cluster of clusters) {
      const structureIds = cluster.map(s => s.id);
      const centerX = cluster.reduce((sum, s) => sum + s.x, 0) / cluster.length;
      const centerY = cluster.reduce((sum, s) => sum + s.y, 0) / cluster.length;
      // Add buffer to radius so residents slightly outside the cluster are still included
      const clusterRadius = Math.max(
        radius,
        ...cluster.map(s => distance(centerX, centerY, s.x, s.y) + 5)
      );

      // Check if an existing settlement covers this cluster
      let found = false;
      for (const [id, settlement] of this.settlements) {
        if (matchedSettlements.has(id)) continue;
        // Match if most structures overlap (allow one structure difference for updates)
        const overlap = structureIds.filter(sid => settlement.structureIds.includes(sid));
        if (overlap.length >= minStructures - 1) {
          // Update existing settlement
          settlement.structureIds = structureIds;
          settlement.centerX = centerX;
          settlement.centerY = centerY;
          settlement.radius = clusterRadius;
          matchedSettlements.add(id);
          found = true;
          break;
        }
      }

      if (!found) {
        // Create new settlement
        const id = `settlement_${this.nextId++}`;
        const founderIds = [...new Set(
          cluster.flatMap(s => s.structureData?.contributors ?? [])
        )].slice(0, 5);

        const settlement: Settlement = {
          id,
          name: this.generateSettlementName(this.nextId),
          centerX,
          centerY,
          radius: clusterRadius,
          structureIds,
          residentNpcIds: [],
          foundedAt: tick,
          founderIds,
        };
        this.settlements.set(id, settlement);
        matchedSettlements.add(id);
        newlyFormed.push(settlement);
      }
    }

    // Remove settlements whose structure count dropped below minimum
    for (const [id, settlement] of this.settlements) {
      if (!matchedSettlements.has(id)) {
        // Check if enough structures still exist
        const existingStructures = settlement.structureIds.filter(
          sid => structures.some(s => s.id === sid)
        );
        if (existingStructures.length < minStructures) {
          this.settlements.delete(id);
        }
      }
    }

    return newlyFormed;
  }

  /** Returns the settlement at a position, if any. */
  getSettlement(x: number, y: number): Settlement | null {
    for (const settlement of this.settlements.values()) {
      if (distance(x, y, settlement.centerX, settlement.centerY) <= settlement.radius) {
        return settlement;
      }
    }
    return null;
  }

  /** Returns the settlement an NPC lives in, based on their territory home. */
  getSettlementForNPC(npcId: string): Settlement | null {
    for (const settlement of this.settlements.values()) {
      if (settlement.residentNpcIds.includes(npcId)) {
        return settlement;
      }
    }
    return null;
  }

  /**
   * Assign NPCs whose territory home is within a settlement radius
   * as residents of that settlement.
   */
  assignResidents(npcs: NPC[]): void {
    for (const settlement of this.settlements.values()) {
      settlement.residentNpcIds = [];
      for (const npc of npcs) {
        if (!npc.alive) continue;
        const home = npc.territory.getHome();
        if (home && distance(home.x, home.y, settlement.centerX, settlement.centerY) <= settlement.radius) {
          settlement.residentNpcIds.push(npc.id);
        }
      }
    }
  }

  /** Get all settlements. */
  getSettlements(): Settlement[] {
    return [...this.settlements.values()];
  }

  /** Get total settlement count. */
  getCount(): number {
    return this.settlements.size;
  }

  /** Generate a procedural settlement name from seed. */
  generateSettlementName(seed: number): string {
    const prefix = NAME_PREFIXES[seed % NAME_PREFIXES.length];
    const suffix = NAME_SUFFIXES[(seed * 7 + 3) % NAME_SUFFIXES.length];
    return prefix + suffix;
  }
}
