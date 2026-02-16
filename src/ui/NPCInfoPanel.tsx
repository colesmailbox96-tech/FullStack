import React, { useCallback } from 'react';
import { useSimulation } from '../engine/SimulationState';
import { getMood, type Needs } from '../entities/Needs';
import { getDominantTrait, type Personality } from '../entities/Personality';
import { getRelationshipLabel, type Relationship } from '../entities/Relationship';
import type { Memory } from '../entities/Memory';
import type { ActionType } from '../ai/Action';
import type { Inventory } from '../entities/Inventory';
import type { Skills } from '../entities/Skills';
import { getSkillLabel, getBestSkill } from '../entities/Skills';

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊',
  content: '🙂',
  worried: '😟',
  distressed: '😰',
};

const ACTION_LABEL: Record<ActionType, string> = {
  FORAGE: '🍎 Foraging',
  REST: '💤 Resting',
  SEEK_SHELTER: '🏠 Seeking Shelter',
  EXPLORE: '🧭 Exploring',
  SOCIALIZE: '💬 Socializing',
  IDLE: '⏳ Idle',
  GATHER: '🪓 Gathering',
  CRAFT: '🔨 Crafting',
  BUILD: '🏗️ Building',
};

const MEMORY_LABEL: Record<string, string> = {
  found_food: '🍎 Found food',
  danger: '⚠️ Danger',
  met_npc: '👋 Met someone',
  found_shelter: '🏠 Found shelter',
  discovered_area: '🗺️ Discovered area',
  npc_died: '💀 Witnessed death',
  crafted_item: '🔨 Crafted item',
  gathered_resource: '🪓 Gathered resource',
  built_structure: '🏗️ Built structure',
};

interface NeedBarProps {
  label: string;
  value: number;
}

const NeedBar: React.FC<NeedBarProps> = ({ label, value }) => {
  const pct = Math.round(value * 100);
  let color = 'bg-red-500';
  if (value > 0.6) color = 'bg-emerald-500';
  else if (value > 0.3) color = 'bg-yellow-500';

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-gray-400 capitalize">{label}</span>
      <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-gray-400 font-mono">{pct}%</span>
    </div>
  );
};

const TICKS_PER_DAY = 2400;

const NPCInfoPanel: React.FC = () => {
  const selectedNpcId = useSimulation(s => s.selectedNpcId);
  const state = useSimulation(s => s.state);
  const selectNPC = useSimulation(s => s.selectNPC);

  const handleClose = useCallback(() => {
    selectNPC(null);
  }, [selectNPC]);

  const npc = state?.npcs.find(n => n.id === selectedNpcId) ?? null;
  const isOpen = npc !== null;

  return (
    <>
      {/* Desktop: slide from right */}
      <div
        className={`hidden md:block absolute top-12 right-0 z-30 w-72 h-[calc(100%-3rem)] transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {npc && <PanelContent npc={npc} onClose={handleClose} />}
      </div>

      {/* Mobile: slide from bottom */}
      <div
        className={`md:hidden absolute bottom-0 left-0 right-0 z-30 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ height: '40%' }}
      >
        {npc && <PanelContent npc={npc} onClose={handleClose} />}
      </div>
    </>
  );
};

interface PanelNPC {
  id: string;
  alive: boolean;
  currentAction: ActionType;
  targetX: number;
  targetY: number;
  needs: Needs;
  personality: Personality;
  inventory: Inventory;
  skills: Skills;
  age: number;
  tilesVisited: Set<string>;
  memory: { getTopMemories: (count: number) => Memory[] };
  relationships: { getRelationships: () => Relationship[] };
}

interface PanelContentProps {
  npc: PanelNPC;
  onClose: () => void;
}

