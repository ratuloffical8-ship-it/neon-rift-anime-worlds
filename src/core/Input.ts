// src/core/Input.ts

export interface MoveAxis {
  /** -1 = left, +1 = right */
  x: number;
  /** -1 = backward, +1 = forward */
  y: number;
}

/**
 * Keyboard, mouse-drag, touch-drag and virtual (on-screen) input.
 * MobileControls feeds the virtual joystick and virtual keys.
 */
export class Input {
  private readonly keys = new Set<string>();
  private readonly pressed = new Set<string>();
  private lookX = 0;
  private lookY = 0;
  private zoom = 0;
  private dragging = false;
  private activePointer: number | null = null;
  private lastX = 0;
  private lastY = 0;
  private joyX = 0;
  private joyY = 0;

  constructor(private readonly target: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    target.addEventListener('pointerdown', this.onPointerDown);
    target.addEventListener('pointermove', this.onPointerMove);
    target.addEventListener('pointerup', this.onPointerEnd);
    target.addEventListener('pointercancel', this.onPointerEnd);
    target.addEventListener('wheel', this.onWheel, { passive: false });
  }

  /** True while the key is held. Use KeyboardEvent.code, e.g. "KeyW". */
  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  /** True once per key press (consumed when read). */
  wasPressed(code: string): boolean {
    return this.pressed.delete(code);
  }

  /** Sets a virtual key state (used by on-screen buttons). */
  setVirtualKey(code: string, down: boolean): void {
    if (down) {
      if (!this.keys.has(code)) this.pressed.add(code);
      this.keys.add(code);
    } else {
      this.keys.delete(code);
    }
  }

  /** Sets the virtual joystick axis. x: right +, y: forward +, range -1..1. */
  setJoystick(x: number, y: number): void {
    this.joyX = x;
    this.joyY = y;
  }

  /** Movement axis. Joystick (analog) wins over WASD (normalised). */
  getMoveAxis(): MoveAxis {
    const joyLength = Math.hypot(this.joyX, this.joyY);
    if (joyLength > 0) {
      const scale = joyLength > 1 ? 1 / joyLength : 1;
      return { x: this.joyX * scale, y: this.joyY * scale };
    }

    const x = (this.isDown('KeyD') ? 1 : 0) - (this.isDown('KeyA') ? 1 : 0);
    const y = (this.isDown('KeyW') ? 1 : 0) - (this.isDown('KeyS') ? 1 : 0);
    const length = Math.hypot(x, y);
    return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
  }

  /** Accumulated drag movement in pixels since the last call. */
  consumeLook(): { x: number; y: number } {
    const result = { x: this.lookX, y: this.lookY };
    this.lookX = 0;
    this.lookY = 0;
    return result;
  }

  /** Accumulated wheel zoom since the last call. */
  consumeZoom(): number {
    const result = this.zoom;
    this.zoom = 0;
    return result;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.target.removeEventListener('pointerdown', this.onPointerDown);
    this.target.removeEventListener('pointermove', this.onPointerMove);
    this.target.removeEventListener('pointerup', this.onPointerEnd);
    this.target.removeEventListener('pointercancel', this.onPointerEnd);
    this.target.removeEventListener('wheel', this.onWheel);
    this.keys.clear();
    this.pressed.clear();
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space') e.preventDefault();
    if (!e.repeat) this.pressed.add(e.code);
    this.keys.add(e.code);
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private readonly onBlur = (): void => {
    this.keys.clear();
    this.pressed.clear();
    this.dragging = false;
    this.activePointer = null;
    this.joyX = 0;
    this.joyY = 0;
  };

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (this.activePointer !== null) return;
    this.dragging = true;
    this.activePointer = e.pointerId;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.target.setPointerCapture(e.pointerId);
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging || e.pointerId !== this.activePointer) return;
    this.lookX += e.clientX - this.lastX;
    this.lookY += e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private readonly onPointerEnd = (e: PointerEvent): void => {
    if (e.pointerId !== this.activePointer) return;
    this.dragging = false;
    this.activePointer = null;
    if (this.target.hasPointerCapture(e.pointerId)) {
      this.target.releasePointerCapture(e.pointerId);
    }
  };

  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.zoom += e.deltaY;
  };
  }
