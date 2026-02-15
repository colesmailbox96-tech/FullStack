import React from 'react';
import { useSimulation } from '../engine/SimulationState';

const AchievementPanel: React.FC = () => {
  const state = useSimulation(s => s.state);
  const showAchievements = useSimulation(s => s.showAchievements);
  const toggleAchievements = useSimulation(s => s.toggleAchievements);

  if (!showAchievements || !state) return null;

  const achievements = state.achievementSystem.getAll();
  const unlocked = state.achievementSystem.getUnlocked().length;
  const total = state.achievementSystem.getTotal();

  return (
    <div className="absolute bottom-14 right-2 z-20 w-72 max-h-80 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50">
        <h3 className="text-xs font-bold text-white uppercase">
          🏆 Achievements ({unlocked}/{total})
        </h3>
        <button
          onClick={toggleAchievements}
          className="text-gray-500 hover:text-white transition-colors w-5 h-5 flex items-center justify-center rounded hover:bg-gray-700 text-xs"
        >
          ✕
        </button>
      </div>

      {/* Achievement list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-2">
          {achievements.map((ach) => {
            const isUnlocked = ach.unlockedAt !== null;
            return (
              <li
                key={ach.id}
                className={`flex items-start gap-2 text-xs ${
                  isUnlocked ? 'text-gray-200' : 'text-gray-600'
                }`}
              >
                <span className="flex-shrink-0 text-sm">
                  {isUnlocked ? ach.icon : '🔒'}
                </span>
                <div className="flex-1">
                  <p className={`font-semibold ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                    {ach.title}
                  </p>
                  <p className={isUnlocked ? 'text-gray-400' : 'text-gray-600'}>
                    {ach.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default AchievementPanel;
