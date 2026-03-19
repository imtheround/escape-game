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
const gr2 = [ bBase[0], ...bBase.slice(0, 15) ]; 
const gr3 = bBase;
const gr4 = [ ...bBase.slice(1, 16), bBase[0] ]; 

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
const grB2 = [ bBlue[0], ...bBlue.slice(0, 15) ]; 
const grB3 = bBlue;
const grB4 = [ ...bBlue.slice(1, 16), bBlue[0] ]; 

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
  ".......b........",
  "......bbb.......",
  "..c...shhb......",
  ".cccbbssssbbbb..",
  "..c..bshbbhbbb..",
  "......bbb.......",
  ".......b........",
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

fs.writeFileSync(path.join(characterDir, 'slime_idle1.svg'), createSVG(slimeIdle1));
fs.writeFileSync(path.join(characterDir, 'slime_idle2.svg'), createSVG(slimeIdle2));
fs.writeFileSync(path.join(characterDir, 'slime_walk1.svg'), createSVG(f1));
fs.writeFileSync(path.join(characterDir, 'slime_walk2.svg'), createSVG(f2));
fs.writeFileSync(path.join(characterDir, 'slime_walk3.svg'), createSVG(f3));
fs.writeFileSync(path.join(characterDir, 'slime_walk4.svg'), createSVG(f4));
fs.writeFileSync(path.join(characterDir, 'slime_hit.svg'), createSVG(slimeHit));
fs.writeFileSync(path.join(characterDir, 'slime_attack.svg'), createSVG(slimeAttack));

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
fs.writeFileSync(path.join(characterDir, 'bullet.svg'), createSVG(bulletFrame));
fs.writeFileSync(path.join(characterDir, 'ebullet.svg'), createSVG(ebulletFrame));

console.log("All styled SVGs, including 4-frame runs and blue variants, generated successfully in public/assets.");
