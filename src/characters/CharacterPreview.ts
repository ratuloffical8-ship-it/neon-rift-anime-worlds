// src/characters/CharacterPreview.ts
import * as THREE from 'three';
import type { AssetLoader } from '../assets/AssetLoader';
import type { CharacterDef } from './types';

/** TEMPORARY procedural character used until the real .glb model exists. */
export function createPlaceholderCharacter(def: CharacterDef): THREE.Group {
  const group = new THREE.Group();
  group.userData.placeholder = true;

  const accent = new THREE.Color(def.accentColor);
  const bodyMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.55 });
  const darkMat = new THREE.MeshStandardMaterial({
    color: accent.clone().multiplyScalar(0.35),
    roughness: 0.7,
  });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd9c0, roughness: 0.7 });
  const markerMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.6,
  });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.8, 4, 12), bodyMat);
  body.position.y = 0.75;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), skinMat);
  head.position.y = 1.55;

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.31, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    darkMat,
  );
  hair.position.y = 1.58;

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.3), markerMat);
  nose.position.set(0, 1.55, 0.3);

  // Silhouette difference: skirt for female-category, shoulder pads for male-category.
  const extra =
    def.category === 'female'
      ? new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.7, 16), darkMat)
      : new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 0.45), darkMat);
  extra.position.y = def.category === 'female' ? 0.45 : 1.2;

  group.add(body, head, hair, nose, extra);
  return group;
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material?.dispose();
  });
}

interface ActiveModel {
  object: THREE.Object3D;
  /** True for placeholders created here (safe to dispose). Cloned assets are shared. */
  owned: boolean;
  mixer: THREE.AnimationMixer | null;
}

/**
 * Self-contained 3D preview: drag to rotate, wheel / pinch / zoomBy() to zoom.
 * It creates its own renderer when constructed and frees it in dispose(),
 * so no extra WebGL context stays alive while the screen is closed.
 */
export class CharacterPreview {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  private readonly holder = new THREE.Group();
  private readonly ringMaterial = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
  private readonly rimLight = new THREE.DirectionalLight(0x00e5ff, 1.2);
  private readonly clock = new THREE.Clock();
  private readonly resizeObserver: ResizeObserver;
  private readonly pointers = new Map<number, { x: number; y: number }>();

  private active: ActiveModel | null = null;
  private loadToken = 0;
  private baseDistance = 3.2;
  private baseHeight = 1.1;
  private zoomT = 0.5;
  private yaw = 0;
  private idleTime = 0;
  private lastPinch = 0;
  private disposed = false;

  constructor(
    private readonly container: HTMLElement,
    private readonly loader: AssetLoader,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const canvas = this.renderer.domElement;
    Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%', touchAction: 'none' });
    container.appendChild(canvas);

    // Lights
    this.scene.add(new THREE.HemisphereLight(0xcfd8ff, 0x2a1a5a, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(2, 4, 3);
    this.scene.add(key);
    this.rimLight.position.set(-3, 2, -3);
    this.scene.add(this.rimLight);

    // Pedestal with a glowing ring
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: 0x1a1f4d, roughness: 0.6 }),
    );
    pedestal.position.y = -0.06;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.025, 8, 48), this.ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01;
    this.scene.add(pedestal, ring, this.holder);

    this.applyCamera();

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerEnd);
    canvas.addEventListener('pointercancel', this.onPointerEnd);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.renderer.setAnimationLoop(this.tick);
  }

  /** Shows a character. Uses the real model if available, otherwise a placeholder. */
  async setCharacter(def: CharacterDef): Promise<void> {
    const token = ++this.loadToken;

    this.baseDistance = def.previewCamera.distance;
    this.baseHeight = def.previewCamera.height;
    this.camera.fov = def.previewCamera.fov;
    this.camera.updateProjectionMatrix();
    this.ringMaterial.color.setHex(def.accentColor);
    this.rimLight.color.setHex(def.accentColor);
    this.applyCamera();

    let object: THREE.Object3D | null = null;
    let animations: THREE.AnimationClip[] = [];
    let owned = false;

    try {
      if (await this.loader.load(def.modelAssetId)) {
        const instance = this.loader.createInstance(def.modelAssetId);
        if (instance) {
          object = instance.object;
          animations = instance.animations;
        }
      }
    } catch {
      // Unknown asset id in this loader: fall through to the placeholder.
    }

    if (token !== this.loadToken || this.disposed) {
      if (object) disposeObject(object);
      return;
    }

    if (!object) {
      object = createPlaceholderCharacter(def);
      owned = true;
    }

    this.clearActive();
    this.holder.add(object);

    let mixer: THREE.AnimationMixer | null = null;
    const idle = animations.find((clip) => clip.name.toLowerCase() === 'idle');
    if (idle) {
      mixer = new THREE.AnimationMixer(object);
      mixer.clipAction(idle).play();
    }
    this.active = { object, owned, mixer };
  }

  /** Changes zoom. delta is in 0..1 units (positive = zoom out). */
  zoomBy(delta: number): void {
    this.zoomT = THREE.MathUtils.clamp(this.zoomT + delta, 0, 1);
    this.applyCamera();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerEnd);
    canvas.removeEventListener('pointercancel', this.onPointerEnd);
    canvas.removeEventListener('wheel', this.onWheel);

    this.clearActive();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });

    this.renderer.dispose();
    this.renderer.forceContextLoss();
    canvas.remove();
  }

  private clearActive(): void {
    if (!this.active) return;
    this.active.mixer?.stopAllAction();
    this.holder.remove(this.active.object);
    if (this.active.owned) disposeObject(this.active.object);
    this.active = null;
  }

  private applyCamera(): void {
    const distance = this.baseDistance * THREE.MathUtils.lerp(0.6, 1.8, this.zoomT);
    this.camera.position.set(0, this.baseHeight, distance);
    this.camera.lookAt(0, 0.95, 0);
  }

  private resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private readonly tick = (): void => {
    if (document.hidden) return;
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.elapsedTime;

    this.idleTime += dt;
    if (this.pointers.size === 0 && this.idleTime > 2) {
      this.yaw += dt * 0.4;
    }
    this.holder.rotation.y = this.yaw;

    if (this.active) {
      this.active.mixer?.update(dt);
      if (this.active.owned) {
        // Placeholder has no animation: gentle breathing so it does not look frozen.
        this.active.object.scale.y = 1 + Math.sin(time * 2) * 0.012;
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  private readonly onPointerDown = (e: PointerEvent): void => {
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.renderer.domElement.setPointerCapture(e.pointerId);
    this.idleTime = 0;
    if (this.pointers.size === 2) this.lastPinch = this.pinchDistance();
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    const previous = this.pointers.get(e.pointerId);
    if (!previous) return;
    this.idleTime = 0;

    if (this.pointers.size === 1) {
      this.yaw += (e.clientX - previous.x) * 0.012;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    } else {
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const distance = this.pinchDistance();
      if (this.lastPinch > 0) this.zoomBy((this.lastPinch - distance) * 0.004);
      this.lastPinch = distance;
    }
  };

  private readonly onPointerEnd = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
    this.lastPinch = 0;
    const canvas = this.renderer.domElement;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  };

  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.zoomBy(e.deltaY * 0.001);
  };

  private pinchDistance(): number {
    const [a, b] = [...this.pointers.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}
