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
  showWelcome: boolean;

  initWorld: (seed: number) => void;
  tick: () => void;
  setSpeed: (speed: number) => void;
  setCamera: (x: number, y: number, zoom: number) => void;
  selectNPC: (id: string | null) => void;
  setVolume: (volume: number) => void;
  toggleDebug: () => void;
  toggleEventLog: () => void;
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
  showWelcome: true,

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
      },
      cameraX: config.worldSize / 2,
      cameraY: config.worldSize / 2,
      cameraZoom: 1,
    });
  },

  tick: () => {
    const { state } = get();
    if (!state || !state.isRunning) return;

    const { timeSystem, weather, objects, npcManager, tileMap, config, eventLog } = state;

    const prevWeather = weather.current;
    const prevSeason = timeSystem.season;
    const prevAliveCount = npcManager.getAliveNPCs().length;

    timeSystem.update();
    weather.update(timeSystem.season, config);
    objects.update(timeSystem.tick, config, timeSystem.season);
    npcManager.update(config, weather.current, timeSystem, tileMap, objects, weather);

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

    // Log NPC deaths — detect NPCs in their first tick of death animation
    const DEATH_ANIMATION_FIRST_TICK = 0.05;
    const currentAlive = npcManager.getAliveNPCs();
    if (currentAlive.length < prevAliveCount) {
      const dead = npcManager.getNPCs().filter(n => !n.alive && n.deathAnimation <= DEATH_ANIMATION_FIRST_TICK);
      for (const npc of dead) {
        const idNum = npc.id.replace(/\D/g, '') || npc.id;
        eventLog.addEvent({
          tick: currentTick,
          type: 'npc_died',
          description: `Villager #${idNum} has died`,
          npcId: npc.id,
          x: Math.floor(npc.x),
          y: Math.floor(npc.y),
        });
      }
    }

    // Log NPC births (population increased)
    if (currentAlive.length > prevAliveCount) {
      eventLog.addEvent({
        tick: currentTick,
        type: 'npc_born',
        description: `A new villager has arrived`,
      });
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

  setShowWelcome: (show: boolean) => {
    set({ showWelcome: show });
  },
}));
