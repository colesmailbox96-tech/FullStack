import React, { useCallback } from 'react';
import { useSimulation } from '../engine/SimulationState';
import { ObjectType } from '../world/WorldObject';

const OBJECT_LABELS: Partial<Record<ObjectType, string>> = {
  [ObjectType.OakTree]: '🌳 Oak Tree',
  [ObjectType.PineTree]: '🌲 Pine Tree',
  [ObjectType.BirchTree]: '🌳 Birch Tree',
  [ObjectType.BerryBush]: '🫐 Berry Bush',
  [ObjectType.Rock]: '🪨 Rock',
  [ObjectType.Mushroom]: '🍄 Mushroom',
  [ObjectType.Campfire]: '🔥 Campfire',
  [ObjectType.Hut]: '🏠 Hut',
  [ObjectType.Farm]: '🌾 Farm',
  [ObjectType.Well]: '💧 Well',
  [ObjectType.Storehouse]: '📦 Storehouse',
  [ObjectType.Watchtower]: '🏰 Watchtower',
  [ObjectType.MeetingHall]: '🏛️ Meeting Hall',
  [ObjectType.ConstructionSite]: '🏗️ Construction Site',
};

const RESOURCE_TYPE: Partial<Record<ObjectType, string>> = {
  [ObjectType.OakTree]: 'Wood',
  [ObjectType.PineTree]: 'Wood',
  [ObjectType.BirchTree]: 'Wood',
  [ObjectType.BerryBush]: 'Berries',
  [ObjectType.Rock]: 'Stone',
  [ObjectType.Mushroom]: 'Food',
};

function isHarvestable(type: ObjectType): boolean {
  return type in RESOURCE_TYPE;
}

const ResourceInfoTooltip: React.FC = () => {
  const selectedObjectId = useSimulation(s => s.selectedObjectId);
  const state = useSimulation(s => s.state);
  const selectObject = useSimulation(s => s.selectObject);

  const handleClose = useCallback(() => {
    selectObject(null);
  }, [selectObject]);

  if (!selectedObjectId || !state) return null;

  const obj = state.objects.getObjectById(selectedObjectId);
  if (!obj) return null;

  const label = OBJECT_LABELS[obj.type] ?? obj.type;
  const resourceType = RESOURCE_TYPE[obj.type];
  const harvestable = isHarvestable(obj.type);

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 bg-gray-900/95 backdrop-blur-sm border border-gray-600/50 rounded-lg px-4 py-3 text-xs text-gray-200 shadow-lg min-w-[160px]">
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="font-bold text-sm text-white">{label}</span>
        <button
          onClick={handleClose}
          className="text-gray-500 hover:text-white transition-colors w-5 h-5 flex items-center justify-center rounded hover:bg-gray-700"
        >
          ✕
        </button>
      </div>
      <div className="text-gray-400 mb-1">
        Position: ({obj.x}, {obj.y})
      </div>
      {harvestable && (
        <div className="mt-1">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">{resourceType} remaining:</span>
            <span className={`font-mono font-bold ${obj.resources > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {obj.resources}
            </span>
          </div>
          {obj.state === 'depleted' && (
            <div className="text-red-400 mt-1 italic">Depleted — will respawn</div>
          )}
          {obj.state === 'ripe' && (
            <div className="text-emerald-400 mt-1 italic">Available for harvest</div>
          )}
        </div>
      )}
      {obj.type === ObjectType.ConstructionSite && obj.structureData && (
        <div className="mt-1">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Build progress:</span>
            <span className="font-mono font-bold text-yellow-400">
              {Math.round(obj.structureData.buildProgress * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceInfoTooltip;
