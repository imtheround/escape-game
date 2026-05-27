const fs = require('fs');

let enemyContent = fs.readFileSync('src/game/SkeletonEnemy.ts', 'utf-8');
if (!enemyContent.includes('public damage: number')) {
    enemyContent = enemyContent.replace(
        'public speed: number = 2;',
        'public speed: number = 2;\n    public damage: number = 10;'
    );
    // Add default damage values per archetype
    enemyContent = enemyContent.replace("this.speed = 3;", "this.speed = 3;\n            this.damage = 10;");
    enemyContent = enemyContent.replace("this.speed = 4;", "this.speed = 4;\n            this.damage = 15;");
    enemyContent = enemyContent.replace("this.speed = 1.5;", "this.speed = 1.5;\n            this.damage = 20;");
    enemyContent = enemyContent.replace("this.speed = 2.5;", "this.speed = 2.5;\n            this.damage = 10;");
    enemyContent = enemyContent.replace("this.speed = 6;", "this.speed = 6;\n            this.damage = 30;"); // Bomber
    enemyContent = enemyContent.replace("this.speed = 2; // Very fast when charging", "this.speed = 2; // Very fast when charging\n            this.damage = 25;");
    enemyContent = enemyContent.replace("this.speed = 5;", "this.speed = 5;\n            this.damage = 15;");
    fs.writeFileSync('src/game/SkeletonEnemy.ts', enemyContent);
}

let gmContent = fs.readFileSync('src/game/GameManager.ts', 'utf-8');

// Update apply customProps in GameManager to apply damage
gmContent = gmContent.replace(
    /if \(customProps\.speed\) enemy\.speed = customProps\.speed;/g,
    "if (customProps.speed) enemy.speed = customProps.speed;\n            if (customProps.damage) enemy.damage = customProps.damage;"
);

// Update spawn loop to pass scaled stats
const spawnLoopRegex = /const archetypes: EnemyArchetype\[\] = \['grunt', 'archer', 'shield', 'shaman', 'bomber', 'bull', 'spider'\];\n                       const arch = archetypes\[Math\.floor\(Math\.random\(\) \* archetypes\.length\)\];\n                       this\.spawnEnemy\(rx, ry, arch, customProps\);/m;

const newSpawnLoop = `const archetypes: EnemyArchetype[] = ['grunt', 'archer', 'shield', 'shaman', 'bomber', 'bull', 'spider'];
                       const arch = archetypes[Math.floor(Math.random() * archetypes.length)];
                       
                       // Scale stats based on world (Biome 2 = World 2, Biome 3 = World 3)
                       const hpMultiplier = 1 + ((this.currentDungeonWorld - 1) * 1.5); // +150% HP per world
                       const dmgMultiplier = 1 + ((this.currentDungeonWorld - 1) * 0.5); // +50% DMG per world
                       const speedMultiplier = 1 + ((this.currentDungeonWorld - 1) * 0.1); // +10% Speed per world
                       
                       Object.assign(customProps, { 
                           hpMultiplier, 
                           dmgMultiplier, 
                           speedMultiplier 
                       });

                       this.spawnEnemy(rx, ry, arch, customProps);`;

gmContent = gmContent.replace(spawnLoopRegex, newSpawnLoop);

// Update spawnEnemy to apply multipliers
const applyPropsRegex = /if \(customProps\) \{[\s\S]*?if \(customProps\.scale\) enemy\.scale\.set\(customProps\.scale\);\n        \}/m;

const newApplyProps = `if (customProps) {
            if (customProps.enemyTypeId) (enemy as any).enemyTypeId = customProps.enemyTypeId;
            if (customProps.maxHp) enemy.maxHp = customProps.maxHp;
            if (customProps.hp) enemy.hp = customProps.hp;
            if (customProps.speed) enemy.speed = customProps.speed;
            if (customProps.damage) enemy.damage = customProps.damage;
            if (customProps.scale) enemy.scale.set(customProps.scale);
            
            // Apply multipliers if present
            if (customProps.hpMultiplier) {
                enemy.maxHp = Math.floor(enemy.maxHp * customProps.hpMultiplier);
                enemy.hp = enemy.maxHp;
            }
            if (customProps.dmgMultiplier) {
                enemy.damage = Math.floor(enemy.damage * customProps.dmgMultiplier);
            }
            if (customProps.speedMultiplier) {
                enemy.speed *= customProps.speedMultiplier;
            }
        }`;

gmContent = gmContent.replace(applyPropsRegex, newApplyProps);

// Update attack logic to use monster.damage instead of hardcoded 2/3/4/5
gmContent = gmContent.replace(/this\.playerHP -= 4;/g, "this.playerHP -= monster.damage;"); // Bull
gmContent = gmContent.replace(/this\.playerHP -= \(monster\.archetype === 'shield' \? 3 : 2\);/g, "this.playerHP -= monster.damage;"); // Grunt/Shield
gmContent = gmContent.replace(/this\.playerHP -= 3;/g, "this.playerHP -= monster.damage;"); // Spider
gmContent = gmContent.replace(/this\.playerHP -= 5;/g, "this.playerHP -= monster.damage;"); // Bull (new logic)

fs.writeFileSync('src/game/GameManager.ts', gmContent);
console.log("Mob scaling applied!");