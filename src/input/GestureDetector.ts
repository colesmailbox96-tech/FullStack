export class GestureDetector {
  private initialPinchDistance: number | null = null;
  private lastPinchDistance: number | null = null;

  constructor() {}

  handleTouchStart(touches: TouchList): void {
    if (touches.length === 2) {
      this.initialPinchDistance = this.getTouchDistance(touches);
      this.lastPinchDistance = this.initialPinchDistance;
    }
  }

  handleTouchMove(touches: TouchList): { pinchDelta: number } | null {
    if (touches.length !== 2 || this.lastPinchDistance === null) {
      return null;
    }

    const currentDistance = this.getTouchDistance(touches);
    const pinchDelta = currentDistance - this.lastPinchDistance;
    this.lastPinchDistance = currentDistance;

    return { pinchDelta };
  }

  handleTouchEnd(): void {
    this.initialPinchDistance = null;
    this.lastPinchDistance = null;
  }

  isPinching(): boolean {
    return this.lastPinchDistance !== null;
  }

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
