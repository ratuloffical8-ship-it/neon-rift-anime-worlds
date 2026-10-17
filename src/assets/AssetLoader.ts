// src/assets/AssetLoader.ts
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ASSET_MANIFEST, assetUrl } from './manifest';
import type { AssetEntry } from './manifest';

export type AssetStatus = 'idle' | 'loading' | 'loaded' | 'missing' | 'error';

export interface AssetInstance {
  object: THREE.Object3D;
  animations: THREE.AnimationClip[];
  /** True when the temporary procedural model is used instead of a real file. */
  isFallback: boolean;
}

export interface LoadProgress {
  total: number;
  done: number;
  current: string | null;
}

export type FallbackFactory = () => THREE.Object3D;
type ProgressListener = (progress: LoadProgress) => void;

/** "glTF" in little-endian: first four bytes of every .glb file. */
const GLB_MAGIC = 0x46546c67;

/**
 * Loads models from the manifest.
 * - Detects missing files (also when the dev server answers with index.html).
 * - Caches each model once and creates clones for every use.
 * - Never throws for a missing file: use createInstance() which falls back
 *   to a registered temporary model.
 * Draco/Meshopt/KTX2 compressed models are added in Phase 14.
 */
export class AssetLoader {
  private readonly entries = new Map<string, AssetEntry>();
  private readonly statuses = new Map<string, AssetStatus>();
  private readonly loaded = new Map<string, GLTF>();
  private readonly pending = new Map<string, Promise<boolean>>();
  private readonly fallbacks = new Map<string, FallbackFactory>();
  private readonly listeners = new Set<ProgressListener>();
  private readonly gltfLoader = new GLTFLoader();

  constructor(manifest: readonly AssetEntry[] = ASSET_MANIFEST) {
    for (const entry of manifest) {
      this.entries.set(entry.id, entry);
    }
  }

  getStatus(id: string): AssetStatus {
    this.getEntry(id);
    return this.statuses.get(id) ?? 'idle';
  }

  /** IDs of assets whose files were not found. */
  getMissing(): string[] {
    return [...this.statuses.entries()]
      .filter(([, status]) => status === 'missing')
      .map(([id]) => id);
  }

  /** Registers the temporary procedural model used while a file is missing. */
  registerFallback(id: string, factory: FallbackFactory): void {
    this.getEntry(id);
    this.fallbacks.set(id, factory);
  }

  onProgress(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Loads several assets in parallel and reports progress. Never rejects. */
  async preload(ids: readonly string[]): Promise<void> {
    const total = ids.length;
    let done = 0;
    this.emit({ total, done, current: null });

    await Promise.all(
      ids.map(async (id) => {
        this.emit({ total, done, current: id });
        await this.load(id);
        done += 1;
        this.emit({ total, done, current: id });
      }),
    );
  }

  /** Loads one asset. Resolves true if the real model is ready, false otherwise. */
  load(id: string): Promise<boolean> {
    const entry = this.getEntry(id);
    const status = this.statuses.get(id);
    if (status === 'loaded') return Promise.resolve(true);
    // Remember failures so a missing file is not requested again on every call.
    // Use retryFailed() after adding a file.
    if (status === 'missing' || status === 'error') return Promise.resolve(false);

    const existing = this.pending.get(id);
    if (existing) return existing;

    const promise = this.loadEntry(entry).finally(() => {
      this.pending.delete(id);
    });
    this.pending.set(id, promise);
    return promise;
  }

  /** Forgets missing/error results so the next load() checks again (e.g. after adding a file). */
  retryFailed(): void {
    for (const [id, status] of [...this.statuses.entries()]) {
      if (status === 'missing' || status === 'error') this.statuses.delete(id);
    }
  }

  /**
   * Creates a ready-to-use copy. Uses the real model when loaded, otherwise
   * the registered fallback, otherwise returns null.
   */
  createInstance(id: string): AssetInstance | null {
    const entry = this.getEntry(id);
    const gltf = this.loaded.get(id);

    if (gltf) {
      const model = cloneSkinned(gltf.scene);
      model.scale.multiplyScalar(entry.scale);
      if (entry.forward === '-z') model.rotation.y += Math.PI;

      if (entry.origin === 'center') {
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        model.position.y -= box.min.y;
      }

      if (entry.type !== 'animation') {
        model.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
          }
        });
      }

      const wrapper = new THREE.Group();
      wrapper.add(model);
      return { object: wrapper, animations: gltf.animations, isFallback: false };
    }

    const factory = this.fallbacks.get(id);
    if (factory) {
      return { object: factory(), animations: [], isFallback: true };
    }
    return null;
  }

  /** Frees all cached models (geometry, materials, textures). */
  dispose(): void {
    for (const gltf of this.loaded.values()) {
      gltf.scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        const materials = Array.isArray(material) ? material : material ? [material] : [];
        for (const m of materials) {
          for (const value of Object.values(m)) {
            if (value instanceof THREE.Texture) value.dispose();
          }
          m.dispose();
        }
      });
    }
    this.loaded.clear();
    this.statuses.clear();
    this.pending.clear();
    this.listeners.clear();
  }

  private getEntry(id: string): AssetEntry {
    const entry = this.entries.get(id);
    if (!entry) throw new Error(`Unknown asset id "${id}". Add it to src/assets/manifest.ts.`);
    return entry;
  }

  private async loadEntry(entry: AssetEntry): Promise<boolean> {
    this.statuses.set(entry.id, 'loading');
    const url = assetUrl(entry.path);

    try {
      const buffer = await this.fetchModel(url, entry.path);
      if (!buffer) {
        this.statuses.set(entry.id, 'missing');
        console.warn(`[assets] Missing file for "${entry.id}": ${entry.path}`);
        return false;
      }

      const basePath = url.substring(0, url.lastIndexOf('/') + 1);
      const gltf = await new Promise<GLTF>((resolve, reject) => {
        this.gltfLoader.parse(buffer, basePath, resolve, reject);
      });

      this.loaded.set(entry.id, gltf);
      this.statuses.set(entry.id, 'loaded');
      return true;
    } catch (err) {
      this.statuses.set(entry.id, 'error');
      console.error(`[assets] Failed to load "${entry.id}" (${entry.path})`, err);
      return false;
    }
  }

  /** Returns the file bytes, or null if the file does not exist or is not a model. */
  private async fetchModel(url: string, path: string): Promise<ArrayBuffer | null> {
    const response = await fetch(url);
    if (!response.ok) return null;

    // Dev servers answer unknown paths with index.html (status 200).
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('text/html')) return null;

    const buffer = await response.arrayBuffer();
    if (path.toLowerCase().endsWith('.glb')) {
      if (buffer.byteLength < 12) return null;
      if (new DataView(buffer).getUint32(0, true) !== GLB_MAGIC) return null;
    }
    return buffer;
  }

  private emit(progress: LoadProgress): void {
    this.listeners.forEach((listener) => listener(progress));
  }
}
