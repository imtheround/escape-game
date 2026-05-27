import { Container, Graphics, Sprite, Texture, Ticker } from 'pixi.js';

export type EnemyArchetype = 'grunt' | 'archer' | 'shield' | 'shaman' | 'bomber' | 'bull' | 'spider';

export class SkeletonEnemy extends Container {
    public archetype: EnemyArchetype;
    public maxHp: number = 0;
    public hp: number = 0;
    public vx: number = 0;
    public vy: number = 0;
    public speed: number = 2;
    public damage: number = 10;
    public state: 'idle' | 'run' | 'attack' | 'dead' = 'idle';
    public aiState: string = 'idle';
    public stateTimer: number = 0;
    public customData: any = {};
    
    // Body parts
    public core: Sprite;
    public armor: Sprite;
    public weapon: Sprite;
    public eye: Sprite;
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

        this.core = new Sprite();
        this.armor = new Sprite();
        this.weapon = new Sprite();
        this.eye = new Sprite();

        // Center anchors for rotation/scaling because SVGs were generated with origin (0,0) in the middle of a 64x64 viewbox
        this.core.anchor.set(0.5);
        this.armor.anchor.set(0.5);
        this.weapon.anchor.set(0.5);
        this.eye.anchor.set(0.5);

        this.buildArchetype();

        this.addChild(this.weapon); // Behind or front depending on state, default behind
        this.addChild(this.core);
        this.addChild(this.armor);
        this.addChild(this.eye);
        
        this.maxHp = this.hp;
    }

    private buildArchetype() {
        const t = this.archetype;
        this.core.texture = Texture.from(`/assets/mobs/${t}_core.svg`);
        this.armor.texture = Texture.from(`/assets/mobs/${t}_armor.svg`);
        this.weapon.texture = Texture.from(`/assets/mobs/${t}_weapon.svg`);
        this.eye.texture = Texture.from(`/assets/mobs/${t}_eye.svg`);

        // Apply archetype specific stats and offsets
        if (this.archetype === 'grunt') {
            this.hp = 20;
            this.speed = 3;
            this.damage = 10;
            this.weapon.x = 16;
            this.weapon.y = 0;
        } else if (this.archetype === 'archer') {
            this.hp = 15;
            this.speed = 4;
            this.damage = 15;
            this.weapon.x = 18;
        } else if (this.archetype === 'shield') {
            this.hp = 40;
            this.speed = 1.5;
            this.damage = 20;
            this.weapon.x = 20;
            this.core.scale.set(1.2);
        } else if (this.archetype === 'shaman') {
            this.hp = 25;
            this.speed = 2.5;
            this.damage = 10;
            this.weapon.x = 18;
        } else if (this.archetype === 'bomber') {
            this.hp = 10;
            this.speed = 6;
            this.damage = 30;
            this.weapon.visible = false; // Hands free for running
        } else if (this.archetype === 'bull') {
            this.hp = 60;
            this.speed = 2; // Very fast when charging
            this.damage = 25;
            this.weapon.visible = false;
        } else if (this.archetype === 'spider') {
            this.hp = 15;
            this.speed = 5;
            this.damage = 15;
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
