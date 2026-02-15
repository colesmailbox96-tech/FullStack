import { hashCoord } from '../utils/Math';
import { rgba } from '../utils/Color';
import type { TileMap, Tile } from '../world/TileMap';
import { TileType } from '../world/TileMap';
import type { Season } from '../world/TimeSystem';
import type { Camera } from './Camera';
import { SpriteSheet } from './SpriteSheet';
import { TILE_SIZE } from './constants';

const GRASS_BASE: [number, number, number] = [76, 153, 0];
const DENSE_GRASS_BASE: [number, number, number] = [51, 119, 0];
const DIRT_BASE: [number, number, number] = [153, 102, 51];
const DRY_DIRT_BASE: [number, number, number] = [140, 100, 60];
const SAND_BASE: [number, number, number] = [210, 190, 130];
const STONE_BASE: [number, number, number] = [128, 128, 128];
const CAVE_BASE: [number, number, number] = [40, 36, 40];
const PATH_BASE: [number, number, number] = [170, 130, 80];

const FLOWER_COLORS = ['#ff4466', '#ffaa22', '#aa44ff', '#4488ff', '#ff66aa'];

function seasonGrassColor(season: Season): [number, number, number] {
  switch (season) {
    case 'spring': return [80, 160, 40];
    case 'summer': return GRASS_BASE;
    case 'autumn': return [140, 130, 40];
    case 'winter': return [100, 120, 90];
  }
}

function drawGrassTile(
  ctx: CanvasRenderingContext2D,
  hash: number,
  tick: number,
  season: Season,
  windDirection: number,
  isDense: boolean,
): void {
  const base = isDense ? DENSE_GRASS_BASE : seasonGrassColor(season);
  ctx.fillStyle = rgba(base[0], base[1], base[2]);
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

  // Pixel variation
  const rng = hash;
  for (let i = 0; i < 8; i++) {
    const px = ((rng * (i + 1) * 7) >>> 0) % TILE_SIZE;
    const py = ((rng * (i + 1) * 13) >>> 0) % TILE_SIZE;
    const bright = ((rng * (i + 1)) >>> 0) % 2 === 0 ? 1.15 : 0.85;
    ctx.fillStyle = rgba(base[0] * bright, base[1] * bright, base[2] * bright);
    ctx.fillRect(px, py, 1, 1);
  }

  // Grass blades
  const bladeCount = isDense ? 6 : 3;
  for (let i = 0; i < bladeCount; i++) {
    const bx = ((hash * (i + 3) * 17) >>> 0) % (TILE_SIZE - 2) + 1;
    const height = 2 + ((hash * (i + 5)) >>> 0) % 2;
    const sway = Math.sin(tick * 0.05 + (hash + i) * 0.7 + windDirection) * 1.2;

    const bladeColor = isDense
      ? rgba(30, 100 + ((hash * i) >>> 0) % 20, 0)
      : rgba(50, 130 + ((hash * i) >>> 0) % 30, 0);
    ctx.fillStyle = bladeColor;

    for (let h = 0; h < height; h++) {
      const swayAtH = (sway * h) / height;
      ctx.fillRect(Math.round(bx + swayAtH), TILE_SIZE - 1 - h, 1, 1);
    }
  }
}

function drawFlowerGrass(
  ctx: CanvasRenderingContext2D,
  hash: number,
  tick: number,
  season: Season,
  windDirection: number,
): void {
  drawGrassTile(ctx, hash, tick, season, windDirection, false);

  const flowerCount = 2 + (hash >>> 0) % 2;
  for (let i = 0; i < flowerCount; i++) {
    const fx = ((hash * (i + 11) * 23) >>> 0) % (TILE_SIZE - 2) + 1;
    const fy = ((hash * (i + 7) * 19) >>> 0) % (TILE_SIZE - 4) + 2;
    const colorIdx = ((hash * (i + 1)) >>> 0) % FLOWER_COLORS.length;
    const sway = Math.sin(tick * 0.04 + (hash + i) * 0.5 + windDirection) * 0.8;

    ctx.fillStyle = FLOWER_COLORS[colorIdx];
    ctx.fillRect(Math.round(fx + sway), fy, 2, 2);
    ctx.fillRect(Math.round(fx + sway) + 1, fy - 1, 1, 1);
  }
}

