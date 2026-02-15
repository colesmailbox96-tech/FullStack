/**
 * Relationship system tracks social bonds between NPC pairs.
 *
 * Bonds form through repeated socialization and decay over time.
 * Each bond has an affinity value (0-1) where:
 * - 0.0 = strangers
 * - 0.3 = acquaintances
 * - 0.6 = friends
 * - 0.9 = close friends
 */

export interface Relationship {
  npcId: string;
  affinity: number;
  lastInteractionTick: number;
}

export type RelationshipLabel = 'stranger' | 'acquaintance' | 'friend' | 'close friend';

export function getRelationshipLabel(affinity: number): RelationshipLabel {
  if (affinity >= 0.7) return 'close friend';
  if (affinity >= 0.4) return 'friend';
  if (affinity >= 0.15) return 'acquaintance';
  return 'stranger';
}

export class RelationshipSystem {
  private relationships: Map<string, Relationship>;
  private maxRelationships: number;

  constructor(maxRelationships: number = 10) {
    this.relationships = new Map();
    this.maxRelationships = maxRelationships;
  }

  /**
   * Strengthen the bond with another NPC through socialization.
   */
  interact(npcId: string, currentTick: number, amount: number = 0.05): void {
    const existing = this.relationships.get(npcId);
    if (existing) {
      existing.affinity = Math.min(1, existing.affinity + amount);
      existing.lastInteractionTick = currentTick;
    } else {
      // If at capacity, remove the weakest bond
      if (this.relationships.size >= this.maxRelationships) {
        let weakestId: string | null = null;
        let weakestAffinity = Infinity;
        for (const [id, rel] of this.relationships) {
          if (rel.affinity < weakestAffinity) {
            weakestAffinity = rel.affinity;
            weakestId = id;
          }
        }
        if (weakestId !== null) {
          this.relationships.delete(weakestId);
        }
      }
      this.relationships.set(npcId, {
        npcId,
        affinity: amount,
        lastInteractionTick: currentTick,
      });
    }
  }

  /**
   * Decay all relationships over time. Called each tick.
   */
  update(decayRate: number): void {
    for (const [id, rel] of this.relationships) {
      rel.affinity = Math.max(0, rel.affinity - decayRate);
      if (rel.affinity <= 0) {
        this.relationships.delete(id);
      }
    }
  }

  /**
   * Get the relationship with a specific NPC.
   */
  getRelationship(npcId: string): Relationship | null {
    return this.relationships.get(npcId) ?? null;
  }

  /**
   * Get all relationships sorted by affinity (highest first).
   */
  getRelationships(): Relationship[] {
    return [...this.relationships.values()].sort((a, b) => b.affinity - a.affinity);
  }

  /**
   * Get the NPC ID of the closest friend (highest affinity).
   */
  getClosestFriend(): string | null {
    let best: Relationship | null = null;
    for (const rel of this.relationships.values()) {
      if (!best || rel.affinity > best.affinity) {
        best = rel;
      }
    }
    return best ? best.npcId : null;
  }

  /**
   * Get friends (affinity >= 0.4).
   */
  getFriends(): Relationship[] {
    return this.getRelationships().filter(r => r.affinity >= 0.4);
  }

  /**
   * Get the number of tracked relationships.
   */
  getCount(): number {
    return this.relationships.size;
  }
}
