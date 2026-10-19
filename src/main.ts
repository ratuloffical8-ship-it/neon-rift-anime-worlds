// src/main.ts
import { AssetLoader } from './assets/AssetLoader';
import { getCharacter, validateCatalog } from './characters/catalog';
import { createPlaceholderCharacter } from './characters/CharacterPreview';
import { LocalOwnershipStore } from './characters/ownership';
import { Engine } from './core/Engine';
import { Input } from './core/Input';
import { AuthFailure, AuthService } from './net/auth';
import type { AuthUser } from './net/auth';
import { isFirebaseConfigured } from './net/firebase';
import { ProfileFailure, ProfileService } from './net/firestore';
import type { PlayerProfile } from './net/firestore';
import { PlayerController } from './player/PlayerController';
import { ThirdPersonCamera } from './player/ThirdPersonCamera';
import { AuthScreen } from './ui/AuthScreen';
import { CharacterSelect } from './ui/CharacterSelect';
import { Hud } from './ui/Hud';
import { LoadingScreen } from './ui/LoadingScreen';
import { MobileControls } from './ui/MobileControls';
import { OfflineNotice } from './ui/OfflineNotice';
import { SetupScreen } from './ui/SetupScreen';
import { buildFirstZone } from './world/Zone';

const container = document.getElementById('app') as HTMLDivElement | null;
if (!container) {
  throw new Error('#app container not found in index.html');
}

const loadingScreen = new LoadingScreen();
loadingScreen.setMessage('Starting...');

let engine: Engine;
try {
  engine = new Engine(container);
} catch (err) {
  loadingScreen.showError('Your browser or device could not start 3D graphics (WebGL).');
  throw err;
}

if (import.meta.env.DEV) {
  const catalogProblems = validateCatalog();
  if (catalogProblems.length > 0) {
    console.error('[catalog] Problems found:', catalogProblems);
  }
}

const input = new Input(engine.renderer.domElement);
const { scene, camera } = engine;

// Shadows: cover the whole first zone (only active on medium/high quality)
const shadowCamera = engine.sunLight.shadow.camera;
shadowCamera.left = -45;
shadowCamera.right = 45;
shadowCamera.top = 45;
shadowCamera.bottom = -45;
shadowCamera.near = 1;
shadowCamera.far = 80;
shadowCamera.updateProjectionMatrix();
engine.sunLight.shadow.bias = -0.0005;
engine.sunLight.shadow.normalBias = 0.05;

// World
const zone = buildFirstZone();
scene.add(zone.group);

// Player
const player = new PlayerController();
player.setColliders(zone.colliders);
scene.add(player.object);

const followCamera = new ThirdPersonCamera(camera);

// Assets and ownership (ownership is a TEMPORARY local store until Phase 10)
const loader = new AssetLoader();
loadingScreen.bind(loader);
const ownership = new LocalOwnershipStore();

// Session state
let authService: AuthService | null = null;
let profileService: ProfileService | null = null;
let currentProfile: PlayerProfile | null = null;
let inGame = false;
let hud: Hud | null = null;
let mobileControls: MobileControls | null = null;
let stopAuthWatch: (() => void) | null = null;

let applyToken = 0;

/** Puts the currently selected character into the world (real model, or placeholder). */
async function applySelectedCharacter(): Promise<void> {
  const token = ++applyToken;
  const def = getCharacter(ownership.getSelectedId());

  const loaded = await loader.load(def.modelAssetId);
  if (token !== applyToken) return;

  const instance = loaded ? loader.createInstance(def.modelAssetId) : null;
  if (instance) {
    player.setModel(instance.object, instance.animations);
  } else {
    player.setModel(createPlaceholderCharacter(def), [], true);
  }
}

const characterSelect = new CharacterSelect({
  loader,
  ownership,
  onSelected: (characterId) => {
    void applySelectedCharacter();
    if (profileService && currentProfile) {
      profileService
        .updateSelectedCharacter(currentProfile.uid, characterId)
        .catch((err) => {
          // Characters bought in this phase exist only locally, so the account cannot store them yet.
          console.warn('[profile] Selected character was not saved to the account.', err);
        });
    }
  },
});

// ---- Sign-in flow ----

/** Shows the login screen and resolves when the player signs in. */
function signIn(auth: AuthService): Promise<AuthUser> {
  return new Promise<AuthUser>((resolve) => {
    const screen = new AuthScreen({ auth, onAuthenticated: resolve });
    screen.show('login');
  });
}

