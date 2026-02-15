// 2D Simplex Noise implementation with seeded permutation table

const GRAD2: [number, number][] = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

function dot2(g: [number, number], x: number, y: number): number {
  return g[0] * x + g[1] * y;
}

export class SimplexNoise {
  private perm: Uint8Array;
  private permMod8: Uint8Array;

  constructor(seed: number) {
    this.perm = new Uint8Array(512);
    this.permMod8 = new Uint8Array(512);

    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }

    // Seed-based shuffle using mulberry32
    let s = seed | 0;
    for (let i = 255; i > 0; i--) {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      const r = ((t ^ (t >>> 14)) >>> 0) % (i + 1);
      const tmp = p[i];
      p[i] = p[r];
      p[r] = tmp;
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod8[i] = this.perm[i] % 8;
    }
  }

  noise2D(x: number, y: number): number {
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    let i1: number;
    let j1: number;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permMod8[ii + this.perm[jj]];
    const gi1 = this.permMod8[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod8[ii + 1 + this.perm[jj + 1]];

    let n0: number;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) {
      n0 = 0.0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * dot2(GRAD2[gi0], x0, y0);
    }

    let n1: number;
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) {
      n1 = 0.0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * dot2(GRAD2[gi1], x1, y1);
    }

    let n2: number;
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) {
      n2 = 0.0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * dot2(GRAD2[gi2], x2, y2);
    }

    // Scale to [-1, 1]
    return 70.0 * (n0 + n1 + n2);
  }
}

export function octaveNoise(
  simplex: SimplexNoise,
  x: number,
  y: number,
  octaves: number,
  frequency: number,
  persistence: number = 0.5
): number {
  let value = 0;
  let amplitude = 1.0;
  let maxAmplitude = 0;

  for (let i = 0; i < octaves; i++) {
    value += simplex.noise2D(x * frequency, y * frequency) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }

  // Normalize from [-1, 1] to [0, 1]
  return (value / maxAmplitude + 1.0) * 0.5;
}
