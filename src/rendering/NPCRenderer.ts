import { lerp } from '../utils/Math';
import { rgba } from '../utils/Color';
import type { NPC } from '../entities/NPC';
import { getMood } from '../entities/Needs';
import type { Camera } from './Camera';
import { SpriteSheet } from './SpriteSheet';
import { TILE_SIZE } from './constants';

// Skin tone palette
const SKIN_TONES: [number, number, number][] = [
  [255, 220, 180],
  [220, 180, 140],
  [180, 130, 90],
  [120, 80, 50],
];

// Hair color palette
const HAIR_COLORS: [number, number, number][] = [
  [50, 30, 10],
  [120, 70, 20],
  [200, 170, 100],
  [180, 50, 20],
  [80, 80, 80],
  [220, 220, 200],
];

// Shirt color palette
const SHIRT_COLORS: [number, number, number][] = [
  [200, 50, 50],
  [50, 100, 200],
  [50, 160, 50],
  [200, 200, 50],
  [160, 50, 160],
  [200, 120, 50],
  [100, 200, 200],
  [200, 200, 200],
];

// Pants color palette
const PANTS_COLORS: [number, number, number][] = [
  [50, 50, 120],
  [80, 60, 40],
  [60, 60, 60],
  [100, 80, 60],
  [40, 80, 40],
  [90, 40, 40],
];

const MOOD_COLORS: Record<string, string> = {
  happy: rgba(50, 200, 50, 0.3),
  content: rgba(100, 180, 100, 0.2),
  worried: rgba(200, 200, 50, 0.3),
  distressed: rgba(200, 50, 50, 0.3),
};

type Direction = 'up' | 'down' | 'left' | 'right';

