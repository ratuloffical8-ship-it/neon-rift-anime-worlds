// src/world/Lighting.ts
import * as THREE from 'three';

/** Horizon color. Fog uses the same color so distant objects blend into the sky. */
const HORIZON_COLOR = 0x7a4a86;

function createSkyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#14103f');
    gradient.addColorStop(0.3, '#4a2a86');
    gradient.addColorStop(0.46, '#d9667f');
    gradient.addColorStop(0.5, '#ff9a76');
    gradient.addColorStop(0.52, '#6b3f7a');
    gradient.addColorStop(1, '#1a1238');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 8, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Sunset sky dome. It follows the camera and scales with the camera's far
 * plane, so it always surrounds the player on every graphics quality.
 */
export function createSky(): THREE.Mesh {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 16),
    new THREE.MeshBasicMaterial({
      map: createSkyTexture(),
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  sky.onBeforeRender = (_renderer, _scene, camera) => {
    sky.position.copy(camera.position);
    if (camera instanceof THREE.PerspectiveCamera) {
      sky.scale.setScalar(camera.far * 0.9);
    }
  };
  return sky;
}

/** Switches the scene's lights, fog and background to the dusk look. */
export function applyDuskLighting(scene: THREE.Scene): void {
  scene.background = new THREE.Color(HORIZON_COLOR);
  if (scene.fog instanceof THREE.Fog) {
    scene.fog.color.setHex(HORIZON_COLOR);
  }

  scene.traverse((obj) => {
    if (obj instanceof THREE.HemisphereLight) {
      obj.color.setHex(0xffb08a);
      obj.groundColor.setHex(0x2a1a5a);
      obj.intensity = 0.75;
    } else if (obj instanceof THREE.DirectionalLight) {
      obj.color.setHex(0xffb27a);
      obj.intensity = 1.35;
      obj.position.set(-22, 14, -14);
    }
  });
}
