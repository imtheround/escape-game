import { PlotManager } from './PlotManager';
import { Howl } from 'howler';
import { Application, Container, Sprite, Texture, Assets, Graphics, Text, TextStyle, TilingSprite, DisplacementFilter, BlurFilter, RenderTexture } from 'pixi.js';
import { SkeletonEnemy, EnemyArchetype } from './SkeletonEnemy';
import { WeaponStats, WeaponRegistry } from './WeaponSystem';
import { DungeonGenerator, DungeonRoom } from './DungeonGenerator';
import { SoundManager } from './SoundManager';

// =============================================
// SIMPLEX NOISE (2D) — Inline implementation
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

interface DungeonDoor {
  tx: number;
  ty: number;
  dir: 'h' | 'v';
  sprite: Sprite | null;
}


export class GameManager {
  public plotManager: PlotManager = new PlotManager();
  private static activeInstance: GameManager | null = null;
  private destroyed = false;
  private app: Application;
  private worldContainer: Container;
  private player!: Sprite;
  private monsters: any[] = [];
  private bullets: { sprite: Sprite | Container, vx: number, vy: number, isEnemy: boolean, life?: number }[] = [];
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
  public inventory: { id: string, count: number, ammo?: number }[] = [];
  public activeSlot: number = -1;
  public isInventoryOpen: boolean = false;
  public isSettingsOpen: boolean = false;

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
  // Player State
  private _playerHP = 10;
  public get playerHP(): number {
    return this._playerHP;
  }
  public set playerHP(val: number) {
    let nextHP = val;
    // 1HP safety net during tutorial Step 11 (combat arena grunts fight)
    if (this.tutorialStep === 11 && nextHP <= 0 && this._playerHP > 0) {
      nextHP = 1;
      this.isInvulnerable = true;
      this.invulnerableTimer = 90;
      
      const style = new TextStyle({
        fontFamily: "'CustomFont', Arial",
        fontSize: 24,
        fill: '#ff0055',
        stroke: { color: '#000000', width: 4 },
        fontWeight: 'bold'
      });
      const popText = new Text({ text: "INTEGRITY SHIELD ENGAGED", style });
      popText.anchor.set(0.5);
      popText.x = this.player.x;
      popText.y = this.player.y - 80;
      popText.zIndex = this.player.y + 100;
      this.worldContainer.addChild(popText);
      this.damagePopups.push({ sprite: popText, life: 60 });
    }
    this._playerHP = nextHP;
    window.dispatchEvent(new CustomEvent('hp-change', { detail: this._playerHP }));
    this.dispatchState();
  }
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
  public basePlayerSpeed: number = 8;

  public endgameTimer: number = -1;
  public isEndgameActive: boolean = false;
  private hasSpawnedEndgamePortal: boolean = false;

  private merchantSprite: Sprite | null = null;
  private portalSprite: Sprite | null = null;
  private coinDrops: { sprite: Sprite, life: number }[] = [];
  private expDrops: { sprite: Graphics, life: number }[] = [];
  private trailParticles: { sprite: Graphics, targetX: number, speed: number, life: number }[] = [];
  private hitStopFrames: number = 0;

  // Upgrade Modifiers
  public upgrades = {
    vampirism: false,
    piercing_rounds: false,
    bouncy_bullets: false,
    heavy_caliber: false,
    agile: false,
    looter: false,
    tactical_roll: false,
    rapid_fire: false,
    quick_draw: false
  };

  public applyUpgrade(upgradeId: string) {
     SoundManager.getInstance().playSound('pickup');
     if (upgradeId === 'vitality') {
        this.playerMaxHP += 4;
        this.playerHP += 4;
     } else if (upgradeId === 'stamina_surge') {
        this.maxStamina += 50;
        this.stamina += 50;
     } else if (upgradeId === 'quick_draw') {
        // Handled in reload logic (need to add modifier there)
     } else if (upgradeId === 'rapid_fire') {
        // Handled in shooting logic
     } else if (upgradeId === 'tactical_roll') {
        // Handled in rolling logic
     } else {
        (this.upgrades as any)[upgradeId] = true;
     }
     this.hitStopFrames = 0; // Resume game
     this.dispatchState();
  }

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
  private destructibles: any[] = [];
  private chunks = new Map<string, ChunkData>();
  private allProps: any[] = [];
  private lightMask!: Graphics;
  private worldRenderTexture!: RenderTexture;
  private darkWorldSprite!: Sprite;
  private sharpWorldSprite!: Sprite;
  private maskContainer!: Container;
  private mapContainer!: Container;
  private dungeonChests: { sprite: Sprite, tx: number, ty: number, opened: boolean }[] = [];
  private spawnPoints: SpawnPoint[] = [];
  private openWorldKills = 0;
  private portalSpawned = false;
  private fireTrails: { sprite: Sprite, life: number }[] = [];
  private telegraphs: { sprite: Graphics, life: number, x: number, y: number, radius: number, owner: Sprite | null }[] = [];
  private ambientParticles: { sprite: Graphics, vx: number, vy: number, life: number, maxLife: number, rotSpeed: number }[] = [];
  private frameCount = 0;
  
  private environmentSprites: Sprite[] = [];
  private activeRoomId: number = -1;
  private activeRoomEnemies: number = 0;

  // 2.5D Procedural Environment
  private floorGraphics!: Graphics;
  private staticFloorGraphics!: Graphics;
  private wallGraphicsBack!: Graphics;
  private wallGraphicsFront!: Graphics;
  private lightConeTex!: Texture;
  private torches: { x: number, y: number }[] = [];

  // New enemy texture maps
  private bruteTextures: Record<string, Texture[]> = {};
  private shamanTextures: Record<string, Texture[]> = {};
  private magmaTextures: Record<string, Texture[]> = {};
  private wraithTextures: Record<string, Texture[]> = {};
  private golemTextures: Record<string, Texture[]> = {};

  public currentDungeonWorld = 1;
  private currentDungeonStage = 1;

  public tutorialStep: number = 0;
  public tutorialProgress: number = 0;
  public tutorialTaskCompleted: boolean = false;
  public tutorialDelayTimer: number = 0;

  // Tutorial tracking objectives
  public hasMoved = false;
  public hasSprinted = false;
  public hasRolled = false;
  public hasAimed = false;
  public hasFired = false;
  private hasReloaded = false;
  private spaceReleased = true;
  private shadowAngle = 0;
  
  private dispatchTutorial() {
     window.dispatchEvent(new CustomEvent('tutorial-step', { 
         detail: { 
             step: this.tutorialStep, 
             progress: this.tutorialProgress, 
             completed: this.tutorialTaskCompleted 
         } 
     }));
  }

  private advanceTutorialStep() {
      this.tutorialStep++;
      this.tutorialProgress = 0;
      this.tutorialTaskCompleted = false;
      this.tutorialDelayTimer = 0;
      this.dispatchTutorial();
  }

  // Dungeon Room State
  private dungeonRooms: DungeonRoom[] = [];
  private currentRoomIndex: number = -1;
  private dungeonTiles: Record<string, string> = {};
  private dungeonGridWidth = 128;
  private dungeonGridHeight = 128;
  private gatekeeperDefeated = false;

  // Artifact Quest System
  public artifactsCollected: number = 0;
  public totalArtifactsNeeded: number = 3;
  private artifactLocations: {cx: number, cy: number, collected: boolean, sprite: Sprite | null, type: string}[] = [];
  private sonarTimer = 0;

  private playerShadow!: Graphics;
  private minimapGraphics!: Graphics;
  private minimapContainer!: Container;
  private particles: { sprite: Sprite, vx: number, vy: number, vz: number, z: number, life: number, maxLife: number }[] = [];
  private crosshair!: Graphics;
  private shakeAmount: number = 0;
  private heatFilter!: DisplacementFilter;
  private heatFilterSprite!: Sprite;

  private vignette!: Sprite;
  private ambientContainer!: Container;

  private spawnParticles(x: number, y: number, color: number, count: number, isDash: boolean = false) {
    if (this.particles.length >= 100) return; // Hard cap to prevent GPU overload
    for (let i = 0; i < count; i++) {
      // Use discrete pixel sizes for chunky retro look
      const size = isDash ? 4 : Math.floor(3 + Math.random() * 5); 
      const p = new Graphics().rect(-size, -size, size * 2, size * 2).fill(color);
      p.x = x; p.y = y; p.zIndex = y + 10;
      // Add slight random rotation restricted to 90 degree increments for strict pixel alignment
      p.rotation = Math.floor(Math.random() * 4) * (Math.PI / 2);
      this.worldContainer.addChild(p);
      const angle = Math.random() * Math.PI * 2;
      const speed = isDash ? Math.random() * 2 : Math.random() * 8 + 4;
      const life = isDash ? 10 + Math.random()*10 : 30 + Math.random()*30;
      const vz = isDash ? 0 : -3 - Math.random() * 5; // Jump up initially
      this.particles.push({ sprite: p as any, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, vz: vz, z: 0, life: life, maxLife: life });
    }
  }

  private lastDispatchTime = 0;
  private dispatchPending = false;

  // Custom Events Dispatcher Helper
  // CRITICAL: Deep-clone every slot so React sees new object references
  private dispatchState(force: boolean = false) {
    const now = performance.now();
    if (force || now - this.lastDispatchTime > 66) {
        this.actuallyDispatchState();
        this.lastDispatchTime = performance.now();
        this.dispatchPending = false;
    } else if (!this.dispatchPending) {
        this.dispatchPending = true;
        setTimeout(() => {
            if (!this.destroyed) {
                this.actuallyDispatchState();
                this.lastDispatchTime = performance.now();
                this.dispatchPending = false;
            }
        }, 66 - (now - this.lastDispatchTime));
    }
  }

  public buyItem(itemId: string) {
    let cost = 0;
    if (itemId === 'potion') cost = 3;
    else if (itemId === 'machine_gun') cost = 5;
    else if (itemId === 'shotgun') cost = 10;
    else return;

    if (this.coins < cost) {
      SoundManager.getInstance().playSound('empty_click');
      return;
    }

    this.coins -= cost;
    const stats = WeaponRegistry[itemId];
    const startAmmo = stats ? stats.maxAmmo : undefined;

    if (itemId === 'potion') {
      const existingSlot = this.inventory.findIndex(inv => inv.id === 'potion');
      if (existingSlot !== -1) {
        this.inventory[existingSlot].count += 1;
      } else {
        const emptySlot = this.inventory.findIndex(inv => inv.id === '');
        if (emptySlot !== -1) {
          this.inventory[emptySlot] = { id: 'potion', count: 1, ammo: undefined };
        } else {
          this.inventory.push({ id: 'potion', count: 1, ammo: undefined });
        }
      }
    } else {
      // Weapons
      const emptySlot = this.inventory.findIndex(inv => inv.id === '');
      let newSlotIdx = -1;
      if (emptySlot !== -1) {
        this.inventory[emptySlot] = { id: itemId, count: 1, ammo: startAmmo };
        newSlotIdx = emptySlot;
      } else {
        this.inventory.push({ id: itemId, count: 1, ammo: startAmmo });
        newSlotIdx = this.inventory.length - 1;
      }
      this.activeSlot = newSlotIdx;
    }

    SoundManager.getInstance().playSound('pickup');
    this.dispatchState();
  }

