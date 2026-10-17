// src/net/firestore.ts
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import type { DocumentData, Firestore } from 'firebase/firestore';
import { STARTER_CHARACTER_IDS } from '../characters/catalog';
import { getFirebaseApp } from './firebase';

/** Must match the values in firebase/firestore.rules. */
export const STARTING_COINS = 500;
export const STARTING_RATING = 1000;

const MAX_ID_ATTEMPTS = 8;
/** Letters, numbers, underscore, inner spaces. 3-16 characters. Same pattern as the rules. */
const NAME_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_ ]{1,14}[A-Za-z0-9_]$/;

export interface PlayerProfile {
  uid: string;
  /** Permanent unique Player ID, e.g. "NR12345678". Never changes. */
  playerId: string;
  displayName: string;
  selectedCharacterId: string;
  ownedCharacterIds: string[];
  coins: number;
  rating: number;
  createdAt: Date | null;
}

/** Error with a message that is safe to show to the player. */
export class ProfileFailure extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ProfileFailure';
    this.code = code;
  }
}

/** Trims and collapses repeated spaces. */
export function normalizeDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** Returns an error message for the player, or null if the name is acceptable. */
export function validateDisplayName(name: string): string | null {
  if (name.length < 3 || name.length > 16) return 'Your name must be 3 to 16 characters long.';
  if (!NAME_PATTERN.test(name)) {
    return 'Use only letters, numbers, underscores and spaces (no space at the start or end).';
  }
  return null;
}

/** "NR" followed by 8 random digits. Uniqueness is guaranteed by the database. */
export function generatePlayerId(): string {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 100_000_000;
  return `NR${value.toString().padStart(8, '0')}`;
}

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return 'unknown';
}

function toProfileFailure(error: unknown): ProfileFailure {
  if (error instanceof ProfileFailure) return error;
  const code = errorCode(error);
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return new ProfileFailure(code, 'Network error. Check your connection and try again.');
  }
  if (code === 'permission-denied') {
    return new ProfileFailure(
      code,
      'Could not save your profile. Please try again in a moment.',
    );
  }
  return new ProfileFailure(code, 'Something went wrong. Please try again.');
}

function parseProfile(uid: string, data: DocumentData): PlayerProfile {
  const owned: unknown = data.ownedCharacterIds;
  if (
    typeof data.playerId !== 'string' ||
    typeof data.displayName !== 'string' ||
    typeof data.selectedCharacterId !== 'string' ||
    !Array.isArray(owned) ||
    typeof data.coins !== 'number' ||
    typeof data.rating !== 'number'
  ) {
    throw new ProfileFailure('invalid-profile', 'Your profile data is damaged. Please contact support.');
  }

  const created: { toDate?: () => Date } | null | undefined = data.createdAt;
  return {
    uid,
    playerId: data.playerId,
    displayName: data.displayName,
    selectedCharacterId: data.selectedCharacterId,
    ownedCharacterIds: owned.filter((id): id is string => typeof id === 'string'),
    coins: data.coins,
    rating: data.rating,
    createdAt: created && typeof created.toDate === 'function' ? created.toDate() : null,
  };
}

/**
 * Player profiles in Firestore.
 * The profile is created once with fixed starting coins and rating. The
 * Security Rules stop the client from changing coins, rating, owned characters
 * or the Player ID afterwards.
 */
export class ProfileService {
  private readonly db: Firestore;

  constructor() {
    this.db = getFirestore(getFirebaseApp());
  }

  /** Returns the profile, or null if the player has not finished first-time setup. */
  async getProfile(uid: string): Promise<PlayerProfile | null> {
    try {
      const snapshot = await getDoc(doc(this.db, 'profiles', uid));
      const data = snapshot.data();
      return data ? parseProfile(uid, data) : null;
    } catch (error) {
      throw toProfileFailure(error);
    }
  }

  /**
   * First-time setup: reserves a unique Player ID and creates the profile in one
   * atomic write, with the one-time starting coins. If a profile already exists it
   * is returned unchanged (safe against double taps).
   */
  async createProfile(
    uid: string,
    displayName: string,
    startingCharacterId: string,
  ): Promise<PlayerProfile> {
    const name = normalizeDisplayName(displayName);
    const nameProblem = validateDisplayName(name);
    if (nameProblem) throw new ProfileFailure('app/invalid-input', nameProblem);
    if (!STARTER_CHARACTER_IDS.includes(startingCharacterId)) {
      throw new ProfileFailure('app/invalid-input', 'Choose one of the starting characters.');
    }

    const existing = await this.getProfile(uid);
    if (existing) return existing;

    const ownedCharacterIds = [...STARTER_CHARACTER_IDS];
    let lastError: unknown = null;

    for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
      const playerId = generatePlayerId();
      const batch = writeBatch(this.db);
      batch.set(doc(this.db, 'playerIds', playerId), { uid, createdAt: serverTimestamp() });
      batch.set(doc(this.db, 'profiles', uid), {
        uid,
        playerId,
        displayName: name,
        selectedCharacterId: startingCharacterId,
        ownedCharacterIds,
        coins: STARTING_COINS,
        rating: STARTING_RATING,
        createdAt: serverTimestamp(),
      });

      try {
        await batch.commit();
        return {
          uid,
          playerId,
          displayName: name,
          selectedCharacterId: startingCharacterId,
          ownedCharacterIds,
          coins: STARTING_COINS,
          rating: STARTING_RATING,
          createdAt: new Date(),
        };
      } catch (error) {
        lastError = error;
        // An already-taken Player ID is rejected as "permission-denied": try another ID.
        if (errorCode(error) !== 'permission-denied') break;
      }
    }

    console.error('[profile] Could not create the profile', lastError);
    throw toProfileFailure(lastError);
  }

  /** Changes the selected character. The rules only accept characters the player owns. */
  async updateSelectedCharacter(uid: string, characterId: string): Promise<void> {
    try {
      await updateDoc(doc(this.db, 'profiles', uid), { selectedCharacterId: characterId });
    } catch (error) {
      throw toProfileFailure(error);
    }
  }
}
