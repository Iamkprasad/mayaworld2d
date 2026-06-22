// GBA-Style Multi-Map Engine
// Generates and manages layouts, decoration layers, and collision checks for all 22 maps

import { MAPS_CONFIG } from '../data/maps.js';

// Shared tile sheet — all TileMap instances reuse this single Image
const _sharedTileSheet = new Image();
_sharedTileSheet.src = 'assets/images/backgrounds.png';
_sharedTileSheet.onerror = () => console.warn('Failed to load tile sheet: assets/images/backgrounds.png');
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
    this.floorTile = config.floorTile || 480;
    this.wallTile = config.wallTile || 464;

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

    // Decoration assets matching backgrounds.png
    this.DECOS = {
      EMPTY: 0,
      TREE: 24,         // GBA Green tree
      WALL: 74,         // Basalt rock
      TEMPLE_WALL: 342, // Marble pillar wall
      BRIDGE: 140,      // Wooden bridge board
      ALTAR: 275,       // Sacred altar pedestal
      SHRINE: 624,      // Red roof shrine structure
      RUINED_COL: 323,  // Broken pillar ruins
      PORTAL: 1254,     // Cave mouth / portal entrance
      CROPS: 63,        // Farming crops
      FORGE: 368,       // Blacksmith anvil/furnace
      BOOKSHELF: 101,   // Hermitage bookshelf
      SIGNBOARD: 25,    // GBA readable sign (was 24, collides with TREE)
      CHEST: 324        // Chest / relic trunk (was 323, collides with RUINED_COL)
    };

    // Use shared tile sheet — no per-map Image allocation
    this.tileSheet = _sharedTileSheet;

    // Offscreen tile cache to avoid redrawing ~450 drawImage calls per frame
    this._tileCacheCanvas = null;
    this._tileCacheCtx = null;
    this._cacheCamTileX = -1;
    this._cacheCamTileY = -1;

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

      // Place houses at clean locations
      this.carveHouse(8, 20, 10, 8);
      this.carveHouse(30, 24, 8, 6);
      this.carveHouse(52, 28, 8, 6);

      // Winding pathways
      this.carvePath(40, 70, 12, 25);
      this.carvePath(40, 70, 34, 29);
      this.carvePath(40, 70, 56, 33);
      this.carvePath(40, 70, 40, 59);
      this.carvePath(40, 70, 40, 2);

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
        this.carveHouse(12, 16, 10, 8);
      }

      // Fill rest with dense trees
      for (let i = 0; i < this.baseGrid.length; i++) {
        const onPath = this.baseGrid[i] === this.TILES.DIRT;
        const inHouse = this.ruinsGrid[i] > 0;
        
        if (!onPath && !inHouse && Math.random() < 0.8) {
          this.decoGrid[i] = this.DECOS.TREE;
        }
      }

      // Hidden chests / boulders
      this.decoGrid[12 * this.width + 10] = this.DECOS.WALL; // pushable boulder mockup
    } 
    
    else if (this.type === 'cave' || this.type === 'cave_vault' || this.type === 'lava_cave') {
      this.baseGrid.fill(this.TILES.STONE);

      // Cavern rock maze
      for (let i = 0; i < this.baseGrid.length; i++) {
        const x = i % this.width;
        const y = Math.floor(i / this.width);
        const isWall = (Math.sin(x*0.35) * Math.cos(y*0.35) > 0.15) && (x > 3 && x < this.width-4);
        
        if (isWall) {
          this.decoGrid[i] = this.DECOS.WALL;
        }
      }

      if (this.type === 'lava_cave') {
        // Lava pools inside
        for (let y = 10; y < 20; y++) {
          for (let x = 10; x < 30; x++) {
            this.baseGrid[y * this.width + x] = this.TILES.LAVA;
            this.decoGrid[y * this.width + x] = this.DECOS.EMPTY;
          }
        }
      }
    } 
    
    else if (this.type === 'volcano' || this.type === 'volcano_peaks') {
      this.baseGrid.fill(this.TILES.STONE); // Obsidian rock fields

      // Lava channels
      for (let y = 0; y < this.height; y++) {
        const lx = Math.floor(35 + Math.sin(y * 0.1) * 8);
        for (let x = lx - 3; x <= lx + 3; x++) {
          this.baseGrid[y * this.width + x] = this.TILES.LAVA;
        }
      }

      // Daksha's Forge fortress on ascent path
      if (this.type === 'volcano') {
        this.carveHouse(54, 20, 12, 10);
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
      if (this.type === 'snow_pass') {
        this.carveHouse(24, 16, 12, 10);
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

  carvePath(x1, y1, x2, y2) {
    let curX = x1;
    let curY = y1;
    while (curX !== x2 || curY !== y2) {
      this.baseGrid[curY * this.width + curX] = this.TILES.DIRT;
      if (curX !== x2) curX += Math.sign(x2 - curX);
      else curY += Math.sign(y2 - curY);
    }
    this.baseGrid[curY * this.width + curX] = this.TILES.DIRT;
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
    if (this.ruinsGrid[idx] === 1 || this.ruinsGrid[idx] === 3) {
      return true;
    }

    return false;
  }

  drawGBATile(ctx, tileIndex, dx, dy) {
    const col = (tileIndex - 1) % 61;
    const row = Math.floor((tileIndex - 1) / 61);
    
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
      case this.TILES.WATER: return 54;
      case this.TILES.GRASS: return 1;
      case this.TILES.SAND: return 29;
      case this.TILES.DIRT: return this.type === 'interior' ? this.floorTile : 38;
      case this.TILES.STONE: return 33;
      case this.TILES.LAVA: return 367;
      case this.TILES.CORRUPTED: return 2512;
      default: return 1;
    }
  }

  draw(ctx, camera) {
    // imageSmoothingEnabled set once in game.js constructor

    const camTileX = Math.floor(camera.x / this.tileSize);
    const camTileY = Math.floor(camera.y / this.tileSize);

    const tilesW = Math.ceil(camera.width / this.tileSize) + 2;
    const tilesH = Math.ceil(camera.height / this.tileSize) + 2;

    if (!this._tileCacheCanvas || camTileX !== this._cacheCamTileX || camTileY !== this._cacheCamTileY) {
      this._cacheCamTileX = camTileX;
      this._cacheCamTileY = camTileY;

      const cw = tilesW * this.tileSize;
      const ch = tilesH * this.tileSize;

      if (!this._tileCacheCanvas) {
        this._tileCacheCanvas = document.createElement('canvas');
        this._tileCacheCtx = this._tileCacheCanvas.getContext('2d');
        this._tileCacheCtx.imageSmoothingEnabled = false;
      }
      if (this._tileCacheCanvas.width !== cw || this._tileCacheCanvas.height !== ch) {
        this._tileCacheCanvas.width = cw;
        this._tileCacheCanvas.height = ch;
      }

      const cctx = this._tileCacheCtx;
      // imageSmoothingEnabled set once at creation
      cctx.clearRect(0, 0, cw, ch);

      for (let y = 0; y < tilesH; y++) {
        for (let x = 0; x < tilesW; x++) {
          const mapX = camTileX + x;
          const mapY = camTileY + y;
          if (mapX < 0 || mapX >= this.width || mapY < 0 || mapY >= this.height) continue;

          const idx = mapY * this.width + mapX;
          const px = x * this.tileSize;
          const py = y * this.tileSize;

          const tile = this.baseGrid[idx];
          this.drawGBATile(cctx, this.getTileIndexForType(tile), px, py);

          const structure = this.ruinsGrid[idx];
          if (structure === 1) {
            this.drawGBATile(cctx, 624, px, py);
          } else if (structure === 3) {
            this.drawGBATile(cctx, 464, px, py);
          }

          const deco = this.decoGrid[idx];
          if (deco !== this.DECOS.EMPTY) {
            this.drawDeco(cctx, deco, px, py);
          }
        }
      }
    }

    const offsetX = Math.round(-(camera.x - camTileX * this.tileSize));
    const offsetY = Math.round(-(camera.y - camTileY * this.tileSize));
    ctx.drawImage(this._tileCacheCanvas, offsetX, offsetY);
  }

  invalidateCache() {
    this._cacheCamTileX = -1;
    this._cacheCamTileY = -1;
  }

  drawDeco(ctx, deco, px, py) {
    if (deco === this.DECOS.SHRINE) {
      const ts = this.tileSize;
      // Draw 3x3 red-roof building (Cols 1,2,3 of Rows 5,6,7 starting at 307)
      // Row 5: 307, 308, 309
      this.drawGBATile(ctx, 307, px - ts, py - ts);
      this.drawGBATile(ctx, 308, px, py - ts);
      this.drawGBATile(ctx, 309, px + ts, py - ts);
      // Row 6: 368, 369, 370
      this.drawGBATile(ctx, 368, px - ts, py);
      this.drawGBATile(ctx, 369, px, py);
      this.drawGBATile(ctx, 370, px + ts, py);
      // Row 7: 429, 430, 431
      this.drawGBATile(ctx, 429, px - ts, py + ts);
      this.drawGBATile(ctx, 430, px, py + ts);
      this.drawGBATile(ctx, 431, px + ts, py + ts);
    } else {
      this.drawGBATile(ctx, deco, px, py);
    }
  }

  updateEpochOverlays(epochId) {
    let targetSrc = 'assets/images/backgrounds.png';
    if (epochId >= 6) {
      targetSrc = 'assets/images/backgrounds_corrupted.png';
    } else if (epochId >= 4) {
      targetSrc = 'assets/images/backgrounds_autumn.png';
    }
    
    const currentSrc = this.tileSheet.src;
    if (currentSrc.indexOf(targetSrc) === -1) {
      this.tileSheet.src = targetSrc;
      this._cacheCamTileX = -1;
      this._cacheCamTileY = -1;
    }
  }
}
