import { rgba } from '../utils/Color';
import type { Weather } from '../world/Weather';
import type { Camera } from './Camera';

const MAX_RAIN = 400;
const MAX_SNOW = 200;
const MAX_LEAVES = 80;
const MAX_SPLASH = 100;

interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  active: boolean;
  drift: number;
}

function createParticle(): WeatherParticle {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, size: 1, active: false, drift: 0 };
}

function allocPool(count: number): WeatherParticle[] {
  const pool: WeatherParticle[] = [];
  for (let i = 0; i < count; i++) pool.push(createParticle());
  return pool;
}

export class WeatherRenderer {
  private raindrops: WeatherParticle[];
  private snowflakes: WeatherParticle[];
  private leaves: WeatherParticle[];
  private splashes: WeatherParticle[];

  constructor() {
    this.raindrops = allocPool(MAX_RAIN);
    this.snowflakes = allocPool(MAX_SNOW);
    this.leaves = allocPool(MAX_LEAVES);
    this.splashes = allocPool(MAX_SPLASH);
  }

  render(
    ctx: CanvasRenderingContext2D,
    weather: Weather,
    camera: Camera,
    viewportWidth: number,
    viewportHeight: number,
    tick: number,
  ): void {
    switch (weather.current) {
      case 'rain':
        this.renderRain(ctx, weather, viewportWidth, viewportHeight, tick);
        break;
      case 'storm':
        this.renderRain(ctx, weather, viewportWidth, viewportHeight, tick);
        this.renderLightning(ctx, viewportWidth, viewportHeight, tick, weather.intensity);
        break;
      case 'snow':
        this.renderSnow(ctx, weather, viewportWidth, viewportHeight, tick);
        break;
      case 'fog':
        this.renderFog(ctx, viewportWidth, viewportHeight, tick, weather.intensity);
        break;
    }

    // Wind particles (leaves/dust) for cloudy/windy weather
    if (weather.windStrength > 0.4) {
      this.renderWindParticles(ctx, weather, viewportWidth, viewportHeight, tick);
    }
  }

  private renderRain(
    ctx: CanvasRenderingContext2D,
    weather: Weather,
    vw: number,
    vh: number,
    tick: number,
  ): void {
    const spawnCount = Math.floor(weather.intensity * 8);
    const windX = Math.cos(weather.windDirection) * weather.windStrength * 3;

    // Spawn new raindrops
    for (let i = 0; i < spawnCount; i++) {
      for (const drop of this.raindrops) {
        if (drop.active) continue;
        drop.x = Math.random() * (vw + 100) - 50;
        drop.y = -5;
        drop.vx = windX + (Math.random() - 0.5) * 0.5;
        drop.vy = 6 + Math.random() * 4;
        drop.life = 80 + Math.floor(Math.random() * 40);
        drop.size = 1;
        drop.active = true;
        break;
      }
    }

    // Update and render raindrops
    ctx.strokeStyle = rgba(180, 200, 255, 0.5);
    ctx.lineWidth = 1;
    for (const drop of this.raindrops) {
      if (!drop.active) continue;
      drop.x += drop.vx;
      drop.y += drop.vy;
      drop.life--;
      if (drop.life <= 0 || drop.y > vh) {
        drop.active = false;
        // Spawn splash
        if (drop.y <= vh + 10) {
          this.spawnSplash(drop.x, Math.min(drop.y, vh));
        }
        continue;
      }
      // 1x3 diagonal streak
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x + drop.vx * 0.3, drop.y - 3);
      ctx.stroke();
    }

