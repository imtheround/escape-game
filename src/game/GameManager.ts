import { Application, Container, Sprite, Texture, Assets, Graphics, Text, TextStyle } from 'pixi.js';

export class GameManager {
  private app: Application;
  private worldContainer: Container;
  private player!: Sprite;
  private monsters: Sprite[] = [];
  private bullets: Sprite[] = [];
  private keys: Record<string, boolean> = {};
  private spawnInterval: NodeJS.Timeout | null = null;

  // Animations
  private slimeTextures: Record<string, Texture[]> = {};
  private goblinTextures: Record<string, Texture[]> = {};

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
  private gunRecoil = 0;
  
  private corpses: Sprite[] = [];
  private damagePopups: { sprite: Text, life: number }[] = [];
  
  private playerShadow!: Graphics;

  constructor() {
    this.app = new Application();
    this.worldContainer = new Container();
    this.worldContainer.sortableChildren = true;
  }

  public async init(container: HTMLElement) {
    // 1. Initialize PixiJS
    await this.app.init({
      resizeTo: container,
      backgroundColor: 0x111118,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    
    container.appendChild(this.app.canvas);

    // 2. Load Assets
    await this.loadAssets();

    // 3. Setup World
    this.app.stage.addChild(this.worldContainer);
    this.setupPlayer();
    this.setupInput();
    
    this.spawnInterval = setInterval(() => this.spawnMonster(), 2000);

    this.app.ticker.add((ticker) => {
      this.update(ticker.deltaTime);
    });
  }

  private async loadAssets() {
    const tIdle1 = await Assets.load('/assets/character/slime_idle1.svg');
    const tIdle2 = await Assets.load('/assets/character/slime_idle2.svg');
    const tWalk1 = await Assets.load('/assets/character/slime_walk1.svg');
    const tWalk2 = await Assets.load('/assets/character/slime_walk2.svg');
    const tWalk3 = await Assets.load('/assets/character/slime_walk3.svg');
    const tWalk4 = await Assets.load('/assets/character/slime_walk4.svg');
    const tHit = await Assets.load('/assets/character/slime_hit.svg');
    const tAttack = await Assets.load('/assets/character/slime_attack.svg');
    
    [tIdle1, tIdle2, tWalk1, tWalk2, tWalk3, tWalk4, tHit, tAttack].forEach(t => t.source.scaleMode = 'nearest');

    this.slimeTextures = {
      idle: [tIdle1, tIdle2],
      walk: [tWalk1, tWalk2, tWalk3, tWalk4],
      hit: [tHit],
      attack: [tAttack],
    };

    // Load weapons
    this.weaponTextures = {
      gun: await Assets.load('/assets/character/gun1.svg'),
      bullet: await Assets.load('/assets/character/bullet.svg')
    };
    [this.weaponTextures.gun, this.weaponTextures.bullet].forEach(t => t.source.scaleMode = 'nearest');

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
    
    this.goblinTextures.idle.forEach((t: any) => t.source.scaleMode = 'nearest');
    this.goblinTextures.run.forEach((t: any) => t.source.scaleMode = 'nearest');
    this.goblinTextures.dead1[0].source.scaleMode = 'nearest';
    this.goblinTextures.dead2[0].source.scaleMode = 'nearest';
    this.goblinTextures.dead3[0].source.scaleMode = 'nearest';
  }

  private setupPlayer() {
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

    // Setup Gun
    this.gunSprite = new Sprite(this.weaponTextures.gun);
    this.gunSprite.anchor.set(0.25, 0.5); // anchor roughly at the handle
    this.gunSprite.scale.set(3);
    this.worldContainer.addChild(this.gunSprite);
  }

  private handleKeyDown = (e: KeyboardEvent) => { this.keys[e.code] = true; };
  private handleKeyUp = (e: KeyboardEvent) => { this.keys[e.code] = false; };

  private setupInput() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private spawnMonster() {
    if (this.playerHP <= 0) return; // Stop spawning if game over
    
    // Spawn just outside viewport relative to player
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(this.app.screen.width, this.app.screen.height) * 0.7;
    const x = this.player.x + Math.cos(angle) * distance;
    const y = this.player.y + Math.sin(angle) * distance;

    const monster = new Sprite(this.goblinTextures.run[0]);
    monster.anchor.set(0.5, 1);
    monster.scale.set(4);
    monster.x = x;
    monster.y = y;
    
    (monster as any).jitterAngle = 0;
    (monster as any).jitterTimer = 0;
    (monster as any).hp = 50;
    
    // Create isolated shadow
    const shadow = new Graphics().ellipse(0, 0, 4, 1.5).fill({ color: 0x000000, alpha: 0.5 });
    shadow.zIndex = -99998;
    this.worldContainer.addChild(shadow);
    (monster as any).shadow = shadow;
    (monster as any).animTimer = Math.random() * 4;

    this.worldContainer.addChild(monster);
    this.monsters.push(monster);
  }

  private shootBullet(target: Sprite | null, dx: number, dy: number) {
    const bullet = new Sprite(this.weaponTextures.bullet);
    bullet.anchor.set(0.5, 0.5);
    bullet.scale.set(3);
    bullet.x = this.player.x;
    bullet.y = this.player.y - 12; // Shoot from barrel level
    
    this.gunRecoil = 1.0; // trigger smooth programmatic recoil
    
    let baseAngle = 0;
    if (target) {
      baseAngle = Math.atan2(target.y - bullet.y, target.x - bullet.x);
    } else if (dx !== 0 || dy !== 0) {
      baseAngle = Math.atan2(dy, dx);
    } else {
      baseAngle = this.player.scale.x > 0 ? 0 : Math.PI; // Forward based on facing
    }

    // Add Spread Map
    const spread = (Math.random() - 0.5) * 0.4; // roughly +/- 11 degrees
    const finalAngle = baseAngle + spread;

    bullet.rotation = finalAngle;
    (bullet as any).vx = Math.cos(finalAngle) * 15; // Fast bullet
    (bullet as any).vy = Math.sin(finalAngle) * 15;

    this.worldContainer.addChild(bullet);
    this.bullets.push(bullet);
  }

  private update(dt: number) {
    // Broadcast HP changes via Custom Event
    if (this.playerHP !== this.lastHP) {
      window.dispatchEvent(new CustomEvent('hp-change', { detail: this.playerHP }));
      this.lastHP = this.playerHP;
    }
    
    this.playerShadow.x = this.player.x;
    this.playerShadow.y = this.player.y;

    if (this.playerHP <= 0) return; // Freeze simulation on death

    const speed = 4 * dt;
    let dx = 0;
    let dy = 0;

    if (this.keys['ArrowUp'] || this.keys['KeyW']) dy -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) dy += 1;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) dx -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
    }