/** Shows first-time setup and resolves with the created profile. */
function runSetup(profiles: ProfileService, uid: string): Promise<PlayerProfile> {
  return new Promise<PlayerProfile>((resolve) => {
    const screen = new SetupScreen({
      onSubmit: async (displayName, characterId) => {
        const profile = await profiles.createProfile(uid, displayName, characterId);
        resolve(profile);
      },
    });
    screen.show();
  });
}

/** Shows the offline notice and resolves when the player chooses to continue. */
function askOffline(): Promise<void> {
  return new Promise<void>((resolve) => {
    const notice = new OfflineNotice({ onContinue: resolve });
    notice.show();
  });
}

/**
 * Works out who is playing. Returns the profile, or null in offline testing mode.
 * The loading screen is hidden while a login/setup screen is shown.
 */
async function resolveSession(): Promise<PlayerProfile | null> {
  if (!isFirebaseConfigured()) {
    loadingScreen.hide();
    await askOffline();
    return null;
  }

  const auth = new AuthService();
  authService = auth;

  loadingScreen.setMessage('Checking your account...');
  let user = await auth.waitForInitialState();
  if (!user) {
    loadingScreen.hide();
    user = await signIn(auth);
    loadingScreen.show();
  }

  loadingScreen.setMessage('Loading your profile...');
  const profiles = new ProfileService();
  profileService = profiles;

  let profile = await profiles.getProfile(user.uid);
  if (!profile) {
    loadingScreen.hide();
    profile = await runSetup(profiles, user.uid);
    loadingScreen.show();
  }
  return profile;
}

async function logout(): Promise<void> {
  try {
    await authService?.logout();
  } catch (err) {
    console.error('[auth] Log out failed', err);
  }
  window.location.reload();
}

function enterGame(): void {
  inGame = true;

  if (MobileControls.isTouchDevice()) {
    mobileControls = new MobileControls(input);
  }

  hud = new Hud({
    ownership,
    onOpenCharacters: () => characterSelect.open(),
    onLogout: authService ? () => void logout() : undefined,
    identity: currentProfile
      ? { displayName: currentProfile.displayName, playerId: currentProfile.playerId }
      : null,
  });

  // If the session ends (for example logged out in another tab), start again from the login screen.
  if (authService) {
    stopAuthWatch = authService.onAuthChanged((user) => {
      if (!user && inGame) window.location.reload();
    });
  }
}

engine.onUpdate((dt) => {
  zone.update(dt);

  const look = input.consumeLook();
  const zoom = input.consumeZoom();
  const jumpPressed = input.wasPressed('Space');

  if (input.wasPressed('KeyC') && !characterSelect.isOpen()) {
    characterSelect.open();
  }
  // While the character screen is open the player stands still.
  const uiOpen = characterSelect.isOpen();

  player.update(dt, {
    move: uiOpen ? { x: 0, y: 0 } : input.getMoveAxis(),
    cameraYaw: followCamera.yaw,
    sprint: input.isDown('ShiftLeft') || input.isDown('ShiftRight'),
    jump: jumpPressed && !uiOpen,
  });

  followCamera.update(dt, player.position, look, zoom, zone.colliders);
});

async function start(): Promise<void> {
  currentProfile = await resolveSession();

  loadingScreen.show();
  loadingScreen.setMessage('Loading...');

  // Use the character saved in the account (starters are always owned locally).
  if (currentProfile) {
    await ownership.select(currentProfile.selectedCharacterId);
  }

  const selected = getCharacter(ownership.getSelectedId());
  await loader.preload([selected.modelAssetId]);
  await applySelectedCharacter();

  const missing = loader.getMissing();
  if (missing.length > 0) {
    console.info(`[assets] Using temporary models for: ${missing.join(', ')}`);
  }

  enterGame();
  engine.start();
  loadingScreen.hide();
}

start().catch((err) => {
  console.error(err);
  loadingScreen.show();
  const reason =
    err instanceof AuthFailure || err instanceof ProfileFailure
      ? err.message
      : 'Something went wrong while loading the game.';
  loadingScreen.showError(`${reason} Reload the page to try again.`);
});

window.addEventListener('beforeunload', () => {
  inGame = false;
  stopAuthWatch?.();
  characterSelect.dispose();
  hud?.dispose();
  mobileControls?.dispose();
  input.dispose();
  loader.dispose();
  engine.dispose();
});
