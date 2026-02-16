import { rgba } from '../utils/Color';
import { hashCoord } from '../utils/Math';
import type { WorldObject } from '../world/WorldObject';
import { ObjectType } from '../world/WorldObject';
import type { Season } from '../world/TimeSystem';
import type { Camera } from './Camera';
import { SpriteSheet } from './SpriteSheet';
import { TILE_SIZE } from './constants';

/** Returns true for resource types that should disappear when depleted */
function isGatherableResource(type: ObjectType): boolean {
  return (
    type === ObjectType.OakTree ||
    type === ObjectType.PineTree ||
    type === ObjectType.BirchTree ||
    type === ObjectType.Rock ||
    type === ObjectType.BerryBush ||
    type === ObjectType.Mushroom
  );
}

function oakCanopyColor(season: Season): [number, number, number] {
  switch (season) {
    case 'spring': return [60, 150, 30];
    case 'summer': return [40, 130, 20];
    case 'autumn': return [180, 90, 20];
    case 'winter': return [100, 80, 60];
  }
}

function pineCanopyColor(season: Season): [number, number, number] {
  switch (season) {
    case 'winter': return [30, 90, 40];
    default: return [20, 100, 30];
  }
}

function birchCanopyColor(season: Season): [number, number, number] {
  switch (season) {
    case 'spring': return [100, 180, 60];
    case 'summer': return [80, 160, 50];
    case 'autumn': return [200, 170, 40];
    case 'winter': return [130, 110, 70];
  }
}

function drawOakTree(ctx: CanvasRenderingContext2D, season: Season): void {
  // Trunk (4px wide, centered)
  ctx.fillStyle = rgba(100, 70, 30);
  ctx.fillRect(6, 9, 4, 7);
  ctx.fillStyle = rgba(80, 55, 25);
  ctx.fillRect(7, 10, 1, 5);

  if (season === 'winter') {
    // Bare branches
    ctx.fillStyle = rgba(90, 65, 30);
    ctx.fillRect(4, 6, 2, 1);
    ctx.fillRect(10, 6, 2, 1);
    ctx.fillRect(3, 4, 1, 2);
    ctx.fillRect(12, 4, 1, 2);
    ctx.fillRect(5, 3, 1, 3);
    ctx.fillRect(10, 3, 1, 3);
    ctx.fillRect(6, 2, 1, 2);
    ctx.fillRect(9, 2, 1, 2);
  } else {
    // Canopy (circle-ish, 10-12px)
    const c = oakCanopyColor(season);
    ctx.fillStyle = rgba(c[0], c[1], c[2]);
    ctx.fillRect(3, 2, 10, 8);
    ctx.fillRect(2, 3, 12, 6);
    ctx.fillRect(4, 1, 8, 1);
    // Darker detail
    ctx.fillStyle = rgba(c[0] * 0.7, c[1] * 0.7, c[2] * 0.7);
    ctx.fillRect(5, 4, 2, 2);
    ctx.fillRect(9, 3, 2, 1);
    ctx.fillRect(4, 6, 1, 2);
    // Highlight
    ctx.fillStyle = rgba(
      Math.min(255, c[0] * 1.3),
      Math.min(255, c[1] * 1.3),
      Math.min(255, c[2] * 1.3),
    );
    ctx.fillRect(6, 2, 2, 1);
    ctx.fillRect(5, 3, 1, 1);
  }
}

