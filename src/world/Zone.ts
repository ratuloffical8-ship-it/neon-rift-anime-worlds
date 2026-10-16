// src/world/Zone.ts
import * as THREE from 'three';
import { CONFIG } from '../core/Config';
import type { CircleCollider } from '../player/PlayerController';
import { createTree, treeColliderRadius } from './props/Tree';
import type { TreeKind } from './props/Tree';

export interface ZoneResult {
  group: THREE.Group;
  colliders: CircleCollider[];
  /** Call every frame (animates the centerpiece crystal). */
  update: (dt: number) => void;
}

const HOUSE_SIZE = 5;
const WALL_HEIGHT = 3;
const PATH_HALF_WIDTH = 2.2;
const PLAZA_RADIUS = 5;
const TREE_COUNT = 40;

/** Small deterministic random generator so the world looks the same every time. */
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Circles along the edge of a square footprint (houses cannot be entered yet). */
function squareColliders(cx: number, cz: number, size: number, height: number): CircleCollider[] {
  const radius = 0.75;
  const half = size / 2;
  const out: CircleCollider[] = [];
  for (let i = 0; i <= size; i += 1) {
    const offset = -half + i;
    out.push({ x: cx + offset, z: cz - half, radius, height });
    out.push({ x: cx + offset, z: cz + half, radius, height });
    if (i > 0 && i < size) {
      out.push({ x: cx - half, z: cz + offset, radius, height });
      out.push({ x: cx + half, z: cz + offset, radius, height });
    }
  }
  return out;
}

function createHouse(
  roofColor: number,
  wallMat: THREE.Material,
  doorMat: THREE.Material,
  windowMat: THREE.Material,
): THREE.Group {
  const house = new THREE.Group();

  const walls = new THREE.Mesh(new THREE.BoxGeometry(HOUSE_SIZE, WALL_HEIGHT, HOUSE_SIZE), wallMat);
  walls.position.y = WALL_HEIGHT / 2;

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(HOUSE_SIZE * 0.78, 2, 4),
    new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7, flatShading: true }),
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = WALL_HEIGHT + 1;

  const door = new THREE.Mesh(new THREE.BoxGeometry(1, 1.8, 0.1), doorMat);
  door.position.set(0, 0.9, HOUSE_SIZE / 2 + 0.03);

  const windowGeo = new THREE.BoxGeometry(0.7, 0.7, 0.08);
  const windowLeft = new THREE.Mesh(windowGeo, windowMat);
  windowLeft.position.set(-1.5, 1.8, HOUSE_SIZE / 2 + 0.03);
  const windowRight = new THREE.Mesh(windowGeo, windowMat);
  windowRight.position.set(1.5, 1.8, HOUSE_SIZE / 2 + 0.03);

  house.add(walls, roof, door, windowLeft, windowRight);
  house.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return house;
}

/**
 * Builds the first explorable zone: grass, a main path, a plaza with the
 * Rift Crystal, six houses, lantern posts and forest.
 * Everything is real 3D geometry (temporary procedural art).
 */
export function buildFirstZone(): ZoneResult {
  const group = new THREE.Group();
  const colliders: CircleCollider[] = [];
  const groundY = CONFIG.world.groundY;

  // Grass
  const grass = new THREE.Mesh(
    new THREE.CircleGeometry(CONFIG.world.firstZoneHalfSize, 64),
    new THREE.MeshStandardMaterial({ color: 0x2f7d46, roughness: 0.95 }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = groundY;
  grass.receiveShadow = true;
  group.add(grass);

  // Main path (north-south)
  const pathLength = CONFIG.world.firstZoneHalfSize * 2 - 4;
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(PATH_HALF_WIDTH * 2, pathLength),
    new THREE.MeshStandardMaterial({ color: 0x9a7b55, roughness: 1 }),
  );
  path.rotation.x = -Math.PI / 2;
  path.position.y = groundY + 0.02;
  path.receiveShadow = true;
  group.add(path);

  // Plaza
  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(PLAZA_RADIUS, 40),
    new THREE.MeshStandardMaterial({ color: 0x59608f, roughness: 0.8 }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = groundY + 0.04;
  plaza.receiveShadow = true;
  group.add(plaza);

  // Rift Crystal (centerpiece)
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
  crystal.castShadow = true;
  group.add(crystal);
  colliders.push({ x: 0, z: 0, radius: 1.3, height: 3.5 });

  // Houses (front door faces the path)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf2e6d0, roughness: 0.9 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a2f1f, roughness: 0.8 });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffd27a,
    emissive: 0xffc04d,
    emissiveIntensity: 0.6,
  });
  const roofColors = [0xe86a92, 0xc0392b, 0x3b6fd1];
  const houseSpots: Array<[number, number]> = [
    [-9, -16],
    [-9, -4],
    [-9, 14],
    [9, -16],
    [9, -4],
    [9, 14],
  ];
  houseSpots.forEach(([x, z], index) => {
    const house = createHouse(roofColors[index % roofColors.length], wallMat, doorMat, windowMat);
    house.position.set(x, groundY, z);
    house.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(house);
    colliders.push(...squareColliders(x, z, HOUSE_SIZE, WALL_HEIGHT + 0.2));
  });

  // Lantern posts along the path
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2, 6);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x2b2b3a, roughness: 0.8 });
  const lanternGeo = new THREE.SphereGeometry(0.22, 10, 8);
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xffb347,
    emissive: 0xffa03a,
    emissiveIntensity: 1,
  });
  for (const z of [-26, -12, 12, 26]) {
    for (const x of [-2.9, 2.9]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x, groundY + 1, z);
      post.castShadow = true;
      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.set(x, groundY + 2.1, z);
      group.add(post, lantern);
      colliders.push({ x, z, radius: 0.2, height: 2.4 });
    }
  }

  // Forest: random placement that avoids the path, plaza, houses and other trees
  const random = mulberry32(20261016);
  const maxRadius = CONFIG.world.firstZoneHalfSize - 3;
  let placed = 0;
  for (let attempt = 0; attempt < 600 && placed < TREE_COUNT; attempt += 1) {
    const angle = random() * Math.PI * 2;
    const distance = 10 + random() * (maxRadius - 10);
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const scale = 0.8 + random() * 0.5;
    const radius = treeColliderRadius(scale);

    if (Math.abs(x) < PATH_HALF_WIDTH + 1.5) continue;
    if (Math.hypot(x, z) < PLAZA_RADIUS + 2) continue;
    const blocked = colliders.some(
      (c) => Math.hypot(x - c.x, z - c.z) < c.radius + radius + 1.2,
    );
    if (blocked) continue;

    const kind: TreeKind = random() < 0.4 ? 'sakura' : 'pine';
    const tree = createTree(kind, scale);
    tree.position.set(x, groundY, z);
    tree.rotation.y = random() * Math.PI * 2;
    group.add(tree);
    colliders.push({ x, z, radius, height: 4 });
    placed += 1;
  }

  let time = 0;
  const update = (dt: number): void => {
    time += dt;
    crystal.rotation.y += dt * 0.8;
    crystal.rotation.x += dt * 0.3;
    crystal.position.y = 2 + Math.sin(time * 1.5) * 0.15;
  };

  return { group, colliders, update };
  }
