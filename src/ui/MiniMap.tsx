import React, { useRef, useEffect, useCallback } from 'react';
import { useSimulation } from '../engine/SimulationState';
import { TileType } from '../world/TileMap';
import type { TileMap } from '../world/TileMap';

const MINIMAP_SIZE = 120;
const MINIMAP_SIZE_MOBILE = 90;

const TILE_COLORS: Record<string, string> = {
  [TileType.DeepWater]: '#1a3a5c',
  [TileType.ShallowWater]: '#3366aa',
  [TileType.Sand]: '#d2be82',
  [TileType.DryDirt]: '#8c643c',
  [TileType.Grass]: '#4c9900',
  [TileType.FlowerGrass]: '#5aaa22',
  [TileType.DenseGrass]: '#337700',
  [TileType.DirtPath]: '#aa8250',
  [TileType.Stone]: '#808080',
  [TileType.CaveWall]: '#282428',
};

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  tileMap: TileMap,
  npcs: { x: number; y: number; alive: boolean }[],
  cameraX: number,
  cameraY: number,
  cameraZoom: number,
  canvasW: number,
  canvasH: number,
  minimapSize: number,
): void {
  const scale = minimapSize / tileMap.width;

  ctx.clearRect(0, 0, minimapSize, minimapSize);

  // Draw terrain
  for (let y = 0; y < tileMap.height; y++) {
    for (let x = 0; x < tileMap.width; x++) {
      const tile = tileMap.getTile(x, y);
      if (!tile) continue;
      ctx.fillStyle = TILE_COLORS[tile.type] ?? '#000';
      ctx.fillRect(
        Math.floor(x * scale),
        Math.floor(y * scale),
        Math.ceil(scale),
        Math.ceil(scale),
      );
    }
  }

  // Draw NPCs as white dots
  ctx.fillStyle = '#ffffff';
  for (const npc of npcs) {
    if (!npc.alive) continue;
    const px = Math.floor(npc.x * scale);
    const py = Math.floor(npc.y * scale);
    ctx.fillRect(px, py, Math.max(2, Math.ceil(scale)), Math.max(2, Math.ceil(scale)));
  }

  // Draw camera viewport rectangle
  const TILE_PX = 16;
  const viewW = canvasW / (cameraZoom * TILE_PX);
  const viewH = canvasH / (cameraZoom * TILE_PX);
  const rx = (cameraX - viewW / 2) * scale;
  const ry = (cameraY - viewH / 2) * scale;
  const rw = viewW * scale;
  const rh = viewH * scale;

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(rx, ry, rw, rh);
}

const MiniMap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useSimulation(s => s.state);
  const cameraX = useSimulation(s => s.cameraX);
  const cameraY = useSimulation(s => s.cameraY);
  const cameraZoom = useSimulation(s => s.cameraZoom);
  const setCamera = useSimulation(s => s.setCamera);

  // Repaint minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    // Use window inner dimensions as approximation for main canvas size
    drawMinimap(ctx, state.tileMap, state.npcs, cameraX, cameraY, cameraZoom, window.innerWidth, window.innerHeight, size);
  }, [state, cameraX, cameraY, cameraZoom]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!state) return;
      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const size = canvas.width;
      const scale = size / state.tileMap.width;
      const worldX = mx / scale;
      const worldY = my / scale;
      setCamera(worldX, worldY, cameraZoom);
    },
    [state, cameraZoom, setCamera],
  );

  if (!state) return null;

  return (
    <>
      {/* Desktop: top-right */}
      <div className="hidden sm:block absolute top-12 right-2 z-20">
        <div className="bg-black/70 backdrop-blur-sm rounded border border-gray-700/50 p-1">
          <canvas
            ref={canvasRef}
            width={MINIMAP_SIZE}
            height={MINIMAP_SIZE}
            onClick={handleClick}
            className="cursor-pointer block"
            style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE, imageRendering: 'pixelated' }}
          />
        </div>
      </div>

      {/* Mobile: top-left, smaller */}
      <div className="sm:hidden absolute top-12 left-2 z-20">
        <div className="bg-black/70 backdrop-blur-sm rounded border border-gray-700/50 p-1">
          <canvas
            width={MINIMAP_SIZE_MOBILE}
            height={MINIMAP_SIZE_MOBILE}
            onClick={handleClick}
            className="cursor-pointer block"
            style={{ width: MINIMAP_SIZE_MOBILE, height: MINIMAP_SIZE_MOBILE, imageRendering: 'pixelated' }}
          />
        </div>
      </div>
    </>
  );
};

export default MiniMap;