const PanelContent: React.FC<PanelContentProps> = ({ npc, onClose }) => {
  const mood = getMood(npc.needs);
  const idNum = npc.id.replace(/\D/g, '') || npc.id;
  const topMemories = npc.memory.getTopMemories(5);
  const dayAge = Math.floor(npc.age / TICKS_PER_DAY);
  const dominant = getDominantTrait(npc.personality);
  const topRelationships = npc.relationships.getRelationships().slice(0, 5);
  const bestSkill = getBestSkill(npc.skills);

  return (
    <div className="h-full bg-gray-900/95 backdrop-blur-sm border-l md:border-l border-t md:border-t-0 border-gray-700/50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <div>
          <h2 className="text-sm font-bold text-white">
            Villager #{idNum}
          </h2>
          <span className="text-xs text-gray-400">
            {npc.alive ? (
              <>{MOOD_EMOJI[mood]} {mood}</>
            ) : (
              '💀 Deceased'
            )}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors w-7 h-7 flex items-center justify-center rounded hover:bg-gray-700"
        >
          ✕
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Current action */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Action</h3>
          <p className="text-sm text-gray-200">
            {ACTION_LABEL[npc.currentAction]}
          </p>
          <p className="text-xs text-gray-500">
            Target: ({Math.floor(npc.targetX)}, {Math.floor(npc.targetY)})
          </p>
        </div>

        {/* Inventory */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Inventory</h3>
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
            <span>🪵 {npc.inventory.wood}</span>
            <span>🪨 {npc.inventory.stone}</span>
            <span>🫐 {npc.inventory.berries}</span>
          </div>
        </div>

        {/* Need bars */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Needs</h3>
          <div className="space-y-1.5">
            <NeedBar label="Hunger" value={npc.needs.hunger} />
            <NeedBar label="Energy" value={npc.needs.energy} />
            <NeedBar label="Social" value={npc.needs.social} />
            <NeedBar label="Curiosity" value={npc.needs.curiosity} />
            <NeedBar label="Safety" value={npc.needs.safety} />
          </div>
        </div>

        {/* Personality */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">
            Personality <span className="text-gray-600 normal-case">— {dominant.label}</span>
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
            <span>🗡️ Bravery</span>
            <span className="text-right font-mono">{Math.round(npc.personality.bravery * 100)}%</span>
            <span>💬 Sociability</span>
            <span className="text-right font-mono">{Math.round(npc.personality.sociability * 100)}%</span>
            <span>🧭 Curiosity</span>
            <span className="text-right font-mono">{Math.round(npc.personality.curiosity * 100)}%</span>
            <span>⚒️ Industry</span>
            <span className="text-right font-mono">{Math.round(npc.personality.industriousness * 100)}%</span>
            <span>🔨 Craftiness</span>
            <span className="text-right font-mono">{Math.round(npc.personality.craftiness * 100)}%</span>
          </div>
        </div>

        {/* Skills */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">
            Skills <span className="text-gray-600 normal-case">— {bestSkill.label}</span>
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
            <span>🍎 Foraging</span>
            <span className="text-right font-mono">{getSkillLabel(npc.skills.foraging)}</span>
            <span>🏗️ Building</span>
            <span className="text-right font-mono">{getSkillLabel(npc.skills.building)}</span>
            <span>🔧 Crafting</span>
            <span className="text-right font-mono">{getSkillLabel(npc.skills.crafting)}</span>
            <span>🤝 Socializing</span>
            <span className="text-right font-mono">{getSkillLabel(npc.skills.socializing)}</span>
            <span>🗺️ Exploring</span>
            <span className="text-right font-mono">{getSkillLabel(npc.skills.exploring)}</span>
          </div>
        </div>

        {/* Relationships */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">
            Relationships
          </h3>
          {topRelationships.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No bonds yet</p>
          ) : (
            <ul className="space-y-1">
              {topRelationships.map((r) => {
                const idNum = r.npcId.replace(/\D/g, '') || r.npcId;
                return (
                  <li key={r.npcId} className="text-xs text-gray-400 flex justify-between">
                    <span>#{idNum} — {getRelationshipLabel(r.affinity)}</span>
                    <span className="text-gray-600 font-mono">
                      {Math.round(r.affinity * 100)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Memories */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">
            Recent Memories
          </h3>
          {topMemories.length === 0 ? (
            <p className="text-xs text-gray-600 italic">No memories yet</p>
          ) : (
            <ul className="space-y-1">
              {topMemories.map((m, i) => (
                <li key={i} className="text-xs text-gray-400 flex justify-between">
                  <span>{MEMORY_LABEL[m.type] ?? m.type}</span>
                  <span className="text-gray-600">
                    ({m.x}, {m.y})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Stats */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Stats</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
            <span>Age</span>
            <span className="text-right font-mono">
              {npc.age} ticks ({dayAge}d)
            </span>
            <span>Tiles Visited</span>
            <span className="text-right font-mono">{npc.tilesVisited.size}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NPCInfoPanel;
