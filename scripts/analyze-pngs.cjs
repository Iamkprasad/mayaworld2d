const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function readPNGHeader(filepath) {
  const buf = fs.readFileSync(filepath);
  if (buf[0] !== 0x89 || buf[1] !== 0x50) {
    throw new Error(`Not a PNG: ${filepath}`);
  }
  
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  
  return { width, height, bitDepth, colorType, size: buf.length };
}

function extractPNGPixels(filepath) {
  const buf = fs.readFileSync(filepath);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const colorType = buf[25];
  
  let offset = 8;
  const chunks = [];
  
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.slice(offset + 4, offset + 8).toString('ascii');
    const data = buf.slice(offset + 8, offset + 8 + length);
    chunks.push({ type, data });
    offset += 12 + length;
    
    if (type === 'IEND') break;
  }
  
  const idatChunks = chunks.filter(c => c.type === 'IDAT');
  const compressed = Buffer.concat(idatChunks.map(c => c.data));
  
  try {
    const raw = zlib.inflateSync(compressed);
    
    const channels = colorType === 2 ? 3 : colorType === 6 ? 4 : colorType === 3 ? 1 : 4;
    const bytesPerPixel = channels;
    const stride = width * bytesPerPixel + 1;
    
    const pixels = [];
    for (let y = 0; y < height; y++) {
      const rowStart = y * stride + 1;
      const row = [];
      for (let x = 0; x < width; x++) {
        const px = rowStart + x * bytesPerPixel;
        if (colorType === 2) {
          row.push({ r: raw[px], g: raw[px+1], b: raw[px+2], a: 255 });
        } else if (colorType === 6) {
          row.push({ r: raw[px], g: raw[px+1], b: raw[px+2], a: raw[px+3] });
        } else if (colorType === 3) {
          const palIdx = raw[px];
          const plte = chunks.find(c => c.type === 'PLTE');
          if (plte) {
            const pi = palIdx * 3;
            row.push({ r: plte.data[pi], g: plte.data[pi+1], b: plte.data[pi+2], a: 255 });
          } else {
            row.push({ r: 0, g: 0, b: 0, a: 0 });
          }
        } else {
          row.push({ r: raw[px], g: raw[px+1], b: raw[px+2], a: raw[px+3] || 255 });
        }
      }
      pixels.push(row);
    }
    
    return { width, height, pixels };
  } catch (e) {
    throw new Error(`Failed to decompress: ${e.message}`);
  }
}

function tileHasContent(pixels, sx, sy, tileSize) {
  for (let y = sy; y < sy + tileSize; y++) {
    for (let x = sx; x < sx + tileSize; x++) {
      if (y >= 0 && y < pixels.length && x >= 0 && x < pixels[0].length) {
        if (pixels[y][x].a > 128) return true;
      }
    }
  }
  return false;
}

function tileAvgColor(pixels, sx, sy, tileSize) {
  let r=0, g=0, b=0, c=0;
  for (let y = sy; y < sy + tileSize; y++) {
    for (let x = sx; x < sx + tileSize; x++) {
      const px = pixels[y]?.[x];
      if (px && px.a > 128) { r+=px.r; g+=px.g; b+=px.b; c++; }
    }
  }
  if (!c) return null;
  return [Math.round(r/c), Math.round(g/c), Math.round(b/c)];
}

function analyzeTileSheet(filepath, stride, tileSize) {
  const { width, height, pixels } = extractPNGPixels(filepath);
  const cols = Math.floor(width / stride);
  const rows = Math.floor(height / stride);
  
  const tiles = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const sx = col * stride;
      const sy = row * stride;
      const has = tileHasContent(pixels, sx, sy, tileSize);
      const color = has ? tileAvgColor(pixels, sx, sy, tileSize) : null;
      tiles.push({ idx, row, col, sx, sy, has, color });
    }
  }
  
  return { width, height, cols, rows, tiles };
}

function analyzeCharacterSheet(filepath, frameW, frameH) {
  const { width, height, pixels } = extractPNGPixels(filepath);
  const cols = Math.floor(width / frameW);
  const rows = Math.floor(height / frameH);
  
  const frames = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const sx = col * frameW;
      const sy = row * frameH;
      const has = tileHasContent(pixels, sx, sy, Math.min(frameW, frameH));
      frames.push({ row, col, sx, sy, has });
    }
  }
  
  return { width, height, frameW, frameH, cols, rows, frames };
}

