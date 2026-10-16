// src/characters/abilities.ts
import type { AbilityDef } from './types';

/** Two abilities per character: one special and one ultimate. */
export const ABILITIES: readonly AbilityDef[] = [
  // ---- Male ----
  { id: 'kaito_thunder_slash', name: 'Thunder Slash', description: 'Dashes forward and cuts through the opponent with a lightning-charged blade.', kind: 'special', cooldownSeconds: 7, damage: 16, range: 6 },
  { id: 'kaito_storm_dominion', name: 'Storm Dominion', description: 'Calls down a ring of lightning bolts around the opponent.', kind: 'ultimate', cooldownSeconds: 30, damage: 34, range: 8 },

  { id: 'ren_shadow_step', name: 'Shadow Step', description: 'Vanishes into shadow and strikes from behind the opponent.', kind: 'special', cooldownSeconds: 7, damage: 15, range: 8 },
  { id: 'ren_umbral_execution', name: 'Umbral Execution', description: 'Unleashes a rapid chain of shadow strikes.', kind: 'ultimate', cooldownSeconds: 30, damage: 36, range: 5 },

  { id: 'akio_flame_arc', name: 'Flame Arc', description: 'Sends a crescent of fire flying from the blade.', kind: 'special', cooldownSeconds: 6, damage: 15, range: 7 },
  { id: 'akio_inferno_crash', name: 'Inferno Crash', description: 'Leaps into the air and slams down in a burst of fire.', kind: 'ultimate', cooldownSeconds: 28, damage: 35, range: 5 },

  { id: 'haru_gale_dash', name: 'Gale Dash', description: 'A burst of speed that cuts through the opponent on the way past.', kind: 'special', cooldownSeconds: 6, damage: 13, range: 8 },
  { id: 'haru_cyclone_barrage', name: 'Cyclone Barrage', description: 'Fires a chain of wind slashes from all sides.', kind: 'ultimate', cooldownSeconds: 26, damage: 32, range: 6 },

  { id: 'raiden_volt_combo', name: 'Volt Combo', description: 'A fast chain of electric punches.', kind: 'special', cooldownSeconds: 6, damage: 14, range: 4 },
  { id: 'raiden_overload_fist', name: 'Overload Fist', description: 'Charges up and delivers one heavy electric strike.', kind: 'ultimate', cooldownSeconds: 30, damage: 37, range: 4 },

  { id: 'sora_frost_cut', name: 'Frost Cut', description: 'An icy slash that briefly slows the opponent.', kind: 'special', cooldownSeconds: 7, damage: 14, range: 6 },
  { id: 'sora_glacier_verdict', name: 'Glacier Verdict', description: 'Freezing burst that erupts in a wide circle around him.', kind: 'ultimate', cooldownSeconds: 30, damage: 34, range: 6 },

  { id: 'takumi_nova_pulse', name: 'Nova Pulse', description: 'Throws a ball of cosmic energy at long range.', kind: 'special', cooldownSeconds: 7, damage: 16, range: 12 },
  { id: 'takumi_supernova_burst', name: 'Supernova Burst', description: 'A huge cosmic explosion centered on the opponent.', kind: 'ultimate', cooldownSeconds: 32, damage: 38, range: 9 },

  { id: 'riku_mirage_clones', name: 'Mirage Clones', description: 'Creates decoy clones and strikes from one of them.', kind: 'special', cooldownSeconds: 8, damage: 13, range: 7 },
  { id: 'riku_phantom_stage', name: 'Phantom Stage', description: 'Fills the arena with illusions that strike from every direction.', kind: 'ultimate', cooldownSeconds: 30, damage: 33, range: 8 },

  { id: 'itsuki_stone_guard', name: 'Stone Guard', description: 'Slams the ground and raises a rock wall that knocks the opponent back.', kind: 'special', cooldownSeconds: 8, damage: 10, range: 5 },
  { id: 'itsuki_tectonic_fortress', name: 'Tectonic Fortress', description: 'Earth spikes erupt around him while he takes reduced damage for a short time.', kind: 'ultimate', cooldownSeconds: 32, damage: 32, range: 6 },

  { id: 'yuki_crescent_eclipse', name: 'Crescent Eclipse', description: 'Releases an arc of dark moonlight.', kind: 'special', cooldownSeconds: 7, damage: 15, range: 7 },
  { id: 'yuki_total_eclipse', name: 'Total Eclipse', description: 'Darkens the arena and strikes with concentrated moon energy.', kind: 'ultimate', cooldownSeconds: 32, damage: 37, range: 9 },

  // ---- Female ----
  { id: 'akari_ember_slash', name: 'Ember Slash', description: 'A quick sword cut that leaves a trail of fire.', kind: 'special', cooldownSeconds: 6, damage: 15, range: 6 },
  { id: 'akari_phoenix_rising', name: 'Phoenix Rising', description: 'Rises in a pillar of flame shaped like a phoenix.', kind: 'ultimate', cooldownSeconds: 28, damage: 35, range: 6 },

  { id: 'miyu_star_shower', name: 'Star Shower', description: 'Rains small stars down on the opponent.', kind: 'special', cooldownSeconds: 7, damage: 15, range: 11 },
  { id: 'miyu_meteor_constellation', name: 'Meteor Constellation', description: 'Draws a constellation in the sky that calls down meteors.', kind: 'ultimate', cooldownSeconds: 32, damage: 38, range: 10 },

  { id: 'hana_petal_storm', name: 'Petal Storm', description: 'A swirl of sharp petals carried by the wind.', kind: 'special', cooldownSeconds: 6, damage: 13, range: 8 },
  { id: 'hana_sakura_tempest', name: 'Sakura Tempest', description: 'A blossoming whirlwind that sweeps across the arena.', kind: 'ultimate', cooldownSeconds: 26, damage: 32, range: 7 },

  { id: 'reina_ice_lance', name: 'Ice Lance', description: 'Shoots a spear of ice at long range.', kind: 'special', cooldownSeconds: 6, damage: 15, range: 12 },
  { id: 'reina_absolute_zero', name: 'Absolute Zero', description: 'Freezes the area around the opponent in a heavy ice burst.', kind: 'ultimate', cooldownSeconds: 30, damage: 36, range: 9 },

  { id: 'aiko_thunder_kick', name: 'Thunder Kick', description: 'A lightning-fast spinning kick.', kind: 'special', cooldownSeconds: 6, damage: 14, range: 4 },
  { id: 'aiko_lightning_rush', name: 'Lightning Rush', description: 'Rushes through the opponent several times at electric speed.', kind: 'ultimate', cooldownSeconds: 28, damage: 35, range: 6 },

  { id: 'yume_dream_blink', name: 'Dream Blink', description: 'Teleports through shadow and strikes on arrival.', kind: 'special', cooldownSeconds: 7, damage: 14, range: 9 },
  { id: 'yume_nightfall_rend', name: 'Nightfall Rend', description: 'Pulls the opponent into a shadow rift and tears at them.', kind: 'ultimate', cooldownSeconds: 30, damage: 36, range: 6 },

  { id: 'sakura_dawn_beam', name: 'Dawn Beam', description: 'Fires a beam of warm radiant light.', kind: 'special', cooldownSeconds: 7, damage: 15, range: 11 },
  { id: 'sakura_radiant_blossom', name: 'Radiant Blossom', description: 'A giant flower of light blooms and bursts.', kind: 'ultimate', cooldownSeconds: 30, damage: 36, range: 8 },

  { id: 'mei_crystal_shard', name: 'Crystal Shard', description: 'Launches a volley of crystal shards.', kind: 'special', cooldownSeconds: 6, damage: 13, range: 12 },
  { id: 'mei_prism_bastion', name: 'Prism Bastion', description: 'Raises a crystal barrier that shatters into a burst of shards.', kind: 'ultimate', cooldownSeconds: 30, damage: 32, range: 8 },

  { id: 'kira_moonveil_mirage', name: 'Moonveil Mirage', description: 'Veils herself in moonlight and strikes from a false image.', kind: 'special', cooldownSeconds: 8, damage: 13, range: 7 },
  { id: 'kira_lunar_reflection', name: 'Lunar Reflection', description: 'Creates a moon mirror that reflects light back at the opponent.', kind: 'ultimate', cooldownSeconds: 30, damage: 34, range: 8 },

  { id: 'nozomi_gale_sprint', name: 'Gale Sprint', description: 'A blindingly fast dash that slashes with the wind.', kind: 'special', cooldownSeconds: 6, damage: 13, range: 9 },
  { id: 'nozomi_tempest_waltz', name: 'Tempest Waltz', description: 'A dance of rapid wind strikes around the opponent.', kind: 'ultimate', cooldownSeconds: 26, damage: 32, range: 6 },
];

const abilityMap = new Map<string, AbilityDef>(ABILITIES.map((a) => [a.id, a]));

export function getAbility(id: string): AbilityDef {
  const ability = abilityMap.get(id);
  if (!ability) throw new Error(`Unknown ability id "${id}".`);
  return ability;
}

export function hasAbility(id: string): boolean {
  return abilityMap.has(id);
   }
