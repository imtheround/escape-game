const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public/assets');
const characterDir = path.join(publicDir, 'character');
const enemiesDir = path.join(publicDir, 'enemies');

[publicDir, characterDir, enemiesDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const colorMap = {
  '.': null,
  'b': '#000000', // Black
  'L': '#C2F63D', // Light green
  'M': '#71D636', // Mid green
  'D': '#35A344', // Dark green
  'p': '#FF597B', // Pink
  'e': '#2B2B2B', // Dark grey (eye bottom)
  'w': '#FFFFFF', // White
  'r': '#DC143C', // Red (hit)
  'y': '#FFD700', // Yellow/Gold
  's': '#808080', // Grey
  'h': '#8B4513', // Brown
  'd': '#228B22', // Dark Goblin Green
  'o': '#8B0000', // Dark Goblin Red
  'c': '#00FFFF', // Cyan Plasma Trims
  'u': '#0000CD', // Medium Blue Goblin Skin
  'a': '#FF4500', // OrangeRed Enemy Tracer
  '1': '#1e1e24', // Floor dark
  '2': '#25252b', // Floor light
  '3': '#333333', // Wall stone
  '4': '#444444', // Wall highlight
  '5': '#111111', // Wall shadow
  // Magma
  '6': '#2a0a04', // Magma Floor dark
  '7': '#3f1207', // Magma Floor light
  '8': '#28110b', // Magma Wall stone
  '9': '#ff4400', // Magma Wall highlight glow
  '0': '#150603', // Magma Wall shadow
  // Void
  'Q': '#0b0818', // Void Floor dark
  'W': '#131024', // Void Floor light
  'E': '#0f0a20', // Void Wall stone
  'R': '#9d00ff', // Void Wall highlight glow
  'T': '#04020a', // Void Wall shadow
};

function createSVG(grid) {
  let svg = '<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">\n';
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const char = grid[y]?.[x] || '.';
      const color = colorMap[char];
      if (color) {
        svg += `  <rect x="${x}" y="${y}" width="1" height="1" fill="${color}" />\n`;
      }
    }
  }
  svg += '</svg>';
  return svg;
}

// Frame 1: Base Rest
const f1 = [
  "................",
  "................",
  ".....bbbbbb.....",
  "...bbLLLLLLbb...",
  "..bLLLLLLLLLLb..",
  ".bLLLLbbLLbbLLb.",
  ".bLMMMbbMMbbMMLb",
  "bMMMMMbeMMbeMMMb",
  "bMMppMMMMMMppMMb",
  "bMDDDDDDDDDDDDMb",
  "bDDDDDDDDDDDDDDb",
  ".bDDDDDDDDDDDDb.",
  "..bbDDDDDDDDbb..",
  "....bbbbbbbb....",
  "................",
  "................"
];

// Frame 2: Squish Down
const f2 = [
  "................",
  "................",
  "................",
  "....bbbbbbbb....",
  "..bbLLLLLLLLbb..",
  ".bLLLLLLLLLLLLb.",
  ".bLLLLbbLLbbLLb.",
  "bLMMMMbbMMbbMMLb",
  "bMMMMMbeMMbeMMMb",
  "bMMppMMMMMMppMMb",
  "bMDDDDDDDDDDDDMb",
  "bDDDDDDDDDDDDDDb",
  ".bbDDDDDDDDDDbb.",
  "...bbbbbbbbbb...",
  "................",
  "................"
];

// Frame 3: Stretch Up
const f3 = [
  "......bbbb......",
  "....bbLLLLbb....",
  "...bLLLLLLLLb...",
  "..bLLLLLLLLLLb..",
  "..bLLLbbLLbbLLb.",
  ".bLLMMbbMMbbMMLb",
  ".bMMMMbeMMbeMMMb",
  ".bMMppMMMMppMMMb",
  ".bMDDDDDDDDDDMb.",
  ".bDDDDDDDDDDDDb.",
  "..bDDDDDDDDDDb..",
  "...bbDDDDDDbb...",
  "....bbbbbbbb....",
  "................",
  "................",
  "................"
];

// Frame 4: Airborne Base
const f4 = [
  "................",
  ".....bbbbbb.....",
  "...bbLLLLLLbb...",
  "..bLLLLLLLLLLb..",
  ".bLLLLbbLLbbLLb.",
  ".bLMMMbbMMbbMMLb",
  "bMMMMMbeMMbeMMMb",
  "bMMppMMMMMMppMMb",
  "bMDDDDDDDDDDDDMb",
  "bDDDDDDDDDDDDDDb",
  ".bDDDDDDDDDDDDb.",
  "..bbDDDDDDDDbb..",
  "....bbbbbbbb....",
  "................",
  "................",
  "................"
];

const slimeIdle1 = f1;
const slimeIdle2 = [
  "................",
  ".....bbbbbb.....",
  "...bbLLLLLLbb...",
  "..bLLLLLLLLLLb..",
  ".bLLLLbbLLbbLLb.",
  ".bLMMMbbMMbbMMLb",
  "bMMMMMbeMMbeMMMb",
  "bMMppMMMMMMppMMb",
  "bMDDDDDDDDDDDDMb",
  "bDDDDDDDDDDDDDDb",
  ".bbDDDDDDDDDDbb.",
  "..bbDDDDDDDDbb..",
  "....bbbbbbbb....",
  "................",
  "................",
  "................"
];

const slimeHit = f1.map(r => r.replace(/L|M/g, 'w').replace(/D/g, 'r'));
const slimeAttack = f1; // Can keep it same or update

const goblinIdle = [
  "................",
  "................",
  "................",
  "................",
  "......dd........",
  ".....dddd.......",
  "....rrrrrr......",
  "...rrrrrrrr.....",
  "...rwrbrwrr.....",
  "...rwrbrwrr.....",
  "...rrrrrrrr.....",
  "....oooooo......",
  ".....oooo.......",
  "................",
  "................",
  "................"
];

const bBase = [
  "................",
  "................",
  "................",
  "................",
  "......dd........",
  ".....dddd.......",
  "....rrrrrr......",
  "...rrrrrrrr.....",
  "...rwrbrwrr.....",
  "...rrrrrrrr.....",
  "....oooooo......",
  ".....oooo.......",
  "................",
  "................",
  "................",
  "................"
];
const gr1 = bBase;
const gr2 = [bBase[0], ...bBase.slice(0, 15)];
const gr3 = bBase;
const gr4 = [...bBase.slice(1, 16), bBase[0]];

const gd1 = bBase.map(r => r.replace(/d/g, 'r').replace(/w/g, 'r'));
const gd2 = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......dd........",
  ".....dddd.......",
  "....rrrrrr......",
  "...rrrrrrrr.....",
  "..rrrrrrrrrr....",
  "...oooooooo.....",
  "................",
  "................",
  "................"
];
const gd3 = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  ".....d.dd.......",
  "....ddrddr......",
  "...rrrrrrrr.....",
  "..rooobbooor....",
  "................"
];

const bBlue = bBase.map(r => r.replace(/d/g, 'u').replace(/o/g, 'y'));
const grB1 = bBlue;
const grB2 = [bBlue[0], ...bBlue.slice(0, 15)];
const grB3 = bBlue;
const grB4 = [...bBlue.slice(1, 16), bBlue[0]];

