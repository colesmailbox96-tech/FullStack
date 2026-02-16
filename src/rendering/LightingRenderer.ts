import { rgba } from '../utils/Color';
import { clamp, smoothstep } from '../utils/Math';
import type { TimeSystem } from '../world/TimeSystem';
import type { Weather } from '../world/Weather';
import type { WorldObject } from '../world/WorldObject';
import { ObjectType } from '../world/WorldObject';
import type { Camera } from './Camera';
import { TILE_SIZE } from './constants';

// Time-of-day color grading
const DAWN_COLOR: [number, number, number, number] = [255, 200, 100, 0.15];
const DAY_COLOR: [number, number, number, number] = [255, 255, 255, 0.0];
const DUSK_COLOR: [number, number, number, number] = [200, 100, 60, 0.2];
const NIGHT_COLOR: [number, number, number, number] = [20, 20, 60, 0.55];

function getTimeOverlay(
  timeOfDay: number,
): { color: [number, number, number]; alpha: number } {
  // timeOfDay: 0.0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk
  if (timeOfDay < 0.15) {
    // Night
    return { color: [NIGHT_COLOR[0], NIGHT_COLOR[1], NIGHT_COLOR[2]], alpha: NIGHT_COLOR[3] };
  } else if (timeOfDay < 0.25) {
    // Night -> Dawn
    const t = smoothstep(0.15, 0.25, timeOfDay);
    return {
      color: [
        NIGHT_COLOR[0] + (DAWN_COLOR[0] - NIGHT_COLOR[0]) * t,
        NIGHT_COLOR[1] + (DAWN_COLOR[1] - NIGHT_COLOR[1]) * t,
        NIGHT_COLOR[2] + (DAWN_COLOR[2] - NIGHT_COLOR[2]) * t,
      ],
      alpha: NIGHT_COLOR[3] + (DAWN_COLOR[3] - NIGHT_COLOR[3]) * t,
    };
  } else if (timeOfDay < 0.35) {
    // Dawn -> Day
    const t = smoothstep(0.25, 0.35, timeOfDay);
    return {
      color: [
        DAWN_COLOR[0] + (DAY_COLOR[0] - DAWN_COLOR[0]) * t,
        DAWN_COLOR[1] + (DAY_COLOR[1] - DAWN_COLOR[1]) * t,
        DAWN_COLOR[2] + (DAY_COLOR[2] - DAWN_COLOR[2]) * t,
      ],
      alpha: DAWN_COLOR[3] + (DAY_COLOR[3] - DAWN_COLOR[3]) * t,
    };
  } else if (timeOfDay < 0.65) {
    // Day
    return { color: [DAY_COLOR[0], DAY_COLOR[1], DAY_COLOR[2]], alpha: DAY_COLOR[3] };
  } else if (timeOfDay < 0.75) {
    // Day -> Dusk
    const t = smoothstep(0.65, 0.75, timeOfDay);
    return {
      color: [
        DAY_COLOR[0] + (DUSK_COLOR[0] - DAY_COLOR[0]) * t,
        DAY_COLOR[1] + (DUSK_COLOR[1] - DAY_COLOR[1]) * t,
        DAY_COLOR[2] + (DUSK_COLOR[2] - DAY_COLOR[2]) * t,
      ],
      alpha: DAY_COLOR[3] + (DUSK_COLOR[3] - DAY_COLOR[3]) * t,
    };
  } else if (timeOfDay < 0.80) {
    // Dusk -> Night
    const t = smoothstep(0.75, 0.80, timeOfDay);
    return {
      color: [
        DUSK_COLOR[0] + (NIGHT_COLOR[0] - DUSK_COLOR[0]) * t,
        DUSK_COLOR[1] + (NIGHT_COLOR[1] - DUSK_COLOR[1]) * t,
        DUSK_COLOR[2] + (NIGHT_COLOR[2] - DUSK_COLOR[2]) * t,
      ],
      alpha: DUSK_COLOR[3] + (NIGHT_COLOR[3] - DUSK_COLOR[3]) * t,
    };
  } else {
    // Night
    return { color: [NIGHT_COLOR[0], NIGHT_COLOR[1], NIGHT_COLOR[2]], alpha: NIGHT_COLOR[3] };
  }
}

export class LightingRenderer {
  constructor() {
    // no persistent state needed
  }

