# Living Worlds — AI-Driven Pixel World Simulator (Web Edition)

## BUILD INSTRUCTIONS FOR AGENT

**Read this entire document before writing any code.** This is the complete specification. Do not ask questions — everything you need is here. When you are finished, I should be able to run `npm install && npm run dev`, open the forwarded port in my phone browser, and see a beautiful, living pixel world.

**Work style:** Do NOT work in tiny incremental chunks. Build complete systems. Deliver a fully working application — not scaffolding, not placeholder components, not TODO comments. Every file you create must be functional and connected to the whole.

---

## What This Is

A browser-based 2D pixel-art world simulation with the best graphics achievable in a web context. Visually inspired by Dwarf Fortress and Stardew Valley but rendered with modern web techniques — sub-pixel rendering, dynamic lighting with real shadows, particle systems, smooth animations, ambient effects, and a polished UI that feels like a released indie game, not a tech demo.

The player watches a pixel world where 25+ NPCs autonomously forage, rest, seek shelter, explore, and socialize. NPCs have needs, memories, and moods. The world has weather, seasons, day/night cycles, and environmental storytelling. The player can pan, zoom, click NPCs to inspect them, and control simulation speed.

This is the web-playable version of a larger project. The architecture must generate structured training data for future neural network integration.

---

## Tech Stack

| Component | Technology |
|---|---|
| Language | TypeScript (strict mode) |
| Framework | React 18 + Vite |
| Rendering | HTML5 Canvas 2D (direct pixel manipulation, NO WebGL) |
| State Management | Zustand |
| Styling | Tailwind CSS |
| Package Manager | npm |
| Target | Modern browsers (Chrome, Safari, Firefox), mobile-first |

**Why Canvas 2D over WebGL:** Simpler to maintain, better mobile compatibility, sufficient for 2D pixel art with effects, and avoids shader complexity. We achieve visual richness through smart rendering techniques, not raw GPU power.

---

## Directory Structure

```
living-worlds/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── public/
│   └── favicon.ico
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   │
│   ├── engine/
│   │   ├── GameLoop.ts              — fixed timestep sim + variable render
│   │   ├── SimulationState.ts       — central simulation state
│   │   └── Config.ts                — world config (training vs gameplay)
│   │
│   ├── world/
│   │   ├── TileMap.ts               — tile grid + terrain types
│   │   ├── TerrainGenerator.ts      — simplex noise procedural gen
│   │   ├── WorldObject.ts           — trees, bushes, rocks, shelters
│   │   ├── Weather.ts               — weather state machine
│   │   ├── TimeSystem.ts            — day/night + seasons
│   │   └── Pathfinding.ts           — A* implementation
│   │
│   ├── entities/
│   │   ├── NPC.ts                   — NPC entity with needs, memory, state
│   │   ├── NPCManager.ts            — spawn, death, population management
│   │   ├── Needs.ts                 — need system with drain/recovery
│   │   └── Memory.ts                — episodic memory with significance decay
│   │
│   ├── ai/
│   │   ├── IBrain.ts                — brain interface
│   │   ├── Perception.ts            — perception builder
│   │   ├── Action.ts                — action types
│   │   └── BehaviorTreeBrain.ts     — behavior tree implementation
│   │
│   ├── rendering/
│   │   ├── Renderer.ts              — master render orchestrator
│   │   ├── Camera.ts                — pan/zoom with smooth interpolation
│   │   ├── TerrainRenderer.ts       — tile rendering with autotiling
│   │   ├── ObjectRenderer.ts        — trees, bushes, rocks with sway animation
│   │   ├── NPCRenderer.ts           — NPC sprites with animation
│   │   ├── WeatherRenderer.ts       — rain, snow, fog, lightning particles
│   │   ├── LightingRenderer.ts      — day/night tinting, shadows, firelight
│   │   ├── ParticleSystem.ts        — generic particle engine
│   │   ├── WaterRenderer.ts         — animated water with reflections
│   │   ├── SpriteSheet.ts           — sprite atlas loading + drawing
│   │   └── PixelFont.ts             — custom pixel font renderer
│   │
│   ├── input/
│   │   ├── InputManager.ts          — unified touch/mouse/keyboard
│   │   └── GestureDetector.ts       — pinch zoom, swipe pan, tap
│   │
│   ├── ui/
│   │   ├── GameCanvas.tsx           — React component wrapping the canvas
│   │   ├── HUD.tsx                  — top overlay (time, weather, population)
│   │   ├── NPCInfoPanel.tsx         — selected NPC detail panel
│   │   ├── SpeedControls.tsx        — pause/play/speed buttons
│   │   ├── DebugOverlay.tsx         — action distribution, memory viewer
│   │   ├── MiniMap.tsx              — corner minimap
│   │   └── WelcomeScreen.tsx        — initial seed input + start
│   │
│   ├── data/
│   │   ├── DataLogger.ts            — perception-decision-outcome logging
│   │   ├── EventLog.ts              — world event stream
│   │   └── PlayerTracker.ts         — camera/interaction logging
│   │
│   ├── audio/
│   │   └── AmbientAudio.ts          — Web Audio API ambient soundscape
│   │
│   └── utils/
│       ├── SimplexNoise.ts           — noise generation
│       ├── Random.ts                 — seeded PRNG
│       ├── Color.ts                  — color utilities
│       └── Math.ts                   — vector math, lerp, clamp
```

