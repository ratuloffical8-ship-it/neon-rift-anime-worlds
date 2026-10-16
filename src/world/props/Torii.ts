// src/world/props/Torii.ts
import * as THREE from 'three';
import type { CircleCollider } from '../../player/PlayerController';

const TORII_HEIGHT = 6;

/**
 * Japanese-style gate. The opening faces the Z axis (beams run along X).
 * Origin is the center of the gate at ground level.
 */
export function createTorii(width: number, groundY: number): THREE.Group {
  const gate = new THREE.Group();

  const redMat = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.6 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x1e1e26, roughness: 0.7 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xe0b040,
    roughness: 0.4,
    metalness: 0.4,
  });
  const neonMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: 0x00e5ff,
    emissiveIntensity: 1,
  });

  const pillarGeo = new THREE.CylinderGeometry(0.28, 0.34, TORII_HEIGHT, 10);
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(pillarGeo, redMat);
    pillar.position.set((side * width) / 2, groundY + TORII_HEIGHT / 2, 0);
    pillar.castShadow = true;
    gate.add(pillar);
  }

  // Upper beam (kasagi) and lower beam (nuki)
  const kasagi = new THREE.Mesh(new THREE.BoxGeometry(width + 2, 0.35, 0.7), blackMat);
  kasagi.position.set(0, groundY + TORII_HEIGHT + 0.1, 0);
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(width + 0.3, 0.25, 0.35), redMat);
  nuki.position.set(0, groundY + TORII_HEIGHT * 0.78, 0);
  kasagi.castShadow = true;
  nuki.castShadow = true;

  // Center plaque and neon strip
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.15), goldMat);
  plaque.position.set(0, groundY + TORII_HEIGHT * 0.89, 0);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(width, 0.05, 0.05), neonMat);
  strip.position.set(0, groundY + TORII_HEIGHT - 0.12, 0.38);

  gate.add(kasagi, nuki, plaque, strip);
  return gate;
}

/** Collision circles for the two pillars of a gate placed at (x, z). */
export function toriiColliders(x: number, z: number, width: number): CircleCollider[] {
  return [-1, 1].map((side) => ({
    x: x + (side * width) / 2,
    z,
    radius: 0.4,
    height: TORII_HEIGHT,
  }));
}
