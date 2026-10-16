// src/player/PlayerController.ts
import * as THREE from 'three';
import { CONFIG } from '../core/Config';
import type { MoveAxis } from '../core/Input';

/** Vertical cylinder obstacle on the XZ plane. */
export interface CircleCollider {
  x: number;
  z: number;
  radius: number;
  /** Top of the obstacle (world Y). Omit for an infinitely tall wall. */
  height?: number;
}

export interface PlayerInput {
  move: MoveAxis;
  /** Camera yaw in radians. Movement is relative to the camera. */
  cameraYaw: number;
  sprint: boolean;
  jump: boolean;
}

export type PlayerState = 'idle' | 'walk' | 'run' | 'sprint' | 'jump';

/**
 * Third-person character movement.
 * The visual is a TEMPORARY procedural model. It will be replaced by a
 * .glb character through the asset pipeline (Phase 4/5).
 */
export class PlayerController {
  readonly object = new THREE.Group();
  state: PlayerState = 'idle';

  private velocityY = 0;
  private grounded = true;
  private facing = Math.PI;
  private colliders: CircleCollider[] = [];
  private readonly boundaryRadius = CONFIG.world.firstZoneHalfSize - 1;
  private readonly moveDir = new THREE.Vector2();

  constructor(spawn: THREE.Vector3 = new THREE.Vector3(0, CONFIG.world.groundY, 8)) {
    this.object.position.copy(spawn);
    this.object.rotation.y = this.facing;
    this.buildTemporaryModel();
  }

  get position(): THREE.Vector3 {
    return this.object.position;
  }

  setColliders(colliders: CircleCollider[]): void {
    this.colliders = colliders;
  }

  update(dt: number, input: PlayerInput): void {
    const { move, cameraYaw } = input;
    const magnitude = Math.min(1, Math.hypot(move.x, move.y));
    const moving = magnitude > 0.05;

    if (moving) {
      // Camera-relative directions on the XZ plane.
      const fx = -Math.sin(cameraYaw);
      const fz = -Math.cos(cameraYaw);
      const rx = Math.cos(cameraYaw);
      const rz = -Math.sin(cameraYaw);
      this.moveDir.set(fx * move.y + rx * move.x, fz * move.y + rz * move.x);
      this.moveDir.normalize();

      const fast = magnitude > 0.6;
      const speed = fast
        ? input.sprint
          ? CONFIG.player.sprintSpeed
          : CONFIG.player.runSpeed
        : CONFIG.player.walkSpeed;

      this.object.position.x += this.moveDir.x * speed * dt;
      this.object.position.z += this.moveDir.y * speed * dt;

      const targetFacing = Math.atan2(this.moveDir.x, this.moveDir.y);
      const delta = shortestAngle(this.facing, targetFacing);
      const maxStep = 12 * dt;
      this.facing += THREE.MathUtils.clamp(delta, -maxStep, maxStep);

      this.state = !fast ? 'walk' : input.sprint ? 'sprint' : 'run';
    } else {
      this.state = 'idle';
    }

    // Jump and gravity
    if (input.jump && this.grounded) {
      this.velocityY = CONFIG.player.jumpVelocity;
      this.grounded = false;
    }
    this.velocityY -= CONFIG.player.gravity * dt;
    this.object.position.y += this.velocityY * dt;

    if (this.object.position.y <= CONFIG.world.groundY) {
      this.object.position.y = CONFIG.world.groundY;
      this.velocityY = 0;
      this.grounded = true;
    }
    if (!this.grounded) this.state = 'jump';

    this.resolveCollisions();
    this.object.rotation.y = this.facing;
  }

  private resolveCollisions(): void {
    const pos = this.object.position;

    for (const c of this.colliders) {
      if (c.height !== undefined && pos.y >= c.height) continue;

      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const minDist = c.radius + CONFIG.player.radius;
      const distSq = dx * dx + dz * dz;

      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        if (dist < 1e-4) {
          pos.x = c.x + minDist;
        } else {
          pos.x = c.x + (dx / dist) * minDist;
          pos.z = c.z + (dz / dist) * minDist;
        }
      }
    }

    // Keep the player inside the playable zone.
    const r = Math.hypot(pos.x, pos.z);
    if (r > this.boundaryRadius) {
      pos.x = (pos.x / r) * this.boundaryRadius;
      pos.z = (pos.z / r) * this.boundaryRadius;
    }
  }

  private buildTemporaryModel(): void {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.8, 4, 12),
      new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.6 }),
    );
    body.position.y = 0.75;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd9c0, roughness: 0.7 }),
    );
    head.position.y = 1.55;

    // Cyan marker shows the facing direction (+Z).
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.3),
      new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        emissive: 0x00e5ff,
        emissiveIntensity: 0.6,
      }),
    );
    nose.position.set(0, 1.55, 0.3);

    this.object.add(body, head, nose);
  }
}

/** Smallest signed difference between two angles, in (-PI, PI]. */
function shortestAngle(from: number, to: number): number {
  const twoPi = Math.PI * 2;
  let d = (to - from) % twoPi;
  if (d > Math.PI) d -= twoPi;
  if (d < -Math.PI) d += twoPi;
  return d;
      }