---

## Architecture Rules — Non-Negotiable

### Rule 1: Simulation and Rendering Are Decoupled
The simulation ticks at a fixed rate (60/sec). The renderer reads simulation state and draws. The renderer NEVER modifies simulation state.

```typescript
// Core loop structure
const TICK_RATE = 1000 / 60;
let accumulator = 0;

function frame(timestamp: number) {
  accumulator += delta;
  while (accumulator >= TICK_RATE) {
    simulation.tick();
    accumulator -= TICK_RATE;
  }
  const alpha = accumulator / TICK_RATE;
  renderer.render(simulation.getState(), alpha); // interpolated
  requestAnimationFrame(frame);
}
```

### Rule 2: NPC Brains Are Modular
```typescript
interface IBrain {
  decide(perception: Perception): Action;
}
```
BehaviorTreeBrain implements this. Neural networks will replace it later using the same interface.

### Rule 3: Data Pipeline Is First-Class
Every NPC decision cycle is logged as structured data. This is a training corpus for future ML — not debug output.

### Rule 4: Mobile-First Input
Touch is primary. Mouse/keyboard mapped on top. Game must feel native on a phone.

### Rule 5: Config-Driven Environment
All world parameters loaded from config objects. Training config (harsh) and gameplay config (balanced) are separate.

---

## Visual Quality Requirements — THIS IS CRITICAL

This is not a basic grid with colored squares. The rendering must be visually stunning for a pixel art game. Every technique below must be implemented:

### Terrain Rendering
- **Procedural pixel-art tiles rendered at runtime** — do NOT rely on external sprite sheet images. Generate all tile graphics programmatically using canvas pixel manipulation. This gives us full control over color palettes, variations, and animation.
- **Tile size:** 16x16 pixels, rendered at native resolution then scaled to screen with `imageSmoothingEnabled = false` for crisp pixels.
- **Per-tile variation:** Each grass tile has a unique arrangement of dark/light pixels based on a hash of its coordinates. No two grass tiles look identical. Same for dirt, sand, stone.
- **Autotiling for water edges:** Water tiles detect adjacent land tiles and render appropriate shoreline transitions. Use a 4-bit bitmask (up/down/left/right) to select from 16 edge variants.
- **Animated water:** Water tiles cycle through 4 frames of animation (shifting wave highlight positions). Frame offset is based on tile position so waves appear to ripple across the surface, not all tiles changing simultaneously.
- **Grass detail:** Random grass blade sprites (2-3px tall) rendered on top of base grass tiles. Gentle sway animation driven by a sine wave with per-blade phase offset. Wind direction from weather system affects sway direction and amplitude.
- **Flower animation:** Flower tiles have subtle petal movement synced to wind.

