// src/world/props/Tree.ts
import * as THREE from 'three';

export type TreeKind = 'pine' | 'sakura';

interface SharedParts {
  trunkPine: THREE.CylinderGeometry;
  conePineLow: THREE.ConeGeometry;
  conePineHigh: THREE.ConeGeometry;
  trunkSakura: THREE.CylinderGeometry;
  blossom: THREE.IcosahedronGeometry;
  trunkMat: THREE.MeshStandardMaterial;
  pineMat: THREE.MeshStandardMaterial;
  blossomMat: THREE.MeshStandardMaterial;
}

let shared: SharedParts | null = null;

/** Geometry and materials are created once and reused by every tree. */
function getShared(): SharedParts {
  if (shared) return shared;
  shared = {
    trunkPine: new THREE.CylinderGeometry(0.18, 0.26, 1.2, 6),
    conePineLow: new THREE.ConeGeometry(1.1, 2.0, 7),
    conePineHigh: new THREE.ConeGeometry(0.8, 1.6, 7),
    trunkSakura: new THREE.CylinderGeometry(0.16, 0.28, 1.7, 6),
    blossom: new THREE.IcosahedronGeometry(1.4, 0),
    trunkMat: new THREE.MeshStandardMaterial({ color: 0x5b3a29, roughness: 0.9 }),
    pineMat: new THREE.MeshStandardMaterial({
      color: 0x1f6b3a,
      roughness: 0.8,
      flatShading: true,
    }),
    blossomMat: new THREE.MeshStandardMaterial({
      color: 0xff9ec7,
      roughness: 0.7,
      flatShading: true,
    }),
  };
  return shared;
}

/** Collision radius (trunk) for a tree of the given scale. */
export function treeColliderRadius(scale: number): number {
  return 0.45 * scale;
}

/** Creates a low-poly 3D tree. Origin is at the base of the trunk. */
export function createTree(kind: TreeKind, scale = 1): THREE.Group {
  const parts = getShared();
  const tree = new THREE.Group();

  const add = (mesh: THREE.Mesh, y: number): void => {
    mesh.position.y = y;
    mesh.castShadow = true;
    tree.add(mesh);
  };

  if (kind === 'pine') {
    add(new THREE.Mesh(parts.trunkPine, parts.trunkMat), 0.6);
    add(new THREE.Mesh(parts.conePineLow, parts.pineMat), 2.2);
    add(new THREE.Mesh(parts.conePineHigh, parts.pineMat), 3.3);
  } else {
    add(new THREE.Mesh(parts.trunkSakura, parts.trunkMat), 0.85);
    const crown = new THREE.Mesh(parts.blossom, parts.blossomMat);
    crown.scale.set(1, 0.8, 1);
    add(crown, 2.7);
  }

  tree.scale.setScalar(scale);
  return tree;
}
