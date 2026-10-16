// src/world/props/Rock.ts
import * as THREE from 'three';

/** Number of different rock shapes. */
export const ROCK_VARIANTS = 3;

const geometries: THREE.BufferGeometry[] = [];
let material: THREE.MeshStandardMaterial | null = null;

/** Same input position always gives the same value, so shared vertices stay joined. */
function hash3(x: number, y: number, z: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed * 4.1414) * 43758.5453;
  return n - Math.floor(n);
}

function getGeometry(variant: number): THREE.BufferGeometry {
  const index = ((variant % ROCK_VARIANTS) + ROCK_VARIANTS) % ROCK_VARIANTS;
  const cached = geometries[index];
  if (cached) return cached;

  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const bump = 0.8 + 0.4 * hash3(x, y, z, index + 1);
    position.setXYZ(i, x * bump, y * bump * 0.7, z * bump);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();

  geometries[index] = geometry;
  return geometry;
}

function getMaterial(): THREE.MeshStandardMaterial {
  if (!material) {
    material = new THREE.MeshStandardMaterial({
      color: 0x8a8da0,
      roughness: 0.95,
      flatShading: true,
    });
  }
  return material;
}

/** Collision radius for a rock of the given scale. */
export function rockColliderRadius(scale: number): number {
  return 0.9 * scale;
}

/** Approximate top of the rock (world units above ground). */
export function rockHeight(scale: number): number {
  return 0.8 * scale;
}

/** Creates a low-poly rock. Position it with y = groundY. */
export function createRock(scale = 1, variant = 0): THREE.Mesh {
  const rock = new THREE.Mesh(getGeometry(variant), getMaterial());
  rock.scale.setScalar(scale);
  rock.position.y = 0.25 * scale;
  rock.castShadow = true;
  rock.receiveShadow = true;
  return rock;
}