  private actuallyDispatchState() {
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
    const stats = activeInv ? WeaponRegistry[activeInv.id] : undefined;
    window.dispatchEvent(new CustomEvent('ammo-change', {
      detail: { ammo: activeInv?.ammo || 0, maxAmmo: stats?.maxAmmo || 0, isReloading: this.isReloading }
    }));
    window.dispatchEvent(new CustomEvent('wave-change', {
      detail: {
        gameState: this.gameState,
        merchantTimer: this.merchantTimer,
        world: this.currentDungeonWorld,
        stage: this.currentDungeonStage,
        openWorldKills: this.openWorldKills,
        totalArtifactsNeeded: this.totalArtifactsNeeded
      }
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

  private lightMaskTexture!: RenderTexture;
  private lightMaskSprite!: Sprite;
  private lightGradientTex!: Texture;
  private isMapOpen: boolean = false;

  public async init(container: HTMLElement) {
    // Kill any previous instance to prevent StrictMode double-mount flickering
    if (GameManager.activeInstance && GameManager.activeInstance !== this) {
      GameManager.activeInstance.destroy();
    }
    GameManager.activeInstance = this;

    // 1. Initialize PixiJS
    await this.app.init({
      resizeTo: container,
      backgroundColor: 0x000000,
      antialias: false,
      resolution: window.devicePixelRatio || 1, // Capped at 1 for performance on low-end hardware
      autoDensity: true,
    });

    // If destroyed while awaiting init, abort
    if (this.destroyed) return;

    container.appendChild(this.app.canvas);

    // Create radial gradient texture for soft lighting
    const gradCanvas = document.createElement('canvas');
    gradCanvas.width = 512; gradCanvas.height = 512;
    const ctx = gradCanvas.getContext('2d')!;
    const grd = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 512, 512);
    this.lightGradientTex = Texture.from(gradCanvas);

    // Create soft cone texture for directional flashlight
    const coneCanvas = document.createElement('canvas');
    coneCanvas.width = 1024; coneCanvas.height = 1024;
    const cCtx = coneCanvas.getContext('2d')!;
    const cGrd = cCtx.createRadialGradient(512, 512, 0, 512, 512, 512);
    cGrd.addColorStop(0, 'rgba(255,255,255,1)');
    cGrd.addColorStop(1, 'rgba(255,255,255,0)');
    cCtx.fillStyle = cGrd;
    for (let i = 0; i < 40; i++) {
        const angleSpan = (Math.PI / 2) * (1 - i/40);
        cCtx.beginPath();
        cCtx.moveTo(512, 512);
        cCtx.arc(512, 512, 512, -angleSpan/2, angleSpan/2);
        cCtx.globalAlpha = 0.05;
        cCtx.fill();
    }
    this.lightConeTex = Texture.from(coneCanvas);

    // 2. Load Assets

    await this.loadAssets();

    // 2.5D Environment Graphics
    this.floorGraphics = new Graphics();
    this.floorGraphics.zIndex = -100000;
    this.staticFloorGraphics = new Graphics();
    this.staticFloorGraphics.zIndex = -100001;
    this.worldContainer.addChild(this.staticFloorGraphics);
    this.worldContainer.addChild(this.floorGraphics);

    this.wallGraphicsBack = new Graphics();
    this.wallGraphicsBack.zIndex = -50000;
    this.worldContainer.addChild(this.wallGraphicsBack);

    this.wallGraphicsFront = new Graphics();
    this.wallGraphicsFront.zIndex = 50000;
    this.worldContainer.addChild(this.wallGraphicsFront);

    // Setup RenderTexture dual-pass lighting architecture
    // worldContainer is NOT added to stage; it's rendered offscreen to a RenderTexture each frame
    this.worldRenderTexture = RenderTexture.create({
      width: this.app.screen.width,
      height: this.app.screen.height,
      antialias: false,
      resolution: this.app.renderer.resolution,
    });
    this.worldRenderTexture.source.scaleMode = 'nearest';

    // Dark layer: shows entire world dimmed
    this.darkWorldSprite = new Sprite(this.worldRenderTexture);
    this.darkWorldSprite.tint = 0x080808;
    this.app.stage.addChild(this.darkWorldSprite);

    // Sharp layer: shows lit areas at full brightness
    this.sharpWorldSprite = new Sprite(this.worldRenderTexture);
    this.app.stage.addChild(this.sharpWorldSprite);

    // Mask container (will be rendered to lightMaskTexture)
    this.maskContainer = new Container();
    this.maskContainer.filters = [new BlurFilter({ strength: 12 })];
    this.lightMaskTexture = RenderTexture.create({
      width: this.app.screen.width,
      height: this.app.screen.height,
      resolution: this.app.renderer.resolution,
    });
    this.lightMaskTexture.source.scaleMode = 'nearest';
    this.lightMaskSprite = new Sprite(this.lightMaskTexture);
    this.sharpWorldSprite.mask = this.lightMaskSprite;

    await this.setupPlayer();
    this.setupInput();
    SoundManager.getInstance().fetchBGM();

    this.dispatchState(); // Initial state dispatch
    SoundManager.getInstance().playSound('spawn');
    window.dispatchEvent(new CustomEvent('assets-loaded'));

    this.app.ticker.add((ticker) => {
      this.update(ticker.deltaTime);
    });
  }

  private handleVolumeChange = (e: any) => {
    SoundManager.getInstance().handleVolumeChange(e.detail);
  };

  private handleSkipTutorial = async () => {
    if (this.tutorialStep < 15) {
        this.tutorialStep = 15;
        this.tutorialTaskCompleted = true;
        this.inventory = [
           { id: 'gun', count: 1, ammo: WeaponRegistry['gun'].maxAmmo },
           { id: 'sword', count: 1, ammo: undefined },
           { id: '', count: 0 }
        ];
        this.activeSlot = 0;
        this.currentDungeonStage = 2;
        this.currentDungeonWorld = 1;
        this.playerHP = this.playerMaxHP;
        await this.initOpenWorld();
        this.player.x = 0;
        this.player.y = 0;
        if (this.portalSprite) {
           this.worldContainer.removeChild(this.portalSprite);
           this.portalSprite.destroy();
           this.portalSprite = null;
        }
        this.dispatchTutorial();
        this.dispatchState();
        this.isSettingsOpen = false;
        SoundManager.getInstance().playSound('close_inventory');
    }
  };

  private handleSettingsToggle = () => {
    this.isSettingsOpen = !this.isSettingsOpen;
    if (this.isSettingsOpen) SoundManager.getInstance().playSound('open_inventory');
    else SoundManager.getInstance().playSound('close_inventory');
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
    const generateTex = (graphics: Graphics) => {
      const tex = this.app.renderer.generateTexture({ target: graphics });
      graphics.destroy();
      return tex;
    };
    
    // Load biome-specific map textures
    this.mapTextures = {
      floor: [
        generateTex(this.createFloorGraphics(0, 0)),
        generateTex(this.createFloorGraphics(1, 0)),
        generateTex(this.createFloorGraphics(2, 0))
      ],
      customFloor: Array.from({length: 40}).map((_, i) => generateTex(this.createFloorGraphics(99, i))),
      wall_h: [
        generateTex(this.createWallGraphics(0, false)),
        generateTex(this.createWallGraphics(1, false)),
        generateTex(this.createWallGraphics(2, false))
      ],
      wall_v: [
        generateTex(this.createWallGraphics(0, true)),
        generateTex(this.createWallGraphics(1, true)),
        generateTex(this.createWallGraphics(2, true))
      ],
      rock: [await loadTex('/assets/map/rock.svg'), await loadTex('/assets/map/rock_desert.svg'), await loadTex('/assets/map/rock_ashen.svg')],
      fence: generateTex(this.createFenceGraphics()),
      portal: await loadTex('/assets/map/portal.svg'),
      crate: await loadTex('/assets/map/crate.svg'),
      bones: await loadTex('/assets/map/bones.svg'),
      web: await loadTex('/assets/map/web.svg'),
      tree1: await loadTex('/assets/modular/tree1.png'),
      tree2: await loadTex('/assets/modular/tree2.png'),
      tree3: await loadTex('/assets/modular/tree3.png'),
      tree4: await loadTex('/assets/modular/tree4.png'),
      tree5: await loadTex('/assets/modular/tree5.png'),
      water: await loadTex('/assets/map/water.svg'),
      lava: await loadTex('/assets/map/lava.svg'),
      fire_trail: await loadTex('/assets/map/fire_trail.svg'),
      telegraph: await loadTex('/assets/map/telegraph.svg'),
      relic_plains: await loadTex('/assets/map/relic_plains.svg'),
      relic_magma: await loadTex('/assets/map/relic_magma.svg'),
      relic_void: await loadTex('/assets/map/relic_void.svg'),
      shrine_floor: generateTex(this.createShrineFloorGraphics()),
      shrine_pillar: generateTex(this.createShrinePillarGraphics()),
      merchant_tent: await loadTex('/assets/map/merchant_tent.svg'),
      compass_arrow: await loadTex('/assets/map/compass_arrow.svg'),
      chest: generateTex(this.createChestGraphics(false)),
      chest_open: generateTex(this.createChestGraphics(true))
    };

    [this.potionTexture, this.coinTexture, this.merchantTexture, 
     ...this.mapTextures.floor, ...this.mapTextures.customFloor, ...this.mapTextures.wall_h, ...this.mapTextures.wall_v, ...this.mapTextures.rock, 
     this.mapTextures.fence, this.mapTextures.portal, this.mapTextures.crate, this.mapTextures.bones, this.mapTextures.web,
     this.mapTextures.tree1, this.mapTextures.tree2, this.mapTextures.water, this.mapTextures.lava, this.mapTextures.fire_trail, this.mapTextures.telegraph,
     this.mapTextures.relic_plains, this.mapTextures.relic_magma, this.mapTextures.relic_void,
     this.mapTextures.shrine_floor, this.mapTextures.shrine_pillar, this.mapTextures.merchant_tent, this.mapTextures.compass_arrow,
     this.mapTextures.chest, this.mapTextures.chest_open
    ].forEach(t => { if (t?.source) t.source.scaleMode = 'nearest'; });

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
    const activeWeaponId = this.inventory[this.activeSlot]?.id || '';
    const activeWeaponSprite = WeaponRegistry[activeWeaponId]?.spriteName || 'gun';
    this.gunSprite = new Sprite(this.weaponTextures[activeWeaponSprite] || this.weaponTextures['gun']);
    this.gunSprite.anchor.set(0.25, 0.5); // anchor roughly at the handle
    this.gunSprite.scale.set(3);
    if (activeWeaponId === '') this.gunSprite.visible = false;
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

    // Ambient Container (In world space, above ground but below UI)
    this.ambientContainer = new Container();
    this.ambientContainer.zIndex = -90000;
    this.worldContainer.addChild(this.ambientContainer);

    if (this.currentDungeonWorld === 1 && this.currentDungeonStage === 1) {
       this.tutorialStep = 0;
       this.tutorialProgress = 0;
       this.tutorialTaskCompleted = false;
       this.dispatchTutorial();
       this.triggerDialogueIfNeeded();
    }
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
      // Deprecated: ambient particle logic is now handled in the main update loop.
  }

  private generateDungeonLayout() {
    if (this.currentDungeonWorld === 1 && this.currentDungeonStage === 1) {
        DungeonGenerator.generateTutorialLayout(this.dungeonTiles, this.dungeonRooms);
    } else {
        const biome = this.getBiomeAt(0, 0); // Hack to get base biome
        DungeonGenerator.generateProceduralLayout(this.dungeonTiles, this.dungeonRooms, this.currentDungeonStage, biome);
    }
  }

  private async initOpenWorld() {
    window.dispatchEvent(new CustomEvent('generation-start'));
    await new Promise(r => setTimeout(r, 50));
    // FORCE CLEAR any stuck sessionStorage flags from previous bugs
    sessionStorage.removeItem('skipTutorial');

    this.dungeonTiles = {};
    this.dungeonRooms = [];
    this.floorCells.clear();
    
    this.obstacleCells.clear();
    this.waterCells.clear();
    this.propTypes.clear();
    this.exploredCells.clear();
    this.chunks.clear();

    // CLEAR ALL ACTIVE GAME OBJECTS
    for (const m of this.monsters) {
      if (m.sprite && !m.sprite.destroyed) {
        try { this.worldContainer.removeChild(m.sprite); m.sprite.destroy(); } catch(e){}
      }
    }
    this.monsters = [];

    for (const p of this.bullets) {
      if (p.sprite && !p.sprite.destroyed) {
        try { this.worldContainer.removeChild(p.sprite); p.sprite.destroy(); } catch(e){}
      }
    }
    this.bullets = [];

    for (const pt of this.particles) {
      if (pt.sprite && !pt.sprite.destroyed) {
        try { this.worldContainer.removeChild(pt.sprite); pt.sprite.destroy(); } catch(e){}
      }
    }
    this.particles = [];

    for (const di of this.droppedItems) {
      if (di.sprite && !di.sprite.destroyed) {
        try { this.worldContainer.removeChild(di.sprite); di.sprite.destroy(); } catch(e){}
      }
    }
    this.droppedItems = [];

    this.destructibles = [];
    this.allProps = [];
    this.torches = [];
    this.spawnPoints = [];
    this.openWorldKills = 0;
    this.portalSpawned = false;
    this.gatekeeperDefeated = false;
    this.isEndgameActive = false;
    this.endgameTimer = -1;
    this.hasSpawnedEndgamePortal = false;
    
    for (const sp of this.environmentSprites) {
        if (sp && !sp.destroyed) {
            try { this.worldContainer.removeChild(sp); sp.destroy(); } catch(e){}
        }
    }
    this.environmentSprites = [];
    
    for (const ch of this.dungeonChests) {
        if (ch.sprite && !ch.sprite.destroyed) {
            try { this.worldContainer.removeChild(ch.sprite); ch.sprite.destroy(); } catch(e){}
        }
    }
    this.dungeonChests = [];

    this.activeRoomId = -1;
    this.activeRoomEnemies = 0;

    // Artifact Quest Setup (dummy link for stages)
    this.artifactsCollected = 0;
    this.totalArtifactsNeeded = 1;
    this.artifactLocations = [];
    
    // Initialize Heat Filter
    const heatTex = this.mapTextures.floor[1];
    this.heatFilterSprite = new Sprite(heatTex);
    this.heatFilterSprite.texture.source.addressMode = 'repeat';
    this.heatFilterSprite.scale.set(10);
    this.heatFilter = new DisplacementFilter({ sprite: this.heatFilterSprite, scale: 20 });
    this.worldContainer.addChild(this.heatFilterSprite);

    // Generate Bounded Dungeon Layout
    this.generateDungeonLayout();

    // Build entire dungeon map statically (no chunks)
    this.buildDungeonMap();

    // Spawn enemies in non-tutorial rooms
    if (this.currentDungeonStage === 10) {
        this.isEndgameActive = true;
        this.endgameTimer = 60 * 60; // 60 seconds at 60fps
        
        // Spawn Final Boss in the middle room
        const room = this.dungeonRooms[Math.floor(this.dungeonRooms.length / 2)]; 
        const rx = room ? room.tx * 64 : 0;
        const ry = room ? room.ty * 64 : 0;
        this.spawnEnemy(rx, ry, 'spider', { enemyTypeId: 'final_boss', maxHp: 5000, hp: 5000, speed: 3.5, scale: 5 });
    }

    // Setup dynamic lighting
    this.setupLighting();
    window.dispatchEvent(new CustomEvent('generation-end'));
  }

  private getBiomeAt(wx: number, wy: number): number {
    if (this.currentDungeonWorld === 1) {
       if (this.currentDungeonStage <= 5) return 0; // Overgrown Laboratory
       else return 1; // Core Reactor (Magma)
    }
    return 2; // Void/Escape
  }

  private generateChunk(_cx: number, _cy: number) {
    // Legacy stub - chunks replaced by static buildDungeonMap
  }

  private buildDungeonMap() {
    this.allProps = [];
    this.destructibles = [];
    

    for (const cellKey in this.dungeonTiles) {
      const type = this.dungeonTiles[cellKey];
      const parts = cellKey.split(',');
      const tx = parseInt(parts[0]);
      const ty = parseInt(parts[1]);

      if (type === 'FLOOR' || type === 'IRRADIATED_WATER' || type === 'MAGMA' || type === 'STEAM_VENT') {
        this.floorCells.add(cellKey);
        if (type !== 'FLOOR') {
            this.waterCells.add(cellKey); 
        }
      } else if (type === 'WALL' || type === 'FENCE') {
        this.obstacleCells.add(cellKey);
      } else if (type === 'TREE' || type === 'ROCK') {
        this.obstacleCells.add(cellKey);
        
        if (type === 'ROCK') {
            let tex = this.mapTextures.rock[0];
            const sprite = new Sprite(tex);
            sprite.anchor.set(0.5, 0.8);
            sprite.scale.set(5);
            sprite.x = tx * 64 + 32;
            sprite.y = ty * 64 + 32;
            sprite.zIndex = sprite.y;
            this.worldContainer.addChild(sprite);
            this.environmentSprites.push(sprite);
        }
      } else if (type === 'DOOR') {
        this.floorCells.add(cellKey);
      } else if (type === 'OBSTACLE') {
        this.floorCells.add(cellKey);
        this.obstacleCells.add(cellKey);

        const propObj = {
          x: tx * 64 + 32,
          y: ty * 64 + 32,
          width: 32,
          height: 32,
          tx,
          ty,
          type: 'crate',
          destroyed: false,
          hp: 30
        };

        this.allProps.push(propObj);
        this.destructibles.push(propObj);
      }
    }

      }

  private createFloorGraphics(biome: number, crackType: number = 0): Graphics {
    const g = new Graphics();
    let baseCol = 0x242831;
    let lightCol = 0x3b404d;
    let darkCol = 0x181a21;
    let accentCol = 0x4b5263;

    if (biome === 1) { // Magma/Desert
      baseCol = 0x45281a;
      lightCol = 0x5e3825;
      darkCol = 0x2a160c;
      accentCol = 0x7a4a33;
    } else if (biome === 2) { // Void
      baseCol = 0x1f1530;
      lightCol = 0x33224d;
      darkCol = 0x110b1a;
      accentCol = 0x4c3373;
    }

    if (biome === 99 || (biome === 0 && this.currentDungeonStage > 1)) {
      let seed = 777 + crackType * 31 + biome * 97;
      const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      
      // 1. Organic Dirt Patches
      const numPatches = Math.floor(rng() * 3);
      for(let p = 0; p < numPatches; p++) {
          const px = rng() * 64;
          const py = rng() * 64;
          const radius = 6 + rng() * 8;
          g.circle(px, py, radius).fill({color: 0x3d2817, alpha: 0.6}); // Dark brown dirt
          g.circle(px + (rng()-0.5)*8, py + (rng()-0.5)*8, radius * 0.8).fill({color: 0x4a321f, alpha: 0.6}); // Light brown highlight
      }

      // 2. High-density grass and pebbles
      for (let i = 0; i < 80; i++) {
        const px = Math.floor(rng() * 32) * 2;
        const py = Math.floor(rng() * 32) * 2;
        const rType = rng();
        
        if (rType < 0.4) {
            // Light grass clump
            g.rect(px, py, 2, 6).fill(0x427d2d); 
            g.rect(px-2, py+2, 2, 4).fill(0x3a6e27);
        }
        else if (rType < 0.7) {
            // Dark tall grass
            g.rect(px, py, 2, 8).fill(0x1a3811);
        }
        else if (rType < 0.85) {
            // Tiny grey pebble
            g.rect(px, py, 4, 4).fill(0x5c6370);
            g.rect(px, py, 2, 2).fill(0x7a828f); // highlight
        }
        else if (rType < 0.95) {
            // Larger mossy rock
            g.rect(px, py, 8, 6).fill(0x404552);
            g.rect(px, py, 8, 2).fill(0x5c6370); // top highlight
            g.rect(px+4, py+4, 4, 2).fill(0x283825); // moss
        }
        else {
            // Small forest flower (red or blue)
            const flowerCol = rng() > 0.5 ? 0xcc3333 : 0x3366cc;
            g.rect(px, py, 4, 4).fill(flowerCol);
            g.rect(px+1, py+1, 2, 2).fill(0xffff00); // yellow center
        }
      }
      return g;
    }

    // Base background
    g.rect(0, 0, 64, 64).fill(baseCol);

    // Draw 4 distinct stone tiles (32x32 each)
    const drawSlab = (x: number, y: number, w: number, h: number) => {
      // Slab body
      g.rect(x + 1, y + 1, w - 2, h - 2).fill(baseCol);
      // Highlights (Top & Left edges)
      g.rect(x + 1, y + 1, w - 2, 2).fill(lightCol);
      g.rect(x + 1, y + 1, 2, h - 2).fill(lightCol);
      // Shadows (Bottom & Right edges)
      g.rect(x + 1, y + h - 3, w - 2, 2).fill(darkCol);
      g.rect(x + w - 3, y + 1, 2, h - 2).fill(darkCol);
    };

    drawSlab(0, 0, 32, 32);
    drawSlab(32, 0, 32, 32);
    drawSlab(0, 32, 32, 32);
    drawSlab(32, 32, 32, 32);

    // Add some noise dots
    let seed = 777 + crackType * 31 + biome * 97;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 20; i++) {
      const px = Math.floor(rng() * 14) * 4 + 4;
      const py = Math.floor(rng() * 14) * 4 + 4;
      const dotCol = rng() > 0.5 ? lightCol : darkCol;
      g.rect(px, py, 4, 4).fill(dotCol);
    }

    // Draw specific features depending on crackType
    if (crackType === 1) {
      // Crack traversing from center to top-left
      g.rect(12, 12, 8, 4).fill(darkCol);
      g.rect(8, 16, 4, 12).fill(darkCol);
      // Highlight on the edge of the crack
      g.rect(12, 16, 8, 2).fill(accentCol);
    } else if (crackType === 2) {
      // Crack traversing from right to bottom-left
      g.rect(48, 12, 8, 4).fill(darkCol);
      g.rect(40, 16, 8, 4).fill(darkCol);
      g.rect(32, 20, 8, 4).fill(darkCol);
      g.rect(28, 24, 4, 8).fill(darkCol);
      // Highlight
      g.rect(48, 16, 8, 2).fill(accentCol);
      g.rect(40, 20, 8, 2).fill(accentCol);
    } else if (crackType === 3) {
      // Magical glowing runes in the center
      let runeCol = 0x00d2ff; // Plains: Cyber blue
      if (biome === 1) runeCol = 0xff5500; // Magma: Glowing orange
      if (biome === 2) runeCol = 0xb800ff; // Void: Cyber purple

      // Draw rune circle outline
      g.circle(32, 32, 14).stroke({ width: 3, color: runeCol });
      // Inner cross / square
      g.rect(28, 28, 8, 8).fill(runeCol);
      // Glow rings
      g.circle(32, 32, 18).stroke({ width: 1, color: runeCol, alpha: 0.4 });
    }

    return g;
  }

  private createWallGraphics(biome: number, isVertical: boolean): Graphics {
    const g = new Graphics();
    
    let baseCol = 0x3e4451;
    let lightCol = 0x5c6370;
    let darkCol = 0x21252b;
    let seamCol = 0x181a1f;

    if (biome === 1) { // Magma
      baseCol = 0x2e1b12;
      lightCol = 0x482d20;
      darkCol = 0x160c07;
      seamCol = 0xff4500; // Glowing hot orange magma seam!
    } else if (biome === 2) { // Void
      baseCol = 0x291440;
      lightCol = 0x402263;
      darkCol = 0x140821;
      seamCol = 0xbb00ff; // Glowing neon purple void seam!
    }

    // Background fill
    g.rect(0, 0, 64, 64).fill(seamCol);

    if (isVertical) {
      // Draw vertical pillar blocks with horizontal subdivisions
      const drawBlock = (y: number, h: number) => {
        g.rect(4, y + 2, 56, h - 4).fill(baseCol);
        // Highlight
        g.rect(4, y + 2, 56, 3).fill(lightCol);
        g.rect(4, y + 2, 3, h - 4).fill(lightCol);
        // Shadow
        g.rect(4, y + h - 5, 56, 3).fill(darkCol);
        g.rect(56, y + 2, 4, h - 4).fill(darkCol);
      };

      drawBlock(0, 32);
      drawBlock(32, 32);

      // Midline glowing detail
      if (biome === 1) {
        g.rect(30, 0, 4, 64).fill(0xff8c00);
      } else if (biome === 2) {
        g.rect(30, 0, 4, 64).fill(0xff00ff);
      }
    } else {
      // Horizontal brick courses
      const drawBrick = (x: number, y: number, w: number, h: number) => {
        g.rect(x + 2, y + 2, w - 4, h - 4).fill(baseCol);
        // Highlight
        g.rect(x + 2, y + 2, w - 4, 3).fill(lightCol);
        g.rect(x + 2, y + 2, 3, h - 4).fill(lightCol);
        // Shadow
        g.rect(x + 2, y + h - 5, w - 4, 3).fill(darkCol);
        g.rect(x + w - 5, y + 2, 3, h - 4).fill(darkCol);
      };

      // Row 1
      drawBrick(0, 0, 32, 32);
      drawBrick(32, 0, 32, 32);
      // Row 2
      drawBrick(0, 32, 16, 32);
      drawBrick(16, 32, 32, 32);
      drawBrick(48, 32, 16, 32);

      // Seam glow
      if (biome === 1) {
        g.rect(0, 30, 64, 3).fill(0xff8c00);
      } else if (biome === 2) {
        g.rect(0, 30, 64, 3).fill(0xff00ff);
      }
    }

    return g;
  }

  private createChestGraphics(opened: boolean): Graphics {
    const g = new Graphics();

    const darkWood = 0x3d1e10;
    const midWood = 0x5e3019;
    const lightWood = 0x8b4a26;
    const goldBase = 0xcda022;
    const goldLight = 0xf5cf3d;
    const goldDark = 0x937014;
    const ironCol = 0x5c6370;

    if (!opened) {
      // Wood box body: x = 8 to 56, y = 20 to 56
      g.rect(8, 20, 48, 36).fill(darkWood);
      g.rect(10, 22, 44, 32).fill(midWood);
      
      // Horizontal wood planks lines
      g.rect(10, 30, 44, 3).fill(darkWood);
      g.rect(10, 42, 44, 3).fill(darkWood);
      
      // Wood highlights
      g.rect(10, 22, 44, 2).fill(lightWood);
      g.rect(10, 33, 44, 2).fill(lightWood);
      g.rect(10, 45, 44, 2).fill(lightWood);

      // Chest Lid (curved top)
      g.rect(10, 8, 44, 12).fill(darkWood);
      g.rect(12, 10, 40, 10).fill(midWood);
      g.rect(12, 10, 40, 2).fill(lightWood);

      // Gold bands/borders around corners
      const drawGoldBand = (x: number, y: number, w: number, h: number) => {
        g.rect(x, y, w, h).fill(goldDark);
        g.rect(x + 1, y + 1, w - 2, h - 2).fill(goldBase);
        g.rect(x + 1, y + 1, w - 2, 2).fill(goldLight);
      };

      drawGoldBand(8, 20, 6, 36);   // Left wall
      drawGoldBand(50, 20, 6, 36);  // Right wall
      drawGoldBand(8, 8, 6, 12);    // Lid left
      drawGoldBand(50, 8, 6, 12);   // Lid right
      
      drawGoldBand(8, 20, 48, 4);   // Lid bottom rim
      drawGoldBand(8, 52, 48, 4);   // Bottom base rim

      // Iron lock plate
      g.rect(26, 20, 12, 16).fill(0x282c34);
      g.rect(28, 22, 8, 12).fill(ironCol);
      g.circle(32, 26, 2).fill(0x000000);
      g.rect(31, 26, 2, 6).fill(0x000000);
      
      g.rect(30, 18, 4, 4).fill(goldLight);
    } else {
      g.rect(8, 0, 48, 12).fill(darkWood);
      g.rect(10, 2, 44, 8).fill(midWood);
      g.rect(8, 0, 6, 12).fill(goldBase);
      g.rect(50, 0, 6, 12).fill(goldBase);

      g.rect(8, 24, 48, 32).fill(darkWood);
      g.rect(10, 26, 44, 28).fill(midWood);
      
      g.rect(8, 24, 6, 32).fill(goldBase);
      g.rect(50, 24, 6, 32).fill(goldBase);
      g.rect(8, 52, 48, 4).fill(goldBase);

      g.rect(14, 14, 36, 12).fill(goldDark);
      g.circle(32, 22, 10).fill(goldBase);
      g.circle(24, 22, 8).fill(goldBase);
      g.circle(40, 22, 8).fill(goldBase);

      const drawGlitter = (cx: number, cy: number) => {
        g.rect(cx - 2, cy, 4, 1).fill(0xffffff);
        g.rect(cx, cy - 2, 1, 4).fill(0xffffff);
      };
      
      drawGlitter(32, 18);
      drawGlitter(22, 20);
      drawGlitter(42, 20);
      drawGlitter(28, 24);
      drawGlitter(36, 24);
    }

    return g;
  }

  private createFenceGraphics(): Graphics {
    const g = new Graphics();

    const ironCol = 0x4f5664;
    const ironLight = 0x768199;
    const ironDark = 0x2e323b;
    const goldCol = 0xcda022;

    g.rect(0, 0, 8, 64).fill(ironDark);
    g.rect(1, 0, 6, 64).fill(ironCol);
    g.rect(2, 0, 2, 64).fill(ironLight);

    g.rect(56, 0, 8, 64).fill(ironDark);
    g.rect(57, 0, 6, 64).fill(ironCol);
    g.rect(58, 0, 2, 64).fill(ironLight);

    const drawHorizBar = (y: number) => {
      g.rect(8, y, 48, 6).fill(ironDark);
      g.rect(8, y + 1, 48, 4).fill(ironCol);
      g.rect(8, y + 1, 48, 1).fill(ironLight);
    };
    drawHorizBar(12);
    drawHorizBar(32);
    drawHorizBar(52);

    const drawVertBar = (x: number) => {
      g.rect(x, 4, 4, 56).fill(ironDark);
      g.rect(x + 1, 4, 2, 56).fill(ironCol);
      g.rect(x + 1, 4, 1, 56).fill(ironLight);
      
      g.poly([x - 1, 4, x + 2, 0, x + 5, 4]).fill(ironLight);
      g.rect(x, 13, 4, 4).fill(goldCol);
      g.rect(x, 33, 4, 4).fill(goldCol);
      g.rect(x, 53, 4, 4).fill(goldCol);
    };

    drawVertBar(16);
    drawVertBar(24);
    drawVertBar(32);
    drawVertBar(40);
    drawVertBar(48);

    return g;
  }

  private createShrineFloorGraphics(): Graphics {
    const g = new Graphics();
    const colorMap: Record<string, number | null> = {
      '.': null,
      '1': 0x1e1e24,
      '2': 0x25252b,
      '3': 0x333333,
      '4': 0x444444,
    };
    const grid = [
      "4333333333333334",
      "3111111111111113",
      "3111111111111113",
      "3112211111122113",
      "3112211111122113",
      "3111111111111113",
      "3111112222111113",
      "3111112222111113",
      "3111112222111113",
      "3111112222111113",
      "3111111111111113",
      "3112211111122113",
      "3112211111122113",
      "3111111111111113",
      "3111111111111113",
      "4333333333333334"
    ];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const char = grid[y][x];
        const color = colorMap[char];
        if (color !== null && color !== undefined) {
          g.rect(x * 4, y * 4, 4, 4).fill(color);
        }
      }
    }
    return g;
  }

