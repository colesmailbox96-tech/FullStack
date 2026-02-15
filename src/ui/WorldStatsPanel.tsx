import React from 'react';
import { useSimulation } from '../engine/SimulationState';
import { ObjectType } from '../world/WorldObject';
import type { ActionType } from '../ai/Action';

const WEATHER_ICON: Record<string, string> = {
  clear: '☀️',
  cloudy: '☁️',
  rain: '🌧️',
  storm: '⛈️',
  snow: '❄️',
  fog: '🌫️',
};

const SEASON_ICON: Record<string, string> = {
  spring: '🌱',
  summer: '☀️',
  autumn: '🍂',
  winter: '❄️',
};

const ACTION_LABEL: Record<ActionType, string> = {
  FORAGE: '🍎 Forage',
  REST: '💤 Rest',
  SEEK_SHELTER: '🏠 Shelter',
  EXPLORE: '🧭 Explore',
  SOCIALIZE: '💬 Socialize',
  IDLE: '⏳ Idle',
  GATHER: '🪓 Gather',
  CRAFT: '🔨 Craft',
};

interface WorldStatsPanelProps {
  visible: boolean;
  onClose: () => void;
}

const WorldStatsPanel: React.FC<WorldStatsPanelProps> = ({ visible, onClose }) => {
  const state = useSimulation(s => s.state);

  if (!visible || !state) return null;

  const allNPCs = state.npcs;
  const aliveNPCs = allNPCs.filter(n => n.alive);
  const aliveCount = aliveNPCs.length;
  const peakPopulation = state.populationTracker.getPeakPopulation();

  // World age
  const { tick, day, season } = state.timeSystem;
  const timePeriod = state.timeSystem.getTimePeriod();

  // Resource counts
  const objects = state.objects.getObjects();
  const berryBushes = objects.filter(o => o.type === ObjectType.BerryBush).length;
  const trees = objects.filter(o =>
    o.type === ObjectType.OakTree ||
    o.type === ObjectType.PineTree ||
    o.type === ObjectType.BirchTree
  ).length;
  const rocks = objects.filter(o => o.type === ObjectType.Rock).length;
  const campfires = objects.filter(o => o.type === ObjectType.Campfire).length;

  // Average NPC needs
  const avgNeeds = { hunger: 0, energy: 0, social: 0, curiosity: 0, safety: 0 };
  if (aliveCount > 0) {
    for (const npc of aliveNPCs) {
      avgNeeds.hunger += npc.needs.hunger;
      avgNeeds.energy += npc.needs.energy;
      avgNeeds.social += npc.needs.social;
      avgNeeds.curiosity += npc.needs.curiosity;
      avgNeeds.safety += npc.needs.safety;
    }
    avgNeeds.hunger /= aliveCount;
    avgNeeds.energy /= aliveCount;
    avgNeeds.social /= aliveCount;
    avgNeeds.curiosity /= aliveCount;
    avgNeeds.safety /= aliveCount;
  }

  // Average skills
  const avgSkills = { foraging: 0, building: 0, crafting: 0, socializing: 0, exploring: 0 };
  if (aliveCount > 0) {
    for (const npc of aliveNPCs) {
      avgSkills.foraging += npc.skills.foraging;
      avgSkills.building += npc.skills.building;
      avgSkills.crafting += npc.skills.crafting;
      avgSkills.socializing += npc.skills.socializing;
      avgSkills.exploring += npc.skills.exploring;
    }
    avgSkills.foraging /= aliveCount;
    avgSkills.building /= aliveCount;
    avgSkills.crafting /= aliveCount;
    avgSkills.socializing /= aliveCount;
    avgSkills.exploring /= aliveCount;
  }

  // Action distribution
  const actionCounts: Partial<Record<ActionType, number>> = {};
  for (const npc of aliveNPCs) {
    actionCounts[npc.currentAction] = (actionCounts[npc.currentAction] ?? 0) + 1;
  }

  // Weather
  const weather = state.weather.current;

  return (
    <div className="absolute bottom-14 left-2 z-20 w-72 max-h-96 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50">
        <h3 className="text-xs font-bold text-white uppercase">📊 World Statistics</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors w-5 h-5 flex items-center justify-center rounded hover:bg-gray-700 text-xs"
        >
          ✕
        </button>
      </div>

      {/* Stats content */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {/* Population */}
        <Section title="👥 Population">
          <StatRow label="Alive" value={aliveCount} />
          <StatRow label="Peak" value={peakPopulation} />
        </Section>

        {/* World Age */}
        <Section title={`${SEASON_ICON[season] ?? '🌍'} World Age`}>
          <StatRow label="Tick" value={tick.toLocaleString()} />
          <StatRow label="Day" value={day} />
          <StatRow label="Season" value={season} />
          <StatRow label="Time" value={timePeriod} />
        </Section>

        {/* Weather */}
        <Section title={`${WEATHER_ICON[weather] ?? '🌤️'} Weather`}>
          <StatRow label="Current" value={weather} />
        </Section>

        {/* Resources */}
        <Section title="🌿 Resources">
          <StatRow label="Berry Bushes" value={berryBushes} />
          <StatRow label="Trees" value={trees} />
          <StatRow label="Rocks" value={rocks} />
          <StatRow label="Campfires" value={campfires} />
        </Section>

        {/* Average Needs */}
        <Section title="❤️ Avg Needs">
          <BarRow label="Hunger" value={avgNeeds.hunger} />
          <BarRow label="Energy" value={avgNeeds.energy} />
          <BarRow label="Social" value={avgNeeds.social} />
          <BarRow label="Curiosity" value={avgNeeds.curiosity} />
          <BarRow label="Safety" value={avgNeeds.safety} />
        </Section>

        {/* Skills */}
        <Section title="⭐ Avg Skills">
          <BarRow label="Foraging" value={avgSkills.foraging} />
          <BarRow label="Building" value={avgSkills.building} />
          <BarRow label="Crafting" value={avgSkills.crafting} />
          <BarRow label="Socializing" value={avgSkills.socializing} />
          <BarRow label="Exploring" value={avgSkills.exploring} />
        </Section>

        {/* Action Distribution */}
        <Section title="🎯 Actions">
          {(Object.entries(actionCounts) as [ActionType, number][]).map(([action, count]) => (
            <StatRow key={action} label={ACTION_LABEL[action] ?? action} value={count} />
          ))}
          {Object.keys(actionCounts).length === 0 && (
            <p className="text-xs text-gray-600 italic">No active NPCs</p>
          )}
        </Section>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="text-[10px] font-semibold text-gray-400 uppercase mb-1">{title}</h4>
    <div className="space-y-0.5">{children}</div>
  </div>
);

const StatRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="flex justify-between text-xs">
    <span className="text-gray-400">{label}</span>
    <span className="text-gray-200 font-mono">{value}</span>
  </div>
);

const BarRow: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  const pct = Math.round(value * 100);
  const barColor = pct >= 60 ? 'bg-emerald-500' : pct >= 30 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-gray-400 w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-gray-400 font-mono w-8 text-right text-[10px]">{pct}%</span>
    </div>
  );
};

export default WorldStatsPanel;