function drawPineTree(ctx: CanvasRenderingContext2D, season: Season): void {
  // Trunk
  ctx.fillStyle = rgba(90, 60, 25);
  ctx.fillRect(7, 12, 2, 4);

  // Triangular canopy
  const c = pineCanopyColor(season);
  ctx.fillStyle = rgba(c[0], c[1], c[2]);
  // Layer 1 (top)
  ctx.fillRect(7, 1, 2, 2);
  // Layer 2
  ctx.fillRect(5, 3, 6, 2);
  // Layer 3
  ctx.fillRect(4, 5, 8, 2);
  // Layer 4
  ctx.fillRect(3, 7, 10, 2);
  // Layer 5
  ctx.fillRect(2, 9, 12, 3);

  // Darker edges
  ctx.fillStyle = rgba(c[0] * 0.7, c[1] * 0.7, c[2] * 0.7);
  ctx.fillRect(2, 10, 1, 2);
  ctx.fillRect(13, 10, 1, 2);
  ctx.fillRect(3, 8, 1, 1);
  ctx.fillRect(12, 8, 1, 1);

  // Snow on tips in winter
  if (season === 'winter') {
    ctx.fillStyle = rgba(230, 240, 255, 0.8);
    ctx.fillRect(7, 1, 2, 1);
    ctx.fillRect(5, 3, 1, 1);
    ctx.fillRect(10, 3, 1, 1);
    ctx.fillRect(4, 5, 1, 1);
    ctx.fillRect(11, 5, 1, 1);
    ctx.fillRect(3, 7, 1, 1);
    ctx.fillRect(12, 7, 1, 1);
  }
}

function drawBirchTree(ctx: CanvasRenderingContext2D, season: Season): void {
  // White trunk with black marks
  ctx.fillStyle = rgba(230, 225, 210);
  ctx.fillRect(6, 8, 4, 8);
  // Black bark marks
  ctx.fillStyle = rgba(40, 35, 30);
  ctx.fillRect(7, 10, 2, 1);
  ctx.fillRect(6, 13, 1, 1);
  ctx.fillRect(9, 12, 1, 1);

  if (season === 'winter') {
    ctx.fillStyle = rgba(120, 100, 60);
    ctx.fillRect(4, 5, 1, 1);
    ctx.fillRect(11, 5, 1, 1);
    ctx.fillRect(5, 3, 1, 2);
    ctx.fillRect(10, 3, 1, 2);
    ctx.fillRect(6, 2, 4, 2);
  } else {
    // Lighter green canopy
    const c = birchCanopyColor(season);
    ctx.fillStyle = rgba(c[0], c[1], c[2]);
    ctx.fillRect(3, 2, 10, 7);
    ctx.fillRect(4, 1, 8, 1);
    // Light spots
    ctx.fillStyle = rgba(
      Math.min(255, c[0] * 1.4),
      Math.min(255, c[1] * 1.4),
      Math.min(255, c[2] * 1.4),
      0.6,
    );
    ctx.fillRect(5, 3, 2, 1);
    ctx.fillRect(8, 4, 2, 1);
    ctx.fillRect(6, 6, 1, 1);
  }
}

function drawBerryBush(
  ctx: CanvasRenderingContext2D,
  state: 'normal' | 'depleted' | 'ripe',
): void {
  // Green bush base
  ctx.fillStyle = rgba(50, 120, 30);
  ctx.fillRect(3, 8, 10, 6);
  ctx.fillRect(4, 7, 8, 1);
  ctx.fillRect(5, 6, 6, 1);

  // Darker spots
  ctx.fillStyle = rgba(35, 90, 20);
  ctx.fillRect(5, 9, 2, 2);
  ctx.fillRect(9, 10, 2, 1);

  // Berries
  if (state === 'ripe') {
    ctx.fillStyle = rgba(220, 30, 30);
    ctx.fillRect(5, 8, 2, 2);
    ctx.fillRect(9, 9, 2, 2);
    ctx.fillRect(7, 7, 2, 2);
    ctx.fillRect(4, 10, 1, 1);
    ctx.fillRect(11, 8, 1, 1);
  }
}

function drawRock(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = rgba(130, 130, 130);
  ctx.fillRect(4, 9, 8, 5);
  ctx.fillRect(5, 8, 6, 1);
  ctx.fillRect(3, 10, 1, 3);
  ctx.fillRect(12, 10, 1, 3);

  // Darker shadow
  ctx.fillStyle = rgba(95, 95, 95);
  ctx.fillRect(4, 13, 8, 1);
  ctx.fillRect(5, 11, 2, 1);

  // Highlight
  ctx.fillStyle = rgba(170, 170, 170);
  ctx.fillRect(6, 8, 2, 1);
  ctx.fillRect(5, 9, 1, 1);
}

