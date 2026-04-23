const fs = require('fs');
const path = require('path');

const colorMap = {
  '.': null, 'b': '#000000', 'w': '#FFFFFF', 'S': '#E8E8E8', 'C': '#FF3333', 'h': '#8B4513', 's': '#808080', 'X': '#505050'
};

function createSVG(grid) {
  let svg = '<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">\n';
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const char = grid[y][x];
      const color = colorMap[char];
      if (color) { svg += '  <rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + color + '" />\n'; }
    }
  }
  svg += '</svg>';
  return svg;
}

const sword = [
  '..............bb',
  '.............bww',
  '............bwww',
  '...........bwwSb',
  '..........bwwSb.',
  '.........bwwSb..',
  '........bwwSb...',
  '.......bwwSb....',
  '......bwwSb.....',
  '....bbbbbb......',
  '...bCCCCCCb.....',
  '...bbCCbbbb.....',
  '....bhhb........',
  '....bhhb........',
  '....bbbb........',
  '................'
];

const goblin = [
  '......bbb.......',
  '.....bCCCb......',
  '....bCCCCCb.....',
  '...bbbbbbbbb....',
  '..bSSSSSSSSSbb..',
  '.bSSSbbbSSSsXsb.',
  '.bSSSbbbSSSsXsb.',
  '.bSSSSSsssssXsb.',
  '..bbbbbbbbbbb...',
  '...bCCCCCCCb....',
  '...bSSbbbSSb....',
  '...bSSbbbSSb....',
  '....bb...bb.....',
  '................',
  '................',
  '................'
];

fs.writeFileSync(path.join(__dirname, '../public/assets/character/sword.svg'), createSVG(sword));
fs.writeFileSync(path.join(__dirname, '../public/assets/enemies/goblin_idle.svg'), createSVG(goblin));
console.log("Done");