### Dynamic Lighting
- **Day/night cycle with smooth color grading:**
  - Dawn: warm golden overlay, long shadows stretching west
  - Day: neutral bright, short shadows
  - Dusk: orange/purple overlay, long shadows stretching east
  - Night: deep blue overlay, dramatically reduced visibility radius around the camera
  - Midnight: near-black, only areas near light sources visible
- **Per-tile shadow casting:** Trees and tall objects cast directional shadows that rotate with time of day. Shadows are rendered as semi-transparent dark pixels offset from the object based on sun angle.
- **Light sources:** Campfires emit warm radial light that illuminates nearby tiles with a flickering intensity (noise-driven, not regular sine). The light radius gently pulses. At night, campfire light is dramatic — the surrounding darkness makes it feel like a beacon.
- **Ambient occlusion:** Tiles adjacent to walls or dense objects are slightly darker, adding depth to caves and forests.

### Weather Particles
- **Rain:** Hundreds of diagonal streak particles falling across the screen. Each drop is 1x3 pixels, slightly transparent, with randomized speed and starting position. Drops create tiny splash particles when they hit ground tiles. Splash persists for 3-4 frames. Heavy rain has more drops, faster speed, and a blue-gray tint overlay on the world.
- **Snow:** Gentle floating particles that drift with sine-wave horizontal movement. Slower, softer than rain. Accumulates visually — after prolonged snow, ground tiles gradually shift toward white/snowy variants.
- **Fog:** Semi-transparent white layer with perlin noise distortion that slowly drifts across the world. Density varies by area — thicker near water, thinner on high ground.
- **Storm lightning:** Occasional full-screen white flash (2 frames). During the flash, the entire world is briefly overexposed. A subtle screen shake accompanies it (2px random offset for 5 frames).
- **Wind visualization:** Tiny leaf/dust particles that streak horizontally during windy weather. Direction matches wind in weather system.

### NPC Rendering
- **Programmatic pixel-art NPCs:** Each NPC is a 16x16 sprite generated from parameters (skin tone, hair color, shirt color, pants color). 8 unique visual variants.
- **4-direction sprites:** Each NPC has front/back/left/right sprites. Facing direction updates based on movement direction.
- **Walk animation:** 2-frame walk cycle. Legs alternate positions when moving. Smooth sub-tile movement interpolation between ticks.
- **Idle animation:** Subtle breathing animation (1px vertical shift on a slow sine wave) when standing still.
- **Mood visualization:** A small colored aura/glow beneath the NPC reflecting their dominant mood. Happy = soft green glow, sad = blue, angry = red, scared = yellow flicker, tired = dim purple. The aura is very subtle — 3-4 pixels of semi-transparent color beneath their feet.
- **Action indicators:** When foraging, a tiny "picking" hand animation. When resting, "Zzz" pixel text floats up. When socializing, a small heart/speech pixel icon appears between the two NPCs. When exploring, a small "!" appears over their head when discovering something new.
- **Death animation:** NPC sprite fades out over 30 frames with upward-drifting particles (soul leaving body effect).
- **Spawn animation:** New NPC fades in with a soft downward particle shower.

### Water Rendering
- **Animated waves:** Water tiles have a 4-frame cycle with shifting highlight positions creating a rippling effect.
- **Reflections:** Objects and NPCs adjacent to water cast a vertically flipped, darkened, slightly distorted reflection on water tiles. The reflection ripples with the water animation.
- **Shoreline foam:** White semi-transparent pixels along water/land borders that animate to simulate lapping waves.

