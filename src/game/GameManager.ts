import { Application, Container, Sprite, Texture, Assets, Graphics, Text, TextStyle, TilingSprite } from 'pixi.js';

export interface WeaponStats {
  id: string;
  type: 'melee' | 'ranged';
  damage: number;
  fireRate: number; // in ms
  spread: number; // in radians
  projectilesPerShot: number;
  movementPenalty: number;
  firingMovementPenalty: number;
  spriteName: string;
  projectileSpriteName: string;
  sfx: string;
  maxAmmo?: number;
  reloadTime?: number; // ms
}

export const WeaponRegistry: Record<string, WeaponStats> = {
  gun: { id: 'gun', type: 'ranged', damage: 30, fireRate: 250, spread: 0.05, projectilesPerShot: 1, movementPenalty: 1.0, firingMovementPenalty: 0.9, spriteName: 'gun', projectileSpriteName: 'bullet', sfx: 'shoot', maxAmmo: 12, reloadTime: 1200 },
  sword: { id: 'sword', type: 'melee', damage: 45, fireRate: 700, spread: 0, projectilesPerShot: 1, movementPenalty: 1.1, firingMovementPenalty: 1.0, spriteName: 'sword', projectileSpriteName: 'sword', sfx: 'sword_swing' },
  machine_gun: { id: 'machine_gun', type: 'ranged', damage: 35, fireRate: 100, spread: 0.3, projectilesPerShot: 1, movementPenalty: 0.85, firingMovementPenalty: 0.4, spriteName: 'machine_gun', projectileSpriteName: 'mg_bullet', sfx: 'mg_shoot', maxAmmo: 50, reloadTime: 2500 },
  shotgun: { id: 'shotgun', type: 'ranged', damage: 15, fireRate: 800, spread: 0.8, projectilesPerShot: 5, movementPenalty: 0.95, firingMovementPenalty: 0.6, spriteName: 'shotgun', projectileSpriteName: 'shotgun_pellet', sfx: 'shotgun_blast', maxAmmo: 9, reloadTime: 600 }
};

// =============================================
// SIMPLEX NOISE (2D) Ã¢â‚¬â€ Inline implementation
// =============================================
const GRAD2 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
const PERM = new Uint8Array(512);
const PERM_MOD8 = new Uint8Array(512);
{
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // Fisher-Yates shuffle with fixed seed for deterministic terrain
  let seed = 42;
  const rng = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) {
    PERM[i] = p[i & 255];
    PERM_MOD8[i] = PERM[i] % 8;
  }
}

function simplex2(xin: number, yin: number): number {
  const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
  const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
  const s = (xin + yin) * F2;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const t = (i + j) * G2;
  const X0 = i - t; const Y0 = j - t;
  const x0 = xin - X0; const y0 = yin - Y0;
  const i1 = x0 > y0 ? 1 : 0;
  const j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + G2; const y1 = y0 - j1 + G2;
  const x2 = x0 - 1.0 + 2.0 * G2; const y2 = y0 - 1.0 + 2.0 * G2;
  const ii = i & 255; const jj = j & 255;
  let n0 = 0, n1 = 0, n2 = 0;
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) { t0 *= t0; const g = GRAD2[PERM_MOD8[ii + PERM[jj]]]; n0 = t0 * t0 * (g[0] * x0 + g[1] * y0); }
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) { t1 *= t1; const g = GRAD2[PERM_MOD8[ii + i1 + PERM[jj + j1]]]; n1 = t1 * t1 * (g[0] * x1 + g[1] * y1); }
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) { t2 *= t2; const g = GRAD2[PERM_MOD8[ii + 1 + PERM[jj + 1]]]; n2 = t2 * t2 * (g[0] * x2 + g[1] * y2); }
  return 70.0 * (n0 + n1 + n2); // Result in [-1, 1]
}

// Multi-octave fractal noise for richer terrain
function fbm2(x: number, y: number, octaves: number = 4): number {
  let val = 0, amp = 1, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    val += simplex2(x * freq, y * freq) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return val / max;
}

// =============================================
// ENEMY REGISTRY
// =============================================
export interface EnemyTypeDef {
  id: string;
  hp: number;
  damage: number;
  speed: number;        // px/frame multiplier
  aggroRange: number;   // px
  deaggroRange: number; // px
  attackPattern: 'charge' | 'slam' | 'spread_shot' | 'fire_trail' | 'teleport' | 'rock_throw';
  attackCooldown: number; // frames
  biomes: number[];       // 0=default, 1=magma, 2=void (-1 = all)
  spawnWeight: number;
  isBoss: boolean;
  spriteKey: string;      // key into enemy texture map
}

export const EnemyRegistry: Record<string, EnemyTypeDef> = {
  scout:   { id: 'scout',   hp: 40,  damage: 3,  speed: 2.5, aggroRange: 400, deaggroRange: 600, attackPattern: 'charge',      attackCooldown: 90,  biomes: [-1],  spawnWeight: 5, isBoss: false, spriteKey: 'goblin' },
  brute:   { id: 'brute',   hp: 120, damage: 8,  speed: 1.2, aggroRange: 300, deaggroRange: 500, attackPattern: 'slam',        attackCooldown: 180, biomes: [-1],  spawnWeight: 3, isBoss: false, spriteKey: 'brute' },
  shaman:  { id: 'shaman',  hp: 60,  damage: 5,  speed: 1.5, aggroRange: 500, deaggroRange: 700, attackPattern: 'spread_shot', attackCooldown: 120, biomes: [-1],  spawnWeight: 2, isBoss: false, spriteKey: 'shaman' },
  magma:   { id: 'magma',   hp: 100, damage: 7,  speed: 2.0, aggroRange: 350, deaggroRange: 600, attackPattern: 'fire_trail',  attackCooldown: 150, biomes: [1],   spawnWeight: 3, isBoss: false, spriteKey: 'magma' },
  wraith:  { id: 'wraith',  hp: 70,  damage: 10, speed: 3.0, aggroRange: 350, deaggroRange: 550, attackPattern: 'teleport',    attackCooldown: 200, biomes: [2],   spawnWeight: 3, isBoss: false, spriteKey: 'wraith' },
  golem:   { id: 'golem',   hp: 300, damage: 15, speed: 0.8, aggroRange: 250, deaggroRange: 500, attackPattern: 'rock_throw',  attackCooldown: 240, biomes: [-1],  spawnWeight: 0.5, isBoss: true, spriteKey: 'golem' },
};

// =============================================
// CHUNK & SPAWN TYPES
// =============================================
const CHUNK_SIZE = 32; // tiles per chunk edge
const TILE_PX = 64;    // pixels per tile
const CHUNK_PX = CHUNK_SIZE * TILE_PX; // 2048px per chunk

interface SpawnPoint {
  wx: number;           // world tile x
  wy: number;           // world tile y
  enemyTypeId: string;
  respawnTimer: number; // frames until next spawn (0 = ready)
  currentMonster: Sprite | null;
  chunkKey: string;
}

interface ChunkData {
  cx: number;           // chunk coordinate
  cy: number;
  container: Container;
  floorCells: Set<string>;
  obstacleCells: Set<string>;
  waterCells: Set<string>;
  spawnPoints: SpawnPoint[];
  props: Container[];
  loaded: boolean;
}


export class GameManager {
  private static activeInstance: GameManager | null = null;
  private destroyed = false;
  private app: Application;
  private worldContainer: Container;
  private player!: Sprite;
  private monsters: Sprite[] = [];
  private bullets: { sprite: Sprite, vx: number, vy: number, isEnemy: boolean, life?: number }[] = [];
  private keys: Record<string, boolean> = {};
  private isMouseDown: boolean = false;
  public isAiming: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private targetMouseX: number = 0;
  private targetMouseY: number = 0;
  private cameraX: number = 0;
  private cameraY: number = 0;
  private currentLookAheadAmount: number = 0;
  private spawnInterval: NodeJS.Timeout | null = null;

  // New Mechanics State
  public inventory: { id: string, count: number, ammo?: number }[] = Array(12).fill(null).map((_, i) => {
    if (i === 0) return { id: 'sword', count: 1 };
    if (i === 1) return { id: 'machine_gun', count: 1, ammo: 50 };
    if (i === 2) return { id: 'shotgun', count: 1, ammo: 9 };
    if (i === 3) return { id: 'gun', count: 1, ammo: 12 };
    return { id: '', count: 0 };
  });
  public activeSlot: number = 0;
  public isInventoryOpen: boolean = false;
  public isSettingsOpen: boolean = false;

  private masterVolume: number = 1.0;
  private bgmVolume: number = 0.1;
  private sfxVolume: number = 0.85;

  private bgmAudio: HTMLAudioElement | null = null;
  private bgmList: string[] = [];

  public isReloading = false;
  private reloadTimer = 0;

  private isDrinking = false;
  private drinkingTimer = 0;
  private drinkingPotionSprite: Sprite | null = null;

  private droppedItems: { sprite: Sprite, id: string, count: number }[] = [];
  private potionTexture!: Texture;

  // Animations
  private slimeTextures: Record<string, Texture[]> = {};
  private goblinTextures: Record<string, Texture[]> = {};
  private goblinBlueTextures: Record<string, Texture[]> = {};

  // Player State
  private playerHP = 10;
  private lastHP = 10;
  private isInvulnerable = false;
  private invulnerableTimer = 0;

  private currentAnim = 'idle';
  private animTimer = 0;
  private lastShootTime = 0;

  private gunSprite!: Sprite;
  private weaponTextures: Record<string, any> = {};
  private mapTextures: Record<string, any> = {};
  private gunRecoil = 0;
  private handPotionSprite!: Sprite;

  // Stamina System
  public maxStamina = 400;
  public stamina = 400;
  public isSprinting = false;
  public isRolling = false;
  private rollDirection = { x: 0, y: 0 };
  private rollTimer = 0;
  private rollCooldownTimer = 0;
  private stepTimer = 0;
  private playerVx = 0;
  private playerVy = 0;
  private staminaGroup!: Container;
  private staminaBarFill!: Graphics;

  public gameState: 'playing' | 'merchant' = 'playing';
  private enemiesAlive: number = 0;
  private merchantTimer: number = 0;
  // Progression & Economy
  public playerExp: number = 0;
  public playerMaxExp: number = 10;
  public playerLevel: number = 1;
  public coins: number = 0;
  public playerDmg: number = 30;
  public playerMaxHP: number = 10;

  private merchantSprite: Sprite | null = null;
  private portalSprite: Sprite | null = null;
  private coinDrops: { sprite: Sprite, life: number }[] = [];

  private coinTexture!: Texture;
  private merchantTexture!: Texture;

  private corpses: Sprite[] = [];
  private damagePopups: { sprite: Text, life: number }[] = [];
  private lastHover: string | null = null;

  // Open-World Grid & Chunks
  private floorCells = new Set<string>();
  private obstacleCells = new Set<string>();
  private waterCells = new Set<string>();
  private propTypes = new Map<string, string>();
  
  private chunkQueue: {cx: number, cy: number}[] = [];
  private exploredCells: Set<string> = new Set();
  private destructibles: { sprite: Sprite, x: number, y: number, hp: number, shadow?: Graphics }[] = [];
  private chunks = new Map<string, ChunkData>();
  private spawnPoints: SpawnPoint[] = [];
  private openWorldKills = 0;
  private portalSpawned = false;
  private fireTrails: { sprite: Sprite, life: number }[] = [];
  private telegraphs: { sprite: Graphics, life: number, x: number, y: number, radius: number, owner: Sprite | null }[] = [];
  private ambientParticles: { sprite: Graphics, vx: number, vy: number, life: number, maxLife: number, rotSpeed: number }[] = [];
  private frameCount = 0;

  // New enemy texture maps
  private bruteTextures: Record<string, Texture[]> = {};
  private shamanTextures: Record<string, Texture[]> = {};
  private magmaTextures: Record<string, Texture[]> = {};
  private wraithTextures: Record<string, Texture[]> = {};
  private golemTextures: Record<string, Texture[]> = {};

  public currentDungeonWorld = 1;
  private currentDungeonStage = 1;

  // Artifact Quest System
  public artifactsCollected: number = 0;
  public totalArtifactsNeeded: number = 3;
  private artifactLocations: {cx: number, cy: number, collected: boolean, sprite: Sprite | null, type: string}[] = [];
  private compassSprite!: Sprite;
  private sonarTimer = 0;

  private playerShadow!: Graphics;
  private minimapGraphics!: Graphics;
  private minimapContainer!: Container;
  private particles: { sprite: Sprite, vx: number, vy: number, life: number, maxLife: number }[] = [];
  private crosshair!: Graphics;

  private vignette!: Sprite;
  private ambientContainer!: Container;

  private spawnParticles(x: number, y: number, color: number, count: number, isDash: boolean = false) {
    for (let i = 0; i < count; i++) {
      const radius = isDash ? 3 : 2 + Math.random() * 3;
      const p = new Graphics().circle(0, 0, radius).fill(color);
      p.x = x; p.y = y; p.zIndex = y + 10;
      this.worldContainer.addChild(p);
      const angle = Math.random() * Math.PI * 2;
      const speed = isDash ? Math.random() * 2 : Math.random() * 8 + 2;
      const life = isDash ? 10 + Math.random()*10 : 20 + Math.random()*20;
      this.particles.push({ sprite: p as any, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: life, maxLife: life });
    }
  }

  // Native HTML5 Audio pool
  private audioPool: Record<string, HTMLAudioElement[]> = {};

  private preloadAudio() {
    const files = ['shoot', 'hit', 'pickup', 'drink', 'death', 'kill', 'spawn', 'open_inventory', 'close_inventory', 'reload', 'level_up', 'knife_swing', 'sword_swing', 'mg_shoot', 'shotgun_blast', 'empty_click', 'room_clear', 'brute_slam', 'shaman_cast', 'elemental_explode', 'wraith_teleport', 'golem_stomp', 'artifact_ping', 'artifact_pickup', 'shrine_awaken', 'portal_boss_spawn', 'walk', 'sprint', 'roll'];
    files.forEach(f => {
      this.audioPool[f] = Array(5).fill(null).map(() => {
        const a = new Audio(`/assets/audio/${f}.wav`);
        a.volume = this.masterVolume * this.sfxVolume;
        return a;
      });
    });
  }

  private playSound(type: string) {
    if (!this.audioPool[type]) return;
    const pool = this.audioPool[type];
    for (const audio of pool) {
      if (audio.paused || audio.currentTime === 0 || audio.ended) {
        audio.currentTime = 0;
        audio.play().catch(() => { });
        return;
      }
    }
    // If all are busy, force play the first one
    pool[0].currentTime = 0;
    pool[0].play().catch(() => { });
  }

  // Custom Events Dispatcher Helper
  // CRITICAL: Deep-clone every slot so React sees new object references
  private dispatchState() {
    const clonedInv = this.inventory.map(s => ({ id: s.id, count: s.count }));
    window.dispatchEvent(new CustomEvent('inventory-change', {
      detail: {
        inventory: clonedInv,
        activeSlot: this.activeSlot,
        isInventoryOpen: this.isInventoryOpen,
        drinkingProgress: this.isDrinking ? (1 - this.drinkingTimer / 30) : null
      }
    }));
    const activeInv = this.inventory[this.activeSlot];
    const stats = WeaponRegistry[activeInv.id];
    window.dispatchEvent(new CustomEvent('ammo-change', {
      detail: { ammo: activeInv.ammo || 0, maxAmmo: stats?.maxAmmo || 0, isReloading: this.isReloading }
    }));
    window.dispatchEvent(new CustomEvent('wave-change', {
      detail: { gameState: this.gameState, merchantTimer: this.merchantTimer, world: this.currentDungeonWorld, stage: this.currentDungeonStage }
    }));
    window.dispatchEvent(new CustomEvent('exp-change', {
      detail: { exp: this.playerExp, maxExp: this.playerMaxExp, level: this.playerLevel, maxHP: this.playerMaxHP }
    }));
    window.dispatchEvent(new CustomEvent('coin-change', {
      detail: { coins: this.coins }
    }));
  }

  constructor() {
    this.app = new Application();
    this.worldContainer = new Container();
    this.worldContainer.sortableChildren = true;
  }

  public async init(container: HTMLElement) {
    // Kill any previous instance to prevent StrictMode double-mount flickering
    if (GameManager.activeInstance && GameManager.activeInstance !== this) {
      GameManager.activeInstance.destroy();
    }
    GameManager.activeInstance = this;

    // 1. Initialize PixiJS
    await this.app.init({
      resizeTo: container,
      backgroundColor: 0x111118,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // If destroyed while awaiting init, abort
    if (this.destroyed) return;

    container.appendChild(this.app.canvas);

    // 2. Load Assets
    this.preloadAudio();
    await this.loadAssets();

    this.app.stage.addChild(this.worldContainer);
    this.setupPlayer();
    this.setupInput();
    this.fetchBGM();

    this.dispatchState(); // Initial state dispatch
    this.playSound('spawn');
    window.dispatchEvent(new CustomEvent('assets-loaded'));

    this.app.ticker.add((ticker) => {
      this.update(ticker.deltaTime);
    });
  }

  private async fetchBGM() {
    try {
      const res = await fetch('/api/bgm');
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        this.bgmList = data.files;
        this.playNextBGM();
      }
    } catch (e) { console.error("Failed to fetch BGM:", e); }
  }

  private playNextBGM() {
    if (this.bgmList.length === 0) return;
    const file = this.bgmList[Math.floor(Math.random() * this.bgmList.length)];
    if (this.bgmAudio) {
       this.bgmAudio.pause();
       this.bgmAudio = null;
    }
    this.bgmAudio = new Audio(`/assets/bgm/${file}`);
    this.bgmAudio.volume = this.bgmVolume * this.masterVolume;
    this.bgmAudio.loop = false;
    this.bgmAudio.addEventListener('ended', () => this.playNextBGM());
    // Auto play might be blocked if user hasn't clicked yet, handle it via a user-gesture resolver later
    this.bgmAudio.play().catch(e => console.log("BGM Autoplay prevented until interaction"));
  }

  private applyVolumes() {
    const finalSfx = this.masterVolume * this.sfxVolume;
    for (const key in this.audioPool) {
      this.audioPool[key].forEach(a => a.volume = finalSfx);
    }
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.masterVolume * this.bgmVolume;
    }
  }

