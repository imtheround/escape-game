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
  private mapTextures: Record<string, Texture> = {};
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
  private staminaGroup!: Container;
  private staminaBarFill!: Graphics;

  // Wave System
  public gameState: 'playing' | 'merchant' = 'playing';
  public wave: number = 1;
  private enemiesToSpawn: number = 15;
  private enemiesAlive: number = 0;
  private waveSpawnTimer: number = 0;
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

  // Dungeon Grid
  private floorCells = new Set<string>();
  private dungeonRooms: {
    x: number; y: number; w: number; h: number;
    cleared: boolean; active: boolean; entered: boolean;
    doors: { x: number, y: number, sprite: Sprite, open: boolean }[];
    monstersToSpawn: number;
    isFinal?: boolean;
    isStart?: boolean;
    totalWaves?: number;
    currentWave?: number;
    monstersPerWave?: number;
    waveTimer?: number;
  }[] = [];
  public currentDungeonWorld = 1;
  public currentDungeonStage = 1;

  private playerShadow!: Graphics;
  private particles: { sprite: Sprite, vx: number, vy: number, life: number, maxLife: number }[] = [];

  private spawnParticles(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const p = new Graphics().circle(0, 0, 2).fill(color);
      p.x = x; p.y = y; p.zIndex = y + 10;
      this.worldContainer.addChild(p);
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      this.particles.push({ sprite: p as any, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 20, maxLife: 20 });
    }
  }

  // Native HTML5 Audio pool
  private audioPool: Record<string, HTMLAudioElement[]> = {};

  private preloadAudio() {
    const files = ['shoot', 'hit', 'pickup', 'drink', 'death', 'kill', 'spawn', 'open_inventory', 'close_inventory', 'reload', 'level_up', 'knife_swing', 'sword_swing', 'mg_shoot', 'shotgun_blast', 'empty_click', 'room_clear'];
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
      detail: { wave: this.wave, gameState: this.gameState, enemiesAlive: this.enemiesAlive, enemiesToSpawn: this.enemiesToSpawn, merchantTimer: this.merchantTimer, world: this.currentDungeonWorld, stage: this.currentDungeonStage }
    }));
    window.dispatchEvent(new CustomEvent('exp-change', {
      detail: { exp: this.playerExp, maxExp: this.playerMaxExp, level: this.playerLevel, maxHP: this.playerMaxHP }
    }));
    window.dispatchEvent(new CustomEvent('coin-change', {
      detail: { coins: this.coins }
    }));
  }

  public gameMode: 'wave' | 'dungeon';

  constructor(mode: 'wave' | 'dungeon' = 'wave') {
    this.gameMode = mode;
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

    this.mapTextures = {
      floor: await Assets.load('/assets/map/floor.svg'),
      wall_h: await Assets.load('/assets/map/wall_h.svg'),
      wall_v: await Assets.load('/assets/map/wall_v.svg'),
      rock: await Assets.load('/assets/map/rock.svg'),
      fence: await Assets.load('/assets/map/fence.svg'),
      portal: await Assets.load('/assets/map/portal.svg')
    };

    Object.values(this.weaponTextures).forEach((t: any) => t.source.scaleMode = 'nearest');
    [this.potionTexture, this.coinTexture, this.merchantTexture, this.mapTextures.floor, this.mapTextures.wall_h, this.mapTextures.wall_v, this.mapTextures.rock, this.mapTextures.fence, this.mapTextures.portal].forEach(t => t.source.scaleMode = 'nearest');

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

    this.goblinTextures.idle.forEach((t: any) => t.source.scaleMode = 'nearest');
    this.goblinTextures.run.forEach((t: any) => t.source.scaleMode = 'nearest');
    this.goblinBlueTextures.run.forEach((t: any) => t.source.scaleMode = 'nearest');
    this.goblinTextures.dead1[0].source.scaleMode = 'nearest';
    this.goblinTextures.dead2[0].source.scaleMode = 'nearest';
    this.goblinTextures.dead3[0].source.scaleMode = 'nearest';
    this.goblinBlueTextures.dead1[0].source.scaleMode = 'nearest';
    this.goblinBlueTextures.dead2[0].source.scaleMode = 'nearest';
    this.goblinBlueTextures.dead3[0].source.scaleMode = 'nearest';
  }

  private setupPlayer() {
    if (this.gameMode === 'dungeon') {
      this.generateDungeonMap();
    } else {
      this.generateWaveMap();
    }

    this.player = new Sprite(this.slimeTextures.idle[0]);
    this.player.anchor.set(0.5, 1);
    this.player.scale.set(4); // Scale up pixel art (16x16 -> 64x64)
    this.player.x = 0;
    this.player.y = 0;

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
    
    this.staminaGroup.x = this.player.x;
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
  }

  private generateWaveMap() {
    const radius = 1000;

    const floor = new TilingSprite({
      texture: this.mapTextures.floor,
      width: radius * 2.5,
      height: radius * 2.5
    });
    floor.anchor.set(0.5);
    floor.tileScale.set(4);
    floor.x = 0;
    floor.y = 0;
    floor.zIndex = -100000;

    // Circular Mask
    const mask = new Graphics().circle(0, 0, radius).fill(0xffffff);
    this.worldContainer.addChild(mask);
    floor.mask = mask;

    this.worldContainer.addChild(floor);

    // Perimeter walls radially
    const circumference = 2 * Math.PI * radius;
    const numWalls = Math.floor(circumference / 64);
    for (let i = 0; i < numWalls; i++) {
      const theta = (i / numWalls) * Math.PI * 2;
      const w = new Sprite(this.mapTextures.wall);
      w.scale.set(4); w.anchor.set(0.5);
      w.position.set(Math.cos(theta) * radius, Math.sin(theta) * radius);
      this.worldContainer.addChild(w);
    }
  }

  private generateDungeonMap() {
    // Top left of origin is technically negative coordinates
    // We start at 0,0 and go towards positive X, negative Y (top right visually).
    let curX = -5; // Start coordinates (Bottom-Left conceptual starting area)
    let curY = 5;
    const roomCount = 3 + Math.floor(this.currentDungeonStage * 1.5); // 3 to ...

    for (let i = 0; i < roomCount; i++) {
      const rw = 14 + Math.floor(Math.random() * 6);
      const rh = 14 + Math.floor(Math.random() * 6);
      for (let x = curX; x < curX + rw; x++) {
        for (let y = curY; y > curY - rh; y--) {
          this.floorCells.add(`${x},${y}`);
        }
      }

      const isFinal = (i === roomCount - 1);
      const isStart = (i === 0);
      const room = {
        x: curX, y: curY, w: rw, h: rh,
        cleared: false, active: false, entered: false,
        doors: [], monstersToSpawn: (isFinal || isStart) ? 0 : 8 + this.currentDungeonStage * 6,
        isFinal, isStart
      };
      this.dungeonRooms.push(room);

      if (i < roomCount - 1) {
        // Stair-step Corridor
        const cRadius = 3; // width = 7
        const horizDist = 8 + Math.floor(Math.random() * 8);
        const vertDist = 8 + Math.floor(Math.random() * 8);

        let cx = curX + rw - cRadius - 1;
        let cy = curY - Math.floor(rh / 2);

        // Move right
        for (let step = 0; step < horizDist; step++) {
          for (let w = -cRadius; w <= cRadius; w++) {
            this.floorCells.add(`${cx},${cy + w}`);
          }
          cx++;
        }
        
        // Move up
        for (let step = 0; step < vertDist; step++) {
          for (let w = -cRadius; w <= cRadius; w++) {
            this.floorCells.add(`${cx + w},${cy}`);
          }
          cy--;
        }

        curX = cx;
        curY = cy;
      }
    }

    // Build Sprites
    const wallCells = new Set<string>();
    const TILE_SIZE = 64;

    // Draw Floor Background over bounding box manually using TilingSprite Mask for heavy performance gains
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    this.floorCells.forEach(key => {
      const [cx, cy] = key.split(',').map(Number);
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;
    });

    // Floor mask
    const floorShape = new Graphics();
    floorShape.fill(0xffffff);
    this.floorCells.forEach(key => {
      const [cx, cy] = key.split(',').map(Number);
      floorShape.rect(cx * TILE_SIZE - TILE_SIZE / 2, cy * TILE_SIZE - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    });
    this.worldContainer.addChild(floorShape);

    const floorTiling = new TilingSprite({
      texture: this.mapTextures.floor,
      width: (maxX - minX + 1) * TILE_SIZE,
      height: (maxY - minY + 1) * TILE_SIZE
    });
    floorTiling.tileScale.set(4);
    floorTiling.x = minX * TILE_SIZE - TILE_SIZE / 2;
    floorTiling.y = minY * TILE_SIZE - TILE_SIZE / 2;
    floorTiling.zIndex = -100000;
    floorTiling.mask = floorShape;
    this.worldContainer.addChild(floorTiling);

    // Render thin walls precisely on the boundaries where the floor ends
    this.floorCells.forEach(key => {
      const [cx, cy] = key.split(',').map(Number);
        if (!this.floorCells.has(`${cx},${cy-1}`)) {
            const w = new Sprite(this.mapTextures.wall_h);
            w.anchor.set(0.5, 0.5); w.scale.set(4);
            w.x = cx * TILE_SIZE; w.y = cy * TILE_SIZE - TILE_SIZE/2;
            w.zIndex = w.y + 10;
            this.worldContainer.addChild(w);
        }
        if (!this.floorCells.has(`${cx},${cy+1}`)) {
            const w = new Sprite(this.mapTextures.wall_h);
            w.anchor.set(0.5, 0.5); w.scale.set(4);
            w.x = cx * TILE_SIZE; w.y = cy * TILE_SIZE + TILE_SIZE/2;
            w.zIndex = w.y + 10;
            this.worldContainer.addChild(w);
        }
        if (!this.floorCells.has(`${cx-1},${cy}`)) {
            const w = new Sprite(this.mapTextures.wall_v);
            w.anchor.set(0.5, 0.5); w.scale.set(4);
            w.x = cx * TILE_SIZE - TILE_SIZE/2; w.y = cy * TILE_SIZE;
            w.zIndex = w.y + 10;
            this.worldContainer.addChild(w);
        }
        if (!this.floorCells.has(`${cx+1},${cy}`)) {
            const w = new Sprite(this.mapTextures.wall_v);
            w.anchor.set(0.5, 0.5); w.scale.set(4);
            w.x = cx * TILE_SIZE + TILE_SIZE/2; w.y = cy * TILE_SIZE;
            w.zIndex = w.y + 10;
            this.worldContainer.addChild(w);
        }
    });

    // Populate Fences at Room Boundaries
    // We search the perimeter of the room and place fences ONLY on cells that connect to floorCells outside the room
    for (const r of this.dungeonRooms) {
      for (let x = r.x; x < r.x + r.w; x++) {
        for (let y = r.y; y > r.y - r.h; y--) {
          if (x === r.x || x === r.x + r.w - 1 || y === r.y || y === r.y - r.h + 1) {
            let hasExit = false;
            for (let nx = x - 1; nx <= x + 1; nx++) {
              for (let ny = y - 1; ny <= y + 1; ny++) {
                if (nx >= r.x && nx < r.x + r.w && ny <= r.y && ny > r.y - r.h) continue;
                if (this.floorCells.has(`${nx},${ny}`)) {
                  hasExit = true; break;
                }
              }
              if (hasExit) break;
            }
            if (hasExit) {
              const fence = new Sprite(this.mapTextures.fence);
              fence.anchor.set(0.5, 0);
              fence.scale.set(4);
              fence.x = x * TILE_SIZE;
              fence.y = y * TILE_SIZE - TILE_SIZE / 2 - 80;
              fence.alpha = 0;
              fence.zIndex = y * TILE_SIZE + 10;
              this.worldContainer.addChild(fence);
              r.doors.push({ x, y, sprite: fence, open: true });
            }
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

  private handleMouseDown = (e: MouseEvent) => { if (e.button === 0) this.isMouseDown = true; };
  private handleMouseUp = (e: MouseEvent) => { if (e.button === 0) this.isMouseDown = false; };

  private handleSlotChange = (e: any) => {
    if (e.detail >= 0 && e.detail <= 2) {
      this.activeSlot = e.detail;
      this.dispatchState();
    }
  };

  public startNextWave() {
    if (this.gameState !== 'merchant') return;
    this.gameState = 'playing';
    this.wave++;
    this.enemiesToSpawn = 15 + this.wave * 10;

    if (this.merchantSprite) {
      this.worldContainer.removeChild(this.merchantSprite);
      this.merchantSprite.destroy();
      this.merchantSprite = null;
    }
    this.playSound('spawn');
    this.dispatchState();
  }

  private startMerchantPhase() {
    this.gameState = 'merchant';
    this.merchantTimer = 45 * 60; // 45 seconds in frames (at 60fps)

    this.merchantSprite = new Sprite(this.merchantTexture);
    this.merchantSprite.anchor.set(0.5, 1);
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
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('inventory-swap', this.handleSwap);
    window.addEventListener('inventory-close', this.handleClose);
    window.addEventListener('slot-change', this.handleSlotChange);
    window.addEventListener('skip-wave', () => this.startNextWave());
    window.addEventListener('volume-change', this.handleVolumeChange);
    window.addEventListener('settings-toggle', this.handleSettingsToggle);
  }

  private spawnMonsterInRoom(room: any, immediate = false) {
    let sx = (room.x + 2 + Math.random() * (room.w - 4)) * 64;
    let sy = (room.y - 2 - Math.random() * (room.h - 4)) * 64;

    const isRanged = Math.random() > 0.6;
    const monster = new Sprite(isRanged ? this.goblinBlueTextures.run[0] : this.goblinTextures.run[0]);
    monster.anchor.set(0.5, 1); 
    
    if (immediate) {
      monster.scale.set(4);
      monster.alpha = 1;
      (monster as any).isSpawning = false;
    } else {
      monster.scale.set(0); 
      monster.alpha = 0;
      (monster as any).isSpawning = true; 
      (monster as any).spawnTimer = 30; // 0.5 sec spawn
    }

    monster.x = sx; monster.y = sy;
    (monster as any).type = isRanged ? 'ranged' : 'melee';
    (monster as any).attackTimer = Math.random() * 60 + 60;
    (monster as any).hp = 20 + this.currentDungeonStage * 15;
    (monster as any).maxHp = (monster as any).hp;
    (monster as any).damage = 1 + this.currentDungeonStage;
    (monster as any).dungeonRoom = room;

    const hpBar = new Graphics(); hpBar.zIndex = 999999; this.worldContainer.addChild(hpBar);
    (monster as any).hpBar = hpBar;
    const shadow = new Graphics().ellipse(0, 0, 4, 1.5).fill({ color: 0x000000, alpha: 0.5 });
    shadow.zIndex = -99998; 
    shadow.scale.set(immediate ? 1 : 0);
    this.worldContainer.addChild(shadow);
    (monster as any).shadow = shadow;
    (monster as any).animTimer = Math.random() * 4;

    this.worldContainer.addChild(monster);
    this.monsters.push(monster);
  }

  private spawnMonster() {
    if (this.gameMode === 'dungeon') return; // Handled rigidly by Rooms
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
    monster.anchor.set(0.5, 1);
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
    (monster as any).hp = 20 + this.wave * 30;
    (monster as any).maxHp = 20 + this.wave * 30;
    (monster as any).damage = 1 + this.wave;

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

  private useWeapon(target: Sprite | null, dx: number, dy: number) {
    const weaponId = this.inventory[this.activeSlot].id;
    const stats = WeaponRegistry[weaponId];
    if (!stats) return;

    let baseAngle = 0;

    if (target) {
      baseAngle = Math.atan2(target.y - (this.player.y - 12), target.x - this.player.x);
    } else if (dx !== 0 || dy !== 0) {
      baseAngle = Math.atan2(dy, dx);
    } else {
      baseAngle = this.player.scale.x > 0 ? 0 : Math.PI;
    }

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

        const spreadParams = stats.projectilesPerShot > 1 ? (Math.random() - 0.5) * stats.spread : (Math.random() - 0.5) * stats.spread;
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
    // Broadcast HP changes via Custom Event
    if (this.playerHP !== this.lastHP) {
      window.dispatchEvent(new CustomEvent('hp-change', { detail: this.playerHP }));
      this.lastHP = this.playerHP;
    }

    this.playerShadow.x = this.player.x;
    this.playerShadow.y = this.player.y;

    if (this.playerHP <= 0 || this.isInventoryOpen || this.isSettingsOpen) return; // Freeze simulation on death, inventory, or settings

    if (this.gameMode === 'wave') {
      if (this.gameState === 'playing') {
        if (this.enemiesToSpawn > 0) {
          this.waveSpawnTimer -= dt;
          const spawnDelay = Math.max(5, 45 - this.wave * 5); // gets faster
          if (this.waveSpawnTimer <= 0) {
            this.spawnMonster();
            this.enemiesToSpawn--;
            this.enemiesAlive++;
            this.waveSpawnTimer = spawnDelay;
            this.dispatchState(); // Tick HUD
          }
        } else if (this.enemiesAlive <= 0) {
          this.startMerchantPhase();
        }
      } else if (this.gameState === 'merchant') {
        this.merchantTimer -= dt;
        this.dispatchState();

        if (this.merchantTimer <= 0 || this.keys['KeyG']) {
          this.startNextWave();
        } else if (this.keys['KeyF'] && this.merchantSprite) {
          const dist = Math.hypot(this.player.x - this.merchantSprite.x, this.player.y - this.merchantSprite.y);
          if (dist < 100) {
            window.dispatchEvent(new CustomEvent('shop-open'));
          }
        }
      }
    } else if (this.gameMode === 'dungeon') {
      let activeRoom = this.dungeonRooms.find(r =>
        this.player.x / 64 >= r.x + 1 && this.player.x / 64 <= r.x + r.w - 1 &&
        this.player.y / 64 <= r.y - 1 && this.player.y / 64 >= r.y - r.h + 1
      );

      if (activeRoom && !activeRoom.entered) {
        activeRoom.entered = true;
        activeRoom.active = true;
        activeRoom.doors.forEach(d => { d.open = false; });
        this.playSound('fence_slam');

        // Initialize wave logic
        const hasMonsters = activeRoom.monstersToSpawn > 0;
        activeRoom.totalWaves = hasMonsters ? 1 + Math.floor(Math.random() * 3) : 0; // 1 to 3 waves
        activeRoom.currentWave = hasMonsters ? 1 : 0;
        // At least 1 per wave
        activeRoom.monstersPerWave = hasMonsters ? Math.max(1, Math.ceil(activeRoom.monstersToSpawn / activeRoom.totalWaves)) : 0;
        activeRoom.waveTimer = 0;

        // Spawn first sequence immediately without animation
        for (let i = 0; i < activeRoom.monstersPerWave; i++) {
          this.spawnMonsterInRoom(activeRoom, true);
        }
      }

      if (activeRoom && activeRoom.active) {
        let alive = this.monsters.filter(m => (m as any).dungeonRoom === activeRoom).length;
        
        // Process progressive wave drops
        if (activeRoom.currentWave! < activeRoom.totalWaves!) {
           // We ONLY advance once the CURRENT wave is totally wiped out
           if (alive <= 0) {
              activeRoom.currentWave!++;
              
              // Spawning remaining entities
              const remaining = activeRoom.monstersToSpawn - (activeRoom.currentWave! - 1) * activeRoom.monstersPerWave!;
              const toSpawn = Math.max(0, Math.min(activeRoom.monstersPerWave!, remaining));
              
              for (let i = 0; i < toSpawn; i++) {
                 this.spawnMonsterInRoom(activeRoom, false);
              }
              // recheck alive pool
              alive = this.monsters.filter(m => (m as any).dungeonRoom === activeRoom).length;
           }
        }

        if (alive <= 0 && activeRoom.currentWave! >= activeRoom.totalWaves!) {
          activeRoom.active = false;
          activeRoom.cleared = true;
          activeRoom.doors.forEach(d => { d.open = true; });
          this.playSound('door_creak');
          
          if (!activeRoom.isStart && !activeRoom.isFinal) {
             this.playSound('room_clear');
             const style = new TextStyle({ fontFamily: "'CustomFont', Arial", fontSize: 36, fill: '#00ff00', stroke: { color: '#000000', width: 5 }, fontWeight: 'bold' });
             const clearText = new Text({ text: 'ROOM CLEARED!', style });
             clearText.anchor.set(0.5, 0.5);
             clearText.x = activeRoom.x * 64 + (activeRoom.w / 2) * 64;
             clearText.y = activeRoom.y * 64 - (activeRoom.h / 2) * 64 - 32;
             clearText.zIndex = clearText.y + 100;
             this.worldContainer.addChild(clearText);
             this.damagePopups.push({ sprite: clearText, life: 120 });
          }

          if (activeRoom.isFinal) {
             if (!this.merchantSprite) {
                this.merchantSprite = new Sprite(this.merchantTexture);
                this.merchantSprite.anchor.set(0.5, 0.5);
                this.merchantSprite.scale.set(4);
                this.merchantSprite.x = (activeRoom.x + activeRoom.w / 2) * 64 - 100;
                this.merchantSprite.y = (activeRoom.y - activeRoom.h / 2) * 64;
                this.worldContainer.addChild(this.merchantSprite);
             }

             if (!this.portalSprite) {
                this.portalSprite = new Sprite(this.mapTextures.portal);
                this.portalSprite.anchor.set(0.5, 0.5);
                this.portalSprite.scale.set(4);
                this.portalSprite.x = (activeRoom.x + activeRoom.w / 2) * 64 + 100;
                this.portalSprite.y = (activeRoom.y - activeRoom.h / 2) * 64;
                this.portalSprite.alpha = 0.8;
                this.worldContainer.addChild(this.portalSprite);

                const pGlow = new Graphics().circle(0, 0, 32).fill({ color: 0x00ffff, alpha: 0.2 });
                this.portalSprite.addChild(pGlow);
             }
          }
        }
      }

      // Animate fences drop/lift
      for (const r of this.dungeonRooms) {
        const isClosed = r.entered && !r.cleared;
        for (const d of r.doors) {
          const targetY = isClosed ? d.y * 64 - 32 : d.y * 64 - 80;
          d.sprite.y += (targetY - d.sprite.y) * 0.2;
          d.sprite.alpha = Math.max(0, Math.min(1, d.sprite.alpha + (isClosed ? 0.1 : -0.1)));
        }
      }
    }

    // Dungeon interaction zones
    let isNearMerchant = false;
    let isNearPortal = false;

    if (this.gameMode === 'dungeon' && this.merchantSprite) {
       const dist = Math.hypot(this.player.x - this.merchantSprite.x, this.player.y - this.merchantSprite.y);
       if (dist < 100) {
          isNearMerchant = true;
          if (this.keys['KeyF']) {
             window.dispatchEvent(new CustomEvent('shop-open'));
             this.keys['KeyF'] = false; // consume
          }
       }
    }

    if (this.gameMode === 'dungeon' && this.portalSprite && this.portalSprite.parent) {
       const pDist = Math.hypot(this.player.x - this.portalSprite.x, this.player.y - this.portalSprite.y);
       if (pDist < 80) {
          isNearPortal = true;
          if (this.keys['Space']) {
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

             this.worldContainer.removeChildren();
             this.dungeonRooms = [];
             this.floorCells.clear();
             this.bullets = [];
             this.particles = [];
             this.coinDrops = [];
             this.droppedItems = [];
             this.monsters = [];
             this.corpses = [];
             this.damagePopups = [];

             this.generateDungeonMap();

             const startRoom = this.dungeonRooms[0];
             this.player.x = (startRoom.x + startRoom.w / 2) * 64;
             this.player.y = (startRoom.y - startRoom.h / 2) * 64;

             this.worldContainer.addChild(this.playerShadow);
             this.worldContainer.addChild(this.player);
             this.worldContainer.addChild(this.gunSprite);
             if (this.handPotionSprite) this.worldContainer.addChild(this.handPotionSprite);
             this.worldContainer.addChild(this.staminaGroup);
             
             this.dispatchState();
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
        this.player.anchor.y = 1; // reset jump offset
      } else {
        // Wacky smooth math: Quadratic ease-out speed + Sine wave jumping
        const p = 1 - (this.rollTimer / 24); // 0.0 to 1.0 progress
        speed = 40 * Math.pow(1 - p, 2) * dt; 
        
        // Z-axis jump offset for extreme smoothness
        this.player.anchor.y = 1 + Math.sin(p * Math.PI) * 0.35;
        
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
        speed = 36 * dt; // Initial burst speed
        this.keys['KeyQ'] = false;
        this.keys['KeyC'] = false; 
      } else {
        if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
          if (this.stamina > 0 && (dx !== 0 || dy !== 0)) {
            this.isSprinting = true;
            speed *= 1.6;
            this.stamina = Math.max(0, this.stamina - dt * 1.5);
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
    this.staminaGroup.x += (this.player.x - this.staminaGroup.x) * Math.min(1, 0.15 * dt);
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
    // Fixed bug where bar disappeared instantly
    this.staminaGroup.visible = true;

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

    // Find nearest enemy for targeting (only on screen)
    let nearestMonster: Sprite | null = null;
    let minDist = Infinity;
    const halfW = this.app.screen.width / 2;
    const halfH = this.app.screen.height / 2;

    for (const monster of this.monsters) {
      // Check if monster is within the camera bounds
      if (Math.abs(this.player.x - monster.x) < halfW && Math.abs(this.player.y - monster.y) < halfH) {
        const dist = Math.hypot(this.player.x - monster.x, this.player.y - monster.y);
        if (dist < minDist) {
          minDist = dist;
          nearestMonster = monster;
        }
      }
    }

    // Use items or shoot — always read activeSlot fresh, never cache the object
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
         this.useWeapon(nearestMonster, dx, dy);
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

    let targetAngle = dx !== 0 || dy !== 0 ? Math.atan2(dy, dx) : (this.player.scale.x > 0 ? 0 : Math.PI);
    if (nearestMonster) {
      targetAngle = Math.atan2(nearestMonster.y - this.gunSprite.y, nearestMonster.x - this.gunSprite.x);
    }

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

    // Sprite flipping logic (Prioritize facing tracking angle)
    if (Math.abs(targetAngle) > Math.PI / 2) this.player.scale.x = -4;
    else this.player.scale.x = 4;

    // Bounds Check the Player
    const nextX = this.player.x + dx * speed;
    const nextY = this.player.y + dy * speed * 0.75; // 45-degree angle

    if (this.gameMode === 'dungeon') {
      // Smooth Continuous AABB Sliding Collision
      const radius = 24;
      
      const checkCollision = (px: number, py: number) => {
        const minCX = Math.round((px - radius) / 64);
        const maxCX = Math.round((px + radius) / 64);
        const minCY = Math.round((py - radius) / 64);
        const maxCY = Math.round((py + radius) / 64);

        for (let x = minCX; x <= maxCX; x++) {
          for (let y = minCY; y <= maxCY; y++) {
            if (!this.floorCells.has(`${x},${y}`)) return true; // Hitting solid wall boundary
            
            // Checking Door Status dynamically
            let hitDoor = false;
            for (const r of this.dungeonRooms) {
              if (r.active && r.doors.find(d => d.x === x && d.y === y && !d.open)) {
                hitDoor = true; break;
              }
            }
            if (hitDoor) return true;
          }
        }
        return false;
      };

      if (!checkCollision(nextX, this.player.y)) {
        this.player.x = nextX;
      }
      if (!checkCollision(this.player.x, nextY)) {
        this.player.y = nextY;
      }
    } else {
      this.player.x = nextX;
      this.player.y = nextY;
      const pDist = Math.hypot(this.player.x, this.player.y);
      if (pDist > 1000 - 32) {
        const pAngle = Math.atan2(this.player.y, this.player.x);
        this.player.x = Math.cos(pAngle) * (1000 - 32);
        this.player.y = Math.sin(pAngle) * (1000 - 32);
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

        // Bullet Wall Collision
        if (this.gameMode === 'dungeon') {
          const bx = Math.round(b.sprite.x / 64);
          const by = Math.round(b.sprite.y / 64);
          if (!this.floorCells.has(`${bx},${by}`)) {
            b.life = 0; // smash into standard wall
          } else {
            let closedDoorHit = false;
            for (const r of this.dungeonRooms) {
              if (r.active && r.doors.find(d => d.x === bx && d.y === by && !d.open)) {
                closedDoorHit = true; break;
              }
            }
            if (closedDoorHit) b.life = 0; // smash into fence
          }
        }
      }
      b.sprite.zIndex = b.sprite.y;

      let hit = false;

      if (b.isEnemy) {
        // Enemy bullet hitting player (center of mass radius 24)
        if (Math.hypot(b.sprite.x - this.player.x, b.sprite.y - (this.player.y - 24)) < 24 && !this.isInvulnerable) {
          hit = true;
          this.playerHP -= Math.floor(1 + this.wave * 0.5);
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
              const expGain = isRanged ? 1.5 * this.wave : 1.0 * this.wave;
              this.gainExp(expGain);
              this.enemiesAlive--;
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

              const textures = isRanged ? this.goblinBlueTextures : this.goblinTextures;
              const corpse = new Sprite(textures.dead1[0]);
              corpse.anchor.set(0.5, 1);
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
      const frames = (monster as any).type === 'ranged' ? this.goblinBlueTextures.run : this.goblinTextures.run;
      monster.texture = frames[Math.floor((monster as any).animTimer) % frames.length];

      const trueAngle = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
      const dist = Math.hypot(this.player.x - monster.x, this.player.y - monster.y);

      let targetX = this.player.x;
      let targetY = this.player.y;

      if ((monster as any).type === 'ranged') {
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

      if (this.gameMode === 'dungeon') {
        const mRadius = 24;
        const checkMCollision = (px: number, py: number) => {
          const minCX = Math.round((px - mRadius) / 64);
          const maxCX = Math.round((px + mRadius) / 64);
          const minCY = Math.round((py - mRadius) / 64);
          const maxCY = Math.round((py + mRadius) / 64);

          for (let x = minCX; x <= maxCX; x++) {
            for (let y = minCY; y <= maxCY; y++) {
              if (!this.floorCells.has(`${x},${y}`)) return true; // Hitting solid wall boundary
              
              let hitDoor = false;
              for (const r of this.dungeonRooms) {
                if (r.active && r.doors.find(d => d.x === x && d.y === y && !d.open)) {
                  hitDoor = true; break;
                }
              }
              if (hitDoor) return true;
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
      } else {
        monster.x = mNextX;
        monster.y = mNextY;
        const mDist = Math.hypot(monster.x, monster.y);
        if (mDist > 1000 - 32) {
          const mAngle = Math.atan2(monster.y, monster.x);
          monster.x = Math.cos(mAngle) * (1000 - 32);
          monster.y = Math.sin(mAngle) * (1000 - 32);
        }
      }

      // Flip monster sprite based on true angle
      if (Math.cos(trueAngle) < 0) monster.scale.x = -4;
      else monster.scale.x = 4;

      // Collision detection with player
      // Tighten player hitbox to 24 pixels from center of body collision instead of feet
      if (Math.hypot(this.player.x - monster.x, (this.player.y - 24) - (monster.y - 24)) < 24 && !this.isInvulnerable) {
        this.playerHP -= Math.floor(2 + this.wave);
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

    for (const monster of this.monsters) {
      monster.zIndex = monster.y;
    }
    // Also rank bullets
    for (const b of this.bullets) b.sprite.zIndex = b.sprite.y + 10;

    // Camera Tracking
    const screenCenter = { x: this.app.screen.width / 2, y: this.app.screen.height / 2 };
    this.worldContainer.x = screenCenter.x - this.player.x;
    this.worldContainer.y = screenCenter.y - this.player.y;
  }

  public getPlayerHP() {
    return this.playerHP;
  }

  public destroy() {
    this.destroyed = true;
    if (GameManager.activeInstance === this) GameManager.activeInstance = null;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('inventory-swap', this.handleSwap);
    window.removeEventListener('inventory-close', this.handleClose);
    window.removeEventListener('slot-change', this.handleSlotChange);
    if (this.spawnInterval) clearInterval(this.spawnInterval);
    try { this.app.destroy(true, { children: true }); } catch (e) { }
  }
}