const gdB1 = bBlue.map(r => r.replace(/u/g, 'r').replace(/w/g, 'r'));
const gdB2 = gd2.map(r => r.replace(/d/g, 'u').replace(/o/g, 'y'));
const gdB3 = gd3.map(r => r.replace(/d/g, 'u').replace(/o/g, 'y'));

const ebulletFrame = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  ".......aa.......",
  "......aaaa......",
  "......aaaa......",
  ".......aa.......",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................"
];

const gun1 = [
  "................",
  "................",
  "................",
  "................",
  "................",
  ".......ssss.....",
  "......ssbbbb....",
  "......ssbbbb....",
  "......bb........",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................"
];

const longKnife = [
  "..............ss",
  ".............sss",
  "............sss.",
  "...........sss..",
  "..........sss...",
  ".........sss....",
  "........sss.....",
  ".......sss......",
  "......sss.......",
  ".....sss........",
  "....hy..........",
  "...hhy..........",
  "..hhy...........",
  ".hhy............",
  "hh..............",
  "................"
];

const machineGun = [
  "................",
  "................",
  "................",
  "...ssssssssss...",
  "...sbbsssssssc..",
  "....bb...s......",
  "....b...........",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................"
];

const shotgun = [
  "................",
  "................",
  "................",
  "...sssssss......",
  "...sbbsshs......",
  "....bb..........",
  "....b...........",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................"
];

const bulletFrame = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  ".....wwwwww.....",
  ".....wwwwww.....",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................"
];

const knifeSwing = [
  "................",
  "......wwww......",
  "....www..www....",
  "...ww......ww...",
  "..ww........ww..",
  ".ww..........ww.",
  ".w............w.",
  "w..............w",
  "w..............w",
  ".w............w.",
  ".ww..........ww.",
  "..ww........ww..",
  "...ww......ww...",
  "....www..www....",
  "......wwww......",
  "................"
];

const mgBullet = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "......yyyy......",
  "......yyyy......",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................"
];

const shotgunPellet = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  ".......ss.......",
  ".......ss.......",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................"
];

fs.writeFileSync(path.join(characterDir, 'slime_idle1.svg'), createSVG(slimeIdle1));
fs.writeFileSync(path.join(characterDir, 'slime_idle2.svg'), createSVG(slimeIdle2));
fs.writeFileSync(path.join(characterDir, 'slime_walk1.svg'), createSVG(f1));
fs.writeFileSync(path.join(characterDir, 'slime_walk2.svg'), createSVG(f2));
fs.writeFileSync(path.join(characterDir, 'slime_walk3.svg'), createSVG(f3));
const roll_f1 = [
  "................",
  "................",
  "................",
  "....bbbbbbbb....",
  "..bbLLLLLLLLbb..",
  ".bLLLLLLLLLLLLb.",
  ".bLLLLbbLLbbLLb.",
  "bLMMMMbbMMbbMMLb",
  "bMMMMMbeMMbeMMMb",
  "bMMppMMMMMMppMMb",
  "bMDDDDDDDDDDDDMb",
  "bDDDDDDDDDDDDDDb",
  ".bbDDDDDDDDDDbb.",
  "...bbbbbbbbbb...",
  "................",
  "................"
];
const roll_f2 = [
  "......bbbb......",
  "....bbLLLLbb....",
  "...bLLLLLLLLb...",
  "..bLLLLLLLLLLb..",
  "..bLLMMMMMMMMLb.",
  ".bLMMbbLLbbMMLb.",
  ".bMMMbbMMbbMMMb.",
  ".bMMMbeMMbeMMMb.",
  ".bMDDMMMMMMDDMb.",
  ".bDDppDDDDppDDb.",
  "..bDDDDDDDDDDb..",
  "...bbDDDDDDbb...",
  "....bbbbbbbb....",
  "................",
  "................",
  "................"
];
const roll_f3 = [
  "................",
  "....bbbbbbbb....",
  "..bbLLLLLLLLbb..",
  ".bLLLLLLLLLLLLb.",
  ".bLMMMMMMMMMMLb.",
  "bMMMMMMMMMMMMMMb",
  "bMMMMMMMMMMMMMMb",
  "bMDDDDDDDDDDDDMb",
  "bMDDbbDDDDbbDDMb",
  "bDDDbeDDDDbeDDDb",
  ".bDDppDDDDppDDb.",
  "..bbDDDDDDDDbb..",
  "....bbbbbbbb....",
  "................",
  "................",
  "................"
];
const roll_f4 = [
  "................",
  "....bbbbbbbb....",
  "..bbLLLLLLLLbb..",
  ".bLLLLLLLLLLLLb.",
  ".bLMMMMMMMMMMLb.",
  "bLMMMMMMMMMMMMLb",
  "bMMMMMMMMMMMMMMb",
  "bMMMMMMMMMMMMMMb",
  "bMDDDDDDDDDDDDMb",
  "bDDDDDDDDDDDDDDb",
  ".bDDDDDDDDDDDDb.",
  "..bbDDDDDDDDbb..",
  "....bbbbbbbb....",
  "................",
  "................",
  "................"
];
const roll_f5 = [
  "................",
  "....bbbbbbbb....",
  "..bbLLLLLLLLbb..",
  ".bLLppLLLLppLLb.",
  ".bLLebLLLLebLLb.",
  "bLMMbbMMMMbbMMLb",
  "bLMMMMMMMMMMMMLb",
  "bMMMMMMMMMMMMMMb",
  "bMMMMMMMMMMMMMMb",
  "bMDDDDDDDDDDDDMb",
  "bDDDDDDDDDDDDDDb",
  ".bDDDDDDDDDDDDb.",
  "..bbDDDDDDDDbb..",
  "....bbbbbbbb....",
  "................",
  "................"
];
const roll_f6 = [
  "......bbbb......",
  "....bbLLLLbb....",
  "...bLLLLLLLLb...",
  "..bLLLLLLLLLLb..",
  "..bLLLbbLLbbLLb.",
  ".bLLMMbbMMbbMMLb",
  ".bMMMMbeMMbeMMMb",
  ".bMMppMMMMppMMMb",
  ".bMDDDDDDDDDDMb.",
  ".bDDDDDDDDDDDDb.",
  "..bDDDDDDDDDDb..",
  "...bbDDDDDDbb...",
  "....bbbbbbbb....",
  "................",
  "................",
  "................"
];
const roll_f7 = roll_f1;

fs.writeFileSync(path.join(characterDir, 'slime_walk4.svg'), createSVG(f4));
fs.writeFileSync(path.join(characterDir, 'slime_hit.svg'), createSVG(slimeHit));
fs.writeFileSync(path.join(characterDir, 'slime_attack.svg'), createSVG(slimeAttack));
fs.writeFileSync(path.join(characterDir, 'slime_roll1.svg'), createSVG(roll_f1));
fs.writeFileSync(path.join(characterDir, 'slime_roll2.svg'), createSVG(roll_f2));
fs.writeFileSync(path.join(characterDir, 'slime_roll3.svg'), createSVG(roll_f3));
fs.writeFileSync(path.join(characterDir, 'slime_roll4.svg'), createSVG(roll_f4));
fs.writeFileSync(path.join(characterDir, 'slime_roll5.svg'), createSVG(roll_f5));
fs.writeFileSync(path.join(characterDir, 'slime_roll6.svg'), createSVG(roll_f6));
fs.writeFileSync(path.join(characterDir, 'slime_roll7.svg'), createSVG(roll_f7));