  private handleVolumeChange = (e: any) => {
    this.masterVolume = e.detail.master;
    this.bgmVolume = e.detail.bgm;
    this.sfxVolume = e.detail.sfx;
    this.applyVolumes();
    
    // Auto-start BGM if it was blocked by browser and user interacts with volume
    if (this.bgmAudio && this.bgmAudio.paused) {
       this.bgmAudio.play().catch(()=>{});
    }
  };

  private handleSettingsToggle = () => {
    this.isSettingsOpen = !this.isSettingsOpen;
    if (this.isSettingsOpen) this.playSound('open_inventory');
    else this.playSound('close_inventory');
    this.dispatchState();
  };

  private async loadAssets() {
    const tIdle1 = await Assets.load('/assets/character/slime_idle1.svg');
    const tIdle2 = await Assets.load('/assets/character/slime_idle2.svg');
    const tWalk1 = await Assets.load('/assets/character/slime_walk1.svg');
    const tWalk2 = await Assets.load('/assets/character/slime_walk2.svg');
    const tWalk3 = await Assets.load('/assets/character/slime_walk3.svg');
    const tWalk4 = await Assets.load('/assets/character/slime_walk4.svg');
    const tHit = await Assets.load('/assets/character/slime_hit.svg');
    const tAttack = await Assets.load('/assets/character/slime_attack.svg');
    const tRoll1 = await Assets.load('/assets/character/slime_roll1.svg');
    const tRoll2 = await Assets.load('/assets/character/slime_roll2.svg');
    const tRoll3 = await Assets.load('/assets/character/slime_roll3.svg');
    const tRoll4 = await Assets.load('/assets/character/slime_roll4.svg');
    const tRoll5 = await Assets.load('/assets/character/slime_roll5.svg');
    const tRoll6 = await Assets.load('/assets/character/slime_roll6.svg');
    const tRoll7 = await Assets.load('/assets/character/slime_roll7.svg');

    [tIdle1, tIdle2, tWalk1, tWalk2, tWalk3, tWalk4, tHit, tAttack, tRoll1, tRoll2, tRoll3, tRoll4, tRoll5, tRoll6, tRoll7].forEach(t => t.source.scaleMode = 'nearest');

    this.slimeTextures = {
      idle: [tIdle1, tIdle2],
      walk: [tWalk1, tWalk2, tWalk3, tWalk4],
      hit: [tHit],
      attack: [tAttack],
      roll: [tRoll1, tRoll3, tRoll4, tRoll5, tRoll7], // Reduced to 5 frames for punchier animation
    };

    // Load weapons and items
    this.weaponTextures = {
      gun: await Assets.load('/assets/character/gun1.svg'),
      sword: await Assets.load('/assets/character/sword.svg'),
      machine_gun: await Assets.load('/assets/character/machine_gun.svg'),
      shotgun: await Assets.load('/assets/character/shotgun.svg'),
      bullet: await Assets.load('/assets/character/bullet.svg'),
      knife_swing: await Assets.load('/assets/character/knife_swing.svg'),
      mg_bullet: await Assets.load('/assets/character/mg_bullet.svg'),
      shotgun_pellet: await Assets.load('/assets/character/shotgun_pellet.svg')
    };
    this.potionTexture = await Assets.load('/assets/items/potion.svg');
    this.coinTexture = await Assets.load('/assets/items/coin.svg');
    this.merchantTexture = await Assets.load('/assets/character/merchant.svg');

    const loadTex = async (p: string) => await Assets.load(p);
    
    // Load biome-specific map textures
    this.mapTextures = {
      floor: [await loadTex('/assets/map/floor.svg'), await loadTex('/assets/map/floor_magma.svg'), await loadTex('/assets/map/floor_void.svg')],
      customFloor: [await loadTex('/assets/custom/floor1.svg'), await loadTex('/assets/custom/floor2.svg'), await loadTex('/assets/custom/floor3.svg'), await loadTex('/assets/custom/floor4.svg')],
      wall_h: [await loadTex('/assets/map/wall_h.svg'), await loadTex('/assets/map/wall_h_magma.svg'), await loadTex('/assets/map/wall_h_void.svg')],
      wall_v: [await loadTex('/assets/map/wall_v.svg'), await loadTex('/assets/map/wall_v_magma.svg'), await loadTex('/assets/map/wall_v_void.svg')],
      rock: [await loadTex('/assets/map/rock.svg'), await loadTex('/assets/map/rock_magma.svg'), await loadTex('/assets/map/rock_void.svg')],
      fence: await loadTex('/assets/map/fence.svg'),
      portal: await loadTex('/assets/map/portal.svg'),
      crate: await loadTex('/assets/map/crate.svg'),
      bones: await loadTex('/assets/map/bones.svg'),
      web: await loadTex('/assets/map/web.svg'),
      tree1: await loadTex('/assets/map/tree1.svg'),
      tree2: await loadTex('/assets/map/tree2.svg'),
      water: await loadTex('/assets/map/water.svg'),
      lava: await loadTex('/assets/map/lava.svg'),
      fire_trail: await loadTex('/assets/map/fire_trail.svg'),
      telegraph: await loadTex('/assets/map/telegraph.svg'),
      relic_plains: await loadTex('/assets/map/relic_plains.svg'),
      relic_magma: await loadTex('/assets/map/relic_magma.svg'),
      relic_void: await loadTex('/assets/map/relic_void.svg'),
      shrine_floor: await loadTex('/assets/map/shrine_floor.svg'),
      shrine_pillar: await loadTex('/assets/map/shrine_pillar.svg'),
      merchant_tent: await loadTex('/assets/map/merchant_tent.svg'),
      compass_arrow: await loadTex('/assets/map/compass_arrow.svg')
    };

    [this.potionTexture, this.coinTexture, this.merchantTexture, 
     ...this.mapTextures.floor, ...this.mapTextures.customFloor, ...this.mapTextures.wall_h, ...this.mapTextures.wall_v, ...this.mapTextures.rock, 
     this.mapTextures.fence, this.mapTextures.portal, this.mapTextures.crate, this.mapTextures.bones, this.mapTextures.web,
     this.mapTextures.tree1, this.mapTextures.tree2, this.mapTextures.water, this.mapTextures.lava, this.mapTextures.fire_trail, this.mapTextures.telegraph,
     this.mapTextures.relic_plains, this.mapTextures.relic_magma, this.mapTextures.relic_void,
     this.mapTextures.shrine_floor, this.mapTextures.shrine_pillar, this.mapTextures.merchant_tent, this.mapTextures.compass_arrow
    ].forEach(t => t.source.scaleMode = 'nearest');

    const gIdle = await Assets.load('/assets/enemies/goblin_idle.svg');

    this.goblinTextures = {
      idle: [gIdle],
      run: [
        await Assets.load('/assets/enemies/goblin_run1.svg'),
        await Assets.load('/assets/enemies/goblin_run2.svg'),
        await Assets.load('/assets/enemies/goblin_run3.svg'),
        await Assets.load('/assets/enemies/goblin_run4.svg')
      ],
      dead1: [await Assets.load('/assets/enemies/goblin_dead1.svg')],
      dead2: [await Assets.load('/assets/enemies/goblin_dead2.svg')],
      dead3: [await Assets.load('/assets/enemies/goblin_dead3.svg')],
    };
    this.goblinBlueTextures = {
      run: [
        await Assets.load('/assets/enemies/goblin_blue_run1.svg'),
        await Assets.load('/assets/enemies/goblin_blue_run2.svg'),
        await Assets.load('/assets/enemies/goblin_blue_run3.svg'),
        await Assets.load('/assets/enemies/goblin_blue_run4.svg')
      ],
      dead1: [await Assets.load('/assets/enemies/goblin_blue_dead1.svg')],
      dead2: [await Assets.load('/assets/enemies/goblin_blue_dead2.svg')],
      dead3: [await Assets.load('/assets/enemies/goblin_blue_dead3.svg')],
    };

    this.weaponTextures.ebullet = await Assets.load('/assets/character/ebullet.svg');
    this.weaponTextures.ebullet.source.scaleMode = 'nearest';
    Object.values(this.weaponTextures).forEach((t: any) => { if (t?.source) t.source.scaleMode = 'nearest'; });

    // Apply nearest-neighbor scaling to all enemy textures
    const applyNearest = (texMap: Record<string, Texture[]>) => {
      Object.values(texMap).forEach(arr => arr.forEach((t: any) => { if (t?.source) t.source.scaleMode = 'nearest'; }));
    };

    this.goblinTextures.idle.forEach((t: any) => t.source.scaleMode = 'nearest');
    this.goblinTextures.run.forEach((t: any) => t.source.scaleMode = 'nearest');
    this.goblinBlueTextures.run.forEach((t: any) => t.source.scaleMode = 'nearest');
    this.goblinTextures.dead1[0].source.scaleMode = 'nearest';
    this.goblinTextures.dead2[0].source.scaleMode = 'nearest';
    this.goblinTextures.dead3[0].source.scaleMode = 'nearest';
    this.goblinBlueTextures.dead1[0].source.scaleMode = 'nearest';
    this.goblinBlueTextures.dead2[0].source.scaleMode = 'nearest';
    this.goblinBlueTextures.dead3[0].source.scaleMode = 'nearest';

    // Load new open-world enemy textures
    const loadEnemySet = async (prefix: string) => ({
      idle: [await Assets.load(`/assets/enemies/${prefix}_idle.svg`)],
      run: [
        await Assets.load(`/assets/enemies/${prefix}_run1.svg`),
        await Assets.load(`/assets/enemies/${prefix}_run2.svg`),
        await Assets.load(`/assets/enemies/${prefix}_run3.svg`),
        await Assets.load(`/assets/enemies/${prefix}_run4.svg`)
      ],
      dead1: [await Assets.load(`/assets/enemies/${prefix}_dead1.svg`)],
      dead2: [await Assets.load(`/assets/enemies/${prefix}_dead2.svg`)],
      dead3: [await Assets.load(`/assets/enemies/${prefix}_dead3.svg`)],
    });

    this.bruteTextures = await loadEnemySet('brute');
    this.shamanTextures = await loadEnemySet('shaman');
    this.golemTextures = await loadEnemySet('golem');

    // Magma and wraith don't have idle frames, use run[0]
    this.magmaTextures = {
      idle: [await Assets.load('/assets/enemies/magma_run1.svg')],
      run: [
        await Assets.load('/assets/enemies/magma_run1.svg'),
        await Assets.load('/assets/enemies/magma_run2.svg'),
        await Assets.load('/assets/enemies/magma_run3.svg'),
        await Assets.load('/assets/enemies/magma_run4.svg')
      ],
      dead1: [await Assets.load('/assets/enemies/magma_dead1.svg')],
      dead2: [await Assets.load('/assets/enemies/magma_dead2.svg')],
      dead3: [await Assets.load('/assets/enemies/magma_dead3.svg')],
    };
    this.wraithTextures = {
      idle: [await Assets.load('/assets/enemies/wraith_run1.svg')],
      run: [
        await Assets.load('/assets/enemies/wraith_run1.svg'),
        await Assets.load('/assets/enemies/wraith_run2.svg'),
        await Assets.load('/assets/enemies/wraith_run3.svg'),
        await Assets.load('/assets/enemies/wraith_run4.svg')
      ],
      dead1: [await Assets.load('/assets/enemies/wraith_dead1.svg')],
      dead2: [await Assets.load('/assets/enemies/wraith_dead2.svg')],
      dead3: [await Assets.load('/assets/enemies/wraith_dead3.svg')],
    };

    applyNearest(this.bruteTextures);
    applyNearest(this.shamanTextures);
    applyNearest(this.magmaTextures);
    applyNearest(this.wraithTextures);
    applyNearest(this.golemTextures);
  }

  private setupPlayer() {
    this.initOpenWorld();

    this.player = new Sprite(this.slimeTextures.idle[0]);
    this.player.anchor.set(0.5, 0.875);
    this.player.scale.set(4); // Scale up pixel art (16x16 -> 64x64)
    this.player.x = 0;
    this.player.y = 0;
    this.cameraX = 0;
    this.cameraY = 0;

    // Create isolated shadow on ground
    this.playerShadow = new Graphics().ellipse(0, 0, 8, 3).fill({ color: 0x000000, alpha: 0.5 });
    this.playerShadow.zIndex = -99999;
    this.worldContainer.addChild(this.playerShadow);

    this.worldContainer.addChild(this.player);

    this.staminaGroup = new Container();
    this.staminaGroup.zIndex = 999999;
    // Floating Circle Arc Stamina Bar
    const sBg = new Graphics().circle(0, 0, 10).stroke({ width: 8, color: 0x333333 });
    this.staminaBarFill = new Graphics();
    this.staminaGroup.addChild(sBg);
    this.staminaGroup.addChild(this.staminaBarFill);
    this.worldContainer.addChild(this.staminaGroup);
    
    this.staminaGroup.x = this.player.x - 40;
    this.staminaGroup.y = this.player.y - 70;

    // Setup Gun
    this.gunSprite = new Sprite(this.weaponTextures[WeaponRegistry[this.inventory[this.activeSlot].id]?.spriteName || 'gun']);
    this.gunSprite.anchor.set(0.25, 0.5); // anchor roughly at the handle
    this.gunSprite.scale.set(3);
    this.worldContainer.addChild(this.gunSprite);

    // Setup held potion
    this.handPotionSprite = new Sprite(this.potionTexture);
    this.handPotionSprite.anchor.set(0.5, 0.5);
    this.handPotionSprite.scale.set(3);
    this.handPotionSprite.visible = false;
    this.worldContainer.addChild(this.handPotionSprite);

    // Setup Minimap
    this.minimapContainer = new Container();
    this.minimapContainer.zIndex = 1000000;
    this.minimapGraphics = new Graphics();
    this.minimapContainer.addChild(this.minimapGraphics);
    
    // Position minimap in top right with padding
    const padding = 20;
    const minimapSize = 200;
    this.minimapContainer.x = this.app.screen.width - minimapSize - padding;
    this.minimapContainer.y = padding;
    
    // We don't add to worldContainer because we want it fixed to screen
    // We'll add it to the stage or a UI container if available
    this.app.stage.addChild(this.minimapContainer);

    // Setup Crosshair
    this.crosshair = new Graphics();
    this.crosshair.circle(0, 0, 6).stroke({ width: 2, color: 0xff0000, alpha: 0.8 });
    this.crosshair.moveTo(-10, 0).lineTo(10, 0).stroke({ width: 2, color: 0xff0000, alpha: 0.8 });
    this.crosshair.moveTo(0, -10).lineTo(0, 10).stroke({ width: 2, color: 0xff0000, alpha: 0.8 });
    this.crosshair.zIndex = 9999999;
    this.app.stage.addChild(this.crosshair);
    this.app.canvas.style.cursor = 'none';

    // Setup Vignette
    const q = 256;
    const canvas = document.createElement('canvas');
    canvas.width = q; canvas.height = q;
    const ctx = canvas.getContext('2d')!;
    const grd = ctx.createRadialGradient(q/2, q/2, 0, q/2, q/2, q/2);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(0.5, 'rgba(0,0,0,0.2)');
    grd.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, q, q);
    
    this.vignette = new Sprite(Texture.from(canvas));
    this.vignette.width = this.app.screen.width;
    this.vignette.height = this.app.screen.height;
    this.vignette.zIndex = 5000000;
    this.vignette.alpha = 0;
    this.app.stage.addChild(this.vignette);