function drawMushroom(ctx: CanvasRenderingContext2D): void {
  // Stem
  ctx.fillStyle = rgba(230, 220, 200);
  ctx.fillRect(7, 11, 2, 4);

  // Red cap
  ctx.fillStyle = rgba(200, 40, 30);
  ctx.fillRect(5, 9, 6, 3);
  ctx.fillRect(6, 8, 4, 1);

  // White spots
  ctx.fillStyle = rgba(255, 255, 255);
  ctx.fillRect(6, 9, 1, 1);
  ctx.fillRect(9, 10, 1, 1);
  ctx.fillRect(7, 8, 1, 1);
}

function drawCampfire(ctx: CanvasRenderingContext2D, tick: number): void {
  // Logs
  ctx.fillStyle = rgba(90, 55, 20);
  ctx.fillRect(4, 13, 8, 2);
  ctx.fillRect(3, 12, 2, 1);
  ctx.fillRect(11, 12, 2, 1);

  // Stones around fire
  ctx.fillStyle = rgba(110, 110, 110);
  ctx.fillRect(3, 11, 2, 2);
  ctx.fillRect(11, 11, 2, 2);
  ctx.fillRect(5, 14, 1, 1);
  ctx.fillRect(10, 14, 1, 1);

  // Fire - flickering
  const phase = tick * 0.15;

  // Orange base
  ctx.fillStyle = rgba(220, 130, 20);
  ctx.fillRect(6, 10, 4, 3);

  // Yellow center
  ctx.fillStyle = rgba(255, 220, 50);
  ctx.fillRect(7, 9, 2, 3);

  // Flickering tips
  const flicker1 = Math.sin(phase) > 0 ? 1 : 0;
  const flicker2 = Math.cos(phase * 1.3) > 0 ? 1 : 0;
  const flicker3 = Math.sin(phase * 0.7 + 1) > 0.2 ? 1 : 0;

  ctx.fillStyle = rgba(255, 200, 30, 0.9);
  ctx.fillRect(7, 8 - flicker1, 1, 1);
  ctx.fillRect(8, 7 - flicker2, 1, 1);
  ctx.fillRect(6, 9 - flicker3, 1, 1);

  // Red glow at bottom
  ctx.fillStyle = rgba(200, 50, 10, 0.5);
  ctx.fillRect(6, 12, 4, 1);

  // Smoke particles
  const s1y = 5 - ((tick * 0.1) % 6);
  const s2y = 3 - ((tick * 0.08 + 2) % 6);
  ctx.fillStyle = rgba(150, 150, 160, 0.3);
  if (s1y > 0) ctx.fillRect(7, Math.floor(s1y), 1, 1);
  if (s2y > 0) ctx.fillRect(8, Math.floor(s2y), 1, 1);
}

function drawConstructionSite(ctx: CanvasRenderingContext2D, progress: number): void {
  // Tan scaffolding outline
  ctx.fillStyle = rgba(180, 150, 100, 0.6);
  ctx.fillRect(2, 14, 12, 1);
  ctx.fillRect(2, 4, 1, 10);
  ctx.fillRect(13, 4, 1, 10);
  ctx.fillRect(2, 4, 12, 1);
  // Fill from bottom proportional to progress
  const fillHeight = Math.floor(10 * progress);
  ctx.fillStyle = rgba(160, 120, 70, 0.5);
  ctx.fillRect(3, 14 - fillHeight, 10, fillHeight);
}

