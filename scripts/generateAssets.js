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
  "................",
  "................",
  "................",
  "3333333333333333",
  "4444444444444444",
  "3333333333333333",
  "5555555555555555",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................"
];

const wall_v = [
  "......3435......",
  "......3435......",
  "......3435......",
  "......3435......",
  "......3435......",
  "......3435......",
  "......3435......",
  "......3435......",
  "......3435......",
  "......3435......",
  "......3435......",
  "......3435......",
  "......3435......",
  "......3435......",
  "......3435......",
  "......3435......"
];

const fenceGrid = [
  "................",
  ".hh.hh.hh.hh.hh.",
  ".hh.hh.hh.hh.hh.",
  ".hh.hh.hh.hh.hh.",
  "hhhhhhhhhhhhhhhh",
  ".hh.hh.hh.hh.hh.",
  ".hh.hh.hh.hh.hh.",
  ".hh.hh.hh.hh.hh.",
  "hhhhhhhhhhhhhhhh",
  ".hh.hh.hh.hh.hh.",
  ".hh.hh.hh.hh.hh.",
  ".hh.hh.hh.hh.hh.",
  "hhhhhhhhhhhhhhhh",
  ".hh.hh.hh.hh.hh.",
  ".hh.hh.hh.hh.hh.",
  "................"
];

fs.writeFileSync(path.join(mapDir, 'floor.svg'), createSVG(floorGrid));
fs.writeFileSync(path.join(mapDir, 'wall_h.svg'), createSVG(wall_h));
fs.writeFileSync(path.join(mapDir, 'wall_v.svg'), createSVG(wall_v));
fs.writeFileSync(path.join(mapDir, 'fence.svg'), createSVG(fenceGrid));

const rockGrid = [
  "   4444   ",
  "  443344  ",
  " 44322344 ",
  " 43322334 ",
  " 43222244 ",
  "4332213344",
  "4322111334",
  "4321111134",
  " 43311134 ",
  "  444444  "
];
fs.writeFileSync(path.join(mapDir, 'rock.svg'), createSVG(rockGrid));

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
      // Wood creaking sound, high pitched random scraping
      const freq = 200 + Math.random() * 300;
      phase += 2 * Math.PI * freq / rate;
      sample = Math.sin(phase) * env * (Math.random() * 0.4 + 0.6) * 0.3;
    }

    samples[i] = sample;
  }
  return samples;
}

['shoot', 'death', 'hit', 'kill', 'spawn', 'pickup', 'coin', 'drink', 'open_inventory', 'close_inventory', 'reload', 'level_up', 'knife_swing', 'sword_swing', 'mg_shoot', 'shotgun_blast', 'fence_slam', 'door_creak'].forEach(t => {
  writeWav(`${t}.wav`, genSound(t));
});

console.log("All audio WAV files generated successfully in public/assets/audio.");
