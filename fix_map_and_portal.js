const fs = require('fs');

// 1. Fix GameManager.ts (Portal and Mob Density)
let gmContent = fs.readFileSync('src/game/GameManager.ts', 'utf-8');

// Reduce mob density
gmContent = gmContent.replace(
    /let numEnemies = \(10 \+ Math\.floor\(Math\.random\(\) \* 8\)\) \+ this\.currentDungeonStage \* 3;/g,
    'let numEnemies = (5 + Math.floor(Math.random() * 5)) + this.currentDungeonStage * 2;'
);

// Add Portal spawn logic
const roomClearedRegex = /if \(room && !room\.cleared\) \{\s*room\.cleared = true;\s*\}/m;
const newRoomCleared = `if (room && !room.cleared) {
                  room.cleared = true;
                  
                  // Spawn Portal if this is the final room of the stage
                  if (room.isEndRoom && !this.portalSpawned) {
                      this.portalSpawned = true;
                      const portalX = room.tx * 64 + 32;
                      const portalY = room.ty * 64 + 32;

                      this.portalSprite = new Sprite(this.mapTextures.portal);
                      this.portalSprite.anchor.set(0.5, 0.5);
                      this.portalSprite.scale.set(4);
                      this.portalSprite.x = portalX;
                      this.portalSprite.y = portalY;
                      this.portalSprite.alpha = 1.0;
                      this.portalSprite.zIndex = portalY;
                      this.worldContainer.addChild(this.portalSprite);

                      const style = new TextStyle({ fontFamily: '"CustomFont", Arial', fontSize: 36, fill: '#aa00ff', stroke: { color: '#000000', width: 5 }, fontWeight: 'bold' });
                      const clearText = new Text({ text: 'AETHER RIFT OPENED!', style });
                      clearText.anchor.set(0.5, 0.5);
                      clearText.x = this.player.x;
                      clearText.y = this.player.y - 100;
                      clearText.zIndex = 999999;
                      this.worldContainer.addChild(clearText);
                      this.damagePopups.push({ sprite: clearText, life: 180 });
                  }
              }`;
gmContent = gmContent.replace(roomClearedRegex, newRoomCleared);

fs.writeFileSync('src/game/GameManager.ts', gmContent);

// 2. Fix DungeonGenerator.ts (Map Size)
let dgContent = fs.readFileSync('src/game/DungeonGenerator.ts', 'utf-8');

dgContent = dgContent.replace(
    /const numRooms = 10 \+ Math\.floor\(stage\);/g,
    'const numRooms = 7 + Math.floor(stage * 0.7);'
);

fs.writeFileSync('src/game/DungeonGenerator.ts', dgContent);
console.log('Applied portal logic, reduced map size, and reduced mob density.');