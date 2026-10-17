// src/characters/ownership.ts
import { CHARACTERS, STARTER_CHARACTER_IDS, getCharacter, hasCharacter } from './catalog';
import type { CharacterOwnership } from './types';

export type PurchaseFailure = 'unknown_character' | 'already_owned' | 'insufficient_coins';
export type PurchaseResult = { ok: true } | { ok: false; reason: PurchaseFailure };

/**
 * What the UI needs from the ownership/wallet system.
 * In Phase 6 and 10 a server-backed implementation replaces the local one;
 * the UI does not change because methods are already asynchronous.
 */
export interface OwnershipProvider {
  getCoins(): number;
  getSelectedId(): string;
  getStatus(characterId: string): CharacterOwnership;
  select(characterId: string): Promise<boolean>;
  purchase(characterId: string): Promise<PurchaseResult>;
  onChange(listener: () => void): () => void;
}

const STORAGE_KEY = 'neonrift.dev.ownership.v1';
const STARTING_COINS = 500;

interface SavedState {
  coins: number;
  owned: string[];
  selected: string;
}

/**
 * TEMPORARY, development only. Data lives in this browser's localStorage, so a
 * player could edit it. Real coins, purchases and ownership are validated by the
 * trusted server (Phase 10). Never treat this store as secure.
 */
export class LocalOwnershipStore implements OwnershipProvider {
  private coins = STARTING_COINS;
  private readonly owned = new Set<string>(STARTER_CHARACTER_IDS);
  private selected: string = STARTER_CHARACTER_IDS[0] ?? CHARACTERS[0].id;
  private readonly listeners = new Set<() => void>();

  constructor() {
    this.load();
  }

  getCoins(): number {
    return this.coins;
  }

  getSelectedId(): string {
    return this.selected;
  }

  getStatus(characterId: string): CharacterOwnership {
    if (characterId === this.selected && this.owned.has(characterId)) return 'selected';
    return this.owned.has(characterId) ? 'owned' : 'locked';
  }

  async select(characterId: string): Promise<boolean> {
    if (!hasCharacter(characterId) || !this.owned.has(characterId)) return false;
    this.selected = characterId;
    this.commit();
    return true;
  }

  async purchase(characterId: string): Promise<PurchaseResult> {
    if (!hasCharacter(characterId)) return { ok: false, reason: 'unknown_character' };
    if (this.owned.has(characterId)) return { ok: false, reason: 'already_owned' };

    const price = getCharacter(characterId).price;
    if (this.coins < price) return { ok: false, reason: 'insufficient_coins' };

    this.coins -= price;
    this.owned.add(characterId);
    this.commit();
    return { ok: true };
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private commit(): void {
    this.save();
    this.listeners.forEach((listener) => listener());
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Partial<SavedState>;

      if (typeof data.coins === 'number' && Number.isFinite(data.coins) && data.coins >= 0) {
        this.coins = Math.floor(data.coins);
      }
      if (Array.isArray(data.owned)) {
        for (const id of data.owned) {
          if (typeof id === 'string' && hasCharacter(id)) this.owned.add(id);
        }
      }
      if (typeof data.selected === 'string' && this.owned.has(data.selected)) {
        this.selected = data.selected;
      }
    } catch {
      // Storage unavailable or corrupted: keep the defaults.
    }
  }

  private save(): void {
    try {
      const state: SavedState = {
        coins: this.coins,
        owned: [...this.owned],
        selected: this.selected,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable: progress is kept in memory only.
    }
  }
      }