fs.writeFileSync(path.join(enemiesDir, 'goblin_idle.svg'), createSVG(goblinIdle));
fs.writeFileSync(path.join(enemiesDir, 'goblin_run1.svg'), createSVG(gr1));
fs.writeFileSync(path.join(enemiesDir, 'goblin_run2.svg'), createSVG(gr2));
fs.writeFileSync(path.join(enemiesDir, 'goblin_run3.svg'), createSVG(gr3));
fs.writeFileSync(path.join(enemiesDir, 'goblin_run4.svg'), createSVG(gr4));
fs.writeFileSync(path.join(enemiesDir, 'goblin_dead1.svg'), createSVG(gd1));
fs.writeFileSync(path.join(enemiesDir, 'goblin_dead2.svg'), createSVG(gd2));
fs.writeFileSync(path.join(enemiesDir, 'goblin_dead3.svg'), createSVG(gd3));

fs.writeFileSync(path.join(enemiesDir, 'goblin_blue_run1.svg'), createSVG(grB1));
fs.writeFileSync(path.join(enemiesDir, 'goblin_blue_run2.svg'), createSVG(grB2));
fs.writeFileSync(path.join(enemiesDir, 'goblin_blue_run3.svg'), createSVG(grB3));
fs.writeFileSync(path.join(enemiesDir, 'goblin_blue_run4.svg'), createSVG(grB4));
fs.writeFileSync(path.join(enemiesDir, 'goblin_blue_dead1.svg'), createSVG(gdB1));
fs.writeFileSync(path.join(enemiesDir, 'goblin_blue_dead2.svg'), createSVG(gdB2));
fs.writeFileSync(path.join(enemiesDir, 'goblin_blue_dead3.svg'), createSVG(gdB3));

fs.writeFileSync(path.join(characterDir, 'gun1.svg'), createSVG(gun1));
fs.writeFileSync(path.join(characterDir, 'sword.svg'), createSVG(longKnife));
fs.writeFileSync(path.join(characterDir, 'machine_gun.svg'), createSVG(machineGun));
fs.writeFileSync(path.join(characterDir, 'shotgun.svg'), createSVG(shotgun));

fs.writeFileSync(path.join(characterDir, 'bullet.svg'), createSVG(bulletFrame));
fs.writeFileSync(path.join(characterDir, 'ebullet.svg'), createSVG(ebulletFrame));
fs.writeFileSync(path.join(characterDir, 'knife_swing.svg'), createSVG(knifeSwing));
fs.writeFileSync(path.join(characterDir, 'mg_bullet.svg'), createSVG(mgBullet));
fs.writeFileSync(path.join(characterDir, 'shotgun_pellet.svg'), createSVG(shotgunPellet));

// Map Geometry
const mapDir = path.join(publicDir, 'map');
if (!fs.existsSync(mapDir)) fs.mkdirSync(mapDir, { recursive: true });

const floorGrid = [
  "1111111111111111",
  "1211111111111211",
  "1111111112111111",
  "1111211111111111",
  "1111111111111112",
  "1111111211111111",
  "1121111111111111",
  "1111111111112111",
  "1111111111111111",
  "1211111211111111",
  "1111111111111111",
  "1111111111121111",
  "1111211111111111",
  "1111111111111111",
  "1111111211111121",
  "1111111111111111"
];

const wall_h = [
  "................",
  "................",
  "................",
  "3333333333333333",
  "4444444444444444",
  "4444444444444444",
  "3333333333333333",
  "5555555555555555",
  "5555555555555555",
  "5555555555555555",
  "1111111111111111",
  "................",
  "................",
  "................",
  "................",
  "................"
];

const wall_v = [
  "...34435551.....",
  "...34435551.....",
  "...34435551.....",
  "...34435551.....",
  "...34435551.....",
  "...34435551.....",
  "...34435551.....",
  "...34435551.....",
  "...34435551.....",
  "...34435551.....",
  "...34435551.....",
  "...34435551.....",
  "...34435551.....",
  "...34435551.....",
  "...34435551.....",
  "...34435551....."
];

const fenceGrid = [
  "................",
  "................",
  "..hh.hh..hh.hh..",
  "..hh.hh..hh.hh..",
  "hhhhhhhhhhhhhhhh",
  "hhhhhhhhhhhhhhhh",
  "..ss.ss..ss.ss..",
  "..hh.hh..hh.hh..",
  "..hh.hh..hh.hh..",
  "hhhhhhhhhhhhhhhh",
  "hhhhhhhhhhhhhhhh",
  "..ss.ss..ss.ss..",
  "..hh.hh..hh.hh..",
  "..hh.hh..hh.hh..",
  "................",
  "................"
];

fs.writeFileSync(path.join(mapDir, 'floor.svg'), createSVG(floorGrid));
fs.writeFileSync(path.join(mapDir, 'wall_h.svg'), createSVG(wall_h));
fs.writeFileSync(path.join(mapDir, 'wall_v.svg'), createSVG(wall_v));
fs.writeFileSync(path.join(mapDir, 'fence.svg'), createSVG(fenceGrid));

const rockGrid = [
  "   444444   ",
  "  44333344  ",
  " 4432222344 ",
  " 4322222234 ",
  " 3333333333 ",
  "311111111113",
  "311111111113",
  "355511115553",
  " 3355555533 ",
  "  33333333  ",
  "            ",
  "            ",
  "            ",
  "            ",
  "            ",
  "            "
];
fs.writeFileSync(path.join(mapDir, 'rock.svg'), createSVG(rockGrid));

// Biome Tiling Generators
const floorGrid_magma = floorGrid.map(r => r.replace(/1/g, '6').replace(/2/g, '7'));
const wall_h_magma = wall_h.map(r => r.replace(/3/g, '8').replace(/4/g, '9').replace(/5/g, '0'));
const wall_v_magma = wall_v.map(r => r.replace(/3/g, '8').replace(/4/g, '9').replace(/5/g, '0'));
const rockGrid_magma = rockGrid.map(r => r.replace(/4/g, '9').replace(/3/g, '8').replace(/2/g, '7').replace(/1/g, '6'));

const floorGrid_void = floorGrid.map(r => r.replace(/1/g, 'Q').replace(/2/g, 'W'));
const wall_h_void = wall_h.map(r => r.replace(/3/g, 'E').replace(/4/g, 'R').replace(/5/g, 'T'));
const wall_v_void = wall_v.map(r => r.replace(/3/g, 'E').replace(/4/g, 'R').replace(/5/g, 'T'));
const rockGrid_void = rockGrid.map(r => r.replace(/4/g, 'R').replace(/3/g, 'E').replace(/2/g, 'W').replace(/1/g, 'Q'));

