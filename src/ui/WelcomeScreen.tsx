import React, { useState, useCallback } from 'react';
import { useSimulation } from '../engine/SimulationState';

const WelcomeScreen: React.FC = () => {
  const [seed, setSeed] = useState('42');
  const initWorld = useSimulation(s => s.initWorld);
  const setShowWelcome = useSimulation(s => s.setShowWelcome);

  const handleGenerate = useCallback(() => {
    const parsed = parseInt(seed, 10);
    const safeSeed = isNaN(parsed) ? 42 : parsed;
    initWorld(safeSeed);
    setShowWelcome(false);
  }, [seed, initWorld, setShowWelcome]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleGenerate();
    },
    [handleGenerate],
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
      <div className="bg-gray-900 border-2 border-emerald-700 rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        <h1 className="text-3xl font-bold text-center text-emerald-400 tracking-widest mb-2">
          🌿 LIVING WORLDS 🌿
        </h1>
        <p className="text-center text-gray-400 text-sm mb-8">
          A world that thinks for itself
        </p>

        <div className="mb-6">
          <label htmlFor="seed-input" className="block text-gray-300 text-sm mb-2">
            World Seed
          </label>
          <input
            id="seed-input"
            type="number"
            value={seed}
            onChange={e => setSeed(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-center text-lg"
          />
        </div>

        <button
          onClick={handleGenerate}
          className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded transition-colors duration-200 text-lg mb-6"
        >
          🌱 Generate World
        </button>

        <div className="text-gray-500 text-xs space-y-1">
          <p>🖱️ Drag to pan · Scroll to zoom · Click NPC to inspect</p>
          <p>⌨️ Arrow keys to pan · +/- to zoom · Tab for debug</p>
          <p>📱 Touch drag to pan · Pinch to zoom · Tap NPC to inspect</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
