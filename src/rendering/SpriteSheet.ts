export class SpriteSheet {
  private cache: Map<string, CanvasImageSource>;

  constructor() {
    this.cache = new Map();
  }

  getSprite(
    key: string,
    width: number,
    height: number,
    generator: (ctx: CanvasRenderingContext2D) => void,
  ): CanvasImageSource {
    const cached = this.cache.get(key);
    if (cached) return cached;

    let canvas: HTMLCanvasElement | OffscreenCanvas;
    let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

    if (typeof OffscreenCanvas !== 'undefined') {
      const oc = new OffscreenCanvas(width, height);
      ctx = oc.getContext('2d');
      canvas = oc;
    } else {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      ctx = c.getContext('2d');
      canvas = c;
    }

    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      generator(ctx as CanvasRenderingContext2D);
    }

    const result = canvas as unknown as CanvasImageSource;
    this.cache.set(key, result);
    return result;
  }

  clear(): void {
    this.cache.clear();
  }
}