fs.writeFileSync(path.join(mapDir, 'floor_magma.svg'), createSVG(floorGrid_magma));
fs.writeFileSync(path.join(mapDir, 'wall_h_magma.svg'), createSVG(wall_h_magma));
fs.writeFileSync(path.join(mapDir, 'wall_v_magma.svg'), createSVG(wall_v_magma));
fs.writeFileSync(path.join(mapDir, 'rock_magma.svg'), createSVG(rockGrid_magma));

fs.writeFileSync(path.join(mapDir, 'floor_void.svg'), createSVG(floorGrid_void));
fs.writeFileSync(path.join(mapDir, 'wall_h_void.svg'), createSVG(wall_h_void));
fs.writeFileSync(path.join(mapDir, 'wall_v_void.svg'), createSVG(wall_v_void));
fs.writeFileSync(path.join(mapDir, 'rock_void.svg'), createSVG(rockGrid_void));

// Dungeon Decor & Props
const crateGrid = [
  "   hhhhhhhh   ",
  "  hyyyyyyyyh  ",
  "  hyyyyyyyyh  ",
  "  hhhhhhhhhh  ",
  "  hs      sh  ",
  "  h s    s h  ",
  "  h  ssss  h  ",
  "  h  ssss  h  ",
  "  h s    s h  ",
  "  hs      sh  ",
  "  hhhhhhhhhh  ",
  "              ",
  "              ",
  "              ",
  "              ",
  "              "
];
fs.writeFileSync(path.join(mapDir, 'crate.svg'), createSVG(crateGrid));

const bonesGrid = [
  "   s    s   ",
  "   ssssss   ",
  "   s    s   ",
  "    s  s    ",
  "     ss     ",
  "    s  s    ",
  "   s    s   ",
  "   ssssss   ",
  "   s    s   "
];
fs.writeFileSync(path.join(mapDir, 'bones.svg'), createSVG(bonesGrid));

const webGrid = [
  "ww        ww",
  " wwww  wwww ",
  "  w ww w w  ",
  "   w w w    ",
  "   w.ww.w   ",
  "   ww..ww   ",
  "  w .... w  ",
  " w  ....  w ",
  "w          w"
];
fs.writeFileSync(path.join(mapDir, 'web.svg'), createSVG(webGrid));

const merchantGrid = [
  "   3333   ",
  "  333333  ",
  " 33----33 ",
  " 3------3 ",
  " 3u----u3 ",
  " 3u----u3 ",
  " 33----33 ",
  " 33333333 ",
  "  333333  ",
  "   3333   "
];
fs.writeFileSync(path.join(characterDir, 'merchant.svg'), createSVG(merchantGrid));

const portalGrid = [
  "   cccccc   ",
  "  cccccccc  ",
  " cccuwwuccc ",
  " ccuwwwwucc ",
  " ccuwyywucc ",
  " ccuwyywucc ",
  " ccuwwwwucc ",
  " cccuwwuccc ",
  "  cccccccc  ",
  "   cccccc   "
];
fs.writeFileSync(path.join(mapDir, 'portal.svg'), createSVG(portalGrid));

// =============================================
// OPEN-WORLD ENEMY SPRITES
// =============================================

// --- GOBLIN BRUTE (Big, bulky, darker red-brown) ---
const bruteColorMap = { 'B': '#8B0000', 'R': '#A52A2A', 'H': '#5C3317', 'F': '#CD853F' };
Object.assign(colorMap, { 'B': '#8B0000', 'R': '#A52A2A', 'H': '#5C3317', 'F': '#CD853F', 'G': '#556B2F', 'P': '#9932CC', 'V': '#4B0082', 'N': '#2F0047', 'I': '#FF6600', 'J': '#FF9900', 'K': '#CC3300', 'X': '#555555', 'Z': '#777777', 'A': '#999999' });

const bruteIdle = [
  "................",
  "................",
  "................",
  ".....HHHH.......",
  "....HHHHHH......",
  "...HHRRHHRH.....",
  "...HRwbRwbH.....",
  "..HRRRRRRRH.....",
  "..HHBBBBHH......",
  "..HRRRRRRH......",
  "..HRRRRRRH......",
  "...HRRRRH.......",
  "...HRRRRH.......",
  "....HHHH........",
  "................",
  "................"
];
const bruteRun1 = bruteIdle;
const bruteRun2 = [bruteIdle[0], ...bruteIdle.slice(0, 15)];
const bruteRun3 = bruteIdle;
const bruteRun4 = [...bruteIdle.slice(1, 16), bruteIdle[0]];
const bruteDead1 = bruteIdle.map(r => r.replace(/H/g, 'r').replace(/R/g, 'r'));
const bruteDead2 = [
  "................", "................", "................", "................",
  "................", "................", "................", "......HH........",
  ".....HHHH.......", "....RRRRRR......", "...RRRRRRRR.....", "..RRRRRRRRRR....",
  "...HHHHHHHH.....", "................", "................", "................"
];
const bruteDead3 = [
  "................", "................", "................", "................",
  "................", "................", "................", "................",
  "................", "................", "................", ".....H.HH.......",
  "....HHRHHH......", "...RRRRRRRR.....", "..RHHHBBHHHH....", "................"
];
const bruteSlamFrame = [
  "................", "................", "................", ".....HHHH.......",
  "....HHHHHH......", "...HHRRHHRH.....", "...HRwbRwbH.....", "..HRRRRRRRH.....",
  "..HHBBBBHH......", "..HRRRRRRH......", "..HRRRRRRH......", "..HRRRRRRH......",
  "..HRRRRRRH......", "..HHHHHHHH......", "....HHHH........", "................"
];

fs.writeFileSync(path.join(enemiesDir, 'brute_idle.svg'), createSVG(bruteIdle));
fs.writeFileSync(path.join(enemiesDir, 'brute_run1.svg'), createSVG(bruteRun1));
fs.writeFileSync(path.join(enemiesDir, 'brute_run2.svg'), createSVG(bruteRun2));
fs.writeFileSync(path.join(enemiesDir, 'brute_run3.svg'), createSVG(bruteRun3));
fs.writeFileSync(path.join(enemiesDir, 'brute_run4.svg'), createSVG(bruteRun4));
fs.writeFileSync(path.join(enemiesDir, 'brute_dead1.svg'), createSVG(bruteDead1));
fs.writeFileSync(path.join(enemiesDir, 'brute_dead2.svg'), createSVG(bruteDead2));
fs.writeFileSync(path.join(enemiesDir, 'brute_dead3.svg'), createSVG(bruteDead3));
fs.writeFileSync(path.join(enemiesDir, 'brute_slam.svg'), createSVG(bruteSlamFrame));

