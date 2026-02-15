import type { Camera } from './Camera';
import { TILE_SIZE } from './constants';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  active: boolean;
}

export interface EmitConfig {
  spread?: number;
  speedRange?: [number, number];
  color?: string;
  size?: number;
  life?: number;
  maxLife?: number;
  vx?: number;
  vy?: number;
}

export class ParticleSystem {
  private particles: Particle[];

  constructor(maxParticles: number) {
    this.particles = [];
    for (let i = 0; i < maxParticles; i++) {
      this.particles.push({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0,
        color: '#fff', size: 1, active: false,
      });
    }
  }

  emit(
    x: number,
    y: number,
    count: number,
    config: EmitConfig,
  ): void {
    const spread = config.spread ?? 1;
    const speedRange = config.speedRange ?? [0.5, 2];
    let emitted = 0;

    for (const p of this.particles) {
      if (emitted >= count) break;
      if (p.active) continue;

      const angle = Math.random() * Math.PI * 2;
      const speed = speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]);

      p.x = x + (Math.random() - 0.5) * spread;
      p.y = y + (Math.random() - 0.5) * spread;
      p.vx = config.vx ?? Math.cos(angle) * speed;
      p.vy = config.vy ?? Math.sin(angle) * speed;
      p.life = config.life ?? config.maxLife ?? 60;
      p.maxLife = config.maxLife ?? p.life;
      p.color = config.color ?? '#fff';
      p.size = config.size ?? 1;
      p.active = true;
      emitted++;
    }
  }

  update(): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) {
        p.active = false;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      const sx = (p.x - camera.x) * camera.zoom * TILE_SIZE + camera.viewportWidth / 2;
      const sy = (p.y - camera.y) * camera.zoom * TILE_SIZE + camera.viewportHeight / 2;

      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      const size = p.size * camera.zoom;
      ctx.fillRect(Math.floor(sx), Math.floor(sy), Math.ceil(size), Math.ceil(size));
    }
    ctx.globalAlpha = 1;
  }

  getActiveCount(): number {
    let count = 0;
    for (const p of this.particles) {
      if (p.active) count++;
    }
    return count;
  }
}
