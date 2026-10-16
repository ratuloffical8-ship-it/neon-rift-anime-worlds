// src/characters/types.ts

export type CharacterCategory = 'male' | 'female';

export type CharacterElement =
  | 'lightning'
  | 'shadow'
  | 'fire'
  | 'wind'
  | 'ice'
  | 'cosmic'
  | 'illusion'
  | 'earth'
  | 'moonlight'
  | 'flower'
  | 'crystal'
  | 'radiant';

export type CombatStyle = 'sword' | 'martial' | 'magic' | 'ranged' | 'assassin' | 'defender' | 'speedster';

export type AbilityKind = 'special' | 'ultimate';

export interface AbilityDef {
  id: string;
  name: string;
  description: string;
  kind: AbilityKind;
  /** Seconds before the ability can be used again. */
  cooldownSeconds: number;
  /** Base damage. The trusted server applies and validates it in Phase 9. */
  damage: number;
  /** Maximum distance to the target, in meters. */
  range: number;
}

export interface PreviewCamera {
  /** Distance from the character, in meters. */
  distance: number;
  /** Camera height, in meters. */
  height: number;
  fov: number;
}

/** Static catalog data only. No rendering or combat logic belongs here. */
export interface CharacterDef {
  id: string;
  name: string;
  category: CharacterCategory;
  /** One-line concept, e.g. "Lightning sword fighter". */
  concept: string;
  element: CharacterElement;
  style: CombatStyle;
  /** Main color used for UI accents and effects (0xRRGGBB). */
  accentColor: number;
  /** Price in free virtual RIFT COINS. 0 = starter character. */
  price: number;
  /** Manifest ID of the 3D model (see src/assets/manifest.ts). */
  modelAssetId: string;
  /** Exactly two abilities: [special, ultimate]. */
  abilityIds: readonly [string, string];
  previewCamera: PreviewCamera;
}

/** Runtime state used by the selection screen and shop. */
export type CharacterOwnership = 'locked' | 'owned' | 'selected';