function drawHut(ctx: CanvasRenderingContext2D): void {
  // Brown walls
  ctx.fillStyle = rgba(130, 85, 40);
  ctx.fillRect(3, 8, 10, 7);
  // Darker roof triangle
  ctx.fillStyle = rgba(100, 60, 30);
  ctx.fillRect(2, 6, 12, 2);
  ctx.fillRect(3, 5, 10, 1);
  ctx.fillRect(4, 4, 8, 1);
  ctx.fillRect(5, 3, 6, 1);
  ctx.fillRect(6, 2, 4, 1);
  ctx.fillRect(7, 1, 2, 1);
  // Door opening
  ctx.fillStyle = rgba(40, 25, 10);
  ctx.fillRect(6, 11, 3, 4);
}

function drawFarm(ctx: CanvasRenderingContext2D): void {
  // Light green ground
  ctx.fillStyle = rgba(90, 140, 50);
  ctx.fillRect(2, 5, 12, 9);
  // Dark tilled rows
  ctx.fillStyle = rgba(60, 100, 30);
  ctx.fillRect(3, 7, 10, 1);
  ctx.fillRect(3, 10, 10, 1);
  ctx.fillRect(3, 13, 10, 1);
  // Fence posts at corners
  ctx.fillStyle = rgba(120, 80, 30);
  ctx.fillRect(1, 4, 1, 3);
  ctx.fillRect(14, 4, 1, 3);
  ctx.fillRect(1, 12, 1, 3);
  ctx.fillRect(14, 12, 1, 3);
}

function drawWell(ctx: CanvasRenderingContext2D): void {
  // Gray stone circle
  ctx.fillStyle = rgba(140, 140, 145);
  ctx.fillRect(4, 8, 8, 6);
  ctx.fillRect(3, 9, 10, 4);
  // Darker center (water)
  ctx.fillStyle = rgba(40, 60, 100);
  ctx.fillRect(5, 9, 6, 4);
  // Bucket shape
  ctx.fillStyle = rgba(100, 70, 30);
  ctx.fillRect(6, 5, 4, 3);
  ctx.fillRect(7, 4, 2, 1);
  // Rope
  ctx.fillStyle = rgba(150, 130, 90);
  ctx.fillRect(7, 2, 1, 3);
}

function drawStorehouse(ctx: CanvasRenderingContext2D): void {
  // Wider brown structure
  ctx.fillStyle = rgba(110, 75, 35);
  ctx.fillRect(1, 7, 14, 8);
  // Cross-beams
  ctx.fillStyle = rgba(90, 60, 25);
  ctx.fillRect(1, 10, 14, 1);
  ctx.fillRect(7, 7, 1, 8);
  // Roof
  ctx.fillStyle = rgba(80, 50, 20);
  ctx.fillRect(0, 5, 16, 2);
  ctx.fillRect(1, 4, 14, 1);
}

function drawWatchtower(ctx: CanvasRenderingContext2D): void {
  // Narrow stone base
  ctx.fillStyle = rgba(120, 120, 125);
  ctx.fillRect(5, 8, 6, 7);
  ctx.fillRect(6, 7, 4, 1);
  // Wooden platform on top
  ctx.fillStyle = rgba(110, 75, 35);
  ctx.fillRect(3, 4, 10, 3);
  // Railing
  ctx.fillStyle = rgba(100, 65, 25);
  ctx.fillRect(3, 3, 1, 1);
  ctx.fillRect(12, 3, 1, 1);
  // Small flag
  ctx.fillStyle = rgba(200, 40, 30);
  ctx.fillRect(7, 1, 3, 2);
  ctx.fillStyle = rgba(90, 60, 25);
  ctx.fillRect(6, 1, 1, 3);
}

function drawMeetingHall(ctx: CanvasRenderingContext2D, tick: number): void {
  // Widest structure with A-frame roof
  ctx.fillStyle = rgba(120, 80, 35);
  ctx.fillRect(1, 8, 14, 7);
  // A-frame roof
  ctx.fillStyle = rgba(90, 55, 25);
  ctx.fillRect(0, 6, 16, 2);
  ctx.fillRect(1, 5, 14, 1);
  ctx.fillRect(2, 4, 12, 1);
  ctx.fillRect(4, 3, 8, 1);
  ctx.fillRect(6, 2, 4, 1);
  // Open front
  ctx.fillStyle = rgba(50, 30, 15);
  ctx.fillRect(5, 10, 6, 5);
  // Warm glow (firelight) inside — subtle flicker
  const glowAlpha = 0.3 + Math.sin(tick * 0.1) * 0.1;
  ctx.fillStyle = rgba(255, 180, 60, glowAlpha);
  ctx.fillRect(6, 11, 4, 3);
}