function main() {
  console.log('=== MayaWorld Asset Analysis ===\n');
  
  const baseDir = path.join(__dirname, '..', 'assets', 'images');
  
  console.log('--- PNG Headers ---');
  const pngFiles = fs.readdirSync(baseDir).filter(f => f.endsWith('.png'));
  pngFiles.forEach(f => {
    try {
      const hdr = readPNGHeader(path.join(baseDir, f));
      console.log(`  ${f}: ${hdr.width}x${hdr.height} (${hdr.colorType === 2 ? 'RGB' : hdr.colorType === 6 ? 'RGBA' : hdr.colorType === 3 ? 'Indexed' : 'Other'})`);
    } catch(e) {
      console.log(`  ${f}: ERROR ${e.message}`);
    }
  });
  
  console.log('\n--- Tile Sheet Analysis (backgrounds.png) ---');
  try {
    const bg = analyzeTileSheet(path.join(baseDir, 'backgrounds.png'), 17, 16);
    console.log(`  Grid: ${bg.cols}x${bg.rows} = ${bg.cols * bg.rows} tiles`);
    
    const DECOS = { EMPTY:0, TREE:24, WALL:74, TEMPLE_WALL:342, BRIDGE:140, ALTAR:275, SHRINE:624, RUINED_COL:323, PORTAL:1254, CROPS:63, FORGE:368, BOOKSHELF:101, SIGNBOARD:25, CHEST:324 };
    const BASE = { WATER:54, GRASS:1, SAND:29, DIRT:38, STONE:33, LAVA:367, CORRUPTED:2512 };
    const SHRINE_3x3 = [307,308,309,368,369,370,429,430,431];
    
    console.log('\n  BASE TILE VALIDATION:');
    for (const [name, idx] of Object.entries(BASE)) {
      const tile = bg.tiles[idx];
      if (tile) {
        console.log(`    ${name}=${idx}: col=${tile.col} row=${tile.row} hasContent=${tile.has} color=${tile.color ? `rgb(${tile.color.join(',')})` : 'null'}`);
      } else {
        console.log(`    ${name}=${idx}: OUT OF RANGE`);
      }
    }
    
    console.log('\n  DECO TILE VALIDATION:');
    for (const [name, idx] of Object.entries(DECOS)) {
      if (name === 'EMPTY') continue;
      const tile = bg.tiles[idx];
      if (tile) {
        console.log(`    ${name}=${idx}: col=${tile.col} row=${tile.row} hasContent=${tile.has} color=${tile.color ? `rgb(${tile.color.join(',')})` : 'null'}`);
      } else {
        console.log(`    ${name}=${idx}: OUT OF RANGE`);
      }
    }
    
    console.log('\n  SHRINE 3x3 TILES:');
    for (const idx of SHRINE_3x3) {
      const tile = bg.tiles[idx];
      if (tile) {
        console.log(`    #${idx}: col=${tile.col} row=${tile.row} hasContent=${tile.has} color=${tile.color ? `rgb(${tile.color.join(',')})` : 'null'}`);
      } else {
        console.log(`    #${idx}: OUT OF RANGE`);
      }
    }
    
    console.log('\n  TOTAL NON-EMPTY TILES:', bg.tiles.filter(t => t.has).length);
    
  } catch(e) {
    console.log(`  ERROR: ${e.message}`);
  }
  
  console.log('\n--- NPC Sprite Sheet Analysis ---');
  try {
    const npc = analyzeCharacterSheet(path.join(baseDir, 'npc.png'), 16, 21);
    console.log(`  Grid: ${npc.cols}x${npc.rows} frames (16x21 each)`);
    console.log(`  Character slots: ${Math.floor(npc.cols/4)}x${Math.floor(npc.rows/4)} = ${Math.floor(npc.cols/4) * Math.floor(npc.rows/4)}`);
    console.log(`  Total frames: ${npc.frames.length} (${npc.frames.filter(f=>f.has).length} with content)`);
  } catch(e) {
    console.log(`  ERROR: ${e.message}`);
  }
  
  console.log('\n--- Player Sprite Sheet Analysis ---');
  try {
    const p = analyzeCharacterSheet(path.join(baseDir, 'player.png'), 15, 22);
    console.log(`  Grid: ${p.cols}x${p.rows} frames (15x22 each)`);
    console.log(`  Directions: ${Math.min(p.cols, 4)} (down/up/left/right)`);
    console.log(`  Walk frames: ${Math.min(p.rows, 6)} (stand + 5 walk)`);
    console.log(`  Total frames: ${p.frames.length} (${p.frames.filter(f=>f.has).length} with content)`);
  } catch(e) {
    console.log(`  ERROR: ${e.message}`);
  }
  
  console.log('\n--- NPC Variant Sheets ---');
  ['npc_normal.png', 'npc_corrupted.png', 'npc_old.png'].forEach(f => {
    try {
      const npc = analyzeCharacterSheet(path.join(baseDir, f), 16, 21);
      console.log(`  ${f}: ${npc.width}x${npc.height} (${npc.cols}x${npc.rows} frames)`);
    } catch(e) {
      console.log(`  ${f}: ${e.message}`);
    }
  });
  
  console.log('\n--- Player Variant Sheets ---');
  ['player_young.png', 'player_old.png', 'player_corrupted.png', 'player_astral.png'].forEach(f => {
    try {
      const p = analyzeCharacterSheet(path.join(baseDir, f), 15, 22);
      console.log(`  ${f}: ${p.width}x${p.height} (${p.cols}x${p.rows} frames)`);
    } catch(e) {
      console.log(`  ${f}: ${e.message}`);
    }
  });
}

main();