// --- GOBLIN SHAMAN (Purple robes, staff) ---
const shamanIdle = [
  "................",
  ".......yy.......",
  "......yyyy......",
  ".....PPPPPP.....",
  "....PPPPPPPP....",
  "...PPwbPPwbPP...",
  "...PPPPPPPPPP...",
  "...PPVVVVVVPP...",
  "....PPPPPPPP....",
  "....PPPPPPPP....",
  "...PPPPPPPPPP...",
  "...PPPPPPPPPP...",
  "....PP....PP....",
  "....PP....PP....",
  "................",
  "................"
];
const shamanRun1 = shamanIdle;
const shamanRun2 = [shamanIdle[0], ...shamanIdle.slice(0, 15)];
const shamanRun3 = shamanIdle;
const shamanRun4 = [...shamanIdle.slice(1, 16), shamanIdle[0]];
const shamanDead1 = shamanIdle.map(r => r.replace(/P/g, 'r').replace(/V/g, 'r'));
const shamanDead2 = [
  "................", "................", "................", "................",
  "................", "................", "................", ".......PP.......",
  "......PPPP......", "....PPPPPPPP....", "...PPPPPPPPPP...", "..PPPPPPPPPPPP..",
  "...VVVVVVVVVV...", "................", "................", "................"
];
const shamanDead3 = [
  "................", "................", "................", "................",
  "................", "................", "................", "................",
  "................", "................", "................", ".....P.PP.......",
  "....PPVPPP......", "...PPPPPPPP.....", "..PVVVBBVVVP....", "................"
];
const shamanCastFrame = [
  "................", "..yyyy..........", "..yyyy..........", ".....PPPPPP.....",
  "....PPPPPPPP....", "...PPwbPPwbPP...", "...PPPPPPPPPP...", "...PPVVVVVVPP...",
  "yyy.PPPPPPPP....", "yyyy.PPPPPPP....", "...PPPPPPPPPP...", "...PPPPPPPPPP...",
  "....PP....PP....", "....PP....PP....", "................", "................"
];

fs.writeFileSync(path.join(enemiesDir, 'shaman_idle.svg'), createSVG(shamanIdle));
fs.writeFileSync(path.join(enemiesDir, 'shaman_run1.svg'), createSVG(shamanRun1));
fs.writeFileSync(path.join(enemiesDir, 'shaman_run2.svg'), createSVG(shamanRun2));
fs.writeFileSync(path.join(enemiesDir, 'shaman_run3.svg'), createSVG(shamanRun3));
fs.writeFileSync(path.join(enemiesDir, 'shaman_run4.svg'), createSVG(shamanRun4));
fs.writeFileSync(path.join(enemiesDir, 'shaman_dead1.svg'), createSVG(shamanDead1));
fs.writeFileSync(path.join(enemiesDir, 'shaman_dead2.svg'), createSVG(shamanDead2));
fs.writeFileSync(path.join(enemiesDir, 'shaman_dead3.svg'), createSVG(shamanDead3));
fs.writeFileSync(path.join(enemiesDir, 'shaman_cast.svg'), createSVG(shamanCastFrame));

// --- MAGMA ELEMENTAL (Orange/Red/Yellow fiery creature) ---
const magmaRun1 = [
  "................", "................", "................", ".....IIII.......",
  "....IIJJJI......", "...IIJJJJJI.....", "...IJJKKJJI.....", "..IJJKKKJJI.....",
  "..IJJJJJJJI.....", "..IKKIIIIKKI....", "...IIJJJJII.....", "....IIJJII......",
  ".....IIII.......", "................", "................", "................"
];
const magmaRun2 = [magmaRun1[0], ...magmaRun1.slice(0, 15)];
const magmaRun3 = magmaRun1;
const magmaRun4 = [...magmaRun1.slice(1, 16), magmaRun1[0]];
const magmaDead1 = magmaRun1.map(r => r.replace(/J/g, 's').replace(/I/g, 's').replace(/K/g, 'r'));
const magmaDead2 = [
  "................", "................", "................", "................",
  "................", "................", "................", ".....III........",
  "....IIJJI.......", "...IJJJJJI......", "..IJJJJJJJI.....", "..IKKKKKKKI.....",
  "...IIIIIII......", "................", "................", "................"
];
const magmaDead3 = [
  "................", "................", "................", "................",
  "................", "................", "................", "................",
  "................", "................", ".....I.II.......", "....IIKII.......",
  "...IJJJJJI......", "..IKKKKKKKI.....", "................", "................"
];

fs.writeFileSync(path.join(enemiesDir, 'magma_run1.svg'), createSVG(magmaRun1));
fs.writeFileSync(path.join(enemiesDir, 'magma_run2.svg'), createSVG(magmaRun2));
fs.writeFileSync(path.join(enemiesDir, 'magma_run3.svg'), createSVG(magmaRun3));
fs.writeFileSync(path.join(enemiesDir, 'magma_run4.svg'), createSVG(magmaRun4));
fs.writeFileSync(path.join(enemiesDir, 'magma_dead1.svg'), createSVG(magmaDead1));
fs.writeFileSync(path.join(enemiesDir, 'magma_dead2.svg'), createSVG(magmaDead2));
fs.writeFileSync(path.join(enemiesDir, 'magma_dead3.svg'), createSVG(magmaDead3));

// --- VOID WRAITH (Dark purple/indigo ghostly) ---
const wraithRun1 = [
  "................", "................", "................", "......NNNN......",
  ".....NNVVNN.....", "....NVVVVVVN....", "....NVwVVwVN....", "....NVVVVVVN....",
  ".....NNNNNN.....", "....NVVVVVVN....", "...NVVVVVVVVN...", "..NV..VVVV..VN..",
  "..N....VV....N..", "........VV......", ".........VV.....", "................"
];
const wraithRun2 = [
  "................", "................", "......NNNN......", ".....NNVVNN.....",
  "....NVVVVVVN....", "....NVwVVwVN....", "....NVVVVVVN....", ".....NNNNNN.....",
  "....NVVVVVVN....", "...NVVVVVVVVN...", "..NV..VVVV..VN..", "..N....VV....N..",
  "........VV......", ".........V......", "................", "................"
];
const wraithRun3 = wraithRun1;
const wraithRun4 = [
  "................", "................", "................", "......NNNN......",
  ".....NNVVNN.....", "....NVVVVVVN....", "....NVwVVwVN....", "....NVVVVVVN....",
  ".....NNNNNN.....", "....NVVVVVVN....", "...NVVVVVVVVN...", "...NV.VVVV.VN...",
  "....N..VV..N....", ".......VV.......", "......VV........", "................"
];
const wraithDead1 = wraithRun1.map(r => r.replace(/V/g, 's').replace(/N/g, '5'));
const wraithDead2 = [
  "................", "................", "................", "................",
  "................", "................", "................", "......NN........",
  ".....NNVN.......", "....NVVVVN......", "...NVVVVVVN.....", "..NVVVVVVVVN....",
  "...NNNNNNNN.....", "................", "................", "................"
];
const wraithDead3 = [
  "................", "................", "................", "................",
  "................", "................", "................", "................",
  "................", "................", "................", ".....N.NN.......",
  "....NNVNN.......", "...NVVVVVN......", "..NNNNNNNNN.....", "................"
];

fs.writeFileSync(path.join(enemiesDir, 'wraith_run1.svg'), createSVG(wraithRun1));
fs.writeFileSync(path.join(enemiesDir, 'wraith_run2.svg'), createSVG(wraithRun2));
fs.writeFileSync(path.join(enemiesDir, 'wraith_run3.svg'), createSVG(wraithRun3));
fs.writeFileSync(path.join(enemiesDir, 'wraith_run4.svg'), createSVG(wraithRun4));
fs.writeFileSync(path.join(enemiesDir, 'wraith_dead1.svg'), createSVG(wraithDead1));
fs.writeFileSync(path.join(enemiesDir, 'wraith_dead2.svg'), createSVG(wraithDead2));
fs.writeFileSync(path.join(enemiesDir, 'wraith_dead3.svg'), createSVG(wraithDead3));