export class ObjectRenderer {
  private spriteSheet: SpriteSheet;

  constructor() {
    this.spriteSheet = new SpriteSheet();
  }

  render(
    ctx: CanvasRenderingContext2D,
    objects: WorldObject[],
    camera: Camera,
    tick: number,
    season: Season,
    windDirection: number,
    windStrength: number,
  ): void {
    const bounds = camera.getVisibleBounds(TILE_SIZE);

    // Sort objects by y for depth ordering
    const sorted = objects.filter(
      obj =>
        obj.x >= bounds.minX - 1 &&
        obj.x <= bounds.maxX + 1 &&
        obj.y >= bounds.minY - 1 &&
        obj.y <= bounds.maxY + 1 &&
        // Hide depleted gatherable resources from the map
        !(obj.state === 'depleted' && isGatherableResource(obj.type)),
    );
    sorted.sort((a, b) => a.y - b.y);

    for (const obj of sorted) {
      this.renderObject(ctx, obj, tick, season, windDirection, windStrength);
    }
  }

  private renderObject(
    ctx: CanvasRenderingContext2D,
    obj: WorldObject,
    tick: number,
    season: Season,
    windDirection: number,
    windStrength: number,
  ): void {
    const px = obj.x * TILE_SIZE;
    const py = obj.y * TILE_SIZE;

    const isTree =
      obj.type === ObjectType.OakTree ||
      obj.type === ObjectType.PineTree ||
      obj.type === ObjectType.BirchTree;

    // Tree sway
    let swayX = 0;
    if (isTree) {
      swayX = Math.sin(tick * 0.03 + obj.swayOffset + windDirection) * windStrength * 1.5;
    }

    ctx.save();
    ctx.translate(px + swayX, py);

    if (obj.type === ObjectType.Campfire) {
      // Campfire needs tick for animation, can't fully cache
      drawCampfire(ctx, tick);
    } else if (obj.type === ObjectType.ConstructionSite) {
      // Construction site shows progress-based fill
      const progress = obj.structureData?.buildProgress ?? 0;
      drawConstructionSite(ctx, progress);
    } else if (obj.type === ObjectType.MeetingHall) {
      // Meeting hall has firelight flicker
      drawMeetingHall(ctx, tick);
    } else {
      const key = `${obj.type}_${season}_${obj.state}`;
      const sprite = this.spriteSheet.getSprite(key, TILE_SIZE, TILE_SIZE, (sctx) => {
        switch (obj.type) {
          case ObjectType.OakTree:
            drawOakTree(sctx, season);
            break;
          case ObjectType.PineTree:
            drawPineTree(sctx, season);
            break;
          case ObjectType.BirchTree:
            drawBirchTree(sctx, season);
            break;
          case ObjectType.BerryBush:
            drawBerryBush(sctx, obj.state);
            break;
          case ObjectType.Rock:
            drawRock(sctx);
            break;
          case ObjectType.Mushroom:
            drawMushroom(sctx);
            break;
          case ObjectType.Hut:
            drawHut(sctx);
            break;
          case ObjectType.Farm:
            drawFarm(sctx);
            break;
          case ObjectType.Well:
            drawWell(sctx);
            break;
          case ObjectType.Storehouse:
            drawStorehouse(sctx);
            break;
          case ObjectType.Watchtower:
            drawWatchtower(sctx);
            break;
        }
      });
      ctx.drawImage(sprite, 0, 0);
    }

    ctx.restore();
  }
}
