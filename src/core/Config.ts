// src/core/Config.ts

export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface GraphicsPreset {
  /** Upper limit for renderer.setPixelRatio */
  maxPixelRatio: number;
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: number;
  /** Upper limit for particles per effect */
  maxParticles: number;
  /** Camera far plane / fog end distance */
  drawDistance: number;
}

export const GRAPHICS_PRESETS: Record<GraphicsQuality, GraphicsPreset> = {
  low: {
    maxPixelRatio: 1,
    antialias: false,
    shadows: false,
    shadowMapSize: 512,
    maxParticles: 40,
    drawDistance: 60,
  },
  medium: {
    maxPixelRatio: 1.5,
    antialias: false,
    shadows: true,
    shadowMapSize: 1024,
    maxParticles: 120,
    drawDistance: 90,
  },
  high: {
    maxPixelRatio: 2,
    antialias: true,
    shadows: true,
    shadowMapSize: 2048,
    maxParticles: 300,
    drawDistance: 140,
  },
};

export const CONFIG = {
  game: {
    name: 'NEON RIFT: ANIME WORLDS',
    version: '0.1.0',
    /** Target frame rate for low-end Android devices */
    targetFps: 30,
  },
  player: {
    walkSpeed: 3.2,
    runSpeed: 5.5,
    sprintSpeed: 8,
    jumpVelocity: 7,
    gravity: 20,
    radius: 0.4,
    height: 1.7,
  },
  camera: {
    fov: 60,
    near: 0.1,
    distance: 5,
    minDistance: 2,
    maxDistance: 9,
    minPitch: -0.5,
    maxPitch: 1.2,
    rotateSensitivity: 0.0035,
  },
  world: {
    /** Y coordinate of the ground plane */
    groundY: 0,
    /** Half-size of the first playable zone, in world units */
    firstZoneHalfSize: 40,
  },
  network: {
    /** Configurable room capacity (small initial community) */
    maxPlayersPerRoom: 6,
    /** How often player state is sent to the server (per second) */
    stateSendRate: 10,
  },
  ui: {
    colors: {
      midnight: '#0b1026',
      purple: '#7c3aed',
      cyan: '#00e5ff',
      magenta: '#ff4fd8',
    },
  },
} as const;

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

/**
 * Picks a safe default graphics preset from device hints.
 * Falls back to 'low' when the device looks weak or hints are missing.
 */
export function detectDefaultQuality(): GraphicsQuality {
  const nav = navigator as NavigatorWithMemory;
  const memory = nav.deviceMemory ?? 2;
  const cores = nav.hardwareConcurrency ?? 4;

  if (memory >= 8 && cores >= 8) return 'high';
  if (memory >= 4 && cores >= 4) return 'medium';
  return 'low';
  }
