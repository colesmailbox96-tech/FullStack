# Living Worlds - AI-Driven Pixel World Simulator

A beautiful, browser-based 2D pixel-art world simulation where 25+ autonomous NPCs live, forage, rest, and interact in a dynamic environment with weather, seasons, and day/night cycles.

![Living Worlds](https://img.shields.io/badge/version-0.1.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)

## Features

### Core Features
- **Dynamic World**: Procedurally generated worlds from seeds with grass, dirt, water, sand, stone, and caves
- **Autonomous NPCs**: 25 NPCs with needs, memories, and moods making intelligent decisions
- **Weather System**: Rain, snow, storms with lightning, and fog effects
- **Day/Night Cycle**: Dynamic lighting that changes throughout the day with shadows and firelight
- **Seasonal Changes**: Visual transitions through spring, summer, autumn, and winter
- **Touch & Mouse Controls**: Pan, zoom, and interact with the world on desktop or mobile
- **Training Data Export**: Generates structured decision logs for future AI training

### Innovative Features (20 New Systems)

1. **NPC Naming System** — Each NPC receives a unique personality-based name (e.g., "Bold Finn", "Curious Elara") based on their dominant trait
2. **Fatigue System** — NPCs accumulate fatigue from continuous work with overwork penalties; different actions cause varying fatigue levels; rest in shelter recovers faster
3. **NPC Mood Emotes** — 12 distinct mood states with emoji indicators (😊 joyful, 😰 distressed, 😴 sleepy, etc.) determined by needs and current action
4. **Seasonal Crop System** — Season-specific crop yields: summer provides 1.2× food with faster regrowth, autumn gives 1.4× harvest bonus, winter causes 0.5× scarcity
5. **NPC Age Tiers** — Five life stages (Child → Young Adult → Adult → Middle Aged → Elder) affecting movement speed, skill gain rate, and need decay
6. **Tool Crafting** — Three new craftable tools: Wooden Axe (faster wood gathering), Stone Pickaxe (faster stone mining), Fishing Rod (food from water)
7. **Reputation System** — NPCs earn reputation (0-100) through trading (+3), crafting (+2), and socializing (+1), advancing through tiers that affect trade willingness
8. **Territory/Home System** — NPCs claim home bases near campfires, building familiarity over time for rest bonuses up to 30%; prefer returning home at night
9. **Group Activity System** — NPCs with strong social bonds can forage, gather, explore, or rest together for efficiency bonuses (up to 2× with diminishing returns)
10. **Weather Forecast** — NPCs with high exploring skill can predict weather changes with increasing accuracy (vague → rough → accurate → precise)
11. **Resource Quality** — Gathered resources have quality tiers (Poor → Normal → Fine → Excellent) with effectiveness multipliers; higher skill improves quality chances
12. **NPC Titles** — 10 earnable titles based on milestones: First Builder, Storm Survivor, Elder Explorer, Master Forager, Social Leader, Wanderer, and more
13. **Population Statistics** — Comprehensive tracking of births, deaths, average lifespan, birth/death rates, and skill distribution across the population
14. **Seasonal Events** — Four unique seasonal events: Spring Festival, Summer Bounty, Autumn Harvest, and Winter Solstice, each with gameplay effect modifiers
15. **NPC Lineage Tracking** — Parent-child relationships tracked across generations with family tree data including siblings, generation counting, and family size
16. **Comfort System** — Environmental comfort calculation considering campfire proximity, group size, shelter, weather, time of day, and season affecting need decay rates
17. **Community Zones** — Campfires create community zones where nearby NPCs receive safety, social, and hunger benefits that scale with zone population
18. **Danger Zones** — Map edges and corners are marked as dangerous with increasing safety penalties; cave areas have mild danger; center is safest
19. **NPC Status Effects** — 8 temporary buff/debuff effects (Well-Fed, Exhausted, Inspired, Lonely, Sheltered, Cold, Energized, Social Butterfly) with need modifiers
20. **World Statistics Dashboard** — Real-time statistics panel showing population trends, resource counts, average NPC needs/skills, action distribution, and weather info

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/colesmailbox96-tech/FullStack.git
cd FullStack

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Controls

### Desktop
- **Mouse**: Click and drag to pan, scroll wheel to zoom
- **Click NPC**: View detailed information panel
- **Keyboard**: Arrow keys to pan, +/- to zoom, Space to pause, 1-4 to set speed
- **Tab**: Toggle debug overlay

### Mobile
- **Touch**: Swipe to pan, pinch to zoom
- **Tap NPC**: View detailed information panel

## Project Structure

```
src/
├── engine/         # Game loop and simulation state
├── world/          # Terrain, weather, time, and pathfinding
├── entities/       # NPCs with needs, memory, and behavior
├── ai/             # Behavior tree AI system
├── rendering/      # Canvas-based rendering with effects
├── input/          # Touch and mouse input handling
├── ui/             # React UI components
├── audio/          # Ambient audio system
├── data/           # Training data logging
└── utils/          # Utility functions
```

## Technology Stack

- **TypeScript** - Type-safe development
- **React 18** - UI framework
- **Vite** - Fast build tool
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Canvas 2D** - High-performance rendering

## Development

The project uses strict TypeScript mode and follows clean architecture principles. All graphics are generated programmatically on canvas - no sprite sheet files needed.

### Available Scripts

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run all tests (617 tests across 41 test files)
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

## Specification

For the complete technical specification and build instructions, see [LIVING_WORLDS_WEB_README.md](./LIVING_WORLDS_WEB_README.md).

## License

This project is part of the Living Worlds ecosystem.
