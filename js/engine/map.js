// GBA-Style Multi-Map Engine
// Generates and manages layouts, decoration layers, and collision checks for all 22 maps

import { MAPS_CONFIG } from '../data/maps.js';

// sprites.png tile index — direct 1-based index into 114-col grid

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
    this.floorTile = config.floorTile || 1964;
    this.wallTile = config.wallTile || 127;

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
      TREE: 801,
      WALL: 127,
      TEMPLE_WALL: 668,
      BRIDGE: 1964,
      ALTAR: 668,
      SHRINE: 1400,
      RUINED_COL: 668,
      PORTAL: 95,
      CROPS: 801,
      FORGE: 127,
      BOOKSHELF: 1964,
      SIGNBOARD: 1964,
      CHEST: 1964
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

      // --- River on the left side ---
      for (let y = 0; y < this.height; y++) {
        const rx = Math.floor(15 + Math.sin(y * 0.12) * 3);
        for (let x = rx - 3; x <= rx + 3; x++) {
          if (x >= 0 && x < this.width) {
            this.baseGrid[y * this.width + x] = this.TILES.WATER;
          }
        }
        if (rx - 4 >= 0) this.baseGrid[y * this.width + (rx - 4)] = this.TILES.SAND;
        if (rx + 4 < this.width) this.baseGrid[y * this.width + (rx + 4)] = this.TILES.SAND;
      }

      // --- Bridge crossing the river (y=38..42) ---
      const bridgeY = 40;
      const bridgeRx = Math.floor(15 + Math.sin(bridgeY * 0.12) * 3);
      for (let y = bridgeY - 2; y <= bridgeY + 2; y++) {
        for (let x = bridgeRx - 3; x <= bridgeRx + 3; x++) {
          this.baseGrid[y * this.width + x] = this.TILES.GRASS;
          this.decoGrid[y * this.width + x] = this.DECOS.BRIDGE;
        }
      }

      // --- Central village square (stone floor) ---
      const sqX = 32, sqY = 32, sqW = 10, sqH = 10;
      for (let y = sqY; y < sqY + sqH; y++) {
        for (let x = sqX; x < sqX + sqW; x++) {
          this.baseGrid[y * this.width + x] = this.TILES.STONE;
        }
      }

      // Well at square center
      this.decoGrid[(sqY + 5) * this.width + (sqX + 5)] = this.DECOS.RUINED_COL;

      // --- Buildings around the square ---
      // Ashram (hermitage) — north of square
      this.carveAshram(sqX + 1, sqY - 8);

      // Green house — east of square
      this.carveGreenHouse(sqX + sqW + 3, sqY + 1);

      // Red house (forge) — south-east of square
      this.carveRedHouse(sqX + sqW + 2, sqY + sqH + 3);

      // --- Paths connecting entrance → square → buildings ---
      // Main south path: entrance to square
      this.carvePath(40, 68, 40, sqY + sqH, 2);
      // Path from square to ashram door
      this.carvePath(sqX + 4, sqY - 2, sqX + 4, sqY - 2, 2);
      // Path from square to green house door
      this.carvePath(sqX + sqW, sqY + 4, sqX + sqW + 3, sqY + 4, 2);
      // Path from square to red house door
      this.carvePath(sqX + sqW, sqY + sqH + 2, sqX + sqW + 2, sqY + sqH + 2, 2);
      // Path from square west to bridge
      this.carvePath(sqX, bridgeY, bridgeRx + 4, bridgeY, 2);

      // --- Farm area (northeast) ---
      for (let y = 8; y <= 16; y++) {
        for (let x = 50; x <= 60; x++) {
          this.decoGrid[y * this.width + x] = this.DECOS.CROPS;
        }
      }
      // Path to farm
      this.carvePath(sqX + 5, sqY, sqX + 5, 8, 2);

      // --- Market stalls near square ---
      this.decoGrid[(sqY - 1) * this.width + sqX] = this.DECOS.CHEST;
      this.decoGrid[(sqY - 1) * this.width + sqX + sqW - 1] = this.DECOS.CHEST;
      this.decoGrid[(sqY + sqH) * this.width + sqX] = this.DECOS.SIGNBOARD;
      this.decoGrid[(sqY + sqH) * this.width + sqX + sqW - 1] = this.DECOS.SIGNBOARD;

      // --- Trees framing the village ---
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const idx = y * this.width + x;
          if (this.baseGrid[idx] !== this.TILES.GRASS) continue;
          if (this.decoGrid[idx] !== this.DECOS.EMPTY) continue;
          const edgeDist = Math.min(x, this.width - 1 - x, y, this.height - 1 - y);
          if (edgeDist < 3 && Math.random() < 0.6) {
            this.decoGrid[idx] = this.DECOS.TREE;
          } else if (Math.random() < 0.03) {
            this.decoGrid[idx] = this.DECOS.TREE;
          }
        }
      }

      // --- Village entrance at south ---
      this.decoGrid[67 * this.width + 39] = this.DECOS.WALL;
      this.decoGrid[67 * this.width + 41] = this.DECOS.WALL;
      this.decoGrid[68 * this.width + 38] = this.DECOS.RUINED_COL;
      this.decoGrid[68 * this.width + 42] = this.DECOS.RUINED_COL;
      this.decoGrid[67 * this.width + 40] = this.DECOS.SIGNBOARD;

      // Spawn stone pad
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          this.baseGrid[(69 + dy) * this.width + (40 + dx)] = this.TILES.STONE;
          this.decoGrid[(69 + dy) * this.width + (40 + dx)] = this.DECOS.EMPTY;
        }
      }

      // Lanterns along main path
      for (const ly of [50, 55, 60, 65]) {
        this.decoGrid[ly * this.width + 39] = this.DECOS.RUINED_COL;
        this.decoGrid[ly * this.width + 41] = this.DECOS.RUINED_COL;
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
      case this.TILES.WATER:     return 95;
      case this.TILES.GRASS:     return 801;
      case this.TILES.SAND:      return 29;
      case this.TILES.DIRT:      return this.type === 'interior' ? this.floorTile : 1964;
      case this.TILES.STONE:     return 668;
      case this.TILES.LAVA:      return 127;
      case this.TILES.CORRUPTED: return 129;
      case this.TILES.SNOW:      return 21;
      case this.TILES.ICE:       return 148;
      case this.TILES.VOID:      return 984;
      default:                   return 801;
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
      this.drawGBATile(ctx, 573, px - ts, py - ts);
      this.drawGBATile(ctx, 574, px, py - ts);
      this.drawGBATile(ctx, 575, px + ts, py - ts);
      this.drawGBATile(ctx, 708, px - ts, py);
      this.drawGBATile(ctx, 1400, px, py);
      this.drawGBATile(ctx, 710, px + ts, py);
      this.drawGBATile(ctx, 843, px - ts, py + ts);
      this.drawGBATile(ctx, 844, px, py + ts);
      this.drawGBATile(ctx, 845, px + ts, py + ts);
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