function drawNPCSprite(
  ctx: CanvasRenderingContext2D,
  skin: [number, number, number],
  hair: [number, number, number],
  shirt: [number, number, number],
  pants: [number, number, number],
  direction: Direction,
  walkFrame: number,
): void {
  const skinColor = rgba(skin[0], skin[1], skin[2]);
  const hairColor = rgba(hair[0], hair[1], hair[2]);
  const shirtColor = rgba(shirt[0], shirt[1], shirt[2]);
  const pantsColor = rgba(pants[0], pants[1], pants[2]);
  const shoeColor = rgba(60, 40, 20);

  if (direction === 'down') {
    // Hair
    ctx.fillStyle = hairColor;
    ctx.fillRect(5, 1, 6, 3);
    ctx.fillRect(4, 2, 1, 2);
    ctx.fillRect(11, 2, 1, 2);

    // Face
    ctx.fillStyle = skinColor;
    ctx.fillRect(5, 3, 6, 4);

    // Eyes
    ctx.fillStyle = rgba(30, 30, 30);
    ctx.fillRect(6, 4, 1, 1);
    ctx.fillRect(9, 4, 1, 1);

    // Body / shirt
    ctx.fillStyle = shirtColor;
    ctx.fillRect(5, 7, 6, 4);
    // Arms
    ctx.fillRect(3, 7, 2, 3);
    ctx.fillRect(11, 7, 2, 3);

    // Pants
    ctx.fillStyle = pantsColor;
    ctx.fillRect(5, 11, 3, 2);
    ctx.fillRect(8, 11, 3, 2);

    // Shoes
    ctx.fillStyle = shoeColor;
    if (walkFrame === 0) {
      ctx.fillRect(5, 13, 3, 2);
      ctx.fillRect(8, 13, 3, 2);
    } else {
      ctx.fillRect(4, 13, 3, 2);
      ctx.fillRect(9, 13, 3, 2);
    }
  } else if (direction === 'up') {
    // Hair (covers whole head from back)
    ctx.fillStyle = hairColor;
    ctx.fillRect(5, 1, 6, 6);
    ctx.fillRect(4, 2, 1, 4);
    ctx.fillRect(11, 2, 1, 4);

    // Body / shirt
    ctx.fillStyle = shirtColor;
    ctx.fillRect(5, 7, 6, 4);
    ctx.fillRect(3, 7, 2, 3);
    ctx.fillRect(11, 7, 2, 3);

    // Pants
    ctx.fillStyle = pantsColor;
    ctx.fillRect(5, 11, 3, 2);
    ctx.fillRect(8, 11, 3, 2);

    // Shoes
    ctx.fillStyle = shoeColor;
    if (walkFrame === 0) {
      ctx.fillRect(5, 13, 3, 2);
      ctx.fillRect(8, 13, 3, 2);
    } else {
      ctx.fillRect(4, 13, 3, 2);
      ctx.fillRect(9, 13, 3, 2);
    }
  } else if (direction === 'left') {
    // Hair
    ctx.fillStyle = hairColor;
    ctx.fillRect(5, 1, 5, 3);
    ctx.fillRect(4, 2, 1, 2);

    // Face (side profile)
    ctx.fillStyle = skinColor;
    ctx.fillRect(5, 3, 5, 4);
    ctx.fillRect(4, 4, 1, 2);

    // Eye
    ctx.fillStyle = rgba(30, 30, 30);
    ctx.fillRect(5, 4, 1, 1);

    // Body
    ctx.fillStyle = shirtColor;
    ctx.fillRect(5, 7, 5, 4);
    ctx.fillRect(4, 7, 1, 3);
    ctx.fillRect(10, 8, 1, 2);

    // Pants
    ctx.fillStyle = pantsColor;
    ctx.fillRect(5, 11, 5, 2);

    // Shoes - walk animation
    ctx.fillStyle = shoeColor;
    if (walkFrame === 0) {
      ctx.fillRect(5, 13, 4, 2);
    } else {
      ctx.fillRect(3, 13, 4, 2);
    }
  } else {
    // right - mirror of left
    ctx.fillStyle = hairColor;
    ctx.fillRect(6, 1, 5, 3);
    ctx.fillRect(11, 2, 1, 2);

    ctx.fillStyle = skinColor;
    ctx.fillRect(6, 3, 5, 4);
    ctx.fillRect(11, 4, 1, 2);

    ctx.fillStyle = rgba(30, 30, 30);
    ctx.fillRect(10, 4, 1, 1);

    ctx.fillStyle = shirtColor;
    ctx.fillRect(6, 7, 5, 4);
    ctx.fillRect(11, 7, 1, 3);
    ctx.fillRect(5, 8, 1, 2);

    ctx.fillStyle = pantsColor;
    ctx.fillRect(6, 11, 5, 2);

    ctx.fillStyle = shoeColor;
    if (walkFrame === 0) {
      ctx.fillRect(7, 13, 4, 2);
    } else {
      ctx.fillRect(9, 13, 4, 2);
    }
  }
}

export class NPCRenderer {
  private spriteSheet: SpriteSheet;

  constructor() {
    this.spriteSheet = new SpriteSheet();
  }

  render(
    ctx: CanvasRenderingContext2D,
    npcs: NPC[],
    camera: Camera,
    tick: number,
    alpha: number,
  ): void {
    const bounds = camera.getVisibleBounds(TILE_SIZE);

    for (const npc of npcs) {
      if (
        npc.x < bounds.minX - 1 || npc.x > bounds.maxX + 1 ||
        npc.y < bounds.minY - 1 || npc.y > bounds.maxY + 1
      ) {
        continue;
      }

      this.renderNPC(ctx, npc, tick, alpha);
    }
  }

