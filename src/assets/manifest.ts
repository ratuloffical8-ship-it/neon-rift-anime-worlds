// src/assets/manifest.ts
import { CHARACTER_ASSET_ENTRIES } from '../characters/catalog';

export type AssetType =
  | 'character'
  | 'building'
  | 'vegetation'
  | 'prop'
  | 'furniture'
  | 'animation';

/** 'temporary' = placeholder quality, 'production' = final quality. */
export type AssetQuality = 'temporary' | 'production';

export interface AssetEntry {
  id: string;
  /** Path relative to the public/ folder, e.g. "assets/characters/x.glb". */
  path: string;
  type: AssetType;
  intendedUse: string;
  /** Uniform scale applied after loading (1 = 1 unit per meter). */
  scale: number;
  /** Direction the model faces inside its file. The engine expects +Z. */
  forward: '+z' | '-z';
  /** 'feet' / 'base' = origin already at the bottom. 'center' = moved down on load. */
  origin: 'feet' | 'base' | 'center';
  /** Animation clip names the model must contain. */
  animations: readonly string[];
  quality: AssetQuality;
  license: string;
}

const LICENSE_PENDING = 'Original asset. Record the license/source when the file is added.';

/** Hand-written entries. The 20 character entries are generated from the catalog. */
const BASE_ENTRIES: readonly AssetEntry[] = [
  {
    id: 'player_default',
    path: 'assets/characters/player_default.glb',
    type: 'character',
    intendedUse: 'Default rigged player character used before the 20-character catalog (Phase 5)',
    scale: 1,
    forward: '+z',
    origin: 'feet',
    animations: ['idle', 'walk', 'run', 'jump'],
    quality: 'temporary',
    license: LICENSE_PENDING,
  },
  {
    id: 'house_sakura_a',
    path: 'assets/environment/buildings/house_sakura_a.glb',
    type: 'building',
    intendedUse: 'Village house replacing the procedural box house in Zone.ts',
    scale: 1,
    forward: '+z',
    origin: 'base',
    animations: [],
    quality: 'temporary',
    license: LICENSE_PENDING,
  },
  {
    id: 'tree_sakura_a',
    path: 'assets/environment/vegetation/tree_sakura_a.glb',
    type: 'vegetation',
    intendedUse: 'Sakura tree replacing the procedural tree in Tree.ts',
    scale: 1,
    forward: '+z',
    origin: 'base',
    animations: [],
    quality: 'temporary',
    license: LICENSE_PENDING,
  },
];

/**
 * Every .glb/.gltf the game may load. These files do NOT exist yet.
 * The loader reports missing files and the game uses temporary procedural
 * models until a real file is placed at the listed path.
 */
export const ASSET_MANIFEST: readonly AssetEntry[] = [
  ...BASE_ENTRIES,
  ...CHARACTER_ASSET_ENTRIES,
];

/** Builds a stable URL that also works after deployment (relative base). */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}
