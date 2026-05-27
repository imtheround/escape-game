const fs = require('fs');

let content = fs.readFileSync('src/game/GameManager.ts', 'utf-8');

// 1. getBiomeAt
content = content.replace(
    /private getBiomeAt[\s\S]*?return 2; \/\/ Void\/Escape\n  \}/m,
    `private getBiomeAt(wx: number, wy: number): number {
    return Math.min(Math.max(0, this.currentDungeonWorld - 1), 2);
  }`
);

// 2. loadAssets (update customFloor)
content = content.replace(
    /customFloor: Array\.from\(\{length: 40\}\)\.map\(\(_, i\) => generateTex\(this\.createFloorGraphics\(99, i\)\)\),/,
    `customFloor0: Array.from({length: 40}).map((_, i) => generateTex(this.createFloorGraphics(0, i))),
      customFloor1: Array.from({length: 40}).map((_, i) => generateTex(this.createFloorGraphics(1, i))),
      customFloor2: Array.from({length: 40}).map((_, i) => generateTex(this.createFloorGraphics(2, i))),`
);

// 3. createFloorGraphics (overhaul logic for transparent decals for 0, 1, 2)
const createFloorRegex = /private createFloorGraphics[\s\S]*?return g;\n    \}/m;
const newCreateFloor = `private createFloorGraphics(biome: number, crackType: number = 0): Graphics {
    const g = new Graphics();
    
    let seed = 777 + crackType * 31 + biome * 97;
    const rng = () => { seed = (seed * 16807) % 2147483647; return Math.abs((seed - 1) / 2147483646); };

    if (biome === 0) {
      // Grass decals (transparent)
      const numDecals = 3 + Math.floor(rng() * 10);
      for (let i = 0; i < numDecals; i++) {
          const dx = Math.floor(rng() * 64);
          const dy = Math.floor(rng() * 64);
          const rType = rng();
          if (rType < 0.70) {
              g.rect(dx, dy, 4, 2).fill(0x4c8a32);
              g.rect(dx + 1, dy - 3, 2, 5).fill(0x569e3a);
          } else if (rType < 0.85) {
              g.rect(dx, dy, 6, 3).fill(0x457c2c);
              g.rect(dx + 1, dy - 2, 4, 3).fill(0x4c8a32);
          } else {
              const pSize = 2 + Math.floor(rng() * 3);
              g.rect(dx, dy, pSize, pSize).fill(0x555555);
              g.rect(dx, dy, pSize - 1, pSize - 1).fill(0x666666);
          }
      }
    } else if (biome === 1) {
      // Magma/Brick decals (transparent, drawn over base red floor)
      const numCracks = 2 + Math.floor(rng() * 3);
      for (let i = 0; i < numCracks; i++) {
          const dx = Math.floor(rng() * 64);
          const dy = Math.floor(rng() * 64);
          g.rect(dx, dy, 12, 2).fill(0xff4500); // Lava crack
          g.rect(dx + 4, dy - 4, 2, 10).fill(0xff8c00);
      }
      const numStones = 4 + Math.floor(rng() * 5);
      for (let i = 0; i < numStones; i++) {
          const dx = Math.floor(rng() * 64);
          const dy = Math.floor(rng() * 64);
          g.rect(dx, dy, 6, 6).fill(0x3a1f12);
          g.rect(dx, dy, 6, 2).fill(0x4a2a1a);
      }
    } else if (biome === 2) {
      // Void decals (floating particles)
      const numStars = 10 + Math.floor(rng() * 15);
      for (let i = 0; i < numStars; i++) {
          const dx = Math.floor(rng() * 64);
          const dy = Math.floor(rng() * 64);
          const rType = rng();
          if (rType < 0.6) {
             g.rect(dx, dy, 2, 2).fill(0xaa00ff);
          } else {
             g.rect(dx, dy, 4, 4).fill(0x00ffff);
          }
      }
    }
    return g;
  }`;
content = content.replace(createFloorRegex, newCreateFloor);

// 4. getBiomeColors (base colors for solid floor underneath)
// Make sure biome 1 is dark red, biome 2 is dark purple
const biomeColorsRegex = /public getBiomeColors[\s\S]*?return \{ floorLight: 0x242831, floorDark: 0x1a1c23, wallLight: 0x3b404d, wallDark: 0x181a21, seam: 0x00ffff \};\n  \}/m;
const newBiomeColors = `public getBiomeColors(biome: number) {
    if (biome === 1) return { floorLight: 0x2a110a, floorDark: 0x2a110a, wallLight: 0x5e3825, wallDark: 0x2a160c, seam: 0xff4500 };
    if (biome === 2) return { floorLight: 0x10051f, floorDark: 0x10051f, wallLight: 0x33224d, wallDark: 0x110b1a, seam: 0xaa00ff };
    return { floorLight: 0x242831, floorDark: 0x1a1c23, wallLight: 0x3b404d, wallDark: 0x181a21, seam: 0x00ffff };
  }`;