    // Process Corpses
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const c = this.corpses[i];
      (c as any).life -= dt;
      const life = (c as any).life;
      
      if (life > 170) c.texture = this.goblinTextures.dead1[0];
      else if (life > 160) c.texture = this.goblinTextures.dead2[0];
      else c.texture = this.goblinTextures.dead3[0];

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

    // Find nearest enemy for targeting
    let nearestMonster: Sprite | null = null;
    let minDist = Infinity;
    for (const monster of this.monsters) {
      const dist = Math.hypot(this.player.x - monster.x, this.player.y - monster.y);
      if (dist < minDist) {
        minDist = dist;
        nearestMonster = monster;
      }
    }

    // Shoot mechanics
    const now = performance.now();
    if (this.keys['Space'] && now - this.lastShootTime > 250) {
      this.lastShootTime = now;
      this.shootBullet(nearestMonster, dx, dy);
    }

    // Animation state logic
    let newAnim = dx !== 0 || dy !== 0 ? 'walk' : 'idle';
    if (this.isInvulnerable) newAnim = 'hit';

    if (newAnim !== this.currentAnim) {
      this.currentAnim = newAnim;
      this.animTimer = 0; // Reset timer on frame change
    }

    // Process sprite animation
    const animSpeed = this.currentAnim === 'walk' ? 0.15 : 0.05;
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
    
    // Prevent the gun from rendering upside down when pointing left
    if (Math.abs(targetAngle) > Math.PI / 2) {
      this.gunSprite.scale.y = -3;
    } else {
      this.gunSprite.scale.y = 3;
    }

    // Apply smooth programmatic recoil backwards and slight upward kick
    if (this.gunRecoil > 0) {
      this.gunRecoil -= dt * 0.15; // smooth decay
      if (this.gunRecoil < 0) this.gunRecoil = 0;
    }
    
    const recoilDist = this.gunRecoil * 12; // kick backwards up to 12 pixels visually
    const kickAngle = this.gunRecoil * 0.2 * (this.gunSprite.scale.y < 0 ? -1 : 1);
    
    this.gunSprite.rotation = targetAngle + kickAngle;
    this.gunSprite.x = this.player.x - Math.cos(targetAngle) * recoilDist;
    this.gunSprite.y = this.player.y - 12 - Math.sin(targetAngle) * recoilDist;

