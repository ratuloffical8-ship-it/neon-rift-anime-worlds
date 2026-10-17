// src/ui/CharacterSelect.ts
import type { AssetLoader } from '../assets/AssetLoader';
import { getAbility } from '../characters/abilities';
import { getCharacter, getCharactersByCategory } from '../characters/catalog';
import { CharacterPreview } from '../characters/CharacterPreview';
import type { OwnershipProvider, PurchaseFailure } from '../characters/ownership';
import type { CharacterCategory } from '../characters/types';

export interface CharacterSelectOptions {
  loader: AssetLoader;
  ownership: OwnershipProvider;
  /** Called after the player successfully selects an owned character. */
  onSelected?: (characterId: string) => void;
}

const STYLE_ID = 'nr-select-style';

const CSS = `
.nr-select{position:fixed;inset:0;z-index:8;display:flex;flex-direction:column;background:linear-gradient(180deg,#0b1026,#1b1450);color:#e6f7ff;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);user-select:none;-webkit-user-select:none}
.nr-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;gap:8px}
.nr-title{font-weight:800;letter-spacing:3px;color:#00e5ff;text-shadow:0 0 10px rgba(0,229,255,.7)}
.nr-coins{margin-left:auto;padding:6px 12px;border-radius:999px;border:1px solid rgba(255,79,216,.7);font-weight:700;font-size:14px}
.nr-close{min-width:44px;min-height:44px;border-radius:12px;border:1px solid rgba(0,229,255,.6);background:rgba(11,16,38,.6);color:#e6f7ff;font-size:18px}
.nr-tabs{display:flex;gap:8px;padding:0 14px}
.nr-tab{flex:1;min-height:44px;border-radius:10px;border:1px solid rgba(0,229,255,.5);background:transparent;color:#e6f7ff;font-weight:700;letter-spacing:1px}
.nr-tab.active{background:rgba(124,58,237,.65);box-shadow:0 0 10px rgba(124,58,237,.8)}
.nr-preview{position:relative;flex:0 0 34vh;margin:8px 14px;border-radius:14px;overflow:hidden;background:radial-gradient(circle at 50% 65%,rgba(124,58,237,.4),rgba(11,16,38,.25));border:1px solid rgba(124,58,237,.55)}
.nr-zoom{position:absolute;right:8px;bottom:8px;display:flex;gap:6px}
.nr-zoom button{width:40px;height:40px;border-radius:50%;border:1px solid rgba(0,229,255,.7);background:rgba(11,16,38,.7);color:#e6f7ff;font-size:20px;font-weight:700}
.nr-hint{position:absolute;left:10px;bottom:10px;font-size:11px;color:#c4b5fd;opacity:.8}
.nr-grid{display:flex;gap:10px;overflow-x:auto;padding:4px 14px 8px;scrollbar-width:none}
.nr-grid::-webkit-scrollbar{display:none}
.nr-card{flex:0 0 86px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(11,16,38,.6);color:#e6f7ff}
.nr-card.focused{border-color:#00e5ff;box-shadow:0 0 12px rgba(0,229,255,.8)}
.nr-avatar{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:#0b1026}
.nr-card-name{font-size:11px;font-weight:700;text-align:center;line-height:1.1}
.nr-badge{font-size:10px;font-weight:700;letter-spacing:.5px;color:#c4b5fd}
.nr-badge.selected{color:#00e5ff}
.nr-info{flex:1 1 auto;min-height:0;overflow-y:auto;padding:0 14px}
.nr-name{font-size:20px;font-weight:800}
.nr-concept{font-size:13px;color:#c4b5fd;margin-bottom:6px}
.nr-ability{margin:6px 0;padding:8px 10px;border-radius:10px;background:rgba(124,58,237,.18);border:1px solid rgba(124,58,237,.4);font-size:12px;line-height:1.35}
.nr-ability b{color:#00e5ff}
.nr-msg{min-height:18px;padding:4px 14px 0;font-size:13px;color:#ff9bd9;text-align:center}
.nr-action{margin:6px 14px 10px;min-height:50px;border-radius:12px;border:none;font-weight:800;letter-spacing:1px;font-size:15px;background:linear-gradient(90deg,#00e5ff,#ff4fd8);color:#0b1026}
.nr-action:disabled{opacity:.45}
.nr-dialog-bg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(5,8,22,.75);z-index:2;padding:24px}
.nr-dialog{max-width:320px;width:100%;padding:18px;border-radius:16px;background:#12183d;border:1px solid rgba(0,229,255,.6);text-align:center}
.nr-dialog p{margin:6px 0}
.nr-dialog-buttons{display:flex;gap:10px;margin-top:14px}
.nr-dialog-buttons button{flex:1;min-height:46px;border-radius:10px;font-weight:800;border:1px solid rgba(0,229,255,.6);background:transparent;color:#e6f7ff}
.nr-dialog-buttons button.primary{border:none;background:linear-gradient(90deg,#00e5ff,#ff4fd8);color:#0b1026}
`;

