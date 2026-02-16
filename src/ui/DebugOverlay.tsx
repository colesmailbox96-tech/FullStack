import React, { useEffect, useState, useCallback } from 'react';
import { useSimulation } from '../engine/SimulationState';
import type { ActionType } from '../ai/Action';

const ACTION_TYPES: ActionType[] = ['FORAGE', 'REST', 'SEEK_SHELTER', 'EXPLORE', 'SOCIALIZE', 'IDLE', 'GATHER', 'CRAFT', 'BUILD', 'FISH'];

const ACTION_COLORS: Record<ActionType, string> = {
  FORAGE: 'bg-orange-500',
  REST: 'bg-blue-500',
  SEEK_SHELTER: 'bg-amber-600',
  EXPLORE: 'bg-emerald-500',
  SOCIALIZE: 'bg-purple-500',
  IDLE: 'bg-gray-500',
  GATHER: 'bg-yellow-500',
  CRAFT: 'bg-rose-500',
  BUILD: 'bg-teal-500',
  FISH: 'bg-cyan-500',
};

const DebugOverlay: React.FC = () => {
  const state = useSimulation(s => s.state);
  const [fps, setFps] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [lastTime, setLastTime] = useState(performance.now());

  // FPS counter
  const updateFps = useCallback(() => {
    setFrameCount(prev => {
      const now = performance.now();
      const newCount = prev + 1;
      if (now - lastTime >= 1000) {
        setFps(newCount);
        setFrameCount(0);
        setLastTime(now);
        return 0;
      }
      return newCount;
    });
  }, [lastTime]);

  useEffect(() => {
    let raf: number;
    const loop = () => {
      updateFps();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [updateFps]);

  if (!state) return null;

  const { npcs, timeSystem, weather } = state;
  const aliveNpcs = npcs.filter(n => n.alive);
  const deadNpcs = npcs.filter(n => !n.alive);

  // Compute action distribution
  const actionCounts: Record<ActionType, number> = {
    FORAGE: 0, REST: 0, SEEK_SHELTER: 0, EXPLORE: 0, SOCIALIZE: 0, IDLE: 0, GATHER: 0, CRAFT: 0, BUILD: 0, FISH: 0,
  };
  for (const npc of aliveNpcs) {
    const action = npc.currentAction as ActionType;
    if (action in actionCounts) {
      actionCounts[action]++;
    }
  }
  const maxCount = Math.max(1, ...Object.values(actionCounts));

  return (
    <div className="absolute top-12 left-2 z-40 w-72 bg-black/80 backdrop-blur-sm rounded-lg border border-gray-700/50 p-3 text-xs text-gray-300 space-y-3">
      <h3 className="text-emerald-400 font-bold text-sm">🔧 Debug</h3>

      {/* Performance */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span className="text-gray-500">Tick</span>
        <span className="text-right font-mono">{state.tick}</span>
        <span className="text-gray-500">FPS</span>
        <span className="text-right font-mono">{fps}</span>
      </div>

      {/* Population */}
      <div>
        <h4 className="text-gray-500 font-semibold mb-1">Population</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          <span className="text-gray-500">Alive</span>
          <span className="text-right font-mono text-emerald-400">{aliveNpcs.length}</span>
          <span className="text-gray-500">Dead</span>
          <span className="text-right font-mono text-red-400">{deadNpcs.length}</span>
          <span className="text-gray-500">Total</span>
          <span className="text-right font-mono">{npcs.length}</span>
        </div>
      </div>

      {/* Action Distribution */}
      <div>
        <h4 className="text-gray-500 font-semibold mb-1">Action Distribution</h4>
        <div className="space-y-1">
          {ACTION_TYPES.map(action => {
            const count = actionCounts[action];
            const pct = aliveNpcs.length > 0 ? (count / maxCount) * 100 : 0;
            return (
              <div key={action} className="flex items-center gap-2">
                <span className="w-20 text-gray-500 truncate">{action}</span>
                <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${ACTION_COLORS[action]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 text-right font-mono">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weather / Time */}
      <div>
        <h4 className="text-gray-500 font-semibold mb-1">Environment</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          <span className="text-gray-500">Day</span>
          <span className="text-right font-mono">{timeSystem.day + 1}</span>
          <span className="text-gray-500">Time of Day</span>
          <span className="text-right font-mono">{timeSystem.timeOfDay.toFixed(3)}</span>
          <span className="text-gray-500">Period</span>
          <span className="text-right font-mono capitalize">{timeSystem.getTimePeriod()}</span>
          <span className="text-gray-500">Season</span>
          <span className="text-right font-mono capitalize">{timeSystem.season}</span>
          <span className="text-gray-500">Weather</span>
          <span className="text-right font-mono capitalize">{weather.current}</span>
          <span className="text-gray-500">Wind</span>
          <span className="text-right font-mono">{weather.windStrength.toFixed(2)}</span>
          <span className="text-gray-500">Intensity</span>
          <span className="text-right font-mono">{weather.intensity.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default DebugOverlay;
