// src/world/props/River.ts
import * as THREE from 'three';
import type { CircleCollider } from '../../player/PlayerController';

export interface RiverOptions {
  /** Center line of the river (world Z). The river runs along X. */
  z: number;
  width: number;
  length: number;
  groundY: number;
  /** Half-width of the walkable gap at x = 0 (where the bridge is). */
  gapHalfWidth: number;
}

export interface RiverResult {
  group: THREE.Group;
  colliders: CircleCollider[];
  update: (dt: number) => void;
}

function createWaterTexture(repeatX: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#2b9fd4';
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i += 1) {
      const y = (i * 64) / 14 + 3;
      const x = (i * 53) % 200;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 20, y - 4, x + 44, y);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Straight river with animated water, raised stone banks and invisible
 * collision walls. Players can only cross at the bridge gap.
 */
export function createRiver(options: RiverOptions): RiverResult {
  const { z, width, length, groundY, gapHalfWidth } = options;
  const group = new THREE.Group();
  const colliders: CircleCollider[] = [];

  // Water
  const texture = createWaterTexture(length / 8);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(length, width),
    new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9,
      roughness: 0.25,
      metalness: 0.1,
      emissive: 0x0a4f73,
      emissiveIntensity: 0.3,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, groundY + 0.05, z);
  water.receiveShadow = true;
  group.add(water);

  // Stone banks
  const bankMat = new THREE.MeshStandardMaterial({ color: 0x8a8f9c, roughness: 0.9 });
  const bankGeo = new THREE.BoxGeometry(length, 0.2, 0.35);
  for (const side of [-1, 1]) {
    const bank = new THREE.Mesh(bankGeo, bankMat);
    bank.position.set(0, groundY + 0.1, z + side * (width / 2 + 0.17));
    bank.castShadow = true;
    bank.receiveShadow = true;
    group.add(bank);
  }

  // Collision: two rows of circles covering the water, with a gap at the bridge.
  const radius = width / 4;
  const spacing = radius * 1.4;
  const blockedNearCenter = gapHalfWidth + radius + 0.4;
  const half = length / 2;
  for (let x = -half; x <= half; x += spacing) {
    if (Math.abs(x) < blockedNearCenter) continue;
    for (const dz of [-radius, radius]) {
      // Taller than the highest jump so the river cannot be jumped over.
      colliders.push({ x, z: z + dz, radius, height: 1.5 });
    }
  }

  const update = (dt: number): void => {
    texture.offset.x -= dt * 0.04;
  };

  return { group, colliders, update };
    }
