// src/main.ts
import { AssetLoader } from './assets/AssetLoader';
import { getCharacter } from './characters/catalog';
import { createPlaceholderCharacter } from './characters/CharacterPreview';
import { LocalOwnershipStore } from './characters/ownership';
import { Engine } from './core/Engine';
import { Input } from './core/Input';
import { PlayerController } from './player/PlayerController';
import { ThirdPersonCamera } from './player/ThirdPersonCamera';
import { CharacterSelect } from './ui/CharacterSelect';
import { Hud } from './ui/Hud';
import { LoadingScreen } from './ui/LoadingScreen';
import { MobileControls } from './ui/MobileControls';
import { buildFirstZone } from './world/Zone';

const container = document.getElementById('app') as HTMLDivElement | null;
if (!container) {
  throw new Error('#app container not found in index.html');
}

const loadingScreen = new LoadingScreen();
loadingScreen.setMessage('Starting...');

let engine: Engine;
try {
  engine = new Engine(container);
} catch (err) {
  loadingScreen.showError('Your browser or device could not start 3D graphics (WebGL).');
  throw err;
}

const input = new Input(engine.renderer.domElement);
const mobileControls = MobileControls.isTouchDevice() ? new MobileControls(input) : null;
const { scene, camera } = engine;

// Shadows: cover the whole first zone (only active on medium/high quality)
const shadowCamera = engine.sunLight.shadow.camera;
shadowCamera.left = -45;
shadowCamera.right = 45;
shadowCamera.top = 45;
shadowCamera.bottom = -45;
shadowCamera.near = 1;
shadowCamera.far = 80;
shadowCamera.updateProjectionMatrix();
engine.sunLight.shadow.bias = -0.0005;
engine.sunLight.shadow.normalBias = 0.05;

// World
const zone = buildFirstZone();
scene.add(zone.group);

// Player
const player = new PlayerController();
player.setColliders(zone.colliders);
scene.add(player.object);

const followCamera = new ThirdPersonCamera(camera);

// Assets, ownership (TEMPORARY local store) and character UI
const loader = new AssetLoader();
loadingScreen.bind(loader);
const ownership = new LocalOwnershipStore();

let applyToken = 0;

/** Puts the currently selected character into the world (real model, or placeholder). */
async function applySelectedCharacter(): Promise<void> {
  const token = ++applyToken;
  const def = getCharacter(ownership.getSelectedId());

  const loaded = await loader.load(def.modelAssetId);
  if (token !== applyToken) return;

  const instance = loaded ? loader.createInstance(def.modelAssetId) : null;
  if (instance) {
    player.setModel(instance.object, instance.animations);
  } else {
    player.setModel(createPlaceholderCharacter(def), [], true);
  }
}

const characterSelect = new CharacterSelect({
  loader,
  ownership,
  onSelected: () => {
    void applySelectedCharacter();
  },
});

const hud = new Hud({
  ownership,
  onOpenCharacters: () => characterSelect.open(),
});

engine.onUpdate((dt) => {
  zone.update(dt);

  const look = input.consumeLook();
  const zoom = input.consumeZoom();
  const jumpPressed = input.wasPressed('Space');

  if (input.wasPressed('KeyC') && !characterSelect.isOpen()) {
    characterSelect.open();
  }
  // While the character screen is open the player stands still.
  const uiOpen = characterSelect.isOpen();

  player.update(dt, {
    move: uiOpen ? { x: 0, y: 0 } : input.getMoveAxis(),
    cameraYaw: followCamera.yaw,
    sprint: input.isDown('ShiftLeft') || input.isDown('ShiftRight'),
    jump: jumpPressed && !uiOpen,
  });

  followCamera.update(dt, player.position, look, zoom, zone.colliders);
});

async function start(): Promise<void> {
  const selected = getCharacter(ownership.getSelectedId());
  await loader.preload([selected.modelAssetId]);
  await applySelectedCharacter();

  const missing = loader.getMissing();
  if (missing.length > 0) {
    console.info(`[assets] Using temporary models for: ${missing.join(', ')}`);
  }

  engine.start();
  loadingScreen.hide();
}

start().catch((err) => {
  console.error(err);
  loadingScreen.showError('Something went wrong while loading the game.');
});

window.addEventListener('beforeunload', () => {
  characterSelect.dispose();
  hud.dispose();
  mobileControls?.dispose();
  input.dispose();
  loader.dispose();
  engine.dispose();
});
