import { describe, it, expect } from 'vitest';
import { Camera } from './Camera';

describe('Camera', () => {
  it('initializes with correct viewport and default values', () => {
    const cam = new Camera(800, 600);
    expect(cam.viewportWidth).toBe(800);
    expect(cam.viewportHeight).toBe(600);
    expect(cam.x).toBe(0);
    expect(cam.y).toBe(0);
    expect(cam.zoom).toBe(1);
    expect(cam.targetX).toBe(0);
    expect(cam.targetY).toBe(0);
    expect(cam.targetZoom).toBe(1);
  });

  describe('update', () => {
    it('lerps position toward target when not dragging', () => {
      const cam = new Camera(800, 600);
      cam.targetX = 10;
      cam.targetY = 20;
      cam.update(false);
      // With lerp factor 0.15: 0 + (10 - 0) * 0.15 = 1.5
      expect(cam.x).toBeCloseTo(1.5);
      expect(cam.y).toBeCloseTo(3.0);
    });

    it('snaps position to target when dragging', () => {
      const cam = new Camera(800, 600);
      cam.targetX = 10;
      cam.targetY = 20;
      cam.update(true);
      expect(cam.x).toBe(10);
      expect(cam.y).toBe(20);
    });

    it('defaults to lerp when isDragging not specified', () => {
      const cam = new Camera(800, 600);
      cam.targetX = 10;
      cam.targetY = 20;
      cam.update();
      expect(cam.x).toBeCloseTo(1.5);
      expect(cam.y).toBeCloseTo(3.0);
    });

    it('always lerps zoom regardless of dragging', () => {
      const cam = new Camera(800, 600);
      cam.targetZoom = 2;
      cam.update(true);
      // Zoom should lerp even when dragging: 1 + (2 - 1) * 0.15 = 1.15
      expect(cam.zoom).toBeCloseTo(1.15);
    });
  });

  describe('pan', () => {
    it('updates both position and target by the same amount', () => {
      const cam = new Camera(800, 600);
      cam.pan(5, 10);
      expect(cam.x).toBe(5);
      expect(cam.y).toBe(10);
      expect(cam.targetX).toBe(5);
      expect(cam.targetY).toBe(10);
    });
  });

  describe('drag does not cause lag', () => {
    it('camera tracks finger exactly during drag sequence', () => {
      const cam = new Camera(800, 600);
      cam.x = 50;
      cam.y = 50;
      cam.targetX = 50;
      cam.targetY = 50;

      // Simulate dragging: pan then update with isDragging=true
      cam.pan(5, 3);
      cam.update(true);
      expect(cam.x).toBe(55);
      expect(cam.y).toBe(53);

      // Another drag frame
      cam.pan(-2, 1);
      cam.update(true);
      expect(cam.x).toBe(53);
      expect(cam.y).toBe(54);

      // x and targetX should always match during drag
      expect(cam.x).toBe(cam.targetX);
      expect(cam.y).toBe(cam.targetY);
    });

    it('camera smoothly settles after drag ends', () => {
      const cam = new Camera(800, 600);
      cam.x = 50;
      cam.y = 50;
      cam.targetX = 50;
      cam.targetY = 50;

      // Drag to new position
      cam.pan(10, 10);
      cam.update(true);
      expect(cam.x).toBe(60);
      expect(cam.y).toBe(60);

      // No more drag — update without dragging should still work (no further target change)
      cam.update(false);
      // Since x == targetX, lerp(60, 60, 0.15) = 60
      expect(cam.x).toBe(60);
      expect(cam.y).toBe(60);
    });
  });

  describe('setZoom', () => {
    it('clamps zoom within bounds', () => {
      const cam = new Camera(800, 600);
      cam.setZoom(10);
      expect(cam.targetZoom).toBe(4.0);
      cam.setZoom(0.1);
      expect(cam.targetZoom).toBe(0.5);
    });
  });
});
