// GBA-Style Multi-Map Engine
// Generates and manages layouts, decoration layers, and collision checks for all 22 maps

import { MAPS_CONFIG } from '../data/maps.js';

// sprites.png tile index mapping — 114-column grid, 17px stride
// Index = row * 114 + col + 1 (1-based)
function spTile(col, row) { return row * 114 + col + 1; }

// Helper to convert 61-col backgrounds.png index to 114-col sprites.png index
// Used for DECOS that share layout with backgrounds.png
function convert61to114(idx) {
  if (!idx || idx <= 0) return 0;
  const col = (idx - 1) % 61;
  const row = Math.floor((idx - 1) / 61);
  return row * 114 + col + 1;
}

// Shared tile sheet — all TileMap instances reuse this single Image
const _sharedTileSheet = new Image();
_sharedTileSheet.src = 'assets/images/sprites.png';
_sharedTileSheet.onerror = () => console.warn('Failed to load tile sheet: assets/images/sprites.png');
let _sharedTileSheetReady = false;
_sharedTileSheet.onload = () => { _sharedTileSheetReady = true; };

export class TileMap {
  constructor(mapId, tileSize) {
    const config = MAPS_CONFIG[mapId];
    if (!config) {
      throw new Error(`Map ID ${mapId} does not exist in database.`);
    }

    this.id = mapId;
    this.name = config.name;
    this.width = config.width;
    this.height = config.height;
    this.tileSize = tileSize;
    this.theme = config.theme;
    this.type = config.type;
    this.warps = config.warps || [];
    this.floorTile = convert61to114(config.floorTile || 480);
    this.wallTile = convert61to114(config.wallTile || 464);

    // Grid arrays: base tiles (ground) and decoration tiles (obstacles/events)
    this.baseGrid = [];
    this.decoGrid = [];
    this.ruinsGrid = []; // Overlays/Houses

    // Tile Types
    this.TILES = {
      WATER: 0,
      GRASS: 1,
      SAND: 2,
      DIRT: 3,
      STONE: 4,
      LAVA: 5,
      CORRUPTED: 6,
      SNOW: 7,
      ICE: 8,
      VOID: 9
    };

    // Decoration assets matching sprites.png (114-col grid, 17px stride)
    this.DECOS = {
      EMPTY: 0,
      TREE: convert61to114(24),         // GBA Green tree
      WALL: convert61to114(74),         // Basalt rock
      TEMPLE_WALL: convert61to114(342), // Marble pillar wall
      BRIDGE: convert61to114(140),      // Wooden bridge board
      ALTAR: convert61to114(275),       // Sacred altar pedestal
      SHRINE: convert61to114(624),      // Red roof shrine structure
      RUINED_COL: convert61to114(323),  // Broken pillar ruins
      PORTAL: convert61to114(1254),     // Cave mouth / portal entrance
      CROPS: convert61to114(63),        // Farming crops
      FORGE: convert61to114(368),       // Blacksmith anvil/furnace
      BOOKSHELF: convert61to114(101),   // Hermitage bookshelf
      SIGNBOARD: convert61to114(25),    // GBA readable sign
      CHEST: convert61to114(324)        // Chest / relic trunk
    };

    // Use shared tile sheet — no per-map Image allocation
    this.tileSheet = _sharedTileSheet;

    // Offscreen tile cache to avoid redrawing ~450 drawImage calls per frame
    this._tileCacheCanvas = null;
    this._tileCacheCtx = null;
    this._cacheCamTileX = -1;
    this._cacheCamTileY = -1;
    this._tileSheetLoadedWhenCached = false;

    this.generateMap();
  }

  generateMap() {
    this.baseGrid = Array(this.width * this.height).fill(this.TILES.GRASS);
    this.decoGrid = Array(this.width * this.height).fill(this.DECOS.EMPTY);
    this.ruinsGrid = Array(this.width * this.height).fill(0);

    // 1. Generate core layout base on Map Type
    if (this.type === 'interior') {
      this.baseGrid.fill(this.TILES.DIRT); // wood floor tileset equivalent
      
      // Draw solid walls on all borders
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const idx = y * this.width + x;
          if (x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1) {
            this.decoGrid[idx] = this.wallTile;
          }
        }
      }

