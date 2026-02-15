/**
 * Lineage system tracks parent-child relationships when NPCs reproduce.
 *
 * Each NPC has a lineage record that stores its parents, children,
 * generation number, and birth tick. Original NPCs (no parents) are
 * generation 0; each subsequent generation increments from the max
 * parent generation.
 */

export interface LineageRecord {
  npcId: string;
  parentIds: [string, string] | null;
  childIds: string[];
  generation: number;
  birthTick: number;
}

export class LineageTracker {
  private records: Map<string, LineageRecord>;

  constructor() {
    this.records = new Map();
  }

  /**
   * Register the birth of a child NPC from two parents.
   * Sets the child's generation to max(parent1Gen, parent2Gen) + 1
   * and adds the child to both parents' childIds arrays.
   */
  registerBirth(childId: string, parentId1: string, parentId2: string, tick: number): void {
    const parent1Gen = this.getGeneration(parentId1);
    const parent2Gen = this.getGeneration(parentId2);
    const generation = Math.max(parent1Gen, parent2Gen) + 1;

    this.records.set(childId, {
      npcId: childId,
      parentIds: [parentId1, parentId2],
      childIds: [],
      generation,
      birthTick: tick,
    });

    // Add child to both parents' records
    const parent1 = this.records.get(parentId1);
    if (parent1) {
      parent1.childIds.push(childId);
    }
    const parent2 = this.records.get(parentId2);
    if (parent2) {
      parent2.childIds.push(childId);
    }
  }

  /**
   * Register an original NPC with no parents (generation 0).
   */
  registerOriginal(npcId: string, tick: number): void {
    this.records.set(npcId, {
      npcId,
      parentIds: null,
      childIds: [],
      generation: 0,
      birthTick: tick,
    });
  }

  /**
   * Get the full lineage record for an NPC.
   */
  getRecord(npcId: string): LineageRecord | null {
    return this.records.get(npcId) ?? null;
  }

  /**
   * Get the parent IDs for an NPC, or null if it has no parents.
   */
  getParents(npcId: string): [string, string] | null {
    const record = this.records.get(npcId);
    return record?.parentIds ?? null;
  }

  /**
   * Get the child IDs for an NPC.
   */
  getChildren(npcId: string): string[] {
    const record = this.records.get(npcId);
    return record?.childIds ?? [];
  }

  /**
   * Get the generation number for an NPC. Returns 0 if not found.
   */
  getGeneration(npcId: string): number {
    const record = this.records.get(npcId);
    return record?.generation ?? 0;
  }

  /**
   * Get IDs of NPCs that share the same parents (excluding self).
   */
  getSiblings(npcId: string): string[] {
    const record = this.records.get(npcId);
    if (!record?.parentIds) return [];

    const [p1, p2] = record.parentIds;
    const siblings: string[] = [];

    for (const [id, rec] of this.records) {
      if (id === npcId) continue;
      if (
        rec.parentIds &&
        rec.parentIds[0] === p1 &&
        rec.parentIds[1] === p2
      ) {
        siblings.push(id);
      }
    }

    return siblings;
  }

  /**
   * Get the highest generation number across all records.
   */
  getMaxGeneration(): number {
    let max = 0;
    for (const record of this.records.values()) {
      if (record.generation > max) {
        max = record.generation;
      }
    }
    return max;
  }

  /**
   * Get the family size for an NPC (parents + children + siblings).
   */
  getFamilySize(npcId: string): number {
    const record = this.records.get(npcId);
    if (!record) return 0;

    const parentCount = record.parentIds ? 2 : 0;
    const childCount = record.childIds.length;
    const siblingCount = this.getSiblings(npcId).length;

    return parentCount + childCount + siblingCount;
  }

  /**
   * Get the total number of lineage records.
   */
  getRecordCount(): number {
    return this.records.size;
  }
}
