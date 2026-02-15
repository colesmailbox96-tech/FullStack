export type DangerLevel = 'safe' | 'mild' | 'moderate' | 'dangerous' | 'deadly';

export interface DangerZoneInfo {
  level: DangerLevel;
  safetyPenalty: number;
  description: string;
}

const DANGER_LEVELS: Record<DangerLevel, DangerZoneInfo> = {
  safe: { level: 'safe', safetyPenalty: 0, description: 'Safe area' },
  mild: { level: 'mild', safetyPenalty: 0.005, description: 'Slightly risky area' },
  moderate: { level: 'moderate', safetyPenalty: 0.015, description: 'Moderately dangerous' },
  dangerous: { level: 'dangerous', safetyPenalty: 0.03, description: 'Dangerous area' },
  deadly: { level: 'deadly', safetyPenalty: 0.05, description: 'Extremely dangerous' },
};

const EDGE_THRESHOLD = 5;
const CENTER_THRESHOLD = 10;

/**
 * Determines the danger level at a given position based on proximity to
 * map edges, corners, cave walls, and the map center.
 * Priority order: corners > edges > cave > default (safe).
 */
export function getDangerLevel(
  x: number,
  y: number,
  mapWidth: number,
  mapHeight: number,
  tileType: string,
): DangerZoneInfo {
  const nearLeft = x < EDGE_THRESHOLD;
  const nearRight = x >= mapWidth - EDGE_THRESHOLD;
  const nearTop = y < EDGE_THRESHOLD;
  const nearBottom = y >= mapHeight - EDGE_THRESHOLD;

  const nearHorizontalEdge = nearLeft || nearRight;
  const nearVerticalEdge = nearTop || nearBottom;

  // Corners: within threshold of two edges
  if (nearHorizontalEdge && nearVerticalEdge) {
    return DANGER_LEVELS.dangerous;
  }

  // Edges: within threshold of any single edge
  if (nearHorizontalEdge || nearVerticalEdge) {
    return DANGER_LEVELS.moderate;
  }

  // Cave wall tiles
  if (tileType === 'cave_wall') {
    return DANGER_LEVELS.mild;
  }

  // Very center of the map
  const centerX = mapWidth / 2;
  const centerY = mapHeight / 2;
  if (Math.abs(x - centerX) <= CENTER_THRESHOLD && Math.abs(y - centerY) <= CENTER_THRESHOLD) {
    return DANGER_LEVELS.safe;
  }

  return DANGER_LEVELS.safe;
}

/** Returns the safety penalty value for the danger level at the given position. */
export function getDangerPenalty(
  x: number,
  y: number,
  mapWidth: number,
  mapHeight: number,
  tileType: string,
): number {
  return getDangerLevel(x, y, mapWidth, mapHeight, tileType).safetyPenalty;
}

/** Returns true if the position is at least 'moderate' danger. */
export function isDangerous(
  x: number,
  y: number,
  mapWidth: number,
  mapHeight: number,
  tileType: string,
): boolean {
  const level = getDangerLevel(x, y, mapWidth, mapHeight, tileType).level;
  return level === 'moderate' || level === 'dangerous' || level === 'deadly';
}