function drawDirtTile(ctx: CanvasRenderingContext2D, hash: number, base: [number, number, number]): void {
  ctx.fillStyle = rgba(base[0], base[1], base[2]);
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

  for (let i = 0; i < 10; i++) {
    const px = ((hash * (i + 1) * 11) >>> 0) % TILE_SIZE;
    const py = ((hash * (i + 1) * 17) >>> 0) % TILE_SIZE;
    const dark = 0.8 + (((hash * (i + 2)) >>> 0) % 40) / 100;
    ctx.fillStyle = rgba(base[0] * dark, base[1] * dark, base[2] * dark);
    ctx.fillRect(px, py, 1, 1);
  }
}

function drawSandTile(ctx: CanvasRenderingContext2D, hash: number): void {
  ctx.fillStyle = rgba(SAND_BASE[0], SAND_BASE[1], SAND_BASE[2]);
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

  for (let i = 0; i < 8; i++) {
    const px = ((hash * (i + 3) * 13) >>> 0) % TILE_SIZE;
    const py = ((hash * (i + 5) * 7) >>> 0) % TILE_SIZE;
    ctx.fillStyle = rgba(225, 210, 150, 0.6);
    ctx.fillRect(px, py, 1, 1);
  }
}

function drawStoneTile(ctx: CanvasRenderingContext2D, hash: number): void {
  ctx.fillStyle = rgba(STONE_BASE[0], STONE_BASE[1], STONE_BASE[2]);
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

  // Darker crack pixels
  for (let i = 0; i < 6; i++) {
    const px = ((hash * (i + 2) * 19) >>> 0) % TILE_SIZE;
    const py = ((hash * (i + 4) * 23) >>> 0) % TILE_SIZE;
    ctx.fillStyle = rgba(80, 80, 80);
    ctx.fillRect(px, py, 1, 1);
    if (i < 3) {
      ctx.fillRect(px + 1, py, 1, 1);
    }
  }
  // Lighter highlights
  for (let i = 0; i < 4; i++) {
    const px = ((hash * (i + 7) * 31) >>> 0) % TILE_SIZE;
    const py = ((hash * (i + 9) * 11) >>> 0) % TILE_SIZE;
    ctx.fillStyle = rgba(160, 160, 160, 0.5);
    ctx.fillRect(px, py, 1, 1);
  }
}

function drawCaveWall(ctx: CanvasRenderingContext2D, hash: number): void {
  ctx.fillStyle = rgba(CAVE_BASE[0], CAVE_BASE[1], CAVE_BASE[2]);
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

  for (let i = 0; i < 5; i++) {
    const px = ((hash * (i + 1) * 29) >>> 0) % TILE_SIZE;
    const py = ((hash * (i + 3) * 37) >>> 0) % TILE_SIZE;
    ctx.fillStyle = rgba(25, 20, 25);
    ctx.fillRect(px, py, 1, 1);
  }
}

function drawPathTile(ctx: CanvasRenderingContext2D, hash: number): void {
  ctx.fillStyle = rgba(PATH_BASE[0], PATH_BASE[1], PATH_BASE[2]);
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

  for (let i = 0; i < 6; i++) {
    const px = ((hash * (i + 1) * 7) >>> 0) % TILE_SIZE;
    const py = ((hash * (i + 2) * 11) >>> 0) % TILE_SIZE;
    const light = 0.9 + (((hash * (i + 5)) >>> 0) % 20) / 100;
    ctx.fillStyle = rgba(PATH_BASE[0] * light, PATH_BASE[1] * light, PATH_BASE[2] * light);
    ctx.fillRect(px, py, 1, 1);
  }
}