  render(
    ctx: CanvasRenderingContext2D,
    timeSystem: TimeSystem,
    weather: Weather,
    objects: WorldObject[],
    camera: Camera,
    viewportWidth: number,
    viewportHeight: number,
    tick: number,
  ): void {
    const overlay = getTimeOverlay(timeSystem.timeOfDay);

    // Cloud dimming
    if (weather.current === 'cloudy' || weather.current === 'rain' || weather.current === 'storm') {
      overlay.alpha = Math.min(0.6, overlay.alpha + weather.intensity * 0.15);
    }

    // Apply day/night overlay
    if (overlay.alpha > 0.001) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = rgba(overlay.color[0], overlay.color[1], overlay.color[2], overlay.alpha);
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);
      ctx.restore();
    }

    // Campfire lights (only visible at night/dusk)
    if (timeSystem.timeOfDay > 0.70 || timeSystem.timeOfDay < 0.25) {
      this.renderCampfireLights(ctx, objects, camera, tick);
    }

    // Campfire warmth aura (subtle warm glow visible during daytime too)
    if (timeSystem.timeOfDay >= 0.25 && timeSystem.timeOfDay <= 0.70) {
      this.renderCampfireWarmth(ctx, objects, camera, tick);
    }

    // Tree shadows during daytime
    if (timeSystem.timeOfDay >= 0.2 && timeSystem.timeOfDay <= 0.75) {
      this.renderShadows(ctx, objects, camera, timeSystem);
    }
  }

  private renderCampfireLights(
    ctx: CanvasRenderingContext2D,
    objects: WorldObject[],
    camera: Camera,
    tick: number,
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const obj of objects) {
      if (obj.type !== ObjectType.Campfire) continue;

      const screenPos = camera.worldToScreen(obj.x + 0.5, obj.y + 0.5);
      const flicker = Math.sin(tick * 0.1) * 0.1 + Math.sin(tick * 0.17 + 1.3) * 0.05;
      const radius = (40 + flicker * 20) * camera.zoom;

      const gradient = ctx.createRadialGradient(
        screenPos.x, screenPos.y, 0,
        screenPos.x, screenPos.y, radius,
      );
      gradient.addColorStop(0, rgba(255, 180, 60, 0.3 + flicker));
      gradient.addColorStop(0.4, rgba(255, 120, 30, 0.15 + flicker * 0.5));
      gradient.addColorStop(1, rgba(255, 80, 0, 0));

      ctx.fillStyle = gradient;
      ctx.fillRect(
        screenPos.x - radius,
        screenPos.y - radius,
        radius * 2,
        radius * 2,
      );
    }

    ctx.restore();
  }

  private renderShadows(
    ctx: CanvasRenderingContext2D,
    objects: WorldObject[],
    camera: Camera,
    timeSystem: TimeSystem,
  ): void {
    const sunAngle = timeSystem.getSunAngle();
    const shadowDx = Math.cos(sunAngle) * 4;
    const shadowDy = 2;

    ctx.save();
    ctx.fillStyle = rgba(0, 0, 0, 0.15);

    const bounds = camera.getVisibleBounds(TILE_SIZE);

    for (const obj of objects) {
      const isTree =
        obj.type === ObjectType.OakTree ||
        obj.type === ObjectType.PineTree ||
        obj.type === ObjectType.BirchTree;
      if (!isTree) continue;

      if (
        obj.x < bounds.minX - 2 || obj.x > bounds.maxX + 2 ||
        obj.y < bounds.minY - 2 || obj.y > bounds.maxY + 2
      ) {
        continue;
      }

      const px = obj.x * TILE_SIZE + shadowDx;
      const py = obj.y * TILE_SIZE + TILE_SIZE - 2;

      // Elliptical shadow
      ctx.beginPath();
      ctx.ellipse(
        px + TILE_SIZE / 2,
        py + shadowDy,
        6, 3, 0, 0, Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.restore();
  }

  private renderCampfireWarmth(
    ctx: CanvasRenderingContext2D,
    objects: WorldObject[],
    camera: Camera,
    tick: number,
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    for (const obj of objects) {
      if (obj.type !== ObjectType.Campfire) continue;

      const screenPos = camera.worldToScreen(obj.x + 0.5, obj.y + 0.5);
      const shimmer = Math.sin(tick * 0.08) * 0.02;
      const radius = 25 * camera.zoom;

      const gradient = ctx.createRadialGradient(
        screenPos.x, screenPos.y, 0,
        screenPos.x, screenPos.y, radius,
      );
      gradient.addColorStop(0, rgba(255, 200, 100, 0.08 + shimmer));
      gradient.addColorStop(0.6, rgba(255, 160, 60, 0.04 + shimmer * 0.5));
      gradient.addColorStop(1, rgba(255, 120, 30, 0));

      ctx.fillStyle = gradient;
      ctx.fillRect(
        screenPos.x - radius,
        screenPos.y - radius,
        radius * 2,
        radius * 2,
      );
    }

    ctx.restore();
  }
}
