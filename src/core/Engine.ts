// src/core/Engine.ts
import * as THREE from 'three';
import { CONFIG, GRAPHICS_PRESETS, detectDefaultQuality } from './Config';
import type { GraphicsQuality } from './Config';

export type UpdateCallback = (dt: number, elapsed: number) => void;

/**
 * Owns the renderer, scene, camera, base lights and the main loop.
 * Game systems register an update callback with onUpdate().
 */
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly hemiLight: THREE.HemisphereLight;
  readonly sunLight: THREE.DirectionalLight;

  private readonly container: HTMLElement;
  private readonly clock = new THREE.Clock();
  private readonly callbacks = new Set<UpdateCallback>();
  private quality: GraphicsQuality;
  private running = false;

  constructor(container: HTMLElement, quality: GraphicsQuality = detectDefaultQuality()) {
    this.container = container;
    this.quality = quality;
    const preset = GRAPHICS_PRESETS[quality];

    // Throws if WebGL is unavailable. The caller shows the error screen.
    this.renderer = new THREE.WebGLRenderer({
      antialias: preset.antialias,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.ui.colors.midnight);

    this.camera = new THREE.PerspectiveCamera(
      CONFIG.camera.fov,
      window.innerWidth / window.innerHeight,
      CONFIG.camera.near,
      preset.drawDistance,
    );

    this.hemiLight = new THREE.HemisphereLight(0x88aaff, 0x221144, 0.9);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.1);
    this.sunLight.position.set(6, 12, 4);
    this.scene.add(this.sunLight);

    this.applyQuality(quality);
    window.addEventListener('resize', this.onResize);
  }

  getQuality(): GraphicsQuality {
    return this.quality;
  }

  /** Changes graphics quality at runtime (antialiasing needs a page reload). */
  setQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    this.applyQuality(quality);
  }

  /** Registers a per-frame callback. Returns a function that unregisters it. */
  onUpdate(callback: UpdateCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.renderer.setAnimationLoop(this.tick);
  }

  stop(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.callbacks.clear();

    this.scene.traverse((obj) => {
      const o = obj as THREE.Mesh;
      o.geometry?.dispose();
      const material = o.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else {
        material?.dispose();
      }
    });

    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private applyQuality(quality: GraphicsQuality): void {
    const preset = GRAPHICS_PRESETS[quality];

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset.maxPixelRatio));
    this.camera.far = preset.drawDistance;
    this.camera.updateProjectionMatrix();
    this.scene.fog = new THREE.Fog(
      CONFIG.ui.colors.midnight,
      preset.drawDistance * 0.4,
      preset.drawDistance,
    );

    this.renderer.shadowMap.enabled = preset.shadows;
    this.sunLight.castShadow = preset.shadows;
    if (preset.shadows) {
      this.sunLight.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
    }
  }

  private readonly tick = (): void => {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.elapsedTime;
    this.callbacks.forEach((callback) => callback(dt, elapsed));
    this.renderer.render(this.scene, this.camera);
  };

  private readonly onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };
             }