    // Sprite flipping logic (Prioritize facing tracking angle)
    if (Math.abs(targetAngle) > Math.PI / 2) this.player.scale.x = -4;
    else this.player.scale.x = 4;

    this.player.x += dx * speed;
    this.player.y += dy * speed * 0.75; // 45-degree angle

    // Process Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.zIndex = b.y;

      b.x += (b as any).vx * dt;
      b.y += (b as any).vy * dt;

      // Check bullet collision with monsters
      let hit = false;
      for (let j = this.monsters.length - 1; j >= 0; j--) {
        const monster = this.monsters[j];
        // Shift monster target Y up by 24 pixels to match center of mass instead of feet
        if (Math.hypot(b.x - monster.x, b.y - (monster.y - 24)) < 40) {
          hit = true;
          
          // Apply 30 damage
          (monster as any).hp -= 30;

          // Damage Popup
          const style = new TextStyle({
            fontFamily: 'Arial',
            fontSize: 24,
            fill: '#ffaa00',
            stroke: { color: '#550000', width: 4 },
            fontWeight: 'bold',
          });
          const dmgText = new Text({ text: '30', style });
          dmgText.anchor.set(0.5, 0.5);
          dmgText.x = monster.x + (Math.random() * 20 - 10);
          dmgText.y = monster.y - 40;
          dmgText.zIndex = monster.y + 100;
          this.worldContainer.addChild(dmgText);
          this.damagePopups.push({ sprite: dmgText, life: 30 }); // 30 frames duration

          // Death check
          if ((monster as any).hp <= 0) {
            // Spawn Corpse
            const corpse = new Sprite(this.goblinTextures.dead1[0]);
            corpse.anchor.set(0.5, 1);
            corpse.scale.set(4);
            corpse.scale.x = monster.scale.x; // retain facing dir
            corpse.x = monster.x;
            corpse.y = monster.y;
            corpse.zIndex = monster.y - 5; // Lay on the floor
            corpse.alpha = 0.8;
            (corpse as any).life = 180; // Fade out after 3 seconds
            
            this.worldContainer.removeChild((monster as any).shadow);
            (monster as any).shadow.destroy();

            this.worldContainer.addChild(corpse);
            this.corpses.push(corpse);

            this.worldContainer.removeChild(monster);
            monster.destroy();
            this.monsters.splice(j, 1);
          }
          break; // Bullet consumed
        }
      }

      // Remove bullet if hit or too far away
      const distFromPlayer = Math.hypot(this.player.x - b.x, this.player.y - b.y);
      if (hit || distFromPlayer > 1000) {
        this.worldContainer.removeChild(b);
        b.destroy();
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
      
      // Animation ticks
      (monster as any).animTimer += dt * 0.15;
      const frames = this.goblinTextures.run;
      monster.texture = frames[Math.floor((monster as any).animTimer) % frames.length];

      const trueAngle = Math.atan2(this.player.y - monster.y, this.player.x - monster.x);
      
      // Jitter logic for erratic movement
      (monster as any).jitterTimer -= dt;
      if ((monster as any).jitterTimer <= 0) {
        (monster as any).jitterAngle = (Math.random() - 0.5) * Math.PI; // Aggressive +/- 90 deg wander
        (monster as any).jitterTimer = 10 + Math.random() * 20; // Re-evaluate extremely quickly
      }
      
      const finalAngle = trueAngle + (monster as any).jitterAngle;

      monster.x += Math.cos(finalAngle) * monsterSpeed;
      monster.y += Math.sin(finalAngle) * monsterSpeed * 0.75;

      // Flip monster sprite based on true angle
      if (Math.cos(trueAngle) < 0) monster.scale.x = -4;
      else monster.scale.x = 4;

      // Collision detection with player
      const dist = Math.hypot(this.player.x - monster.x, this.player.y - monster.y);
      if (dist < 45 && !this.isInvulnerable) { 
        this.playerHP -= 2;
        this.isInvulnerable = true;
        this.invulnerableTimer = 60; // Represents roughly 1 second at 60 FPS
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
    for (const b of this.bullets) b.zIndex = b.y + 10;

    // Camera Tracking
    const screenCenter = { x: this.app.screen.width / 2, y: this.app.screen.height / 2 };
    this.worldContainer.x = screenCenter.x - this.player.x;
    this.worldContainer.y = screenCenter.y - this.player.y;
  }

  public getPlayerHP() {
    return this.playerHP;
  }

  public destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    if (this.spawnInterval) clearInterval(this.spawnInterval);
    this.app.destroy(true, { children: true });
  }
}
