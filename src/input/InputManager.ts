import { GestureDetector } from './GestureDetector';

export interface InputState {
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  dragDeltaX: number;
  dragDeltaY: number;
  clickX: number;
  clickY: number;
  hasClick: boolean;
  zoomDelta: number;
  keys: Set<string>;
  isTouchDrag: boolean;
}

const DRAG_THRESHOLD = 5;

export class InputManager {
  private state: InputState;
  private canvas: HTMLCanvasElement;
  private gestureDetector: GestureDetector;

  private mouseDown = false;
  private mouseMoved = false;
  private mouseStartX = 0;
  private mouseStartY = 0;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private touchStartX = 0;
  private touchStartY = 0;
  private touchMoved = false;
  private singleTouchActive = false;
  private lastTouchX = 0;
  private lastTouchY = 0;

  // Bound handlers for cleanup
  private readonly onMouseDown: (e: MouseEvent) => void;
  private readonly onMouseMove: (e: MouseEvent) => void;
  private readonly onMouseUp: (e: MouseEvent) => void;
  private readonly onWheel: (e: WheelEvent) => void;
  private readonly onTouchStart: (e: TouchEvent) => void;
  private readonly onTouchMove: (e: TouchEvent) => void;
  private readonly onTouchEnd: (e: TouchEvent) => void;
  private readonly onKeyDown: (e: KeyboardEvent) => void;
  private readonly onKeyUp: (e: KeyboardEvent) => void;
  private readonly onContextMenu: (e: Event) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gestureDetector = new GestureDetector();

    this.state = {
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      dragDeltaX: 0,
      dragDeltaY: 0,
      clickX: 0,
      clickY: 0,
      hasClick: false,
      zoomDelta: 0,
      keys: new Set<string>(),
      isTouchDrag: false,
    };

    this.onMouseDown = this.handleMouseDown.bind(this);
    this.onMouseMove = this.handleMouseMove.bind(this);
    this.onMouseUp = this.handleMouseUp.bind(this);
    this.onWheel = this.handleWheel.bind(this);
    this.onTouchStart = this.handleTouchStart.bind(this);
    this.onTouchMove = this.handleTouchMove.bind(this);
    this.onTouchEnd = this.handleTouchEnd.bind(this);
    this.onKeyDown = this.handleKeyDown.bind(this);
    this.onKeyUp = this.handleKeyUp.bind(this);
    this.onContextMenu = (e: Event) => e.preventDefault();

    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  getState(): InputState {
    return this.state;
  }

  consumeClick(): { x: number; y: number } | null {
    if (!this.state.hasClick) {
      return null;
    }
    const click = { x: this.state.clickX, y: this.state.clickY };
    this.state.hasClick = false;
    return click;
  }

  consumeZoom(): number {
    const delta = this.state.zoomDelta;
    this.state.zoomDelta = 0;
    return delta;
  }

  consumeDrag(): { dx: number; dy: number } {
    const drag = { dx: this.state.dragDeltaX, dy: this.state.dragDeltaY };
    this.state.dragDeltaX = 0;
    this.state.dragDeltaY = 0;
    return drag;
  }

  update(): void {
    // Apply keyboard-driven pan
    const panSpeed = 4;
    if (this.state.keys.has('ArrowLeft')) this.state.dragDeltaX -= panSpeed;
    if (this.state.keys.has('ArrowRight')) this.state.dragDeltaX += panSpeed;
    if (this.state.keys.has('ArrowUp')) this.state.dragDeltaY -= panSpeed;
    if (this.state.keys.has('ArrowDown')) this.state.dragDeltaY += panSpeed;

    // Apply keyboard-driven zoom
    if (this.state.keys.has('+') || this.state.keys.has('=')) this.state.zoomDelta += 1;
    if (this.state.keys.has('-')) this.state.zoomDelta -= 1;
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }

  // --- Mouse handlers ---

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.mouseDown = true;
    this.mouseMoved = false;
    this.mouseStartX = e.clientX;
    this.mouseStartY = e.clientY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.mouseDown) return;

    const dx = e.clientX - this.mouseStartX;
    const dy = e.clientY - this.mouseStartY;

    if (!this.mouseMoved && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
      this.mouseMoved = true;
      this.state.isDragging = true;
      this.state.isTouchDrag = false;
      this.state.dragStartX = this.mouseStartX;
      this.state.dragStartY = this.mouseStartY;
    }

    if (this.mouseMoved) {
      this.state.dragDeltaX += e.clientX - this.lastMouseX;
      this.state.dragDeltaY += e.clientY - this.lastMouseY;
    }

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button !== 0) return;

    if (!this.mouseMoved && this.mouseDown) {
      const rect = this.canvas.getBoundingClientRect();
      this.state.clickX = e.clientX - rect.left;
      this.state.clickY = e.clientY - rect.top;
      this.state.hasClick = true;
    }

    this.mouseDown = false;
    this.mouseMoved = false;
    this.state.isDragging = false;
    // Don't reset isTouchDrag here - it should only be managed by touch handlers
  }

  // --- Wheel handler ---

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    this.state.zoomDelta += -Math.sign(e.deltaY);
  }

  // --- Touch handlers ---

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();

    if (e.touches.length === 1) {
      this.singleTouchActive = true;
      this.touchMoved = false;
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      this.lastTouchX = e.touches[0].clientX;
      this.lastTouchY = e.touches[0].clientY;
    }

    if (e.touches.length === 2) {
      this.singleTouchActive = false;
      this.gestureDetector.handleTouchStart(e.touches);
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();

    if (e.touches.length === 2) {
      const result = this.gestureDetector.handleTouchMove(e.touches);
      if (result) {
        this.state.zoomDelta += result.pinchDelta * 0.01;
      }
      return;
    }

    if (e.touches.length === 1 && this.singleTouchActive) {
      const dx = e.touches[0].clientX - this.touchStartX;
      const dy = e.touches[0].clientY - this.touchStartY;

      if (!this.touchMoved && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        this.touchMoved = true;
        this.state.isDragging = true;
        this.state.isTouchDrag = true;
        this.state.dragStartX = this.touchStartX;
        this.state.dragStartY = this.touchStartY;
      }

      if (this.touchMoved) {
        this.state.dragDeltaX += e.touches[0].clientX - this.lastTouchX;
        this.state.dragDeltaY += e.touches[0].clientY - this.lastTouchY;
      }

      this.lastTouchX = e.touches[0].clientX;
      this.lastTouchY = e.touches[0].clientY;
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (this.gestureDetector.isPinching()) {
      this.gestureDetector.handleTouchEnd();
      // Reset touch drag state when ending pinch gesture
      if (e.touches.length === 0) {
        this.state.isTouchDrag = false;
      }
      return;
    }

    if (this.singleTouchActive && !this.touchMoved) {
      const rect = this.canvas.getBoundingClientRect();
      this.state.clickX = this.lastTouchX - rect.left;
      this.state.clickY = this.lastTouchY - rect.top;
      this.state.hasClick = true;
    }

    if (e.touches.length === 0) {
      this.singleTouchActive = false;
      this.touchMoved = false;
      this.state.isDragging = false;
      this.state.isTouchDrag = false;
    }
  }

  // --- Keyboard handlers ---

  private handleKeyDown(e: KeyboardEvent): void {
    this.state.keys.add(e.key);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.state.keys.delete(e.key);
  }
}
