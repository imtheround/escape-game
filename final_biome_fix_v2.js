const fs = require('fs');
let content = fs.readFileSync('src/game/GameManager.ts', 'utf-8');

// 1. Allow 'TREE' wall generation in all biomes (World 2+ walls)
content = content.replace(
    /if \(\(!type \|\| type === 'VOID'\) && biome === 0 && this\.currentDungeonStage > 1\) \{/g,
    "if ((!type || type === 'VOID') && this.currentDungeonStage > 1) {"
);

// 2. Fix invisible obstacles by rendering them just like TREE tiles
content = content.replace(
    /if \(type === 'TREE'\) \{/g,
    "if (type === 'TREE' || type === 'OBSTACLE') {"
);

// 3. Update the obstacle/tree textures to use rocks/crystals for biome 1 and 2
const treeLogicRegex = /if \(r < 0\.2\) sprite\.texture = this\.mapTextures\.tree1;[\s\S]*?sprite\.scale\.set\(scaleVariation \* flip, scaleVariation\);/m;
const newTreeLogic = `if (biome === 1) {
                  // Magma Rocks
                  const r = Math.abs(rng());
                  if (r < 0.33) sprite.texture = this.mapTextures.rock[0];
                  else if (r < 0.66) sprite.texture = this.mapTextures.rock[1];
                  else sprite.texture = this.mapTextures.rock[2];
                  sprite.scale.set(1.5 + rng() * 0.5);
              } else if (biome === 2) {
                  // Void Crystals (Tinted rocks)
                  sprite.texture = this.mapTextures.rock[2];
                  sprite.tint = 0xaa00ff;
                  sprite.scale.set(1.5 + rng() * 0.5);
              } else {
                  // Forest Trees
                  sprite.tint = 0xffffff;
                  const r = Math.abs(rng());
                  if (r < 0.2) sprite.texture = this.mapTextures.tree1;
                  else if (r < 0.4) sprite.texture = this.mapTextures.tree2;
                  else if (r < 0.6) sprite.texture = this.mapTextures.tree3;
                  else if (r < 0.8) sprite.texture = this.mapTextures.tree4;
                  else sprite.texture = this.mapTextures.tree5;
                  sprite.scale.set(0.7 + rng() * 0.3);
              }
              
              const flip = rng() > 0.5 ? 1 : -1;
              sprite.scale.x *= flip;`;
content = content.replace(treeLogicRegex, newTreeLogic);

// 4. Double check getBiomeAt logic (Deterministic based on current world)
content = content.replace(
  /private getBiomeAt[\s\S]*?return Math\.min\(Math\.max\(0, this\.currentDungeonWorld - 1\), 2\);\n  \}/m,
  `private getBiomeAt(wx: number, wy: number): number {
    return Math.min(Math.max(0, this.currentDungeonWorld - 1), 2);
  }`
);

fs.writeFileSync('src/game/GameManager.ts', content);
console.log('Fixed rendering and biome logic!');