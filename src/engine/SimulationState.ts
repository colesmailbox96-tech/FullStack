import { create } from 'zustand';
import { TileMap } from '../world/TileMap';
import { WorldObjectManager } from '../world/WorldObject';
import { TimeSystem } from '../world/TimeSystem';
import { Weather } from '../world/Weather';
import { TerrainGenerator } from '../world/TerrainGenerator';
import { WorldConfig, GAMEPLAY_CONFIG } from '../engine/Config';
import { NPC } from '../entities/NPC';
import { NPCManager } from '../entities/NPCManager';
import { EventLog } from '../data/EventLog';
import { AchievementSystem } from '../data/Achievements';
import { SeasonalEventManager } from '../world/SeasonalEvents';
import { PopulationTracker } from '../data/PopulationStats';
import { StructureManager } from '../entities/Structure';
import { SettlementManager } from '../entities/Settlement';

export interface SimulationSnapshot {
  tick: number;
  tileMap: TileMap;
  objects: WorldObjectManager;
  npcs: NPC[];
  timeSystem: TimeSystem;
  weather: Weather;
  config: WorldConfig;
  selectedNpcId: string | null;
  speed: number;
  isRunning: boolean;
  seed: number;
  npcManager: NPCManager;
  eventLog: EventLog;
  achievementSystem: AchievementSystem;
  seasonalEvents: SeasonalEventManager;
  populationTracker: PopulationTracker;
  structureManager: StructureManager;
  settlementManager: SettlementManager;
}

interface SimulationStore {
  state: SimulationSnapshot | null;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  selectedNpcId: string | null;
  speed: number;
  volume: number;
  showDebug: boolean;
  showEventLog: boolean;
  showAchievements: boolean;
  showWorldStats: boolean;
  showWelcome: boolean;
  showTestingDashboard: boolean;

  initWorld: (seed: number) => void;
  tick: () => void;
  setSpeed: (speed: number) => void;
  setCamera: (x: number, y: number, zoom: number) => void;
  selectNPC: (id: string | null) => void;
  setVolume: (volume: number) => void;
  toggleDebug: () => void;
  toggleEventLog: () => void;
  toggleAchievements: () => void;
  toggleWorldStats: () => void;
  toggleTestingDashboard: () => void;
  setShowWelcome: (show: boolean) => void;
}

