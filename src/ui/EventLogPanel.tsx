import React from 'react';
import { useSimulation } from '../engine/SimulationState';
import type { WorldEvent } from '../data/EventLog';

const EVENT_ICON: Record<WorldEvent['type'], string> = {
  npc_born: '👶',
  npc_died: '💀',
  weather_change: '🌤️',
  season_change: '🍂',
  npc_found_food: '🍎',
  npc_socialized: '💬',
};

const TICKS_PER_DAY = 2400;

const EventLogPanel: React.FC = () => {
  const state = useSimulation(s => s.state);
  const showEventLog = useSimulation(s => s.showEventLog);
  const toggleEventLog = useSimulation(s => s.toggleEventLog);

  if (!showEventLog || !state) return null;

  const recentEvents = state.eventLog.getRecentEvents(20);
  const currentTick = state.tick;

  return (
    <div className="absolute bottom-14 left-2 z-20 w-72 max-h-64 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50">
        <h3 className="text-xs font-bold text-white uppercase">📜 World Events</h3>
        <button
          onClick={toggleEventLog}
          className="text-gray-500 hover:text-white transition-colors w-5 h-5 flex items-center justify-center rounded hover:bg-gray-700 text-xs"
        >
          ✕
        </button>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {recentEvents.length === 0 ? (
          <p className="text-xs text-gray-600 italic">No events yet...</p>
        ) : (
          <ul className="space-y-1.5">
            {[...recentEvents].reverse().map((event, i) => {
              const ticksAgo = currentTick - event.tick;
              const timeLabel = ticksAgo < TICKS_PER_DAY
                ? `${ticksAgo} ticks ago`
                : `${Math.floor(ticksAgo / TICKS_PER_DAY)}d ago`;

              return (
                <li key={i} className="text-xs flex items-start gap-1.5">
                  <span className="flex-shrink-0">{EVENT_ICON[event.type] ?? '📌'}</span>
                  <span className="text-gray-300 flex-1">{event.description}</span>
                  <span className="text-gray-600 flex-shrink-0 font-mono text-[10px]">
                    {timeLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default EventLogPanel;
