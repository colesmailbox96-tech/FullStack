# Living Worlds - AI-Driven Pixel World Simulator

A beautiful, browser-based 2D pixel-art world simulation where 25+ autonomous NPCs live, forage, rest, and interact in a dynamic environment with weather, seasons, and day/night cycles.

![Living Worlds](https://img.shields.io/badge/version-0.1.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)

## Features

- **Dynamic World**: Procedurally generated worlds from seeds with grass, dirt, water, sand, stone, and caves
- **Autonomous NPCs**: 25 NPCs with needs, memories, and moods making intelligent decisions
- **Weather System**: Rain, snow, storms with lightning, and fog effects
- **Day/Night Cycle**: Dynamic lighting that changes throughout the day with shadows and firelight
- **Seasonal Changes**: Visual transitions through spring, summer, autumn, and winter
- **Touch & Mouse Controls**: Pan, zoom, and interact with the world on desktop or mobile
- **Training Data Export**: Generates structured decision logs for future AI training

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

## Specification

For the complete technical specification and build instructions, see [LIVING_WORLDS_WEB_README.md](./LIVING_WORLDS_WEB_README.md).

## License

This project is part of the Living Worlds ecosystem.
