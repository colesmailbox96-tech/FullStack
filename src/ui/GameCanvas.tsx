import React, { useRef, useEffect, useCallback } from 'react';
import { useSimulation } from '../engine/SimulationState';
import { Renderer } from '../rendering/Renderer';
import { InputManager } from '../input/InputManager';
import { AmbientAudio } from '../audio/AmbientAudio';
import { TILE_SIZE } from '../rendering/constants';
import type { NPC } from '../entities/NPC';

const MAX_TICKS_PER_FRAME = 100;

function findNearestNPC(npcs: NPC[], worldX: number, worldY: number): NPC | null {
  let best: NPC | null = null;
  let bestDist = Infinity;
  for (const npc of npcs) {
    if (!npc.alive) continue;
    const dx = npc.x - worldX;
    const dy = npc.y - worldY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1 && dist < bestDist) {
      bestDist = dist;
      best = npc;
    }
  }
  return best;
}

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  const audioRef = useRef<AmbientAudio | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const accumRef = useRef<number>(0);

  const storeRef = useRef(useSimulation.getState);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    canvas.width = w;
    canvas.height = h;
    renderer.resize(w, h);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set initial canvas size
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }

    const renderer = new Renderer(canvas);
    const input = new InputManager(canvas);
    const audio = new AmbientAudio();

    rendererRef.current = renderer;
    inputRef.current = input;
    audioRef.current = audio;

    const camera = renderer.getCamera();

    // Initialize camera from store
    const initialStore = useSimulation.getState();
    camera.targetX = initialStore.cameraX;
    camera.targetY = initialStore.cameraY;
    camera.targetZoom = initialStore.cameraZoom;
    camera.x = initialStore.cameraX;
    camera.y = initialStore.cameraY;
    camera.zoom = initialStore.cameraZoom;

    // Tab key listener for debug toggle
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        useSimulation.getState().toggleDebug();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    window.addEventListener('resize', handleResize);

    const TICK_INTERVAL = 1000 / 60; // ~16.67ms per frame

    const gameLoop = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const dt = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      const store = useSimulation.getState();
      const { state, speed, volume } = store;

      // Process input
      input.update();

      // Handle drag (pan camera)
      const drag = input.consumeDrag();
      if (drag.dx !== 0 || drag.dy !== 0) {
        const inputState = input.getState();
        // Use immediate panning for touch to avoid stuttering
        if (inputState.isTouchDrag) {
          camera.panImmediate(
            -drag.dx / (camera.zoom * TILE_SIZE),
            -drag.dy / (camera.zoom * TILE_SIZE),
          );
        } else {
          camera.pan(
            -drag.dx / (camera.zoom * TILE_SIZE),
            -drag.dy / (camera.zoom * TILE_SIZE),
          );
        }
      }

      // Handle zoom
      const zoomDelta = input.consumeZoom();
      if (zoomDelta !== 0) {
        camera.setZoom(camera.targetZoom * (1 + zoomDelta * 0.15));
      }

      // Handle click (NPC selection)
      const click = input.consumeClick();
      if (click && state) {
        const worldCoords = camera.screenToWorld(click.x, click.y);
        const nearest = findNearestNPC(state.npcs, worldCoords.x, worldCoords.y);
        store.selectNPC(nearest ? nearest.id : null);
      }

      // Tick simulation based on speed
      if (state && speed > 0) {
        const ticksThisFrame = Math.min(speed, MAX_TICKS_PER_FRAME);
        for (let i = 0; i < ticksThisFrame; i++) {
          store.tick();
        }
      }

      // Update audio (init lazily on first interaction)
      if (state) {
        audio.init();
        audio.setVolume(volume);
        audio.update(state.timeSystem.timeOfDay, state.weather.current, state.tick);
      }

      // Compute interpolation alpha
      accumRef.current += dt;
      const alpha = Math.min(accumRef.current / TICK_INTERVAL, 1);
      accumRef.current = accumRef.current % TICK_INTERVAL;

      // Render
      const currentState = useSimulation.getState().state;
      if (currentState) {
        renderer.render(currentState, alpha, input.getState().isDragging);
      }

      // Sync camera back to store
      store.setCamera(camera.targetX, camera.targetY, camera.targetZoom);

      rafRef.current = requestAnimationFrame(gameLoop);
    };

    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      input.destroy();
      audio.destroy();
      rendererRef.current = null;
      inputRef.current = null;
      audioRef.current = null;
    };
  }, [handleResize]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

export default GameCanvas;
