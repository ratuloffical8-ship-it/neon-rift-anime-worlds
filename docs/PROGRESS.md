<!-- docs/PROGRESS.md -->
# NEON RIFT: ANIME WORLDS — Progress Record

Updated after batch 15. Rule: exactly 3 files per batch, permission (Y/N) after every batch.

## Current position
- Current phase: Phase 5 complete. Next: Phase 6 (Authentication).
- Last completed batch: 15
- Outstanding errors: none reported
- Files needing correction: none known

## Phases
| Phase | Status |
|---|---|
| 0 Planning | done |
| 1 Foundation | done (batches 1–3) |
| 2 Player movement | done (batches 4–5) |
| 3 Environment prototype | done (batches 6–9) |
| 4 Asset pipeline | done (batches 10–11) |
| 5 Character catalog | done (batches 12–15) |
| 6 Authentication | next |
| 7–15 | not started |

## Files completed (31)
```
package.json, index.html, tsconfig.json, vite.config.ts
src/main.ts
src/core/        Config.ts, Input.ts, Engine.ts
src/player/      PlayerController.ts, ThirdPersonCamera.ts
src/ui/          MobileControls.ts, LoadingScreen.ts, CharacterSelect.ts, Hud.ts
src/world/       Zone.ts, Lighting.ts
src/world/props/ Tree.ts, Bridge.ts, River.ts, Torii.ts, Rock.ts, Flowers.ts
src/assets/      manifest.ts, AssetLoader.ts
src/characters/  types.ts, abilities.ts, catalog.ts, ownership.ts, CharacterPreview.ts
docs/            ASSETS.md, PROGRESS.md
```

## What works (by design)
- Real 3D third-person world: village, path, plaza, houses, trees, river and bridge, torii gates, rocks, flowers, dusk sky.
- Keyboard (WASD, Shift, Space, C) and touch controls (joystick, jump, sprint toggle, drag camera).
- Collision for solid objects. The river can only be crossed at the bridge.
- 20-character catalog (10 male-category, 10 female-category), 40 abilities, prices, 4 starters.
- Character screen: tabs, rotatable/zoomable 3D preview, abilities, buy confirmation, insufficient-coins handling.
- Selected character appears in the world.

## Tests
Run by the assistant (in a small harness, not the full project):
- Catalog data: 20 characters, 40 abilities, no problems found.
- Ownership logic: buy, double buy, insufficient coins, select locked, reload from storage, corrupted data.
- Manifest: 23 entries, unique IDs.

NOT run yet (need your machine and a browser):
- `npx tsc --noEmit` and `npm run build` for the whole project
- All 3D rendering, collision feel, mobile controls, character screen layout on phones
- Performance on a low-end Android phone (no measurement yet)

## Known limitations
- No real `.glb` files exist. All models are temporary procedural placeholders.
- Ownership and coins are a TEMPORARY local store in the browser (editable by the player). Real coins, purchases and ownership are server-validated in Phase 10.
- Houses cannot be entered yet (interiors in Phase 7).
- Fog color resets if `Engine.setQuality()` is called later (fixed with graphics settings in Phase 14).
- Trees are separate meshes. Merging/instancing comes in Phase 14.
- A missing model file is requested once per page load, then remembered.

## Plan change log
- Batch 8: `Lighting.ts` lives in `src/world/` (not `props/`).
- Batch 15: transaction history and wallet screen moved to Phase 10, because the coin ledger must be server-side. A local history would not be trustworthy.

## Roadmap (estimate)
About 50 batches remain. Phase 6 starts with Firebase setup files, login/registration screens and profile creation.