### UI Polish
- **Custom pixel font:** All in-game text rendered with a pixel font for aesthetic consistency. The font is generated programmatically (5x7 pixel character set).
- **Panel backgrounds:** Semi-transparent dark panels with a 1px pixel border and subtle inner glow.
- **Smooth transitions:** Panels slide in/out. Info panel slides from right (desktop) or bottom (mobile). Speed control highlights with a smooth color transition.
- **Minimap:** Top-right corner, 120x120 pixels. Shows full world with terrain colors, NPC positions as bright dots, camera viewport as a white rectangle outline. Clickable to jump camera.
- **Tooltip on hover:** When hovering over (desktop) or long-pressing (mobile) a tile, show a small tooltip with tile type and any object/NPC info.

### Ambient Audio
Use the Web Audio API to generate ambient soundscapes procedurally (no audio files needed):
- **Daytime:** Soft white noise filtered to sound like wind, with occasional bird-like chirps (short sine wave bursts at randomized pitches).
- **Night:** Lower frequency filtered noise, occasional cricket-like sounds (higher pitched rapid sine pulses).
- **Rain:** Pink noise with high-pass filter, intensity scales with rain strength.
- **Storm:** Rain sounds + occasional low-frequency rumble (brown noise burst) synced with lightning flash.
- **Campfire:** Crackling noise (randomized short bursts of filtered noise) when camera is near a campfire.
- **Master volume control** in the UI. Default: 30%.

---

## Simulation Specifications

### World Generation

**Map size:** 128x128 tiles
**Generator:** Simplex noise

**Algorithm:**
1. Elevation noise: frequency 0.02, 2 octaves
2. Moisture noise: frequency 0.03, 2 octaves
3. Temperature noise: frequency 0.015, 1 octave (biome variation)

**Tile assignment:**

| Elevation | Moisture | Result |
|---|---|---|
| < 0.25 | any | deep water |
| 0.25–0.35 | any | shallow water |
| 0.35–0.40 | any | sand/beach |
| 0.40–0.55 | < 0.4 | dry dirt |
| 0.40–0.55 | ≥ 0.4 | grass (variant based on coordinate hash) |
| 0.55–0.70 | < 0.3 | dirt path |
| 0.55–0.70 | 0.3–0.6 | grass with scattered flowers |
| 0.55–0.70 | > 0.6 | dense grass with trees |
| 0.70–0.85 | any | stone/rocky ground |
| > 0.85 | any | cave wall (impassable) |

**Object placement** (separate noise layer, threshold-based):
- Berry bushes: grass tiles, density ~3%
- Oak trees: grass tiles with moisture > 0.5, density ~8%
- Pine trees: grass tiles with moisture > 0.6 and elevation > 0.55, density ~5%
- Birch trees: grass tiles with moisture 0.4–0.6, density ~3%
- Rocks: stone and dirt tiles, density ~5%
- Mushrooms: grass tiles adjacent to water, density ~2%
- Campfire locations: pre-place 3–5 campfires on grass tiles away from water (NPCs will gather around these at night)

**Water edge autotiling:** For each water tile, check 4 cardinal neighbors. Encode as 4-bit mask. Render appropriate shore edge variant.

### Time System

- 1 game day = 2400 ticks = 40 seconds real-time at 60tps
- `timeOfDay`: float 0.0–1.0
  - 0.00–0.15: deep night
  - 0.15–0.25: dawn transition
  - 0.25–0.70: daytime
  - 0.70–0.80: dusk transition
  - 0.80–1.00: night
- Seasons cycle every 20 game days: spring → summer → autumn → winter
- Season affects: food regrowth rate, weather probabilities, tree sprite variants (autumn colors, snow), temperature modifier on NPC energy drain

### Weather System

States: `clear` | `cloudy` | `rain` | `storm` | `snow` | `fog`

Transition every 200–600 ticks (randomized). Transition probabilities weighted by season:
- Spring: higher rain chance
- Summer: mostly clear, rare storms
- Autumn: frequent rain and storms, fog
- Winter: snow replaces rain, fog

