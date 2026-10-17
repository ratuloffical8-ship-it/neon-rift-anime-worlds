// src/ui/SetupScreen.ts
import { STARTER_CHARACTER_IDS, getCharacter } from '../characters/catalog';
import { ProfileFailure, normalizeDisplayName, validateDisplayName } from '../net/firestore';

export interface SetupScreenOptions {
  /**
   * Called when the player confirms. Should create the profile and throw on failure.
   * The screen closes itself after it resolves.
   */
  onSubmit: (displayName: string, characterId: string) => Promise<void>;
}

const STYLE_ID = 'nr-setup-style';

const CSS = `
.nr-setup{position:fixed;inset:0;z-index:9;display:flex;align-items:center;justify-content:center;padding:20px;background:radial-gradient(circle at 50% 30%,#1b1450 0%,#0b1026 75%);color:#e6f7ff;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;overflow-y:auto}
.nr-setup-card{width:100%;max-width:380px;display:flex;flex-direction:column;gap:10px;padding:22px 18px;border-radius:18px;background:rgba(18,24,61,.85);border:1px solid rgba(124,58,237,.6);box-shadow:0 0 28px rgba(124,58,237,.35)}
.nr-setup-title{text-align:center;font-size:20px;font-weight:800;letter-spacing:3px;color:#00e5ff;text-shadow:0 0 12px #00e5ff}
.nr-setup-help{text-align:center;font-size:13px;color:#c4b5fd;line-height:1.4}
.nr-setup-label{font-size:12px;font-weight:700;letter-spacing:2px;color:#c4b5fd;margin-top:4px}
.nr-setup-input{min-height:46px;padding:0 12px;border-radius:10px;border:1px solid rgba(0,229,255,.5);background:rgba(11,16,38,.8);color:#e6f7ff;font-size:16px}
.nr-setup-input:focus{outline:none;border-color:#00e5ff;box-shadow:0 0 8px rgba(0,229,255,.7)}
.nr-setup-hint{font-size:11px;color:#8f8fb8}
.nr-setup-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.nr-setup-card-btn{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(11,16,38,.6);color:#e6f7ff}
.nr-setup-card-btn.selected{border-color:#00e5ff;box-shadow:0 0 12px rgba(0,229,255,.8)}
.nr-setup-avatar{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;color:#0b1026}
.nr-setup-name{font-size:13px;font-weight:700}
.nr-setup-concept{font-size:11px;color:#c4b5fd;text-align:center;line-height:1.2}
.nr-setup-msg{min-height:18px;font-size:13px;text-align:center;color:#ff8fd0;line-height:1.35}
.nr-setup-start{min-height:50px;border-radius:12px;border:none;font-weight:800;letter-spacing:1px;font-size:15px;background:linear-gradient(90deg,#00e5ff,#ff4fd8);color:#0b1026}
.nr-setup-start:disabled{opacity:.5}
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
 * First-time setup: choose a display name and one of the free starting characters.
 * Shown once, right after the first successful login.
 */
export class SetupScreen {
  private root: HTMLDivElement | null = null;
  private nameInput: HTMLInputElement | null = null;
  private messageEl: HTMLDivElement | null = null;
  private startBtn: HTMLButtonElement | null = null;
  private cardButtons = new Map<string, HTMLButtonElement>();

  private selectedId: string = STARTER_CHARACTER_IDS[0];
  private busy = false;

  constructor(private readonly options: SetupScreenOptions) {}

  isVisible(): boolean {
    return this.root !== null;
  }

  show(): void {
    if (this.root) return;
    this.injectStyle();

    const root = el('div', 'nr-setup');
    const card = el('div', 'nr-setup-card');

    card.append(
      el('div', 'nr-setup-title', 'WELCOME, RUNNER'),
      el(
        'div',
        'nr-setup-help',
        'Choose your name and your starting character. You can unlock the other characters with RIFT COINS.',
      ),
    );

    card.appendChild(el('div', 'nr-setup-label', 'DISPLAY NAME'));
    const nameInput = el('input', 'nr-setup-input');
    nameInput.type = 'text';
    nameInput.maxLength = 16;
    nameInput.placeholder = 'Your name';
    nameInput.autocomplete = 'off';
    nameInput.setAttribute('aria-label', 'Display name');
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void this.submit();
    });
    this.nameInput = nameInput;
    card.append(nameInput, el('div', 'nr-setup-hint', '3-16 characters: letters, numbers, underscores, spaces'));

    card.appendChild(el('div', 'nr-setup-label', 'STARTING CHARACTER'));
    const grid = el('div', 'nr-setup-grid');
    this.cardButtons = new Map();
    for (const id of STARTER_CHARACTER_IDS) {
      const character = getCharacter(id);
      const button = el('button', 'nr-setup-card-btn');
      button.type = 'button';

      const avatar = el('div', 'nr-setup-avatar', character.name.charAt(0));
      const hex = `#${character.accentColor.toString(16).padStart(6, '0')}`;
      avatar.style.background = `radial-gradient(circle at 30% 30%, #ffffff, ${hex})`;

      button.append(
        avatar,
        el('div', 'nr-setup-name', character.name),
        el('div', 'nr-setup-concept', character.concept),
      );
      button.addEventListener('click', () => this.select(id));
      this.cardButtons.set(id, button);
      grid.appendChild(button);
    }
    card.appendChild(grid);

    this.messageEl = el('div', 'nr-setup-msg');
    this.messageEl.setAttribute('aria-live', 'polite');
    this.startBtn = el('button', 'nr-setup-start', 'START ADVENTURE');
    this.startBtn.type = 'button';
    this.startBtn.addEventListener('click', () => void this.submit());
    card.append(this.messageEl, this.startBtn);

    root.appendChild(card);
    document.body.appendChild(root);
    this.root = root;
    this.select(this.selectedId);
  }

  hide(): void {
    this.root?.remove();
    this.root = null;
    this.nameInput = null;
    this.messageEl = null;
    this.startBtn = null;
    this.cardButtons = new Map();
  }

  dispose(): void {
    this.hide();
  }

  private injectStyle(): void {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  private select(id: string): void {
    this.selectedId = id;
    for (const [cardId, button] of this.cardButtons) {
      button.className = cardId === id ? 'nr-setup-card-btn selected' : 'nr-setup-card-btn';
    }
  }

  private showMessage(text: string): void {
    if (this.messageEl) this.messageEl.textContent = text;
  }

  private setBusy(busy: boolean): void {
    this.busy = busy;
    if (this.startBtn) this.startBtn.disabled = busy;
  }

  private async submit(): Promise<void> {
    if (this.busy || !this.nameInput) return;

    const name = normalizeDisplayName(this.nameInput.value);
    const problem = validateDisplayName(name);
    if (problem) {
      this.showMessage(problem);
      return;
    }

    this.setBusy(true);
    this.showMessage('');
    try {
      await this.options.onSubmit(name, this.selectedId);
      this.hide();
    } catch (error) {
      this.showMessage(
        error instanceof ProfileFailure ? error.message : 'Something went wrong. Please try again.',
      );
    } finally {
      this.setBusy(false);
    }
  }
}
