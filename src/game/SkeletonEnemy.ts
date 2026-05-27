import { Container, Graphics, Sprite, Texture, Ticker } from 'pixi.js';

export type EnemyArchetype = 'grunt' | 'archer' | 'shield' | 'shaman' | 'bomber' | 'bull' | 'spider';

export class SkeletonEnemy extends Container {
    public archetype: EnemyArchetype;
    public maxHp: number = 0;
    public hp: number = 0;
    public vx: number = 0;
    public vy: number = 0;
    public speed: number = 2;
    public state: 'idle' | 'run' | 'attack' | 'dead' = 'idle';
    public aiState: string = 'chase';
    public stateTimer: number = 0;
    public customData: any = {};
    
    // Body parts
    public core: Graphics;
    public armor: Graphics;
    public weapon: Graphics;
    public eye: Graphics;
    public shadow: Graphics;

    // Animation state
    private animTime: number = 0;
    private seed: number;

    constructor(archetype: EnemyArchetype) {
        super();
        this.archetype = archetype;
        this.seed = Math.random() * 100;
        
        // Base shadow
        this.shadow = new Graphics().ellipse(0, 0, 16, 8).fill({ color: 0x000000, alpha: 0.5 });
        this.shadow.y = 16;
        this.addChild(this.shadow);

        this.core = new Graphics();
        this.armor = new Graphics();
        this.weapon = new Graphics();
        this.eye = new Graphics();

        this.buildArchetype();

        this.addChild(this.weapon); // Behind or front depending on state, default behind
        this.addChild(this.core);
        this.addChild(this.armor);
        this.addChild(this.eye);
        
        this.maxHp = this.hp;
    }

    private buildArchetype() {
        // Default green goblin core
        this.core.roundRect(-12, -12, 24, 24, 8).fill(0x35A344);
        
        // Single eye
        this.eye.circle(0, -4, 4).fill(0xffffff);
        this.eye.circle(0, -4, 2).fill(0xff0000); // Red pupil

        if (this.archetype === 'grunt') {
            this.hp = 20;
            this.speed = 3;
            this.armor.rect(-14, 0, 28, 12).fill(0x555555); // Simple chest plate
            this.weapon.rect(-4, -20, 8, 30).fill(0x8B4513); // Wooden club
            this.weapon.x = 16;
            this.weapon.y = 0;
        } else if (this.archetype === 'archer') {
            this.hp = 15;
            this.speed = 4;
            this.armor.rect(-10, -14, 20, 10).fill(0x8B4513); // Leather cap/vest
            this.weapon.poly([-2, -15, 2, -15, 4, 0, 2, 15, -2, 15]).fill(0x8B4513); // Bow
            this.weapon.x = 18;
        } else if (this.archetype === 'shield') {
            this.hp = 40;
            this.speed = 1.5;
            this.armor.roundRect(-16, -16, 32, 32, 4).fill(0x444444); // Heavy armor
            this.weapon.rect(-6, -24, 12, 48).fill(0x555555); // Tower shield
            this.weapon.x = 20;
            this.core.scale.set(1.2);
        } else if (this.archetype === 'shaman') {
            this.hp = 25;
            this.speed = 2.5;
            this.armor.poly([-16, 12, 0, -16, 16, 12]).fill(0x4B0082); // Purple robes
            this.weapon.rect(-2, -30, 4, 40).fill(0x8B4513); // Staff
            this.weapon.circle(0, -30, 8).fill(0x9932CC); // Glowing orb
            this.weapon.x = 18;
        } else if (this.archetype === 'bomber') {
            this.hp = 10;
            this.speed = 6;
            this.core.fill(0x8B0000); // Red core
            this.armor.circle(0, -16, 8).fill(0x222222); // Bomb on back
            this.armor.circle(0, -24, 3).fill(0xffaa00); // Spark
            this.weapon.visible = false; // Hands free for running
        } else if (this.archetype === 'bull') {
            this.hp = 60;
            this.speed = 2; // Very fast when charging
            this.core.roundRect(-20, -16, 40, 32, 8).fill(0x8B4513); // Brown body
            this.armor.poly([-20, -16, -30, -24, -24, -10]).fill(0xdddddd); // Horn 1
            this.armor.poly([20, -16, 30, -24, 24, -10]).fill(0xdddddd); // Horn 2
            this.eye.clear().circle(-10, -8, 4).fill(0xffffff).circle(-10, -8, 2).fill(0xff0000);
            this.eye.circle(10, -8, 4).fill(0xffffff).circle(10, -8, 2).fill(0xff0000);
            this.weapon.visible = false;
        } else if (this.archetype === 'spider') {
            this.hp = 15;
            this.speed = 5;
            this.core.circle(0, 0, 12).fill(0x000000); // Black body
            // 8 Legs
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                this.armor.moveTo(0,0).lineTo(Math.cos(angle)*20, Math.sin(angle)*20).stroke({width: 2, color: 0x333333});
            }
            this.eye.clear().circle(-4, -6, 3).fill(0x00ff00).circle(4, -6, 3).fill(0x00ff00); // Green eyes
            this.weapon.visible = false;
        }
    }

    public update(dt: number) {
        this.animTime += dt * 0.1;
        
        if (this.state === 'idle') {
            this.core.scale.y = 1 + Math.sin(this.animTime + this.seed) * 0.05;
            this.core.scale.x = 1 - Math.sin(this.animTime + this.seed) * 0.02;
            this.weapon.rotation = Math.sin(this.animTime * 0.5) * 0.1;
            this.weapon.y = Math.sin(this.animTime) * 2;
        } else if (this.state === 'run') {
            // Bouncy run
            this.core.y = Math.abs(Math.sin(this.animTime * 2)) * -8;
            this.core.scale.y = 1 - Math.abs(Math.sin(this.animTime * 2)) * 0.1;
            this.core.scale.x = 1 + Math.abs(Math.sin(this.animTime * 2)) * 0.05;
            
            // Armor bounce
            this.armor.y = this.core.y;
            this.eye.y = this.core.y;

            // Weapon swing
            if (this.archetype !== 'bull' && this.archetype !== 'spider') {
                this.weapon.rotation = Math.sin(this.animTime * 2) * 0.4;
                this.weapon.y = this.core.y;
            } else if (this.archetype === 'spider') {
                this.core.rotation = Math.sin(this.animTime * 3) * 0.1;
                this.armor.rotation = Math.sin(this.animTime * 3) * 0.1;
            }
        } else if (this.state === 'attack') {
            // Weapon slam
            this.weapon.rotation += (Math.PI / 2 - this.weapon.rotation) * 0.2;
        }

        // Keep shadow flat
        this.shadow.y = 16 - this.core.y * 0.5;
        this.shadow.scale.x = 1 + this.core.y * 0.05;
    }
}
