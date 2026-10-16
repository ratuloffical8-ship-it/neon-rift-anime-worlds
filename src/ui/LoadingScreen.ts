// src/ui/LoadingScreen.ts
import type { AssetLoader } from '../assets/AssetLoader';

/**
 * Controls the #loading overlay from index.html:
 * adds a progress bar and status line, shows errors, hides when ready.
 */
export class LoadingScreen {
  private readonly root: HTMLElement | null;
  private readonly errorEl: HTMLElement | null;
  private readonly fill: HTMLDivElement;
  private readonly status: HTMLDivElement;

  constructor(root: HTMLElement | null = document.getElementById('loading')) {
    this.root = root;
    this.errorEl = document.getElementById('error');

    const bar = document.createElement('div');
    Object.assign(bar.style, {
      width: '220px',
      height: '6px',
      borderRadius: '3px',
      background: 'rgba(255, 255, 255, 0.15)',
      overflow: 'hidden',
    });

    this.fill = document.createElement('div');
    Object.assign(this.fill.style, {
      width: '0%',
      height: '100%',
      background: 'linear-gradient(90deg, #00e5ff, #ff4fd8)',
      transition: 'width 0.2s ease',
    });
    bar.appendChild(this.fill);

    this.status = document.createElement('div');
    Object.assign(this.status.style, {
      fontSize: '12px',
      letterSpacing: '1px',
      color: '#c4b5fd',
      minHeight: '16px',
    });

    if (this.root) {
      if (this.errorEl && this.errorEl.parentElement === this.root) {
        this.root.insertBefore(bar, this.errorEl);
        this.root.insertBefore(this.status, this.errorEl);
      } else {
        this.root.append(bar, this.status);
      }
    }
  }

  show(): void {
    this.root?.classList.remove('hidden');
  }

  hide(): void {
    this.root?.classList.add('hidden');
  }

  /** ratio is 0..1. */
  setProgress(ratio: number, text?: string): void {
    const clamped = Math.min(1, Math.max(0, ratio));
    this.fill.style.width = `${Math.round(clamped * 100)}%`;
    if (text !== undefined) this.status.textContent = text;
  }

  setMessage(text: string): void {
    this.status.textContent = text;
  }

  showError(message: string): void {
    if (this.errorEl) {
      this.errorEl.textContent = message;
      this.errorEl.style.display = 'block';
    } else {
      this.status.textContent = message;
    }
  }

  /** Shows asset-loading progress automatically. Returns an unsubscribe function. */
  bind(loader: AssetLoader): () => void {
    return loader.onProgress(({ total, done, current }) => {
      const ratio = total > 0 ? done / total : 1;
      const label = current ? `Loading ${current} (${done}/${total})` : 'Loading...';
      this.setProgress(ratio, label);
    });
  }
      }
