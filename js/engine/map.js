// GBA-Style Multi-Map Engine
// Generates and manages layouts, decoration layers, and collision checks for all 22 maps

import { MAPS_CONFIG } from '../data/maps.js';

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
      SIGNBOARD: 24,    // GBA readable sign
      CHEST: 323        // Chest / relic trunk
    };

    // Load GBA Sprite Sheet
    this.tileSheet = new Image();
    this.tileSheet.src = 'assets/images/backgrounds.png';

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
            this.decoGrid[idx] = this.DECOS.TEMPLE_WALL;
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
        // Sand riverbanks
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
      // Ashram (10x10)
      this.carveHouse(8, 20, 10, 8);
      // Farmhouse (8x8)
      this.carveHouse(30, 24, 8, 6);
      // Village Hut (8x8)
      this.carveHouse(52, 28, 8, 6);

      // Winding pathways
      this.carvePath(40, 70, 12, 25);
      this.carvePath(40, 70, 34, 29);
      this.carvePath(40, 70, 56, 33);
      this.carvePath(40, 70, 40, 59); // south path
      this.carvePath(40, 70, 40, 2);   // north path

      // Farming Crops (large field)
      for (let y = 12; y <= 18; y++) {
        for (let x = 44; x <= 52; x++) {
          this.decoGrid[y * this.width + x] = this.DECOS.CROPS;
        }
      }

      // Well at square center
      this.decoGrid[35 * this.width + 40] = this.DECOS.RUINED_COL;
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
        const x = i % this.width;
        const y = Math.floor(i / this.width);
        
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
    
    // Check water (unless it's a bridge)
    if (this.baseGrid[idx] === this.TILES.WATER && this.decoGrid[idx] !== this.DECOS.BRIDGE) {
      return true;
    }

    // Check collision decos
    const deco = this.decoGrid[idx];
    if (deco === this.DECOS.TREE || deco === this.DECOS.WALL || deco === this.DECOS.TEMPLE_WALL || deco === this.DECOS.RUINED_COL) {
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
      dx, dy, this.tileSize, this.tileSize // destination
    );
  }

  getTileIndexForType(type) {
    switch(type) {
      case this.TILES.WATER: return 54;
      case this.TILES.GRASS: return 1;
      case this.TILES.SAND: return 29;
      case this.TILES.DIRT: return 38;
      case this.TILES.STONE: return 33;
      case this.TILES.LAVA: return 367;
      case this.TILES.CORRUPTED: return 2512;
      default: return 1;
    }
  }

  draw(ctx, camera) {
    ctx.imageSmoothingEnabled = false;

    const startX = Math.floor(camera.x / this.tileSize);
    const startY = Math.floor(camera.y / this.tileSize);
    const endX = Math.ceil((camera.x + camera.width) / this.tileSize);
    const endY = Math.ceil((camera.y + camera.height) / this.tileSize);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
        
        const idx = y * this.width + x;
        const screenPos = camera.toScreenSpace(x, y);
        
        // 1. Draw Base Ground Layer
        const tile = this.baseGrid[idx];
        const tileIndex = this.getTileIndexForType(tile);
        this.drawGBATile(ctx, tileIndex, screenPos.x, screenPos.y);

        // 2. Draw House Structures Overlays
        const structure = this.ruinsGrid[idx];
        if (structure === 1) { // Roof (red roof tile index 624)
          this.drawGBATile(ctx, 624, screenPos.x, screenPos.y);
        } else if (structure === 3) { // Wall (brick wall tile index 342)
          this.drawGBATile(ctx, 342, screenPos.x, screenPos.y);
        }

        // 3. Draw Decoration Layer
        const deco = this.decoGrid[idx];
        if (deco !== this.DECOS.EMPTY) {
          this.drawDeco(ctx, deco, screenPos.x, screenPos.y);
        }
      }
    }
  }

  drawDeco(ctx, deco, px, py) {
    switch(deco) {
      case this.DECOS.TREE:
        this.drawGBATile(ctx, 24, px, py);
        break;
      case this.DECOS.WALL:
        this.drawGBATile(ctx, 74, px, py);
        break;
      case this.DECOS.TEMPLE_WALL:
        this.drawGBATile(ctx, 342, px, py);
        break;
      case this.DECOS.BRIDGE:
        this.drawGBATile(ctx, 140, px, py);
        break;
      case this.DECOS.ALTAR:
        this.drawGBATile(ctx, 275, px, py);
        break;
      case this.DECOS.SHRINE:
        this.drawGBATile(ctx, 624, px, py);
        break;
      case this.DECOS.RUINED_COL:
        this.drawGBATile(ctx, 323, px, py);
        break;
      case this.DECOS.PORTAL:
        this.drawGBATile(ctx, 1254, px, py);
        break;
      case this.DECOS.CROPS:
        this.drawGBATile(ctx, 63, px, py);
        break;
      case this.DECOS.FORGE:
        this.drawGBATile(ctx, 368, px, py);
        break;
      case this.DECOS.BOOKSHELF:
        this.drawGBATile(ctx, 101, px, py);
        break;
    }
  }

  updateEpochOverlays(epochId) {
    let targetSrc = 'assets/images/backgrounds_vibrant.png';
    if (epochId >= 6) {
      targetSrc = 'assets/images/backgrounds_corrupted.png';
    } else if (epochId >= 4) {
      targetSrc = 'assets/images/backgrounds_autumn.png';
    }
    
    if (!this.tileSheet.src.endsWith(targetSrc)) {
      this.tileSheet.src = targetSrc;
    }
  }
}
