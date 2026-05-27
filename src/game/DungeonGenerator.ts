export interface DungeonRoom {
  id: number;
  tx: number; // center tile x
  ty: number; // center tile y
  tw: number; // tile width
  th: number; // tile height
  cleared: boolean;
  active: boolean;
  isEndRoom?: boolean; // Marks the exit or boss room
  spawnPoints: any[];
  doors: any[];
  spawnedEnemies: any[];
}

// Simple seeded RNG for deterministic generation per stage
class RNG {
    private seed: number;
    constructor(seed: number) { this.seed = seed; }
    next(): number {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }
}

export class DungeonGenerator {
  public static generateTutorialLayout(dungeonTiles: Record<string, string>, dungeonRooms: DungeonRoom[]) {
    const rooms = [
       { id: 0, tx: 0, ty: 0, tw: 12, th: 12 },
       { id: 1, tx: 40, ty: 0, tw: 11, th: 11 },
       { id: 2, tx: 75, ty: 0, tw: 15, th: 11 },
       { id: 3, tx: 105, ty: 0, tw: 11, th: 11 }
    ];

    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      const room: DungeonRoom = {
        id: r.id, tx: r.tx, ty: r.ty, tw: r.tw, th: r.th,
        cleared: false, active: false, spawnPoints: [], doors: [], spawnedEnemies: []
      };
      dungeonRooms.push(room);

      const startX = r.tx - Math.floor(r.tw / 2);
      const startY = r.ty - Math.floor(r.th / 2);
      for (let tx = startX; tx < startX + r.tw; tx++) {
        for (let ty = startY; ty < startY + r.th; ty++) {
          dungeonTiles[`${tx},${ty}`] = 'FLOOR';
        }
      }
    }

    // Initial Locked Doors (Walls)
    for (let dy = -1; dy <= 1; dy++) dungeonTiles[`6,${dy}`] = 'WALL';
    for (let dy = -1; dy <= 1; dy++) dungeonTiles[`46,${dy}`] = 'WALL';
    for (let dy = -1; dy <= 1; dy++) dungeonTiles[`83,${dy}`] = 'WALL';

