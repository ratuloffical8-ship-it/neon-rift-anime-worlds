// src/main.ts
import { AssetLoader } from './assets/AssetLoader';
import { Engine } from './core/Engine';
import { Input } from './core/Input';
import { createTemporaryPlayerModel, PlayerController } from './player/PlayerController';
import { ThirdPersonCamera } from './player/ThirdPersonCamera';
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

// Player (temporary model until a real .glb is loaded)
const player = new PlayerController();
player.setColliders(zone.colliders);
scene.add(player.object);

const followCamera = new ThirdPersonCamera(camera);

engine.onUpdate((dt) => {
  zone.update(dt);

  const look = input.consumeLook();
  const zoom = input.consumeZoom();

  player.update(dt, {
    move: input.getMoveAxis(),
    cameraYaw: followCamera.yaw,
    sprint: input.isDown('ShiftLeft') || input.isDown('ShiftRight'),
    jump: input.wasPressed('Space'),
  });

  followCamera.update(dt, player.position, look, zoom, zone.colliders);
});

// Assets
const loader = new AssetLoader();
loader.registerFallback('player_default', createTemporaryPlayerModel);
loadingScreen.bind(loader);

async function start(): Promise<void> {
  await loader.preload(['player_default']);

  const instance = loader.createInstance('player_default');
  if (instance && !instance.isFallback) {
    player.setModel(instance.object, instance.animations);
  }

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
  mobileControls?.dispose();
  input.dispose();
  loader.dispose();
  engine.dispose();
});