// --- GOLEM (Large, rocky, grey/brown) ---
const golemIdle = [
  "................",
  "....XXXXXX......",
  "...XZZZZZZX.....",
  "..XZZAZZAZX.....",
  "..XZZwZZwZZX....",
  "..XZZZZZZZX.....",
  "..XXAAAAAXXX....",
  ".XZZZZZZZZZZX...",
  ".XZZZZZZZZZZX...",
  "XZZZZZZZZZZZX...",
  "XZZZXZZZZXZZX...",
  ".XZZXZZZZXZX....",
  ".XZZXXXXXXZX....",
  "..XX......XX....",
  "..XX......XX....",
  "................"
];
const golemRun1 = golemIdle;
const golemRun2 = [golemIdle[0], ...golemIdle.slice(0, 15)];
const golemRun3 = golemIdle;
const golemRun4 = [...golemIdle.slice(1, 16), golemIdle[0]];
const golemDead1 = golemIdle.map(r => r.replace(/Z/g, 's').replace(/A/g, 's'));
const golemDead2 = [
  "................", "................", "................", "................",
  "................", "................", "......XX........", ".....XZZX.......",
  "....XZZZZX......", "...XZZZZZZX.....", "..XZZZZZZZZX....", "..XAAAAAAAAX....",
  "..XXXXXXXXXX....", "................", "................", "................"
];
const golemDead3 = [
  "................", "................", "................", "................",
  "................", "................", "................", "................",
  "................", "................", ".....X.XX.......", "....XXZXX.......",
  "...XZZZZZZX.....", "..XAAAAAAAAX....", "..XXXXXXXXXX....", "................"
];

fs.writeFileSync(path.join(enemiesDir, 'golem_idle.svg'), createSVG(golemIdle));
fs.writeFileSync(path.join(enemiesDir, 'golem_run1.svg'), createSVG(golemRun1));
fs.writeFileSync(path.join(enemiesDir, 'golem_run2.svg'), createSVG(golemRun2));
fs.writeFileSync(path.join(enemiesDir, 'golem_run3.svg'), createSVG(golemRun3));
fs.writeFileSync(path.join(enemiesDir, 'golem_run4.svg'), createSVG(golemRun4));
fs.writeFileSync(path.join(enemiesDir, 'golem_dead1.svg'), createSVG(golemDead1));
fs.writeFileSync(path.join(enemiesDir, 'golem_dead2.svg'), createSVG(golemDead2));
fs.writeFileSync(path.join(enemiesDir, 'golem_dead3.svg'), createSVG(golemDead3));

// =============================================
// TERRAIN DECORATION SPRITES
// =============================================

const tree1Grid = [
  "......MMMM......",
  ".....MMMMMM.....",
  "....MMMMMMMM....",
  "...MMMMDDMMMM...",
  "..MMMMDDDMMMMM..",
  "..MMMMDDMMMMMM..",
  "...MMMMMMMMMM...",
  "....MMMMMMMM....",
  ".....MMMMM......",
  "......hhhh......",
  "......hhhh......",
  "......hhhh......",
  "................",
  "................",
  "................",
  "................"
];
const tree2Grid = [
  ".....DDDDD......",
  "....DMMMMMD.....",
  "...DMMMMMMD.....",
  "..DMMMMMMMD.....",
  "..DMMDDMMMMD....",
  "...DMDDMMMD.....",
  "....DMMMD.......",
  ".....DDD........",
  "......hh........",
  "......hh........",
  "......hh........",
  "................",
  "................",
  "................",
  "................",
  "................"
];

const waterGrid = [
  "cccccccccccccccc",
  "cuuccccccccuuccc",
  "ccccccuucccccccc",
  "cccccccccccccccc",
  "ccuucccccccuuccc",
  "cccccccccccccccc",
  "ccccccuucccccccc",
  "ccccccccccccccuc",
  "cuuccccccccuuccc",
  "cccccccccccccccc",
  "ccccuucccccccccc",
  "ccccccccccuucccc",
  "cccccccccccccccc",
  "cuuccccccccuuccc",
  "ccccccuucccccccc",
  "cccccccccccccccc"
];

const lavaGrid = [
  "KKKKKKKKKKKKKKKK",
  "KIIKKKKKKKKIIKKK",
  "KKKKKKIIKKKKKKKK",
  "KKKKKKKKKKKKKKKK",
  "KKIIKKKKKKKIIKKK",
  "JJJJJJJJJJJJJJJJ",
  "KKKKKKIIKKKKKKKK",
  "KKKKKKKKKKKKKKKK",
  "KIIKKKKKKKKIIKKK",
  "KKKKKKKKKKKKKKKK",
  "KKKKIIKKKKKKKKKK",
  "JJJJJJJJJJJJJJJJ",
  "KKKKKKKKKKKKKKKK",
  "KIIKKKKKKKKIIKKK",
  "KKKKKKIIKKKKKKKK",
  "KKKKKKKKKKKKKKKK"
];

const fireTrailGrid = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "......II........",
  ".....IJJI.......",
  ".....IJJI.......",
  "......II........",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................"
];

const telegraphGrid = [
  "................",
  "....rrrrrr......",
  "..rr......rr....",
  ".r..........r...",
  ".r..........r...",
  "r............r..",
  "r............r..",
  "r............r..",
  "r............r..",
  "r............r..",
  ".r..........r...",
  ".r..........r...",
  "..rr......rr....",
  "....rrrrrr......",
  "................",
  "................"
];

fs.writeFileSync(path.join(mapDir, 'tree1.svg'), createSVG(tree1Grid));
fs.writeFileSync(path.join(mapDir, 'tree2.svg'), createSVG(tree2Grid));
fs.writeFileSync(path.join(mapDir, 'water.svg'), createSVG(waterGrid));
fs.writeFileSync(path.join(mapDir, 'lava.svg'), createSVG(lavaGrid));
fs.writeFileSync(path.join(mapDir, 'fire_trail.svg'), createSVG(fireTrailGrid));
fs.writeFileSync(path.join(mapDir, 'telegraph.svg'), createSVG(telegraphGrid));

// --- NEW ARTIFACTS & EXPLORATION ASSETS ---
const relicPlainsGrid = [
  "................",
  ".......yy.......",
  "......yyyy......",
  ".....yywyyy.....",
  "....yyyyywyy....",
  "...yyLyyyLyyy...",
  "..yyyLLyyLLyyy..",
  "..yywwLLLLwwyy..",
  "..yyyLLyyLLyyy..",
  "...yyLyyyLyyy...",
  "....yyyyywyy....",
  ".....yywyyy.....",
  "......yyyy......",
  ".......yy.......",
  "................",
  "................"
];
const relicMagmaGrid = relicPlainsGrid.map(r => r.replace(/y/g, 'I').replace(/L/g, 'a').replace(/w/g, 'r'));
const relicVoidGrid = relicPlainsGrid.map(r => r.replace(/y/g, 'R').replace(/L/g, 'E').replace(/w/g, 'P'));