const FAILURE_TEXT: Record<PurchaseFailure, string> = {
  unknown_character: 'This character does not exist.',
  already_owned: 'You already own this character.',
  insufficient_coins: 'Not enough RIFT COINS.',
};

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
 * Character selection screen: Male / Female tabs, rotatable 3D preview with zoom,
 * abilities, price, and locked / owned / selected states with a buy confirmation.
 * Open it with open(); it frees its WebGL preview when closed.
 */
export class CharacterSelect {
  private root: HTMLDivElement | null = null;
  private preview: CharacterPreview | null = null;
  private unsubscribe: (() => void) | null = null;

  private category: CharacterCategory = 'male';
  private focusedId = '';
  private confirmId: string | null = null;
  private busy = false;
  private message = '';

  private coinsEl!: HTMLDivElement;
  private tabsEl!: HTMLDivElement;
  private gridEl!: HTMLDivElement;
  private infoEl!: HTMLDivElement;
  private msgEl!: HTMLDivElement;
  private actionBtn!: HTMLButtonElement;

  constructor(private readonly options: CharacterSelectOptions) {}

  isOpen(): boolean {
    return this.root !== null;
  }

  open(): void {
    if (this.root) return;
    this.injectStyle();

    this.focusedId = this.options.ownership.getSelectedId();
    this.category = getCharacter(this.focusedId).category;
    this.confirmId = null;
    this.message = '';

    const root = el('div', 'nr-select');

    const head = el('div', 'nr-head');
    const title = el('div', 'nr-title', 'CHARACTERS');
    this.coinsEl = el('div', 'nr-coins');
    const close = el('button', 'nr-close', '\u2715');
    close.type = 'button';
    close.addEventListener('click', () => this.close());
    head.append(title, this.coinsEl, close);

    this.tabsEl = el('div', 'nr-tabs');

    const previewBox = el('div', 'nr-preview');
    const zoom = el('div', 'nr-zoom');
    const zoomIn = el('button', undefined, '+');
    const zoomOut = el('button', undefined, '\u2212');
    zoomIn.type = 'button';
    zoomOut.type = 'button';
    zoomIn.addEventListener('click', () => this.preview?.zoomBy(-0.15));
    zoomOut.addEventListener('click', () => this.preview?.zoomBy(0.15));
    zoom.append(zoomIn, zoomOut);
    previewBox.append(zoom, el('div', 'nr-hint', 'Drag to rotate \u00b7 pinch or scroll to zoom'));

    this.gridEl = el('div', 'nr-grid');
    this.infoEl = el('div', 'nr-info');
    this.msgEl = el('div', 'nr-msg');
    this.actionBtn = el('button', 'nr-action');
    this.actionBtn.type = 'button';
    this.actionBtn.addEventListener('click', () => void this.onAction());

    root.append(head, this.tabsEl, previewBox, this.gridEl, this.infoEl, this.msgEl, this.actionBtn);
    document.body.appendChild(root);
    this.root = root;

    this.preview = new CharacterPreview(previewBox, this.options.loader);
    void this.preview.setCharacter(getCharacter(this.focusedId));

    this.unsubscribe = this.options.ownership.onChange(() => this.render());
    window.addEventListener('keydown', this.onKeyDown);
    this.render();
  }

  close(): void {
    if (!this.root) return;
    window.removeEventListener('keydown', this.onKeyDown);
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.preview?.dispose();
    this.preview = null;
    this.root.remove();
    this.root = null;
  }

