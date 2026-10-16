// src/world/props/Bridge.ts
import * as THREE from 'three';

export interface BridgeOptions {
  /** Deck width along X. */
  width: number;
  /** Deck length along Z (walking direction). */
  length: number;
  groundY: number;
}

/**
 * Wooden bridge with red railings. Origin is the center of the deck.
 * The deck is thin (top at groundY + 0.08) so the flat-ground player
 * controller can walk over it.
 */
export function createBridge(options: BridgeOptions): THREE.Group {
  const { width, length, groundY } = options;
  const bridge = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.6 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xe0b040,
    roughness: 0.4,
    metalness: 0.4,
  });

  // Deck planks
  const plankCount = Math.max(1, Math.round(length / 0.5));
  const plankLength = length / plankCount;
  const plankGeo = new THREE.BoxGeometry(width, 0.1, plankLength - 0.05);
  for (let i = 0; i < plankCount; i += 1) {
    const plank = new THREE.Mesh(plankGeo, woodMat);
    plank.position.set(0, groundY + 0.03, -length / 2 + plankLength * (i + 0.5));
    plank.castShadow = true;
    plank.receiveShadow = true;
    bridge.add(plank);
  }

  // Railings
  const railGeo = new THREE.BoxGeometry(0.12, 0.12, length);
  const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8);
  const finialGeo = new THREE.SphereGeometry(0.14, 10, 8);

  for (const side of [-1, 1]) {
    const x = (side * width) / 2;

    const upperRail = new THREE.Mesh(railGeo, redMat);
    upperRail.position.set(x, groundY + 1.0, 0);
    const lowerRail = new THREE.Mesh(railGeo, redMat);
    lowerRail.position.set(x, groundY + 0.55, 0);
    upperRail.castShadow = true;
    lowerRail.castShadow = true;
    bridge.add(upperRail, lowerRail);

    for (let i = 0; i <= 4; i += 1) {
      const z = -length / 2 + (i * length) / 4;
      const post = new THREE.Mesh(postGeo, redMat);
      post.position.set(x, groundY + 0.55, z);
      post.castShadow = true;
      bridge.add(post);

      if (i === 0 || i === 4) {
        const finial = new THREE.Mesh(finialGeo, goldMat);
        finial.position.set(x, groundY + 1.2, z);
        bridge.add(finial);
      }
    }
  }

  return bridge;
         }
