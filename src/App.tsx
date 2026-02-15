import React from 'react';
import { useSimulation } from './engine/SimulationState';
import WelcomeScreen from './ui/WelcomeScreen';
import GameCanvas from './ui/GameCanvas';
import HUD from './ui/HUD';
import MiniMap from './ui/MiniMap';
import NPCInfoPanel from './ui/NPCInfoPanel';
import SpeedControls from './ui/SpeedControls';
import DebugOverlay from './ui/DebugOverlay';

const App: React.FC = () => {
  const showWelcome = useSimulation(s => s.showWelcome);
  const showDebug = useSimulation(s => s.showDebug);

  return (
    <div className="w-full h-full relative overflow-hidden bg-black">
      {showWelcome ? (
        <WelcomeScreen />
      ) : (
        <>
          <GameCanvas />
          <HUD />
          <MiniMap />
          <NPCInfoPanel />
          <SpeedControls />
          {showDebug && <DebugOverlay />}
        </>
      )}
    </div>
  );
};

export default App;