function drawStaticTile(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  hash: number,
): void {
  switch (tile.type) {
    case TileType.DryDirt:
      drawDirtTile(ctx, hash, DRY_DIRT_BASE);
      break;
    case TileType.Sand:
      drawSandTile(ctx, hash);
      break;
    case TileType.Stone:
      drawStoneTile(ctx, hash);
      break;
    case TileType.CaveWall:
      drawCaveWall(ctx, hash);
      break;
    case TileType.DirtPath:
      drawPathTile(ctx, hash);
      break;
    default:
      drawDirtTile(ctx, hash, DIRT_BASE);
      break;
  }
}

const CACHE_MOVE_THRESHOLD = 2;

export class TerrainRenderer {
  private terrainCache: HTMLCanvasElement | null;
  private cacheX: number;
  private cacheY: number;
  private cacheSeason: Season | null;
  private spriteSheet: SpriteSheet;

  constructor() {
    this.terrainCache = null;
    this.cacheX = -9999;
    this.cacheY = -9999;
    this.cacheSeason = null;
    this.spriteSheet = new SpriteSheet();
  }

  render(
    ctx: CanvasRenderingContext2D,
    tileMap: TileMap,
    camera: Camera,
    tick: number,
    season: Season,
    windDirection: number,
  ): void {
    const bounds = camera.getVisibleBounds(TILE_SIZE);
    const minX = Math.max(0, bounds.minX);
    const minY = Math.max(0, bounds.minY);
    const maxX = Math.min(tileMap.width - 1, bounds.maxX);
    const maxY = Math.min(tileMap.height - 1, bounds.maxY);

    const needsCache =
      !this.terrainCache ||
      Math.abs(camera.x - this.cacheX) > CACHE_MOVE_THRESHOLD ||
      Math.abs(camera.y - this.cacheY) > CACHE_MOVE_THRESHOLD ||
      this.cacheSeason !== season;

    if (needsCache) {
      this.rebuildCache(tileMap, minX, minY, maxX, maxY, season);
      this.cacheX = camera.x;
      this.cacheY = camera.y;
      this.cacheSeason = season;
    }

    // Draw cached static terrain
    if (this.terrainCache) {
      ctx.drawImage(
        this.terrainCache,
        minX * TILE_SIZE,
        minY * TILE_SIZE,
      );
    }

    // Draw animated tiles on top (grass blades that sway)
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const tile = tileMap.getTile(x, y);
        if (!tile) continue;

        if (
          tile.type === TileType.Grass ||
          tile.type === TileType.DenseGrass ||
          tile.type === TileType.FlowerGrass
        ) {
          const hash = hashCoord(x, y);
          this.drawAnimatedGrass(ctx, x, y, tile, hash, tick, season, windDirection);
        }
      }
    }
  }

  private rebuildCache(
    tileMap: TileMap,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    season: Season,
  ): void {
    const w = (maxX - minX + 1) * TILE_SIZE;
    const h = (maxY - minY + 1) * TILE_SIZE;
    if (w <= 0 || h <= 0) return;

    if (!this.terrainCache) {
      this.terrainCache = document.createElement('canvas');
    }
    this.terrainCache.width = w;
    this.terrainCache.height = h;
    const cacheCtx = this.terrainCache.getContext('2d');
    if (!cacheCtx) return;
    cacheCtx.imageSmoothingEnabled = false;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const tile = tileMap.getTile(x, y);
        if (!tile) continue;

        const hash = hashCoord(x, y);
        const px = (x - minX) * TILE_SIZE;
        const py = (y - minY) * TILE_SIZE;

        cacheCtx.save();
        cacheCtx.translate(px, py);

        const type = tile.type;
        if (
          type === TileType.Grass ||
          type === TileType.DenseGrass
        ) {
          // Draw static base only for cache
          const base = type === TileType.DenseGrass
            ? DENSE_GRASS_BASE
            : seasonGrassColor(season);
          cacheCtx.fillStyle = rgba(base[0], base[1], base[2]);
          cacheCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
          // Pixel variation
          for (let i = 0; i < 8; i++) {
            const ppx = ((hash * (i + 1) * 7) >>> 0) % TILE_SIZE;
            const ppy = ((hash * (i + 1) * 13) >>> 0) % TILE_SIZE;
            const bright = ((hash * (i + 1)) >>> 0) % 2 === 0 ? 1.15 : 0.85;
            cacheCtx.fillStyle = rgba(base[0] * bright, base[1] * bright, base[2] * bright);
            cacheCtx.fillRect(ppx, ppy, 1, 1);
          }
        } else if (type === TileType.FlowerGrass) {
          const base = seasonGrassColor(season);
          cacheCtx.fillStyle = rgba(base[0], base[1], base[2]);
          cacheCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
          for (let i = 0; i < 8; i++) {
            const ppx = ((hash * (i + 1) * 7) >>> 0) % TILE_SIZE;
            const ppy = ((hash * (i + 1) * 13) >>> 0) % TILE_SIZE;
            const bright = ((hash * (i + 1)) >>> 0) % 2 === 0 ? 1.15 : 0.85;
            cacheCtx.fillStyle = rgba(base[0] * bright, base[1] * bright, base[2] * bright);
            cacheCtx.fillRect(ppx, ppy, 1, 1);
          }
        } else if (
          type !== TileType.DeepWater &&
          type !== TileType.ShallowWater
        ) {
          drawStaticTile(cacheCtx, tile, hash);
        }

        cacheCtx.restore();
      }
    }
  }

  private drawAnimatedGrass(
    ctx: CanvasRenderingContext2D,
    tileX: number,
    tileY: number,
    tile: Tile,
    hash: number,
    tick: number,
    season: Season,
    windDirection: number,
  ): void {
    const isDense = tile.type === TileType.DenseGrass;
    const isFlower = tile.type === TileType.FlowerGrass;
    const px = tileX * TILE_SIZE;
    const py = tileY * TILE_SIZE;

    // Grass blades
    const bladeCount = isDense ? 6 : 3;
    for (let i = 0; i < bladeCount; i++) {
      const bx = ((hash * (i + 3) * 17) >>> 0) % (TILE_SIZE - 2) + 1;
      const height = 2 + ((hash * (i + 5)) >>> 0) % 2;
      const sway = Math.sin(tick * 0.05 + (hash + i) * 0.7 + windDirection) * 1.2;

      const bladeColor = isDense
        ? rgba(30, 100 + ((hash * i) >>> 0) % 20, 0)
        : rgba(50, 130 + ((hash * i) >>> 0) % 30, 0);
      ctx.fillStyle = bladeColor;

      for (let h = 0; h < height; h++) {
        const swayAtH = (sway * h) / height;
        ctx.fillRect(
          Math.round(px + bx + swayAtH),
          py + TILE_SIZE - 1 - h,
          1, 1,
        );
      }
    }

    // Flowers
    if (isFlower) {
      const flowerCount = 2 + (hash >>> 0) % 2;
      for (let i = 0; i < flowerCount; i++) {
        const fx = ((hash * (i + 11) * 23) >>> 0) % (TILE_SIZE - 2) + 1;
        const fy = ((hash * (i + 7) * 19) >>> 0) % (TILE_SIZE - 4) + 2;
        const colorIdx = ((hash * (i + 1)) >>> 0) % FLOWER_COLORS.length;
        const sway = Math.sin(tick * 0.04 + (hash + i) * 0.5 + windDirection) * 0.8;

        ctx.fillStyle = FLOWER_COLORS[colorIdx];
        ctx.fillRect(Math.round(px + fx + sway), py + fy, 2, 2);
        ctx.fillRect(Math.round(px + fx + sway) + 1, py + fy - 1, 1, 1);
      }
    }
  }

  invalidateCache(): void {
    this.terrainCache = null;
    this.cacheSeason = null;
    this.spriteSheet.clear();
  }
}