  private createShrinePillarGraphics(): Graphics {
    const g = new Graphics();
    const colorMap: Record<string, number | null> = {
      ' ': null,
      '3': 0x333333,
      '4': 0x444444,
      '5': 0x111111,
    };
    const grid = [
      "   33333333   ",
      "  3444444443  ",
      "  3433333343  ",
      "   35555553   ",
      "   35333353   ",
      "   35333353   ",
      "   35333353   ",
      "   35333353   ",
      "   35333353   ",
      "   35333353   ",
      "   35333353   ",
      "   35555553   ",
      "  3433333343  ",
      "  3444444443  ",
      "   33333333   ",
      "              "
    ];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 14; x++) {
        const char = grid[y][x];
        const color = colorMap[char];
        if (color !== null && color !== undefined) {
          g.rect((x + 1) * 4, y * 4, 4, 4).fill(color);
        }
      }
    }
    return g;
  }

  private addMapSprite(tex: Texture, x: number, y: number, anchorX: number, anchorY: number, zIndex?: number) {
    const sprite = new Sprite(tex);
    sprite.anchor.set(anchorX, anchorY);
    sprite.x = x;
    sprite.y = y;
    if (zIndex !== undefined) sprite.zIndex = zIndex;
    this.worldContainer.addChild(sprite);
    return sprite;
  }

  // No-op: darkCounterpart sync no longer needed with screenspace dual-pass rendering
  private syncMapSprite(_sprite: Sprite) {
  }

  private checkLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy)) / 16;
    if (steps <= 1) return true;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      const tx = Math.floor(px / TILE_PX);
      const ty = Math.floor(py / TILE_PX);
      if (this.obstacleCells.has(`${tx},${ty}`)) {
        return false;
      }
    }
    return true;
  }

  // No-op: lighting setup is now handled in init() via the dual-pass RenderTexture architecture
  private setupLighting() {
  }

  private updateLighting() {
    if (!this.maskContainer) return;
    
    // Clear previous mask graphics/sprites to prevent memory leak and solid white screen
    while(this.maskContainer.children.length > 0) {
      const child = this.maskContainer.removeChildAt(0);
      child.destroy();
    }

    const lights: { x: number, y: number, radius: number, isPlayer?: boolean, alpha?: number }[] = [];

    // Player torch - Ambient glow (360)
    lights.push({ x: this.player.x, y: this.player.y, radius: 250 });
    lights.push({ x: this.player.x, y: this.player.y, radius: 800, alpha: 0.1 });
    // Player torch - Directional flashlight
    lights.push({ x: this.player.x, y: this.player.y, radius: 1400, isPlayer: true });

    // Torches
    for (const torch of this.torches) {
      lights.push({ x: torch.x, y: torch.y, radius: 300 });
    }

    // Portal glow
    if (this.portalSprite && this.portalSprite.visible) {
      lights.push({ x: this.portalSprite.x, y: this.portalSprite.y, radius: 300 });
    }

    // Bullet lights
    for (const b of this.bullets) {
      if (b.sprite && !b.sprite.destroyed) {
        lights.push({ x: b.sprite.x, y: b.sprite.y, radius: b.isEnemy ? 100 : 120 });
      }
    }

    // Chest glow
    for (const ch of this.dungeonChests) {
      if (!ch.opened) {
        lights.push({ x: ch.sprite.x, y: ch.sprite.y, radius: 120 });
      }
    }

    // Precalculate player target angle for directional light
    const worldMouseX = (this.mouseX - this.worldContainer.x) / 1.0;
    const worldMouseY = (this.mouseY - this.worldContainer.y) / 1.0;
    const pTargetAngle = Math.atan2(worldMouseY - (this.player.y - 12), worldMouseX - this.player.x);
    const fov = Math.PI / 2.5; // roughly 72 degrees

    for (const light of lights) {
      const { x: lx, y: ly, radius, isPlayer } = light;
      
      if (isPlayer) {
         // Raycast only for the flashlight to maintain 60 FPS
         const segments: { x1: number, y1: number, x2: number, y2: number }[] = [];

         const tileRadius = Math.ceil(radius / TILE_PX) + 1;
         const centerTx = Math.floor(lx / TILE_PX);
         const centerTy = Math.floor(ly / TILE_PX);

         for (let tx = centerTx - tileRadius; tx <= centerTx + tileRadius; tx++) {
           for (let ty = centerTy - tileRadius; ty <= centerTy + tileRadius; ty++) {
             const key = `${tx},${ty}`;
             if (!this.obstacleCells.has(key)) continue;

             const wx = tx * TILE_PX;
             const wy = ty * TILE_PX;
             const type = this.dungeonTiles[key] || 'WALL';

             if (type === 'WALL' || type === 'DOOR') {
                if (!this.obstacleCells.has(`${tx},${ty - 1}`) || (this.dungeonTiles[`${tx},${ty - 1}`] !== 'WALL' && this.dungeonTiles[`${tx},${ty - 1}`] !== 'DOOR')) segments.push({ x1: wx, y1: wy, x2: wx + TILE_PX, y2: wy });
                if (!this.obstacleCells.has(`${tx},${ty + 1}`) || (this.dungeonTiles[`${tx},${ty + 1}`] !== 'WALL' && this.dungeonTiles[`${tx},${ty + 1}`] !== 'DOOR')) segments.push({ x1: wx, y1: wy + TILE_PX, x2: wx + TILE_PX, y2: wy + TILE_PX });
                if (!this.obstacleCells.has(`${tx - 1},${ty}`) || (this.dungeonTiles[`${tx - 1},${ty}`] !== 'WALL' && this.dungeonTiles[`${tx - 1},${ty}`] !== 'DOOR')) segments.push({ x1: wx, y1: wy, x2: wx, y2: wy + TILE_PX });
                if (!this.obstacleCells.has(`${tx + 1},${ty}`) || (this.dungeonTiles[`${tx + 1},${ty}`] !== 'WALL' && this.dungeonTiles[`${tx + 1},${ty}`] !== 'DOOR')) segments.push({ x1: wx + TILE_PX, y1: wy, x2: wx + TILE_PX, y2: wy + TILE_PX });
             } else {
                const ox = wx + TILE_PX * 0.25;
                const oy = wy + TILE_PX * 0.4;
                const ow = TILE_PX * 0.5;
                const oh = TILE_PX * 0.4;
                segments.push({ x1: ox, y1: oy, x2: ox + ow, y2: oy });
                segments.push({ x1: ox, y1: oy + oh, x2: ox + ow, y2: oy + oh });
                segments.push({ x1: ox, y1: oy, x2: ox, y2: oy + oh });
                segments.push({ x1: ox + ow, y1: oy, x2: ox + ow, y2: oy + oh });
             }
           }
         }

         // Bounding box
         const bx1 = (centerTx - tileRadius) * TILE_PX;
         const by1 = (centerTy - tileRadius) * TILE_PX;
         const bx2 = (centerTx + tileRadius + 1) * TILE_PX;
         const by2 = (centerTy + tileRadius + 1) * TILE_PX;
         segments.push({ x1: bx1, y1: by1, x2: bx2, y2: by1 });
         segments.push({ x1: bx2, y1: by1, x2: bx2, y2: by2 });
         segments.push({ x1: bx2, y1: by2, x2: bx1, y2: by2 });
         segments.push({ x1: bx1, y1: by2, x2: bx1, y2: by1 });

         // Collect unique vertices and cast rays
         const uniqueAngles: number[] = [];
         const seen = new Set<string>();

         uniqueAngles.push(pTargetAngle - fov / 2);
         uniqueAngles.push(pTargetAngle + fov / 2);

         for (const seg of segments) {
           for (const pt of [{ x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }]) {
             const pk = `${pt.x},${pt.y}`;
             if (seen.has(pk)) continue;
             seen.add(pk);
             const angle = Math.atan2(pt.y - ly, pt.x - lx);

             let diff = angle - pTargetAngle;
             while (diff < -Math.PI) diff += Math.PI * 2;
             while (diff > Math.PI) diff -= Math.PI * 2;
             if (Math.abs(diff) <= fov / 2) {
                uniqueAngles.push(angle - 0.0001, angle, angle + 0.0001);
             }
           }
         }

         const intersections: { x: number, y: number, angle: number }[] = [];
         for (const angle of uniqueAngles) {
           const rdx = Math.cos(angle);
           const rdy = Math.sin(angle);
           let closestT = radius;
           let closestX = lx + rdx * radius;
           let closestY = ly + rdy * radius;

           for (const seg of segments) {
             const sdx = seg.x2 - seg.x1;
             const sdy = seg.y2 - seg.y1;
             const denom = rdx * sdy - rdy * sdx;
             if (Math.abs(denom) < 0.00001) continue;

             const t = ((seg.x1 - lx) * sdy - (seg.y1 - ly) * sdx) / denom;
             const u = ((seg.x1 - lx) * rdy - (seg.y1 - ly) * rdx) / denom;

             if (t > 0 && t < closestT && u >= 0 && u <= 1) {
               closestT = t;
               closestX = lx + rdx * t;
               closestY = ly + rdy * t;
             }
           }
           intersections.push({ x: closestX, y: closestY, angle });
         }

         intersections.sort((a, b) => {
            let da = a.angle - pTargetAngle;
            while (da < -Math.PI) da += Math.PI * 2;
            while (da > Math.PI) da -= Math.PI * 2;
            let db = b.angle - pTargetAngle;
            while (db < -Math.PI) db += Math.PI * 2;
            while (db > Math.PI) db -= Math.PI * 2;
            return da - db;
         });

         if (intersections.length > 2) {
           const poly = new Graphics();
           poly.moveTo(lx, ly);
           for (const inter of intersections) poly.lineTo(inter.x, inter.y);
           poly.lineTo(lx, ly);
           poly.closePath();
           poly.fill({ color: 0xddddaa, alpha: 0.9 });
           poly.blendMode = 'add';
           
           this.maskContainer.addChild(poly);
         }
      } else {
         const gradient = new Sprite(this.lightGradientTex);
         gradient.anchor.set(0.5);
         gradient.width = radius * 2;
         gradient.height = radius * 2;
         gradient.x = lx;
         gradient.y = ly;
         gradient.blendMode = 'add';
         this.maskContainer.addChild(gradient);
      }
    }
  }

  private getBiomeColors(biomeId: number) {
    if (biomeId === 1) { // Magma
      return {
        floorDark: 0x21110a, floorLight: 0x3d2012,
        wallDark: 0x160a04, wallLight: 0x2a160c, wallTop: 0x482d20, seam: 0xff4500
      };
    } else if (biomeId === 2) { // Void
      return {
        floorDark: 0x0f0914, floorLight: 0x1f1530,
        wallDark: 0x0b0412, wallLight: 0x180b26, wallTop: 0x2d1b40, seam: 0xbb00ff
      };
    } else { // Plains
      return {
        floorDark: 0x1a1c23, floorLight: 0x242831,
        wallDark: 0x111317, wallLight: 0x1c1e26, wallTop: 0x3e4451, seam: 0x181a1f
      };
    }
  }

  private wallsBuffer: any[] = [];
  private pooledTrees: Sprite[] = [];
  private sharedShadowTex: any;
  private pooledFloorSprites: Sprite[] = [];

  private renderEnvironment() {
    this.floorGraphics.clear();
    this.wallGraphicsBack.clear();
    this.wallGraphicsFront.clear();

    const cx = this.worldContainer.x;
    const cy = this.worldContainer.y;
    const halfW = this.app.screen.width / 2;
    const halfH = this.app.screen.height / 2;

    const minX = -cx - TILE_PX * 2;
    const maxX = -cx + this.app.screen.width + TILE_PX * 2;
    const minY = -cy - TILE_PX * 2;
    const maxY = -cy + this.app.screen.height + TILE_PX * 2;

    const startTx = Math.floor(minX / TILE_PX);
    const endTx = Math.floor(maxX / TILE_PX);
    const startTy = Math.floor(minY / TILE_PX);
    const endTy = Math.floor(maxY / TILE_PX);

    const focalX = -cx + halfW;
    const focalY = -cy + halfH;
    const WALL_HEIGHT = 48; 

    let wallCount = 0;
    let activeTreeCount = 0;
    let activeFloorSpriteCount = 0;

    for (let tx = startTx; tx <= endTx; tx++) {
      for (let ty = startTy; ty <= endTy; ty++) {
        const key = `${tx},${ty}`;
        let type = this.dungeonTiles[key];
        const biome = this.getBiomeAt(tx, ty);
        
        if ((!type || type === 'VOID') && biome === 0 && this.currentDungeonStage > 1) {
            type = 'TREE';
        }

        if (!type || type === 'VOID') continue;

        const bx = tx * TILE_PX;
        const by = ty * TILE_PX;
        const cols = this.getBiomeColors(biome);

        // Draw basic floors (magma, tutorial) vs Forest 
        if (type === 'FLOOR' || type === 'DOOR' || type === 'OBSTACLE' || type === 'TREE') {
          if (!(biome === 0 && this.currentDungeonStage > 1)) {
              this.floorGraphics.rect(bx, by, TILE_PX, TILE_PX).fill(cols.floorLight);
              this.floorGraphics.rect(bx + 2, by + 2, TILE_PX - 4, TILE_PX - 4).fill(cols.floorDark);
          } else {
              this.floorGraphics.rect(bx, by, TILE_PX, TILE_PX).fill(0x2b4f1b); // Generate green flooring first
              
              if (activeFloorSpriteCount >= this.pooledFloorSprites.length) {
                  const newFloor = new Sprite();
                  newFloor.anchor.set(0.5, 0.5);
                  newFloor.zIndex = -10000;
                  this.worldContainer.addChild(newFloor);
                  this.pooledFloorSprites.push(newFloor);
              }
              const fspr = this.pooledFloorSprites[activeFloorSpriteCount++];
              fspr.visible = true;
              
              let floorSeed = (tx * 31337) ^ (ty * 73856) ^ this.currentDungeonStage;
              let seedState = floorSeed;
              const rng = () => {
                  seedState += 0x6D2B79F5;
                  let t = seedState;
                  t = Math.imul(t ^ (t >>> 15), t | 1);
                  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
              };

              const texIdx = Math.floor(rng() * 40);
              
              fspr.texture = this.mapTextures.customFloor[texIdx];
              fspr.x = bx + 32;
              fspr.y = by + 32;
              
              const flipX = rng() > 0.5 ? 1 : -1;
              const flipY = rng() > 0.5 ? 1 : -1;
              fspr.scale.set(flipX, flipY);
              // Since textures are exactly 64x64, setting scale to 1 or -1 is identical to setting width/height to 64.
          }
        }

        if (type === 'TREE') {
          let treeSeed = (tx * 73856093) ^ (ty * 19349663) ^ this.currentDungeonStage;
          let seedState = treeSeed;
          const rng = () => {
              seedState += 0x6D2B79F5;
              let t = seedState;
              t = Math.imul(t ^ (t >>> 15), t | 1);
              t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
              return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };

          const numTrees = 1 + Math.floor(rng() * 2);
          for (let i = 0; i < numTrees; i++) {
              if (activeTreeCount >= this.pooledTrees.length) {
                  const newTree = new Sprite(this.mapTextures.tree1);
                  this.worldContainer.addChild(newTree);
                  this.pooledTrees.push(newTree);
              }
              const sprite = this.pooledTrees[activeTreeCount++];
              sprite.visible = true;
              sprite.anchor.set(0.5, 0.9);

              if (!sprite.getChildByName("shadow")) {
                  if (!this.sharedShadowTex) {
                      const shadowGraphics = new Graphics();
                      shadowGraphics.ellipse(0, 0, 26, 10).fill({color: 0x11220b, alpha: 0.8});
                      this.sharedShadowTex = this.app.renderer.generateTexture(shadowGraphics);
                  }
                  const shadow = new Sprite(this.sharedShadowTex);
                  shadow.name = "shadow";
                  shadow.anchor.set(0.5, 0.5);
                  shadow.y = 0; 
                  shadow.zIndex = -1;
                  sprite.addChild(shadow);
                  sprite.sortableChildren = true;
              }

              const r = rng();
              if (r < 0.2) sprite.texture = this.mapTextures.tree1;
              else if (r < 0.4) sprite.texture = this.mapTextures.tree2;
              else if (r < 0.6) sprite.texture = this.mapTextures.tree3;
              else if (r < 0.8) sprite.texture = this.mapTextures.tree4;
              else sprite.texture = this.mapTextures.tree5;

              const scaleVariation = 0.5 + (rng() * 0.35);
              const flip = rng() > 0.5 ? 1 : -1;
              sprite.scale.set(scaleVariation * flip, scaleVariation);

              const offsetX = Math.floor((rng() - 0.5) * 64);
              const offsetY = Math.floor((rng() - 0.5) * 64);

              sprite.x = bx + 32 + offsetX;
              sprite.y = by + 32 + offsetY;
              sprite.zIndex = sprite.y;
          }
        }

        if (type === 'WALL' || type === 'FENCE') {
          const isWallN = this.dungeonTiles[`${tx},${ty-1}`] === 'WALL' || this.dungeonTiles[`${tx},${ty-1}`] === 'TREE' || this.dungeonTiles[`${tx},${ty-1}`] === 'FENCE';
          const isWallS = this.dungeonTiles[`${tx},${ty+1}`] === 'WALL' || this.dungeonTiles[`${tx},${ty+1}`] === 'TREE' || this.dungeonTiles[`${tx},${ty+1}`] === 'FENCE';
          const isWallE = this.dungeonTiles[`${tx+1},${ty}`] === 'WALL' || this.dungeonTiles[`${tx+1},${ty}`] === 'TREE' || this.dungeonTiles[`${tx+1},${ty}`] === 'FENCE';
          const isWallW = this.dungeonTiles[`${tx-1},${ty}`] === 'WALL' || this.dungeonTiles[`${tx-1},${ty}`] === 'TREE' || this.dungeonTiles[`${tx-1},${ty}`] === 'FENCE';

          const centerBx = bx + TILE_PX / 2;
          const centerBy = by + TILE_PX / 2;
          const distSq = (centerBx - focalX) ** 2 + (centerBy - focalY) ** 2;

          if (!this.wallsBuffer[wallCount]) this.wallsBuffer[wallCount] = {};
          const w = this.wallsBuffer[wallCount++];
          w.distSq = distSq;
          w.bx = bx;
          w.by = by;
          w.isProp = false;
          w.cols = cols;
          w.type = type;
          w.isWallN = isWallN;
          w.isWallS = isWallS;
          w.isWallE = isWallE;
          w.isWallW = isWallW;
          w.tx = tx;
          w.ty = ty;
        }
      }
    }

    for (let i = activeTreeCount; i < this.pooledTrees.length; i++) {
        this.pooledTrees[i].visible = false;
    }
    for (let i = activeFloorSpriteCount; i < this.pooledFloorSprites.length; i++) {
        this.pooledFloorSprites[i].visible = false;
    }

    const activeWalls = this.wallsBuffer.slice(0, wallCount);
    activeWalls.sort((a, b) => b.distSq - a.distSq);

    const project = (px: number, py: number, height: number) => {
       const dx = px - focalX;
       const dy = py - focalY;
       const intensity = 0.08; 
       return { x: px + dx * intensity, y: py + dy * intensity - height };
    };

    for (let i = 0; i < wallCount; i++) {
      const w = activeWalls[i];
      const isFront = w.by >= this.player.y;
      const targetGraphics = isFront ? this.wallGraphicsFront : this.wallGraphicsBack;

      if (w.isProp) {
          const prop = w.prop;
          const pulse = Math.sin(this.frameCount * 0.05 + prop.x) * 5;
          const MONOLITH_HEIGHT = 36 + pulse;

          const p0 = { x: w.bx, y: w.by };
          const p1 = { x: w.bx + prop.width, y: w.by };
          const p2 = { x: w.bx + prop.width, y: w.by + prop.height };
          const p3 = { x: w.bx, y: w.by + prop.height };
          
          const centerTopX = w.bx + prop.width / 2;
          const centerTopY = w.by + prop.height / 2;

          const tCenter = project(centerTopX, centerTopY, MONOLITH_HEIGHT);

          const wallLight = 0x00ffff;
          const wallDark = 0x008888;
          const seam = 0x00ffff;

          if (tCenter.y < p2.y || tCenter.y < p3.y) {
             targetGraphics.poly([p3.x, p3.y, p2.x, p2.y, tCenter.x, tCenter.y]).fill(wallLight);
             targetGraphics.poly([p3.x, p3.y, p2.x, p2.y, tCenter.x, tCenter.y]).stroke({ width: 2, color: seam, alpha: 0.8 });
          }
          if (tCenter.y > p0.y || tCenter.y > p1.y) {
             targetGraphics.poly([p0.x, p0.y, p1.x, p1.y, tCenter.x, tCenter.y]).fill(wallDark);
          }
          if (tCenter.x < p1.x || tCenter.x < p2.x) {
             targetGraphics.poly([p1.x, p1.y, p2.x, p2.y, tCenter.x, tCenter.y]).fill(wallDark);
             targetGraphics.poly([p1.x, p1.y, p2.x, p2.y, tCenter.x, tCenter.y]).stroke({ width: 2, color: seam, alpha: 0.5 });
          }
          if (tCenter.x > p0.x || tCenter.x > p3.x) {
             targetGraphics.poly([p0.x, p0.y, p3.x, p3.y, tCenter.x, tCenter.y]).fill(wallDark);
             targetGraphics.poly([p0.x, p0.y, p3.x, p3.y, tCenter.x, tCenter.y]).stroke({ width: 2, color: seam, alpha: 0.5 });
          }
      } else {
          const p0 = { x: w.bx, y: w.by };
          const p1 = { x: w.bx + TILE_PX, y: w.by };
          const p2 = { x: w.bx + TILE_PX, y: w.by + TILE_PX };
          const p3 = { x: w.bx, y: w.by + TILE_PX };

          const t0 = project(p0.x, p0.y, WALL_HEIGHT);
          const t1 = project(p1.x, p1.y, WALL_HEIGHT);
          const t2 = project(p2.x, p2.y, WALL_HEIGHT);
          const t3 = project(p3.x, p3.y, WALL_HEIGHT);

          if (!w.isWallS && (t2.y < p2.y || t3.y < p3.y)) {
             targetGraphics.poly([p3.x, p3.y, p2.x, p2.y, t2.x, t2.y, t3.x, t3.y]).fill(w.cols.wallLight);
             targetGraphics.poly([p3.x, p3.y, p2.x, p2.y, t2.x, t2.y, t3.x, t3.y]).stroke({ width: 2, color: w.cols.seam });
          }
          if (!w.isWallN && (t0.y > p0.y || t1.y > p1.y)) {
             targetGraphics.poly([p0.x, p0.y, p1.x, p1.y, t1.x, t1.y, t0.x, t0.y]).fill(w.cols.wallDark);
          }
          if (!w.isWallE && (t1.x < p1.x || t2.x < p2.x)) {
             targetGraphics.poly([p1.x, p1.y, p2.x, p2.y, t2.x, t2.y, t1.x, t1.y]).fill(w.cols.wallDark);
          }
          if (!w.isWallW && (t0.x > p0.x || t3.x > p3.x)) {
             targetGraphics.poly([p0.x, p0.y, p3.x, p3.y, t3.x, t3.y, t0.x, t0.y]).fill(w.cols.wallDark);
          }

          targetGraphics.poly([t0.x, t0.y, t1.x, t1.y, t2.x, t2.y, t3.x, t3.y]).fill(w.cols.wallTop);
          targetGraphics.poly([t0.x, t0.y, t1.x, t1.y, t2.x, t2.y, t3.x, t3.y]).stroke({ width: 1, color: w.cols.seam });
      }
    }
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

  private spawnEnemy(wx: number, wy: number, archetype: EnemyArchetype, customProps?: any) {
      const warning = new Graphics().circle(0, 0, 30).stroke({ width: 4, color: 0xff0000, alpha: 0.8 });
      warning.x = wx;
      warning.y = wy;
      warning.zIndex = wy - 1;
      this.worldContainer.addChild(warning);
      
      let scale = 1.0;
      let alpha = 0.8;
      const interval = setInterval(() => {
          if (warning.destroyed) {
              clearInterval(interval);
              return;
          }
          scale -= 0.1;
          alpha -= 0.1;
          if (scale <= 0) scale = 1.0;
          if (alpha <= 0) alpha = 0.8;
          warning.scale.set(scale);
          warning.alpha = alpha;
      }, 50);

      setTimeout(() => {
        clearInterval(interval);
        if (warning && !warning.destroyed) {
           try { this.worldContainer.removeChild(warning); } catch(e){}
           warning.destroy();
        }
        
        if (!this.app || !this.worldContainer || this.worldContainer.destroyed) return;
        
        const enemy = new SkeletonEnemy(archetype);
        enemy.x = wx;
        enemy.y = wy;
        
        // Apply custom props
        if (customProps) {
            if (customProps.enemyTypeId) (enemy as any).enemyTypeId = customProps.enemyTypeId;
            if (customProps.maxHp) enemy.maxHp = customProps.maxHp;
            if (customProps.hp) enemy.hp = customProps.hp;
            if (customProps.speed) enemy.speed = customProps.speed;
            if (customProps.scale) enemy.scale.set(customProps.scale);
        }

        this.worldContainer.addChild(enemy);
        this.monsters.push(enemy);
        
        this.spawnParticles(wx, wy, 0xff0000, 15);
        SoundManager.getInstance().playSound('brute_slam', wx, wy);
      }, 1500);
  }

  private updateSpawns() {
    // Handled dynamically via room lockdown mechanics.
  }

  private spawnExclamation(monster: any) {
    const style = new TextStyle({ fontFamily: "'CustomFont', Arial", fontSize: 40, fill: '#ff0000', stroke: { color: '#000000', width: 4 }, fontWeight: 'bold' });
    const text = new Text({ text: '!', style });
    text.anchor.set(0.5, 1);
    text.x = monster.x;
    text.y = monster.y - 40;
    text.zIndex = monster.y + 100;
    this.worldContainer.addChild(text);
    this.damagePopups.push({ sprite: text, life: 25 });
  }

  private killMonster(monster: any, index: number) {
      SoundManager.getInstance().playSound('kill');
      const isRanged = monster.type === 'ranged';
      
      if (this.upgrades.vampirism && Math.random() < 0.05) {
         this.playerHP = Math.min(this.playerMaxHP, this.playerHP + 1);
         // Show heal popup
         const style = new TextStyle({ fontFamily: "'CustomFont', Arial", fontSize: 24, fill: '#00ff00', stroke: { color: '#005500', width: 4 }, fontWeight: 'bold' });
         const healText = new Text({ text: '+1 HP (Vamp)', style });
         healText.anchor.set(0.5, 0.5); healText.x = this.player.x; healText.y = this.player.y - 64; healText.zIndex = this.player.y + 100;
         this.worldContainer.addChild(healText);
         this.damagePopups.push({ sprite: healText, life: 60 });
      }

      // Golem Boss Death Relay: triggers Portal & Merchant
      if (monster.enemyTypeId === 'golem') {
        this.gatekeeperDefeated = true;
        this.artifactsCollected = 1;
      } else if (monster.enemyTypeId === 'final_boss') {
         // Final Boss defeated: trigger the rift immediately
         this.endgameTimer = 0; 
      }

      // Progression & Rewards
      this.enemiesAlive--;
      this.openWorldKills++;
      
      if (this.tutorialStep === 11) {
          this.tutorialProgress++;
      }

      this.dispatchState();

      if (Math.random() < 0.75 || this.tutorialStep < 15) { // 75% drop chance (100% in tutorial)
        const coinSprite = new Sprite(this.coinTexture);
        coinSprite.anchor.set(0.5, 0.5);
        coinSprite.scale.set(0.15);
        coinSprite.x = monster.x + (Math.random() * 40 - 20);
        coinSprite.y = monster.y - 12 + (Math.random() * 40 - 20);
        coinSprite.zIndex = monster.y;
        this.worldContainer.addChild(coinSprite);
        this.coinDrops.push({ sprite: coinSprite, life: 600 });
      }

      // Room clearing check
      if ((monster as any).roomId !== undefined && (monster as any).roomId === this.activeRoomId) {
          this.activeRoomEnemies--;
          if (this.activeRoomEnemies <= 0) {
              const room = this.dungeonRooms.find(r => r.id === this.activeRoomId);
              if (room && !room.cleared) {
                  room.cleared = true;
              }
          }
      }

      // Drop EXP Orb
      const expSprite = new Graphics().circle(0, 0, 4).fill({ color: 0x00ffaa });
      expSprite.x = monster.x + (Math.random() * 40 - 20);
      expSprite.y = monster.y - 12 + (Math.random() * 40 - 20);
      expSprite.zIndex = monster.y;
      this.worldContainer.addChild(expSprite);
      this.expDrops.push({ sprite: expSprite, life: 1200 });

      const textures = monster.enemyTypeId ? this.getEnemyTexturesForType(monster.enemyTypeId) : (isRanged ? this.goblinBlueTextures : this.goblinTextures);
      const corpse = new Sprite(textures.dead1 ? textures.dead1[0] : textures.run[0]);
      corpse.anchor.set(0.5, 0.8125);
      corpse.scale.set(1);
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

      this.worldContainer.removeChild(monster.shadow);
      if (monster.shadow) monster.shadow.destroy();
      this.worldContainer.addChild(corpse);
      this.corpses.push(corpse);

      if (monster.hpBar) {
         this.worldContainer.removeChild(monster.hpBar);
         monster.hpBar.destroy();
      }
      this.worldContainer.removeChild(monster);
      monster.destroy();
      this.monsters.splice(index, 1);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.tutorialStep < 15 && this.tutorialStep % 2 === 0) {
      if (e.code === 'Space') {
        window.dispatchEvent(new CustomEvent('dialogue-advance'));
      }
      return;
    }
    // Block inventory before step 11
    if (e.code === 'KeyE' && !e.repeat && this.tutorialStep < 11) {
       SoundManager.getInstance().playSound('empty_click');
       return;
    }
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
      if (this.isInventoryOpen) SoundManager.getInstance().playSound('open_inventory');
      else SoundManager.getInstance().playSound('close_inventory');
      this.dispatchState();
    }

    // Close Inventory or Open Settings on Escape
    if (e.code === 'Escape' && !e.repeat) {
      if (this.isMapOpen) {
        this.isMapOpen = false;
        this.updateMinimap();
      } else if (this.isInventoryOpen) {
        this.isInventoryOpen = false;
        SoundManager.getInstance().playSound('close_inventory');
        this.dispatchState();
      } else {
        window.dispatchEvent(new CustomEvent('settings-toggle'));
      }
    }

    if (e.code === 'KeyM' && !e.repeat) {
      this.isMapOpen = !this.isMapOpen;
      this.updateMinimap();
    }

    // Reloading
    if (e.code === 'KeyR' && !this.isReloading) {
      if (this.tutorialStep < 7) {
         return;
      }
      const inv = this.inventory[this.activeSlot];
      if (!inv) return;
      const stats = WeaponRegistry[inv.id];
      if (stats && stats.type === 'ranged' && inv.ammo !== undefined && inv.ammo < stats.maxAmmo!) {
        this.isReloading = true;
        this.shadowAngle = 0; // reload visual helper
        this.reloadTimer = (stats.reloadTime! / 1000) * 60; // Convert MS to frames roughly
        SoundManager.getInstance().playSound('reload');
        this.dispatchState();
      }
    }
  };
  private handleKeyUp = (e: KeyboardEvent) => {
    if (this.tutorialStep < 15 && this.tutorialStep % 2 === 0) return;
    this.keys[e.code] = false;
  };

  private handleSwap = (e: any) => {
    if (this.tutorialStep < 15 && this.tutorialStep % 2 === 0) return;
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
    SoundManager.getInstance().playSound('close_inventory');
    this.dispatchState();
  };

  private handleContextMenu = (e: MouseEvent) => { e.preventDefault(); };
  private handleMouseDown = (e: MouseEvent) => {
    if (this.tutorialStep < 15 && this.tutorialStep % 2 === 0) return;
    if (e.button === 0) this.isMouseDown = true;
    if (e.button === 2) this.isAiming = true;
  };
  private handleMouseUp = (e: MouseEvent) => {
    if (this.tutorialStep < 15 && this.tutorialStep % 2 === 0) return;
    if (e.button === 0) this.isMouseDown = false;
    if (e.button === 2) this.isAiming = false;
  };
  private handleMouseMove = (e: MouseEvent) => {
    if (this.tutorialStep < 15 && this.tutorialStep % 2 === 0) return;
    this.targetMouseX = e.clientX;
    this.targetMouseY = e.clientY;
  };

  private handleSlotChange = (e: any) => {
    if (this.tutorialStep < 15 && this.tutorialStep % 2 === 0) return;
    if (e.detail >= 0 && e.detail <= 2) {
      this.activeSlot = e.detail;
      this.dispatchState();
    }
  };

  private handleShopBuy = (e: any) => {
    if (e.detail) {
       this.buyItem(e.detail);
    }
  };

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
    window.addEventListener('skip-tutorial', this.handleSkipTutorial);
    window.addEventListener('dialogue-advance', this.handleDialogueAdvance);
    window.addEventListener('shop-buy', this.handleShopBuy);
  }

  private useWeapon(targetAngle: number) {
    const activeInv = this.inventory[this.activeSlot];
    if (!activeInv) return;

    const weaponId = activeInv.id;
    const stats = WeaponRegistry[weaponId];
    if (!stats) return;

    const baseAngle = targetAngle;

    if (stats.type === 'melee') {
      this.gunRecoil = 1.0;
      // Melee uses physical sword rotation with wide arc
      const swing = new Sprite(this.weaponTextures.sword || this.weaponTextures.gun);
      swing.anchor.set(0.5, 0.95);
      swing.scale.set(1.5);
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
             SoundManager.getInstance().playSound('empty_click');
             return; // Block firing if reloading other guns
          }
      }
      if (activeInv.ammo !== undefined) {
          if (activeInv.ammo <= 0) {
              SoundManager.getInstance().playSound('empty_click');
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

      this.gunRecoil = 1.0; // Apply strictlyly upon successful round utilization
      this.spawnParticles(this.gunSprite.x + Math.cos(baseAngle) * 24, this.gunSprite.y + Math.sin(baseAngle) * 24, 0xffaa00, 3);
      for (let i = 0; i < stats.projectilesPerShot; i++) {
        const bulletContainer = new Container();
        bulletContainer.x = this.player.x;
        bulletContainer.y = this.player.y - 12;

        const spreadModifier = this.isAiming ? 0.5 : 1.0;
        const baseSpread = stats.projectilesPerShot > 1 ? (Math.random() - 0.5) * stats.spread : (Math.random() - 0.5) * stats.spread;
        const spreadParams = baseSpread * spreadModifier;
        const finalAngle = baseAngle + spreadParams;

        const speedScale = stats.id === 'mg_bullet' ? 20 : 18;
        const vx = Math.cos(finalAngle) * speedScale;
        const vy = Math.sin(finalAngle) * speedScale;

        const shadow = new Graphics().ellipse(0, 0, 8, 3).fill({ color: 0x000000, alpha: 0.5 });
        shadow.y = 12; // 3d offset
        bulletContainer.addChild(shadow);

        const bulletDepth = new Sprite(this.weaponTextures[stats.projectileSpriteName]);
        bulletDepth.anchor.set(0.5, 0.5);
        bulletDepth.scale.set(4);
        bulletDepth.tint = 0x884400; // dark color
        bulletDepth.y = 4; // offset down
        bulletDepth.rotation = finalAngle;
        bulletContainer.addChild(bulletDepth);

        const bulletSprite = new Sprite(this.weaponTextures[stats.projectileSpriteName]);
        bulletSprite.anchor.set(0.5, 0.5);
        bulletSprite.scale.set(4);
        bulletSprite.rotation = finalAngle;
        bulletContainer.addChild(bulletSprite);

        this.worldContainer.addChild(bulletContainer);
        this.bullets.push({ sprite: bulletContainer, vx, vy, isEnemy: false, bounces: 0 } as any);
      }
    }
    
    SoundManager.getInstance().playSound(stats.sfx);
  }
  
  private checkTutorial() {
      if (this.tutorialStep % 2 === 0) return; // Wait for dialogue to finish
      if (this.tutorialTaskCompleted) return; // Wait for delay

      const pTx = Math.floor(this.player.x / 64);

      if (this.tutorialStep === 1) { // Practice Dodge Roll (Q) or Sprint (Shift)
          if (this.keys['KeyW'] || this.keys['KeyA'] || this.keys['KeyS'] || this.keys['KeyD']) {
              this.hasMoved = true;
          }
          if (this.isSprinting) {
              this.hasSprinted = true;
          }
          if (this.isRolling) {
              this.hasRolled = true;
          }
          if (this.hasMoved && this.hasSprinted && this.hasRolled) {
              this.completeTutorialTask();
          }
      } else if (this.tutorialStep === 3) { // Move into the next chamber
          if (pTx >= 35) {
              this.completeTutorialTask();
          }
      } else if (this.tutorialStep === 5) { // Walk over weapons to equip them
          const hasPistol = this.inventory.some(i => i.id === 'gun');
          const hasSword = this.inventory.some(i => i.id === 'sword');
          if (hasPistol && hasSword) {
              this.completeTutorialTask();
          }
      } else if (this.tutorialStep === 7) { // Aim, shoot, and reload calibration
          if (this.isAiming) {
              this.hasAimed = true;
          }
          if (this.isMouseDown) {
              this.hasFired = true;
          }
          if (this.isReloading) {
              this.hasReloaded = true;
          }
          if (this.hasAimed && this.hasFired && this.hasReloaded) {
              this.completeTutorialTask();
          }
      } else if (this.tutorialStep === 9) { // Move to Room 2 Combat Arena
          if (pTx >= 68) {
              this.completeTutorialTask();
          }
      } else if (this.tutorialStep === 11) { // Defeat all security grunts
          if (this.tutorialProgress >= 3) {
              this.completeTutorialTask();
          }
      } else if (this.tutorialStep === 13) { // Open Backpack and buy a potion
          if (this.inventory.some(i => i.id === 'potion')) {
              this.completeTutorialTask();
          }
      } else if (this.tutorialStep === 15) {
          // Handled via portal overlap Space check
      }
  }

  private completeTutorialTask() {
      this.tutorialTaskCompleted = true;
      this.tutorialDelayTimer = 120; // 2 seconds
      this.dispatchTutorial();
  }

  private update(dt: number) {
    if (this.destroyed) return;

    if (this.tutorialStep < 15) {
      this.checkTutorial();
      this.updateTrailParticles(dt);
    }
    
    // Hit-stop effect: pause game simulation momentarily for heavy impacts
    if (this.hitStopFrames > 0) {
      this.hitStopFrames -= 1; // Not dt, actual frames to simulate heavy microscopic stutter
      this.updateCamera(0); // Pass 0 to freeze camera tracking but still render
      return;
    }

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
    
    // Spawn new ambient particle around camera (throttled for perf)
    if (Math.random() < 0.08 && this.ambientParticles.length < 30) { 
       const p = new Graphics();
       let color = 0xffffff;
       if (isMagma) color = 0xff5500;
       else if (isVoid) color = 0xaa00ff;
       else color = 0xaaddff; // plains gets pollen/fireflies
       
       const size = Math.floor(2 + Math.random() * 3); // 2 to 4 pixels chunky style
       p.rect(-size, -size, size * 2, size * 2).fill({color, alpha: 0.3 + Math.random()*0.3});
       // blendMode removed for performance (forces separate draw calls)
       
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

    if (this.tutorialStep % 2 === 0 && this.tutorialStep < 15) {
       this.isAiming = false;
       this.isRolling = false;
       this.keys = {};
    } else if (this.tutorialStep % 2 !== 0 && this.tutorialStep < 15) {
       if (this.tutorialTaskCompleted) {
           // Allow time to pass even if inventory is open during tutorial
           this.tutorialDelayTimer -= dt;
           if (this.tutorialDelayTimer <= 0) {
               this.tutorialStep++;
               this.tutorialProgress = 0;
               this.tutorialTaskCompleted = false;
               this.dispatchTutorial();
               this.triggerDialogueIfNeeded();
           }
       }
    }

    if (this.playerHP <= 0 || this.isInventoryOpen || this.isSettingsOpen) return; // Freeze simulation on death, inventory, or settings


      // Room Lockdown & Cleared Logic
      const pTileX = Math.floor(this.player.x / TILE_PX);
      const pTileY = Math.floor(this.player.y / TILE_PX);
      
      let activePlayerRoom: DungeonRoom | null = null;
      for (const room of this.dungeonRooms) {
        const startX = room.tx - Math.floor(room.tw / 2);
        const startY = room.ty - Math.floor(room.th / 2);
        if (pTileX >= startX && pTileX < startX + room.tw &&
            pTileY >= startY && pTileY < startY + room.th) {
          activePlayerRoom = room;
          break;
        }
      }

      if (activePlayerRoom && !activePlayerRoom.cleared && !activePlayerRoom.active) {
        activePlayerRoom.active = true;
        activePlayerRoom.cleared = true;
        
        if (this.currentDungeonWorld > 1 || this.currentDungeonStage > 1) {
            this.activeRoomId = activePlayerRoom.id;
            
            if (this.currentDungeonStage === 10) {
               activePlayerRoom.cleared = true; 
            } else {
               let numEnemies = (3 + Math.floor(Math.random() * 4)) + this.currentDungeonStage;
               if (this.currentDungeonStage === 5 && activePlayerRoom.isEndRoom) numEnemies = 1;

               this.activeRoomEnemies = numEnemies;
               const biome = this.getBiomeAt(0, 0);
               
               for (let i = 0; i < numEnemies; i++) {
                   let rx = 0, ry = 0;
                   if (biome === 0) {
                       // Forest bubble clearings are very small. Tightly cluster.
                       rx = activePlayerRoom.tx * 64 + (Math.random() * 128 - 64) + 32;
                       ry = activePlayerRoom.ty * 64 + (Math.random() * 128 - 64) + 32;
                   } else {
                       rx = activePlayerRoom.tx * 64 + Math.floor(Math.random() * (activePlayerRoom.tw * 64 - 128)) - Math.floor((activePlayerRoom.tw * 64)/2) + 64;
                       ry = activePlayerRoom.ty * 64 + Math.floor(Math.random() * (activePlayerRoom.th * 64 - 128)) - Math.floor((activePlayerRoom.th * 64)/2) + 64;
                   }
                   
                   const customProps = { roomId: activePlayerRoom.id };
                   if (this.currentDungeonStage === 5 && activePlayerRoom.isEndRoom) {
                       Object.assign(customProps, { enemyTypeId: 'golem', maxHp: 500, hp: 500, speed: 1.5, scale: 3 });
                       this.spawnEnemy(rx, ry, 'bull', customProps);
                   } else {
                       const archetypes: EnemyArchetype[] = ['grunt', 'archer', 'shield', 'shaman', 'bomber', 'bull', 'spider'];
                       const arch = archetypes[Math.floor(Math.random() * archetypes.length)];
                       this.spawnEnemy(rx, ry, arch, customProps);
                   }
               }
            }
        }
      }

      // Endgame Logic
      if (this.isEndgameActive) {
          this.endgameTimer -= dt;
          
          if (this.frameCount % 60 === 0) {
              window.dispatchEvent(new CustomEvent('endgame-timer', { detail: Math.ceil(this.endgameTimer / 60) }));
          }

          if (this.endgameTimer > 0) {
              // Endless intense wave spawning
              if (this.frameCount % 90 === 0 && this.monsters.length < 30) {
                  const archetypes: EnemyArchetype[] = ['grunt', 'archer', 'shield', 'shaman', 'bomber', 'spider'];
                  const arch = archetypes[Math.floor(Math.random() * archetypes.length)];
                  
                  // Spawn randomly around player but offscreen
                  const angle = Math.random() * Math.PI * 2;
                  const dist = 600 + Math.random() * 200;
                  const sx = this.player.x + Math.cos(angle) * dist;
                  const sy = this.player.y + Math.sin(angle) * dist;
                  
                  this.spawnEnemy(sx, sy, arch);
              }
          } else if (!this.hasSpawnedEndgamePortal) {
              this.hasSpawnedEndgamePortal = true;
              
              // Vaporize all enemies
              for (const m of this.monsters) {
                  this.spawnParticles(m.x, m.y, 0xffffff, 20);
                  this.worldContainer.removeChild(m);
                  m.destroy();
              }
              this.monsters = [];
              
              SoundManager.getInstance().playSound('elemental_explode');
              this.shakeAmount = 100;
              
              const flash = new Graphics().rect(0, 0, this.app.screen.width, this.app.screen.height).fill({ color: 0xffffff, alpha: 0.8 });
              flash.zIndex = 9999999;
              this.app.stage.addChild(flash);
              let flashAlpha = 0.8;
              const flashInt = setInterval(() => {
                  flashAlpha -= 0.05;
                  if (flashAlpha <= 0) {
                      clearInterval(flashInt);
                      this.app.stage.removeChild(flash);
                      flash.destroy();
                  } else {
                      flash.alpha = flashAlpha;
                  }
              }, 50);

              // Spawn Rift
              this.portalSpawned = true;
              const portalX = this.player.x;
              const portalY = this.player.y - 150;

              this.portalSprite = new Sprite(this.mapTextures.relic_void); // Using relic as Aether rift
              this.portalSprite.anchor.set(0.5, 0.5);
              this.portalSprite.scale.set(6);
              this.portalSprite.x = portalX;
              this.portalSprite.y = portalY;
              this.portalSprite.alpha = 1.0;
              this.portalSprite.zIndex = portalY;
              this.worldContainer.addChild(this.portalSprite);

              const style = new TextStyle({ fontFamily: "'CustomFont', Arial", fontSize: 36, fill: '#aa00ff', stroke: { color: '#000000', width: 5 }, fontWeight: 'bold' });
              const clearText = new Text({ text: 'AETHER RIFT OPENED!', style });
              clearText.anchor.set(0.5, 0.5);
              clearText.x = this.player.x;
              clearText.y = this.player.y - 100;
              clearText.zIndex = this.player.y + 100;
              this.worldContainer.addChild(clearText);
              this.damagePopups.push({ sprite: clearText, life: 180 });
          }
      }

      // Dynamic 2.5D Environment
      this.renderEnvironment();

      // Dynamic lighting update
      this.updateLighting();
      this.updateSpawns();

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
            this.shakeAmount = 25;
            this.hitStopFrames = 4;
            this.invulnerableTimer = 60;
            if (this.playerHP <= 0) SoundManager.getInstance().playSound('death');
            else SoundManager.getInstance().playSound('hit');
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
            this.shakeAmount = 15;
            this.hitStopFrames = 2;
            this.invulnerableTimer = 30;
            if (this.playerHP <= 0) SoundManager.getInstance().playSound('death');
            else SoundManager.getInstance().playSound('hit');
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
               SoundManager.getInstance().playSound('artifact_pickup');
               
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
                  SoundManager.getInstance().playSound('shrine_awaken');
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

      let targetX: number | null = null;
      let targetY: number | null = null;
      if (this.tutorialStep < 15) {
         if (this.tutorialStep === 3) {
            targetX = 6 * 64;
            targetY = 0;
         } else if (this.tutorialStep === 5) {
            targetX = 40 * 64;
            targetY = 0;
         } else if (this.tutorialStep === 9) {
            targetX = 68 * 64;
            targetY = 0;
         } else if (this.tutorialStep === 13) {
            targetX = 105 * 64;
            targetY = 0;
         }
      }

      if (this.tutorialStep >= 15 && nearestArtifact) {
          // Sonar Ping
          this.sonarTimer -= dt;
          if (this.sonarTimer <= 0) {
              const pingInterval = Math.max(30, nearestArtifact.dist / 10);
              this.sonarTimer = pingInterval;
              if (nearestArtifact.dist < 1500) {
                 SoundManager.getInstance().playSound('artifact_ping');
              }
          }
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

        // Also spawn merchant nearby (REMOVED)
        // Spawn Gatekeeper Boss (REMOVED)

        const style = new TextStyle({ fontFamily: "'CustomFont', Arial", fontSize: 36, fill: '#00ffff', stroke: { color: '#000000', width: 5 }, fontWeight: 'bold' });
        const clearText = new Text({ text: 'PORTAL OPENED!', style });
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
       this.portalSprite.rotation += 0.02 * dt;
       const pScale = (this.portalSprite.texture === this.mapTextures.relic_void) ? 6 : 4;
       const s = pScale + Math.sin(performance.now() / 200) * 0.2;
       this.portalSprite.scale.set(s);
       if (Math.random() < 0.2) {
          const angle = Math.random() * Math.PI * 2;
          const r = 40;
          this.spawnParticles(this.portalSprite.x + Math.cos(angle) * r, this.portalSprite.y + Math.sin(angle) * r, 0x00ffff, 1);
       }

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
                 SoundManager.getInstance().playSound('empty_click');
             } else {
                 this.keys['Space'] = false;
                  SoundManager.getInstance().playSound('level_up');
                  if (this.tutorialStep === 15) {
                      this.tutorialStep = 15;
                      this.currentDungeonStage = 2;
                      this.currentDungeonWorld = 1;
                      this.playerHP = this.playerMaxHP;
                      this.initOpenWorld();
                      this.player.x = 0;
                      this.player.y = 0;
                      if (this.portalSprite) {
                         this.worldContainer.removeChild(this.portalSprite);
                         this.portalSprite.destroy();
                         this.portalSprite = null;
                      }
                      this.dispatchTutorial();
                      this.dispatchState();
                      return;
                  }
                  if (this.tutorialStep < 15) {
                      this.tutorialStep = 15;
                      this.dispatchTutorial();
                  }
                  
                  if (this.isEndgameActive) {
                      window.dispatchEvent(new CustomEvent('victory'));
                      return;
                  }

                  this.currentDungeonStage++;
                  if (this.currentDungeonStage > 10) {
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
        if (!activeInv) {
           this.isReloading = false;
           this.dispatchState();
           return;
        }
        const stats = WeaponRegistry[activeInv.id];
        if (stats && stats.type === 'ranged') {
           if (activeInv.id === 'shotgun') {
               activeInv.ammo = (activeInv.ammo || 0) + 1;
               SoundManager.getInstance().playSound('reload');
               if (activeInv.ammo < stats.maxAmmo!) {
                  this.reloadTimer = (stats.reloadTime! / 1000) * 60;
               } else {
                  this.isReloading = false;
               }
           } else {
               activeInv.ammo = stats.maxAmmo!;
               this.isReloading = false;
               SoundManager.getInstance().playSound('reload');
           }
           this.dispatchState();
        } else {
           this.isReloading = false;
           this.dispatchState();
        }
      }
    }


    // Base Speed processing
    let speed = this.basePlayerSpeed;
    let dx = 0;
    let dy = 0;

    const canMove = this.tutorialStep > 14 || this.tutorialStep % 2 !== 0;
    if (canMove) {
        if (this.keys['ArrowUp'] || this.keys['KeyW']) dy -= 1;
        if (this.keys['ArrowDown'] || this.keys['KeyS']) dy += 1;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) dx -= 1;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) dx += 1;


    }

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
        speed = 58 * Math.pow(1 - p, 2); 
        
        // Z-axis jump offset for extreme smoothness
        this.player.anchor.y = 0.875 + Math.sin(p * Math.PI) * 0.35;
        
        dx = this.rollDirection.x;
        dy = this.rollDirection.y;
      }
    } else {
      if (this.keys['KeyQ'] || this.keys['KeyC']) {
        const rollStaminaCost = 150;
        if (this.stamina >= rollStaminaCost && this.rollCooldownTimer <= 0 && (dx !== 0 || dy !== 0)) {
          this.isRolling = true;
          this.stamina -= rollStaminaCost;
          this.rollTimer = 24;
          this.rollCooldownTimer = this.upgrades.tactical_roll ? 38 : 48; // 20% faster cooldown
          this.rollDirection = { x: dx, y: dy };
          this.isInvulnerable = true;
          this.invulnerableTimer = 24;
          speed = 45; // Initial burst speed
          this.keys['KeyQ'] = false;
          this.keys['KeyC'] = false; 
        }
      }
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

    // Update stamina bar graphics smoothly (float + sine bob)
    const staminaTargetX = this.player.x - 40;
    this.staminaGroup.x += (staminaTargetX - this.staminaGroup.x) * Math.min(1, 0.15 * dt);
    const staminaTargetY = (this.player.y - 70) + Math.sin(performance.now() / 200) * 4;
    this.staminaGroup.y += (staminaTargetY - this.staminaGroup.y) * Math.min(1, 0.15 * dt);
    
    // Floating Circle Arc logic
    // Only redraw stamina arc when the visual value actually changes
    const progress = Math.max(0, this.stamina / this.maxStamina);
    const staminaKey = Math.round(progress * 50); // 50 visual steps is plenty smooth
    if ((this as any)._lastStaminaKey !== staminaKey) {
      (this as any)._lastStaminaKey = staminaKey;
      this.staminaBarFill.clear();
      if (progress > 0) {
        this.staminaBarFill.arc(0, 0, 10, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
        const barColor = (this.stamina < 50 || this.rollCooldownTimer > 0) ? 0xFFA500 : 0x00FF00;
        this.staminaBarFill.stroke({ width: 8, color: barColor, cap: 'round' });
      }
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
    const activeInvPenalty = this.inventory[this.activeSlot];
    const activeStats = activeInvPenalty ? WeaponRegistry[activeInvPenalty.id] : undefined;
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
      
      // Top-down fake 3D physics
      if (p.z < 0 || p.vz < 0) { // In the air
         p.vz += 0.5 * dt; // Gravity
         p.z += p.vz * dt;
         p.sprite.y += p.vz * dt; // visually move up/down
         
         // Move in x/y while in air
         p.sprite.x += p.vx * dt;
         p.sprite.y += p.vy * dt; // base y movement
         
         // Ground collision bounce
         if (p.z >= 0 && p.vz > 0) {
            p.z = 0;
            p.vz *= -0.5; // lose vertical bounce energy
            p.vx *= 0.6; // friction on bounce
            p.vy *= 0.6;
            if (Math.abs(p.vz) < 1) p.vz = 0; // come to rest
         }
      } else {
         // Sliding on ground friction
         p.vx *= Math.pow(0.8, dt);
         p.vy *= Math.pow(0.8, dt);
         p.sprite.x += p.vx * dt;
         p.sprite.y += p.vy * dt;
      }
      
      p.sprite.alpha = Math.min(1, p.life / (p.maxLife * 0.5)); // Fade out slower
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
       
       const cdx = this.player.x - item.sprite.x;
       // Use baseY only if the item is currently floating, otherwise use actual y
       const isFloating = (item.sprite as any).isFloating !== false;
       const itemRealY = (isFloating && (item.sprite as any).baseY !== undefined) ? (item.sprite as any).baseY : item.sprite.y;
       const cdy = (this.player.y - 12) - itemRealY;
       const dist = Math.hypot(cdx, cdy);
 
       // Magnet Drop Items Pickup Radius logic
       if (dist < 150 && dist > 8) {
         // Stop bobbing when magnetized
         (item.sprite as any).isFloating = false;
         
         const magnetSpeed = 10 * dt;
         item.sprite.x += (cdx / dist) * magnetSpeed;
         item.sprite.y += (cdy / dist) * magnetSpeed;
       } else if ((item.sprite as any).isFloating) {
          (item.sprite as any).bobTime += 0.05 * dt;
          const offset = Math.sin((item.sprite as any).bobTime) * 8;
          item.sprite.y = (item.sprite as any).baseY + offset;
          if ((item.sprite as any).shadowChild) {
             const scale = 1 - (offset / 24);
             (item.sprite as any).shadowChild.scale.set(scale);
             (item.sprite as any).shadowChild.alpha = 0.35 * (1 - (offset / 32));
          }
       } else {
          item.sprite.y += Math.sin(performance.now() / 200) * 0.2;
       }
 
       // Pickup collision
       if (dist < 32) {
         if (item.id === 'potion') {
             const existingSlot = this.inventory.findIndex(inv => inv.id === 'potion');
             if (existingSlot !== -1) {
               this.inventory[existingSlot].count += item.count;
             } else {
               this.inventory.push({ id: 'potion', count: item.count, ammo: undefined });
             }
         } else {
             // Weapon pickup
             const existingSlot = this.inventory.findIndex(inv => inv.id === item.id);
             if (existingSlot === -1) {
                const stats = WeaponRegistry[item.id];
                const startAmmo = stats ? stats.maxAmmo : undefined;
                this.inventory.push({ id: item.id, count: 1, ammo: startAmmo });
                this.activeSlot = this.inventory.length - 1; // Auto equip
             }
         }
         this.worldContainer.removeChild(item.sprite);
         item.sprite.destroy();
         this.droppedItems.splice(i, 1);
         this.dispatchState();
         SoundManager.getInstance().playSound('pickup');
       }     }

    // Cursor-based targeting (accounting for zoom scale)
    const worldMouseX = (this.mouseX - this.worldContainer.x) / 1.0;
    const worldMouseY = (this.mouseY - this.worldContainer.y) / 1.0;
    const targetAngle = Math.atan2(worldMouseY - this.gunSprite.y, worldMouseX - this.gunSprite.x);

    // Use items or shoot
    const now = performance.now();
    const slotIdx = this.activeSlot;
    const activeInvCurrent = this.inventory[slotIdx];
    const slotId = activeInvCurrent ? activeInvCurrent.id : '';

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
    const canShoot = this.tutorialStep >= 7 && (this.tutorialStep > 14 || this.tutorialStep % 2 !== 0);
    if (canShoot && !this.isRolling && (this.keys['Space'] || this.isMouseDown) && now - this.lastShootTime > fireRateMs) {
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
      SoundManager.getInstance().playSound('drink');
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
    const defaultScale = isMeleeEquipped ? 5 : 4;

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
          const key = `${x},${y}`;
          if (this.waterCells.has(key) || this.obstacleCells.has(key) || !this.floorCells.has(key)) return true;
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
      
      // 1.5 Chest Interaction Proximity Check
      for (const ch of this.dungeonChests) {
        if (!ch.opened) {
          const dist = Math.hypot(this.player.x - ch.sprite.x, this.player.y - ch.sprite.y);
          if (dist < 48) {
            ch.opened = true;
            ch.sprite.texture = this.mapTextures.chest_open;

            this.obstacleCells.delete(`${ch.tx},${ch.ty}`);
            SoundManager.getInstance().playSound('room_clear');
            
            // Scatter loot: coins, health/speed potions, custom weapons
            const numCoins = 5 + Math.floor(Math.random() * 6);
            for (let c = 0; c < numCoins; c++) {
              const angle = Math.random() * Math.PI * 2;
              const rx = ch.sprite.x + Math.cos(angle) * 32;
              const ry = ch.sprite.y + Math.sin(angle) * 32;
              
              const coinSprite = new Sprite(this.coinTexture);
              coinSprite.anchor.set(0.5, 0.5);
              coinSprite.scale.set(0.15);
              coinSprite.x = ch.sprite.x;
              coinSprite.y = ch.sprite.y - 8;
              coinSprite.zIndex = ry;
              this.worldContainer.addChild(coinSprite);
              
              this.coinDrops.push({ sprite: coinSprite, life: 600 });
              coinSprite.x = rx;
              coinSprite.y = ry;
            }
            
            const numItems = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < numItems; i++) {
              const itemType = Math.random() < 0.6 ? 'potion' : (Math.random() < 0.5 ? 'shotgun' : 'gun');
              const angle = Math.random() * Math.PI * 2;
              const rx = ch.sprite.x + Math.cos(angle) * 48;
              const ry = ch.sprite.y + Math.sin(angle) * 48;
              
              const itemTex = itemType === 'potion' ? this.potionTexture : this.weaponTextures[itemType];
              if (itemTex) {
                const itemSprite = new Sprite(itemTex);
                itemSprite.anchor.set(0.5, 0.5);
                itemSprite.scale.set(itemType === 'potion' ? 3 : 2.5);
                itemSprite.x = rx;
                itemSprite.y = ry;
                itemSprite.zIndex = ry;
                this.worldContainer.addChild(itemSprite);
                this.droppedItems.push({ sprite: itemSprite, id: itemType, count: 1 });
              }
            }
          }
        }
      }

      // 2. Resolve Prop Overlaps (Push-out Sliding Physics)
      for (const prop of this.allProps) {
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


    // Process EXP Drops
    for (let i = this.expDrops.length - 1; i >= 0; i--) {
      const exp = this.expDrops[i];
      exp.life -= dt;

      exp.sprite.y += Math.sin(performance.now() / 150) * 0.4;
      exp.sprite.alpha = Math.min(1, exp.life / 60);

      const cdx = this.player.x - exp.sprite.x;
      const cdy = (this.player.y - 12) - exp.sprite.y;
      const dist = Math.hypot(cdx, cdy);

      // Magnet logic
      if (dist < 300 && dist > 8) {
        const magnetSpeed = 20 * dt;
        exp.sprite.x += (cdx / dist) * magnetSpeed;
        exp.sprite.y += (cdy / dist) * magnetSpeed;
      }

      if (dist < 40) {
        this.playerExp += 1; // 1 exp per orb
        SoundManager.getInstance().playSound('pickup');
        this.worldContainer.removeChild(exp.sprite);
        exp.sprite.destroy();
        this.expDrops.splice(i, 1);
        
        if (this.playerExp >= this.playerMaxExp) {
           this.playerExp -= this.playerMaxExp;
           this.playerLevel += 1;
           this.playerMaxExp = Math.floor(this.playerMaxExp * 1.5);
           this.hitStopFrames = 30; // 0.5s dramatic pause
           SoundManager.getInstance().playSound('level_up');
           
           // Apply Buffs
           this.playerMaxHP += 2;
           this.playerHP = this.playerMaxHP;
           this.playerDmg += 5;
           this.basePlayerSpeed += 0.2;
           
           // Show text
           const style = new TextStyle({ fontFamily: '"CustomFont", Arial', fontSize: 24, fill: '#00ffff', stroke: { color: '#000000', width: 4 }, fontWeight: 'bold', align: 'center' });
           const levelUpText = new Text({ text: `LEVEL UP!\n+ DMG + SPEED + HP`, style });
           levelUpText.anchor.set(0.5, 1);
           levelUpText.x = this.player.x;
           levelUpText.y = this.player.y - 60;
           levelUpText.zIndex = 99999;
           this.worldContainer.addChild(levelUpText);
           this.damagePopups.push({ sprite: levelUpText, life: 120 });
           
           // Open Level Up UI
           window.dispatchEvent(new CustomEvent('level-up-trigger', {
               detail: { level: this.playerLevel }
           }));
        }
        this.dispatchState();
        continue;
      }

      if (exp.life <= 0) {
        this.worldContainer.removeChild(exp.sprite);
        exp.sprite.destroy();
        this.expDrops.splice(i, 1);
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
        SoundManager.getInstance().playSound('pickup');
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

        // SWORD BULLET DEFLECTION BLOCK
        const bladeAngle = b.sprite.rotation - Math.PI / 2;
        const bx = b.sprite.x;
        const by = b.sprite.y;

        for (const otherB of this.bullets) {
          if (otherB.isEnemy && otherB.sprite && !otherB.sprite.destroyed) {
            const dist = Math.hypot(otherB.sprite.x - bx, otherB.sprite.y - by);
            if (dist < 160) {
              const angleToBullet = Math.atan2(otherB.sprite.y - by, otherB.sprite.x - bx);
              let diff = Math.abs(angleToBullet - bladeAngle);
              if (diff > Math.PI) diff = Math.PI * 2 - diff; // Normalize
              
              if (diff <= 0.45) {
                // Deflect the projectile!
                otherB.isEnemy = false;
                (otherB as any).deflectedDamage = 20;
                otherB.vx = -otherB.vx * 1.5;
                otherB.vy = -otherB.vy * 1.5;
                if (otherB.sprite) {
                  otherB.sprite.tint = 0x00ffcc;
                  otherB.sprite.scale.x *= 1.5;
                  otherB.sprite.scale.y *= 1.5;
                  otherB.sprite.rotation = Math.atan2(otherB.vy, otherB.vx);
                }
                SoundManager.getInstance().playSound('knife_swing', otherB.sprite.x, otherB.sprite.y);
                this.spawnParticles(otherB.sprite.x, otherB.sprite.y, 0x00ffcc, 6);
              }
            }
          }
        }
      } else {
        // Wraith purple homing steering logic
        if ((b as any).homing && b.isEnemy) {
          const targetX = this.player.x;
          const targetY = this.player.y - 24;
          const targetAngle = Math.atan2(targetY - b.sprite.y, targetX - b.sprite.x);
          
          let curAngle = Math.atan2(b.vy, b.vx);
          
          let angleDiff = targetAngle - curAngle;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          
          const maxRotation = 0.035 * dt;
          const rotationStep = Math.min(Math.abs(angleDiff), maxRotation) * Math.sign(angleDiff);
          
          const newAngle = curAngle + rotationStep;
          const speed = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(newAngle) * speed;
          b.vy = Math.sin(newAngle) * speed;
          if (b.sprite) {
            b.sprite.rotation = newAngle;
          }
        }

        b.sprite.x += b.vx * dt;
        b.sprite.y += b.vy * dt;

        // Bullet Wall/Prop Collision
                {
                  let hitWall = false;
                  let hitNX = 0;
                  let hitNY = 0;
                  let hitColor = 0x00ffff;

                  // Check against meshes
                  for (const prop of this.allProps) {
                     if (prop.destroyed) continue;
                     const propRadius = prop.width * 0.35;
                     const dx = b.sprite.x - prop.x;
                     const dy = b.sprite.y - (prop.y - prop.height * 0.4); // Target center of mass
                     if (dx*dx + dy*dy < (10 + propRadius) * (10 + propRadius)) {
                        if (!b.isEnemy && prop.texture === this.mapTextures.crate) {
                            b.life = 0; // Destroy bullet
                            // Find and damage crate
                            for (let d = this.destructibles.length - 1; d >= 0; d--) {
                               const crate = this.destructibles[d];
                               if (crate.sprite === prop) {
                                  crate.hp -= this.playerDmg;
                                  SoundManager.getInstance().playSound('hit');
                                  this.spawnParticles(crate.sprite.x, crate.sprite.y - 30, 0xddaa55, 5); // Wood splinters

                                  if (crate.hp <= 0) {
                                     const px = prop.x;
                                     const py = prop.y;

                                     this.obstacleCells.delete(`${crate.tx},${crate.ty}`);
                                     crate.sprite.destroy({ children: true });
                                     this.destructibles.splice(d, 1);
                                     this.allProps = this.allProps.filter(p => p !== prop);

                                     SoundManager.getInstance().playSound('kill');
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
                            hitWall = true;
                            hitNX = Math.sign(b.vx);
                            hitNY = Math.sign(b.vy);
                            const ctx = Math.floor(prop.x / 64);
                            const cty = Math.floor(prop.y / 64);
                            hitColor = this.getBiomeColors(this.getBiomeAt(ctx, cty)).wallLight;
                        }
                        break;
                     }
                  }

                  // Check grid collision
                  if (!hitWall && (b.life === undefined || b.life > 0)) {
                     const tx = Math.floor(b.sprite.x / 64);
                     const ty = Math.floor(b.sprite.y / 64);
                     if (this.obstacleCells.has(`${tx},${ty}`)) {
                        hitWall = true;
                        hitColor = this.getBiomeColors(this.getBiomeAt(tx, ty)).wallLight;
                        const ptx = Math.floor((b.sprite.x - b.vx * dt) / 64);
                        const pty = Math.floor((b.sprite.y - b.vy * dt) / 64);
                        if (ptx !== tx && pty === ty) { hitNX = Math.sign(b.vx); hitNY = 0; }
                        else if (pty !== ty && ptx === tx) { hitNY = Math.sign(b.vy); hitNX = 0; }
                        else { hitNX = Math.sign(b.vx); hitNY = Math.sign(b.vy); }
                     }
                  }

                  if (hitWall) {
                     if (!(b as any).bounces) {
                        (b as any).bounces = 1;
                        if (hitNX !== 0) b.vx *= -1;
                        else if (hitNY !== 0) b.vy *= -1;
                        else { b.vx *= -1; b.vy *= -1; }

                        if (b.sprite && !b.sprite.destroyed) {
                    if (b.sprite.children && b.sprite.children.length === 3) {
                       b.sprite.children[1].rotation = Math.atan2(b.vy, b.vx);
                       b.sprite.children[2].rotation = Math.atan2(b.vy, b.vx);
                    } else {
                       b.sprite.rotation = Math.atan2(b.vy, b.vx);
                    }
                }
                        this.spawnParticles(b.sprite.x, b.sprite.y, hitColor, 3);
                     } else {
                        this.spawnParticles(b.sprite.x, b.sprite.y, hitColor, 4);
                        b.life = 0; // Destroy on second hit
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
          if (this.playerHP <= 0) SoundManager.getInstance().playSound('death');
          else SoundManager.getInstance().playSound('hit');
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
            let finalDamage = (b as any).deflectedDamage !== undefined ? (b as any).deflectedDamage : (activeStats ? activeStats.damage : this.playerDmg);
            if (!(b as any).isMelee && activeStats?.type === 'melee') finalDamage += this.playerDmg * 0.5;

            (monster as any).hp -= finalDamage;
            SoundManager.getInstance().playSound('hit', b.sprite.x, b.sprite.y);
            this.shakeAmount = 10;
            this.hitStopFrames = 2;
            
            let bloodColor = 0x44aa44; // goblin
            const eType = (monster as any).enemyTypeId;
            if (eType === 'brute') bloodColor = 0xaa4444;
            else if (eType === 'shaman') bloodColor = 0x8844aa;
            else if (eType === 'magma') bloodColor = 0xff6600;
            else if (eType === 'wraith') bloodColor = 0x6600ff;
            else if (eType === 'golem') bloodColor = 0x888888;
            this.spawnParticles(b.sprite.x, b.sprite.y, bloodColor, 5);

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
              this.killMonster(monster, j);
            }
            if (!(b as any).isMelee && (!this.upgrades.piercing_rounds || (b as any).pierced)) break; // Pierce logic
            if (!(b as any).isMelee && this.upgrades.piercing_rounds) (b as any).pierced = true;
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
                 SoundManager.getInstance().playSound('hit', crate.sprite.x, crate.sprite.y);
                 this.shakeAmount = 5;
                 this.hitStopFrames = 1;
                 this.spawnParticles(crate.sprite.x, crate.sprite.y - 30, 0xddaa55, 5); // Wood splinters

                 if (crate.hp <= 0) {
                   const cx = crate.sprite.x;
                   const cy = crate.sprite.y;

                   this.obstacleCells.delete(`${crate.x},${crate.y}`);

                   crate.sprite.destroy({ children: true });
                   this.destructibles.splice(d, 1);
                   this.allProps = this.allProps.filter(p => !p.destroyed);
                   
                   SoundManager.getInstance().playSound('kill');

                   // 50% chance to drop coin
                   if (Math.random() < 0.50) {
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

    // Process Monsters removed since no longer needed.

    // Handle iFrames (invulnerability wrapper)
    if (this.isInvulnerable) {
      this.invulnerableTimer -= dt;
      // Flicker effect
      if (!this.isRolling) {
         this.player.alpha = (Math.floor(this.invulnerableTimer / 5) % 2 === 0) ? 0.3 : 1;
      } else {
         this.player.alpha = 1;
      }
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
      for (let ox = -15; ox <= 15; ox++) {
        for (let oy = -15; oy <= 15; oy++) {
          const key = `${epx + ox},${epy + oy}`;
          if (this.floorCells.has(key)) {
            this.exploredCells.add(key);
          }
        }
      }
      // Throttle minimap to every 10 frames — it's expensive (hundreds of Graphics.rect calls)
      if (this.frameCount % 10 === 0) this.updateMinimap();


    for (let j = this.monsters.length - 1; j >= 0; j--) {
      const monster = this.monsters[j];
      monster.zIndex = monster.y;

      if (monster instanceof SkeletonEnemy) {
          const dx = this.player.x - monster.x;
          const dy = this.player.y - monster.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 800) { // Aggro range
             if (monster.archetype === 'grunt' || monster.archetype === 'shield' || monster.archetype === 'bull') {
                 if (monster.archetype === 'bull') {
                     monster.stateTimer += dt;
                     if (monster.aiState === 'idle') {
                         monster.vx = 0; monster.vy = 0; monster.state = 'idle';
                         if (monster.stateTimer > 120 && dist < 400) {
                             monster.aiState = 'charge'; monster.stateTimer = 0;
                             monster.customData.targetX = this.player.x;
                             monster.customData.targetY = this.player.y;
                             SoundManager.getInstance().playSound('brute_slam');
                         }
                     } else if (monster.aiState === 'charge') {
                         const cdx = monster.customData.targetX - monster.x;
                         const cdy = monster.customData.targetY - monster.y;
                         const cDist = Math.hypot(cdx, cdy);
                         if (cDist < 10 || monster.stateTimer > 60) {
                             monster.aiState = 'cooldown'; monster.stateTimer = 0;
                         } else {
                             monster.vx = (cdx / cDist) * (monster.speed * 3);
                             monster.vy = (cdy / cDist) * (monster.speed * 3);
                             monster.state = 'run';
                         }
                         if (dist < 40 && !this.isInvulnerable) {
                             this.playerHP -= 4; this.isInvulnerable = true; this.invulnerableTimer = 60;
                             SoundManager.getInstance().playSound('hit'); this.shakeAmount = 25;
                         }
                     } else if (monster.aiState === 'cooldown') {
                         monster.vx = 0; monster.vy = 0; monster.state = 'idle';
                         if (monster.stateTimer > 90) { monster.aiState = 'idle'; monster.stateTimer = 0; }
                     }
                 } else { // Grunt / Shield
                     if (dist > 30) {
                         monster.vx = (dx / dist) * monster.speed;
                         monster.vy = (dy / dist) * monster.speed;
                         monster.state = 'run';
                     } else {
                         monster.vx = 0; monster.vy = 0; monster.state = 'attack';
                         if (this.frameCount % 30 === 0 && !this.isInvulnerable) {
                             this.playerHP -= 2; this.isInvulnerable = true; this.invulnerableTimer = 60;
                             SoundManager.getInstance().playSound('hit'); this.shakeAmount = 15;
                         }
                     }
                 }
             } else if (monster.archetype === 'spider') {
                 monster.stateTimer += dt;
                 if (monster.aiState === 'idle') {
                     monster.vx = (dx / dist) * monster.speed;
                     monster.vy = (dy / dist) * monster.speed;
                     monster.state = 'run';
                     if (monster.stateTimer > 180 && dist < 300) {
                         monster.aiState = 'burrow'; monster.stateTimer = 0;
                         monster.alpha = 0; // completely invisible
                     }
                 } else if (monster.aiState === 'burrow') {
                     monster.vx = (dx / dist) * (monster.speed * 1.5);
                     monster.vy = (dy / dist) * (monster.speed * 1.5);
                     // Dust trail
                     if (Math.random() < 0.4) this.spawnParticles(monster.x, monster.y, 0x555555, 1);
                     
                     if (monster.stateTimer > 120 && dist < 50) {
                         monster.aiState = 'surface'; monster.stateTimer = 0;
                         monster.alpha = 1.0;
                         this.spawnExclamation(monster);
                         if (!this.isInvulnerable) {
                             this.playerHP -= 3; this.isInvulnerable = true; this.invulnerableTimer = 60;
                             SoundManager.getInstance().playSound('hit'); this.shakeAmount = 20;
                         }
                     } else if (monster.stateTimer > 200) {
                         monster.aiState = 'idle'; monster.stateTimer = 0; monster.alpha = 1.0;
                     }
                 } else if (monster.aiState === 'surface') {
                     monster.vx = 0; monster.vy = 0; monster.state = 'attack';
                     if (monster.stateTimer > 60) { monster.aiState = 'idle'; monster.stateTimer = 0; }
                 }
             } else if (monster.archetype === 'bomber') {
                 if (dist < 100 && monster.aiState !== 'fuse') {
                     monster.aiState = 'fuse';
                     this.spawnExclamation(monster);
                 }
                 if (monster.aiState === 'fuse') {
                     monster.stateTimer += dt;
                     monster.vx = 0; monster.vy = 0; monster.state = 'attack';
                     monster.tint = (Math.floor(monster.stateTimer / 5) % 2 === 0) ? 0xff0000 : 0xffffff;
                     if (monster.stateTimer > 48) { // 0.8s fuse
                         monster.hp = 0; // Trigger death and explosion logic below
                     }
                 } else {
                     monster.vx = (dx / dist) * monster.speed;
                     monster.vy = (dy / dist) * monster.speed;
                     monster.state = 'run';
                     if (Math.random() < 0.3) this.spawnParticles(monster.x, monster.y - 16, 0xffaa00, 1); // sparks
                 }
             } else if (monster.archetype === 'archer') {
                 if (dist < 250) {
                     monster.vx = -(dx / dist) * monster.speed; monster.vy = -(dy / dist) * monster.speed; monster.state = 'run';
                 } else if (dist > 450) {
                     monster.vx = (dx / dist) * monster.speed; monster.vy = (dy / dist) * monster.speed; monster.state = 'run';
                 } else {
                     monster.vx = 0; monster.vy = 0; monster.state = 'attack';
                     if (this.frameCount % 90 === 60) {
                         // Telegraph line and exclamation
                         this.spawnExclamation(monster);
                         const tg = new Graphics().moveTo(0,0).lineTo(dx, dy).stroke({ width: 2, color: 0xff0000, alpha: 0.5 });
                         tg.x = monster.x; tg.y = monster.y - 16; tg.zIndex = monster.y;
                         this.worldContainer.addChild(tg);
                         this.telegraphs.push({ sprite: tg, life: 30, x: monster.x, y: monster.y, radius: 0, owner: null });
                     }
                     if (this.frameCount % 90 === 0) {
                         const baseAngle = Math.atan2(dy, dx);
                         // Bullet hell spread: 5 bullets, slower speed (4)
                         for (let i = -2; i <= 2; i++) {
                             const angle = baseAngle + i * 0.15;
                             const ebullet = new Sprite(this.weaponTextures.ebullet);
                             ebullet.anchor.set(0.5); ebullet.scale.set(4);
                             ebullet.x = monster.x; ebullet.y = monster.y - 16;
                             this.worldContainer.addChild(ebullet);
                             this.bullets.push({ sprite: ebullet, vx: Math.cos(angle)*4, vy: Math.sin(angle)*4, isEnemy: true, bounces: 2 } as any); 
                         }
                         SoundManager.getInstance().playSound('shoot', monster.x, monster.y);
                     }
                 }
             } else if (monster.archetype === 'shaman') {
                 monster.stateTimer += dt;
                 // Stay away from player
                 if (dist < 300) {
                     monster.vx = -(dx / dist) * monster.speed; monster.vy = -(dy / dist) * monster.speed; monster.state = 'run';
                 } else {
                     monster.vx = 0; monster.vy = 0; monster.state = 'idle';
                 }
                 // Heal pulse every 5 seconds
                 if (monster.stateTimer > 270 && monster.aiState !== 'casting') {
                     monster.aiState = 'casting';
                     this.spawnExclamation(monster);
                 }
                 if (monster.stateTimer > 300) {
                     monster.stateTimer = 0;
                     monster.aiState = 'idle';
                     SoundManager.getInstance().playSound('shaman_cast', monster.x, monster.y);
                     const pulse = new Graphics().circle(0, 0, 200).fill({ color: 0x00ff00, alpha: 0.3 });
                     pulse.x = monster.x; pulse.y = monster.y; pulse.zIndex = monster.y - 1;
                     this.worldContainer.addChild(pulse);
                     this.telegraphs.push({ sprite: pulse, life: 30, x: monster.x, y: monster.y, radius: 200, owner: null });
                     
                     for (const other of this.monsters) {
                         if (Math.hypot(other.x - monster.x, other.y - monster.y) < 200) {
                             other.hp = Math.min(other.maxHp, other.hp + 50);
                             this.spawnParticles(other.x, other.y, 0x00ff00, 5);
                         }
                     }
                 }
             }
          } else {
             monster.vx = 0; monster.vy = 0; monster.state = 'idle';
          }

          // Apply velocity with basic collision
          const nextX = monster.x + monster.vx * dt;
          const nextY = monster.y + monster.vy * dt;
          
          const tx = Math.floor(nextX / 64);
          const ty = Math.floor(nextY / 64);
          if (!this.obstacleCells.has(`${tx},${ty}`)) {
              monster.x = nextX;
              monster.y = nextY;
          }

          // Flip sprite based on direction
          if (monster.vx < 0) monster.scale.x = -1;
          else if (monster.vx > 0) monster.scale.x = 1;

          monster.update(dt);
          
          if (monster.hp <= 0) {
              if (monster.archetype === 'bomber') {
                  SoundManager.getInstance().playSound('elemental_explode', monster.x, monster.y);
                  this.shakeAmount = 40;
                  this.spawnParticles(monster.x, monster.y, 0xff5500, 30);
                  const blast = new Graphics().circle(0, 0, 150).fill({ color: 0xff0000, alpha: 0.5 });
                  blast.x = monster.x; blast.y = monster.y; blast.zIndex = monster.y;
                  this.worldContainer.addChild(blast);
                  this.telegraphs.push({ sprite: blast, life: 10, x: monster.x, y: monster.y, radius: 150, owner: monster as any });
              }
              // Kill monster
              this.killMonster(monster, j);
          }
      }
    }
    // Also rank bullets
    for (const b of this.bullets) b.sprite.zIndex = b.sprite.y + 10;

    this.updateCamera(dt);
  }

  private updateCamera(dt: number) {
    // Camera Tracking (Lerped with Look-ahead)
    const screenCenter = { x: this.app.screen.width / 2, y: this.app.screen.height / 2 };
    
    // Adjust camera to look less wide and more centered on the player
    this.worldContainer.scale.set(1.0); // Zoom out to increase camera view
    
    // Smoothly transition the look-ahead amount to avoid stuttering teleports
    const targetLookAheadAmount = this.isAiming ? 0.35 : 0.05;
    if (!this.currentLookAheadAmount) this.currentLookAheadAmount = 0.05;
    this.currentLookAheadAmount += (targetLookAheadAmount - this.currentLookAheadAmount) * (1 - Math.pow(0.85, dt));

    // Convert the screen pixel offset into world units by dividing by the 1.0 scale
    const lookAheadX = ((this.mouseX - screenCenter.x) / 1.0) * this.currentLookAheadAmount;
    const lookAheadY = ((this.mouseY - screenCenter.y) / 1.0) * this.currentLookAheadAmount;
    
    const targetCamX = this.player.x + lookAheadX;
    const targetCamY = this.player.y - 24 + lookAheadY;
    
    const camSpeed = this.isAiming ? 0.82 : 0.88; // slightly slower when aiming for cinematic feel
    const camBlend = 1 - Math.pow(camSpeed, dt);
    this.cameraX += (targetCamX - this.cameraX) * camBlend;
    this.cameraY += (targetCamY - this.cameraY) * camBlend;

    this.worldContainer.x = screenCenter.x - (this.cameraX * 1.0);
    this.worldContainer.y = screenCenter.y - (this.cameraY * 1.0);

    // Combat Juice: Screen Shake
    if (this.shakeAmount > 0) {
        this.worldContainer.x += (Math.random() - 0.5) * this.shakeAmount;
        this.worldContainer.y += (Math.random() - 0.5) * this.shakeAmount;
        this.shakeAmount *= Math.pow(0.8, dt); // Decay
        if (this.shakeAmount < 0.5) this.shakeAmount = 0;
    }

    // Update Vignette
    if (this.vignette) {
      this.vignette.width = this.app.screen.width;
      this.vignette.height = this.app.screen.height;
      this.vignette.alpha = 1.0;
    }

    // Update Minimap UI Position in case screen resized
    if (this.minimapContainer && !this.isMapOpen) {
      this.minimapContainer.x = this.app.screen.width - 220;
      this.minimapContainer.y = 20;
    }

    // === Screenspace Dual-Pass Rendering ===
    // Resize RenderTexture if screen dimensions changed
    if (this.worldRenderTexture) {
      const sw = this.app.screen.width;
      const sh = this.app.screen.height;
      if (this.worldRenderTexture.width !== sw || this.worldRenderTexture.height !== sh) {
        this.worldRenderTexture.resize(sw, sh);
      }

      // Render worldContainer (with camera transform) to the offscreen texture
      this.app.renderer.render({
        container: this.worldContainer,
        target: this.worldRenderTexture,
        clear: true,
      });

      // Sync maskContainer transform with worldContainer so lightMask (world coords) aligns to screen
      if (this.maskContainer) {
        this.maskContainer.x = this.worldContainer.x;
        this.maskContainer.y = this.worldContainer.y;
        this.maskContainer.scale.copyFrom(this.worldContainer.scale);
      }

      // Render the mask container to the mask texture
      if (this.lightMaskTexture) {
        if (this.lightMaskTexture.width !== sw || this.lightMaskTexture.height !== sh) {
          this.lightMaskTexture.resize(sw, sh);
        }
        this.app.renderer.render({
          container: this.maskContainer,
          target: this.lightMaskTexture,
          clear: true,
          clearColor: { r: 0, g: 0, b: 0, a: 0 }
        });
      }
    }
  }

  private updateMinimap() {
    if (!this.minimapGraphics) return;

    this.minimapGraphics.clear();
    
    let size = this.isMapOpen ? Math.min(this.app.screen.width, this.app.screen.height) * 0.8 : 200;
    const halfSize = size / 2;
    const scale = this.isMapOpen ? 6 : 4; // pixels per tile
    const viewTiles = Math.ceil(halfSize / scale); // Only check tiles visible on minimap

    if (this.isMapOpen) {
       this.minimapContainer.x = this.app.screen.width / 2 - halfSize;
       this.minimapContainer.y = this.app.screen.height / 2 - halfSize;
    } else {
       this.minimapContainer.x = this.app.screen.width - size - 20;
       this.minimapContainer.y = 20;
    }

    // Background
    if (!this.isMapOpen) {
      this.minimapGraphics.circle(halfSize, halfSize, halfSize).fill({ color: 0x111118, alpha: 0.85 });
    } else {
      this.minimapGraphics.rect(0, 0, size, size).fill({ color: 0x111118, alpha: 0.95 });
    }

    // Draw explored cells — only scan the visible range instead of all explored cells
    const px = Math.floor(this.player.x / TILE_PX);
    const py = Math.floor(this.player.y / TILE_PX);

    for (let tx = px - viewTiles; tx <= px + viewTiles; tx++) {
      for (let ty = py - viewTiles; ty <= py + viewTiles; ty++) {
        const dx = (tx - px) * scale + halfSize;
        const dy = (ty - py) * scale + halfSize;
        
        // Circular clipping only for minimap
        if (!this.isMapOpen && Math.hypot(dx - halfSize, dy - halfSize) > halfSize - 4) continue;
        
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
    if (!this.isMapOpen) {
      this.minimapGraphics.circle(halfSize, halfSize, halfSize).stroke({ width: 4, color: 0xcfb53b, alpha: 0.8 });
    } else {
      this.minimapGraphics.rect(0, 0, size, size).stroke({ width: 4, color: 0xcfb53b, alpha: 0.8 });
    }

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

  private handleDialogueAdvance = () => {
    if (this.tutorialStep < 15 && this.tutorialStep % 2 === 0) {
      this.tutorialStep++;
      this.tutorialProgress = 0;
      this.tutorialTaskCompleted = false;
      this.dispatchTutorial();
      
      if (this.tutorialStep === 11) {
        this.setDoorStatus(68, false);
        this.spawnTutorialEnemies();
      }

      this.triggerDialogueIfNeeded();
    }
  };

  private triggerDialogueIfNeeded() {
     if (this.tutorialStep >= 15 || this.tutorialStep % 2 !== 0) return;

     if (this.isInventoryOpen) {
        this.isInventoryOpen = false;
        this.dispatchState();
     }

     let speaker = '¿';
     let text = '';

     if (this.tutorialStep === 0) {
        speaker = 'Slime';
        text = "Where am I? My energy is low. I need to test movement first: walk with WASD, shift to sprint, and press Q or C to roll.";
     } else if (this.tutorialStep === 2) {
        text = "Diagnostics complete. Door 1 is now open. Go through the hallway to the armory.";
        this.carveHallway(6, 34);
        this.setDoorStatus(6, true);
     } else if (this.tutorialStep === 4) {
        text = "Armory reached. Pick up the pistol and sword from the floor to calibrate weapon systems.";
        this.setDoorStatus(34, false);
        this.sealHallway(6, 33);
        this.spawnTutorialWeapons();
     } else if (this.tutorialStep === 6) {
        text = "Weapons equipped. Hold Right-Click to aim, Left-Click to shoot, and press R to reload.";
     } else if (this.tutorialStep === 8) {
        text = "Weapons calibrated. Door 2 is open. Security grunts detected in the arena. Defend yourself.";
        this.carveHallway(46, 67);
        this.setDoorStatus(46, true);
     } else if (this.tutorialStep === 10) {
        text = "Good luck.";
        this.setDoorStatus(67, false);
        this.sealHallway(46, 66);
     } else if (this.tutorialStep === 12) {
        text = "Security grunts defeated. Collect the coins, open the Synthesizer with [E], and buy a healing potion.";
     } else if (this.tutorialStep === 14) {
        text = "Purchase complete. Door 3 is open. Walk to the portal in Room 3 to warp out.";
        this.carveHallway(83, 99);
        this.setDoorStatus(83, true);
        this.spawnTutorialPortal();
     } else if (this.tutorialStep === 16) {
        text = "Portal stable. Preparing warp sequence. Go.";
     }

     window.dispatchEvent(new CustomEvent('tutorial-dialogue-trigger', {
        detail: {
           step: this.tutorialStep,
           speaker,
           text
        }
     }));
  }

  private setDoorStatus(doorX: number, open: boolean) {
    if (open) SoundManager.getInstance().playSound('door_creak');
    const ys = [0, -1, 1];
    ys.forEach((dy, index) => {
      setTimeout(() => {
        const key = `${doorX},${dy}`;
        if (open) {
          this.dungeonTiles[key] = 'FLOOR';
          this.obstacleCells.delete(key);
          this.floorCells.add(key);
          this.spawnParticles(doorX * 64, dy * 64, 0x00ffff, 8);
        } else {
          this.dungeonTiles[key] = 'WALL';
          this.obstacleCells.add(key);
          this.floorCells.delete(key);
          this.spawnParticles(doorX * 64, dy * 64, 0x888888, 8);
        }
      }, index * 200); // Stagger by 200ms
    });
  }

  private sealHallway(startX: number, endX: number) {
    let currentX = startX;
    
    const sealInterval = setInterval(() => {
      if (currentX > endX) {
        clearInterval(sealInterval);
        return;
      }
      
      const tx = currentX;
      
      for (let dy = -3; dy <= 3; dy++) {
        const key = `${tx},${dy}`;
        if (this.dungeonTiles[key] && this.dungeonTiles[key] !== 'VOID') {
           delete this.dungeonTiles[key];
           this.obstacleCells.delete(key);
           this.floorCells.delete(key);
           if (Math.abs(dy) <= 1) { // Only particles for the floor area
              this.spawnParticles(tx * 64, dy * 64, 0x222222, 2);
           }
        }
      }
      
      currentX++;
    }, 30); // 30ms per column for smoother/faster disappearance
  }

  private carveHallway(startX: number, endX: number) {
    let currentX = startX;
    const dirs8 = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    
    const carveInterval = setInterval(() => {
      if (currentX > endX) {
        clearInterval(carveInterval);
        return;
      }
      
      const tx = currentX;
      
      // Carve floor tiles
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${tx},${dy}`;
        this.dungeonTiles[key] = 'FLOOR';
        this.obstacleCells.delete(key);
        this.floorCells.add(key);
        this.spawnParticles(tx * 64, dy * 64, 0x00ffff, 4);
      }
      
      // Generate wall borders around new floor tiles (check neighbors)
      for (let cx = tx - 1; cx <= tx + 1; cx++) {
        for (let ty = -3; ty <= 3; ty++) {
          const key = `${cx},${ty}`;
          if (!this.dungeonTiles[key]) {
            let hasFloorNeighbor = false;
            for (const d of dirs8) {
              const nType = this.dungeonTiles[`${cx+d[0]},${ty+d[1]}`];
              if (nType === 'FLOOR' || nType === 'DOOR' || nType === 'WATER') {
                hasFloorNeighbor = true;
                break;
              }
            }
            if (hasFloorNeighbor) {
              this.dungeonTiles[key] = 'WALL';
              this.obstacleCells.add(key);
            }
          }
        }
      }
      
      currentX++;
    }, 30); // 30ms per column
  }

  private spawnTutorialWeapons() {
    const rx = 40 * 64;
    const ry = 0;
    
    // Clean up any existing dropped items
    for (const item of this.droppedItems) {
      if (item.sprite) {
        this.worldContainer.removeChild(item.sprite);
        item.sprite.destroy();
      }
    }
    this.droppedItems = [];

    // Spawn Pistol
    const gunTex = this.weaponTextures['gun'];
    if (gunTex) {
      const gunSprite = new Sprite(gunTex);
      gunSprite.anchor.set(0.5, 0.5);
      gunSprite.scale.set(2.5);
      gunSprite.x = rx - 64;
      gunSprite.y = ry;
      gunSprite.zIndex = ry + 20;
      (gunSprite as any).isFloating = true;
      (gunSprite as any).baseY = ry;
      (gunSprite as any).bobTime = 0;

      const shadow = new Graphics().ellipse(0, 20, 16, 6).fill({ color: 0x000000, alpha: 0.35 });
      gunSprite.addChild(shadow);
      (gunSprite as any).shadowChild = shadow;

      this.worldContainer.addChild(gunSprite);
      this.droppedItems.push({ sprite: gunSprite, id: 'gun', count: 1 });
    }

    // Spawn Sword
    const swordTex = this.weaponTextures['sword'];
    if (swordTex) {
      const swordSprite = new Sprite(swordTex);
      swordSprite.anchor.set(0.5, 0.5);
      swordSprite.scale.set(2.5);
      swordSprite.x = rx + 64;
      swordSprite.y = ry;
      swordSprite.zIndex = ry + 20;
      (swordSprite as any).isFloating = true;
      (swordSprite as any).baseY = ry;
      (swordSprite as any).bobTime = Math.PI / 2;

      const shadow = new Graphics().ellipse(0, 20, 16, 6).fill({ color: 0x000000, alpha: 0.35 });
      swordSprite.addChild(shadow);
      (swordSprite as any).shadowChild = shadow;

      this.worldContainer.addChild(swordSprite);
      this.droppedItems.push({ sprite: swordSprite, id: 'sword', count: 1 });
    }
  }

  private spawnTutorialEnemies() {
     for (const m of this.monsters) {
       this.worldContainer.removeChild(m);
       m.destroy();
     }
     this.monsters = [];
     
     this.spawnEnemy(73 * 64, -64, 'grunt');
     this.spawnEnemy(75 * 64, 0, 'grunt');
     this.spawnEnemy(77 * 64, 64, 'grunt');
  }

  private spawnTutorialPortal() {
     if (this.portalSprite) {
       this.worldContainer.removeChild(this.portalSprite);
       this.portalSprite.destroy();
       this.portalSprite = null;
     }

     const portalX = 105 * 64;
     const portalY = 0;

     const tex = this.mapTextures.portal;
     if (tex) {
        this.portalSprite = new Sprite(tex);
        this.portalSprite.anchor.set(0.5, 0.5);
        this.portalSprite.scale.set(4);
        this.portalSprite.x = portalX;
        this.portalSprite.y = portalY;
        this.portalSprite.alpha = 0.8;
        this.portalSprite.zIndex = portalY;
        this.worldContainer.addChild(this.portalSprite);

        const pGlow = new Graphics().circle(0, 0, 32).fill({ color: 0x00ffff, alpha: 0.2 });
        this.portalSprite.addChild(pGlow);
     }
     this.portalSpawned = true;
  }

  private updateTrailParticles(dt: number) {
    if (this.tutorialStep > 15) return;
    
    // Determine target coordinate
    let targetX = 0;
    if (this.tutorialStep < 3) {
      targetX = 6 * 64;
    } else if (this.tutorialStep < 9) {
      targetX = 46 * 64;
    } else if (this.tutorialStep < 15) {
      targetX = 83 * 64;
    } else {
      targetX = 105 * 64;
    }
    const targetY = 0;

    // Spawn new trail particle from player towards target
    if (Math.random() < 0.15 && this.trailParticles.length < 40) {
      const p = new Graphics();
      // Neon cyan glow
      p.circle(0, 0, 4).fill({ color: 0x00ffff, alpha: 0.8 });
      p.x = this.player.x + (Math.random() - 0.5) * 16;
      p.y = this.player.y + (Math.random() - 0.5) * 16;
      
      this.worldContainer.addChild(p);
      this.trailParticles.push({
        sprite: p,
        targetX,
        speed: 3 + Math.random() * 2,
        life: 120 // max frames/steps
      });
    }

    // Update existing particles
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const tp = this.trailParticles[i];
      tp.life -= dt;

      // Move towards target
      const dx = tp.targetX - tp.sprite.x;
      const dy = targetY - tp.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 10 || tp.life <= 0) {
        this.worldContainer.removeChild(tp.sprite);
        tp.sprite.destroy();
        this.trailParticles.splice(i, 1);
      } else {
        tp.sprite.x += (dx / dist) * tp.speed * dt;
        tp.sprite.y += (dy / dist) * tp.speed * dt;
        // Fade out
        tp.sprite.alpha = Math.max(0, tp.life / 120);
      }
    }
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
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('inventory-swap', this.handleSwap);
    window.removeEventListener('inventory-close', this.handleClose);
    window.removeEventListener('slot-change', this.handleSlotChange);
    window.removeEventListener('settings-toggle', this.handleSettingsToggle);
    window.removeEventListener('dialogue-advance', this.handleDialogueAdvance);
    window.removeEventListener('shop-buy', this.handleShopBuy);
    
    if (this.spawnInterval) clearInterval(this.spawnInterval);
    if (this.worldRenderTexture) {
      this.worldRenderTexture.destroy(true);
    }

    for (const sp of this.environmentSprites) {
        if (sp && !sp.destroyed) {
            try { this.worldContainer.removeChild(sp); sp.destroy(); } catch(e){}
        }
    }
    this.environmentSprites = [];

    // Clean up trail particles
    for (const tp of this.trailParticles) {
      if (tp.sprite) {
        try {
          this.worldContainer.removeChild(tp.sprite);
          tp.sprite.destroy();
        } catch (e) {}
      }
    }
    this.trailParticles = [];

    try { this.app.destroy(true, { children: true }); } catch (e) { }
  }
}