  private renderNPC(
    ctx: CanvasRenderingContext2D,
    npc: NPC,
    tick: number,
    alpha: number,
  ): void {
    // Sub-tile interpolation
    const drawX = lerp(npc.prevX, npc.x, alpha);
    const drawY = lerp(npc.prevY, npc.y, alpha);

    const px = drawX * TILE_SIZE;
    const py = drawY * TILE_SIZE;

    // Idle breathing
    const breathOffset = npc.isMoving
      ? 0
      : Math.sin(npc.idlePhase + tick * 0.05) * 0.5;

    // Spawn / death animation
    let globalAlpha = 1;
    if (npc.spawnAnimation < 1) {
      globalAlpha = npc.spawnAnimation;
    }
    if (!npc.alive && npc.deathAnimation > 0) {
      globalAlpha = 1 - npc.deathAnimation;
    }

    ctx.save();
    ctx.globalAlpha = globalAlpha;

    // Mood aura beneath NPC
    const mood = getMood(npc.needs);
    const auraColor = MOOD_COLORS[mood] ?? MOOD_COLORS['content'];
    ctx.fillStyle = auraColor;
    ctx.beginPath();
    ctx.ellipse(
      px + TILE_SIZE / 2,
      py + TILE_SIZE - 1,
      6, 3, 0, 0, Math.PI * 2,
    );
    ctx.fill();

    // Walk frame
    const walkFrame = npc.isMoving ? (Math.floor(tick / 8) % 2) : 0;

    // Get or generate sprite
    const skin = SKIN_TONES[npc.appearance.skinTone % SKIN_TONES.length];
    const hair = HAIR_COLORS[npc.appearance.hairColor % HAIR_COLORS.length];
    const shirt = SHIRT_COLORS[npc.appearance.shirtColor % SHIRT_COLORS.length];
    const pants = PANTS_COLORS[npc.appearance.pantsColor % PANTS_COLORS.length];

    const spriteKey = `npc_${npc.appearance.skinTone}_${npc.appearance.hairColor}_${npc.appearance.shirtColor}_${npc.appearance.pantsColor}_${npc.direction}_${walkFrame}`;

    const sprite = this.spriteSheet.getSprite(spriteKey, TILE_SIZE, TILE_SIZE, (sctx) => {
      drawNPCSprite(sctx, skin, hair, shirt, pants, npc.direction, walkFrame);
    });

    ctx.drawImage(sprite, Math.floor(px), Math.floor(py + breathOffset));

    // Action indicators
    this.drawActionIndicator(ctx, npc, px, py, tick);

    ctx.globalAlpha = 1;
    ctx.restore();

    // Death particles
    if (!npc.alive && npc.deathAnimation > 0 && npc.deathAnimation < 0.5) {
      this.drawDeathParticles(ctx, px, py, npc.deathAnimation);
    }
  }