    // Ambient Container (In world space, above ground but below UI)
    this.ambientContainer = new Container();
    this.ambientContainer.zIndex = 50000;
    this.worldContainer.addChild(this.ambientContainer);
  }

  private generateWaveMap() {
    const radius = 1000;
    const bId = (this.currentDungeonWorld - 1) % 3;

    const TILE_SIZE = 64;
    const padding = Math.ceil(radius / TILE_SIZE) + 1;
    
    const floorContainer = new Container();
    floorContainer.zIndex = -100000;
    
    for (let x = -padding; x <= padding; x++) {
      for (let y = -padding; y <= padding; y++) {
         const r = Math.random();
         let tex;
         if (r < 0.65) tex = this.mapTextures.customFloor[0];
         else if (r < 0.85) tex = this.mapTextures.customFloor[1];
         else if (r < 0.93) tex = this.mapTextures.customFloor[2];
         else tex = this.mapTextures.customFloor[3];
         const sprite = new Sprite(tex);
         sprite.anchor.set(0.5);
         // 64x64 guarantees visual density matches everything else perfectly.
         sprite.width = 64;
         sprite.height = 64;
         sprite.x = x * TILE_SIZE;
         sprite.y = y * TILE_SIZE;
         floorContainer.addChild(sprite);
      }
    }

    // Circular Mask
    const mask = new Graphics().circle(0, 0, radius).fill(0xffffff);
    this.worldContainer.addChild(mask);
    floorContainer.mask = mask;

    this.worldContainer.addChild(floorContainer);

    // Perimeter walls radially
    const circumference = 2 * Math.PI * radius;
    const numWalls = Math.floor(circumference / 64);
    for (let i = 0; i < numWalls; i++) {
      const theta = (i / numWalls) * Math.PI * 2;
      const w = new Sprite(this.mapTextures.wall_h[bId]); // Changed to use biome-specific wall
      w.scale.set(4); w.anchor.set(0.5);
      w.position.set(Math.cos(theta) * radius, Math.sin(theta) * radius);
      this.worldContainer.addChild(w);
    }
  }

  private updateAmbiance(dt: number) {
     
     
     // Spawn ambient particles randomly around player
     if (Math.random() < 0.25) {
        const p = new Graphics();
        // Vary color based on biome: 0=plains(pollen), 1=magma(embers), 2=void(dust)
        const biome = this.getBiomeAt(this.player.x, this.player.y);
        const color = biome === 0 ? 0xd0f0c0 : biome === 1 ? 0xffaa00 : 0xaa88ff;
        
        p.circle(0, 0, 1.5 + Math.random() * 2).fill({color, alpha: 0.5});
        // Spawn far off-screen so they drift in naturally
        p.x = this.player.x + (Math.random() - 0.5) * 2500;
        p.y = this.player.y + (Math.random() - 0.5) * 2000;
        p.zIndex = 999999; // Float above everything
        
        // Wind drift
        const vx = 15 + Math.random() * 25; // Drift right
        const vy = -10 + (Math.random() - 0.5) * 15; // Drift slightly up
        
        this.worldContainer.addChild(p);
        this.ambientParticles.push({
           sprite: p, vx, vy, life: 800, maxLife: 800, rotSpeed: (Math.random() - 0.5) * 0.1
        });
     }

     for (let i = this.ambientParticles.length - 1; i >= 0; i--) {
        const p = this.ambientParticles[i];
        p.life -= dt;
        p.sprite.x += p.vx * dt;
        p.sprite.y += (p.vy + Math.sin(p.life / 20) * 10) * dt; // Sine wave bobbing
        p.sprite.alpha = (p.life / p.maxLife) * 0.5;
        p.sprite.rotation += p.rotSpeed * dt;
        if (p.life <= 0) {
           this.worldContainer.removeChild(p.sprite);
           p.sprite.destroy();
           this.ambientParticles.splice(i, 1);
        }
     }
  }

  private initOpenWorld() {
    this.floorCells.clear();
    this.obstacleCells.clear();
    this.waterCells.clear();
    this.propTypes.clear();
    this.exploredCells.clear();
    this.destructibles = [];
    this.chunks.clear();
    this.spawnPoints = [];
    this.openWorldKills = 0;
    this.portalSpawned = false;

    // Artifact Quest Setup
    this.artifactsCollected = 0;
    this.totalArtifactsNeeded = 2 + this.currentDungeonWorld; // Scale with world
    this.artifactLocations = [];
    
    // Pick random distant chunks for artifacts
    for (let i = 0; i < this.totalArtifactsNeeded; i++) {
       const angle = (i / this.totalArtifactsNeeded) * Math.PI * 2 + Math.random() * 0.5;
       const distance = 8 + Math.random() * 5 + this.currentDungeonWorld * 2; // 8-15 chunks away initially
       const acx = Math.floor(Math.cos(angle) * distance);
       const acy = Math.floor(Math.sin(angle) * distance);
       const biomeType = (this.currentDungeonWorld - 1) % 3;
       let type = 'relic_plains';
       if (biomeType === 1) type = 'relic_magma';
       if (biomeType === 2) type = 'relic_void';

       this.artifactLocations.push({ cx: acx, cy: acy, collected: false, sprite: null, type });
    }

    if (this.compassSprite) {
       this.compassSprite.destroy();
    }
    this.compassSprite = new Sprite(this.mapTextures.compass_arrow);
    this.compassSprite.anchor.set(0.5, 0.5);
    this.compassSprite.scale.set(3);
    this.compassSprite.zIndex = 999999;
    this.compassSprite.alpha = 0; // Hide until player moves
    this.worldContainer.addChild(this.compassSprite);

    // Generate initial chunks around spawn (3x3 grid)
    for (let cx = -1; cx <= 1; cx++) {
      for (let cy = -1; cy <= 1; cy++) {
        this.generateChunk(cx, cy);
      }
    }
  }

  private getBiomeAt(wx: number, wy: number): number {
    // Biome is determined by current world level (0=Plains, 1=Magma, 2=Void)
    return 0; // Forced to plains biome as requested
  }

  private generateChunk(cx: number, cy: number) {
    const key = `${cx},${cy}`;
    if (this.chunks.has(key)) return;

    const container = new Container();
    container.zIndex = -100000;
    const chunk: ChunkData = {
      cx, cy, container,
      floorCells: new Set(),
      obstacleCells: new Set(),
      waterCells: new Set(),
      spawnPoints: [],
      props: [],
      loaded: true
    };

    const noiseScale = 0.06;  // Controls terrain feature size
    const treeScale = 0.12;
    const waterScale = 0.04;

    // Check if this chunk contains an artifact
    const artifactData = this.artifactLocations.find(a => a.cx === cx && a.cy === cy);

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wy = cy * CHUNK_SIZE + ly;
        const cellKey = `${wx},${wy}`;

        const biome = this.getBiomeAt(wx, wy);

        // Shrine Generation
        if (artifactData && !artifactData.collected) {
           const isCenter = lx >= 14 && lx <= 18 && ly >= 14 && ly <= 18;
           if (isCenter) {
              this.obstacleCells.add(cellKey);
              chunk.obstacleCells.add(cellKey);
              const isPillar = (lx === 14 && ly === 14) || (lx === 18 && ly === 14) || (lx === 14 && ly === 18) || (lx === 18 && ly === 18);
              
              const shrineSprite = new Sprite(isPillar ? this.mapTextures.shrine_pillar : this.mapTextures.shrine_floor);
              shrineSprite.anchor.set(0.5);
              shrineSprite.width = TILE_PX; shrineSprite.height = TILE_PX;
              shrineSprite.x = wx * TILE_PX + TILE_PX / 2; shrineSprite.y = wy * TILE_PX + TILE_PX / 2;
              shrineSprite.zIndex = isPillar ? wy * TILE_PX + TILE_PX / 2 : -50;
              container.addChild(shrineSprite);

              if (lx === 16 && ly === 16) {
                 // Spawn Artifact
                 const artifactSprite = new Sprite(this.mapTextures[artifactData.type]);
                 artifactSprite.anchor.set(0.5);
                 artifactSprite.scale.set(4);
                 artifactSprite.x = wx * TILE_PX + TILE_PX / 2;
                 artifactSprite.y = wy * TILE_PX + TILE_PX / 2;
                 artifactSprite.zIndex = wy * TILE_PX + TILE_PX / 2 + 1;
                 container.addChild(artifactSprite);
                 artifactData.sprite = artifactSprite;

                 // Spawn Shrine Guardians
                 const gTypes = ['shaman', 'brute', 'magma', 'wraith'];
                 const gType = gTypes[biome] || 'brute';
                 
                 const spawns = [ {x: wx-2, y: wy}, {x: wx+2, y: wy}, {x: wx, y: wy-2}, {x: wx, y: wy+2} ];
                 for (const s of spawns) {
                     const sp: SpawnPoint = {
                        wx: s.x, wy: s.y,
                        enemyTypeId: gType,
                        respawnTimer: 0,
                        currentMonster: null,
                        chunkKey: key
                     };
                     chunk.spawnPoints.push(sp);
                     this.spawnPoints.push(sp);
                     // Spawn them immediately as "sleeping" guardians
                     this.spawnOpenWorldEnemy(sp);
                     if (sp.currentMonster) {
                         (sp.currentMonster as any).aiState = 'sleeping';
                         (sp.currentMonster as any).stateTimer = 99999;
                         sp.currentMonster.tint = 0x888888; // Stone-like color
                     }
                 }
              }
              continue;
           }
        }

        // Walkable floor
        this.floorCells.add(cellKey);
        chunk.floorCells.add(cellKey);

        // Smooth noise for base color blending
        const colorNoise = (fbm2(wx * 0.15, wy * 0.15, 2) + 1) / 2; // 0 to 1
        
        let c1, c2, bladeColor;
        if (biome === 0) { c1 = {r:58,g:112,b:48}; c2 = {r:45,g:85,b:32}; bladeColor = 0x5a9848; } // Plains
        else if (biome === 1) { c1 = {r:58,g:37,b:37}; c2 = {r:48,g:26,b:26}; bladeColor = 0x5a3535; } // Magma
        else { c1 = {r:26,g:26,b:48}; c2 = {r:34,g:34,b:66}; bladeColor = 0x353560; } // Void

        // Lerp color
        const r = Math.floor(c1.r + (c2.r - c1.r) * colorNoise);
        const g = Math.floor(c1.g + (c2.g - c1.g) * colorNoise);
        const b = Math.floor(c1.b + (c2.b - c1.b) * colorNoise);
        const baseColor = (r << 16) | (g << 8) | b;

        if (!(chunk as any).floorGfx) {
           (chunk as any).floorGfx = new Graphics();
           (chunk as any).floorGfx.zIndex = -100001;
           container.addChild((chunk as any).floorGfx);
           
           // Draw chunk base background once per chunk to prevent black flashes
           const chunkBaseColor = biome === 0 ? 0x2f6028 : biome === 1 ? 0x301a1a : 0x181830;
           (chunk as any).floorGfx.rect(cx * CHUNK_PX, cy * CHUNK_PX, CHUNK_PX, CHUNK_PX).fill(chunkBaseColor);
        }
        
        // Organic grass patches: using lower alpha and bigger spread for a seamless blend
        (chunk as any).floorGfx.circle(wx * TILE_PX + 32, wy * TILE_PX + 32, 50 + Math.random() * 30).fill({color: baseColor, alpha: 0.15});

        // Organic grass tufts
        const tuftNoise = fbm2(wx * 0.3 + 50, wy * 0.3 + 50, 2);
        if (tuftNoise > 0.2) {
           const numBlades = 1 + Math.floor(tuftNoise * 3);
           const centerX = wx * TILE_PX + TILE_PX/2 + (Math.random()-0.5)*20;
           const centerY = wy * TILE_PX + TILE_PX/2 + (Math.random()-0.5)*20;
           for(let i=0; i<numBlades; i++) {
              const bx = centerX + (Math.random()-0.5)*12;
              const by = centerY + (Math.random()-0.5)*12;
              const h = 4 + Math.random() * 6;
              (chunk as any).floorGfx.moveTo(bx, by).lineTo(bx + (Math.random()-0.5)*6, by - h).stroke({width: 2, color: bladeColor, cap: 'round'});
           }
        }
      }
    }

    // ============================================================
    // NEW PROP SYSTEM: Noise-Driven Natural Clustering
    // ============================================================

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wy = cy * CHUNK_SIZE + ly;
        const cellKey = `${wx},${wy}`;
        const biome = this.getBiomeAt(wx, wy);

        // Skip shrine area
        if (artifactData && !artifactData.collected) {
          if (lx >= 13 && lx <= 19 && ly >= 13 && ly <= 19) continue;
        }

        const terrainNoise = fbm2(wx * noiseScale, wy * noiseScale, 4);
        const treeNoise = fbm2(wx * treeScale + 100, wy * treeScale + 100, 3);
        const waterNoise = fbm2(wx * waterScale + 500, wy * waterScale + 500, 3);

        const pixX = wx * TILE_PX + TILE_PX / 2;
        const pixY = wy * TILE_PX + TILE_PX / 2;

        // Combine all shadows into a single Graphics object for massive performance boost
        if (!(chunk as any).shadowGfx) {
           (chunk as any).shadowGfx = new Graphics();
           (chunk as any).shadowGfx.zIndex = -99999;
           container.addChild((chunk as any).shadowGfx);
        }

        // --- ROCK FORMATIONS: Dense ridges and mountain walls ---
        if (terrainNoise > 0.40 && Math.random() > 0.3) {
          this.obstacleCells.add(cellKey);
          chunk.obstacleCells.add(cellKey);
          this.propTypes.set(cellKey, 'rock');

          const offsetX = (Math.random() - 0.5) * 24;
          const offsetY = (Math.random() - 0.5) * 24;

          // Drop shadow (wide ellipse, grounded at sprite base)
          (chunk as any).shadowGfx.ellipse(pixX + offsetX, pixY + offsetY, 28, 10).fill({ color: 0x000000, alpha: 0.35 });

          const rock = new Sprite(this.mapTextures.rock[biome]);
          rock.anchor.set(0.5, 0.625);
          rock.scale.set(3 + Math.random() * 2.5); // high variation
          rock.rotation = (Math.random() - 0.5) * 0.2;
          rock.x = pixX + offsetX;
          rock.y = pixY + offsetY;
          rock.zIndex = rock.y;
          this.worldContainer.addChild(rock);
          chunk.props.push(rock);
          continue;
        }

        // --- WATER / LAVA POOLS: Cohesive lakes and rivers ---
        if (waterNoise > 0.45 && terrainNoise < 0.1) {
          this.waterCells.add(cellKey);
          chunk.waterCells.add(cellKey);

          if (!(chunk as any).waterGfx) {
             (chunk as any).waterGfx = new Graphics();
             (chunk as any).waterGfx.zIndex = -99999;
             container.addChild((chunk as any).waterGfx);
          }

          const poolColor = 0x1a75ff;
          const shallowColor = 0x3385ff;

          // Draw strict 64x64 water tile to perfectly match the grid collision hitbox
          const rx = wx * TILE_PX;
          const ry = wy * TILE_PX;

          (chunk as any).waterGfx.rect(rx, ry, TILE_PX, TILE_PX).fill({ color: shallowColor, alpha: 0.95 });
          (chunk as any).waterGfx.rect(rx + 4, ry + 4, TILE_PX - 8, TILE_PX - 8).fill({ color: poolColor, alpha: 0.95 });
          
          // Stylized wave lines
          if (Math.random() > 0.3) {
             (chunk as any).waterGfx.moveTo(rx + 16, ry + 20).lineTo(rx + 32, ry + 20).stroke({width: 2, color: 0xffffff, alpha: 0.3, cap: 'round'});
             (chunk as any).waterGfx.moveTo(rx + 32, ry + 40).lineTo(rx + 48, ry + 40).stroke({width: 2, color: 0xffffff, alpha: 0.2, cap: 'round'});
          }
          continue;
        }

        // --- TREE GROVES: Dense interconnected forests with clearings ---
        if (treeNoise > 0.35 && terrainNoise < 0.15 && Math.random() > 0.3) {
          this.obstacleCells.add(cellKey);
          chunk.obstacleCells.add(cellKey);
          this.propTypes.set(cellKey, 'tree');

          const offsetX = (Math.random() - 0.5) * 32;
          const offsetY = (Math.random() - 0.5) * 32;

          // Shadow under the trunk
          (chunk as any).shadowGfx.ellipse(pixX + offsetX, pixY + offsetY, 20, 8).fill({ color: 0x000000, alpha: 0.4 });

          const treeTex = Math.random() > 0.5 ? this.mapTextures.tree1 : this.mapTextures.tree2;
          const tree = new Sprite(treeTex);
          tree.anchor.set(0.5, 0.75);
          tree.scale.set(2.5 + Math.random() * 3.5); // High variation
          tree.x = pixX + offsetX;
          tree.y = pixY + offsetY;
          tree.rotation = (Math.random() - 0.5) * 0.15;
          tree.zIndex = tree.y;
          this.worldContainer.addChild(tree);
          chunk.props.push(tree);
          continue;
        }

        // --- DESTRUCTIBLE CRATES: Small clusters near clearings ---
        const crateNoise = fbm2(wx * 0.25 + 300, wy * 0.25 + 300, 2);
        if (crateNoise > 0.55 && terrainNoise < 0.1 && treeNoise < 0.25 && Math.random() < 0.15) {
          this.obstacleCells.add(cellKey);
          chunk.obstacleCells.add(cellKey);
          this.propTypes.set(cellKey, 'crate');

          const offsetX = (Math.random() - 0.5) * 16;
          const offsetY = (Math.random() - 0.5) * 16;

          // Shadow
          const crateShadow = new Graphics().ellipse(pixX + offsetX, pixY + offsetY, 16, 6).fill({ color: 0x000000, alpha: 0.3 });
          crateShadow.zIndex = -99998;
          this.worldContainer.addChild(crateShadow);
          chunk.props.push(crateShadow);

          const crate = new Sprite(this.mapTextures.crate);
          crate.anchor.set(0.5, 0.6875);
          crate.scale.set(3.5 + Math.random());
          crate.rotation = (Math.random() - 0.5) * 0.3;
          crate.x = pixX + offsetX;
          crate.y = pixY + offsetY;
          crate.zIndex = crate.y;
          this.worldContainer.addChild(crate);
          chunk.props.push(crate);
          this.destructibles.push({ sprite: crate, x: wx, y: wy, hp: 50, shadow: crateShadow });
          continue;
        }

        // --- GROUND CLUTTER: Bones, webs — sparse decoration in open areas ---
        if (Math.random() < 0.012 && terrainNoise < 0.15 && treeNoise < 0.25) {
          const isBone = Math.random() > 0.5;
          const clutter = new Sprite(isBone ? this.mapTextures.bones : this.mapTextures.web);
          clutter.anchor.set(0.5); clutter.scale.set(3.5 + Math.random());
          clutter.x = pixX + (Math.random() - 0.5) * 16;
          clutter.y = pixY + (Math.random() - 0.5) * 16;
          clutter.zIndex = -50;
          clutter.alpha = 0.3 + Math.random() * 0.3;
          clutter.rotation = Math.random() * Math.PI * 2;
          container.addChild(clutter);
        }
      }
    }

    // Place spawn points (2-4 per chunk, in open areas)
    const spawnCount = 2 + Math.floor(Math.random() * 3);
    const floorArr = Array.from(chunk.floorCells);
    for (let s = 0; s < spawnCount && floorArr.length > 0; s++) {
      const idx = Math.floor(Math.random() * floorArr.length);
      const [swx, swy] = floorArr[idx].split(',').map(Number);

      // Check it's not on an obstacle or water
      if (this.obstacleCells.has(`${swx},${swy}`) || this.waterCells.has(`${swx},${swy}`)) continue;

      // Pick enemy type weighted by biome
      const biome = this.getBiomeAt(swx, swy);
      const candidates = Object.values(EnemyRegistry).filter(e =>
        e.biomes.includes(-1) || e.biomes.includes(biome)
      );
      const totalWeight = candidates.reduce((sum, c) => sum + c.spawnWeight, 0);
      let roll = Math.random() * totalWeight;
      let picked = candidates[0];
      for (const c of candidates) {
        roll -= c.spawnWeight;
        if (roll <= 0) { picked = c; break; }
      }

      const sp: SpawnPoint = {
        wx: swx, wy: swy,
        enemyTypeId: picked.id,
        respawnTimer: 0,
        currentMonster: null,
        chunkKey: key
      };
      chunk.spawnPoints.push(sp);
      this.spawnPoints.push(sp);
    }

    this.worldContainer.addChild(container);
    this.chunks.set(key, chunk);
  }

  private updateChunks() {
    const pcx = Math.floor(this.player.x / CHUNK_PX);
    const pcy = Math.floor(this.player.y / CHUNK_PX);
    const loadRadius = 2; // Optimal balance for performance vs view distance
    const unloadRadius = 4;

    // Load chunks nearby
    for (let dx = -loadRadius; dx <= loadRadius; dx++) {
      for (let dy = -loadRadius; dy <= loadRadius; dy++) {
        const cx = pcx + dx;
        const cy = pcy + dy;
        const key = `${cx},${cy}`;
        if (!this.chunks.has(key)) {
          if (!this.chunkQueue.some(q => q.cx === cx && q.cy === cy)) {
            this.chunkQueue.push({ cx, cy });
          }
        } else {
          const chunk = this.chunks.get(key)!;
          if (!chunk.loaded) {
            this.worldContainer.addChild(chunk.container);
            chunk.props.forEach(p => this.worldContainer.addChild(p));
            chunk.loaded = true;
          }
        }
      }
    }

    // Unload distant chunks (remove from scene, keep data)
    // Also fully purge very distant chunks to free memory
    const purgeRadius = 5;
    const keysToDelete: string[] = [];
    this.chunks.forEach((chunk, key) => {
      const dx = Math.abs(chunk.cx - pcx);
      const dy = Math.abs(chunk.cy - pcy);
      if ((dx > unloadRadius || dy > unloadRadius) && chunk.loaded) {
        this.worldContainer.removeChild(chunk.container);
        chunk.props.forEach(p => this.worldContainer.removeChild(p));
        chunk.loaded = false;
      }
      // Purge chunks far beyond unload radius to free memory
      if (dx > purgeRadius || dy > purgeRadius) {
        if (chunk.loaded) {
          this.worldContainer.removeChild(chunk.container);
          chunk.props.forEach(p => this.worldContainer.removeChild(p));
        }
        // Remove cell data from global sets
        chunk.floorCells.forEach(c => this.floorCells.delete(c));
        chunk.obstacleCells.forEach(c => { this.obstacleCells.delete(c); this.propTypes.delete(c); });
        chunk.waterCells.forEach(c => this.waterCells.delete(c));
        // Remove spawn points belonging to this chunk
        this.spawnPoints = this.spawnPoints.filter(sp => sp.chunkKey !== key);
        // Destroy container GPU resources
        chunk.container.destroy({ children: true });
        chunk.props.forEach(p => p.destroy());
        keysToDelete.push(key);
      }
    });
    for (const k of keysToDelete) this.chunks.delete(k);
  }

  private getEnemyTexturesForType(typeId: string): Record<string, Texture[]> {
    switch (typeId) {
      case 'scout': return this.goblinTextures;
      case 'brute': return this.bruteTextures;
      case 'shaman': return this.shamanTextures;
      case 'magma': return this.magmaTextures;
      case 'wraith': return this.wraithTextures;
      case 'golem': return this.golemTextures;
      default: return this.goblinTextures;
    }
  }

  private spawnOpenWorldEnemy(sp: SpawnPoint) {
    const def = EnemyRegistry[sp.enemyTypeId];
    if (!def) return;

    const textures = this.getEnemyTexturesForType(sp.enemyTypeId);
    const monster = new Sprite(textures.run[0]);
    monster.anchor.set(0.5, 0.8125);
    monster.scale.set(0);
    monster.alpha = 0;
    monster.x = sp.wx * TILE_PX;
    monster.y = sp.wy * TILE_PX;

    // Distance-based difficulty scaling
    const dist = Math.sqrt(sp.wx * sp.wx + sp.wy * sp.wy);
    const scaleFactor = 1 + dist / 200;

    (monster as any).isSpawning = true;
    (monster as any).spawnTimer = 30;
    (monster as any).enemyTypeId = sp.enemyTypeId;
    (monster as any).type = def.attackPattern === 'spread_shot' ? 'ranged' : (def.attackPattern === 'charge' ? 'melee' : 'special');
    (monster as any).attackTimer = def.attackCooldown * (0.5 + Math.random() * 0.5);
    (monster as any).hp = Math.floor(def.hp * scaleFactor);
    (monster as any).maxHp = (monster as any).hp;
    (monster as any).damage = Math.floor(def.damage * scaleFactor);
    (monster as any).speed = def.speed;
    (monster as any).aggroRange = def.aggroRange;
    (monster as any).deaggroRange = def.deaggroRange;
    (monster as any).attackPattern = def.attackPattern;
    (monster as any).attackCooldownMax = def.attackCooldown;
    (monster as any).isBoss = def.isBoss;
    (monster as any).homeX = sp.wx * TILE_PX;
    (monster as any).homeY = sp.wy * TILE_PX;
    (monster as any).aiState = 'idle';
    (monster as any).stateTimer = 60 + Math.random() * 120;
    (monster as any).patrolTargetX = 0;
    (monster as any).patrolTargetY = 0;
    (monster as any).animTimer = Math.random() * 4;
    (monster as any).teleportCooldown = 0;
    (monster as any).chargeDir = { x: 0, y: 0 };
    (monster as any).isCharging = false;

    const hpBar = new Graphics(); hpBar.zIndex = 999999; this.worldContainer.addChild(hpBar);
    (monster as any).hpBar = hpBar;
    const shadow = new Graphics().ellipse(0, 0, def.isBoss ? 8 : 4, def.isBoss ? 3 : 1.5).fill({ color: 0x000000, alpha: 0.5 });
    shadow.zIndex = -99998;
    shadow.scale.set(0);
    this.worldContainer.addChild(shadow);
    (monster as any).shadow = shadow;

    this.worldContainer.addChild(monster);
    this.monsters.push(monster);
    sp.currentMonster = monster;
  }

  private updateSpawns() {
    const maxAlive = 15;
    const alive = this.monsters.length;

    for (const sp of this.spawnPoints) {
      // Skip if chunk is unloaded
      const chunk = this.chunks.get(sp.chunkKey);
      if (!chunk || !chunk.loaded) continue;

      // Check if monster is dead
      if (sp.currentMonster && !this.monsters.includes(sp.currentMonster)) {
        sp.currentMonster = null;
        sp.respawnTimer = 60 * 60 + Math.random() * 60 * 60; // 60-120 seconds
      }

      // Handle respawn timer
      if (sp.currentMonster === null) {
        sp.respawnTimer -= 1;
        if (sp.respawnTimer <= 0 && alive < maxAlive) {
          const dist = Math.hypot(this.player.x - sp.wx * TILE_PX, this.player.y - sp.wy * TILE_PX);
          // Only spawn when player is 300-800px away
          if (dist > 300 && dist < 800) {
            this.spawnOpenWorldEnemy(sp);
          }
        }
      }
    }
  }



  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;

    // Inventory selection (1-3)
    if (e.key >= '1' && e.key <= '3') {
      const newSlot = parseInt(e.key) - 1;
      if (this.activeSlot !== newSlot) {
         this.activeSlot = newSlot;
         this.isReloading = false; // Cancel reload on weapon switch
         this.dispatchState();
      }
    }

    // Toggle Inventory overlay
    if (e.code === 'KeyE' && !e.repeat) {
      this.isInventoryOpen = !this.isInventoryOpen;
      if (this.isInventoryOpen) this.playSound('open_inventory');
      else this.playSound('close_inventory');
      this.dispatchState();
    }

    // Close Inventory or Open Settings on Escape
    if (e.code === 'Escape' && !e.repeat) {
      if (this.isInventoryOpen) {
        this.isInventoryOpen = false;
        this.playSound('close_inventory');
        this.dispatchState();
      } else {
        window.dispatchEvent(new CustomEvent('settings-toggle'));
      }
    }

    // Reloading
    if (e.code === 'KeyR' && !this.isReloading) {
      const inv = this.inventory[this.activeSlot];
      const stats = WeaponRegistry[inv.id];
      if (stats && stats.type === 'ranged' && inv.ammo !== undefined && inv.ammo < stats.maxAmmo!) {
        this.isReloading = true;
        this.reloadTimer = (stats.reloadTime! / 1000) * 60; // Convert MS to frames roughly
        this.playSound('reload');
        this.dispatchState();
      }
    }
  };
  private handleKeyUp = (e: KeyboardEvent) => { this.keys[e.code] = false; };

  private handleSwap = (e: any) => {
    const from = e.detail.from;
    const to = e.detail.to;
    if (from === to) return;

    // Stack identical items
    if (this.inventory[from].id !== '' && this.inventory[from].id === this.inventory[to].id) {
      this.inventory[to].count += this.inventory[from].count;
      this.inventory[from] = { id: '', count: 0 };
    } else {
      // Regular Swap
      const temp = this.inventory[from];
      this.inventory[from] = this.inventory[to];
      this.inventory[to] = temp;
    }
    this.dispatchState();
  };

  private handleClose = () => {
    this.isInventoryOpen = false;
    this.playSound('close_inventory');
    this.dispatchState();
  };

  private handleContextMenu = (e: MouseEvent) => { e.preventDefault(); };
  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) this.isMouseDown = true;
    if (e.button === 2) this.isAiming = true;
  };
  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.isMouseDown = false;
    if (e.button === 2) this.isAiming = false;
  };
  private handleMouseMove = (e: MouseEvent) => { this.targetMouseX = e.clientX; this.targetMouseY = e.clientY; };

  private handleSlotChange = (e: any) => {
    if (e.detail >= 0 && e.detail <= 2) {
      this.activeSlot = e.detail;
      this.dispatchState();
    }
  };

  private startMerchantPhase() {
    this.gameState = 'merchant';
    this.merchantTimer = 45 * 60; // 45 seconds in frames (at 60fps)

    this.merchantSprite = new Sprite(this.merchantTexture);
    this.merchantSprite.anchor.set(0.5, 0.625);
    this.merchantSprite.scale.set(4);
    this.merchantSprite.x = 0;
    this.merchantSprite.y = 0;
    this.merchantSprite.zIndex = 0;

    // Shadow
    const shadow = new Graphics().ellipse(0, 0, 8, 3).fill({ color: 0x000000, alpha: 0.5 });
    shadow.zIndex = -99998;
    this.merchantSprite.addChild(shadow);

    this.worldContainer.addChild(this.merchantSprite);
    this.dispatchState();
  }

  private gainExp(amt: number) {
    this.playerExp += amt;
    let leveledUp = false;
    while (this.playerExp >= this.playerMaxExp) {
      this.playerExp -= this.playerMaxExp;
      this.playerLevel++;
      this.playerMaxHP += 1;
      this.playerHP += 1;
      this.playerDmg += 0.5;
      this.playerMaxExp = Math.floor(this.playerMaxExp * 1.5);
      leveledUp = true;
    }

    if (leveledUp) {
      const style = new TextStyle({ fontFamily: "'CustomFont', Arial", fontSize: 32, fill: '#FFD700', stroke: { color: '#000000', width: 4 }, fontWeight: 'bold' });
      const lvlText = new Text({ text: 'LEVEL UP!', style });
      lvlText.anchor.set(0.5, 0.5);
      lvlText.x = this.player.x;
      lvlText.y = this.player.y - 74;
      lvlText.zIndex = this.player.y + 100;
      this.worldContainer.addChild(lvlText);
      this.damagePopups.push({ sprite: lvlText, life: 120 });
      this.playSound('level_up');
    }

    this.dispatchState();
  }

  private setupInput() {
    window.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('inventory-swap', this.handleSwap);
    window.addEventListener('inventory-close', this.handleClose);
    window.addEventListener('slot-change', this.handleSlotChange);
    window.addEventListener('volume-change', this.handleVolumeChange);
    window.addEventListener('settings-toggle', this.handleSettingsToggle);
  }



  private spawnMonster() {

    if (this.playerHP <= 0) return;

    const halfW = this.app.screen.width / 2;
    const halfH = this.app.screen.height / 2;
    let spawnX = 0; let spawnY = 0;
    let valid = false;

    for (let attempts = 0; attempts < 10; attempts++) {
      const r = Math.random() * (1000 - 64);
      const theta = Math.random() * Math.PI * 2;
      const candX = Math.cos(theta) * r;
      const candY = Math.sin(theta) * r;

      const onCamera = Math.abs(candX - this.player.x) < halfW - 64 && Math.abs(candY - this.player.y) < halfH - 64;
      if (onCamera && Math.hypot(candX - this.player.x, candY - this.player.y) > 200) {
        valid = true; spawnX = candX; spawnY = candY; break;
      }
    }

    if (!valid) {
      const theta = Math.random() * Math.PI * 2;
      spawnX = this.player.x + Math.cos(theta) * 200;
      spawnY = this.player.y + Math.sin(theta) * 200;
    }

    const distFromCenter = Math.hypot(spawnX, spawnY);
    if (distFromCenter > 1000 - 64) {
      const a2 = Math.atan2(spawnY, spawnX);
      spawnX = Math.cos(a2) * (1000 - 64);
      spawnY = Math.sin(a2) * (1000 - 64);
    }

    let x = spawnX;
    let y = spawnY;

    const isRanged = Math.random() > 0.5;
    const monster = new Sprite(isRanged ? this.goblinBlueTextures.run[0] : this.goblinTextures.run[0]);
    monster.anchor.set(0.5, 0.8125);
    monster.scale.set(0);
    monster.alpha = 0;
    monster.x = x;
    monster.y = y;

    (monster as any).isSpawning = true;
    (monster as any).spawnTimer = 15; // 0.25 seconds (snappy)

    (monster as any).type = isRanged ? 'ranged' : 'melee';
    (monster as any).attackTimer = Math.random() * 60 + 60; // 1-2 seconds initially
    (monster as any).jitterAngle = 0;
    (monster as any).jitterTimer = 0;
    const distFromStart = Math.hypot(monster.x, monster.y) / 500;
    (monster as any).hp = 20 + distFromStart * 15;
    (monster as any).maxHp = (monster as any).hp;
    (monster as any).damage = 1 + distFromStart * 0.5;

    // HP Bar
    const hpBar = new Graphics();
    hpBar.zIndex = 999999;
    this.worldContainer.addChild(hpBar);
    (monster as any).hpBar = hpBar;

    // Create isolated shadow
    const shadow = new Graphics().ellipse(0, 0, 4, 1.5).fill({ color: 0x000000, alpha: 0.5 });
    shadow.zIndex = -99998;
    this.worldContainer.addChild(shadow);
    (monster as any).shadow = shadow;
    (monster as any).animTimer = Math.random() * 4;

    this.worldContainer.addChild(monster);
    this.monsters.push(monster);
  }

  private useWeapon(targetAngle: number) {
    const weaponId = this.inventory[this.activeSlot].id;
    const stats = WeaponRegistry[weaponId];
    if (!stats) return;

    const baseAngle = targetAngle;

    if (stats.type === 'melee') {
      this.gunRecoil = 1.0;
      // Melee uses physical sword rotation with wide arc
      const swing = new Sprite(this.weaponTextures.sword || this.weaponTextures.gun);
      swing.anchor.set(0.5, 0.95);
      swing.scale.set(6);
      swing.x = this.player.x;
      swing.y = this.player.y - 12;
      swing.visible = false; // We just mathematically track the swing

      this.worldContainer.addChild(swing);

      const meleeBullet = {
        sprite: swing, vx: 0, vy: 0, isEnemy: false,
        life: 30, maxLife: 30,
        baseAngle: baseAngle,
        hitSet: new Set()
      };
      (meleeBullet as any).isMelee = true;
      this.bullets.push(meleeBullet);

    } else {
      const activeInv = this.inventory[this.activeSlot];
      if (this.isReloading) {
          if (activeInv.id === 'shotgun' && (activeInv.ammo || 0) > 0) {
             this.isReloading = false; // Shotgun interrupt
             this.dispatchState();
          } else {
             this.playSound('empty_click');
             return; // Block firing if reloading other guns
          }
      }
      if (activeInv.ammo !== undefined) {
          if (activeInv.ammo <= 0) {
              this.playSound('empty_click');
              if (!this.isReloading) {
                 this.isReloading = true;
                 this.reloadTimer = (stats.reloadTime! / 1000) * 60;
                 this.dispatchState();
              }
              return;
          }
          activeInv.ammo--;
          this.dispatchState();
      }

      this.gunRecoil = 1.0; // Apply strictly upon successful round utilization
      this.spawnParticles(this.gunSprite.x + Math.cos(baseAngle) * 24, this.gunSprite.y + Math.sin(baseAngle) * 24, 0xffaa00, 3);
      for (let i = 0; i < stats.projectilesPerShot; i++) {
        const bullet = new Sprite(this.weaponTextures[stats.projectileSpriteName]);
        bullet.anchor.set(0.5, 0.5);
        bullet.scale.set(3);
        bullet.x = this.player.x;
        bullet.y = this.player.y - 12; // Shoot from barrel level

        const spreadModifier = this.isAiming ? 0.02 : 1.0;
        const baseSpread = stats.projectilesPerShot > 1 ? (Math.random() - 0.5) * stats.spread : (Math.random() - 0.5) * stats.spread;
        const spreadParams = baseSpread * spreadModifier;
        const finalAngle = baseAngle + spreadParams;

        bullet.rotation = finalAngle;
        const speedScale = stats.id === 'mg_bullet' ? 20 : 18;
        const vx = Math.cos(finalAngle) * speedScale;
        const vy = Math.sin(finalAngle) * speedScale;

        this.worldContainer.addChild(bullet);
        this.bullets.push({ sprite: bullet, vx, vy, isEnemy: false });
      }
    }

    this.playSound(stats.sfx);
  }

  private update(dt: number) {
    if (this.destroyed) return;
    this.frameCount++;
    if (this.frameCount % 10 === 0) {
      window.dispatchEvent(new CustomEvent('fps-change', { detail: this.app.ticker.FPS }));
    }

    this.mouseX += (this.targetMouseX - this.mouseX) * 0.3 * dt;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.3 * dt;

    if (this.crosshair) {
      this.crosshair.x = this.mouseX;
      this.crosshair.y = this.mouseY;
    }

    const halfW = this.app.screen.width / 2;
    const halfH = this.app.screen.height / 2;

    // Ambient Particles Logic
    const px = Math.floor(this.player.x / TILE_PX);
    const py = Math.floor(this.player.y / TILE_PX);
    const isMagma = this.getBiomeAt(px, py) === 1;
    const isVoid = this.getBiomeAt(px, py) === 2;
    
    // Spawn new ambient particle around camera
    if (Math.random() < 0.4) { 
       const p = new Graphics();
       let color = 0xffffff;
       if (isMagma) color = 0xff5500;
       else if (isVoid) color = 0xaa00ff;
       else color = 0xaaddff; // plains gets pollen/fireflies
       
       const size = 1 + Math.random() * 2;
       p.circle(0, 0, size).fill({color, alpha: 0.3 + Math.random()*0.3});
       p.blendMode = 'add';
       
       const sx = (Math.random() - 0.5) * this.app.screen.width * 1.5;
       const sy = (Math.random() - 0.5) * this.app.screen.height * 1.5;
       p.x = this.player.x + sx;
       p.y = this.player.y + sy;
       
       this.ambientContainer.addChild(p);
       this.ambientParticles.push({
          sprite: p,
          vx: (Math.random() - 0.5) * 0.5 + (isMagma ? 0 : 0.5),
          vy: (Math.random() - 0.5) * 0.5 - (isMagma ? 2.5 : 0.5), // Magma embers rise faster
          life: 0,
          maxLife: 150 + Math.random() * 150,
          rotSpeed: 0
       });
    }

    for (let i = this.ambientParticles.length - 1; i >= 0; i--) {
       const ap = this.ambientParticles[i];
       ap.life += dt;
       ap.sprite.x += ap.vx * dt;
       ap.sprite.y += ap.vy * dt;
       ap.sprite.x += Math.sin(ap.life / 20) * 0.3 * dt; // Sway
       
       const lifeRatio = ap.life / ap.maxLife;
       if (lifeRatio > 0.8) ap.sprite.alpha = 1 - ((lifeRatio - 0.8) * 5);
       
       if (ap.life >= ap.maxLife) {
          this.ambientContainer.removeChild(ap.sprite);
          ap.sprite.destroy();
          this.ambientParticles.splice(i, 1);
       }
    }

    // Broadcast HP changes via Custom Event
    if (this.playerHP !== this.lastHP) {
      window.dispatchEvent(new CustomEvent('hp-change', { detail: this.playerHP }));
      this.lastHP = this.playerHP;
    }

    this.playerShadow.x = this.player.x;
    this.playerShadow.y = this.player.y;

    if (this.playerHP <= 0 || this.isInventoryOpen || this.isSettingsOpen) return; // Freeze simulation on death, inventory, or settings


      // Open-world updates
      this.updateChunks();

      // Progressively generate 1 chunk per frame to prevent stutter
      if (this.chunkQueue.length > 0) {
         const q = this.chunkQueue.shift()!;
         this.generateChunk(q.cx, q.cy);
      }
      this.updateSpawns();
      this.updateAmbiance(dt);

      // Update fire trails
      for (let i = this.fireTrails.length - 1; i >= 0; i--) {
        this.fireTrails[i].life -= 1;
        this.fireTrails[i].sprite.alpha = Math.max(0, this.fireTrails[i].life / 300);
        if (this.fireTrails[i].life <= 0) {
          this.worldContainer.removeChild(this.fireTrails[i].sprite);
          this.fireTrails[i].sprite.destroy();
          this.fireTrails.splice(i, 1);
        }
      }

      // Update telegraphs
      for (let i = this.telegraphs.length - 1; i >= 0; i--) {
        const tg = this.telegraphs[i];
        tg.life -= 1;
        tg.sprite.alpha = 0.3 + 0.4 * Math.sin(performance.now() / 100);
        if (tg.life <= 0) {
          // Deal damage if player is in blast radius
          const pdist = Math.hypot(this.player.x - tg.x, this.player.y - tg.y);
          if (pdist < tg.radius && !this.isInvulnerable) {
            const dmg = tg.owner ? ((tg.owner as any).damage || 8) : 8;
            this.playerHP -= dmg;
            this.isInvulnerable = true;
            this.invulnerableTimer = 60;
            if (this.playerHP <= 0) this.playSound('death');
            else this.playSound('hit');
            this.spawnParticles(this.player.x, this.player.y, 0xff4400, 8);
          }
          this.worldContainer.removeChild(tg.sprite);
          tg.sprite.destroy();
          this.telegraphs.splice(i, 1);
        }
      }

      // Update fire trails — damage player on contact
      for (const ft of this.fireTrails) {
        if (!this.isInvulnerable) {
          const fdist = Math.hypot(this.player.x - ft.sprite.x, this.player.y - ft.sprite.y);
          if (fdist < 24) {
            this.playerHP -= 2;
            this.isInvulnerable = true;
            this.invulnerableTimer = 30;
            if (this.playerHP <= 0) this.playSound('death');
            else this.playSound('hit');
            break;
          }
        }
      }

      // Artifact Compass & Sonar
      let nearestArtifact: {cx: number, cy: number, dist: number} | null = null;
      for (const loc of this.artifactLocations) {
         if (!loc.collected) {
            const ax = loc.cx * CHUNK_PX + (CHUNK_PX/2);
            const ay = loc.cy * CHUNK_PX + (CHUNK_PX/2);
            const dist = Math.hypot(this.player.x - ax, this.player.y - ay);
            if (!nearestArtifact || dist < nearestArtifact.dist) {
               nearestArtifact = { cx: loc.cx, cy: loc.cy, dist };
            }

            // Artifact Collection
            if (dist < 100) {
               loc.collected = true;
               this.artifactsCollected++;
               if (loc.sprite) {
                  this.worldContainer.removeChild(loc.sprite);
                  loc.sprite.destroy();
                  loc.sprite = null;
               }
               this.playSound('artifact_pickup');
               
               // Visual popup
               const style = new TextStyle({ fontFamily: "'CustomFont', Arial", fontSize: 24, fill: '#FFD700', stroke: { color: '#000000', width: 4 }, fontWeight: 'bold' });
               const popText = new Text({ text: `ARTIFACT ${this.artifactsCollected}/${this.totalArtifactsNeeded}`, style });
               popText.anchor.set(0.5, 0.5);
               popText.x = this.player.x;
               popText.y = this.player.y - 100;
               popText.zIndex = this.player.y + 100;
               this.worldContainer.addChild(popText);
               this.damagePopups.push({ sprite: popText, life: 120 });
               
               // Wake up Guardians in this chunk
               const chunkKey = `${loc.cx},${loc.cy}`;
               const chunk = this.chunks.get(chunkKey);
               if (chunk) {
                  this.playSound('shrine_awaken');
                  for (const sp of chunk.spawnPoints) {
                     if (sp.currentMonster && (sp.currentMonster as any).aiState === 'sleeping') {
                        (sp.currentMonster as any).aiState = 'idle';
                        (sp.currentMonster as any).stateTimer = 0;
                        sp.currentMonster.tint = 0xFFFFFF; // Revert to normal colors
                        // Buff them
                        (sp.currentMonster as any).maxHp *= 2;
                        (sp.currentMonster as any).hp = (sp.currentMonster as any).maxHp;
                        (sp.currentMonster as any).damage *= 1.5;
                        (sp.currentMonster as any).speed *= 1.2;
                     }
                  }
               }
            }
         }
      }

      if (nearestArtifact && this.compassSprite) {
          const ax = nearestArtifact.cx * CHUNK_PX + (CHUNK_PX/2);
          const ay = nearestArtifact.cy * CHUNK_PX + (CHUNK_PX/2);
          const angle = Math.atan2(ay - this.player.y, ax - this.player.x);
          this.compassSprite.x = this.player.x + Math.cos(angle) * 80;
          this.compassSprite.y = this.player.y - 30 + Math.sin(angle) * 80;
          this.compassSprite.rotation = angle;
          
          if (this.isSprinting || (this.keys['KeyW'] || this.keys['KeyA'] || this.keys['KeyS'] || this.keys['KeyD']) === false) {
             this.compassSprite.alpha = Math.min(1, this.compassSprite.alpha + 0.05);
          } else {
             this.compassSprite.alpha = Math.max(0, this.compassSprite.alpha - 0.05);
          }

          // Sonar Ping
          this.sonarTimer -= dt;
          if (this.sonarTimer <= 0) {
              const pingInterval = Math.max(30, nearestArtifact.dist / 10); // Faster when closer
              this.sonarTimer = pingInterval;
              if (nearestArtifact.dist < 1500) {
                 this.playSound('artifact_ping');
              }
          }
      } else if (this.compassSprite) {
          this.compassSprite.alpha = 0;
      }

      // Portal spawn on collecting all artifacts
      if (this.artifactsCollected >= this.totalArtifactsNeeded && !this.portalSpawned) {
        this.portalSpawned = true;
        
        // Spawn portal near player in an open spot if possible
        const portalX = this.player.x + (Math.random() > 0.5 ? 200 : -200);
        const portalY = this.player.y + (Math.random() > 0.5 ? 200 : -200);

        this.portalSprite = new Sprite(this.mapTextures.portal);
        this.portalSprite.anchor.set(0.5, 0.5);
        this.portalSprite.scale.set(4);
        this.portalSprite.x = portalX;
        this.portalSprite.y = portalY;
        this.portalSprite.alpha = 0.8;
        this.portalSprite.zIndex = portalY;
        this.worldContainer.addChild(this.portalSprite);
        const pGlow = new Graphics().circle(0, 0, 32).fill({ color: 0x00ffff, alpha: 0.2 });
        this.portalSprite.addChild(pGlow);

        // Also spawn merchant nearby
        this.merchantSprite = new Sprite(this.merchantTexture);
        this.merchantSprite.anchor.set(0.5, 0.5);
        this.merchantSprite.scale.set(4);
        this.merchantSprite.x = portalX - 100;
        this.merchantSprite.y = portalY;
        this.merchantSprite.zIndex = portalY;
        this.worldContainer.addChild(this.merchantSprite);

        this.playSound('portal_boss_spawn');
        
        // Spawn Gatekeeper Boss
        const sp: SpawnPoint = {
             wx: Math.floor(portalX/TILE_PX), wy: Math.floor((portalY+100)/TILE_PX),
             enemyTypeId: 'golem', // Use Golem as the Gatekeeper
             respawnTimer: 0,
             currentMonster: null,
             chunkKey: `${Math.floor(portalX/CHUNK_PX)},${Math.floor(portalY/CHUNK_PX)}`
        };
        this.spawnOpenWorldEnemy(sp);
        if (sp.currentMonster) {
             (sp.currentMonster as any).isGatekeeper = true;
             sp.currentMonster.scale.set(8); // Make it huge (4 is normal, 8 is 2x)
             (sp.currentMonster as any).maxHp *= 3;
             (sp.currentMonster as any).hp = (sp.currentMonster as any).maxHp;
             (sp.currentMonster as any).damage *= 2;
        }

        const style = new TextStyle({ fontFamily: "'CustomFont', Arial", fontSize: 36, fill: '#ff0000', stroke: { color: '#000000', width: 5 }, fontWeight: 'bold' });
        const clearText = new Text({ text: 'GATEKEEPER AWAKENED!', style });
        clearText.anchor.set(0.5, 0.5);
        clearText.x = this.player.x;
        clearText.y = this.player.y - 100;
        clearText.zIndex = this.player.y + 100;
        this.worldContainer.addChild(clearText);
        this.damagePopups.push({ sprite: clearText, life: 120 });
      }

    // Dungeon interaction zones
    let isNearMerchant = false;
    let isNearPortal = false;

    if (this.merchantSprite) {
       const dist = Math.hypot(this.player.x - this.merchantSprite.x, this.player.y - this.merchantSprite.y);
       if (dist < 100) {
          isNearMerchant = true;
          if (this.keys['KeyF']) {
             window.dispatchEvent(new CustomEvent('shop-open'));
             this.keys['KeyF'] = false; // consume
          }
       }
    }

    if (this.portalSprite && this.portalSprite.parent) {
       const pDist = Math.hypot(this.player.x - this.portalSprite.x, this.player.y - this.portalSprite.y);
       if (pDist < 80) {
          // Check if Gatekeeper is dead
          let gatekeeperAlive = false;
          for (const m of this.monsters) {
             if ((m as any).isGatekeeper) {
                gatekeeperAlive = true;
                break;
             }
          }
          
          isNearPortal = true;
          if (this.keys['Space']) {
             if (gatekeeperAlive) {
                 this.keys['Space'] = false;
                 // Visual popup warning
                 const style = new TextStyle({ fontFamily: "'CustomFont', Arial", fontSize: 24, fill: '#ff0000', stroke: { color: '#000000', width: 4 }, fontWeight: 'bold' });
                 const popText = new Text({ text: "DEFEAT THE GATEKEEPER!", style });
                 popText.anchor.set(0.5, 0.5);
                 popText.x = this.player.x;
                 popText.y = this.player.y - 100;
                 popText.zIndex = this.player.y + 100;
                 this.worldContainer.addChild(popText);
                 this.damagePopups.push({ sprite: popText, life: 60 });
                 this.playSound('empty_click');
             } else {
                 this.keys['Space'] = false;
                 this.playSound('level_up');
                 this.currentDungeonStage++;
                 if (this.currentDungeonStage > 3) {
                    this.currentDungeonStage = 1;
                    this.currentDungeonWorld++;
                 }
             this.portalSprite.destroy({ children: true });
             this.portalSprite = null;
             if (this.merchantSprite) {
                this.merchantSprite.destroy();
                this.merchantSprite = null;
             }
             this.portalSpawned = false;
             this.openWorldKills = 0;

             this.worldContainer.removeChildren();
             this.floorCells.clear();
             this.bullets = [];
             this.particles = [];
             this.coinDrops = [];
             this.droppedItems = [];
             this.monsters = [];
             this.corpses = [];
             this.damagePopups = [];
             this.fireTrails = [];
             this.telegraphs = [];

             this.initOpenWorld();

             // Spawn at origin of new world
             this.player.x = 0;
             this.player.y = 0;

             this.worldContainer.addChild(this.playerShadow);
             this.worldContainer.addChild(this.player);
             this.worldContainer.addChild(this.gunSprite);
             if (this.handPotionSprite) this.worldContainer.addChild(this.handPotionSprite);
             this.worldContainer.addChild(this.staminaGroup);
             
             this.dispatchState();
             }
          }
       }
    }

    const currentHover = isNearMerchant ? 'merchant' : isNearPortal ? 'portal' : null;
    if (this.lastHover !== currentHover) {
       window.dispatchEvent(new CustomEvent('interact-hover', { detail: currentHover }));
       this.lastHover = currentHover;
    }

    // Handle Reloading
    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const activeInv = this.inventory[this.activeSlot];
        const stats = WeaponRegistry[activeInv.id];
        if (stats && stats.type === 'ranged') {
           if (activeInv.id === 'shotgun') {
               activeInv.ammo = (activeInv.ammo || 0) + 1;
               this.playSound('reload');
               if (activeInv.ammo < stats.maxAmmo!) {
                  this.reloadTimer = (stats.reloadTime! / 1000) * 60;
               } else {
                  this.isReloading = false;
               }
           } else {
               activeInv.ammo = stats.maxAmmo!;
               this.isReloading = false;
               this.playSound('reload');
           }
           this.dispatchState();
        } else {
           this.isReloading = false;
           this.dispatchState();
        }
      }
    }

    // Base Speed processing
    let speed = 8 * dt;
    let dx = 0;
    let dy = 0;

    if (this.keys['ArrowUp'] || this.keys['KeyW']) dy -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) dy += 1;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) dx -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) dx += 1;

    // Normalize
    if (dx !== 0 && dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
    }

    // Stamina & Movement Logic
    if (this.rollCooldownTimer > 0) this.rollCooldownTimer -= dt;

    if (this.isRolling) {
      this.rollTimer -= dt;
      if (this.rollTimer <= 0) {
        this.isRolling = false;
        this.isInvulnerable = false;
        this.player.anchor.y = 0.875; // reset jump offset
      } else {
        // Wacky smooth math: Quadratic ease-out speed + Sine wave jumping
        const p = 1 - (this.rollTimer / 24); // 0.0 to 1.0 progress
        speed = 58 * Math.pow(1 - p, 2) * dt; 
        
        // Z-axis jump offset for extreme smoothness
        this.player.anchor.y = 0.875 + Math.sin(p * Math.PI) * 0.35;
        
        dx = this.rollDirection.x;
        dy = this.rollDirection.y;
      }
    } else {
      if ((this.keys['KeyQ'] || this.keys['KeyC']) && this.stamina >= 150 && this.rollCooldownTimer <= 0 && (dx !== 0 || dy !== 0)) {
        this.isRolling = true;
        this.stamina -= 150;
        this.rollTimer = 24; // slightly longer duration to let frames breathe
        this.rollCooldownTimer = 48; // 0.8s cooldown
        this.rollDirection = { x: dx, y: dy };
        this.isInvulnerable = true;
        this.invulnerableTimer = 24;
        speed = 45 * dt; // Initial burst speed
        this.keys['KeyQ'] = false;
        this.keys['KeyC'] = false; 
      } else {
        if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
          if (this.stamina > 0 && (dx !== 0 || dy !== 0)) {
            this.isSprinting = true;
            speed *= 1.6;
            this.stamina = Math.max(0, this.stamina - dt * 1.5);
            if (Math.random() > 0.6) this.spawnParticles(this.player.x, this.player.y, 0xaaaaaa, 1, true);
          } else {
            this.isSprinting = false;
          }
        } else {
          this.isSprinting = false;
          this.stamina = Math.min(this.maxStamina, this.stamina + dt * 1.5);
        }
      }
    }

    // Update stamina bar graphics smoothly (float + sine bob)
    const targetX = this.player.x - 40;
    this.staminaGroup.x += (targetX - this.staminaGroup.x) * Math.min(1, 0.15 * dt);
    const targetY = (this.player.y - 70) + Math.sin(performance.now() / 200) * 4;
    this.staminaGroup.y += (targetY - this.staminaGroup.y) * Math.min(1, 0.15 * dt);
    
    // Floating Circle Arc logic
    this.staminaBarFill.clear();
    const progress = Math.max(0, this.stamina / this.maxStamina);
    if (progress > 0) {
      this.staminaBarFill.arc(0, 0, 10, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
      const barColor = (this.stamina < 50 || this.rollCooldownTimer > 0) ? 0xFFA500 : 0x00FF00;
      this.staminaBarFill.stroke({ width: 8, color: barColor, cap: 'round' });
    }
    // Auto-hide stamina bar when full and not on cooldown
    if (this.stamina >= this.maxStamina && this.rollCooldownTimer <= 0) {
      this.staminaGroup.alpha -= 0.05 * dt;
      if (this.staminaGroup.alpha < 0) this.staminaGroup.alpha = 0;
      this.staminaGroup.visible = this.staminaGroup.alpha > 0;
    } else {
      this.staminaGroup.visible = true;
      this.staminaGroup.alpha += 0.1 * dt;
      if (this.staminaGroup.alpha > 1) this.staminaGroup.alpha = 1;
    }

    // Dynamic Weapon Movement Penalties
    const activeStats = WeaponRegistry[this.inventory[this.activeSlot].id];
    if (activeStats) {
      speed *= activeStats.movementPenalty;
      // If fired within the last 500ms, apply firing slow
      if (performance.now() - this.lastShootTime < 500) {
        speed *= activeStats.firingMovementPenalty;
      }
    }

    // Process Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.sprite.alpha = p.life / p.maxLife;
      if (p.life <= 0) {
        this.worldContainer.removeChild(p.sprite);
        p.sprite.destroy();
        this.particles.splice(i, 1);
      }
    }

    // Process Corpses
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const c = this.corpses[i];
      (c as any).life -= dt;
      const life = (c as any).life;

      const textures = (c as any).isRanged ? this.goblinBlueTextures : this.goblinTextures;
      if (life > 170) c.texture = textures.dead1[0];
      else if (life > 160) c.texture = textures.dead2[0];
      else c.texture = textures.dead3[0];

      if (life < 60) c.alpha = (life / 60) * 0.8;
      if (life <= 0) {
        this.worldContainer.removeChild(c);
        c.destroy();
        this.corpses.splice(i, 1);
      }
    }

    // Process Damage Popups
    for (let i = this.damagePopups.length - 1; i >= 0; i--) {
      const p = this.damagePopups[i];
      p.life -= dt;
      p.sprite.y -= dt * 1.5;
      p.sprite.alpha = p.life / 30;
      if (p.life <= 0) {
        this.worldContainer.removeChild(p.sprite);
        p.sprite.destroy(true);
        this.damagePopups.splice(i, 1);
      }
    }

    // Process Dropped Items
    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const item = this.droppedItems[i];
      // Float animation
      item.sprite.y += Math.sin(performance.now() / 200) * 0.2;

      const cdx = this.player.x - item.sprite.x;
      const cdy = (this.player.y - 12) - item.sprite.y;
      const dist = Math.hypot(cdx, cdy);

      // Magnet Drop Items Pickup Radius logic
      if (dist < 150 && dist > 8) {
        const magnetSpeed = 10 * dt;
        item.sprite.x += (cdx / dist) * magnetSpeed;
        item.sprite.y += (cdy / dist) * magnetSpeed;
      }

      // Pickup collision
      if (dist < 32) {
        // Find existing stack first, then empty slot
        let slot = this.inventory.findIndex(inv => inv.id === item.id);
        if (slot === -1) slot = this.inventory.findIndex(inv => inv.id === '');

        if (slot !== -1) {
          const prev = this.inventory[slot];
          this.inventory[slot] = { id: item.id, count: (prev.id === item.id ? prev.count : 0) + item.count };
          this.worldContainer.removeChild(item.sprite);
          item.sprite.destroy();
          this.droppedItems.splice(i, 1);
          this.dispatchState();
          this.playSound('pickup');
        }
      }
    }

    // Cursor-based targeting (accounting for 1.5x zoom scale)
    const worldMouseX = (this.mouseX - this.worldContainer.x) / 1.5;
    const worldMouseY = (this.mouseY - this.worldContainer.y) / 1.5;
    const targetAngle = Math.atan2(worldMouseY - this.gunSprite.y, worldMouseX - this.gunSprite.x);

    // Use items or shoot Ã¢â‚¬â€ always read activeSlot fresh, never cache the object
    const now = performance.now();
    const slotIdx = this.activeSlot;
    const slotId = this.inventory[slotIdx].id;

    // Show gun/potion if equipped
    const meleeBullet = this.bullets.find(b => (b as any).isMelee);
    const isSwinging = !!meleeBullet;
    this.gunSprite.visible = !!WeaponRegistry[slotId];
    if (this.gunSprite.visible) {
      this.gunSprite.texture = this.weaponTextures[WeaponRegistry[slotId].spriteName];
    }

    this.handPotionSprite.visible = (slotId === 'potion') && !this.isDrinking;

    if (this.handPotionSprite.visible) {
      this.handPotionSprite.position.set(this.player.x + (this.player.scale.x > 0 ? 16 : -16), this.player.y - 12);
      this.handPotionSprite.zIndex = this.player.y + 1;
    }

    const fireRateMs = activeStats ? activeStats.fireRate : 250;
    if (!this.isRolling && (this.keys['Space'] || this.isMouseDown) && now - this.lastShootTime > fireRateMs) {
      this.lastShootTime = now;
      if (WeaponRegistry[slotId]) {
         this.useWeapon(targetAngle);
      }
    }

    isNearMerchant = false;
    if (this.gameState === 'merchant' && this.merchantSprite) {
      if (Math.hypot(this.player.x - this.merchantSprite.x, this.player.y - this.merchantSprite.y) < 100) {
        isNearMerchant = true;
      }
    }

    // Drink logic (Cast Time) - Permit drink even at max HP to prevent ghost perception
    if (this.keys['KeyF'] && slotId === 'potion' && !this.isDrinking && !isNearMerchant) {
      this.isDrinking = true;
      this.drinkingTimer = 30; // 0.5s faster

      this.drinkingPotionSprite = new Sprite(this.potionTexture);
      this.drinkingPotionSprite.anchor.set(0.5, 0.5);
      this.drinkingPotionSprite.scale.set(3);
      this.drinkingPotionSprite.x = this.player.x + 24;
      this.drinkingPotionSprite.y = this.player.y - 32;
      this.drinkingPotionSprite.zIndex = this.player.y + 100;
      this.worldContainer.addChild(this.drinkingPotionSprite);
      this.playSound('drink');
      this.dispatchState(); // Export early progress
    }

    if (this.isDrinking) {
      // Cancel conditions
      if (slotId !== 'potion' || this.keys['Space']) {
        this.isDrinking = false;
        if (this.drinkingPotionSprite) {
          this.worldContainer.removeChild(this.drinkingPotionSprite);
          this.drinkingPotionSprite.destroy();
          this.drinkingPotionSprite = null;
        }
      } else {
        // Progress drink
        this.drinkingTimer -= dt;
        this.dispatchState(); // Tick progress UI

        if (this.drinkingPotionSprite) {
          const prog = 1 - (this.drinkingTimer / 30);
          // Smoother, tighter rotation tilt (max 72 degrees instead of 135)
          this.drinkingPotionSprite.rotation = -prog * Math.PI * 0.4;
          this.drinkingPotionSprite.x = this.player.x + 24 - (prog * 12);
          this.drinkingPotionSprite.y = (this.player.y - 32) + (prog * 16);
          this.drinkingPotionSprite.zIndex = this.player.y + 10;
        }

        if (this.drinkingTimer <= 0) {
          this.isDrinking = false;
          if (this.drinkingPotionSprite) {
            this.worldContainer.removeChild(this.drinkingPotionSprite);
            this.drinkingPotionSprite.destroy();
            this.drinkingPotionSprite = null;
          }

          if (this.playerHP < this.playerMaxHP) {
            this.playerHP = Math.min(this.playerMaxHP, this.playerHP + 4);
            const cur = this.inventory[slotIdx];
            const newCount = cur.count - 1;
            this.inventory[slotIdx] = newCount <= 0 ? { id: '', count: 0 } : { id: 'potion', count: newCount };
            this.dispatchState();

            // Show +4 HP popup
            const style = new TextStyle({ fontFamily: "'CustomFont', Arial", fontSize: 24, fill: '#00ff00', stroke: { color: '#005500', width: 4 }, fontWeight: 'bold' });
            const healText = new Text({ text: '+4 HP', style });
            healText.anchor.set(0.5, 0.5);
            healText.x = this.player.x;
            healText.y = this.player.y - 64;
            healText.zIndex = this.player.y + 100;
            this.worldContainer.addChild(healText);
            this.damagePopups.push({ sprite: healText, life: 60 });
          } else {
            // Also deduct potion if drinking at max HP to bypass perception of buggy item!
            const cur = this.inventory[slotIdx];
            const newCount = cur.count - 1;
            this.inventory[slotIdx] = newCount <= 0 ? { id: '', count: 0 } : { id: 'potion', count: newCount };
            this.dispatchState();
          }
        }
      }
    }

    // Animation state logic
    let newAnim = dx !== 0 || dy !== 0 ? 'walk' : 'idle';
    if (this.isInvulnerable && !this.isRolling) newAnim = 'hit';
    if (this.isRolling) newAnim = 'roll';

    if (newAnim !== this.currentAnim) {
      this.currentAnim = newAnim;
      this.animTimer = 0; // Reset timer on frame change
    }

    // Process sprite animation
    const animSpeed = this.currentAnim === 'roll' ? 0.20 : (this.currentAnim === 'walk' ? 0.15 : 0.05);
    this.animTimer += dt * animSpeed;
    const frames = this.slimeTextures[this.currentAnim];
    if (frames && frames.length > 0) {
      const frameIdx = Math.floor(this.animTimer) % frames.length;
      this.player.texture = frames[frameIdx];
    }

    // targetAngle is calculated above based on cursor

    const isMeleeEquipped = WeaponRegistry[slotId] && WeaponRegistry[slotId].type === 'melee';
    const defaultScale = isMeleeEquipped ? 6 : 3;

    if (isSwinging && isMeleeEquipped && meleeBullet) {
       this.gunSprite.scale.set(defaultScale);
       this.gunSprite.rotation = meleeBullet.sprite.rotation;
       this.gunSprite.x = meleeBullet.sprite.x;
       this.gunSprite.y = meleeBullet.sprite.y;
    } else {
       if (isMeleeEquipped) {
         this.gunSprite.scale.y = defaultScale; // Sword is symmetric
         this.gunSprite.rotation = targetAngle + Math.PI / 2;
       } else {
         if (Math.abs(targetAngle) > Math.PI / 2) this.gunSprite.scale.y = -defaultScale;
         else this.gunSprite.scale.y = defaultScale;
         
         if (this.gunRecoil > 0) {
           this.gunRecoil -= dt * 0.15;
           if (this.gunRecoil < 0) this.gunRecoil = 0;
         }
         const kickAngle = this.gunRecoil * 0.2 * (this.gunSprite.scale.y < 0 ? -1 : 1);
         this.gunSprite.rotation = targetAngle + kickAngle;
       }
       this.gunSprite.scale.x = defaultScale;
       
       const recoilDist = isMeleeEquipped ? 0 : this.gunRecoil * 12;
       this.gunSprite.x = this.player.x - Math.cos(targetAngle) * recoilDist;
       this.gunSprite.y = this.player.y - 12 - Math.sin(targetAngle) * recoilDist;
    }

    // Sprite flipping & bouncy physics
    const flipSign = Math.abs(targetAngle) > Math.PI / 2 ? -4 : 4;
    
        const isMoving = dx !== 0 || dy !== 0;
        if (isMoving && !this.isRolling) {
            this.player.scale.y = 4 + Math.sin(performance.now() / 60) * 0.3;
            this.player.scale.x = Math.sign(flipSign) * (4 - Math.sin(performance.now() / 60) * 0.15);
            this.player.rotation = Math.sin(performance.now() / 100) * 0.05;
        } else {
            const scaleBlend = 1 - Math.pow(0.8, dt);
            this.player.scale.y += (4 - this.player.scale.y) * scaleBlend;
            this.player.scale.x = Math.sign(flipSign) * (Math.abs(this.player.scale.x) + (4 - Math.abs(this.player.scale.x)) * scaleBlend);
            this.player.rotation += (0 - this.player.rotation) * scaleBlend;
        }

    // Apply Smooth Acceleration / Friction
    const targetVx = dx * speed;
    const targetVy = dy * speed * 0.75;
    const velBlend = 1 - Math.pow(0.8, dt);
    this.playerVx += (targetVx - this.playerVx) * velBlend;
    this.playerVy += (targetVy - this.playerVy) * velBlend;

    const nextX = this.player.x + this.playerVx * dt;
    const nextY = this.player.y + this.playerVy * dt;

    // True Mesh-Based Sliding Collision (Circle vs Circle)
    const playerRadius = 16;
    
    const checkGridCollision = (px: number, py: number) => {
      const minCX = Math.floor((px - playerRadius) / TILE_PX);
      const maxCX = Math.floor((px + playerRadius) / TILE_PX);
      const minCY = Math.floor((py - playerRadius) / TILE_PX);
      const maxCY = Math.floor((py + playerRadius) / TILE_PX);

      for (let x = minCX; x <= maxCX; x++) {
        for (let y = minCY; y <= maxCY; y++) {
          if (this.waterCells.has(`${x},${y}`)) return true;
        }
      }
      return false;
    };

    // 1. Hard Grid Boundaries (Water)
    if (!checkGridCollision(nextX, this.player.y)) {
      this.player.x = nextX;
    } else {
      this.playerVx = 0;
    }
    
    if (!checkGridCollision(this.player.x, nextY)) {
        this.player.y = nextY;
      } else {
        this.playerVy = 0;
      }
      
      // 2. Resolve Prop Overlaps (Push-out Sliding Physics)
      const pcx = Math.floor(this.player.x / CHUNK_PX);
      const pcy = Math.floor(this.player.y / CHUNK_PX);
      for (let cx = pcx - 1; cx <= pcx + 1; cx++) {
        for (let cy = pcy - 1; cy <= pcy + 1; cy++) {
          const chunk = this.chunks.get(`${cx},${cy}`);
          if (chunk) {
            for (const prop of chunk.props) {
              if (prop.destroyed) continue;
              const propRadius = prop.width * 0.25;
              const minDist = playerRadius + propRadius;
              const cdx = this.player.x - prop.x;
              const cdy = this.player.y - prop.y; // prop.y is base
              const distSq = cdx*cdx + cdy*cdy;
              
              if (distSq < minDist * minDist && distSq > 0) {
                 const dist = Math.sqrt(distSq);
                 const overlap = minDist - dist;
                 const nx = cdx / dist;
                 const ny = cdy / dist;
                 
                 // Push the player out
                 this.player.x += nx * overlap;
                 this.player.y += ny * overlap;
                 
                 // Nullify velocity towards the obstacle for smooth sliding
                 const dot = this.playerVx * nx + this.playerVy * ny;
                 if (dot < 0) {
                    this.playerVx -= nx * dot;
                    this.playerVy -= ny * dot;
                 }
              }
            }
          }
        }
      }


    // Process Coin Drops
    for (let i = this.coinDrops.length - 1; i >= 0; i--) {
      const coin = this.coinDrops[i];
      coin.life -= dt;

      // Floating bob + 3D spin animation
      coin.sprite.y += Math.sin(performance.now() / 200) * 0.3;
      coin.sprite.scale.x = Math.sin(performance.now() / 150) * 0.15;

      const cdx = this.player.x - coin.sprite.x;
      const cdy = (this.player.y - 12) - coin.sprite.y;
      const dist = Math.hypot(cdx, cdy);

      // Magnet: attract toward player when within 200px
      if (dist < 200 && dist > 8) {
        const magnetSpeed = 15 * dt;
        coin.sprite.x += (cdx / dist) * magnetSpeed;
        coin.sprite.y += (cdy / dist) * magnetSpeed;
      }

      if (dist < 40) {
        this.coins++;
        this.playSound('pickup');
        this.worldContainer.removeChild(coin.sprite);
        coin.sprite.destroy();
        this.coinDrops.splice(i, 1);
        this.dispatchState();
        continue;
      }

      if (coin.life <= 0) {
        this.worldContainer.removeChild(coin.sprite);
        coin.sprite.destroy();
        this.coinDrops.splice(i, 1);
      }
    }

    // Process Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (b.life !== undefined) {
        b.life -= dt;
        if (b.life <= 0) {
          if (b.sprite.parent) this.worldContainer.removeChild(b.sprite);
          if (!b.sprite.destroyed) b.sprite.destroy();
          this.bullets.splice(i, 1);
          continue;
        }
      }

      if ((b as any).isMelee) {
        const melee = b as any;
        const t = 1 - (b.life! / melee.maxLife);
        // Wider swing angle: 180 degrees
        const arc = Math.PI;
        // Ease out cubic
        const progress = 1 - Math.pow(1 - t, 3);

        // Add Math.PI / 2 because the SVG natively points UP instead of RIGHT
        b.sprite.rotation = melee.baseAngle + Math.PI / 2 - arc / 2 + progress * arc;

        // The render origin stays glued to the player's hand
        b.sprite.x = this.player.x;
        b.sprite.y = this.player.y - 12;

        b.vx = Math.cos(melee.baseAngle - arc / 2 + progress * arc) * 16;
        b.vy = Math.sin(melee.baseAngle - arc / 2 + progress * arc) * 16;

        // Particle trail from the tip (extended outwards by scale)
        if (Math.random() > 0.3) {
           const tipX = b.sprite.x + Math.cos(b.sprite.rotation - Math.PI/2) * 95;
           const tipY = b.sprite.y + Math.sin(b.sprite.rotation - Math.PI/2) * 95;
           this.spawnParticles(tipX, tipY, 0xcccccc, 1);
        }
      } else {
        b.sprite.x += b.vx * dt;
        b.sprite.y += b.vy * dt;

        // Bullet Wall/Prop Collision
        {
          // Check against meshes
          const pcx = Math.floor(b.sprite.x / CHUNK_PX);
          const pcy = Math.floor(b.sprite.y / CHUNK_PX);
          let collided = false;
          
          for (let cx = pcx - 1; cx <= pcx + 1; cx++) {
            for (let cy = pcy - 1; cy <= pcy + 1; cy++) {
              const chunk = this.chunks.get(`${cx},${cy}`);
              if (chunk && !collided) {
                for (const prop of chunk.props) {
                   if (prop.destroyed) continue;
                   // Bullet hits the "body" of the prop (center of visual width/height)
                   const propRadius = prop.width * 0.35;
                   const dx = b.sprite.x - prop.x;
                   const dy = b.sprite.y - (prop.y - prop.height * 0.4); // Target center of mass
                   if (dx*dx + dy*dy < (10 + propRadius) * (10 + propRadius)) {
                      b.life = 0; // Destroy bullet
                      collided = true;
                      
                      if (!b.isEnemy) {
                         if ((prop as any).texture === this.mapTextures.crate) {
                            // Find and damage crate
                            for (let d = this.destructibles.length - 1; d >= 0; d--) {
                               const crate = this.destructibles[d];
                               if (crate.sprite === prop) {
                                  crate.hp -= this.playerDmg;
                                  this.playSound('hit');
                                  this.spawnParticles(crate.sprite.x, crate.sprite.y - 30, 0xddaa55, 5); // Wood splinters
                                  
                                  if (crate.hp <= 0) {
                                     const px = prop.x;
                                     const py = prop.y;
                                     
                                     this.obstacleCells.delete(`${crate.x},${crate.y}`);
                                     this.worldContainer.removeChild(crate.sprite);
                                     crate.sprite.destroy();
                                     if (crate.shadow) {
                                        this.worldContainer.removeChild(crate.shadow);
                                        crate.shadow.destroy();
                                     }
                                     this.destructibles.splice(d, 1);
                                     
                                     const propIdx = chunk.props.indexOf(prop);
                                     if (propIdx >= 0) chunk.props.splice(propIdx, 1);
                                     
                                     this.playSound('kill');
                                     if (Math.random() < 0.25) {
                                        const coinSprite = new Sprite(this.coinTexture);
                                        coinSprite.anchor.set(0.5, 0.5); coinSprite.scale.set(0.15);
                                        coinSprite.x = px; coinSprite.y = py; coinSprite.zIndex = py;
                                        this.worldContainer.addChild(coinSprite);
                                        this.coinDrops.push({ sprite: coinSprite, life: 600 });
                                     }
                                  }
                                  break;
                               }
                            }
                         } else {
                            // Hit indestructible rock or tree
                            this.spawnParticles(b.sprite.x, b.sprite.y, 0x888888, 4);
                         }
                      }
                      break;
                   }
                }
              }
            }
          }
        }
      }
      b.sprite.zIndex = b.sprite.y;

      let hit = false;

      if (b.isEnemy) {
        // Enemy bullet hitting player (center of mass radius 24)
        if (Math.hypot(b.sprite.x - this.player.x, b.sprite.y - (this.player.y - 24)) < 24 && !this.isInvulnerable) {
          hit = true;
          this.playerHP -= 2;
          this.isInvulnerable = true;
          this.invulnerableTimer = 60;
          if (this.playerHP <= 0) this.playSound('death');
          else this.playSound('hit');
        }
      } else {
        // Player bullet hitting monsters
        for (let j = this.monsters.length - 1; j >= 0; j--) {
          const monster = this.monsters[j];
          
          let hitMelee = false;
          let hitRanged = false;

          if ((b as any).isMelee) {
             const mDist = Math.hypot(this.player.x - monster.x, (this.player.y - 12) - (monster.y - 24));
             if (mDist < 160) {
                 const mAngle = Math.atan2((monster.y - 24) - (this.player.y - 12), monster.x - this.player.x);
                 const bladeAngle = (b as any).sprite.rotation - Math.PI / 2;
                 let diff = Math.abs(mAngle - bladeAngle);
                 if (diff > Math.PI) diff = Math.PI * 2 - diff; // Normalize
                 if (diff <= 0.35) hitMelee = true; // Tight 40 degree sweeping wedge centered precisely on the moving blade
             }
          } else {
             if (Math.hypot(b.sprite.x - monster.x, b.sprite.y - (monster.y - 24)) < 40) hitRanged = true;
          }

          if (hitMelee || hitRanged) {
            // Melee checks to not damage same entity repeatedly
            if ((b as any).isMelee) {
               if ((b as any).hitSet && (b as any).hitSet.has(monster)) continue;
               if ((b as any).hitSet) (b as any).hitSet.add(monster);
            }

            hit = true;
            let finalDamage = activeStats ? activeStats.damage : this.playerDmg;
            if (activeStats?.type === 'melee') finalDamage += this.playerDmg * 0.5; // Scales a bit with levels

            (monster as any).hp -= finalDamage;
            this.playSound('hit');
            this.spawnParticles(b.sprite.x, b.sprite.y, 0xff0000, 5);

            const style = new TextStyle({
              fontFamily: "'CustomFont', Arial",
              fontSize: 24,
              fill: '#ffaa00',
              stroke: { color: '#550000', width: 4 },
              fontWeight: 'bold',
            });
            const dmgText = new Text({ text: Math.floor(finalDamage).toString(), style });
            dmgText.anchor.set(0.5, 0.5);
            dmgText.x = monster.x + (Math.random() * 20 - 10);
            dmgText.y = monster.y - 40;
            dmgText.zIndex = monster.y + 100;
            this.worldContainer.addChild(dmgText);
            this.damagePopups.push({ sprite: dmgText, life: 30 });

            if ((monster as any).hp <= 0) {
              this.playSound('kill');
              const isRanged = (monster as any).type === 'ranged';
              // Progression & Rewards
              const isTypedRanged = (monster as any).type === 'ranged';
              const expGain = isTypedRanged ? 1.5 : 1.0;
              this.gainExp(expGain);
              this.enemiesAlive--;
              {
                this.openWorldKills++;
              }
              this.dispatchState();

              if (Math.random() < 0.20) { // 20% drop chance
                const coinSprite = new Sprite(this.coinTexture);
                coinSprite.anchor.set(0.5, 0.5);
                coinSprite.scale.set(0.15);
                coinSprite.x = monster.x + (Math.random() * 40 - 20);
                coinSprite.y = monster.y - 12 + (Math.random() * 40 - 20);
                coinSprite.zIndex = monster.y;
                this.worldContainer.addChild(coinSprite);
                this.coinDrops.push({ sprite: coinSprite, life: 600 });
              }

              const textures = (monster as any).enemyTypeId ? this.getEnemyTexturesForType((monster as any).enemyTypeId) : (isRanged ? this.goblinBlueTextures : this.goblinTextures);
              const corpse = new Sprite(textures.dead1 ? textures.dead1[0] : textures.run[0]);
              corpse.anchor.set(0.5, 0.8125);
              corpse.scale.set(4);
              corpse.scale.x = monster.scale.x;
              corpse.x = monster.x;
              corpse.y = monster.y;
              corpse.zIndex = monster.y - 5;
              corpse.alpha = 0.8;
              (corpse as any).life = 180;
              (corpse as any).isRanged = isRanged;

              // Item Drop Logic
              if (Math.random() < 0.05) { // 5% chance
                const potionSprite = new Sprite(this.potionTexture);
                potionSprite.anchor.set(0.5, 0.5);
                potionSprite.scale.set(3);
                potionSprite.x = monster.x;
                potionSprite.y = monster.y - 12;
                potionSprite.zIndex = monster.y;
                this.worldContainer.addChild(potionSprite);
                this.droppedItems.push({ sprite: potionSprite, id: 'potion', count: 1 });
              }

              this.worldContainer.removeChild((monster as any).shadow);
              (monster as any).shadow.destroy();
              this.worldContainer.addChild(corpse);
              this.corpses.push(corpse);

              this.worldContainer.removeChild((monster as any).hpBar);
              (monster as any).hpBar.destroy();
              this.worldContainer.removeChild(monster);
              monster.destroy();
              this.monsters.splice(j, 1);
            }
            if (!(b as any).isMelee) break; // Pierce indefinitely if it is a melee attack!
          }
        }
        
        // Melee destructible barrel tracking
        if ((b as any).isMelee) {
          for (let d = this.destructibles.length - 1; d >= 0; d--) {
            const crate = this.destructibles[d];
            if (!crate.sprite || crate.sprite.destroyed) {
              this.destructibles.splice(d, 1);
              continue;
            }
            const mDist = Math.hypot(this.player.x - crate.sprite.x, (this.player.y - 12) - (crate.sprite.y - crate.sprite.height * 0.4));
            if (mDist < 160) {
              const mAngle = Math.atan2((crate.sprite.y - crate.sprite.height * 0.4) - (this.player.y - 12), crate.sprite.x - this.player.x);
              let bladeAngle = (b as any).sprite.rotation - Math.PI / 2;
              let diff = Math.abs(mAngle - bladeAngle);
              if (diff > Math.PI) diff = Math.PI * 2 - diff; // Normalize
              
              if (diff <= 0.45) { // Solid 50 degree sweep threshold
                 if ((b as any).hitSet && (b as any).hitSet.has(crate)) continue;
                 if ((b as any).hitSet) (b as any).hitSet.add(crate);
                 
                 crate.hp -= (activeStats ? activeStats.damage : this.playerDmg);
                 this.playSound('hit');
                 this.spawnParticles(crate.sprite.x, crate.sprite.y - 30, 0xddaa55, 5); // Wood splinters

                 if (crate.hp <= 0) {
                   const cx = crate.sprite.x;
                   const cy = crate.sprite.y;

                   this.obstacleCells.delete(`${crate.x},${crate.y}`);
                   this.worldContainer.removeChild(crate.sprite);
                   crate.sprite.destroy();
                   if (crate.shadow) {
                      this.worldContainer.removeChild(crate.shadow);
                      crate.shadow.destroy();
                   }
                   this.destructibles.splice(d, 1);
                   
                   // also remove from chunk.props
                   const pcx = Math.floor(cx / CHUNK_PX);
                   const pcy = Math.floor(cy / CHUNK_PX);
                   const chunk = this.chunks.get(`${pcx},${pcy}`);
                   if (chunk) {
                      // We can't search by reference since it's destroyed, so we just filter out destroyed props
                      chunk.props = chunk.props.filter(p => !p.destroyed);
                   }
                   
                   this.playSound('kill');

                   // 25% chance to drop coin
                   if (Math.random() < 0.25) {
                      const coinSprite = new Sprite(this.coinTexture);
                      coinSprite.anchor.set(0.5, 0.5); coinSprite.scale.set(0.15);
                      coinSprite.x = cx; coinSprite.y = cy; coinSprite.zIndex = cy;
                      this.worldContainer.addChild(coinSprite);
                      this.coinDrops.push({ sprite: coinSprite, life: 600 });
                   }
                 }
              }
            }
          }
        }
      }

      // Remove bullet if hit or leaves the screen
      const offScreen = Math.abs(b.sprite.x - this.player.x) > halfW || Math.abs(b.sprite.y - this.player.y) > halfH;
      const shouldDestroy = (!(b as any).isMelee && hit) || offScreen;
      
      if (shouldDestroy) {
        this.worldContainer.removeChild(b.sprite);
        b.sprite.destroy();
        this.bullets.splice(i, 1);
      }
    }

    // Process Monsters
    const monsterSpeed = 2 * dt;
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const monster = this.monsters[i];
      monster.zIndex = monster.y;

      // Tracking shadow floor position
      (monster as any).shadow.x = monster.x;
      (monster as any).shadow.y = monster.y;

      if ((monster as any).isSpawning) {
        (monster as any).spawnTimer -= dt;
        const prog = 1 - ((monster as any).spawnTimer / 15); // Snappy 0.25s animation
        const bounce = Math.sin(prog * Math.PI) * 0.5 + prog; // Exaggerated wobble curve

        monster.alpha = Math.min(1, prog * 2);
        monster.scale.set(bounce * 4);
        (monster as any).shadow.scale.set(Math.min(1, prog));

        if ((monster as any).spawnTimer <= 0) {
          (monster as any).isSpawning = false;
          monster.scale.set(4);
          monster.alpha = 1;
          (monster as any).shadow.scale.set(1);
        }
        continue; // Stop monster AI while spawning
      }

      // Animation ticks
      (monster as any).animTimer += dt * 0.15;
      const enemyTextures = (monster as any).enemyTypeId
        ? this.getEnemyTexturesForType((monster as any).enemyTypeId)
        : ((monster as any).type === 'ranged' ? this.goblinBlueTextures : this.goblinTextures);
      const frames = enemyTextures.run || [];
      if (frames.length > 0) {
        monster.texture = frames[Math.floor((monster as any).animTimer) % frames.length];
      }

      const trueAngle = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
      const dist = Math.hypot(this.player.x - monster.x, this.player.y - monster.y);

      let targetX = this.player.x;
      let targetY = this.player.y;
      const attackPattern = (monster as any).attackPattern || 'charge';
      const aggroRange = (monster as any).aggroRange || 400;
      const deaggroRange = (monster as any).deaggroRange || 600;
      const homeX = (monster as any).homeX || monster.x;
      const homeY = (monster as any).homeY || monster.y;

      // Open-world AI state machine
      if ((monster as any).aiState) {
        const aiState = (monster as any).aiState;

        if (aiState === 'idle') {
          targetX = monster.x; targetY = monster.y;
          (monster as any).stateTimer -= dt;
          if (dist < aggroRange) {
            (monster as any).aiState = 'chase';
          } else if ((monster as any).stateTimer <= 0) {
            (monster as any).aiState = 'patrol';
            (monster as any).patrolTargetX = homeX + (Math.random() - 0.5) * 400;
            (monster as any).patrolTargetY = homeY + (Math.random() - 0.5) * 400;
            (monster as any).stateTimer = 120 + Math.random() * 180;
          }
        } else if (aiState === 'patrol') {
          targetX = (monster as any).patrolTargetX;
          targetY = (monster as any).patrolTargetY;
          (monster as any).stateTimer -= dt;
          const distToPatrol = Math.hypot(targetX - monster.x, targetY - monster.y);
          if (dist < aggroRange) {
            (monster as any).aiState = 'chase';
          } else if (distToPatrol < 32 || (monster as any).stateTimer <= 0) {
            (monster as any).aiState = 'idle';
            (monster as any).stateTimer = 60 + Math.random() * 120;
          }
        } else if (aiState === 'chase') {
          targetX = this.player.x; targetY = this.player.y;
          if (dist > deaggroRange) {
            (monster as any).aiState = 'idle';
            (monster as any).stateTimer = 60;
            targetX = homeX; targetY = homeY;
          }

          // Attack patterns
          (monster as any).attackTimer -= dt;
          if ((monster as any).attackTimer <= 0 && dist < aggroRange) {
            (monster as any).attackTimer = (monster as any).attackCooldownMax || 120;

            if (attackPattern === 'slam') {
              // Brute: telegraph then AoE slam
              this.playSound('brute_slam');
              const tg = new Graphics().circle(0, 0, 80).fill({ color: 0xff0000, alpha: 0.2 }).stroke({ width: 2, color: 0xff0000 });
              tg.x = this.player.x; tg.y = this.player.y; tg.zIndex = -1;
              this.worldContainer.addChild(tg);
              this.telegraphs.push({ sprite: tg, life: 48, x: this.player.x, y: this.player.y, radius: 80, owner: monster });
              // After telegraph expires, nearby player takes damage (handled in telegraph update)

            } else if (attackPattern === 'spread_shot') {
              // Shaman: 3-bullet fan
              this.playSound('shaman_cast');
              for (let s = -1; s <= 1; s++) {
                const angle = trueAngle + s * 0.3;
                const ebullet = new Sprite(this.weaponTextures.ebullet);
                ebullet.anchor.set(0.5, 0.5); ebullet.scale.set(3);
                ebullet.x = monster.x; ebullet.y = monster.y - 24;
                ebullet.rotation = angle;
                this.worldContainer.addChild(ebullet);
                this.bullets.push({ sprite: ebullet, vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6, isEnemy: true });
              }

            } else if (attackPattern === 'fire_trail') {
              // Magma elemental: charge in a line + leave fire dots
              (monster as any).isCharging = true;
              (monster as any).chargeDir = { x: Math.cos(trueAngle), y: Math.sin(trueAngle) };
              (monster as any).stateTimer = 30; // Charge for 30 frames

            } else if (attackPattern === 'teleport') {
              // Wraith: teleport behind player
              if ((monster as any).teleportCooldown <= 0) {
                this.playSound('wraith_teleport');
                const behindAngle = trueAngle + Math.PI;
                monster.x = this.player.x + Math.cos(behindAngle) * 80;
                monster.y = this.player.y + Math.sin(behindAngle) * 80;
                monster.alpha = 0.5;
                (monster as any).teleportCooldown = 180;
                (monster as any).attackTimer = 30; // Quick strike after teleport
              }

            } else if (attackPattern === 'rock_throw') {
              // Golem: arcing projectile
              this.playSound('golem_stomp');
              const ebullet = new Sprite(this.mapTextures.rock[0]);
              ebullet.anchor.set(0.5, 0.5); ebullet.scale.set(2);
              ebullet.x = monster.x; ebullet.y = monster.y - 40;
              ebullet.rotation = trueAngle;
              this.worldContainer.addChild(ebullet);
              this.bullets.push({ sprite: ebullet, vx: Math.cos(trueAngle) * 5, vy: Math.sin(trueAngle) * 5, isEnemy: true });

            } else {
              // Default charge/melee - no projectile
            }
          }
        }

        // Handle charge movement for magma elemental
        if ((monster as any).isCharging) {
          (monster as any).stateTimer -= dt;
          const cd = (monster as any).chargeDir;
          monster.x += cd.x * 6 * dt;
          monster.y += cd.y * 6 * dt;

          // Leave fire trail
          if (Math.random() > 0.5) {
            const ft = new Sprite(this.mapTextures.fire_trail);
            ft.anchor.set(0.5); ft.scale.set(3);
            ft.x = monster.x; ft.y = monster.y;
            ft.zIndex = -1; ft.alpha = 0.8;
            this.worldContainer.addChild(ft);
            this.fireTrails.push({ sprite: ft, life: 300 });
          }

          if ((monster as any).stateTimer <= 0) {
            (monster as any).isCharging = false;
          }
          // Skip normal movement during charge
        }

        // Wraith fade-in after teleport
        if ((monster as any).teleportCooldown > 0) {
          (monster as any).teleportCooldown -= dt;
          if (monster.alpha < 1) monster.alpha = Math.min(1, monster.alpha + 0.03);
        }

      } else if ((monster as any).type === 'ranged') {
        // Orbit logic
        if (!(monster as any).orbitDir) (monster as any).orbitDir = Math.random() > 0.5 ? 1 : -1;

        if (dist < 200) {
          targetX = monster.x - Math.cos(trueAngle) * 50;
          targetY = monster.y - Math.sin(trueAngle) * 50;
        } else if (dist < 400) {
          const tangent = trueAngle + (Math.PI / 2) * (monster as any).orbitDir;
          targetX = monster.x + Math.cos(tangent) * 100;
          targetY = monster.y + Math.sin(tangent) * 100;
        }

        // Attack logic
        (monster as any).attackTimer -= dt;
        if ((monster as any).attackTimer <= 0 && dist < 450) {
          (monster as any).attackTimer = 90 + Math.random() * 60; // shoot ~every 1.5 to 2.5s

          const ebullet = new Sprite(this.weaponTextures.ebullet);
          ebullet.anchor.set(0.5, 0.5);
          ebullet.scale.set(3);
          ebullet.x = monster.x;
          ebullet.y = monster.y - 24;

          const spread = (Math.random() - 0.5) * 0.6; // Moderate spread
          const angle = Math.atan2(this.player.y - 24 - ebullet.y, this.player.x - ebullet.x) + spread;
          ebullet.rotation = angle;

          this.worldContainer.addChild(ebullet);
          this.bullets.push({ sprite: ebullet, vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8, isEnemy: true });
        }
      }

      // Boids separation
      let sepX = 0;
      let sepY = 0;
      for (const other of this.monsters) {
        if (other === monster) continue;
        const d = Math.hypot(other.x - monster.x, other.y - monster.y);
        if (d < 64 && d > 0) {
          const force = (64 - d) / 32; // Inversely proportional to distance
          sepX += ((monster.x - other.x) / d) * force;
          sepY += ((monster.y - other.y) / d) * force;
        }
      }

      let moveDirX = targetX - monster.x;
      let moveDirY = targetY - monster.y;
      const mag = Math.hypot(moveDirX, moveDirY);
      if (mag > 0.001) { moveDirX /= mag; moveDirY /= mag; }

      moveDirX += sepX * 2.5;
      moveDirY += sepY * 2.5;

      const finalMag = Math.hypot(moveDirX, moveDirY);
      if (finalMag > 0.001) { moveDirX /= finalMag; moveDirY /= finalMag; }

      // Keep monster inside
      const mNextX = monster.x + moveDirX * monsterSpeed;
      const mNextY = monster.y + moveDirY * monsterSpeed * 0.75;


        const mRadius = 24;
        const checkMCollision = (px: number, py: number) => {
          // 1. Check Floor Bounds & Water
          const minCX = Math.floor((px - mRadius) / TILE_PX);
          const maxCX = Math.floor((px + mRadius) / TILE_PX);
          const minCY = Math.floor((py - mRadius) / TILE_PX);
          const maxCY = Math.floor((py + mRadius) / TILE_PX);
          for (let x = minCX; x <= maxCX; x++) {
            for (let y = minCY; y <= maxCY; y++) {
              if (!this.floorCells.has(`${x},${y}`)) return true; // Hitting solid wall boundary
              if (this.waterCells.has(`${x},${y}`)) return true; // Hard obstacle collision
            }
          }
          
          // 2. Prop Mesh Collision
          const pcx = Math.floor(px / CHUNK_PX);
          const pcy = Math.floor(py / CHUNK_PX);
          for (let cx = pcx - 1; cx <= pcx + 1; cx++) {
            for (let cy = pcy - 1; cy <= pcy + 1; cy++) {
              const chunk = this.chunks.get(`${cx},${cy}`);
              if (chunk) {
                for (const prop of chunk.props) {
                  if (prop.destroyed) continue;
                  const propRadius = prop.width * 0.25;
                  const dx = px - prop.x;
                  const dy = py - prop.y; // prop.y is exactly at its base
                  if (dx*dx + dy*dy < (mRadius + propRadius) * (mRadius + propRadius)) {
                    return true;
                  }
                }
              }
            }
          }
          return false;
        };

        if (!checkMCollision(mNextX, monster.y)) {
          monster.x = mNextX;
        }
        if (!checkMCollision(monster.x, mNextY)) {
          monster.y = mNextY;
        }


      // Flip monster sprite based on true angle
      if (Math.cos(trueAngle) < 0) monster.scale.x = -4;
      else monster.scale.x = 4;

      // Collision detection with player
      // Tighten player hitbox to 24 pixels from center of body collision instead of feet
      if (Math.hypot(this.player.x - monster.x, (this.player.y - 24) - (monster.y - 24)) < 24 && !this.isInvulnerable) {
        this.playerHP -= 2;
        this.isInvulnerable = true;
        this.invulnerableTimer = 60; // Represents roughly 1 second at 60 FPS
        if (this.playerHP <= 0) this.playSound('death');
        else this.playSound('hit');
      }

      // Update Enemy HP Bar
      const hpBar = (monster as any).hpBar as Graphics;
      if ((monster as any).hp < (monster as any).maxHp && (monster as any).hp > 0) {
        hpBar.visible = true;
        hpBar.clear();
        const width = 40;
        const height = 4;
        hpBar.rect(monster.x - width / 2, monster.y - 60, width, height).fill(0x330000);
        hpBar.rect(monster.x - width / 2, monster.y - 60, width * ((monster as any).hp / (monster as any).maxHp), height).fill(0x00ff00);
      } else {
        hpBar.visible = false;
      }
    }

    // Handle iFrames (invulnerability wrapper)
    if (this.isInvulnerable) {
      this.invulnerableTimer -= dt;
      // Flicker effect
      this.player.alpha = (Math.floor(this.invulnerableTimer / 5) % 2 === 0) ? 0.3 : 1;
      if (this.invulnerableTimer <= 0) {
        this.isInvulnerable = false;
        this.player.alpha = 1;
      }
    }

    // Y-sorting fix: Assign zIndex natively AFTER movement transforms
    this.player.zIndex = this.player.y;
    this.gunSprite.zIndex = this.player.y + 1; // Locked strictly unconditionally above player

    // Update Explored Footprint (3x3 grid around player)

      const epx = Math.round(this.player.x / 64);
      const epy = Math.round(this.player.y / 64);
      for (let ox = -2; ox <= 2; ox++) {
        for (let oy = -2; oy <= 2; oy++) {
          const key = `${epx + ox},${epy + oy}`;
          if (this.floorCells.has(key)) {
            this.exploredCells.add(key);
          }
        }
      }
      this.updateMinimap();


    for (const monster of this.monsters) {
      monster.zIndex = monster.y;
    }
    // Also rank bullets
    for (const b of this.bullets) b.sprite.zIndex = b.sprite.y + 10;

    this.updateCamera(dt);
  }

  private updateCamera(dt: number) {
    // Camera Tracking (Lerped with Look-ahead)
    const screenCenter = { x: this.app.screen.width / 2, y: this.app.screen.height / 2 };
    
    // Adjust camera to look less wide and more centered on the player
    this.worldContainer.scale.set(1.5); // Zoom in
    
    // Smoothly transition the look-ahead amount to avoid stuttering teleports
    const targetLookAheadAmount = this.isAiming ? 0.35 : 0.05;
    if (!this.currentLookAheadAmount) this.currentLookAheadAmount = 0.05;
    this.currentLookAheadAmount += (targetLookAheadAmount - this.currentLookAheadAmount) * (1 - Math.pow(0.85, dt));

    // Convert the screen pixel offset into world units by dividing by the 1.5 scale
    const lookAheadX = ((this.mouseX - screenCenter.x) / 1.5) * this.currentLookAheadAmount;
    const lookAheadY = ((this.mouseY - screenCenter.y) / 1.5) * this.currentLookAheadAmount;
    
    const targetCamX = this.player.x + lookAheadX;
    const targetCamY = this.player.y - 24 + lookAheadY;
    
    const camSpeed = this.isAiming ? 0.82 : 0.88; // slightly slower when aiming for cinematic feel
    const camBlend = 1 - Math.pow(camSpeed, dt);
    this.cameraX += (targetCamX - this.cameraX) * camBlend;
    this.cameraY += (targetCamY - this.cameraY) * camBlend;

    this.worldContainer.x = screenCenter.x - (this.cameraX * 1.5);
    this.worldContainer.y = screenCenter.y - (this.cameraY * 1.5);

    // Update Vignette
    if (this.vignette) {
      this.vignette.width = this.app.screen.width;
      this.vignette.height = this.app.screen.height;
      const targetVignetteAlpha = this.isAiming ? 1.0 : 0.0;
      this.vignette.alpha += (targetVignetteAlpha - this.vignette.alpha) * 0.1 * dt;
    }

    // Update Minimap UI Position in case screen resized
    if (this.minimapContainer) {
      this.minimapContainer.x = this.app.screen.width - 220;
      this.minimapContainer.y = 20;
    }
  }

  private updateMinimap() {
    if (!this.minimapGraphics) return;

    this.minimapGraphics.clear();
    
    const size = 200;
    const halfSize = size / 2;
    const scale = 4; // pixels per tile
    const viewTiles = Math.ceil(halfSize / scale); // Only check tiles visible on minimap

    // Background
    this.minimapGraphics.circle(halfSize, halfSize, halfSize).fill({ color: 0x111118, alpha: 0.85 });

    // Draw explored cells — only scan the visible range instead of all explored cells
    const px = Math.floor(this.player.x / TILE_PX);
    const py = Math.floor(this.player.y / TILE_PX);

    for (let tx = px - viewTiles; tx <= px + viewTiles; tx++) {
      for (let ty = py - viewTiles; ty <= py + viewTiles; ty++) {
        const dx = (tx - px) * scale + halfSize;
        const dy = (ty - py) * scale + halfSize;
        
        // Circular clipping
        if (Math.hypot(dx - halfSize, dy - halfSize) > halfSize - 4) continue;
        
        const key = `${tx},${ty}`;
        if (this.exploredCells.has(key)) {
          const isObstacle = this.obstacleCells.has(key);
          const biome = this.getBiomeAt(tx, ty);
          let mColor = biome === 0 ? 0x3a5f30 : biome === 1 ? 0x5c2b2b : 0x2a2a44;
          if (isObstacle) mColor = 0x222222;
          
          this.minimapGraphics.rect(dx, dy, scale, scale).fill(mColor);
        }
      }
    }
    
    // Fancy Border
    this.minimapGraphics.circle(halfSize, halfSize, halfSize).stroke({ width: 4, color: 0xcfb53b, alpha: 0.8 });

    // Draw artifact markers on minimap
    for (const loc of this.artifactLocations) {
      if (loc.collected) continue;
      const ax = loc.cx * CHUNK_SIZE + CHUNK_SIZE / 2;
      const ay = loc.cy * CHUNK_SIZE + CHUNK_SIZE / 2;
      const adx = (ax - px) * scale + halfSize;
      const ady = (ay - py) * scale + halfSize;
      if (adx >= 0 && adx < size && ady >= 0 && ady < size) {
        this.minimapGraphics.circle(adx, ady, 3).fill(0xFFD700);
      }
    }

    // Draw Player dot
    this.minimapGraphics.rect(halfSize - scale/2, halfSize - scale/2, scale, scale).fill(0xffffff);
  }

  public getPlayerHP() {
    return this.playerHP;
  }

  public destroy() {
    this.destroyed = true;
    if (GameManager.activeInstance === this) GameManager.activeInstance = null;
    window.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('inventory-swap', this.handleSwap);
    window.removeEventListener('inventory-close', this.handleClose);
    window.removeEventListener('slot-change', this.handleSlotChange);
    if (this.spawnInterval) clearInterval(this.spawnInterval);
    try { this.app.destroy(true, { children: true }); } catch (e) { }
  }
}