export const useSimulation = create<SimulationStore>((set, get) => ({
  state: null,
  cameraX: 0,
  cameraY: 0,
  cameraZoom: 1,
  selectedNpcId: null,
  speed: 1,
  volume: 0.5,
  showDebug: false,
  showEventLog: false,
  showAchievements: false,
  showWorldStats: false,
  showWelcome: true,
  showTestingDashboard: false,

  initWorld: (seed: number) => {
    const config = { ...GAMEPLAY_CONFIG };
    const tileMap = TerrainGenerator.generate(seed, config.worldSize, config.worldSize);
    const objects = new WorldObjectManager();
    objects.generateObjects(tileMap, seed, config);
    const timeSystem = new TimeSystem(config);
    const weather = new Weather(seed);
    const npcManager = new NPCManager(seed);
    npcManager.spawnInitial(config.initialNPCCount, tileMap, config);
    const eventLog = new EventLog();
    const achievementSystem = new AchievementSystem();
    const seasonalEvents = new SeasonalEventManager();
    const populationTracker = new PopulationTracker();
    const structureManager = new StructureManager(objects);
    const settlementManager = new SettlementManager();

    set({
      state: {
        tick: 0,
        tileMap,
        objects,
        npcs: npcManager.getNPCs(),
        timeSystem,
        weather,
        config,
        selectedNpcId: null,
        speed: 1,
        isRunning: true,
        seed,
        npcManager,
        eventLog,
        achievementSystem,
        seasonalEvents,
        populationTracker,
        structureManager,
        settlementManager,
      },
      cameraX: config.worldSize / 2,
      cameraY: config.worldSize / 2,
      cameraZoom: 1,
    });
  },

  tick: () => {
    const { state } = get();
    if (!state || !state.isRunning) return;

    const { timeSystem, weather, objects, npcManager, tileMap, config, eventLog, seasonalEvents, populationTracker, structureManager, settlementManager } = state;

    const prevWeather = weather.current;
    const prevSeason = timeSystem.season;
    const prevAliveSet = new Set(npcManager.getAliveNPCs().map(n => n.id));
    const prevAliveCount = prevAliveSet.size;

    timeSystem.update();
    weather.update(timeSystem.season, config);
    objects.update(timeSystem.tick, config, timeSystem.season);
    structureManager.updateStructures(timeSystem.tick, config, timeSystem.season, tileMap);
    npcManager.update(config, weather.current, timeSystem, tileMap, objects, weather, structureManager);

    const currentTick = state.tick + 1;

    // Log weather changes
    if (weather.current !== prevWeather) {
      eventLog.addEvent({
        tick: currentTick,
        type: 'weather_change',
        description: `Weather changed to ${weather.current}`,
      });
    }

    // Log season changes
    if (timeSystem.season !== prevSeason) {
      eventLog.addEvent({
        tick: currentTick,
        type: 'season_change',
        description: `Season changed to ${timeSystem.season}`,
      });
    }

    // Update seasonal events
    const newEvent = seasonalEvents.update(timeSystem.season, currentTick);
    if (newEvent) {
      eventLog.addEvent({
        tick: currentTick,
        type: 'season_change',
        description: `🎊 ${newEvent.name}: ${newEvent.description}`,
      });
    }

    // Track storm survival for NPCs
    if (prevWeather === 'storm' && weather.current !== 'storm') {
      for (const npc of npcManager.getAliveNPCs()) {
        npc.survivedStorm = true;
      }
    }

    // Detect deaths and births by comparing alive IDs before/after update
    const currentAlive = npcManager.getAliveNPCs();
    const currentAliveSet = new Set(currentAlive.map(n => n.id));

    // Log NPC deaths — NPCs that were alive before but are no longer
    const newlyDeadIds = [...prevAliveSet].filter(id => !currentAliveSet.has(id));
    const findNPC = (id: string) => npcManager.getNPCById(id) ?? npcManager.getNPCs().find(n => n.id === id);
    for (const deadId of newlyDeadIds) {
      const npc = findNPC(deadId);
      const idNum = deadId.replace(/\D/g, '') || deadId;
      eventLog.addEvent({
        tick: currentTick,
        type: 'npc_died',
        description: `Villager #${idNum} has died`,
        npcId: deadId,
        x: npc ? Math.floor(npc.x) : 0,
        y: npc ? Math.floor(npc.y) : 0,
      });
    }

    // Log NPC births — NPCs that are alive now but weren't before
    const newlyBornIds = [...currentAliveSet].filter(id => !prevAliveSet.has(id));
    for (let i = 0; i < newlyBornIds.length; i++) {
      eventLog.addEvent({
        tick: currentTick,
        type: 'npc_born',
        description: `A new villager has arrived`,
      });
    }

    // Update population tracker
    const births = newlyBornIds.length;
    const deaths = newlyDeadIds.length;
    populationTracker.recordTick(currentTick, currentAlive.length, births, deaths);
    for (const deadId of newlyDeadIds) {
      const npc = findNPC(deadId);
      if (npc) {
        populationTracker.recordDeath(npc.age);
      }
    }

    // Settlement detection (every 120 ticks)
    if (currentTick % 120 === 0) {
      const completedStructures = structureManager.getCompletedStructures();
      const newSettlements = settlementManager.detectSettlements(completedStructures, currentTick, config);
      settlementManager.assignResidents(currentAlive);

      for (const settlement of newSettlements) {
        eventLog.addEvent({
          tick: currentTick,
          type: 'settlement_formed',
          description: `🏘️ Settlement "${settlement.name}" has formed!`,
        });
      }
    }

    // Check achievements (every 60 ticks to avoid per-tick overhead)
    if (currentTick % 60 === 0) {
      const aliveNPCs = npcManager.getAliveNPCs();
      const hasCloseFriendship = aliveNPCs.some(
        n => n.relationships.getRelationships().some(r => r.affinity >= 0.7)
      );
      const hasMasterForager = aliveNPCs.some(n => n.skills.foraging >= 0.8);
      const maxTilesExplored = aliveNPCs.reduce(
        (max, n) => Math.max(max, n.tilesVisited.size), 0
      );
      const craftedCampfire = aliveNPCs.some(
        n => n.memory.getMemoriesByType('crafted_item').length > 0
      );

      const completedStructureCount = structureManager.getCompletedStructures().length;
      const settlements = settlementManager.getSettlements();
      const hasMasterBuilder = aliveNPCs.some(n => n.skills.building >= 0.8);
      const hasThrivingSettlement = settlements.some(
        s => s.structureIds.length >= 5 && s.residentNpcIds.length >= 10
      );
      const hasArchitect = aliveNPCs.some(n => n.buildContributions >= 5);

      const newAchievements = state.achievementSystem.check({
        tick: currentTick,
        aliveCount: aliveNPCs.length,
        weather: weather.current,
        season: timeSystem.season,
        craftedCampfire,
        hasCloseFriendship,
        hasMasterForager,
        maxTilesExplored,
        completedStructureCount,
        settlementCount: settlements.length,
        hasMasterBuilder,
        hasThrivingSettlement,
        hasArchitect,
      });

      for (const ach of newAchievements) {
        eventLog.addEvent({
          tick: currentTick,
          type: 'npc_crafted',
          description: `🏆 Achievement: ${ach.title}`,
        });
      }
    }

    set({
      state: {
        ...state,
        tick: currentTick,
        npcs: npcManager.getNPCs(),
      },
    });
  },

  setSpeed: (speed: number) => {
    const { state } = get();
    if (state) {
      set({
        speed,
        state: { ...state, speed, isRunning: speed > 0 },
      });
    } else {
      set({ speed });
    }
  },

  setCamera: (x: number, y: number, zoom: number) => {
    set({ cameraX: x, cameraY: y, cameraZoom: zoom });
  },

  selectNPC: (id: string | null) => {
    const { state } = get();
    set({
      selectedNpcId: id,
      state: state ? { ...state, selectedNpcId: id } : null,
    });
  },

  setVolume: (volume: number) => {
    set({ volume });
  },

  toggleDebug: () => {
    set(s => ({ showDebug: !s.showDebug }));
  },

  toggleEventLog: () => {
    set(s => ({ showEventLog: !s.showEventLog }));
  },

  toggleAchievements: () => {
    set(s => ({ showAchievements: !s.showAchievements }));
  },

  toggleWorldStats: () => {
    set(s => ({ showWorldStats: !s.showWorldStats }));
  },

  toggleTestingDashboard: () => {
    set(s => ({ showTestingDashboard: !s.showTestingDashboard }));
  },

  setShowWelcome: (show: boolean) => {
    set({ showWelcome: show });
  },
}));
