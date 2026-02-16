import type { SimulationSnapshot } from '../engine/SimulationState';
import { Camera } from './Camera';
import { TerrainRenderer } from './TerrainRenderer';
import { WaterRenderer } from './WaterRenderer';
import { ObjectRenderer } from './ObjectRenderer';
import { NPCRenderer } from './NPCRenderer';
import { WeatherRenderer } from './WeatherRenderer';
import { LightingRenderer } from './LightingRenderer';
import { ParticleSystem } from './ParticleSystem';
import { TILE_SIZE } from './constants';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private terrainRenderer: TerrainRenderer;
  private waterRenderer: WaterRenderer;
  private objectRenderer: ObjectRenderer;
  private npcRenderer: NPCRenderer;
  private weatherRenderer: WeatherRenderer;
  private lightingRenderer: LightingRenderer;
  private particleSystem: ParticleSystem;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');
    this.ctx = ctx;

    this.camera = new Camera(canvas.width, canvas.height);
    this.terrainRenderer = new TerrainRenderer();
    this.waterRenderer = new WaterRenderer();
    this.objectRenderer = new ObjectRenderer();
    this.npcRenderer = new NPCRenderer();
    this.weatherRenderer = new WeatherRenderer();
    this.lightingRenderer = new LightingRenderer();
    this.particleSystem = new ParticleSystem(500);
  }

  render(state: SimulationSnapshot, alpha: number, isDragging = false): void {
    const { ctx, canvas, camera } = this;
    const { tileMap, objects, npcs, timeSystem, weather, config } = state;

    // 1. Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Disable image smoothing for crisp pixels
    ctx.imageSmoothingEnabled = false;

    // Update camera (no clamping — the map is infinite)
    camera.update(isDragging);

    // Lazily generate objects for newly visible chunks
    const bounds = camera.getVisibleBounds(TILE_SIZE);
    objects.ensureObjectsForBounds(tileMap, bounds.minX, bounds.minY, bounds.maxX, bounds.maxY, config);

    // 3. Apply camera transform (translate + scale)
    ctx.save();
    ctx.translate(
      Math.floor(canvas.width / 2 - camera.x * camera.zoom * TILE_SIZE),
      Math.floor(canvas.height / 2 - camera.y * camera.zoom * TILE_SIZE),
    );
    ctx.scale(camera.zoom, camera.zoom);

    // 4. Render terrain (cached layer)
    this.terrainRenderer.render(
      ctx, tileMap, camera, state.tick,
      timeSystem.season, weather.windDirection,
    );

    // 5. Render water (animated)
    this.waterRenderer.render(ctx, tileMap, camera, state.tick);

    // 6. Render objects (trees, bushes, rocks, campfires)
    const worldObjects = objects.getObjects();
    this.objectRenderer.render(
      ctx, worldObjects, camera, state.tick,
      timeSystem.season, weather.windDirection, weather.windStrength,
    );

    // 7. Render NPCs (with interpolation)
    this.npcRenderer.render(ctx, npcs, camera, state.tick, alpha);

    // Restore from zoom/translate for screen-space rendering
    ctx.restore();

    // Update and render particles in screen space
    this.particleSystem.update();
    this.particleSystem.render(ctx, camera);

    // 8. Render weather particles (screen space)
    this.weatherRenderer.render(
      ctx, weather, camera,
      canvas.width, canvas.height, state.tick,
    );

    // 9. Render lighting overlay (screen space)
    this.lightingRenderer.render(
      ctx, timeSystem, weather, worldObjects, camera,
      canvas.width, canvas.height, state.tick,
    );

    // 10. Transform is already reset for UI elements
  }

  getCamera(): Camera {
    return this.camera;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.setViewport(width, height);
    this.terrainRenderer.invalidateCache();
  }
}
