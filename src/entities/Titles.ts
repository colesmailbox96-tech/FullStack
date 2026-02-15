export type TitleId =
  | 'first_builder'
  | 'storm_survivor'
  | 'elder_explorer'
  | 'master_forager'
  | 'social_leader'
  | 'seasoned_crafter'
  | 'pioneer'
  | 'veteran'
  | 'resource_hoarder'
  | 'wanderer';

export interface Title {
  id: TitleId;
  name: string;
  description: string;
  icon: string;
}

export const TITLE_DEFINITIONS: Record<TitleId, Title> = {
  first_builder: { id: 'first_builder', name: 'First Builder', description: 'Crafted the first shelter', icon: '🔨' },
  storm_survivor: { id: 'storm_survivor', name: 'Storm Survivor', description: 'Survived a dangerous storm', icon: '⚡' },
  elder_explorer: { id: 'elder_explorer', name: 'Elder Explorer', description: 'Explored over 200 tiles', icon: '🧭' },
  master_forager: { id: 'master_forager', name: 'Master Forager', description: 'Reached master foraging skill', icon: '🌿' },
  social_leader: { id: 'social_leader', name: 'Social Leader', description: 'Formed 5 or more friendships', icon: '👑' },
  seasoned_crafter: { id: 'seasoned_crafter', name: 'Seasoned Crafter', description: 'Crafted 3 or more items', icon: '⚒️' },
  pioneer: { id: 'pioneer', name: 'Pioneer', description: 'Among the first 5 NPCs spawned', icon: '🏴' },
  veteran: { id: 'veteran', name: 'Veteran', description: 'Survived over 5000 ticks', icon: '🎖️' },
  resource_hoarder: { id: 'resource_hoarder', name: 'Resource Hoarder', description: 'Held 8+ total resources', icon: '💰' },
  wanderer: { id: 'wanderer', name: 'Wanderer', description: 'Traveled to all four map quadrants', icon: '🗺️' },
};

export class TitleTracker {
  private earned: Set<TitleId> = new Set();
  private order: TitleId[] = [];

  earnTitle(id: TitleId): boolean {
    if (this.earned.has(id)) return false;
    this.earned.add(id);
    this.order.push(id);
    return true;
  }

  hasTitle(id: TitleId): boolean {
    return this.earned.has(id);
  }

  getEarnedTitles(): Title[] {
    return this.order.map((id) => TITLE_DEFINITIONS[id]);
  }

  getEarnedCount(): number {
    return this.earned.size;
  }

  getDisplayTitle(): Title | null {
    if (this.order.length === 0) return null;
    return TITLE_DEFINITIONS[this.order[this.order.length - 1]];
  }
}

export interface TitleEligibilityParams {
  age: number;
  tilesVisited: number;
  craftCount: number;
  friendshipCount: number;
  foragingSkill: number;
  totalResources: number;
  isOriginal: boolean;
  survivedStorm: boolean;
  mapWidth: number;
  visitedPositions: Set<string>;
}

function hasAllQuadrants(visitedPositions: Set<string>, mapWidth: number): boolean {
  const half = mapWidth / 2;
  let q1 = false, q2 = false, q3 = false, q4 = false;
  for (const pos of visitedPositions) {
    const [xStr, yStr] = pos.split(',');
    const x = Number(xStr);
    const y = Number(yStr);
    if (x < half && y < half) q1 = true;
    else if (x >= half && y < half) q2 = true;
    else if (x < half && y >= half) q3 = true;
    else if (x >= half && y >= half) q4 = true;
    if (q1 && q2 && q3 && q4) return true;
  }
  return false;
}

export function checkTitleEligibility(params: TitleEligibilityParams): TitleId[] {
  const eligible: TitleId[] = [];
  if (params.craftCount >= 1) eligible.push('first_builder');
  if (params.survivedStorm) eligible.push('storm_survivor');
  if (params.tilesVisited >= 200) eligible.push('elder_explorer');
  if (params.foragingSkill >= 0.8) eligible.push('master_forager');
  if (params.friendshipCount >= 5) eligible.push('social_leader');
  if (params.craftCount >= 3) eligible.push('seasoned_crafter');
  if (params.isOriginal) eligible.push('pioneer');
  if (params.age >= 5000) eligible.push('veteran');
  if (params.totalResources >= 8) eligible.push('resource_hoarder');
  if (hasAllQuadrants(params.visitedPositions, params.mapWidth)) eligible.push('wanderer');
  return eligible;
}