Weather affects:
- NPC safety need (storms lower it)
- NPC energy drain (cold/wet increases it)
- Visual rendering (particles, tint, lighting)
- Audio (rain sounds, thunder)

### NPC System

**Starting population:** 25 NPCs on random walkable tiles.

**Needs:**
```typescript
interface Needs {
  hunger: number;     // 0=starving, 1=full
  energy: number;     // 0=exhausted, 1=rested
  social: number;     // 0=isolated, 1=fulfilled
  curiosity: number;  // 0=bored, 1=stimulated
  safety: number;     // 0=terrified, 1=safe
}
```

**Drain rates per tick (gameplay config):**
- hunger: -0.003 base, -0.005 when moving, -0.006 in cold/storm
- energy: -0.004 base, -0.006 when moving, -0.002 when resting
- social: -0.002 when no NPC within 5 tiles
- curiosity: -0.002 when in same 10-tile radius for 500+ ticks
- safety: -0.05 during storm, -0.03 at night outdoors, +0.01 passively in shelter/daytime

**Recovery:**
- hunger: +0.3 on eating (30 tick eating animation)
- energy: +0.02/tick resting, x2 in shelter
- social: +0.01/tick when NPC within 3 tiles
- curiosity: +0.2 on visiting new tile
- safety: +0.01/tick in shelter, during day, in clear weather

**Death:** hunger at 0 for 200 ticks → NPC dies (fade-out animation, log event)
**Spawning:** population < 15 → spawn at random location. Two NPCs with social > 0.8 near each other 500+ ticks → spawn child nearby.

### NPC Memory

```typescript
interface Memory {
  type: 'found_food' | 'danger' | 'met_npc' | 'found_shelter' | 'discovered_area' | 'npc_died';
  tick: number;
  x: number;
  y: number;
  significance: number;  // 0–1, decays over time
  relatedNpcId?: string;
  detail?: string;
}
```

- Capacity: 50 per NPC. Lowest significance dropped when full.
- Decay: -0.001 significance per tick.
- High-significance events: large need deltas, first encounters, deaths nearby.

### Behavior Tree

Priority order (first match wins):

1. **SURVIVE**: hunger < 0.15 → pathfind to known food, eat
2. **SHELTER**: safety < 0.3 OR (storm AND not sheltered) → pathfind to cave/shelter
3. **REST**: energy < 0.2 → stop, rest in place or move to shelter
4. **SOCIALIZE**: social < 0.3 AND npc within 15 tiles → approach nearest NPC
5. **EXPLORE**: curiosity < 0.3 → move toward unvisited tiles
6. **MAINTAIN**: hunger < 0.5 → forage | energy < 0.5 → rest | social < 0.5 → socialize if nearby
7. **DEFAULT**: explore

**Pathfinding:** A* on tile grid. Water and cave walls impassable. Stone costs 1.5, dirt costs 0.8, grass costs 1.0.

### Perception (built every tick per NPC)

```typescript
interface Perception {
  nearbyTiles: TileInfo[];        // within 8-tile radius
  nearbyObjects: ObjectInfo[];
  nearbyNPCs: NPCInfo[];
  needs: Needs;
  relevantMemories: Memory[];     // top 5 by significance
  timeOfDay: number;
  weather: WeatherState;
  season: string;
  currentTick: number;
  cameraX: number;                // player camera position (for future ML)
  cameraY: number;
  cameraZoom: number;
}
```

### Action

```typescript
type ActionType = 'FORAGE' | 'REST' | 'SEEK_SHELTER' | 'EXPLORE' | 'SOCIALIZE' | 'IDLE';

interface Action {
  type: ActionType;
  targetX: number;
  targetY: number;
  targetNpcId?: string;
}
```

### Data Logging

Every decision logged to an in-memory buffer, downloadable as JSONL:

