// GBA-Style Multi-Map Engine
// Generates and manages layouts, decoration layers, and collision checks for all 22 maps

import { MAPS_CONFIG } from '../data/maps.js';
import {
  TILE_SHEET, TILE_SHEET_AUTUMN, TILE_SHEET_CORRUPTED,
  GRID_COLS, TILE_STRIDE, TILE_SRC,
  BASE_TILES, DECO_TILES, SHRINE_3x3, INTERIOR_FLOOR, INTERIOR_WALL,
  COLLIDABLE_DECOS, HOUSE_TILES
} from '../data/tiles.js';

// Tiles are 1-based indices into backgrounds.png (61-col, 17px-stride grid).
// See js/data/tiles.js for the verified mapping.

// Shared tile sheet — all TileMap instances reuse this single Image
const _sharedTileSheet = new Image();
_sharedTileSheet.src = TILE_SHEET;
_sharedTileSheet.onerror = () => console.warn(`Failed to load tile sheet: ${TILE_SHEET}`);
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
    this.floorTile = config.floorTile || INTERIOR_FLOOR;
    this.wallTile = config.wallTile || INTERIOR_WALL;

    // Grid arrays: base tiles (ground) and decoration tiles (obstacles/events)
    this.baseGrid = [];
    this.decoGrid = [];
    this.ruinsGrid = []; // Overlays/Houses

    // Logical terrain types (enum) — mapped to sheet indices in getTileIndexForType
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

    // Verified decoration indices into backgrounds.png (61-col grid). See js/data/tiles.js
    this.DECOS = { ...DECO_TILES };

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
      // Hand-authored Suryanagar: houses sit on the map's warp tiles so the
      // visible door is exactly where the player transitions. (Map 1 warps:
      // 12,24 -> Ashram | 34,28 -> Farmhouse | 56,32 -> Hut)
      const W = this.width;
      this.baseGrid.fill(this.TILES.GRASS);

      // --- River along the far west (sandy banks added later by shorePass) ---
      for (let y = 0; y < this.height; y++) {
        const rx = Math.floor(7 + Math.sin(y * 0.12) * 2);
        for (let x = rx - 2; x <= rx + 2; x++) {
          if (x >= 0 && x < W) this.baseGrid[y * W + x] = this.TILES.WATER;
        }
      }

      // --- Central plaza (stone) with a well ---
      const sqX = 36, sqY = 40, sqW = 9, sqH = 9;
      for (let y = sqY; y < sqY + sqH; y++)
        for (let x = sqX; x < sqX + sqW; x++)
          this.baseGrid[y * W + x] = this.TILES.STONE;
      this.decoGrid[(sqY + 4) * W + (sqX + 4)] = this.DECOS.RUINED_COL; // well

      // --- Roofed houses whose doors land on the warps ---
      this.placeHouse(12, 24); // Bhrigu's Ashram
      this.placeHouse(34, 28); // Reva's Farmhouse
      this.placeHouse(56, 32); // Village Hut

      // --- Paths: south spawn -> plaza -> north exit (split around plaza) ---
      this.carvePath(40, 70, 40, sqY + sqH, 2);   // spawn up to plaza south
      this.carvePath(40, sqY - 1, 40, 1, 2);       // plaza north to grove exit
      // Branches to each house doormat
      this.carvePath(12, 25, 12, 44, 2); this.carvePath(12, 44, sqX, 44, 2);
      this.carvePath(34, 29, 34, sqY, 2);
      this.carvePath(56, 33, 56, 44, 2); this.carvePath(sqX + sqW - 1, 44, 56, 44, 2);
      // East trails to the volcano (78,36) and coast (78,25) exits
      this.carvePath(sqX + sqW, 44, 78, 36, 2);
      this.carvePath(62, 36, 78, 25, 2);

      // --- Farm crops (northeast) + access path ---
      for (let y = 8; y <= 15; y++)
        for (let x = 50; x <= 60; x++)
          this.decoGrid[y * W + x] = this.DECOS.CROPS;
      this.carvePath(45, 40, 55, 16, 2);

      // --- Signs & lanterns ---
      this.decoGrid[(sqY + sqH) * W + sqX] = this.DECOS.SIGNBOARD;
      this.decoGrid[68 * W + 40] = this.DECOS.SIGNBOARD; // entrance sign
      for (const ly of [50, 56, 62]) {
        this.decoGrid[ly * W + 38] = this.DECOS.RUINED_COL;
        this.decoGrid[ly * W + 42] = this.DECOS.RUINED_COL;
      }

      // --- Spawn stone pad at south entrance ---
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          this.baseGrid[(70 + dy) * W + (40 + dx)] = this.TILES.STONE;
          this.decoGrid[(70 + dy) * W + (40 + dx)] = this.DECOS.EMPTY;
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

      // Vashistha's Hermitage in the grove — door on warp (16,21)
      if (this.type === 'forest') {
        this.placeHouse(16, 21);
        // Carve connection path from Hermitage door to the main trail
        this.carvePath(16, 22, 50, 22, 2);
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

      // Daksha's Forge fortress on ascent path — door on warp (60,25)
      if (this.id === 10) {
        this.placeHouse(60, 25);

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
      this.baseGrid.fill(this.TILES.SNOW); // white snow ground
      
      // Ice patch sliding sheets
      for (let y = 15; y < 25; y++) {
        for (let x = 20; x < 40; x++) {
          const idx = y * this.width + x;
          this.baseGrid[idx] = this.TILES.WATER; // Water acts as ice
          this.decoGrid[idx] = this.DECOS.BRIDGE; // ice overlay board
        }
      }

      // Cabin house on Snowy pass — door on warp (30,21)
      if (this.id === 18) {
        this.placeHouse(30, 21);

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
          if (this.baseGrid[idx] === this.TILES.SNOW && this.decoGrid[idx] === this.DECOS.EMPTY) {
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

    // 3. Soften terrain edges (sand shore around water) and scatter natural decor
    const outdoor = ['village', 'forest', 'dense_forest', 'shrine', 'coastal', 'beach', 'volcano', 'volcano_peaks'];
    if (outdoor.includes(this.type)) {
      if (this.type === 'village' || this.type === 'coastal' || this.type === 'beach') {
        this.shorePass();
      }
      this.naturePass();
    }
  }

  // Deterministic per-tile pseudo-random in [0,1) — keeps maps stable across reloads
  rand(x, y, salt = 0) {
    const n = Math.sin((x * 127.1 + y * 311.7 + salt * 74.7) ) * 43758.5453;
    return n - Math.floor(n);
  }

  // Add a 1-tile sand shore where grass meets water → removes hard blocky edges
  shorePass() {
    const W = this.width, H = this.height;
    const toSand = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x;
        if (this.baseGrid[idx] !== this.TILES.GRASS) continue;
        if (this.decoGrid[idx] !== this.DECOS.EMPTY) continue;
        let nearWater = false;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < W && ny >= 0 && ny < H &&
              this.baseGrid[ny * W + nx] === this.TILES.WATER) { nearWater = true; break; }
        }
        if (nearWater) toSand.push(idx);
      }
    }
    for (const idx of toSand) this.baseGrid[idx] = this.TILES.SAND;
  }

  // Layered scatter of decor with spacing rules:
  //  - decorative cover (flowers/bush/tuft, walkable) only on open grass
  //  - obstacles (rock, extra trees) kept clear of paths, warps and buildings
  naturePass() {
    const W = this.width, H = this.height;
    const isOpenGrass = (x, y) => {
      if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) return false;
      const idx = y * W + x;
      return this.baseGrid[idx] === this.TILES.GRASS &&
             this.decoGrid[idx] === this.DECOS.EMPTY &&
             this.ruinsGrid[idx] === 0;
    };
    const nearWarp = (x, y) => this.warps.some(w => Math.abs(w.x - x) <= 2 && Math.abs(w.y - y) <= 2);
    // A tile is "clear" for an obstacle if no path/building/warp sits within `r`
    const clearForObstacle = (x, y, r) => {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          const i = ny * W + nx;
          if (this.baseGrid[i] === this.TILES.DIRT) return false;      // path
          if (this.ruinsGrid[i] > 0) return false;                     // building
          if (this.decoGrid[i] === this.DECOS.WALL) return false;      // structure wall
        }
      }
      return !nearWarp(x, y);
    };

    for (let y = 2; y < H - 2; y++) {
      for (let x = 2; x < W - 2; x++) {
        if (!isOpenGrass(x, y)) continue;
        const idx = y * W + x;
        const r = this.rand(x, y, this.id);

        // Clustered obstacle decor (extra trees / rocks) away from paths & buildings
        if (clearForObstacle(x, y, 1)) {
          const clump = Math.sin(x * 0.25) * Math.sin(y * 0.25); // smooth clumps
          if (this.type === 'forest' || this.type === 'dense_forest') continue; // forests handle their own trees
          if (clump > 0.6 && r < 0.14) { this.decoGrid[idx] = this.DECOS.TREE_ALT; continue; }
          // sparse rocks, lightly clustered (avoids the "rocks everywhere" noise)
          if (clump < -0.5 && r > 0.965) { this.decoGrid[idx] = this.DECOS.ROCK; continue; }
        }

        // Decorative ground cover (walkable) — denser near the open grass, sparse overall
        const r2 = this.rand(x, y, this.id + 99);
        if (r2 < 0.020) this.decoGrid[idx] = this.DECOS.FLOWER;
        else if (r2 < 0.045) this.decoGrid[idx] = this.DECOS.TUFT;
        else if (r2 < 0.055) this.decoGrid[idx] = this.DECOS.BUSH;
      }
    }
  }

  // Stamp a 3-tall roofed house exterior whose door sits at (doorX, doorY).
  // The whole footprint goes into ruinsGrid (collidable); the door tile is
  // walkable only because (doorX, doorY) is also a warp coordinate.
  placeHouse(doorX, doorY, w = 4) {
    const W = this.width, H = this.height, h = 3, doorLocal = 1;
    const left = doorX - doorLocal;
    const top = doorY - (h - 1);
    const HT = HOUSE_TILES;
    for (let row = 0; row < h; row++) {
      const y = top + row;
      if (y < 0 || y >= H) continue;
      for (let col = 0; col < w; col++) {
        const x = left + col;
        if (x < 0 || x >= W) continue;
        const idx = y * W + x;
        let tile;
        if (row === 0) tile = col === 0 ? HT.ROOF_L : col === w - 1 ? HT.ROOF_R : HT.ROOF_M[col % 2];
        else if (row === 1) tile = col === 0 ? HT.EAVE_L : col === w - 1 ? HT.EAVE_R : HT.EAVE_M[col % 2];
        else tile = col === 0 ? HT.WALL_L : col === w - 1 ? HT.WALL_R : HT.WALL_M[col % 2];
        if (row === h - 1 && x === doorX) tile = HT.DOOR;
        this.ruinsGrid[idx] = tile;
        this.decoGrid[idx] = this.DECOS.EMPTY; // keep trees/decor off the house
      }
    }
    // Doormat path tile in front of the door
    if (doorY + 1 < H) this.baseGrid[(doorY + 1) * W + doorX] = this.TILES.DIRT;
  }

  carveHouse(sx, sy, w, h) {
    this.carveBuilding(sx, sy, w, h, null);
  }

  carveBuilding(sx, sy, w, h, interiorDeco) {
    const doorX = sx + Math.floor(w / 2);
    for (let y = sy; y < sy + h; y++) {
      for (let x = sx; x < sx + w; x++) {
        const idx = y * this.width + x;
        const isPerim = y === sy || y === sy + h - 1 || x === sx || x === sx + w - 1;
        const isDoor = x === doorX && y === sy + h - 1;
        if (isPerim && !isDoor) {
          this.decoGrid[idx] = this.DECOS.WALL;
        } else {
          this.baseGrid[idx] = this.TILES.DIRT;
        }
      }
    }
    if (interiorDeco) {
      const ix = sx + Math.floor(w / 2);
      const iy = sy + 1;
      this.decoGrid[iy * this.width + ix] = interiorDeco;
    }
  }

  carveAshram(sx, sy) {
    this.carveBuilding(sx, sy, 7, 6, this.DECOS.ALTAR);
  }

  carveGreenHouse(sx, sy) {
    this.carveBuilding(sx, sy, 6, 6, this.DECOS.BOOKSHELF);
  }

  carveRedHouse(sx, sy) {
    this.carveBuilding(sx, sy, 8, 5, this.DECOS.FORGE);
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

    // Check collision decos (trees, walls, rocks, columns, chests — see tiles.js)
    const deco = this.decoGrid[idx];
    if (COLLIDABLE_DECOS.includes(deco)) {
      return true;
    }

    // Check ruins/buildings overlays (walls/roofs collide)
    if (this.ruinsGrid[idx] > 0) {
      return true;
    }

    return false;
  }

  drawGBATile(ctx, tileIndex, dx, dy) {
    if (!tileIndex || tileIndex < 1) return;
    const col = (tileIndex - 1) % GRID_COLS;
    const row = Math.floor((tileIndex - 1) / GRID_COLS);

    const srcX = col * TILE_STRIDE;
    const srcY = row * TILE_STRIDE;

    ctx.drawImage(
      this.tileSheet,
      srcX, srcY, TILE_SRC, TILE_SRC, // source
      Math.round(dx), Math.round(dy), this.tileSize, this.tileSize // destination
    );
  }

  getTileIndexForType(type) {
    switch(type) {
      case this.TILES.WATER:     return BASE_TILES.WATER;
      case this.TILES.GRASS:     return BASE_TILES.GRASS;
      case this.TILES.SAND:      return BASE_TILES.SAND;
      case this.TILES.DIRT:      return this.type === 'interior' ? this.floorTile : BASE_TILES.DIRT;
      case this.TILES.STONE:     return BASE_TILES.STONE;
      case this.TILES.LAVA:      return BASE_TILES.LAVA;
      case this.TILES.CORRUPTED: return BASE_TILES.CORRUPTED;
      case this.TILES.SNOW:      return BASE_TILES.SNOW;
      case this.TILES.ICE:       return BASE_TILES.ICE;
      case this.TILES.VOID:      return BASE_TILES.VOID;
      default:                   return BASE_TILES.GRASS;
    }
  }

  draw(ctx, camera) {
    // Avoid drawing from a not-yet-decoded tile sheet (blank/garbled first frames)
    if (!_sharedTileSheetReady && !this.tileSheet.complete) {
      ctx.fillStyle = this.color || '#0d2b1e';
      ctx.fillRect(0, 0, camera.width, camera.height);
      return;
    }

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

    // Per-region ambient palette — multiply-blend a mood color over the tiles
    // only (entities are drawn afterwards by the game loop, so they stay clean).
    const tint = this.getAmbientTint();
    if (tint) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, camera.width, camera.height);
      ctx.restore();
    }
  }

  // Mood color per map type (null = no tint). Multiply blend, so lighter colors
  // tint subtly and darker colors deepen the scene.
  getAmbientTint() {
    switch (this.type) {
      case 'volcano':
      case 'volcano_peaks':
      case 'lava_cave':   return 'rgba(150, 70, 55, 0.85)';   // dark, hot, basalt
      case 'cave':
      case 'cave_vault':  return 'rgba(70, 80, 120, 0.7)';    // cool dim cavern
      case 'snow_pass':
      case 'summit':      return 'rgba(200, 215, 245, 0.9)';  // cold blue-white
      case 'void':        return 'rgba(120, 80, 180, 0.7)';   // astral violet
      case 'forest':
      case 'dense_forest':return 'rgba(180, 205, 175, 0.92)'; // shaded green
      case 'coastal':
      case 'beach':       return 'rgba(255, 240, 205, 0.95)'; // warm coast
      case 'temple':
      case 'temple_altar':return 'rgba(245, 235, 215, 0.96)'; // pale alabaster
      default:            return null;                        // village/interior: untinted
    }
  }

  invalidateCache() {
    // Cache is deprecated for direct hardware-accelerated canvas drawing
  }

  drawDeco(ctx, deco, px, py) {
    if (deco === this.DECOS.SHRINE) {
      const ts = this.tileSize;
      const s = SHRINE_3x3;
      this.drawGBATile(ctx, s[0], px - ts, py - ts);
      this.drawGBATile(ctx, s[1], px, py - ts);
      this.drawGBATile(ctx, s[2], px + ts, py - ts);
      this.drawGBATile(ctx, s[3], px - ts, py);
      this.drawGBATile(ctx, s[4], px, py);
      this.drawGBATile(ctx, s[5], px + ts, py);
      this.drawGBATile(ctx, s[6], px - ts, py + ts);
      this.drawGBATile(ctx, s[7], px, py + ts);
      this.drawGBATile(ctx, s[8], px + ts, py + ts);
    } else {
      this.drawGBATile(ctx, deco, px, py);
    }
  }

  updateEpochOverlays(epochId) {
    let targetSrc = TILE_SHEET;
    if (epochId >= 6) {
      targetSrc = TILE_SHEET_CORRUPTED;
    } else if (epochId >= 4) {
      targetSrc = TILE_SHEET_AUTUMN;
    }
    
    const currentSrc = this.tileSheet.src;
    if (currentSrc.indexOf(targetSrc) === -1) {
      this.tileSheet.src = targetSrc;
      this._cacheCamTileX = -1;
      this._cacheCamTileY = -1;
    }
  }
}
