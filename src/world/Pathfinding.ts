import { TileMap } from './TileMap';

export interface PathNode {
  x: number;
  y: number;
}

interface AStarNode {
  x: number;
  y: number;
  g: number;
  f: number;
  parentKey: string | null;
}

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function nodeKey(x: number, y: number): string {
  return `${x},${y}`;
}

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, -1], [1, 0], [0, 1], [-1, 0],
];

export function findPath(
  tileMap: TileMap,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  maxLength: number = 50,
): PathNode[] | null {
  if (!tileMap.isInBounds(startX, startY) || !tileMap.isInBounds(endX, endY)) return null;
  if (!tileMap.isWalkable(endX, endY)) return null;

  const startKey = nodeKey(startX, startY);
  const endKey = nodeKey(endX, endY);

  if (startKey === endKey) return [{ x: startX, y: startY }];

  const open: Map<string, AStarNode> = new Map();
  const closed: Set<string> = new Set();

  const startNode: AStarNode = {
    x: startX,
    y: startY,
    g: 0,
    f: heuristic(startX, startY, endX, endY),
    parentKey: null,
  };
  open.set(startKey, startNode);

  const allNodes: Map<string, AStarNode> = new Map();
  allNodes.set(startKey, startNode);

  while (open.size > 0) {
    // Find node with lowest f
    let bestKey: string | null = null;
    let bestF = Infinity;
    for (const [key, node] of open) {
      if (node.f < bestF) {
        bestF = node.f;
        bestKey = key;
      }
    }

    if (bestKey === null) return null;

    const current = open.get(bestKey)!;
    open.delete(bestKey);
    closed.add(bestKey);

    if (bestKey === endKey) {
      // Reconstruct path
      const path: PathNode[] = [];
      let traceKey: string | null = bestKey;
      while (traceKey !== null) {
        const node: AStarNode = allNodes.get(traceKey)!;
        path.push({ x: node.x, y: node.y });
        traceKey = node.parentKey;
      }
      path.reverse();
      return path;
    }

    // Skip if path is already too long
    if (current.g > maxLength) continue;

    for (const [dx, dy] of DIRS) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const nKey = nodeKey(nx, ny);

      if (closed.has(nKey)) continue;
      if (!tileMap.isWalkable(nx, ny)) continue;

      const moveCost = tileMap.getMoveCost(nx, ny);
      const tentativeG = current.g + moveCost;

      const existing = open.get(nKey);
      if (existing !== undefined && tentativeG >= existing.g) continue;

      const neighbor: AStarNode = {
        x: nx,
        y: ny,
        g: tentativeG,
        f: tentativeG + heuristic(nx, ny, endX, endY),
        parentKey: bestKey,
      };
      open.set(nKey, neighbor);
      allNodes.set(nKey, neighbor);
    }
  }

  return null;
}