content = content.replace(biomeColorsRegex, newBiomeColors);

// 5. renderEnvironment (select correct customFloor array, change base floor color per biome, swap TREE texture based on biome)
const renderEnvRegex = /        \/\/ Draw basic floors \(magma, tutorial\) vs Forest[\s\S]*?if \(type === 'TREE'\) \{/m;
const newRenderEnv = `        // Dynamic base floor color
        let floorBaseCol = 0x2b4f1b; // Forest green
        if (biome === 1) floorBaseCol = 0x2a110a; // Magma dark red
        if (biome === 2) floorBaseCol = 0x10051f; // Void dark purple

        if (type === 'FLOOR' || type === 'DOOR' || type === 'OBSTACLE' || type === 'TREE') {
          if (this.currentDungeonStage === 1 && this.currentDungeonWorld === 1) {
              // Tutorial stone floors
              this.floorGraphics.rect(bx, by, TILE_PX, TILE_PX).fill(cols.floorLight);
              this.floorGraphics.rect(bx + 2, by + 2, TILE_PX - 4, TILE_PX - 4).fill(cols.floorDark);
          } else {
              this.floorGraphics.rect(bx, by, TILE_PX, TILE_PX).fill(floorBaseCol); 
              
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

              const texIdx = Math.floor(Math.abs(rng()) * 40);
              
              let texArray = this.mapTextures.customFloor0;
              if (biome === 1) texArray = this.mapTextures.customFloor1;
              if (biome === 2) texArray = this.mapTextures.customFloor2;
              
              if (texArray) fspr.texture = texArray[texIdx];
              fspr.x = bx + 32;
              fspr.y = by + 32;
              
              const flipX = rng() > 0.5 ? 1 : -1;
              const flipY = rng() > 0.5 ? 1 : -1;
              fspr.scale.set(flipX, flipY);
          }
        }

        if (type === 'TREE') {`;
content = content.replace(renderEnvRegex, newRenderEnv);

// 6. Fix TREE textures in renderEnvironment
const treeTexRegex = /              if \(r < 0\.2\) sprite\.texture = this\.mapTextures\.tree1;[\s\S]*?sprite\.y = by \+ 32 \+ offsetY;\n              sprite\.zIndex = sprite\.y;\n          \}/m;
const newTreeTex = `              if (biome === 1) {
                  // Magma Rocks
                  const r = Math.abs(rng());
                  if (r < 0.33) sprite.texture = this.mapTextures.rock[0];
                  else if (r < 0.66) sprite.texture = this.mapTextures.rock[1];
                  else sprite.texture = this.mapTextures.rock[2];
                  sprite.tint = 0xffffff;
              } else if (biome === 2) {
                  // Void Crystals (Tinted rocks)
                  sprite.texture = this.mapTextures.rock[2];
                  sprite.tint = 0xaa00ff;
              } else {
                  // Forest Trees
                  sprite.tint = 0xffffff;
                  const r = Math.abs(rng());
                  if (r < 0.2) sprite.texture = this.mapTextures.tree1;
                  else if (r < 0.4) sprite.texture = this.mapTextures.tree2;
                  else if (r < 0.6) sprite.texture = this.mapTextures.tree3;
                  else if (r < 0.8) sprite.texture = this.mapTextures.tree4;
                  else sprite.texture = this.mapTextures.tree5;
              }

              const scaleVariation = 0.5 + (Math.abs(rng()) * 0.35);
              const flip = rng() > 0.5 ? 1 : -1;
              
              if (biome === 1 || biome === 2) {
                 sprite.scale.set(scaleVariation * flip * 2, scaleVariation * 2); // Rocks need to be bigger
              } else {
                 sprite.scale.set(scaleVariation * flip, scaleVariation);
              }

              const offsetX = Math.floor((rng() - 0.5) * 64);
              const offsetY = Math.floor((rng() - 0.5) * 64);

              sprite.x = bx + 32 + offsetX;
              sprite.y = by + 32 + offsetY;
              sprite.zIndex = sprite.y;
          }`;
content = content.replace(treeTexRegex, newTreeTex);

// 7. Make sure DungeonGenerator generates organic rooms for all biomes (we want bubbles for magma and void too)
fs.writeFileSync('src/game/GameManager.ts', content);
console.log("Biomes reworked!");
