import { SimplexNoise, octaveNoise } from '../utils/SimplexNoise';
import { hashCoord } from '../utils/Math';
import { TileMap, TileType, createTile } from './TileMap';
import type { Tile, TileGenerator } from './TileMap';

function classifyTile(elevation: number, moisture: number): TileType {
  if (elevation < 0.25) return TileType.DeepWater;
  if (elevation < 0.32) return TileType.ShallowWater;
  if (elevation < 0.36) return TileType.Sand;
  if (elevation > 0.82) return TileType.CaveWall;
  if (elevation > 0.75) return TileType.Stone;

  if (moisture < 0.25) return TileType.DryDirt;
  if (moisture > 0.7) return TileType.DenseGrass;
  if (moisture > 0.5 && elevation < 0.55) return TileType.FlowerGrass;
  return TileType.Grass;
}

/** Create a tile generator function for the given seed. */
export function createTileGenerator(seed: number): TileGenerator {
  const elevNoise = new SimplexNoise(seed);
  const moistNoise = new SimplexNoise(seed + 1000);
  const tempNoise = new SimplexNoise(seed + 2000);

  return (x: number, y: number): Tile => {
    const elevation = octaveNoise(elevNoise, x, y, 2, 0.02);
    const moisture = octaveNoise(moistNoise, x, y, 2, 0.03);
    const temperature = octaveNoise(tempNoise, x, y, 1, 0.015);
    const type = classifyTile(elevation, moisture);
    const variant = hashCoord(x, y);
    return createTile(type, elevation, moisture, temperature, variant);
  };
}

export class TerrainGenerator {
  static generate(seed: number, width: number, height: number): TileMap {
    const generator = createTileGenerator(seed);
    const tileMap = new TileMap(width, height, generator);

    // Pre-generate the initial region
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        tileMap.setTile(x, y, generator(x, y));
      }
    }

    return tileMap;
  }
}