```json
{
  "schema_version": "1.0",
  "tick": 48201,
  "npc_id": "npc_14",
  "perception": {
    "nearby_tiles_summary": {"grass": 12, "water": 3, "stone": 2},
    "nearby_npcs": [{"id": "npc_07", "dx": 3, "dy": -2}],
    "nearby_objects": [{"type": "berry_bush", "dx": 1, "dy": 1, "state": "ripe"}],
    "needs": {"hunger": 0.7, "energy": 0.3, "social": 0.5, "curiosity": 0.8, "safety": 0.9},
    "top_memories": [{"type": "found_food", "ticks_ago": 200}],
    "weather": "rain",
    "time_of_day": 0.65
  },
  "decision": "SEEK_SHELTER",
  "outcome": {"needs_delta": {"energy": 0.01, "safety": 0.2}, "event": "found_cave"}
}
```

---

## UI Layout

### Desktop (landscape)

```
┌──────────────────────────────────────────────────────────┐
│ Day 4 ☀ Afternoon  Clear  🌡 Warm    [Minimap]  NPCs:24 │
│                                       ┌───────┐          │
│                                       │ ····· │          │
│          GAME CANVAS                  │ ·□··· │          │
│        (full remaining space)         │ ····· │          │
│                                       └───────┘          │
│                                                          │
│                                    ┌─────────────────┐   │
│                                    │  NPC Info Panel  │   │
│                                    │  (when selected) │   │
│                                    │  slides in from  │   │
│                                    │  right, 280px)   │   │
│                                    └─────────────────┘   │
│                                                          │
│  ⏸ ▶ ▶▶ ▶▶▶   🔊━━━○━━━                                │
│  Action Dist: ████ FOR ███ RST ██ SHL ███ EXP ██ SOC    │
└──────────────────────────────────────────────────────────┘
```

### Mobile (portrait)

```
┌────────────────────────┐
│ D4 ☀ Afternoon  NPCs:24│
│ ┌────┐                  │
│ │mini│   GAME CANVAS    │
│ │map │   (top 60%)      │
│ └────┘                  │
│                         │
│                         │
│                         │
├─────────────────────────┤
│  NPC Info Panel          │
│  (bottom 40%, slides up │
│   when NPC tapped)      │
│                         │
│  ⏸ ▶ ▶▶ ▶▶▶  🔊━━━○━━ │
└─────────────────────────┘
```

### Welcome Screen

On first load, show a centered panel:

```
╔═══════════════════════════════════╗
║        🌿 LIVING WORLDS 🌿       ║
║                                   ║
║   A world that thinks for itself  ║
║                                   ║
║   World Seed: [___42___]          ║
║                                   ║
║   [🌱 Generate World]            ║
║                                   ║
║   Controls:                       ║
║   Drag/Swipe: Pan                 ║
║   Scroll/Pinch: Zoom              ║
║   Click/Tap NPC: Inspect          ║
║   Space: Pause  1-4: Speed        ║
╚═══════════════════════════════════╝
```

After clicking Generate, the world generates with a brief loading animation, then the game begins.

### NPC Info Panel Contents

When an NPC is selected:

```
┌─────────────────────────────┐
│ ╔═══╗  Villager #14         │
│ ║ 🧑 ║  Mood: Content        │
│ ╚═══╝  Action: FORAGING     │
│         → Berry bush [12,45] │
│                              │
│  Hunger   ████████░░  78%    │
│  Energy   ████░░░░░░  35%    │
│  Social   ██████░░░░  52%    │
│  Curiosity████████░░  81%    │
│  Safety   █████████░  92%    │
│                              │
│  Memories:                   │
│  · Found berries [12,45]     │
│    200 ticks ago             │
│  · Met Villager #3 [20,30]   │
│    450 ticks ago             │
│  · Fled storm to cave        │
│    800 ticks ago             │
│                              │
│  Tiles visited: 234 / 16384  │
│  Age: 4,200 ticks (1.75 days)│
└─────────────────────────────┘
```

Need bars are color-coded: green > 60%, yellow 30-60%, red < 30%.

---

## Configuration

