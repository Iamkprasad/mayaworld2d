import {
  BASE_TILES, DECO_TILES, TILE_SHEET, GRID_COLS, TILE_STRIDE, TILE_SRC
} from '../data/tiles.js';

const BUILD_TYPES = [
  { id: 'cottage',  name: 'Cottage',     icon: null, cost: 50, desc: 'Stone cottage' },
  { id: 'dirt',     name: 'Dirt Path',   icon: null, cost: 5,  desc: 'Dirt path' },
  { id: 'stone',    name: 'Stone Path',  icon: null, cost: 10, desc: 'Cobblestone path' },
  { id: 'fence',    name: 'Fence',       icon: null, cost: 10, desc: 'Wooden fence' },
  { id: 'tree',     name: 'Tree',        icon: null, cost: 15, desc: 'Bush / tree' },
  { id: 'wall',     name: 'Wall',        icon: null, cost: 20, desc: 'Stone wall' },
  { id: 'remove',   name: 'Remove',      icon: null, cost: 0,  desc: 'Clear tile' }
];

export class BuildMode {
  constructor() {
    this.active = false;
    this.selectedIndex = 0;
    this.cursorTileX = -1;
    this.cursorTileY = -1;
    this.mouseOnCanvas = false;

    this._tileSheet = new Image();
    this._tileSheet.src = TILE_SHEET;
    this._tileSheetReady = false;
    this._tileSheet.onload = () => { this._tileSheetReady = true; };
  }

  toggle() {
    this.active = !this.active;
    if (!this.active) {
      this.cursorTileX = -1;
      this.cursorTileY = -1;
    }
  }

  get selected() {
    return BUILD_TYPES[this.selectedIndex];
  }

  select(index) {
    if (index >= 0 && index < BUILD_TYPES.length) {
      this.selectedIndex = index;
    }
  }

  handleMouseMove(canvasX, canvasY, camera) {
    if (!this.active) return;
    this.mouseOnCanvas = true;
    this.cursorTileX = Math.floor((canvasX + camera.x) / camera.tileSize);
    this.cursorTileY = Math.floor((canvasY + camera.y) / camera.tileSize);
  }

  handleMouseLeave() {
    this.mouseOnCanvas = false;
    this.cursorTileX = -1;
    this.cursorTileY = -1;
  }

  place(map, player) {
    if (!this.active) return false;
    const { x, y } = this;
    if (x < 0 || x >= map.width || y < 0 || y >= map.height) return false;
    const idx = y * map.width + x;
    const cost = this.selected.cost;

    if (player.breath < cost) return false;
    player.deductBreath(cost);

    switch (this.selected.id) {
      case 'cottage':
        map.ruinsGrid[idx] = DECO_TILES.WALL;
        map.decoGrid[idx] = DECO_TILES.EMPTY;
        break;
      case 'dirt':
        map.baseGrid[idx] = BASE_TILES.DIRT;
        break;
      case 'stone':
        map.baseGrid[idx] = BASE_TILES.STONE;
        break;
      case 'fence':
        if (map.baseGrid[idx] === BASE_TILES.GRASS || map.baseGrid[idx] === BASE_TILES.DIRT) {
          map.decoGrid[idx] = DECO_TILES.FENCE;
        }
        break;
      case 'tree':
        if (map.baseGrid[idx] !== BASE_TILES.WATER && map.ruinsGrid[idx] === 0) {
          map.decoGrid[idx] = DECO_TILES.TREE;
        }
        break;
      case 'wall':
        map.decoGrid[idx] = DECO_TILES.WALL;
        break;
      case 'remove':
        map.ruinsGrid[idx] = 0;
        map.decoGrid[idx] = DECO_TILES.EMPTY;
        if (map.baseGrid[idx] !== BASE_TILES.WATER) {
          map.baseGrid[idx] = BASE_TILES.GRASS;
        }
        break;
    }
    map.invalidateCache();
    return true;
  }

  get x() { return this.cursorTileX; }
  get y() { return this.cursorTileY; }

  canPlace(map, player) {
    if (!this.active) return false;
    const { x, y } = this;
    if (x < 0 || x >= map.width || y < 0 || y >= map.height) return false;
    if (player.breath < this.selected.cost) return false;
    return true;
  }

