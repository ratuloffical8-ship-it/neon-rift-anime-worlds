// src/main.ts
import * as THREE from 'three';
import { Engine } from './core/Engine';
import { Input } from './core/Input';
import { PlayerController } from './player/PlayerController';
import { ThirdPersonCamera } from './player/ThirdPersonCamera';
import { MobileControls } from './ui/MobileControls';
import { buildFirstZone } from './world/Zone';

const container = document.getElementById('app') as HTMLDivElement | null;
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');

if (!container) {
  throw new Error('#app container not found in index.html');
}

function showError(message: string): void {
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

let engine: Engine;
try {
  engine = new Engine(container);
} catch (err) {
  showError('Your browser or device could not start 3D graphics (WebGL).');
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

// Player and camera
const player = new PlayerController();
player.setColliders(zone.colliders);
player.object.traverse((obj) => {
  if (obj instanceof THREE.Mesh) obj.castShadow = true;
});
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

engine.start();
loadingEl?.classList.add('hidden');

window.addEventListener('beforeunload', () => {
  mobileControls?.dispose();
  input.dispose();
  engine.dispose();
});