const shrineFloorGrid = [
  "4333333333333334",
  "3111111111111113",
  "3111111111111113",
  "3112211111122113",
  "3112211111122113",
  "3111111111111113",
  "3111112222111113",
  "3111112222111113",
  "3111112222111113",
  "3111112222111113",
  "3111111111111113",
  "3112211111122113",
  "3112211111122113",
  "3111111111111113",
  "3111111111111113",
  "4333333333333334"
];

const shrinePillarGrid = [
  "   33333333   ",
  "  3444444443  ",
  "  3433333343  ",
  "   35555553   ",
  "   35333353   ",
  "   35333353   ",
  "   35333353   ",
  "   35333353   ",
  "   35333353   ",
  "   35333353   ",
  "   35333353   ",
  "   35555553   ",
  "  3433333343  ",
  "  3444444443  ",
  "   33333333   ",
  "              "
];

const compassArrowGrid = [
  ".......y........",
  "......yyy.......",
  ".....ywywy......",
  "....ywwywwy.....",
  "...ywwwwwwwy....",
  "....ywwywwy.....",
  ".....ywywy......",
  "......yyy.......",
  ".......y........",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................"
];

const merchantTentGrid = [
  "       bb       ",
  "      bwwb      ",
  "     bwwwpb     ",
  "    bwwpwppb    ",
  "   bwwpwppppb   ",
  "  bwppwppppppb  ",
  " bpppwwpppppppb ",
  "bpppppwppppppppb",
  "hbbbbbbbbbbbbbbh",
  "h h h u uu h h h",
  "h h h w ww h h h",
  "h h h w ww h h h",
  "h h h w ww h h h",
  "h h  y yy y  h h",
  "                ",
  "                "
];

fs.writeFileSync(path.join(mapDir, 'relic_plains.svg'), createSVG(relicPlainsGrid));
fs.writeFileSync(path.join(mapDir, 'relic_magma.svg'), createSVG(relicMagmaGrid));
fs.writeFileSync(path.join(mapDir, 'relic_void.svg'), createSVG(relicVoidGrid));
fs.writeFileSync(path.join(mapDir, 'shrine_floor.svg'), createSVG(shrineFloorGrid));
fs.writeFileSync(path.join(mapDir, 'shrine_pillar.svg'), createSVG(shrinePillarGrid));
fs.writeFileSync(path.join(mapDir, 'merchant_tent.svg'), createSVG(merchantTentGrid));
fs.writeFileSync(path.join(mapDir, 'compass_arrow.svg'), createSVG(compassArrowGrid));

console.log("All styled SVGs generated successfully.");

// --- AUDIO GENERATION ---
const audioDir = path.join(publicDir, 'audio');
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

function writeWav(filename, samples) {
  const sampleRate = 44100;
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * blockAlign;
  const chunkSize = 36 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(chunkSize, 4);
  buffer.write('WAVE', 8);

  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // AudioFormat = PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(s * 0x7FFF, offset);
    offset += 2;
  }
  fs.writeFileSync(path.join(audioDir, filename), buffer);
}

