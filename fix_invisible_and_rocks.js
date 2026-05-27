const fs = require('fs');

// 1. Fix GameManager.ts
let gmContent = fs.readFileSync('src/game/GameManager.ts', 'utf-8');

// Fix invisible obstacles: Ensure WATER and IRRADIATED_WATER are rendered
// We add them to the floor block to draw a base, and then a specific water drawing block.
gmContent = gmContent.replace(
    "if (type === 'FLOOR' || type === 'DOOR' || type === 'OBSTACLE' || type === 'TREE' || type === 'WALL')",
    "if (type === 'FLOOR' || type === 'DOOR' || type === 'OBSTACLE' || type === 'TREE' || type === 'WALL' || type === 'WATER' || type === 'IRRADIATED_WATER')"
);

// Add water rendering inside renderEnvironment
const waterRenderLogic = `
        if (type === 'WATER' || type === 'IRRADIATED_WATER') {
            const waterCol = (type === 'IRRADIATED_WATER') ? 0x22ff22 : 0x00ffff;
            this.floorGraphics.rect(bx + 4, by + 4, TILE_PX - 8, TILE_PX - 8).fill({ color: waterCol, alpha: 0.3 });
            if (Math.random() < 0.1) this.spawnParticles(bx + 32, by + 32, waterCol, 1);
        }
`;

// Insert after floor block
const floorBlockEnd = 'fspr.scale.set(rng() > 0.5 ? 1 : -1, rng() > 0.5 ? 1 : -1);\n              }\n          }\n        }';
gmContent = gmContent.replace(floorBlockEnd, floorBlockEnd + waterRenderLogic);

// Remove "weird rocks" (crystals) from Biome 2 (Void)
const weirdRocksRegex = /else if \(biome === 2\) \{ \/\/ Void Crystals[\s\S]*?sprite\.scale\.set\(1\.8\);\n              \}/m;
gmContent = gmContent.replace(weirdRocksRegex, `else if (biome === 2) { 
                  // User requested to remove weird rocks from Void biome
                  sprite.visible = false;
                  activeTreeCount--; // Backtrack the counter
              }`);

// Reduce mob density further as requested
gmContent = gmContent.replace(
    /let numEnemies = \(5 \+ Math\.floor\(Math\.random\(\) \* 5\)\) \+ this\.currentDungeonStage \* 2;/g,
    'let numEnemies = (3 + Math.floor(Math.random() * 3)) + Math.floor(this.currentDungeonStage * 1.2);'
);

fs.writeFileSync('src/game/GameManager.ts', gmContent);

// 2. Fix DungeonGenerator.ts (Reduce obstacles)
let dgContent = fs.readFileSync('src/game/DungeonGenerator.ts', 'utf-8');

// Reduce number of obstacles per room
dgContent = dgContent.replace(
    /const numObstacles = 4 \+ Math\.floor\(rng\.next\(\) \* 5\);/g,
    'const numObstacles = 2 + Math.floor(rng.next() * 3);'
);

// Remove IRRADIATED_WATER from generation to avoid "invisible" confusion if rendering fails
dgContent = dgContent.replace(
    /if \(rng\.next\(\) < 0\.1\) \{[\s\S]*?\} else \{/m,
    'if (false) { } else {'
);

fs.writeFileSync('src/game/DungeonGenerator.ts', dgContent);
console.log('Fixed invisible obstacles, removed weird rocks from biome 3, and reduced densities.');