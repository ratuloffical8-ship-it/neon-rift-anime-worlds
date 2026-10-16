// src/player/ThirdPersonCamera.ts
import * as THREE from 'three';
import { CONFIG } from '../core/Config';
import type { CircleCollider } from './PlayerController';

/**
 * Smooth orbit camera that follows a target.
 * Moves closer when an obstacle is between the target and the camera,
 * and never goes below the ground.
 */
export class ThirdPersonCamera {
  yaw = 0;
  pitch = 0.35;
  distance: number = CONFIG.camera.distance;

  private effectiveDistance: number = CONFIG.camera.distance;
  private readonly focus = new THREE.Vector3();
  private readonly smoothFocus = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly probe = new THREE.Vector3();
  private initialized = false;

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  update(
    dt: number,
    target: THREE.Vector3,
    look: { x: number; y: number },
    zoom: number,
    colliders: readonly CircleCollider[],
  ): void {
    const cfg = CONFIG.camera;

    this.yaw -= look.x * cfg.rotateSensitivity;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch + look.y * cfg.rotateSensitivity,
      cfg.minPitch,
      cfg.maxPitch,
    );
    this.distance = THREE.MathUtils.clamp(
      this.distance + zoom * 0.01,
      cfg.minDistance,
      cfg.maxDistance,
    );

    // Follow point is near the player's head.
    this.focus.set(target.x, target.y + CONFIG.player.height * 0.9, target.z);
    if (!this.initialized) {
      this.smoothFocus.copy(this.focus);
      this.initialized = true;
    } else {
      this.smoothFocus.lerp(this.focus, 1 - Math.exp(-12 * dt));
    }

    const cosPitch = Math.cos(this.pitch);
    this.direction.set(
      Math.sin(this.yaw) * cosPitch,
      Math.sin(this.pitch),
      Math.cos(this.yaw) * cosPitch,
    );

    // Pull the camera in when blocked, ease it back out afterwards.
    const safe = this.findSafeDistance(this.distance, colliders);
    if (safe < this.effectiveDistance) {
      this.effectiveDistance = safe;
    } else {
      this.effectiveDistance += (safe - this.effectiveDistance) * (1 - Math.exp(-6 * dt));
    }

    this.camera.position
      .copy(this.smoothFocus)
      .addScaledVector(this.direction, this.effectiveDistance);
    this.camera.position.y = Math.max(this.camera.position.y, CONFIG.world.groundY + 0.3);
    this.camera.lookAt(this.smoothFocus);
  }

  private findSafeDistance(wanted: number, colliders: readonly CircleCollider[]): number {
    const step = 0.25;
    const margin = 0.3;
    const minimum = 0.8;

    for (let t = 0.5; t <= wanted; t += step) {
      this.probe.copy(this.smoothFocus).addScaledVector(this.direction, t);
      for (const c of colliders) {
        if (c.height !== undefined && this.probe.y > c.height) continue;
        const dx = this.probe.x - c.x;
        const dz = this.probe.z - c.z;
        const limit = c.radius + margin;
        if (dx * dx + dz * dz < limit * limit) {
          return Math.max(minimum, t - step);
        }
      }
    }
    return wanted;
  }
}
