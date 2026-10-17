// src/ui/Hud.ts
import type { OwnershipProvider } from '../characters/ownership';

export interface HudOptions {
  ownership: OwnershipProvider;
  onOpenCharacters: () => void;
}

/**
 * Minimal open-world HUD: coin balance (top-left) and a Characters button (top-right).
 * More HUD elements (interact button, chat, battle bars) are added in later phases.
 */
export class Hud {
  private readonly root: HTMLDivElement;
  private readonly coinsEl: HTMLDivElement;
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

    this.coinsEl = document.createElement('div');
    Object.assign(this.coinsEl.style, {
      position: 'absolute',
      left: 'calc(12px + env(safe-area-inset-left, 0px))',
      top: 'calc(12px + env(safe-area-inset-top, 0px))',
      padding: '8px 14px',
      borderRadius: '999px',
      border: '1px solid rgba(255, 79, 216, 0.8)',
      background: 'rgba(11, 16, 38, 0.65)',
      color: '#e6f7ff',
      fontSize: '14px',
      fontWeight: '700',
      letterSpacing: '1px',
    });

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'CHARACTERS';
    button.title = 'Open characters (C)';
    Object.assign(button.style, {
      position: 'absolute',
      right: 'calc(12px + env(safe-area-inset-right, 0px))',
      top: 'calc(12px + env(safe-area-inset-top, 0px))',
      minHeight: '44px',
      padding: '0 16px',
      borderRadius: '12px',
      border: '1px solid rgba(0, 229, 255, 0.8)',
      background: 'rgba(11, 16, 38, 0.65)',
      color: '#e6f7ff',
      fontSize: '13px',
      fontWeight: '800',
      letterSpacing: '1.5px',
      pointerEvents: 'auto',
      touchAction: 'manipulation',
    });
    button.addEventListener('click', () => this.options.onOpenCharacters());

    this.root.append(this.coinsEl, button);
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

  private refresh(): void {
    this.coinsEl.textContent = `${this.options.ownership.getCoins()} COINS`;
  }
  }
