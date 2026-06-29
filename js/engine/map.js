// GBA-Style Multi-Map Engine
// Generates and manages layouts, decoration layers, and collision checks for all 22 maps

import { MAPS_CONFIG } from '../data/maps.js';
import {
  TILE_SHEET, TILE_SHEET_AUTUMN, TILE_SHEET_CORRUPTED,
  GRID_COLS, TILE_STRIDE, TILE_SRC,
  BASE_TILES, DECO_TILES, SHRINE_3x3, INTERIOR_FLOOR, INTERIOR_WALL,
  COLLIDABLE_DECOS, HOUSE_TILES
} from '../data/tiles.js';

// Tiles are 1-based indices into kenney_terrain.png (12-col, 16px-stride grid).
// See js/data/tiles.js for the mapping.

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

    // Decoration indices into kenney_terrain.png (12-col grid). See js/data/tiles.js
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
      // Organic Kenney-style village (40x40). No grid or right angles —
      // winding paths, clustered stone cottages, central plaza with well,
      // fenced garden plots, and market stalls.
      // Houses sit on warp tiles: Ashram (8,12) | Farmhouse (30,12) | Hut (8,28)
      // Exits: south shrine (19,38) | north grove (19,1) | east volcano (38,18) | east coast (38,30)
      const W = this.width;
      this.baseGrid.fill(this.TILES.GRASS);

      // 1. Winding stream along the far west bank
      for (let y = 0; y < this.height; y++) {
        const rx = Math.floor(3 + Math.sin(y * 0.18) * 1.4);
        for (let x = rx - 1; x <= rx + 1; x++) {
          if (x >= 0 && x < W) this.baseGrid[y * W + x] = this.TILES.WATER;
        }
      }

      // 2. Central organic stone plaza (oval, centred at ~20,20)
      const cx = 20, cy = 20;
      for (let y = 14; y < 26; y++) {
        for (let x = 14; x < 26; x++) {
          const dx = x - cx, dy = y - cy;
          const dist = Math.abs(dx) + Math.abs(dy) / 1.5;
          if (dist < 6) this.baseGrid[y * W + x] = this.TILES.STONE;
          else if (dist < 7.5 && this.rand(x, y, 1) > 0.4) this.baseGrid[y * W + x] = this.TILES.STONE;
        }
      }

      // 3. Winding stone path from spawn (19,36) up to the plaza
      this.carvePath(19, 36, 19, 34, 2, this.TILES.STONE);
      this.carvePath(19, 34, 18, 32, 2, this.TILES.STONE);
      this.carvePath(18, 32, 18, 30, 2, this.TILES.STONE);
      this.carvePath(18, 30, 19, 28, 2, this.TILES.STONE);
      this.carvePath(19, 28, 20, 26, 2, this.TILES.STONE);
      this.carvePath(20, 26, 20, 24, 2, this.TILES.STONE);

      // 4. Dirt paths from plaza to houses and exits with organic bends
      // Ashram path (plaza → west)
      this.carvePath(14, 20, 12, 20, 2, this.TILES.DIRT);
      this.carvePath(12, 20, 10, 18, 2, this.TILES.DIRT);
      this.carvePath(10, 18, 8, 15, 2, this.TILES.DIRT);
      // Farmhouse path (plaza → NE)
      this.carvePath(24, 18, 28, 16, 2, this.TILES.DIRT);
      this.carvePath(28, 16, 30, 14, 2, this.TILES.DIRT);
      // Hut path (plaza → SW)
      this.carvePath(14, 24, 12, 26, 2, this.TILES.DIRT);
      this.carvePath(12, 26, 10, 28, 2, this.TILES.DIRT);
      this.carvePath(10, 28, 8, 29, 2, this.TILES.DIRT);
      // North path (plaza → north exit 19,1)
      this.carvePath(20, 14, 20, 10, 2, this.TILES.DIRT);
      this.carvePath(20, 10, 19, 4, 2, this.TILES.DIRT);
      // East paths (plaza → volcano 38,18 and coast 38,30)
      this.carvePath(25, 18, 30, 18, 2, this.TILES.DIRT);
      this.carvePath(30, 18, 35, 18, 2, this.TILES.DIRT);
      this.carvePath(35, 18, 38, 18, 2, this.TILES.DIRT);
      this.carvePath(25, 22, 30, 25, 2, this.TILES.DIRT);
      this.carvePath(30, 25, 35, 28, 2, this.TILES.DIRT);
      this.carvePath(35, 28, 38, 30, 2, this.TILES.DIRT);

      // 5. Houses (Kenney stone building tiles via updated HOUSE_TILES)
      this.placeHouse(8, 12);   // Bhrigu's Ashram
      this.placeHouse(30, 12);  // Reva's Farmhouse
      this.placeHouse(8, 28);   // Village Hut

      // 6. Fenced garden plots near farmhouse (north of farmhouse)
      for (let x = 25; x <= 29; x++) {
        this.decoGrid[4 * W + x] = this.DECOS.FENCE;
        this.decoGrid[8 * W + x] = this.DECOS.FENCE;
      }
      for (let y = 5; y <= 7; y++) {
        this.decoGrid[y * W + 25] = this.DECOS.FENCE;
        this.decoGrid[y * W + 29] = this.DECOS.FENCE;
      }
      // Crops inside fenced garden
      for (let y = 5; y <= 7; y++)
        for (let x = 26; x <= 28; x++)
          this.decoGrid[y * W + x] = this.DECOS.CROPS;

      // 7. Market stalls (small 2-wide structures) around plaza
      this.decoGrid[16 * W + 25] = this.DECOS.WALL;
      this.decoGrid[16 * W + 26] = this.DECOS.WALL;
      this.decoGrid[17 * W + 25] = this.DECOS.WALL;
      this.decoGrid[17 * W + 26] = this.DECOS.WALL;

      // 8. Well / old shrine in plaza centre
      this.decoGrid[cy * W + cx] = this.DECOS.RUINED_COL;

      // 9. Decorative elements
      this.decoGrid[(cy + 3) * W + (cx - 2)] = this.DECOS.SIGNBOARD;
      this.decoGrid[(cy - 3) * W + (cx + 2)] = this.DECOS.SIGNBOARD;
      this.decoGrid[34 * W + 19] = this.DECOS.SIGNBOARD; // entrance sign

      // 10. Organic tree scatter along edges and between houses
      for (let y = 2; y < this.height - 2; y++) {
        for (let x = 2; x < this.width - 2; x++) {
          const idx = y * W + x;
          if (this.baseGrid[idx] !== this.TILES.GRASS) continue;
          if (this.decoGrid[idx] !== this.DECOS.EMPTY) continue;
          if (this.ruinsGrid[idx] !== 0) continue;
          const isWarp = this.warps.some(w => Math.abs(w.x - x) <= 2 && Math.abs(w.y - y) <= 2);
          if (isWarp) continue;
          const noise = Math.sin(x * 0.3) * Math.sin(y * 0.3);
          if (noise > 0.4 && this.rand(x, y, 1) > 0.6) this.decoGrid[idx] = this.DECOS.TREE;
        }
      }

      // 11. Spawn stone pad at south entrance (19,36)
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          this.baseGrid[(36 + dy) * W + (19 + dx)] = this.TILES.STONE;
          this.decoGrid[(36 + dy) * W + (19 + dx)] = this.DECOS.EMPTY;
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
      
      // Subtle winding trail down the middle (purely visual flavour)
      for (let y = 3; y < this.height - 3; y++) {
        const px = Math.floor(this.width / 2 + Math.sin(y * 0.25) * 4);
        for (let x = px - 1; x <= px + 1; x++) {
          this.baseGrid[y * this.width + x] = this.TILES.DIRT;
        }
      }

      // Map 6 — Sacred Grove: Hermitage + explicit trails to all four warps.
      // (door 12,28 | south 20,38 | north 20,1 | west 1,20)
      if (this.id === 6) {
        this.placeHouse(12, 28); // Vashistha's Hermitage
        this.carvePath(20, 38, 20, 1, 2);   // south <-> north avenue
        this.carvePath(20, 29, 12, 29, 2);  // avenue -> hermitage doormat
        this.carvePath(20, 20, 1, 20, 2);   // west exit to the snowy pass
      }

      // Map 8 — Canopy of Roots: avenue connects both warps (20,38)<->(20,1)
      if (this.id === 8) {
        this.carvePath(20, 38, 20, 1, 2);
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

      // Lava channel on the east flank, width-relative and clamped in-bounds.
      // The central y≈18-22 band is kept lava-free as the traversal corridor.
      for (let y = 0; y < this.height; y++) {
        if (y >= 18 && y <= 22) continue;
        const lx = Math.floor(this.width * 0.72 + Math.sin(y * 0.2) * 3);
        for (let x = lx - 2; x <= lx + 2; x++) {
          if (x >= 0 && x < this.width) this.baseGrid[y * this.width + x] = this.TILES.LAVA;
        }
      }

      // Map 10 — Volcanic Ascent: Daksha's Forge + roads to all four warps.
      // (west 1,20 | forge door 28,18 | north 20,1 | east 38,30)
      if (this.id === 10) {
        this.placeHouse(28, 18);
        this.carvePath(1, 20, 38, 20, 2);   // west <-> east main road
        this.carvePath(28, 20, 28, 19, 2);  // road -> forge doormat
        this.carvePath(20, 20, 20, 1, 2);   // road -> north lava-cave warp
        this.carvePath(20, 20, 38, 30, 2);  // road -> east crag-heights warp
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

      // Coastal water bays — right ~30% of the 40-wide map
      for (let y = 0; y < this.height; y++) {
        for (let x = 28; x < this.width; x++) {
          this.baseGrid[y * this.width + x] = this.TILES.WATER;
        }
      }

      // Ruined ancient pillars in water
      for (let i = 0; i < this.baseGrid.length; i++) {
        const x = i % this.width;
        if (this.baseGrid[i] === this.TILES.WATER && Math.random() < 0.05 && x > 30) {
          this.decoGrid[i] = this.DECOS.RUINED_COL;
        }
      }

      // Map 14 — Submerged Column Hall: paths connecting all three warps
      // (west 1,20 | sanctuary door 20,6 | east 38,20)
      if (this.id === 14) {
        this.carvePath(1, 20, 20, 20, 2);   // west entry to center
        this.carvePath(20, 20, 20, 6, 2);   // center up to sanctuary door
        this.carvePath(20, 20, 26, 20, 2);  // center to waterfront (east warp at 38,20 is in water — bridge needed)
        // Bridge across the water to the east warp
        for (let x = 26; x <= 38; x++) {
          this.baseGrid[20 * this.width + x] = this.TILES.SAND;
          this.decoGrid[20 * this.width + x] = this.DECOS.BRIDGE;
          this.baseGrid[21 * this.width + x] = this.TILES.SAND;
          this.decoGrid[21 * this.width + x] = this.DECOS.BRIDGE;
        }
      }

      // Map 16 — Coral Reef Shore: paths connecting warps
      // (west 1,20 | south cave 14,38)
      if (this.id === 16) {
        this.carvePath(1, 20, 14, 20, 2);   // west entry east along shore
        this.carvePath(14, 20, 14, 38, 2);  // south to tidal ruins cave
      }
    } 
    
    else if (this.type === 'snow_pass' || this.type === 'summit') {
      this.baseGrid.fill(this.TILES.SNOW); // white snow ground
      
      // Ice patch sliding sheets — compact for 40×40
      for (let y = 10; y < 18; y++) {
        for (let x = 12; x < 28; x++) {
          const idx = y * this.width + x;
          this.baseGrid[idx] = this.TILES.WATER; // Water acts as ice
          this.decoGrid[idx] = this.DECOS.BRIDGE; // ice overlay board
        }
      }

      // Cabin house on Snowy pass — door on warp (20,28)
      if (this.id === 18) {
        this.placeHouse(20, 28);

        // Snowy roads connecting warps: east(38,20) → hermitage(20,28) → north(20,1)
        this.carvePath(38, 20, 20, 20, 2);
        this.carvePath(20, 20, 20, 29, 2);  // road to hermitage doormat
        this.carvePath(20, 20, 20, 1, 2);   // road north to summit exit
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
        // Altar pedestal in center — (20,20) for 40×40 map
        this.decoGrid[20 * this.width + 20] = this.DECOS.ALTAR;

        // Map 21 paths connecting warps: south(20,38) ↔ altar ↔ north portal(20,8)
        if (this.id === 21) {
          this.carvePath(20, 38, 20, 8, 2);
        }
      }
    } 
    
    else if (this.type === 'void') {
      this.baseGrid.fill(this.TILES.WATER); // cosmic background void
      
      // Draw floating stone pathways — extend from y=3 to y=height-1 so spawn
      // and south warp are reachable (they sit near y=36/38).
      for (let y = 3; y < this.height - 1; y++) {
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
  placeHouse(doorX, doorY, width = 4) {
    const W = this.width, H = this.height, h = 3, doorLocal = 1;
    const left = doorX - doorLocal;
    const top = doorY - (h - 1);
    const HT = HOUSE_TILES;
    for (let row = 0; row < h; row++) {
      const y = top + row;
      if (y < 0 || y >= H) continue;
      for (let col = 0; col < width; col++) {
        const x = left + col;
        if (x < 0 || x >= W) continue;
        const idx = y * W + x;
        let tile;
        if (row === 0) tile = col === 0 ? HT.ROOF_L : col === width - 1 ? HT.ROOF_R : HT.ROOF_M[(col - 1) % HT.ROOF_M.length];
        else if (row === 1) tile = col === 0 ? HT.EAVE_L : col === width - 1 ? HT.EAVE_R : HT.EAVE_M[(col - 1) % HT.EAVE_M.length];
        else tile = col === 0 ? HT.WALL_L : col === width - 1 ? HT.WALL_R : HT.WALL_M[(col - 1) % HT.WALL_M.length];
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

  carvePath(x1, y1, x2, y2, width = 2, tile = this.TILES.DIRT) {
    let curX = x1;
    let curY = y1;
    const carve = (cx, cy) => {
      for (let dy = 0; dy < width; dy++) {
        for (let dx = 0; dx < width; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
            this.baseGrid[ny * this.width + nx] = tile;
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

    // Check ruins/buildings overlays (walls/roofs collide, door is walkable)
    const ruinTile = this.ruinsGrid[idx];
    if (ruinTile > 0 && ruinTile !== HOUSE_TILES.DOOR) {
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

    const ts = this.tileSize;
    const camTileX = Math.floor(camera.x / ts);
    const camTileY = Math.floor(camera.y / ts);

    const tilesW = Math.ceil(camera.width / ts) + 2;
    const tilesH = Math.ceil(camera.height / ts) + 2;

    const offsetX = Math.round(-(camera.x - camTileX * ts));
    const offsetY = Math.round(-(camera.y - camTileY * ts));

    // The base/structure/deco layers are static while the player walks within a
    // tile. Re-rasterising ~600 drawImage calls every frame is what made walking
    // feel heavy, so we cache the visible tiles to an offscreen canvas and only
    // rebuild it when the camera crosses a tile boundary, the tile sheet swaps
    // (epoch change), or a tile mutates (corruption/ruins → invalidateCache()).
    const cacheW = tilesW * ts;
    const cacheH = tilesH * ts;
    if (!this._tileCacheCanvas ||
        this._tileCacheCanvas.width !== cacheW ||
        this._tileCacheCanvas.height !== cacheH) {
      this._tileCacheCanvas = document.createElement('canvas');
      this._tileCacheCanvas.width = cacheW;
      this._tileCacheCanvas.height = cacheH;
      this._tileCacheCtx = this._tileCacheCanvas.getContext('2d');
      this._tileCacheCtx.imageSmoothingEnabled = false;
      this._cacheCamTileX = NaN; // force a rebuild below
    }

    const sheetSrc = this.tileSheet.src;
    if (camTileX !== this._cacheCamTileX ||
        camTileY !== this._cacheCamTileY ||
        sheetSrc !== this._cacheSheetSrc) {
      this._cacheCamTileX = camTileX;
      this._cacheCamTileY = camTileY;
      this._cacheSheetSrc = sheetSrc;
      this._rebuildTileCache(camTileX, camTileY, tilesW, tilesH);
    }

    ctx.drawImage(this._tileCacheCanvas, offsetX, offsetY);

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

  // Rasterise the static tile layers for the visible window into the offscreen
  // cache, in cache-local pixel coordinates (top-left tile = 0,0).
  _rebuildTileCache(camTileX, camTileY, tilesW, tilesH) {
    const cctx = this._tileCacheCtx;
    const ts = this.tileSize;
    cctx.clearRect(0, 0, this._tileCacheCanvas.width, this._tileCacheCanvas.height);

    for (let y = 0; y < tilesH; y++) {
      for (let x = 0; x < tilesW; x++) {
        const mapX = camTileX + x;
        const mapY = camTileY + y;
        if (mapX < 0 || mapX >= this.width || mapY < 0 || mapY >= this.height) continue;

        const idx = mapY * this.width + mapX;
        const px = x * ts;
        const py = y * ts;

        this.drawGBATile(cctx, this.getTileIndexForType(this.baseGrid[idx]), px, py);

        const structure = this.ruinsGrid[idx];
        if (structure > 0) this.drawGBATile(cctx, structure, px, py);

        const deco = this.decoGrid[idx];
        if (deco !== this.DECOS.EMPTY) this.drawDeco(cctx, deco, px, py);
      }
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

  // Force the offscreen tile cache to rebuild on the next draw(). Call after any
  // mutation to baseGrid/decoGrid/ruinsGrid (corruption spread/purify, ruins
  // collapse) so the change is visible without waiting for a camera tile cross.
  invalidateCache() {
    this._cacheCamTileX = NaN;
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