function genSound(type) {
  const rate = 44100;
  let duration = 0.15;
  if (type === 'death') duration = 1.0;
  if (type === 'shoot') duration = 0.1;
  if (type === 'hit') duration = 0.15;
  if (type === 'kill') duration = 0.2;
  if (type === 'spawn') duration = 0.5;
  if (type === 'pickup') duration = 0.15;
  if (type === 'coin') duration = 0.3;
  if (type === 'drink') duration = 0.3;
  if (type === 'reload') duration = 0.3;
  if (type === 'level_up') duration = 1.0;
  if (type === 'knife_swing') duration = 0.1;
  if (type === 'sword_swing') duration = 0.2;
  if (type === 'mg_shoot') duration = 0.08;
  if (type === 'shotgun_blast') duration = 0.3;
  if (type === 'fence_slam') duration = 0.4;
  if (type === 'door_creak') duration = 0.6;
  if (type === 'room_clear') duration = 0.8;
  // New open-world sounds
  if (type === 'brute_slam') duration = 0.5;
  if (type === 'shaman_cast') duration = 0.4;
  if (type === 'elemental_explode') duration = 0.6;
  if (type === 'wraith_teleport') duration = 0.3;
  if (type === 'golem_stomp') duration = 0.7;

  const samples = new Float32Array(Math.floor(rate * duration));
  let phase = 0;

  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    const env = 1 - (t / duration);
    let sample = 0;

    if (type === 'shoot') {
      const freq = 400 * Math.exp(-20 * t);
      phase += 2 * Math.PI * freq / rate;
      const sq = Math.sin(phase) > 0 ? 1 : -1;
      const noise = Math.random() * 2 - 1;
      sample = (sq * 0.6 + noise * 0.4) * Math.pow(1 - t / duration, 2) * 0.15;
    } else if (type === 'reload') {
      const noise = Math.random() * 2 - 1;
      let env1 = Math.max(0, 1 - (t / 0.05));
      let env2 = t > 0.15 ? Math.max(0, 1 - ((t - 0.15) / 0.05)) : 0;
      sample = noise * (env1 + env2) * 0.15;
    } else if (type === 'death') {
      const freq = 200 * Math.exp(-2 * t);
      phase += 2 * Math.PI * freq / rate;
      sample = (Math.sin(phase) > 0 ? 1 : -1) * 0.8 + (Math.random() * 2 - 1) * 0.2;
      sample *= env * 0.3;
    } else if (type === 'hit') {
      const freq = 100 - 80 * (t / duration);
      phase += 2 * Math.PI * freq / rate;
      const saw = 2 * (phase / (2 * Math.PI) - Math.floor(0.5 + phase / (2 * Math.PI)));
      sample = saw * env * 0.3;
    } else if (type === 'kill') {
      const freq = 300 - 200 * (t / duration);
      phase += 2 * Math.PI * freq / rate;
      sample = (Math.sin(phase) > 0 ? 1 : -1) * env * 0.2 + (Math.random() * 2 - 1) * env * 0.1;
    } else if (type === 'spawn') {
      const step = Math.floor(t * 10);
      const freqs = [220, 277, 330, 440, 554, 660];
      const freq = freqs[Math.min(step, freqs.length - 1)] || 660;
      phase += 2 * Math.PI * freq / rate;
      sample = (Math.sin(phase) > 0 ? 1 : -1) * (1 - Math.pow(t / duration, 2)) * 0.15;
    } else if (type === 'pickup') {
      let freq = 500;
      if (t > 0.05) freq = 800;
      if (t > 0.10) freq = 1200;
      phase += 2 * Math.PI * freq / rate;
      sample = (Math.sin(phase) > 0 ? 1 : -1) * env * 0.15;
    } else if (type === 'coin') {
      let freq = t < 0.15 ? 1200 : 1800;
      phase += 2 * Math.PI * freq / rate;
      sample = Math.sin(phase) * env * 0.2;
    } else if (type === 'drink') {
      const freq = 400 + Math.sin(t * Math.PI * 4) * 200;
      phase += 2 * Math.PI * freq / rate;
      sample = Math.sin(phase) * env * 0.3;
    } else if (type === 'open_inventory') {
      const freq = 400 + 800 * Math.pow(t / duration, 2);
      phase += 2 * Math.PI * freq / rate;
      sample = Math.sin(phase) * Math.pow(1 - t / duration, 0.5) * 0.15;
    } else if (type === 'close_inventory') {
      const freq = 1200 - 800 * Math.pow(t / duration, 2);
      phase += 2 * Math.PI * freq / rate;
      sample = Math.sin(phase) * Math.pow(1 - t / duration, 0.5) * 0.15;
    } else if (type === 'level_up') {
      const step = Math.floor(t * 8);
      const freqs = [330, 440, 554, 659, 880];
      const freq = freqs[Math.min(step, freqs.length - 1)] || 880;
      phase += 2 * Math.PI * freq / rate;
      sample = (Math.sin(phase) > 0 ? 1 : -1) * env * 0.2;
    } else if (type === 'knife_swing') {
      const noise = Math.random() * 2 - 1;
      sample = noise * Math.pow(env, 3) * 0.2;
    } else if (type === 'mg_shoot') {
      const freq = 600 * Math.exp(-30 * t);
      phase += 2 * Math.PI * freq / rate;
      const noise = Math.random() * 2 - 1;
      sample = ((Math.sin(phase) > 0 ? 1 : -1) * 0.4 + noise * 0.6) * Math.pow(1 - t / duration, 2) * 0.2;
    } else if (type === 'shotgun_blast') {
      const freq = 150 * Math.exp(-10 * t);
      phase += 2 * Math.PI * freq / rate;
      const noise = Math.random() * 2 - 1;
      let mechClick = t > 0.15 && t < 0.2 ? Math.random() * 0.5 : 0;
      sample = ((Math.sin(phase) * 0.5 + noise * 0.5) * env * 0.4) + (mechClick * 0.2);
    } else if (type === 'sword_swing') {
      const freq = 300 * Math.exp(-15 * t);
      phase += 2 * Math.PI * freq / rate;
      const noise = (Math.random() * 2 - 1) * 0.4;
      sample = (Math.sin(phase) * 0.6 + noise) * env * 0.8;
    } else if (type === 'fence_slam') {
      const noise = Math.random() * 2 - 1;
      const clang = Math.sin(t * 800 * Math.PI * 2) * Math.exp(-20 * t);
      sample = (noise * 0.5 + clang * 0.5) * env * 0.5;
    } else if (type === 'door_creak') {
      const freq = 200 + Math.random() * 300;
      phase += 2 * Math.PI * freq / rate;
      sample = Math.sin(phase) * env * (Math.random() * 0.4 + 0.6) * 0.3;
    } else if (type === 'room_clear') {
      const step = Math.floor(t * 8);
      const freqs = [440, 554, 659, 880];
      const freq = freqs[Math.min(step, freqs.length - 1)] || 880;
      phase += 2 * Math.PI * freq / rate;
      sample = (Math.sin(phase) > 0 ? 1 : -1) * env * 0.15;
    // --- NEW OPEN-WORLD SOUNDS ---
    } else if (type === 'brute_slam') {
      // Heavy ground impact — low thud + earth rumble
      const freq = 60 * Math.exp(-5 * t);
      phase += 2 * Math.PI * freq / rate;
      const noise = Math.random() * 2 - 1;
      const thud = Math.sin(phase) * Math.exp(-8 * t);
      sample = (thud * 0.7 + noise * 0.3) * env * 0.6;
    } else if (type === 'shaman_cast') {
      // Magical whoosh — rising sine with shimmer
      const freq = 300 + 600 * Math.pow(t / duration, 0.5);
      phase += 2 * Math.PI * freq / rate;
      const shimmer = Math.sin(t * 40 * Math.PI) * 0.3;
      sample = (Math.sin(phase) + shimmer) * env * 0.25;
    } else if (type === 'elemental_explode') {
      // Fiery explosion — noise burst + low rumble
      const noise = Math.random() * 2 - 1;
      const freq = 80 * Math.exp(-3 * t);
      phase += 2 * Math.PI * freq / rate;
      const burst = t < 0.1 ? 1.0 : Math.exp(-5 * (t - 0.1));
      sample = (noise * burst * 0.5 + Math.sin(phase) * 0.5) * env * 0.5;
    } else if (type === 'wraith_teleport') {
      // Phase-shift whoosh — descending then ascending
      const freq = 800 * Math.abs(Math.sin(t / duration * Math.PI));
      phase += 2 * Math.PI * freq / rate;
      sample = Math.sin(phase) * env * 0.2 + (Math.random() * 2 - 1) * env * 0.1;
    } else if (type === 'golem_stomp') {
      // Massive ground pound — double thud with sustained rumble
      const freq = 40 + 20 * Math.sin(t * 4 * Math.PI);
      phase += 2 * Math.PI * freq / rate;
      const noise = Math.random() * 2 - 1;
      const impact1 = t < 0.1 ? Math.exp(-30 * t) : 0;
      const impact2 = (t > 0.25 && t < 0.35) ? Math.exp(-30 * (t - 0.25)) : 0;
      sample = (Math.sin(phase) * 0.4 + noise * 0.3) * env * 0.6 + (impact1 + impact2) * 0.4;
    } else if (type === 'artifact_ping') {
      const freq = 1200 * Math.exp(-15 * t);
      phase += 2 * Math.PI * freq / rate;
      sample = Math.sin(phase) * env * 0.3;
    } else if (type === 'artifact_pickup') {
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      const step = Math.floor(t * 8);
      const freq = freqs[Math.min(step, freqs.length - 1)] || freqs[3];
      phase += 2 * Math.PI * freq / rate;
      sample = (Math.sin(phase) > 0 ? 1 : -1) * env * 0.2;
    } else if (type === 'shrine_awaken') {
      const freq = 30 + Math.random() * 20;
      phase += 2 * Math.PI * freq / rate;
      const noise = Math.random() * 2 - 1;
      sample = (Math.sin(phase) * 0.7 + noise * 0.3) * env * 0.5;
    } else if (type === 'portal_boss_spawn') {
      const freq = 100 * Math.exp(-2 * t) + 20 * Math.sin(t * 10 * Math.PI);
      phase += 2 * Math.PI * freq / rate;
      const noise = Math.random() * 2 - 1;
      sample = (Math.sin(phase) * 0.6 + noise * 0.4) * env * 0.7;
    }

    samples[i] = sample;
  }
  return samples;
}

['shoot', 'death', 'hit', 'kill', 'spawn', 'pickup', 'coin', 'open_inventory', 'close_inventory', 'reload', 'level_up', 'knife_swing', 'mg_shoot', 'shotgun_blast', 'fence_slam', 'door_creak', 'room_clear', 'brute_slam', 'shaman_cast', 'elemental_explode', 'wraith_teleport', 'golem_stomp', 'artifact_ping', 'artifact_pickup', 'shrine_awaken', 'portal_boss_spawn'].forEach(t => {
  writeWav(`${t}.wav`, genSound(t));
});

console.log("All audio WAV files generated successfully in public/assets/audio.");
