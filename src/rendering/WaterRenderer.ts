import { rgba } from '../utils/Color';
import { hashCoord } from '../utils/Math';
import type { TileMap } from '../world/TileMap';
import { TileType } from '../world/TileMap';
import type { Camera } from './Camera';
import { TILE_SIZE } from './constants';
const FRAME_COUNT = 4;
const FRAME_TICKS = 15;

const DEEP_WATER: [number, number, number] = [30, 60, 150];
const SHALLOW_WATER: [number, number, number] = [50, 100, 200];

export class WaterRenderer {
  constructor() {
    // no state needed
  }

  render(
    ctx: CanvasRenderingContext2D,
    tileMap: TileMap,
    camera: Camera,
    tick: number,
  ): void {
    const bounds = camera.getVisibleBounds(TILE_SIZE);
    const minX = bounds.minX;
    const minY = bounds.minY;
    const maxX = bounds.maxX;
    const maxY = bounds.maxY;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const tile = tileMap.getTile(x, y);
        if (!tile) continue;

        const isDeep = tile.type === TileType.DeepWater;
        const isShallow = tile.type === TileType.ShallowWater;
        if (!isDeep && !isShallow) continue;

        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        const hash = hashCoord(x, y);

        // Frame offset per tile for ripple effect
        const frameOffset = ((hash >>> 4) % FRAME_COUNT);
        const frame = (Math.floor(tick / FRAME_TICKS) + frameOffset) % FRAME_COUNT;

        // Base water color
        const base = isDeep ? DEEP_WATER : SHALLOW_WATER;
        ctx.fillStyle = rgba(base[0], base[1], base[2]);
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // Animated highlights: shifting positions based on frame
        this.drawHighlights(ctx, px, py, hash, frame, isDeep);

        // Shoreline foam
        if (isShallow) {
          this.drawFoam(ctx, tileMap, x, y, px, py, tick);
        }

        // Water edge autotiling
        const edgeMask = tileMap.getWaterEdgeMask(x, y);
        if (edgeMask > 0) {
          this.drawEdges(ctx, px, py, edgeMask);
        }
      }
    }
  }

  private drawHighlights(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    hash: number,
    frame: number,
    isDeep: boolean,
  ): void {
    const highlightColor = isDeep
      ? rgba(60, 90, 180, 0.4)
      : rgba(100, 160, 240, 0.5);
    ctx.fillStyle = highlightColor;

    // 4 highlight positions that shift per frame
    for (let i = 0; i < 3; i++) {
      const baseX = ((hash * (i + 1) * 7) >>> 0) % (TILE_SIZE - 2);
      const baseY = ((hash * (i + 3) * 11) >>> 0) % (TILE_SIZE - 1);
      const offsetX = (frame * 2 + i) % TILE_SIZE;
      const hx = (baseX + offsetX) % (TILE_SIZE - 1);
      const hy = (baseY + frame) % (TILE_SIZE - 1);
      ctx.fillRect(px + hx, py + hy, 2, 1);
    }
  }

  private drawFoam(
    ctx: CanvasRenderingContext2D,
    tileMap: TileMap,
    tileX: number,
    tileY: number,
    px: number,
    py: number,
    tick: number,
  ): void {
    ctx.fillStyle = rgba(220, 230, 255, 0.4);

    // Check adjacent land tiles for foam
    if (!tileMap.isWater(tileX, tileY - 1)) {
      // Foam at top
      for (let i = 0; i < TILE_SIZE; i += 2) {
        const foamY = Math.sin(tick * 0.03 + i * 0.5) * 0.5;
        ctx.fillRect(px + i, py + Math.round(foamY), 2, 1);
      }
    }
    if (!tileMap.isWater(tileX, tileY + 1)) {
      for (let i = 0; i < TILE_SIZE; i += 2) {
        const foamY = Math.sin(tick * 0.03 + i * 0.5) * 0.5;
        ctx.fillRect(px + i, py + TILE_SIZE - 1 + Math.round(foamY), 2, 1);
      }
    }
    if (!tileMap.isWater(tileX - 1, tileY)) {
      for (let i = 0; i < TILE_SIZE; i += 2) {
        const foamX = Math.sin(tick * 0.03 + i * 0.5) * 0.5;
        ctx.fillRect(px + Math.round(foamX), py + i, 1, 2);
      }
    }
    if (!tileMap.isWater(tileX + 1, tileY)) {
      for (let i = 0; i < TILE_SIZE; i += 2) {
        const foamX = Math.sin(tick * 0.03 + i * 0.5) * 0.5;
        ctx.fillRect(px + TILE_SIZE - 1 + Math.round(foamX), py + i, 1, 2);
      }
    }
  }

  private drawEdges(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    mask: number,
  ): void {
    ctx.fillStyle = rgba(90, 70, 40, 0.3);

    // bit 0 = top has land
    if (mask & 1) {
      ctx.fillRect(px, py, TILE_SIZE, 2);
    }
    // bit 1 = right has land
    if (mask & 2) {
      ctx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);
    }
    // bit 2 = bottom has land
    if (mask & 4) {
      ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
    }
    // bit 3 = left has land
    if (mask & 8) {
      ctx.fillRect(px, py, 2, TILE_SIZE);
    }
  }
}
