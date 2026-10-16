// src/main.ts
import * as THREE from 'three';
import { CONFIG } from './core/Config';
import { Engine } from './core/Engine';
import { Input } from './core/Input';
import { PlayerController } from './player/PlayerController';
import type { CircleCollider } from './player/PlayerController';
import { ThirdPersonCamera } from './player/ThirdPersonCamera';
import { MobileControls } from './ui/MobileControls';

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
const colliders: CircleCollider[] = [];

// Ground
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(CONFIG.world.firstZoneHalfSize, 48),
  new THREE.MeshStandardMaterial({ color: 0x1a1f4d, roughness: 0.9 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = CONFIG.world.groundY;
scene.add(ground);

const grid = new THREE.GridHelper(80, 40, 0x00e5ff, 0x3b2a7a);
const gridMaterial = grid.material as THREE.Material;
gridMaterial.transparent = true;
gridMaterial.opacity = 0.35;
grid.position.y = CONFIG.world.groundY + 0.01;
scene.add(grid);

// Temporary centerpiece (3D) with collision
const crystal = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.2, 0),
  new THREE.MeshStandardMaterial({
    color: 0x7c3aed,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.35,
    flatShading: true,
    roughness: 0.4,
  }),
);
crystal.position.y = 2;
scene.add(crystal);
colliders.push({ x: 0, z: 0, radius: 1.3, height: 3.5 });

// Temporary test pillars (collision test)
const pillarGeometry = new THREE.CylinderGeometry(1, 1, 4, 16);
const pillarMaterial = new THREE.MeshStandardMaterial({ color: 0x2b2f6b, roughness: 0.7 });
const pillarSpots: Array<[number, number]> = [
  [-8, -4],
  [9, -6],
  [-5, 12],
  [12, 8],
];
for (const [x, z] of pillarSpots) {
  const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
  pillar.position.set(x, CONFIG.world.groundY + 2, z);
  scene.add(pillar);
  colliders.push({ x, z, radius: 1, height: 4 });
}

// Player and camera
const player = new PlayerController();
player.setColliders(colliders);
scene.add(player.object);

const followCamera = new ThirdPersonCamera(camera);

engine.onUpdate((dt) => {
  crystal.rotation.y += dt * 0.8;
  crystal.rotation.x += dt * 0.3;

  const look = input.consumeLook();
  const zoom = input.consumeZoom();

  player.update(dt, {
    move: input.getMoveAxis(),
    cameraYaw: followCamera.yaw,
    sprint: input.isDown('ShiftLeft') || input.isDown('ShiftRight'),
    jump: input.wasPressed('Space'),
  });

  followCamera.update(dt, player.position, look, zoom, colliders);
});

engine.start();
loadingEl?.classList.add('hidden');

window.addEventListener('beforeunload', () => {
  mobileControls?.dispose();
  input.dispose();
  engine.dispose();
});