  drawGrid(ctx, camera) {
    if (!this.active) return;
    const ts = camera.tileSize;

    const camTileX = Math.floor(camera.x / ts);
    const camTileY = Math.floor(camera.y / ts);
    const tilesW = Math.ceil(camera.width / ts) + 2;
    const tilesH = Math.ceil(camera.height / ts) + 2;
    const offsetX = -(camera.x - camTileX * ts);
    const offsetY = -(camera.y - camTileY * ts);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 0.5;
    for (let ty = 0; ty < tilesH; ty++) {
      for (let tx = 0; tx < tilesW; tx++) {
        const px = tx * ts + offsetX;
        const py = ty * ts + offsetY;
        ctx.strokeRect(px, py, ts, ts);
      }
    }
  }

  drawCursorPreview(ctx, camera) {
    if (!this.active || !this.mouseOnCanvas || !this._mapRef || !this._playerRef) return;
    const { x, y } = this;
    const ts = camera.tileSize;
    const screenPos = camera.toScreenSpace(x, y);

    const canPlace = this.canPlace(this._mapRef, this._playerRef);
    const color = canPlace ? 'rgba(130, 210, 160, 0.45)' : 'rgba(210, 80, 80, 0.45)';
    ctx.fillStyle = color;
    ctx.fillRect(screenPos.x, screenPos.y, ts, ts);
    ctx.strokeStyle = canPlace ? '#82d2a0' : '#d25050';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(screenPos.x, screenPos.y, ts, ts);
  }

  drawPalette(ctx, canvas) {
    if (!this.active) return;
    const count = BUILD_TYPES.length;
    const slotSize = 48;
    const gap = 6;
    const totalW = count * (slotSize + gap) - gap;
    const startX = (canvas.width - totalW) / 2;
    const startY = canvas.height - slotSize - 16;

    // Background bar
    ctx.fillStyle = 'rgba(13, 43, 30, 0.88)';
    this.roundRect(ctx, startX - 8, startY - 8, totalW + 16, slotSize + 16, 6);

    for (let i = 0; i < count; i++) {
      const type = BUILD_TYPES[i];
      const px = startX + i * (slotSize + gap);
      const py = startY;

      // Slot background
      if (i === this.selectedIndex) {
        ctx.fillStyle = 'rgba(201, 166, 79, 0.3)';
        ctx.strokeStyle = '#c9a64f';
      } else {
        ctx.fillStyle = 'rgba(243, 240, 232, 0.08)';
        ctx.strokeStyle = 'rgba(243, 240, 232, 0.25)';
      }
      ctx.lineWidth = 1;
      this.roundRect(ctx, px, py, slotSize, slotSize, 4);

      // Draw the tile preview at small size
      if (this._tileSheetReady) {
        this.drawTilePreview(ctx, type, px + 5, py + 5, 38);
      }

      // Label below
      ctx.fillStyle = '#f3f0e8';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(type.name, px + slotSize / 2, py + slotSize + 10);

      // Cost
      if (type.cost > 0) {
        ctx.fillStyle = '#c9a64f';
        ctx.font = '7px monospace';
        ctx.fillText('♰' + type.cost, px + slotSize / 2, py + slotSize + 20);
      }
    }
  }

  drawTilePreview(ctx, type, dx, dy, size) {
    if (!this._tileSheetReady) return;
    let tileIndex = -1;
    switch (type.id) {
      case 'cottage': tileIndex = DECO_TILES.WALL; break;
      case 'dirt':    tileIndex = BASE_TILES.DIRT; break;
      case 'stone':   tileIndex = BASE_TILES.STONE; break;
      case 'fence':   tileIndex = DECO_TILES.FENCE; break;
      case 'tree':    tileIndex = DECO_TILES.TREE; break;
      case 'wall':    tileIndex = DECO_TILES.WALL; break;
      case 'remove':  tileIndex = -1; break;
    }
    if (tileIndex > 0) {
      const col = (tileIndex - 1) % GRID_COLS;
      const row = Math.floor((tileIndex - 1) / GRID_COLS);
      ctx.drawImage(this._tileSheet, col * TILE_STRIDE, row * TILE_STRIDE, TILE_SRC, TILE_SRC, dx, dy, size, size);
    } else if (type.id === 'remove') {
      ctx.fillStyle = 'rgba(210, 80, 80, 0.4)';
      ctx.fillRect(dx + 4, dy + 4, size - 8, size - 8);
      ctx.strokeStyle = '#d25050';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(dx + 8, dy + 8);
      ctx.lineTo(dx + size - 8, dy + size - 8);
      ctx.moveTo(dx + size - 8, dy + 8);
      ctx.lineTo(dx + 8, dy + size - 8);
      ctx.stroke();
    }
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}
