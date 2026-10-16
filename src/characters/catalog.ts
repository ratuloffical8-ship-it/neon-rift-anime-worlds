// src/characters/catalog.ts
import type { AssetEntry } from '../assets/manifest';
import { hasAbility } from './abilities';
import type {
  CharacterCategory,
  CharacterDef,
  CharacterElement,
  CombatStyle,
  PreviewCamera,
} from './types';

const DEFAULT_PREVIEW: PreviewCamera = { distance: 3.2, height: 1.1, fov: 35 };

/** Animation clips every production character model must contain. */
export const REQUIRED_CHARACTER_ANIMATIONS = [
  'idle',
  'walk',
  'run',
  'jump',
  'attack',
  'heavy_attack',
  'hit',
  'block',
  'dodge',
  'victory',
  'defeat',
  'sit',
  'wave',
] as const;

function def(
  id: string,
  name: string,
  category: CharacterCategory,
  concept: string,
  element: CharacterElement,
  style: CombatStyle,
  accentColor: number,
  price: number,
  special: string,
  ultimate: string,
): CharacterDef {
  return {
    id,
    name,
    category,
    concept,
    element,
    style,
    accentColor,
    price,
    modelAssetId: `char_${id}`,
    abilityIds: [special, ultimate],
    previewCamera: DEFAULT_PREVIEW,
  };
}

/**
 * All 20 original characters (10 male-category, 10 female-category).
 * Prices are in free RIFT COINS. Price 0 = starter character.
 */
export const CHARACTERS: readonly CharacterDef[] = [
  // ---- Male ----
  def('kaito_storm', 'Kaito Storm', 'male', 'Lightning sword fighter', 'lightning', 'sword', 0x4db8ff, 0, 'kaito_thunder_slash', 'kaito_storm_dominion'),
  def('haru_wind', 'Haru Wind', 'male', 'Fast wind fighter', 'wind', 'speedster', 0x7ef0c8, 0, 'haru_gale_dash', 'haru_cyclone_barrage'),
  def('akio_blaze', 'Akio Blaze', 'male', 'Fire warrior', 'fire', 'sword', 0xff6a3d, 300, 'akio_flame_arc', 'akio_inferno_crash'),
  def('sora_frost', 'Sora Frost', 'male', 'Ice swordsman', 'ice', 'sword', 0x9fe3ff, 300, 'sora_frost_cut', 'sora_glacier_verdict'),
  def('raiden_volt', 'Raiden Volt', 'male', 'Electric martial artist', 'lightning', 'martial', 0xffe066, 600, 'raiden_volt_combo', 'raiden_overload_fist'),
  def('itsuki_terra', 'Itsuki Terra', 'male', 'Earth defender', 'earth', 'defender', 0xb08a5a, 600, 'itsuki_stone_guard', 'itsuki_tectonic_fortress'),
  def('ren_shadow', 'Ren Shadow', 'male', 'Shadow assassin', 'shadow', 'assassin', 0x6b4fd8, 1000, 'ren_shadow_step', 'ren_umbral_execution'),
  def('riku_phantom', 'Riku Phantom', 'male', 'Illusion specialist', 'illusion', 'magic', 0xb86bff, 1000, 'riku_mirage_clones', 'riku_phantom_stage'),
  def('takumi_nova', 'Takumi Nova', 'male', 'Cosmic energy fighter', 'cosmic', 'ranged', 0xff4fd8, 1500, 'takumi_nova_pulse', 'takumi_supernova_burst'),
  def('yuki_eclipse', 'Yuki Eclipse', 'male', 'Moonlight and dark-energy fighter', 'moonlight', 'sword', 0x8a7bff, 1500, 'yuki_crescent_eclipse', 'yuki_total_eclipse'),

  // ---- Female ----
  def('akari_flame', 'Akari Flame', 'female', 'Fire sword fighter', 'fire', 'sword', 0xff7a3d, 0, 'akari_ember_slash', 'akari_phoenix_rising'),
  def('hana_blossom', 'Hana Blossom', 'female', 'Flower and wind fighter', 'flower', 'magic', 0xff9ec7, 0, 'hana_petal_storm', 'hana_sakura_tempest'),
  def('reina_frost', 'Reina Frost', 'female', 'Ice magic fighter', 'ice', 'magic', 0x8fdcff, 300, 'reina_ice_lance', 'reina_absolute_zero'),
  def('aiko_thunder', 'Aiko Thunder', 'female', 'Lightning martial artist', 'lightning', 'martial', 0xffd84d, 300, 'aiko_thunder_kick', 'aiko_lightning_rush'),
  def('mei_crystal', 'Mei Crystal', 'female', 'Crystal defender and ranged fighter', 'crystal', 'ranged', 0x6be7ff, 600, 'mei_crystal_shard', 'mei_prism_bastion'),
  def('nozomi_gale', 'Nozomi Gale', 'female', 'High-speed wind fighter', 'wind', 'speedster', 0x6ff2b0, 600, 'nozomi_gale_sprint', 'nozomi_tempest_waltz'),
  def('yume_shadow', 'Yume Shadow', 'female', 'Shadow teleportation specialist', 'shadow', 'assassin', 0x7a4fe0, 1000, 'yume_dream_blink', 'yume_nightfall_rend'),
  def('kira_moonveil', 'Kira Moonveil', 'female', 'Moonlight illusion fighter', 'moonlight', 'magic', 0xa99bff, 1000, 'kira_moonveil_mirage', 'kira_lunar_reflection'),
  def('miyu_starfall', 'Miyu Starfall', 'female', 'Cosmic magic fighter', 'cosmic', 'magic', 0xff5fd0, 1500, 'miyu_star_shower', 'miyu_meteor_constellation'),
  def('sakura_dawn', 'Sakura Dawn', 'female', 'Radiant energy fighter', 'radiant', 'magic', 0xffc2dc, 1500, 'sakura_dawn_beam', 'sakura_radiant_blossom'),
];

