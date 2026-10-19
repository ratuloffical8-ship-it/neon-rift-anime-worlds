// src/ui/Hud.ts
import type { OwnershipProvider } from '../characters/ownership';

export interface HudIdentity {
  displayName: string;
  playerId: string;
}

export interface HudOptions {
  ownership: OwnershipProvider;
  onOpenCharacters: () => void;
  /** Shows a LOG OUT button when provided (online mode only). */
  onLogout?: () => void;
  /** Who is playing. null = offline testing mode. */
  identity?: HudIdentity | null;
}

/**
 * Open-world HUD.
 * Top-left: coin balance and who is playing. Top-right: Characters and Log out buttons.
 * More HUD elements (interact button, chat, battle bars) are added in later phases.
 */
export class Hud {
  private readonly root: HTMLDivElement;
  private readonly coinsEl: HTMLDivElement;
  private readonly identityEl: HTMLDivElement;
  private readonly unsubscribe: () => void;

  constructor(private readonly options: HudOptions) {
    this.root = document.createElement('div');
    Object.assign(this.root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '4',
      pointerEvents: 'none',
      fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      userSelect: 'none',
      webkitUserSelect: 'none',
    });

    // Left column
    const left = document.createElement('div');
    Object.assign(left.style, {
      position: 'absolute',
      left: 'calc(12px + env(safe-area-inset-left, 0px))',
      top: 'calc(12px + env(safe-area-inset-top, 0px))',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '6px',
    });

    this.coinsEl = document.createElement('div');
    Object.assign(this.coinsEl.style, {
      padding: '8px 14px',
      borderRadius: '999px',
      border: '1px solid rgba(255, 79, 216, 0.8)',
      background: 'rgba(11, 16, 38, 0.65)',
      color: '#e6f7ff',
      fontSize: '14px',
      fontWeight: '700',
      letterSpacing: '1px',
    });

    this.identityEl = document.createElement('div');
    Object.assign(this.identityEl.style, {
      padding: '4px 10px',
      borderRadius: '8px',
      background: 'rgba(11, 16, 38, 0.55)',
      color: '#c4b5fd',
      fontSize: '12px',
      letterSpacing: '0.5px',
    });

    left.append(this.coinsEl, this.identityEl);

    // Right column
    const right = document.createElement('div');
    Object.assign(right.style, {
      position: 'absolute',
      right: 'calc(12px + env(safe-area-inset-right, 0px))',
      top: 'calc(12px + env(safe-area-inset-top, 0px))',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '8px',
    });

    right.appendChild(
      this.createButton('CHARACTERS', 44, 'rgba(0, 229, 255, 0.8)', 'Open characters (C)', () =>
        this.options.onOpenCharacters(),
      ),
    );
    if (options.onLogout) {
      const onLogout = options.onLogout;
      right.appendChild(this.createButton('LOG OUT', 36, 'rgba(255, 79, 216, 0.7)', 'Log out', () => onLogout()));
    }

    this.root.append(left, right);
    document.body.appendChild(this.root);

    this.unsubscribe = options.ownership.onChange(() => this.refresh());
    this.refresh();
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? 'block' : 'none';
  }

  dispose(): void {
    this.unsubscribe();
    this.root.remove();
  }

  private createButton(
    label: string,
    minHeight: number,
    borderColor: string,
    title: string,
    onClick: () => void,
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.title = title;
    Object.assign(button.style, {
      minHeight: `${minHeight}px`,
      padding: '0 16px',
      borderRadius: '12px',
      border: `1px solid ${borderColor}`,
      background: 'rgba(11, 16, 38, 0.65)',
      color: '#e6f7ff',
      fontSize: '13px',
      fontWeight: '800',
      letterSpacing: '1.5px',
      pointerEvents: 'auto',
      touchAction: 'manipulation',
    });
    button.addEventListener('click', onClick);
    return button;
  }

  private refresh(): void {
    this.coinsEl.textContent = `${this.options.ownership.getCoins()} COINS`;
    const identity = this.options.identity;
    this.identityEl.textContent = identity
      ? `${identity.displayName} \u00b7 ${identity.playerId}`
      : 'OFFLINE MODE';
  }
  }
