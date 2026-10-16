<!-- docs/ASSETS.md -->
# NEON RIFT — 3D Asset Guide

## Current status
No real `.glb` files exist yet. The game uses **temporary procedural models**.
Planned assets are listed in `src/assets/manifest.ts`. The browser console shows
`[assets] Missing file for "<id>"` for each file that is not found. This is expected.

## Folders (inside `public/`)
```
public/assets/characters/male/
public/assets/characters/female/
public/assets/characters/            (player_default.glb)
public/assets/environment/buildings/
public/assets/environment/vegetation/
public/assets/environment/props/
public/assets/environment/water/
public/assets/environment/furniture/
public/assets/environment/romance/
public/assets/animations/
public/assets/audio/
```

## Model rules
- Format: `.glb` (binary glTF 2.0). The file must contain real model data.
- Units: 1 unit = 1 meter. A character is about 1.7 units tall.
- Orientation: model faces **+Z**, up is +Y. If it faces -Z, set `forward: '-z'` in the manifest.
- Origin: at the feet/base (`origin: 'feet'` or `'base'`). Use `'center'` if the origin is in the middle.
- Characters: one skinned mesh, clips named exactly `idle`, `walk`, `run`, `jump` (lower or upper case).
- Mobile budget (2 GB phones): character 5k–8k triangles, textures 1024 px or smaller,
  one material per character if possible, file size under 3 MB.

## Add a model
1. Put the file at the path listed in `src/assets/manifest.ts` (or add a new entry there).
2. Fill the entry honestly: scale, forward, origin, animations, quality, license/source.
3. Make sure a fallback is registered for it (see `loader.registerFallback` in `src/main.ts`).
4. Run `npm run dev` and check the console:
   - no "Missing file" warning for that ID means it loaded
   - an `error` message means the file is not a valid model

## Replace a temporary model
Set `quality: 'production'` in the manifest only after the final model is in place.
Keep the fallback registered so the game never breaks if a file fails to load.

## Licenses
Use only original or properly licensed assets. Record the source and license for every
file in its manifest entry. Do not copy models, textures or UI from existing games.

## Not yet supported
Draco, Meshopt and KTX2 compressed models are added in Phase 14 (optimization).