const characterMap = new Map<string, CharacterDef>(CHARACTERS.map((c) => [c.id, c]));

export function getCharacter(id: string): CharacterDef {
  const character = characterMap.get(id);
  if (!character) throw new Error(`Unknown character id "${id}".`);
  return character;
}

export function hasCharacter(id: string): boolean {
  return characterMap.has(id);
}

export function getCharactersByCategory(category: CharacterCategory): CharacterDef[] {
  return CHARACTERS.filter((c) => c.category === category);
}

/** Characters every new player owns (price 0). */
export const STARTER_CHARACTER_IDS: readonly string[] = CHARACTERS.filter((c) => c.price === 0).map(
  (c) => c.id,
);

/**
 * Manifest entries for all 20 character models, generated from the catalog
 * so there is a single source of truth. Pass them to the AssetLoader:
 *   new AssetLoader([...ASSET_MANIFEST, ...CHARACTER_ASSET_ENTRIES])
 * The .glb files do not exist yet; the game uses temporary models until they do.
 */
export const CHARACTER_ASSET_ENTRIES: readonly AssetEntry[] = CHARACTERS.map((c) => ({
  id: c.modelAssetId,
  path: `assets/characters/${c.category}/${c.id}.glb`,
  type: 'character',
  intendedUse: `${c.name} (${c.concept})`,
  scale: 1,
  forward: '+z',
  origin: 'feet',
  animations: REQUIRED_CHARACTER_ANIMATIONS,
  quality: 'temporary',
  license: 'Original asset. Record the license/source when the file is added.',
}));

/** Returns a list of problems. An empty list means the catalog is valid. */
export function validateCatalog(): string[] {
  const problems: string[] = [];

  if (CHARACTERS.length !== 20) problems.push(`Expected 20 characters, found ${CHARACTERS.length}.`);
  if (getCharactersByCategory('male').length !== 10) problems.push('Expected 10 male-category characters.');
  if (getCharactersByCategory('female').length !== 10) problems.push('Expected 10 female-category characters.');

  const ids = new Set<string>();
  const modelIds = new Set<string>();
  for (const c of CHARACTERS) {
    if (ids.has(c.id)) problems.push(`Duplicate character id "${c.id}".`);
    ids.add(c.id);
    if (modelIds.has(c.modelAssetId)) problems.push(`Duplicate model asset id "${c.modelAssetId}".`);
    modelIds.add(c.modelAssetId);

    if (c.price < 0) problems.push(`${c.id}: negative price.`);
    for (const abilityId of c.abilityIds) {
      if (!hasAbility(abilityId)) problems.push(`${c.id}: unknown ability "${abilityId}".`);
    }
  }

  for (const category of ['male', 'female'] as const) {
    if (!getCharactersByCategory(category).some((c) => c.price === 0)) {
      problems.push(`No starter character in category "${category}".`);
    }
  }

  return problems;
    }