  private drawActionIndicator(
    ctx: CanvasRenderingContext2D,
    npc: NPC,
    px: number,
    py: number,
    tick: number,
  ): void {
    const indicatorY = py - 6;
    const centerX = px + TILE_SIZE / 2;

    switch (npc.currentAction) {
      case 'REST': {
        // "Zzz" floating text
        const floatY = Math.sin(tick * 0.06) * 2;
        ctx.fillStyle = rgba(200, 200, 255, 0.8);
        // Z characters
        const zOff = (tick * 0.02) % 4;
        ctx.fillRect(centerX + 2, indicatorY - zOff, 3, 1);
        ctx.fillRect(centerX + 4, indicatorY - zOff + 1, 1, 1);
        ctx.fillRect(centerX + 3, indicatorY - zOff + 2, 1, 1);
        ctx.fillRect(centerX + 2, indicatorY - zOff + 3, 3, 1);

        // Smaller z
        ctx.fillRect(centerX + 6, indicatorY - zOff - 2 + floatY, 2, 1);
        ctx.fillRect(centerX + 7, indicatorY - zOff - 1 + floatY, 1, 1);
        ctx.fillRect(centerX + 6, indicatorY - zOff + floatY, 2, 1);
        break;
      }
      case 'FORAGE': {
        // Berry picking / digging animation
        if (npc.equippedTool?.type === 'stone_shovel') {
          // Shovel digging animation
          const digFrame = Math.floor(tick / 8) % 3;
          // Shovel handle
          ctx.fillStyle = rgba(140, 100, 50);
          ctx.fillRect(centerX - 1, indicatorY - 1, 1, 4);
          // Shovel blade
          ctx.fillStyle = rgba(160, 160, 170);
          if (digFrame === 0) {
            ctx.fillRect(centerX - 3, indicatorY + 2, 3, 2);
          } else if (digFrame === 1) {
            ctx.fillRect(centerX - 3, indicatorY + 1, 3, 2);
          } else {
            ctx.fillRect(centerX - 3, indicatorY + 3, 3, 2);
          }
          // Dirt particles on dig
          if (digFrame === 2) {
            ctx.fillStyle = rgba(120, 90, 50, 0.6);
            ctx.fillRect(centerX + 1, indicatorY + 1, 1, 1);
            ctx.fillRect(centerX + 2, indicatorY, 1, 1);
          }
        } else {
          // Hand picking animation (default)
          const handFrame = Math.floor(tick / 10) % 2;
          ctx.fillStyle = rgba(200, 180, 100);
          if (handFrame === 0) {
            ctx.fillRect(centerX - 1, indicatorY + 1, 2, 2);
          } else {
            ctx.fillRect(centerX - 1, indicatorY, 2, 2);
          }
          ctx.fillRect(centerX, indicatorY + 2, 1, 2);
        }
        break;
      }
      case 'EXPLORE': {
        // "!" when exploring new areas
        ctx.fillStyle = rgba(255, 255, 100, 0.9);
        ctx.fillRect(centerX, indicatorY - 2, 1, 3);
        ctx.fillRect(centerX, indicatorY + 2, 1, 1);
        break;
      }
      case 'SOCIALIZE': {
        // Speech bubble
        ctx.fillStyle = rgba(255, 255, 255, 0.8);
        ctx.fillRect(centerX - 3, indicatorY - 4, 7, 5);
        ctx.fillRect(centerX - 4, indicatorY - 3, 1, 3);
        ctx.fillRect(centerX + 4, indicatorY - 3, 1, 3);
        // Tail
        ctx.fillRect(centerX - 1, indicatorY + 1, 2, 1);
        ctx.fillRect(centerX, indicatorY + 2, 1, 1);
        // Dots in bubble
        ctx.fillStyle = rgba(80, 80, 80);
        ctx.fillRect(centerX - 2, indicatorY - 2, 1, 1);
        ctx.fillRect(centerX, indicatorY - 2, 1, 1);
        ctx.fillRect(centerX + 2, indicatorY - 2, 1, 1);
        break;
      }
      case 'GATHER': {
        if (npc.equippedTool?.type === 'stone_pickaxe') {
          // Pickaxe mining animation
          const mineFrame = Math.floor(tick / 7) % 3;
          // Handle (diagonal)
          ctx.fillStyle = rgba(140, 100, 50);
          ctx.fillRect(centerX - 1, indicatorY, 1, 4);
          // Pickaxe head
          ctx.fillStyle = rgba(140, 140, 150);
          if (mineFrame === 0) {
            ctx.fillRect(centerX - 3, indicatorY - 1, 3, 1);
            ctx.fillRect(centerX - 3, indicatorY - 2, 1, 1);
          } else if (mineFrame === 1) {
            ctx.fillRect(centerX - 3, indicatorY, 3, 1);
            ctx.fillRect(centerX - 3, indicatorY - 1, 1, 1);
          } else {
            ctx.fillRect(centerX - 3, indicatorY + 1, 3, 1);
            ctx.fillRect(centerX - 3, indicatorY, 1, 1);
          }
          // Spark particles on strike
          if (mineFrame === 2) {
            ctx.fillStyle = rgba(255, 220, 100, 0.8);
            ctx.fillRect(centerX + 1, indicatorY - 1, 1, 1);
            ctx.fillRect(centerX + 2, indicatorY + 1, 1, 1);
          }
        } else {
          // Axe chopping animation (default / wooden_axe)
          const swingFrame = Math.floor(tick / 6) % 3;
          ctx.fillStyle = rgba(160, 120, 60);
          // Handle
          ctx.fillRect(centerX - 1, indicatorY - 1, 1, 4);
          // Axe blade
          ctx.fillStyle = rgba(180, 180, 190);
          if (swingFrame === 0) {
            ctx.fillRect(centerX - 3, indicatorY - 2, 2, 2);
          } else if (swingFrame === 1) {
            ctx.fillRect(centerX - 3, indicatorY - 1, 2, 2);
          } else {
            ctx.fillRect(centerX - 3, indicatorY, 2, 2);
          }
          // Wood chip particles on chop
          if (swingFrame === 2) {
            ctx.fillStyle = rgba(180, 140, 80, 0.7);
            ctx.fillRect(centerX + 1, indicatorY - 2, 1, 1);
            ctx.fillRect(centerX + 2, indicatorY, 1, 1);
          }
        }
        break;
      }
      case 'CRAFT': {
        // Hammer animation
        const hammerFrame = Math.floor(tick / 6) % 2;
        ctx.fillStyle = rgba(140, 100, 60);
        // Handle
        ctx.fillRect(centerX, indicatorY, 1, 3);
        // Head
        ctx.fillStyle = rgba(160, 160, 170);
        if (hammerFrame === 0) {
          ctx.fillRect(centerX - 1, indicatorY - 2, 3, 2);
        } else {
          ctx.fillRect(centerX - 1, indicatorY - 1, 3, 2);
        }
        break;
      }
      case 'SEEK_SHELTER': {
        // Running arrow indicator
        ctx.fillStyle = rgba(255, 150, 50, 0.9);
        ctx.fillRect(centerX - 1, indicatorY - 2, 3, 1);
        ctx.fillRect(centerX, indicatorY - 3, 1, 1);
        ctx.fillRect(centerX, indicatorY - 1, 1, 1);
        break;
      }
      case 'BUILD': {
        // Brick-laying animation
        const brickFrame = Math.floor(tick / 10) % 2;
        // Brick
        ctx.fillStyle = rgba(180, 100, 50);
        ctx.fillRect(centerX - 2, indicatorY + (brickFrame === 0 ? 0 : 1), 4, 2);
        // Mortar line
        ctx.fillStyle = rgba(200, 200, 200, 0.7);
        ctx.fillRect(centerX - 2, indicatorY + 2, 4, 1);
        break;
      }
      case 'FISH': {
        // Fishing rod animation — rod line dipping into water
        const bobFrame = Math.floor(tick / 12) % 3;
        // Rod handle (brown)
        ctx.fillStyle = rgba(140, 90, 40);
        ctx.fillRect(centerX - 1, indicatorY - 2, 1, 5);
        // Rod tip angled out
        ctx.fillStyle = rgba(160, 110, 50);
        ctx.fillRect(centerX, indicatorY - 3, 1, 1);
        ctx.fillRect(centerX + 1, indicatorY - 4, 1, 1);
        // Fishing line (thin, gray)
        ctx.fillStyle = rgba(180, 180, 180, 0.8);
        ctx.fillRect(centerX + 2, indicatorY - 4, 1, 3 + bobFrame);
        // Bobber (red dot at end of line)
        ctx.fillStyle = rgba(220, 40, 30);
        ctx.fillRect(centerX + 2, indicatorY - 1 + bobFrame, 1, 1);
        // Water splash on bob frame 2
        if (bobFrame === 2) {
          ctx.fillStyle = rgba(100, 180, 255, 0.6);
          ctx.fillRect(centerX + 1, indicatorY + bobFrame, 1, 1);
          ctx.fillRect(centerX + 3, indicatorY + bobFrame, 1, 1);
        }
        break;
      }
    }
  }

  private drawDeathParticles(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    progress: number,
  ): void {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = progress * 20;
      const pAlpha = 1 - progress * 2;
      if (pAlpha <= 0) continue;

      ctx.fillStyle = rgba(200, 200, 200, pAlpha);
      ctx.fillRect(
        px + TILE_SIZE / 2 + Math.cos(angle) * dist,
        py + TILE_SIZE / 2 + Math.sin(angle) * dist,
        2, 2,
      );
    }
  }
}