    // Wrap with Walls
    const dirs8 = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    for (let tx = -20; tx <= 120; tx++) {
      for (let ty = -10; ty <= 10; ty++) {
        const key = `${tx},${ty}`;
        if (!dungeonTiles[key]) {
          let hasFloorNeighbor = false;
          for (const d of dirs8) {
            const nType = dungeonTiles[`${tx+d[0]},${ty+d[1]}`];
            if (nType === 'FLOOR' || nType === 'DOOR' || nType === 'WATER') {
              hasFloorNeighbor = true;
              break;
            }
          }
          if (hasFloorNeighbor) {
            dungeonTiles[key] = 'WALL';
          }
        }
      }
    }
  }

  public static generateProceduralLayout(dungeonTiles: Record<string, string>, dungeonRooms: DungeonRoom[], stage: number, biome: number) {
      if (biome === 0) {
          this.generateOvergrownForest(dungeonTiles, dungeonRooms, stage);
      } else {
          this.generateStandardLayout(dungeonTiles, dungeonRooms, stage, biome);
      }
  }

    private static generateOvergrownForest(dungeonTiles: Record<string, string>, dungeonRooms: DungeonRoom[], stage: number) {
      const rng = new RNG(stage * 9999);
      const numRooms = 5 + Math.floor(stage / 2);
      
      const roomCoords = [{x: 0, y: 0}]; // Origin is the spawn room
      let cx = 0;
      let cy = 0;
      const ROOM_SPACING = 30;

      // Plan room coordinates - Directed Path
      for (let i = 1; i < numRooms; i++) {
          const moveRight = rng.next() > 0.5;
          cx += moveRight ? ROOM_SPACING : 0;
          cy += moveRight ? 0 : ROOM_SPACING;
          roomCoords.push({x: cx, y: cy});
      }

      // Step 2: Carve rooms out of the dense forest using organic shapes
      for (let i = 0; i < roomCoords.length; i++) {
          const rc = roomCoords[i];
          let tw = 0, th = 0;
          
          if (i === 0) {
              // The Spawn Room: A large, protective organic clearing
              tw = 22; th = 22;
              const bubbles = [
                  { dx: 0, dy: 0, r: 10 },
                  { dx: 4, dy: 3, r: 6 },
                  { dx: -5, dy: 2, r: 7 },
                  { dx: 2, dy: -6, r: 6 }
              ];
              for (const b of bubbles) {
                  for (let dy = -b.r; dy <= b.r; dy++) {
                      for (let dx = -b.r; dx <= b.r; dx++) {
                          if (dx*dx + dy*dy <= b.r*b.r) {
                              dungeonTiles[`${rc.x + b.dx + dx},${rc.y + b.dy + dy}`] = 'FLOOR';
                          }
                      }
                  }
              }
          } else if (i === roomCoords.length - 1) {
              // The Boss/End Room: Massive irregular sprawl
              tw = 28; th = 28;
              const bubbles = [
                  { dx: 0, dy: 0, r: 12 },
                  { dx: 6, dy: 5, r: 8 },
                  { dx: -7, dy: -4, r: 9 },
                  { dx: -6, dy: 6, r: 7 },
                  { dx: 5, dy: -7, r: 8 }
              ];
              for (const b of bubbles) {
                  for (let dy = -b.r; dy <= b.r; dy++) {
                      for (let dx = -b.r; dx <= b.r; dx++) {
                          if (dx*dx + dy*dy <= b.r*b.r) {
                              dungeonTiles[`${rc.x + b.dx + dx},${rc.y + b.dy + dy}`] = 'FLOOR';
                          }
                      }
                  }
              }
          } else {
              // Normal combat clearings: completely unorganized overlapping circles
              tw = 20; th = 20;
              const numBubbles = 3 + Math.floor(rng.next() * 3);
              for (let b = 0; b < numBubbles; b++) {
                  const bdx = Math.floor((rng.next() - 0.5) * 12);
                  const bdy = Math.floor((rng.next() - 0.5) * 12);
                  const br = 4 + Math.floor(rng.next() * 4);
                  for (let dy = -br; dy <= br; dy++) {
                      for (let dx = -br; dx <= br; dx++) {
                          if (dx*dx + dy*dy <= br*br) {
                              dungeonTiles[`${rc.x + bdx + dx},${rc.y + bdy + dy}`] = 'FLOOR';
                          }
                      }
                  }
              }
          }

          const room: DungeonRoom = {
              id: i,
              tx: rc.x,
              ty: rc.y,
              tw: tw, th: th,
              cleared: i === 0, active: false, isEndRoom: i === roomCoords.length - 1,
              spawnPoints: [], doors: [], spawnedEnemies: []
          };
          dungeonRooms.push(room);
      }

      // Step 3: Carve paths between rooms
      for (let i = 0; i < roomCoords.length - 1; i++) {
          let x = roomCoords[i].x;
          let y = roomCoords[i].y;
          const targetX = roomCoords[i+1].x;
          const targetY = roomCoords[i+1].y;
          
          while (x !== targetX || y !== targetY) {
              // Carve a path 4-5 tiles wide
              for (let dy = -2; dy <= 2; dy++) {
                  for (let dx = -2; dx <= 2; dx++) {
                      if (Math.abs(dx) === 2 && Math.abs(dy) === 2 && rng.next() > 0.5) continue; // organic jagged edges on path
                      dungeonTiles[`${x + dx},${y + dy}`] = 'FLOOR';
                  }
              }
              
              if (Math.abs(x - targetX) > Math.abs(y - targetY)) {
                  x += x < targetX ? 1 : -1;
              } else {
                  y += y < targetY ? 1 : -1;
              }
          }
      }

      // Step 4: Scatter elements (Props / Hazards) in clearings only, not paths
      for (const r of dungeonRooms) {
          if (r.id !== 0) {
              const numObstacles = 4 + Math.floor(rng.next() * 5);
              for (let i = 0; i < numObstacles; i++) {
                  const rx = r.tx + Math.floor(rng.next() * (r.tw - 6)) - Math.floor(r.tw/2) + 3;
                  const ry = r.ty + Math.floor(rng.next() * (r.th - 6)) - Math.floor(r.th/2) + 3;
                  const key = `${rx},${ry}`;
                  if (dungeonTiles[key] === 'FLOOR') { 
                      // 10% chance for puddle, 90% for rock/obstacle
                      if (rng.next() < 0.1) {
                          dungeonTiles[key] = 'IRRADIATED_WATER';
                      } else {
                          dungeonTiles[key] = 'OBSTACLE';
                      }
                  }
              }
          }
      }
  }

  private static generateStandardLayout(dungeonTiles: Record<string, string>, dungeonRooms: DungeonRoom[], stage: number, biome: number) {
    const numRooms = 4 + Math.floor(stage / 2); // 4 to 9 rooms based on stage
    
    let cx = 0;
    let cy = 0;
    const grid: Record<string, boolean> = { '0,0': true };
    const roomCoords = [{x: 0, y: 0}];

    const dirs = [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}];
    
    for (let i = 1; i < numRooms; i++) {
        let valid = false;
        let attempts = 0;
        while (!valid && attempts < 20) {
            const d = dirs[Math.floor(Math.random() * dirs.length)];
            const nx = cx + d.x;
            const ny = cy + d.y;
            if (!grid[`${nx},${ny}`]) {
                grid[`${nx},${ny}`] = true;
                cx = nx;
                cy = ny;
                roomCoords.push({x: cx, y: cy});
                valid = true;
            }
            attempts++;
        }
    }

    const ROOM_SPACING = 30; // Tiles between room centers
    const ROOM_SIZE = 17;    // Size of the physical room (17x17)

    for (let i = 0; i < roomCoords.length; i++) {
        const rc = roomCoords[i];
        const r: DungeonRoom = {
            id: i,
            tx: rc.x * ROOM_SPACING,
            ty: rc.y * ROOM_SPACING,
            tw: ROOM_SIZE,
            th: ROOM_SIZE,
            cleared: i === 0, // Start room is naturally cleared
            active: false,
            isEndRoom: i === roomCoords.length - 1, // Last room generated is the end
            spawnPoints: [], doors: [], spawnedEnemies: []
        };
        dungeonRooms.push(r);

        const startX = r.tx - Math.floor(r.tw / 2);
        const startY = r.ty - Math.floor(r.th / 2);
        for (let tx = startX; tx <= startX + r.tw; tx++) {
            for (let ty = startY; ty <= startY + r.th; ty++) {
                dungeonTiles[`${tx},${ty}`] = 'FLOOR';
                
                // Environmental Hazards (Phase 3)
                // Spawn hazards randomly inside the room, but keep edges clear
                if (i !== 0 && tx > startX + 2 && tx < startX + r.tw - 2 && ty > startY + 2 && ty < startY + r.th - 2) {
                    if (Math.random() < 0.08) {
                        dungeonTiles[`${tx},${ty}`] = Math.random() < 0.5 ? 'MAGMA' : 'STEAM_VENT';
                    }
                }
            }
        }
    }

    // Connect rooms with 5-tile wide hallways
    for (let i = 0; i < roomCoords.length - 1; i++) {
       const rc1 = roomCoords[i];
       const rc2 = roomCoords[i+1];
       
       const x1 = rc1.x * ROOM_SPACING;
       const y1 = rc1.y * ROOM_SPACING;
       const x2 = rc2.x * ROOM_SPACING;
       const y2 = rc2.y * ROOM_SPACING;

       if (x1 !== x2) { // horizontal hallway
           const minX = Math.min(x1, x2);
           const maxX = Math.max(x1, x2);
           for (let tx = minX; tx <= maxX; tx++) {
               for (let dy = -2; dy <= 2; dy++) dungeonTiles[`${tx},${y1 + dy}`] = 'FLOOR';
           }
       } else { // vertical hallway
           const minY = Math.min(y1, y2);
           const maxY = Math.max(y1, y2);
           for (let ty = minY; ty <= maxY; ty++) {
               for (let dx = -2; dx <= 2; dx++) dungeonTiles[`${x1 + dx},${ty}`] = 'FLOOR';
           }
       }
    }

    // Generate Boundaries
    const dirs8 = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    for (const key in dungeonTiles) {
        const [tx, ty] = key.split(',').map(Number);
        if (tx < minX) minX = tx;
        if (tx > maxX) maxX = tx;
        if (ty < minY) minY = ty;
        if (ty > maxY) maxY = ty;
    }
    
    for (let tx = minX - 2; tx <= maxX + 2; tx++) {
      for (let ty = minY - 2; ty <= maxY + 2; ty++) {
        const key = `${tx},${ty}`;
        if (!dungeonTiles[key]) {
          let hasFloorNeighbor = false;
          for (const d of dirs8) {
            const nType = dungeonTiles[`${tx+d[0]},${ty+d[1]}`];
            if (nType === 'FLOOR' || nType === 'IRRADIATED_WATER' || nType === 'MAGMA' || nType === 'STEAM_VENT') {
              hasFloorNeighbor = true;
              break;
            }
          }
          if (hasFloorNeighbor) {
             dungeonTiles[key] = 'WALL';
          }
        }
      }
    }
    
    // Sprinkle interactable obstacles inside rooms only
    for (const r of dungeonRooms) {
        if (r.id !== 0) {
            for (let i = 0; i < 5; i++) {
                const rx = r.tx + Math.floor(Math.random() * (r.tw - 4)) - Math.floor(r.tw/2) + 2;
                const ry = r.ty + Math.floor(Math.random() * (r.th - 4)) - Math.floor(r.th/2) + 2;
                const key = `${rx},${ry}`;
                // Avoid placing on top of hazards or blocking paths
                if (dungeonTiles[key] === 'FLOOR') { 
                    dungeonTiles[key] = 'OBSTACLE';
                }
            }
        }
    }
  }
}