```typescript
// Gameplay config (balanced for player enjoyment)
const GAMEPLAY_CONFIG = {
  worldSize: 128,
  initialNPCCount: 25,
  minPopulation: 15,
  hungerDrain: 0.003,
  energyDrain: 0.004,
  socialDrain: 0.002,
  curiosityDrain: 0.002,
  safetyRecovery: 0.01,
  foodRespawnTicks: 250,
  foodPerBush: 6,
  bushDensity: 0.03,
  treeDensity: 0.08,
  nightEnergyMultiplier: 1.3,
  stormEnergyMultiplier: 1.5,
  stormSafetyPenalty: 0.05,
  socialRange: 5,
  socialRecovery: 0.01,
  curiosityStaleRadius: 10,
  curiosityStaleTicks: 500,
  stormFrequency: 0.04,
  seasonalCycleDays: 20,
  winterFoodReduction: 0.4,
  starvationTicks: 200,
  socialBondThreshold: 0.8,
  socialBondTicks: 500,
  memoryCapacity: 50,
  memoryDecayRate: 0.001,
};

// Training config (harsh for diverse training data)
const TRAINING_CONFIG = {
  ...GAMEPLAY_CONFIG,
  hungerDrain: 0.006,
  energyDrain: 0.008,
  socialDrain: 0.004,
  curiosityDrain: 0.004,
  safetyRecovery: 0.005,
  foodRespawnTicks: 500,
  foodPerBush: 3,
  bushDensity: 0.02,
  nightEnergyMultiplier: 1.8,
  stormEnergyMultiplier: 2.0,
  stormSafetyPenalty: 0.15,
  stormFrequency: 0.12,
  seasonalCycleDays: 10,
  winterFoodReduction: 0.8,
  starvationTicks: 150,
};
```

---

## Package Configuration

### package.json
```json
{
  "name": "living-worlds",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 3000",
    "build": "tsc && vite build",
    "preview": "vite preview --host 0.0.0.0 --port 3000"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

### vite.config.ts
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
```

**IMPORTANT:** The dev server must bind to `0.0.0.0` so GitHub Codespaces can forward the port. This is non-negotiable.

---

## Performance Requirements

- **60 FPS on desktop**, 30+ FPS on mobile
- **Only render visible tiles.** Calculate camera viewport and only draw tiles within it plus 1-tile margin.
- **Cache static layers.** Terrain doesn't change often — render it to an offscreen canvas and only redraw when the camera moves or season changes. NPCs, weather, and lighting redraw every frame on top of the cached terrain.
- **Particle pooling.** Rain/snow particles are pre-allocated in a pool. No garbage collection pressure from particle creation/destruction.
- **Canvas layers.** Use multiple stacked canvases if needed:
  1. Terrain + objects (cached, redrawn on camera move)
  2. NPCs + animations (redrawn every frame)
  3. Weather particles (redrawn every frame)
  4. Lighting overlay (redrawn every frame)
  5. UI overlay (redrawn on state change)

---

## How to Run

### GitHub Codespaces (primary target)
1. Open repo on GitHub
2. Click Code → Codespaces → Create codespace
3. In terminal: `npm install && npm run dev`
4. Codespaces auto-detects port 3000 and shows "Open in Browser"
5. Open on phone — the game is running

### Local
```bash
git clone <repo>
cd living-worlds
npm install
npm run dev
# Open http://localhost:3000
```

---

## Validation Checklist

Before submitting, ALL of these must be true:

**Build:**
- [ ] `npm install` succeeds with no errors
- [ ] `npm run dev` starts server on port 3000 with no TypeScript errors
- [ ] `npm run build` produces a production build with no errors
- [ ] Zero TypeScript `any` types (strict mode)

**World:**
- [ ] Welcome screen appears with seed input and generate button
- [ ] World generates from seed — same seed = same world
- [ ] Terrain shows grass, dirt, water, sand, stone, cave walls with visual variety
- [ ] Water tiles animate with rippling wave effect
- [ ] Water edges have shoreline transitions (autotiling)
- [ ] Trees, bushes, rocks, mushrooms, campfires visible on appropriate terrain
- [ ] Trees have gentle wind sway animation

