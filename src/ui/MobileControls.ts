// src/ui/MobileControls.ts
import type { Input } from '../core/Input';

const JOYSTICK_RADIUS = 48;
const DEADZONE = 0.1;

/**
 * On-screen controls for touch devices: virtual joystick, jump button
 * and a sprint toggle. Feeds the shared Input instance.
 * Camera rotation stays on the canvas (drag with another finger).
 */
export class MobileControls {
  private readonly root: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private readonly joystickBase: HTMLDivElement;
  private readonly sprintButton: HTMLButtonElement;
  private joystickPointer: number | null = null;
  private sprintOn = false;

  constructor(private readonly input: Input) {
    this.root = document.createElement('div');
    Object.assign(this.root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '5',
      pointerEvents: 'none',
      userSelect: 'none',
      webkitUserSelect: 'none',
    });
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());

    this.joystickBase = document.createElement('div');
    Object.assign(this.joystickBase.style, {
      position: 'absolute',
      left: 'calc(24px + env(safe-area-inset-left, 0px))',
      bottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
      width: `${JOYSTICK_RADIUS * 2 + 24}px`,
      height: `${JOYSTICK_RADIUS * 2 + 24}px`,
      borderRadius: '50%',
      background: 'rgba(124, 58, 237, 0.25)',
      border: '2px solid rgba(0, 229, 255, 0.6)',
      pointerEvents: 'auto',
      touchAction: 'none',
    });

    this.knob = document.createElement('div');
    Object.assign(this.knob.style, {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: '52px',
      height: '52px',
      marginLeft: '-26px',
      marginTop: '-26px',
      borderRadius: '50%',
      background: 'rgba(0, 229, 255, 0.7)',
      boxShadow: '0 0 14px rgba(0, 229, 255, 0.8)',
    });
    this.joystickBase.appendChild(this.knob);

    const jumpButton = this.createButton('JUMP', {
      right: 'calc(24px + env(safe-area-inset-right, 0px))',
      bottom: 'calc(40px + env(safe-area-inset-bottom, 0px))',
    });
    this.sprintButton = this.createButton('SPRINT', {
      right: 'calc(120px + env(safe-area-inset-right, 0px))',
      bottom: 'calc(40px + env(safe-area-inset-bottom, 0px))',
    });

    jumpButton.addEventListener('pointerdown', this.onJumpDown);
    jumpButton.addEventListener('pointerup', this.onJumpUp);
    jumpButton.addEventListener('pointercancel', this.onJumpUp);
    this.sprintButton.addEventListener('pointerdown', this.onSprintToggle);

    this.joystickBase.addEventListener('pointerdown', this.onJoystickDown);
    this.joystickBase.addEventListener('pointermove', this.onJoystickMove);
    this.joystickBase.addEventListener('pointerup', this.onJoystickEnd);
    this.joystickBase.addEventListener('pointercancel', this.onJoystickEnd);

    this.root.append(this.joystickBase, this.sprintButton, jumpButton);
    document.body.appendChild(this.root);
  }

  /** True when the device reports touch support. */
  static isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  dispose(): void {
    this.input.setJoystick(0, 0);
    this.input.setVirtualKey('Space', false);
    this.input.setVirtualKey('ShiftLeft', false);
    this.root.remove();
  }

  private createButton(label: string, position: Partial<CSSStyleDeclaration>): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    Object.assign(button.style, {
      position: 'absolute',
      width: '84px',
      height: '84px',
      borderRadius: '50%',
      border: '2px solid rgba(255, 79, 216, 0.8)',
      background: 'rgba(11, 16, 38, 0.6)',
      color: '#e6f7ff',
      fontSize: '12px',
      fontWeight: '700',
      letterSpacing: '1px',
      pointerEvents: 'auto',
      touchAction: 'none',
      ...position,
    });
    return button;
  }

  private readonly onJumpDown = (e: PointerEvent): void => {
    e.preventDefault();
    this.input.setVirtualKey('Space', true);
  };

  private readonly onJumpUp = (): void => {
    this.input.setVirtualKey('Space', false);
  };

  private readonly onSprintToggle = (e: PointerEvent): void => {
    e.preventDefault();
    this.sprintOn = !this.sprintOn;
    this.input.setVirtualKey('ShiftLeft', this.sprintOn);
    this.sprintButton.style.background = this.sprintOn
      ? 'rgba(255, 79, 216, 0.55)'
      : 'rgba(11, 16, 38, 0.6)';
  };

  private readonly onJoystickDown = (e: PointerEvent): void => {
    if (this.joystickPointer !== null) return;
    e.preventDefault();
    this.joystickPointer = e.pointerId;
    this.joystickBase.setPointerCapture(e.pointerId);
    this.updateJoystick(e);
  };

  private readonly onJoystickMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.joystickPointer) return;
    this.updateJoystick(e);
  };

  private readonly onJoystickEnd = (e: PointerEvent): void => {
    if (e.pointerId !== this.joystickPointer) return;
    this.joystickPointer = null;
    this.knob.style.transform = 'translate(0px, 0px)';
    this.input.setJoystick(0, 0);
  };

  private updateJoystick(e: PointerEvent): void {
    const rect = this.joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = e.clientX - centerX;
    let dy = e.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    if (distance > JOYSTICK_RADIUS) {
      dx = (dx / distance) * JOYSTICK_RADIUS;
      dy = (dy / distance) * JOYSTICK_RADIUS;
    }

    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;

    const x = dx / JOYSTICK_RADIUS;
    const y = -dy / JOYSTICK_RADIUS;
    const magnitude = Math.hypot(x, y);
    if (magnitude < DEADZONE) {
      this.input.setJoystick(0, 0);
    } else {
      this.input.setJoystick(x, y);
    }
  }
      }