    // Render splashes
    ctx.fillStyle = rgba(200, 220, 255, 0.4);
    for (const splash of this.splashes) {
      if (!splash.active) continue;
      splash.life--;
      if (splash.life <= 0) {
        splash.active = false;
        continue;
      }
      const radius = (1 - splash.life / 8) * 3;
      ctx.globalAlpha = splash.life / 8;
      ctx.fillRect(splash.x - radius, splash.y, radius * 2, 1);
    }
    ctx.globalAlpha = 1;
  }

  private spawnSplash(x: number, y: number): void {
    for (const splash of this.splashes) {
      if (splash.active) continue;
      splash.x = x;
      splash.y = y;
      splash.life = 8;
      splash.active = true;
      break;
    }
  }

  private renderSnow(
    ctx: CanvasRenderingContext2D,
    weather: Weather,
    vw: number,
    vh: number,
    tick: number,
  ): void {
    const spawnCount = Math.floor(weather.intensity * 3);

    for (let i = 0; i < spawnCount; i++) {
      for (const flake of this.snowflakes) {
        if (flake.active) continue;
        flake.x = Math.random() * vw;
        flake.y = -2;
        flake.vx = Math.cos(weather.windDirection) * weather.windStrength;
        flake.vy = 0.5 + Math.random() * 1.5;
        flake.life = 200 + Math.floor(Math.random() * 100);
        flake.size = 1;
        flake.drift = Math.random() * Math.PI * 2;
        flake.active = true;
        break;
      }
    }

    ctx.fillStyle = rgba(240, 245, 255, 0.8);
    for (const flake of this.snowflakes) {
      if (!flake.active) continue;
      flake.x += flake.vx + Math.sin(tick * 0.02 + flake.drift) * 0.5;
      flake.y += flake.vy;
      flake.life--;
      if (flake.life <= 0 || flake.y > vh || flake.x < -10 || flake.x > vw + 10) {
        flake.active = false;
        continue;
      }
      ctx.fillRect(Math.floor(flake.x), Math.floor(flake.y), 1, 1);
    }
  }

  private renderFog(
    ctx: CanvasRenderingContext2D,
    vw: number,
    vh: number,
    tick: number,
    intensity: number,
  ): void {
    // Semi-transparent white overlay with noise
    ctx.fillStyle = rgba(220, 225, 230, intensity * 0.3);
    ctx.fillRect(0, 0, vw, vh);

    // Noise-ish fog patches
    ctx.fillStyle = rgba(240, 245, 250, intensity * 0.15);
    const patchCount = 12;
    for (let i = 0; i < patchCount; i++) {
      const fx = (Math.sin(tick * 0.005 + i * 2.1) * 0.5 + 0.5) * vw;
      const fy = (Math.cos(tick * 0.003 + i * 1.7) * 0.5 + 0.5) * vh;
      const fw = 80 + Math.sin(i * 3.14 + tick * 0.01) * 40;
      const fh = 40 + Math.cos(i * 2.71 + tick * 0.008) * 20;
      ctx.fillRect(fx - fw / 2, fy - fh / 2, fw, fh);
    }
  }

  private renderLightning(
    ctx: CanvasRenderingContext2D,
    vw: number,
    vh: number,
    tick: number,
    intensity: number,
  ): void {
    // Lightning flash: white overlay for 2 frames periodically
    const flashInterval = Math.floor(200 / (intensity + 0.1));
    const flashPhase = tick % flashInterval;
    if (flashPhase < 2) {
      ctx.fillStyle = rgba(255, 255, 255, 0.4 + intensity * 0.3);
      ctx.fillRect(0, 0, vw, vh);
    }

    // Screen shake indicator (handled elsewhere, just visual shake via slight offset)
    if (flashPhase < 4) {
      ctx.save();
      const shakeX = (Math.random() - 0.5) * 4 * intensity;
      const shakeY = (Math.random() - 0.5) * 4 * intensity;
      ctx.translate(shakeX, shakeY);
      ctx.restore();
    }
  }

  private renderWindParticles(
    ctx: CanvasRenderingContext2D,
    weather: Weather,
    vw: number,
    vh: number,
    tick: number,
  ): void {
    const spawnCount = weather.windStrength > 0.6 ? 2 : 1;

    for (let i = 0; i < spawnCount; i++) {
      for (const leaf of this.leaves) {
        if (leaf.active) continue;
        leaf.x = Math.random() * vw;
        leaf.y = Math.random() * vh;
        leaf.vx = Math.cos(weather.windDirection) * weather.windStrength * 4;
        leaf.vy = Math.sin(weather.windDirection) * weather.windStrength * 2 - 0.5;
        leaf.life = 60 + Math.floor(Math.random() * 60);
        leaf.size = 1;
        leaf.drift = Math.random() * Math.PI * 2;
        leaf.active = true;
        break;
      }
    }

    ctx.fillStyle = rgba(160, 140, 100, 0.5);
    for (const leaf of this.leaves) {
      if (!leaf.active) continue;
      leaf.x += leaf.vx;
      leaf.y += leaf.vy + Math.sin(tick * 0.05 + leaf.drift) * 0.3;
      leaf.life--;
      if (leaf.life <= 0 || leaf.x < -20 || leaf.x > vw + 20 || leaf.y > vh + 10) {
        leaf.active = false;
        continue;
      }
      ctx.fillRect(Math.floor(leaf.x), Math.floor(leaf.y), 2, 1);
    }
  }
}
