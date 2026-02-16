import { TileType } from '../world/TileMap';
import { ObjectType } from '../world/WorldObject';
import type { ActionType } from './Action';
import type { Needs } from '../entities/Needs';
import type { Memory } from '../entities/Memory';
import type { Personality } from '../entities/Personality';
import type { Inventory } from '../entities/Inventory';
import type { WeatherState } from '../world/Weather';
import type { NPC } from '../entities/NPC';
import type { TileMap } from '../world/TileMap';
import type { WorldObjectManager } from '../world/WorldObject';
import type { TimeSystem } from '../world/TimeSystem';
import type { Weather } from '../world/Weather';

export interface TileInfo {
  x: number;
  y: number;
  type: TileType;
  walkable: boolean;
}

export interface ObjectInfo {
  id: string;
  type: ObjectType;
  x: number;
  y: number;
  state: string;
}

export interface NPCInfo {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  action: ActionType;
}

export interface Perception {
  nearbyTiles: TileInfo[];
  nearbyObjects: ObjectInfo[];
  nearbyNPCs: NPCInfo[];
  nearbyConstructionSites: ObjectInfo[];
  nearbyStructures: ObjectInfo[];
  needs: Needs;
  personality: Personality;
  inventory: Inventory;
  relevantMemories: Memory[];
  timeOfDay: number;
  weather: WeatherState;
  season: string;
  currentTick: number;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  craftInventoryThreshold: number;
}

const PERCEPTION_RADIUS = 8;

export function buildPerception(
  npc: NPC,
  tileMap: TileMap,
  objects: WorldObjectManager,
  allNPCs: NPC[],
  timeSystem: TimeSystem,
  weather: Weather,
  cameraX: number,
  cameraY: number,
  cameraZoom: number,
  craftInventoryThreshold: number = 5,
): Perception {
  const nearbyTiles: TileInfo[] = [];
  for (let dy = -PERCEPTION_RADIUS; dy <= PERCEPTION_RADIUS; dy++) {
    for (let dx = -PERCEPTION_RADIUS; dx <= PERCEPTION_RADIUS; dx++) {
      const tx = Math.floor(npc.x) + dx;
      const ty = Math.floor(npc.y) + dy;
      const tile = tileMap.getTile(tx, ty);
      if (tile) {
        nearbyTiles.push({
          x: tx,
          y: ty,
          type: tile.type,
          walkable: tile.walkable,
        });
      }
    }
  }

  const nearbyWorldObjects = objects.getObjectsInRadius(npc.x, npc.y, PERCEPTION_RADIUS);
  const nearbyObjects: ObjectInfo[] = nearbyWorldObjects.map(obj => ({
    id: obj.id,
    type: obj.type,
    x: obj.x,
    y: obj.y,
    state: obj.state,
  }));

  const nearbyConstructionSites: ObjectInfo[] = nearbyWorldObjects
    .filter(obj => obj.type === ObjectType.ConstructionSite && obj.structureData && obj.structureData.completedAt === null)
    .map(obj => ({ id: obj.id, type: obj.type, x: obj.x, y: obj.y, state: obj.state }));

  const nearbyStructures: ObjectInfo[] = nearbyWorldObjects
    .filter(obj => obj.structureData && obj.structureData.completedAt !== null)
    .map(obj => ({ id: obj.id, type: obj.type, x: obj.x, y: obj.y, state: obj.state }));

  const nearbyNPCEntities = npc.getNearbyNPCs(allNPCs, PERCEPTION_RADIUS);
  const nearbyNPCs: NPCInfo[] = nearbyNPCEntities.map(other => ({
    id: other.id,
    x: other.x,
    y: other.y,
    dx: other.x - other.prevX,
    dy: other.y - other.prevY,
    action: other.currentAction,
  }));

  const relevantMemories = npc.memory.getTopMemories(5);

  return {
    nearbyTiles,
    nearbyObjects,
    nearbyNPCs,
    nearbyConstructionSites,
    nearbyStructures,
    needs: { ...npc.needs },
    personality: { ...npc.personality },
    inventory: { ...npc.inventory },
    relevantMemories,
    timeOfDay: timeSystem.timeOfDay,
    weather: weather.current,
    season: timeSystem.season,
    currentTick: timeSystem.tick,
    cameraX,
    cameraY,
    cameraZoom,
    craftInventoryThreshold,
  };
}
