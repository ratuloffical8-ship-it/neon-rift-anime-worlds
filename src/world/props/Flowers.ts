// src/world/props/Flowers.ts
import * as THREE from 'three';

export interface FlowerPoint {
  x: number;
  z: number;
}

const PALETTE = [0xff9ec7, 0xffffff, 0xffe27a, 0xc4a1ff, 0xff6bd6];

/**
 * Many flowers drawn with only two draw calls (instanced stems and heads).
 * Flowers are decoration only and have no collision.
 */
export function createFlowers(
  points: FlowerPoint[],
  groundY: number,
  random: () => number,
): THREE.Group {
  const group = new THREE.Group();
  if (points.length === 0) return group;

  const stemGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.4, 4);
  stemGeo.translate(0, 0.2, 0);
  const headGeo = new THREE.SphereGeometry(0.09, 6, 5);

  const stemMat = new THREE.MeshStandardMaterial({ color: 0x2f8f46, roughness: 0.9 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });

  const stems = new THREE.InstancedMesh(stemGeo, stemMat, points.length);
  const heads = new THREE.InstancedMesh(headGeo, headMat, points.length);
  stems.frustumCulled = false;
  heads.frustumCulled = false;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  points.forEach((point, i) => {
    const height = 0.7 + random() * 0.8;

    dummy.position.set(point.x, groundY, point.z);
    dummy.scale.set(1, height, 1);
    dummy.updateMatrix();
    stems.setMatrixAt(i, dummy.matrix);

    dummy.position.set(point.x, groundY + 0.4 * height, point.z);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);

    color.setHex(PALETTE[Math.floor(random() * PALETTE.length)]);
    heads.setColorAt(i, color);
  });

  stems.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  if (heads.instanceColor) heads.instanceColor.needsUpdate = true;

  group.add(stems, heads);
  return group;
                       }