  dispose(): void {
    this.close();
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.code !== 'Escape') return;
    if (this.confirmId) {
      this.confirmId = null;
      this.render();
    } else {
      this.close();
    }
  };

  private injectStyle(): void {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  private focusCharacter(id: string): void {
    this.focusedId = id;
    this.message = '';
    void this.preview?.setCharacter(getCharacter(id));
    this.render();
  }

  private switchCategory(category: CharacterCategory): void {
    if (category === this.category) return;
    this.category = category;
    const selectedId = this.options.ownership.getSelectedId();
    const inCategory = getCharactersByCategory(category);
    const target = inCategory.find((c) => c.id === selectedId) ?? inCategory[0];
    this.focusCharacter(target.id);
  }

  private async onAction(): Promise<void> {
    if (this.busy) return;
    const { ownership } = this.options;
    const status = ownership.getStatus(this.focusedId);

    if (status === 'owned') {
      this.busy = true;
      const ok = await ownership.select(this.focusedId);
      this.busy = false;
      if (ok) {
        this.message = `${getCharacter(this.focusedId).name} selected.`;
        this.options.onSelected?.(this.focusedId);
      } else {
        this.message = 'Could not select this character.';
      }
      this.render();
    } else if (status === 'locked') {
      this.confirmId = this.focusedId;
      this.render();
    }
  }

  private async confirmPurchase(): Promise<void> {
    if (this.busy || !this.confirmId) return;
    const id = this.confirmId;
    this.busy = true;
    const result = await this.options.ownership.purchase(id);
    this.busy = false;
    this.confirmId = null;
    this.message = result.ok
      ? `${getCharacter(id).name} unlocked!`
      : FAILURE_TEXT[result.reason];
    this.render();
  }

  private render(): void {
    if (!this.root) return;
    const { ownership } = this.options;
    const coins = ownership.getCoins();
    const def = getCharacter(this.focusedId);
    const status = ownership.getStatus(def.id);

    this.coinsEl.textContent = `${coins} COINS`;

    // Tabs
    this.tabsEl.replaceChildren();
    for (const category of ['male', 'female'] as const) {
      const tab = el('button', category === this.category ? 'nr-tab active' : 'nr-tab', category === 'male' ? 'MALE' : 'FEMALE');
      tab.type = 'button';
      tab.addEventListener('click', () => this.switchCategory(category));
      this.tabsEl.appendChild(tab);
    }

    // Character cards
    this.gridEl.replaceChildren();
    for (const c of getCharactersByCategory(this.category)) {
      const cardStatus = ownership.getStatus(c.id);
      const card = el('button', c.id === this.focusedId ? 'nr-card focused' : 'nr-card');
      card.type = 'button';

      const avatar = el('div', 'nr-avatar', c.name.charAt(0));
      const hex = `#${c.accentColor.toString(16).padStart(6, '0')}`;
      avatar.style.background = `radial-gradient(circle at 30% 30%, #ffffff, ${hex})`;
      if (cardStatus === 'locked') avatar.style.opacity = '0.55';

      const badgeText =
        cardStatus === 'selected' ? 'SELECTED' : cardStatus === 'owned' ? 'OWNED' : `LOCKED \u00b7 ${c.price}`;
      const badge = el('div', cardStatus === 'selected' ? 'nr-badge selected' : 'nr-badge', badgeText);

      card.append(avatar, el('div', 'nr-card-name', c.name), badge);
      card.addEventListener('click', () => this.focusCharacter(c.id));
      this.gridEl.appendChild(card);
    }

    // Info and abilities
    this.infoEl.replaceChildren();
    this.infoEl.append(
      el('div', 'nr-name', def.name),
      el('div', 'nr-concept', `${def.concept} \u00b7 ${def.element} \u00b7 ${def.style}`),
    );
    for (const abilityId of def.abilityIds) {
      const ability = getAbility(abilityId);
      const box = el('div', 'nr-ability');
      const label = el('b', undefined, `${ability.name} (${ability.kind})`);
      box.append(
        label,
        document.createElement('br'),
        document.createTextNode(
          `${ability.description} Damage ${ability.damage}, range ${ability.range} m, cooldown ${ability.cooldownSeconds} s.`,
        ),
      );
      this.infoEl.appendChild(box);
    }

    this.msgEl.textContent = this.message;

    // Main action button
    if (status === 'selected') {
      this.actionBtn.textContent = 'SELECTED';
      this.actionBtn.disabled = true;
    } else if (status === 'owned') {
      this.actionBtn.textContent = 'SELECT';
      this.actionBtn.disabled = this.busy;
    } else if (coins >= def.price) {
      this.actionBtn.textContent = `BUY \u00b7 ${def.price} COINS`;
      this.actionBtn.disabled = this.busy;
    } else {
      this.actionBtn.textContent = `NEED ${def.price - coins} MORE COINS`;
      this.actionBtn.disabled = true;
    }

    this.renderDialog();
  }

  private renderDialog(): void {
    this.root?.querySelector('.nr-dialog-bg')?.remove();
    if (!this.root || !this.confirmId) return;

    const def = getCharacter(this.confirmId);
    const coins = this.options.ownership.getCoins();

    const background = el('div', 'nr-dialog-bg');
    const dialog = el('div', 'nr-dialog');
    const cancel = el('button', undefined, 'CANCEL');
    const confirm = el('button', 'primary', 'CONFIRM');
    cancel.type = 'button';
    confirm.type = 'button';
    cancel.addEventListener('click', () => {
      this.confirmId = null;
      this.render();
    });
    confirm.addEventListener('click', () => void this.confirmPurchase());

    const buttons = el('div', 'nr-dialog-buttons');
    buttons.append(cancel, confirm);
    dialog.append(
      el('b', undefined, `Buy ${def.name}?`),
      el('p', undefined, `Price: ${def.price} COINS`),
      el('p', undefined, `Balance after: ${Math.max(0, coins - def.price)} COINS`),
      buttons,
    );
    background.appendChild(dialog);
    this.root.appendChild(background);
  }
}
