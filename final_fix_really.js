const fs = require('fs');

let content = fs.readFileSync('src/game/GameManager.ts', 'utf-8');

// 1. Fix the skip handlers so they actually exit the tutorial
const skipBiome1Regex = /private handleSkipToBiome1 = async \(\) => \{[\s\S]*?playSound\('close_inventory'\);\n  \};/m;
const newSkipBiome1 = `private handleSkipToBiome1 = async () => {
    this.tutorialStep = 15;
    this.tutorialTaskCompleted = true;
    this.inventory = [
       { id: 'gun', count: 1, ammo: 12 }, // default max ammo
       { id: 'sword', count: 1, ammo: undefined },
       { id: '', count: 0 }
    ];
    this.activeSlot = 0;
    this.currentDungeonStage = 11;
    this.currentDungeonWorld = 2; // Biome 1 (Magma)
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
    SoundManager.getInstance().playSound('close_inventory');
  };`;
content = content.replace(skipBiome1Regex, newSkipBiome1);

const skipBiome2Regex = /private handleSkipToBiome2 = async \(\) => \{[\s\S]*?playSound\('close_inventory'\);\n  \};/m;
const newSkipBiome2 = `private handleSkipToBiome2 = async () => {
    this.tutorialStep = 15;
    this.tutorialTaskCompleted = true;
    this.inventory = [
       { id: 'gun', count: 1, ammo: 12 },
       { id: 'sword', count: 1, ammo: undefined },
       { id: '', count: 0 }
    ];
    this.activeSlot = 0;
    this.currentDungeonStage = 21;
    this.currentDungeonWorld = 3; // Biome 2 (Void)
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
    SoundManager.getInstance().playSound('close_inventory');
  };`;
content = content.replace(skipBiome2Regex, newSkipBiome2);


// 2. Fix the Tutorial Bricks / Forest Grass separation
const floorBlockRegex = /if \(type === 'FLOOR' \|\| type === 'DOOR' \|\| type === 'OBSTACLE' \|\| type === 'TREE'\) \{\s*this\.floorGraphics\.rect\(bx, by, TILE_PX, TILE_PX\)\.fill\(floorBaseCol\);/m;
const newFloorBlock = `if (type === 'FLOOR' || type === 'DOOR' || type === 'OBSTACLE' || type === 'TREE') {
          if (this.currentDungeonStage === 1 && this.currentDungeonWorld === 1) {
              // Tutorial stone floors (Bricks)
              this.floorGraphics.rect(bx, by, TILE_PX, TILE_PX).fill(cols.floorLight);
              this.floorGraphics.rect(bx + 2, by + 2, TILE_PX - 4, TILE_PX - 4).fill(cols.floorDark);
          } else {
              this.floorGraphics.rect(bx, by, TILE_PX, TILE_PX).fill(floorBaseCol);`;
content = content.replace(floorBlockRegex, newFloorBlock);

const closingBraceRegex = /fspr\.scale\.set\(flipX, flipY\);\n        \}/m;
const newClosingBrace = `fspr.scale.set(flipX, flipY);
          }
        }`;
content = content.replace(closingBraceRegex, newClosingBrace);

fs.writeFileSync('src/game/GameManager.ts', content);
console.log('Final fix applied');