      if (this.id === 11) {
        // Daksha's Volcanic Forge
        this.decoGrid[5 * this.width + 12] = this.DECOS.FORGE;
        this.decoGrid[5 * this.width + 11] = this.DECOS.FORGE;
      } else {
        // Ashram interior furnitures
        this.decoGrid[2 * this.width + 2] = this.DECOS.BOOKSHELF;
        this.decoGrid[2 * this.width + 3] = this.DECOS.BOOKSHELF;
        this.decoGrid[2 * this.width + 8] = this.DECOS.ALTAR; // desk/table
      }
      
      // Clear doorway rug
      const exitWarp = this.warps[0];
      if (exitWarp) {
        const doorIdx = exitWarp.y * this.width + exitWarp.x;
        this.decoGrid[doorIdx] = this.DECOS.BRIDGE; // walkable door mat
      }
    } 
    
    else if (this.type === 'village') {
      this.baseGrid.fill(this.TILES.GRASS);

      // Winding River on left
      for (let y = 0; y < this.height; y++) {
        const rx = Math.floor(18 + Math.sin(y * 0.15) * 4);
        for (let x = rx - 4; x <= rx + 4; x++) {
          const idx = y * this.width + x;
          this.baseGrid[idx] = this.TILES.WATER;
        }
        this.baseGrid[y * this.width + (rx - 5)] = this.TILES.SAND;
        this.baseGrid[y * this.width + (rx + 5)] = this.TILES.SAND;
      }

      // Bridge crossing the river in the middle
      for (let y = 38; y <= 42; y++) {
        const rx = Math.floor(18 + Math.sin(y * 0.15) * 4);
        for (let x = rx - 4; x <= rx + 4; x++) {
          const idx = y * this.width + x;
          this.baseGrid[idx] = this.TILES.GRASS;
          this.decoGrid[idx] = this.DECOS.BRIDGE;
        }
      }

      // Place GBA buildings aligned with door warps
      this.carveAshram(9, 19);
      this.carveGreenHouse(34, 23);
      this.carveRedHouse(53, 28);

      // Winding pathways (width = 2)
      this.carvePath(40, 70, 12, 25, 2);
      this.carvePath(40, 70, 34, 29, 2);
      this.carvePath(40, 70, 56, 33, 2);
      this.carvePath(40, 70, 40, 59, 2);
      this.carvePath(40, 70, 40, 2, 2);

      // Village center square - stone floor around the well
      for (let y = 32; y <= 38; y++) {
        for (let x = 36; x <= 44; x++) {
          this.baseGrid[y * this.width + x] = this.TILES.STONE;
        }
      }

      // Well at square center
      this.decoGrid[35 * this.width + 40] = this.DECOS.RUINED_COL;

      // Farming Crops field
      for (let y = 12; y <= 18; y++) {
        for (let x = 44; x <= 52; x++) {
          this.decoGrid[y * this.width + x] = this.DECOS.CROPS;
        }
      }

      // Trees framing the village
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const idx = y * this.width + x;
          if (this.baseGrid[idx] !== this.TILES.GRASS) continue;
          if (this.decoGrid[idx] !== this.DECOS.EMPTY) continue;
          if (this.ruinsGrid[idx] > 0) continue;
          // Clusters of trees along edges and between buildings
          const edgeDist = Math.min(x, this.width - x, y, this.height - y);
          if (edgeDist < 3 && Math.random() < 0.6) {
            this.decoGrid[idx] = this.DECOS.TREE;
          }
          // Scattered trees in open areas
          if (Math.random() < 0.04) {
            this.decoGrid[idx] = this.DECOS.TREE;
          }
        }
      }

      // Village entrance gate at south path
      this.decoGrid[69 * this.width + 39] = this.DECOS.WALL;
      this.decoGrid[69 * this.width + 41] = this.DECOS.WALL;
      this.decoGrid[70 * this.width + 39] = this.DECOS.WALL;
      this.decoGrid[70 * this.width + 41] = this.DECOS.WALL;
      this.decoGrid[68 * this.width + 39] = this.DECOS.SIGNBOARD;
      this.decoGrid[68 * this.width + 41] = this.DECOS.SIGNBOARD;

      // Spawn landing (small stone area where player appears)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          this.baseGrid[(70 + dy) * this.width + (40 + dx)] = this.TILES.STONE;
        }
      }
      this.decoGrid[70 * this.width + 40] = this.DECOS.EMPTY;
      this.decoGrid[69 * this.width + 40] = this.DECOS.EMPTY;
      this.decoGrid[71 * this.width + 40] = this.DECOS.WALL;

      // Entrance lantern posts
      this.decoGrid[68 * this.width + 38] = this.DECOS.RUINED_COL;
      this.decoGrid[68 * this.width + 42] = this.DECOS.RUINED_COL;
      this.decoGrid[66 * this.width + 37] = this.DECOS.TREE;
      this.decoGrid[66 * this.width + 43] = this.DECOS.TREE;
      this.decoGrid[72 * this.width + 38] = this.DECOS.TREE;
      this.decoGrid[72 * this.width + 42] = this.DECOS.TREE;

      // Market stalls near center square
      this.decoGrid[31 * this.width + 36] = this.DECOS.CHEST;
      this.decoGrid[31 * this.width + 44] = this.DECOS.CHEST;
      this.decoGrid[39 * this.width + 36] = this.DECOS.SIGNBOARD;
      this.decoGrid[39 * this.width + 44] = this.DECOS.SIGNBOARD;

      // Lanterns along main path
      const lanternPositions = [[40, 55], [40, 60], [40, 65], [38, 33], [42, 33]];
      for (const [lx, ly] of lanternPositions) {
        this.decoGrid[ly * this.width + lx] = this.DECOS.RUINED_COL;
      }
    } 
    
    else if (this.type === 'shrine') {
      this.baseGrid.fill(this.TILES.GRASS);
      // Place shrine at the center
      const cx = Math.floor(this.width / 2);
      const cy = Math.floor(this.height / 2);
      this.decoGrid[cy * this.width + cx] = this.DECOS.SHRINE;
    } 
    
    else if (this.type === 'forest' || this.type === 'dense_forest') {
      this.baseGrid.fill(this.TILES.GRASS);
      
      // organic winding trails
      for (let y = 5; y < this.height - 5; y++) {
        const px = Math.floor(this.width/2 + Math.sin(y * 0.1) * 12);
        for (let x = px - 3; x <= px + 3; x++) {
          this.baseGrid[y * this.width + x] = this.TILES.DIRT;
        }
      }

      // Vashistha Ashram in grove
      if (this.type === 'forest') {
        this.carveAshram(13, 16);
        // Carve connection path from Hermitage door to the main trail
        this.carvePath(16, 21, 50, 21, 2);
      }

      // Connect warps to main trail on Sacred Grove Entrance (Map 6)
      if (this.id === 6) {
        const southTrailX = Math.floor(this.width/2 + Math.sin(74 * 0.1) * 12);
        this.carvePath(40, 79, southTrailX, 74, 2);

        const northTrailX = Math.floor(this.width/2 + Math.sin(5 * 0.1) * 12);
        this.carvePath(40, 1, northTrailX, 5, 2);

        const midTrailX = Math.floor(this.width/2 + Math.sin(40 * 0.1) * 12);
        this.carvePath(1, 40, midTrailX, 40, 2);
      }

      // Connect warps to main trail on Canopy of Roots (Map 8)
      if (this.id === 8) {
        const southTrailX = Math.floor(this.width/2 + Math.sin(74 * 0.1) * 12);
        this.carvePath(40, 79, southTrailX, 74, 2);

        const caveTrailX = Math.floor(this.width/2 + Math.sin(13 * 0.1) * 12);
        this.carvePath(70, 13, caveTrailX, 13, 2);
      }

      // Fill rest with dense trees using smooth clump noise, keeping paths/warps/houses clear
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const idx = y * this.width + x;
          const onPath = this.baseGrid[idx] === this.TILES.DIRT;
          const inHouse = this.ruinsGrid[idx] > 0;
          if (onPath || inHouse) continue;

          // Check distance to path
          let nearPath = false;
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                if (this.baseGrid[ny * this.width + nx] === this.TILES.DIRT) {
                  nearPath = true;
                  break;
                }
              }
            }
            if (nearPath) break;
          }

          // Check distance to warps
          let nearWarp = false;
          for (const w of this.warps) {
            if (Math.abs(w.x - x) <= 3 && Math.abs(w.y - y) <= 3) {
              nearWarp = true;
              break;
            }
          }

          // Check distance to house
          let nearHouse = false;
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                if (this.ruinsGrid[ny * this.width + nx] > 0) {
                  nearHouse = true;
                  break;
                }
              }
            }
            if (nearHouse) break;
          }

          if (nearPath || nearWarp || nearHouse) continue;

          // Organic clump waves
          const noise = Math.sin(x * 0.3) * Math.sin(y * 0.3);
          const treeProb = noise > -0.2 ? 0.65 : 0.15;
          if (Math.random() < treeProb) {
            this.decoGrid[idx] = this.DECOS.TREE;
          }
        }
      }

      // Hidden chests / boulders
      this.decoGrid[12 * this.width + 10] = this.DECOS.WALL; // pushable boulder mockup
    } 
    
    else if (this.type === 'cave' || this.type === 'cave_vault' || this.type === 'lava_cave') {
      this.baseGrid.fill(this.TILES.STONE);
      this.decoGrid.fill(this.DECOS.WALL);

      // Define key points to connect in caverns to guarantee playability
      const pathsToCarve = [];
      if (this.id === 9) { // Whispering Caves
        pathsToCarve.push({ x1: 20, y1: 38, x2: 20, y2: 20 });
        pathsToCarve.push({ x1: 20, y1: 20, x2: 10, y2: 15 });
        pathsToCarve.push({ x1: 20, y1: 20, x2: 30, y2: 15 });
      } else if (this.id === 12) { // Lava Caves
        pathsToCarve.push({ x1: 20, y1: 38, x2: 20, y2: 20 });
        pathsToCarve.push({ x1: 20, y1: 20, x2: 10, y2: 15 });
        pathsToCarve.push({ x1: 20, y1: 20, x2: 30, y2: 15 });
      } else if (this.id === 17) { // Tidal Ruins Vault
        pathsToCarve.push({ x1: 12, y1: 22, x2: 12, y2: 6 });
      } else {
        pathsToCarve.push({ x1: Math.floor(this.width/2), y1: this.height - 2, x2: Math.floor(this.width/2), y2: 2 });
      }

      // Helper to clear circular chambers/path corridors
      const clearCorridor = (x1, y1, x2, y2, radius = 3) => {
        let curX = x1;
        let curY = y1;
        const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
        for (let s = 0; s <= steps; s++) {
          const t = steps === 0 ? 0 : s / steps;
          const cx = Math.round(x1 + (x2 - x1) * t);
          const cy = Math.round(y1 + (y2 - y1) * t);
          
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              if (dx*dx + dy*dy <= radius*radius) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                  this.decoGrid[ny * this.width + nx] = this.DECOS.EMPTY;
                }
              }
            }
          }
        }
      };

      // Carve paths
      for (const p of pathsToCarve) {
        clearCorridor(p.x1, p.y1, p.x2, p.y2, 3);
      }

      // Add chest in Map 17
      if (this.id === 17) {
        this.decoGrid[6 * this.width + 12] = this.DECOS.CHEST;
      }

      // Add a natural erosion pass to cave walls for GBA organic feel
      const tempWalls = [...this.decoGrid];
      for (let y = 1; y < this.height - 1; y++) {
        for (let x = 1; x < this.width - 1; x++) {
          const idx = y * this.width + x;
          if (tempWalls[idx] === this.DECOS.EMPTY) {
            if (Math.random() < 0.18) {
              let wallNeighbors = 0;
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (tempWalls[(y + dy) * this.width + (x + dx)] === this.DECOS.WALL) {
                    wallNeighbors++;
                  }
                }
              }
              if (wallNeighbors >= 2) {
                this.decoGrid[idx] = this.DECOS.WALL;
              }
            }
          } else {
            if (Math.random() < 0.15) {
              let emptyNeighbors = 0;
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (tempWalls[(y + dy) * this.width + (x + dx)] === this.DECOS.EMPTY) {
                    emptyNeighbors++;
                  }
                }
              }
              if (emptyNeighbors >= 3) {
                this.decoGrid[idx] = this.DECOS.EMPTY;
              }
            }
          }
        }
      }

      // Guarantee spawn area and warps are completely empty
      for (const w of this.warps) {
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = w.x + dx;
            const ny = w.y + dy;
            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
              this.decoGrid[ny * this.width + nx] = this.DECOS.EMPTY;
            }
          }
        }
      }

      if (this.type === 'lava_cave') {
        // Place lava pools in specific chambers away from paths
        for (let y = 12; y < 18; y++) {
          for (let x = 8; x < 14; x++) {
            this.baseGrid[y * this.width + x] = this.TILES.LAVA;
            this.decoGrid[y * this.width + x] = this.DECOS.EMPTY;
          }
          for (let x = 26; x < 32; x++) {
            this.baseGrid[y * this.width + x] = this.TILES.LAVA;
            this.decoGrid[y * this.width + x] = this.DECOS.EMPTY;
          }
        }
      }
    } 
    
    else if (this.type === 'volcano' || this.type === 'volcano_peaks') {
      this.baseGrid.fill(this.TILES.STONE); // Obsidian rock fields

      // Lava channels with crossings (bridges)
      for (let y = 0; y < this.height; y++) {
        if ((y >= 37 && y <= 43) || (y >= 12 && y <= 18)) continue;

        const lx = Math.floor(35 + Math.sin(y * 0.1) * 8);
        for (let x = lx - 3; x <= lx + 3; x++) {
          this.baseGrid[y * this.width + x] = this.TILES.LAVA;
        }
      }

      // Daksha's Forge fortress on ascent path
      if (this.id === 10) {
        this.carveRedHouse(57, 21);

        // Roads
        this.carvePath(1, 40, 78, 40, 2);
        this.carvePath(50, 40, 60, 25, 2);
        this.carvePath(60, 25, 40, 9, 2);
      }

      // Scatter basalt rocks organically
      for (let y = 2; y < this.height - 2; y++) {
        for (let x = 2; x < this.width - 2; x++) {
          const idx = y * this.width + x;
          if (this.baseGrid[idx] === this.TILES.STONE && this.decoGrid[idx] === this.DECOS.EMPTY) {
            let nearPath = false;
            for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                  const targetTile = this.baseGrid[ny * this.width + nx];
                  if (targetTile === this.TILES.DIRT || targetTile === this.TILES.LAVA) {
                    nearPath = true;
                    break;
                  }
                }
              }
              if (nearPath) break;
            }
            if (!nearPath && Math.random() < 0.08) {
              this.decoGrid[idx] = this.DECOS.WALL;
            }
          }
        }
      }
    } 
    
    else if (this.type === 'coastal' || this.type === 'beach') {
      this.baseGrid.fill(this.TILES.SAND);

      // Coastal water bays
      for (let y = 0; y < this.height; y++) {
        for (let x = 50; x < this.width; x++) {
          this.baseGrid[y * this.width + x] = this.TILES.WATER;
        }
      }

      // Ruined ancient pillars in water
      for (let i = 0; i < this.baseGrid.length; i++) {
        const x = i % this.width;
        if (this.baseGrid[i] === this.TILES.WATER && Math.random() < 0.05 && x > 55) {
          this.decoGrid[i] = this.DECOS.RUINED_COL;
        }
      }
    } 
    
    else if (this.type === 'snow_pass' || this.type === 'summit') {
      this.baseGrid.fill(this.TILES.SAND); // Sand acts as snow under GBA textures
      
      // Ice patch sliding sheets
      for (let y = 15; y < 25; y++) {
        for (let x = 20; x < 40; x++) {
          const idx = y * this.width + x;
          this.baseGrid[idx] = this.TILES.WATER; // Water acts as ice
          this.decoGrid[idx] = this.DECOS.BRIDGE; // ice overlay board
        }
      }

      // Cabin house on Snowy pass
      if (this.id === 18) {
        this.carveGreenHouse(30, 16);

        // Snowy roads
        this.carvePath(78, 40, 30, 21, 2);
        this.carvePath(30, 21, 20, 1, 2);
      }

      // Altar relic chest on Silent Peak Summit
      if (this.id === 20) {
        this.decoGrid[10 * this.width + 20] = this.DECOS.CHEST;
      }

      // Scatter pine trees on snow pass organically
      for (let y = 2; y < this.height - 2; y++) {
        for (let x = 2; x < this.width - 2; x++) {
          const idx = y * this.width + x;
          if (this.baseGrid[idx] === this.TILES.SAND && this.decoGrid[idx] === this.DECOS.EMPTY) {
            let nearPathOrIce = false;
            for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                  const targetIdx = ny * this.width + nx;
                  if (
                    this.baseGrid[targetIdx] === this.TILES.DIRT || 
                    this.baseGrid[targetIdx] === this.TILES.WATER ||
                    this.ruinsGrid[targetIdx] > 0
                  ) {
                    nearPathOrIce = true;
                    break;
                  }
                }
              }
              if (nearPathOrIce) break;
            }
            if (!nearPathOrIce && Math.random() < 0.12) {
              this.decoGrid[idx] = this.DECOS.TREE; // Pine tree
            }
          }
        }
      }
    } 
    
    else if (this.type === 'temple' || this.type === 'temple_altar') {
      this.baseGrid.fill(this.TILES.STONE); // Marble paving
      
      // Draw grand columns
      for (let y = 10; y < this.height - 10; y += 10) {
        for (let x = 10; x < this.width - 10; x += 10) {
          const idx = y * this.width + x;
          this.decoGrid[idx] = this.DECOS.TEMPLE_WALL;
        }
      }

      if (this.type === 'temple_altar') {
        // Altar pedestal in center
        this.decoGrid[40 * this.width + 40] = this.DECOS.ALTAR;
      }
    } 
    
    else if (this.type === 'void') {
      this.baseGrid.fill(this.TILES.WATER); // cosmic background void
      
      // Draw floating stone pathways
      for (let y = 10; y < this.height - 10; y++) {
        const px = Math.floor(this.width/2);
        for (let x = px - 3; x <= px + 3; x++) {
          this.baseGrid[y * this.width + x] = this.TILES.STONE;
        }
      }
    }

    // 2. Automate Boundary tree/rock limits for outdoor maps
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        
        // Outermost 2 tiles are borders
        const isBorder = x <= 1 || x >= this.width - 2 || y <= 1 || y >= this.height - 2;
        
        // Skip warp zones
        const isWarp = this.warps.some(w => Math.abs(w.x - x) <= 1 && Math.abs(w.y - y) <= 1);
        
        if (isBorder && !isWarp) {
          if (this.type === 'village' || this.type === 'forest' || this.type === 'dense_forest') {
            this.decoGrid[idx] = this.DECOS.TREE;
          } else if (this.type === 'volcano' || this.type === 'volcano_peaks' || this.type === 'cave' || this.type === 'lava_cave') {
            this.decoGrid[idx] = this.DECOS.WALL;
          } else if (this.type === 'snow_pass' || this.type === 'summit') {
            this.decoGrid[idx] = this.DECOS.WALL; // pine/rock walls
          } else if (this.type === 'temple' || this.type === 'temple_altar') {
            this.decoGrid[idx] = this.DECOS.TEMPLE_WALL;
          } else if (this.type === 'void') {
            this.baseGrid[idx] = this.TILES.WATER; // floating limit
          }
        }
      }
    }
  }

  carveHouse(sx, sy, w, h) {
    for (let y = sy; y < sy + h; y++) {
      for (let x = sx; x < sx + w; x++) {
        const idx = y * this.width + x;
        if (y === sy) {
          // Roof tiles
          this.ruinsGrid[idx] = 1;
        } else {
          // Wall tiles
          this.ruinsGrid[idx] = 3;
        }
      }
    }
  }

  carveAshram(sx, sy) {
    const w = 7;
    const h = 6;
    const startCol = 0;
    const startRow = 6;
    for (let dr = 0; dr < h; dr++) {
      for (let dc = 0; dc < w; dc++) {
        const c = startCol + dc;
        const r = startRow + dr;
        const idx = (sy + dr) * this.width + (sx + dc);
        this.ruinsGrid[idx] = r * 114 + c + 1;
      }
    }
  }

  carveGreenHouse(sx, sy) {
    const w = 6;
    const h = 6;
    const startCol = 24;
    const startRow = 17;
    for (let dr = 0; dr < h; dr++) {
      for (let dc = 0; dc < w; dc++) {
        const c = startCol + dc;
        const r = startRow + dr;
        const idx = (sy + dr) * this.width + (sx + dc);
        this.ruinsGrid[idx] = r * 114 + c + 1;
      }
    }
  }

  carveRedHouse(sx, sy) {
    const w = 12;
    const h = 5;
    const startCol = 16;
    const startRow = 23;
    for (let dr = 0; dr < h; dr++) {
      for (let dc = 0; dc < w; dc++) {
        const c = startCol + dc;
        const r = startRow + dr;
        const idx = (sy + dr) * this.width + (sx + dc);
        this.ruinsGrid[idx] = r * 114 + c + 1;
      }
    }
  }

  carvePath(x1, y1, x2, y2, width = 2) {
    let curX = x1;
    let curY = y1;
    const carve = (cx, cy) => {
      for (let dy = 0; dy < width; dy++) {
        for (let dx = 0; dx < width; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
            this.baseGrid[ny * this.width + nx] = this.TILES.DIRT;
          }
        }
      }
    };

    while (curX !== x2 || curY !== y2) {
      carve(curX, curY);
      if (curX !== x2) curX += Math.sign(x2 - curX);
      else curY += Math.sign(y2 - curY);
    }
    carve(curX, curY);
  }

  isCollidable(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
    const idx = y * this.width + x;
    
    // Allow walking on warp tiles (doorways/transitions)
    const isWarp = this.warps.some(w => w.x === x && w.y === y);
    if (isWarp) {
      return false;
    }

    // Check if within the 3x3 shrine collision box
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x - dx;
        const ny = y - dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          if (this.decoGrid[ny * this.width + nx] === this.DECOS.SHRINE) {
            if (x === nx && y === ny + 1) {
              // Walkable door/warp
              continue;
            }
            return true;
          }
        }
      }
    }

    // Check water (unless it's a bridge)
    if (this.baseGrid[idx] === this.TILES.WATER && this.decoGrid[idx] !== this.DECOS.BRIDGE) {
      return true;
    }

    // Check collision decos
    const deco = this.decoGrid[idx];
    if (
      deco === this.DECOS.TREE || 
      deco === this.DECOS.WALL || 
      deco === this.DECOS.TEMPLE_WALL || 
      deco === this.DECOS.RUINED_COL ||
      deco === this.DECOS.CHEST
    ) {
      return true;
    }

    // Check ruins/buildings overlays (walls/roofs collide)
    if (this.ruinsGrid[idx] > 0) {
      return true;
    }

    return false;
  }

  drawGBATile(ctx, tileIndex, dx, dy) {
    const col = (tileIndex - 1) % 114;
    const row = Math.floor((tileIndex - 1) / 114);
    
    const srcX = col * 17;
    const srcY = row * 17;
    
    ctx.drawImage(
      this.tileSheet,
      srcX, srcY, 16, 16, // source
      Math.round(dx), Math.round(dy), this.tileSize, this.tileSize // destination
    );
  }

  getTileIndexForType(type) {
    switch(type) {
      case this.TILES.WATER:     return spTile(94, 0);   // idx 95 — blue water
      case this.TILES.GRASS:     return spTile(1, 0);     // idx 2 — rich green grass
      case this.TILES.SAND:      return spTile(63, 6);    // idx 748 — tan sand
      case this.TILES.DIRT:      return this.type === 'interior' ? this.floorTile : spTile(43, 4); // idx 500 — brown dirt
      case this.TILES.STONE:     return spTile(40, 0);    // idx 41 — neutral gray stone
      case this.TILES.LAVA:      return spTile(6, 109);   // idx 12433 — red lava
      case this.TILES.CORRUPTED: return spTile(14, 1);    // idx 129 — dark red corrupted
      case this.TILES.SNOW:      return spTile(20, 0);    // idx 21 — white snow
      case this.TILES.ICE:       return spTile(33, 1);    // idx 148 — purple ice
      case this.TILES.VOID:      return spTile(71, 8);    // idx 984 — near-black void
      default:                   return spTile(1, 0);     // default to grass
    }
  }

  draw(ctx, camera) {
    const camTileX = Math.floor(camera.x / this.tileSize);
    const camTileY = Math.floor(camera.y / this.tileSize);

    const tilesW = Math.ceil(camera.width / this.tileSize) + 2;
    const tilesH = Math.ceil(camera.height / this.tileSize) + 2;

    const offsetX = Math.round(-(camera.x - camTileX * this.tileSize));
    const offsetY = Math.round(-(camera.y - camTileY * this.tileSize));

    for (let y = 0; y < tilesH; y++) {
      for (let x = 0; x < tilesW; x++) {
        const mapX = camTileX + x;
        const mapY = camTileY + y;
        if (mapX < 0 || mapX >= this.width || mapY < 0 || mapY >= this.height) continue;

        const idx = mapY * this.width + mapX;
        const px = offsetX + x * this.tileSize;
        const py = offsetY + y * this.tileSize;

        const tile = this.baseGrid[idx];
        this.drawGBATile(ctx, this.getTileIndexForType(tile), px, py);

        const structure = this.ruinsGrid[idx];
        if (structure > 0) {
          this.drawGBATile(ctx, structure, px, py);
        }

        const deco = this.decoGrid[idx];
        if (deco !== this.DECOS.EMPTY) {
          this.drawDeco(ctx, deco, px, py);
        }
      }
    }
  }

  invalidateCache() {
    // Cache is deprecated for direct hardware-accelerated canvas drawing
  }

  drawDeco(ctx, deco, px, py) {
    if (deco === this.DECOS.SHRINE) {
      const ts = this.tileSize;
      // Draw 3x3 red-roof building (Cols 1,2,3 of Rows 5,6,7 starting at 307 on 61-col)
      this.drawGBATile(ctx, convert61to114(307), px - ts, py - ts);
      this.drawGBATile(ctx, convert61to114(308), px, py - ts);
      this.drawGBATile(ctx, convert61to114(309), px + ts, py - ts);
      this.drawGBATile(ctx, convert61to114(368), px - ts, py);
      this.drawGBATile(ctx, convert61to114(369), px, py);
      this.drawGBATile(ctx, convert61to114(370), px + ts, py);
      this.drawGBATile(ctx, convert61to114(429), px - ts, py + ts);
      this.drawGBATile(ctx, convert61to114(430), px, py + ts);
      this.drawGBATile(ctx, convert61to114(431), px + ts, py + ts);
    } else {
      this.drawGBATile(ctx, deco, px, py);
    }
  }

  updateEpochOverlays(epochId) {
    let targetSrc = 'assets/images/sprites.png';
    if (epochId >= 6) {
      targetSrc = 'assets/images/sprites_corrupted.png';
    } else if (epochId >= 4) {
      targetSrc = 'assets/images/sprites_autumn.png';
    }
    
    const currentSrc = this.tileSheet.src;
    if (currentSrc.indexOf(targetSrc) === -1) {
      this.tileSheet.src = targetSrc;
      this._cacheCamTileX = -1;
      this._cacheCamTileY = -1;
    }
  }
}
