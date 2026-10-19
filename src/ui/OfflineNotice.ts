// src/ui/OfflineNotice.ts

export interface OfflineNoticeOptions {
  /** Called when the player chooses to continue without an account (testing only). */
  onContinue: () => void;
}

const STYLE_ID = 'nr-offline-style';

const CSS = `
.nr-offline{position:fixed;inset:0;z-index:9;display:flex;align-items:center;justify-content:center;padding:20px;background:radial-gradient(circle at 50% 30%,#1b1450 0%,#0b1026 75%);color:#e6f7ff;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;overflow-y:auto}
.nr-offline-card{width:100%;max-width:380px;display:flex;flex-direction:column;gap:12px;padding:22px 18px;border-radius:18px;background:rgba(18,24,61,.85);border:1px solid rgba(255,79,216,.6);box-shadow:0 0 28px rgba(255,79,216,.25)}
.nr-offline-title{text-align:center;font-size:18px;font-weight:800;letter-spacing:2px;color:#ff8fd0}
.nr-offline-text{font-size:13px;line-height:1.5;color:#d8d2ff}
.nr-offline-code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;padding:8px 10px;border-radius:8px;background:rgba(11,16,38,.9);border:1px solid rgba(0,229,255,.35);color:#7ef0c8;word-break:break-all}
.nr-offline-btn{min-height:48px;border-radius:12px;border:none;font-weight:800;letter-spacing:1px;font-size:14px;background:linear-gradient(90deg,#00e5ff,#ff4fd8);color:#0b1026}
.nr-offline-note{font-size:11px;text-align:center;color:#8f8fb8}
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Shown instead of the login screen when the Firebase settings are missing.
 * Lets a developer explore the game offline. Nothing is saved to an account.
 */
export class OfflineNotice {
  private root: HTMLDivElement | null = null;

  constructor(private readonly options: OfflineNoticeOptions) {}

  isVisible(): boolean {
    return this.root !== null;
  }

  show(): void {
    if (this.root) return;
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    const root = el('div', 'nr-offline');
    const card = el('div', 'nr-offline-card');

    const button = el('button', 'nr-offline-btn', 'CONTINUE OFFLINE (TESTING ONLY)');
    button.type = 'button';
    button.addEventListener('click', () => {
      this.hide();
      this.options.onContinue();
    });

    card.append(
      el('div', 'nr-offline-title', 'ONLINE FEATURES NOT SET UP'),
      el(
        'div',
        'nr-offline-text',
        'Login and accounts need your Firebase settings. Add these four values to a file named .env in the project folder (see .env.example), then restart the dev server or rebuild:',
      ),
      el(
        'div',
        'nr-offline-code',
        'VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID',
      ),
      el('div', 'nr-offline-text', 'You can still explore the game without an account to test it.'),
      button,
      el('div', 'nr-offline-note', 'Offline mode: no account, nothing is saved online.'),
    );

    root.appendChild(card);
    document.body.appendChild(root);
    this.root = root;
  }

  hide(): void {
    this.root?.remove();
    this.root = null;
  }

  dispose(): void {
    this.hide();
  }
        }
