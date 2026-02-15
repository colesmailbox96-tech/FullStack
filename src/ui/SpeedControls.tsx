import React, { useCallback } from 'react';
import { useSimulation } from '../engine/SimulationState';
import { DataLogger } from '../data/DataLogger';

const SPEEDS: { label: string; value: number }[] = [
  { label: '⏸', value: 0 },
  { label: '▶', value: 1 },
  { label: '▶▶', value: 5 },
  { label: '▶▶▶', value: 20 },
  { label: '⏩', value: 100 },
];

const dataLogger = new DataLogger();

const SpeedControls: React.FC = () => {
  const speed = useSimulation(s => s.speed);
  const volume = useSimulation(s => s.volume);
  const setSpeed = useSimulation(s => s.setSpeed);
  const setVolume = useSimulation(s => s.setVolume);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setVolume(parseFloat(e.target.value));
    },
    [setVolume],
  );

  const handleDownload = useCallback(() => {
    dataLogger.downloadAsJSONL();
  }, []);

  return (
    <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
      {/* Speed buttons */}
      <div className="flex gap-1 bg-black/70 backdrop-blur-sm rounded-lg border border-gray-700/50 p-1">
        {SPEEDS.map(s => (
          <button
            key={s.value}
            onClick={() => setSpeed(s.value)}
            className={`px-2 py-1.5 rounded text-xs font-mono transition-colors duration-150 min-w-[36px] ${
              speed === s.value
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
            title={s.value === 0 ? 'Pause' : `${s.value}x speed`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Volume slider */}
      <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-lg border border-gray-700/50 px-3 py-1.5">
        <span className="text-xs text-gray-400">🔊</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={handleVolumeChange}
          className="w-20 h-1 accent-emerald-500 cursor-pointer"
        />
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        className="bg-black/70 backdrop-blur-sm rounded-lg border border-gray-700/50 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors duration-150"
        title="Download decision log"
      >
        📥 Export Data
      </button>
    </div>
  );
};

export default SpeedControls;
