import { lerp, clamp } from '../utils/Math';
import { TILE_SIZE } from './constants';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4.0;
const LERP_FACTOR = 0.15;

export class Camera {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
  viewportWidth: number;
  viewportHeight: number;

  constructor(viewportWidth: number, viewportHeight: number) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
    this.targetX = 0;
    this.targetY = 0;
    this.targetZoom = 1;
  }

  update(isDragging = false): void {
    if (isDragging) {
      this.x = this.targetX;
      this.y = this.targetY;
    } else {
      this.x = lerp(this.x, this.targetX, LERP_FACTOR);
      this.y = lerp(this.y, this.targetY, LERP_FACTOR);
    }
    this.zoom = lerp(this.zoom, this.targetZoom, LERP_FACTOR);
  }

  pan(dx: number, dy: number): void {
    this.targetX += dx;
    this.targetY += dy;
    this.x += dx;
    this.y += dy;
  }

  setZoom(zoom: number): void {
    this.targetZoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
  }

  clampToWorld(worldWidth: number, worldHeight: number, tileSize: number = TILE_SIZE): void {
    const halfViewW = this.viewportWidth / (2 * this.zoom * tileSize);
    const halfViewH = this.viewportHeight / (2 * this.zoom * tileSize);
    this.targetX = clamp(this.targetX, halfViewW, worldWidth - halfViewW);
    this.targetY = clamp(this.targetY, halfViewH, worldHeight - halfViewH);
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const x = (screenX - this.viewportWidth / 2) / (this.zoom * TILE_SIZE) + this.x;
    const y = (screenY - this.viewportHeight / 2) / (this.zoom * TILE_SIZE) + this.y;
    return { x, y };
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const x = (worldX - this.x) * this.zoom * TILE_SIZE + this.viewportWidth / 2;
    const y = (worldY - this.y) * this.zoom * TILE_SIZE + this.viewportHeight / 2;
    return { x, y };
  }

  getVisibleBounds(tileSize: number = TILE_SIZE): { minX: number; minY: number; maxX: number; maxY: number } {
    const halfW = this.viewportWidth / (2 * this.zoom * tileSize);
    const halfH = this.viewportHeight / (2 * this.zoom * tileSize);
    return {
      minX: Math.floor(this.x - halfW) - 1,
      minY: Math.floor(this.y - halfH) - 1,
      maxX: Math.ceil(this.x + halfW) + 1,
      maxY: Math.ceil(this.y + halfH) + 1,
    };
  }

  setViewport(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }
}
