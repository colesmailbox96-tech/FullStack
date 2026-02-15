import React, { useEffect } from 'react';
import { useSimulation } from './engine/SimulationState';
import WelcomeScreen from './ui/WelcomeScreen';
import GameCanvas from './ui/GameCanvas';
import HUD from './ui/HUD';
import MiniMap from './ui/MiniMap';
import NPCInfoPanel from './ui/NPCInfoPanel';
import SpeedControls from './ui/SpeedControls';
import DebugOverlay from './ui/DebugOverlay';
import EventLogPanel from './ui/EventLogPanel';
import AchievementPanel from './ui/AchievementPanel';
import WorldStatsPanel from './ui/WorldStatsPanel';
import TestingDashboard from './ui/TestingDashboard';

const App: React.FC = () => {
  const showWelcome = useSimulation(s => s.showWelcome);
  const showDebug = useSimulation(s => s.showDebug);
  const showWorldStats = useSimulation(s => s.showWorldStats);
  const toggleWorldStats = useSimulation(s => s.toggleWorldStats);
  const showTestingDashboard = useSimulation(s => s.showTestingDashboard);
  const toggleTestingDashboard = useSimulation(s => s.toggleTestingDashboard);

  // F9 keybinding for testing dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        toggleTestingDashboard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTestingDashboard]);

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
          <EventLogPanel />
          <AchievementPanel />
          <WorldStatsPanel visible={showWorldStats} onClose={toggleWorldStats} />
          {showDebug && <DebugOverlay />}
          <TestingDashboard
            visible={showTestingDashboard}
            onClose={toggleTestingDashboard}
            dataLog={[]}
          />
        </>
      )}
    </div>
  );
};

export default App;