**Time & Weather:**
- [ ] Day/night cycle visible — lighting smoothly transitions through dawn/day/dusk/night
- [ ] Night is dramatically darker, light sources (campfires) glow prominently
- [ ] Shadows cast by trees rotate with time of day
- [ ] Rain particles fall diagonally with splash effects on ground
- [ ] Snow particles drift gently with horizontal wave motion
- [ ] Storm produces lightning flash with screen shake
- [ ] Season indicator changes and affects world visually (autumn trees, winter snow)

**NPCs:**
- [ ] 25 NPCs visible with distinct pixel-art appearances
- [ ] NPCs move smoothly between tiles (interpolated, not teleporting)
- [ ] NPCs face correct direction when moving
- [ ] Walk animation visible (leg movement)
- [ ] Idle breathing animation visible when standing still
- [ ] Action indicators visible (Zzz when sleeping, picking animation when foraging)
- [ ] Mood aura visible beneath NPCs
- [ ] NPCs perform varied actions (not all doing the same thing)
- [ ] NPCs die (fade out) when starving
- [ ] New NPCs spawn (fade in) when population drops

**Controls:**
- [ ] Touch: swipe pans, pinch zooms, tap selects NPC
- [ ] Mouse: drag pans, scroll zooms, click selects NPC
- [ ] Keyboard: arrows pan, +/- zoom, space pauses, 1-4 set speed
- [ ] Camera panning is smooth with momentum
- [ ] Zoom smoothly interpolates
- [ ] Camera clamps to world bounds

**UI:**
- [ ] HUD shows day count, time of day, weather, season, NPC count
- [ ] Speed controls work: pause, 1x, 5x, 20x, 100x
- [ ] Minimap renders in corner showing full world, NPC dots, camera rectangle
- [ ] Clicking minimap jumps camera to that location
- [ ] Clicking an NPC opens info panel with smooth slide animation
- [ ] Info panel shows all 5 need bars with correct color coding
- [ ] Info panel shows current action and target
- [ ] Info panel shows recent memories
- [ ] Clicking elsewhere closes info panel
- [ ] Debug overlay (Tab key) shows action distribution bars

**Audio:**
- [ ] Ambient audio plays (wind during day, crickets at night)
- [ ] Rain audio activates during rain/storm
- [ ] Volume control works
- [ ] Audio doesn't auto-play (requires user interaction to start per browser policy)

**Data:**
- [ ] Decision log accumulates in memory
- [ ] Download button exports JSONL file
- [ ] Each log entry has correct schema with perception, decision, outcome

**Performance:**
- [ ] Smooth 60 FPS on desktop (check with browser dev tools)
- [ ] 30+ FPS on mobile
- [ ] No visible frame drops during rain/storm with 25+ NPCs
- [ ] No memory leaks during extended play (monitor with dev tools)

**Responsive:**
- [ ] Desktop landscape layout works
- [ ] Mobile portrait layout works
- [ ] UI elements are touch-target sized on mobile (minimum 44x44px)
- [ ] Info panel renders as side panel on desktop, bottom sheet on mobile

---

## Summary

Build a complete, polished, browser-based pixel world simulation. When I run `npm install && npm run dev` in GitHub Codespaces and open port 3000 on my phone, I should see a beautiful living world with animated water, swaying trees, dynamic lighting, weather particles, and 25 autonomous NPCs making intelligent decisions — with a UI that feels like a released indie game.

No sprite sheet image files needed — generate all graphics programmatically on canvas for maximum control and zero asset dependencies.

The codebase must be clean TypeScript with strict mode, modular architecture ready for neural network integration, and a complete training data pipeline running silently in the background.

Build it all. Make it work. Make it beautiful. Make it run on my phone.
