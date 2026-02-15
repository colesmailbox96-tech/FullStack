// Color utility functions

export function rgba(r: number, g: number, b: number, a: number = 1): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

export function lerpColor(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): [number, number, number] {
  return [
    c1[0] + (c2[0] - c1[0]) * t,
    c1[1] + (c2[1] - c1[1]) * t,
    c1[2] + (c2[2] - c1[2]) * t,
  ];
}

export function adjustBrightness(
  color: [number, number, number],
  factor: number
): [number, number, number] {
  return [
    Math.min(255, Math.max(0, color[0] * factor)),
    Math.min(255, Math.max(0, color[1] * factor)),
    Math.min(255, Math.max(0, color[2] * factor)),
  ];
}

export function colorToString(
  color: [number, number, number],
  alpha: number = 1
): string {
  return rgba(color[0], color[1], color[2], alpha);
}
