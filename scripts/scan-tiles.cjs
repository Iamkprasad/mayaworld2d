const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

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
  const raw = zlib.inflateSync(Buffer.concat(idatChunks.map(c => c.data)));
  
  const channels = colorType === 2 ? 3 : colorType === 6 ? 4 : 4;
  const stride = width * channels + 1;
  
  const pixels = [];
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride + 1;
    const row = [];
    for (let x = 0; x < width; x++) {
      const px = rowStart + x * channels;
      if (colorType === 2) {
        row.push({ r: raw[px], g: raw[px+1], b: raw[px+2], a: 255 });
      } else {
        row.push({ r: raw[px], g: raw[px+1], b: raw[px+2], a: raw[px+3] || 255 });
      }
    }
    pixels.push(row);
  }
  
  return { width, height, pixels };
}

function tileHasContent(pixels, sx, sy, tileSize) {
  let count = 0;
  for (let y = sy; y < sy + tileSize && y < pixels.length; y++) {
    for (let x = sx; x < sx + tileSize && x < pixels[0].length; x++) {
      if (pixels[y][x].a > 128) count++;
    }
  }
  return count;
}

function tileAvgColor(pixels, sx, sy, tileSize) {
  let r=0, g=0, b=0, c=0;
  for (let y = sy; y < sy + tileSize && y < pixels.length; y++) {
    for (let x = sx; x < sx + tileSize && x < pixels[0].length; x++) {
      const px = pixels[y][x];
      if (px.a > 128) { r+=px.r; g+=px.g; b+=px.b; c++; }
    }
  }
  if (!c) return null;
  return [Math.round(r/c), Math.round(g/c), Math.round(b/c)];
}

function main() {
  const imgPath = path.join(__dirname, '..', 'assets', 'images', 'backgrounds.png');
  const { width, height, pixels } = extractPNGPixels(imgPath);
  
  const STRIDE = 17;
  const TILE = 16;
  
  const cols = Math.floor((width - TILE) / STRIDE) + 1;
  const rows = Math.floor((height - TILE) / STRIDE) + 1;
  
  console.log(`Image: ${width}x${height}`);
  console.log(`Grid: ${cols}x${rows} = ${cols * rows} tiles`);
  console.log(`Stride: ${STRIDE}px (tile ${TILE}px + 1px gap)\n`);
  
  // Scan ALL tiles
  const allTiles = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const sx = col * STRIDE;
      const sy = row * STRIDE;
      const count = tileHasContent(pixels, sx, sy, TILE);
      const color = tileAvgColor(pixels, sx, sy, TILE);
      allTiles.push({ idx, row, col, sx, sy, pixels: count, color });
    }
  }
  
  const filled = allTiles.filter(t => t.pixels > 0);
  console.log(`Non-empty tiles: ${filled.length} / ${allTiles.length} (${(filled.length/allTiles.length*100).toFixed(1)}%)\n`);
  
  // Print first 200 tiles with content
  console.log('=== ALL NON-EMPTY TILES (first 100) ===');
  console.log('Index | Col | Row | Pixels | Avg Color');
  console.log('------|-----|-----|--------|----------');
  filled.slice(0, 100).forEach(t => {
    const c = t.color ? `rgb(${t.color.join(',')})` : 'null';
    const pad = (s, n) => String(s).padEnd(n);
    console.log(`${pad(t.idx, 7)}| ${pad(t.col, 4)}| ${pad(t.row, 4)}| ${pad(t.pixels, 7)}| ${c}`);
  });
  
  // Check specific DECOS and BASE indices with CORRECT grid
  console.log('\n=== DECOS INDEX CHECK (corrected grid) ===');
  const DECOS = { TREE:24, WALL:74, TEMPLE_WALL:342, BRIDGE:140, ALTAR:275, SHRINE:624, RUINED_COL:323, PORTAL:1254, CROPS:63, FORGE:368, BOOKSHELF:101, SIGNBOARD:25, CHEST:324 };
  for (const [name, idx] of Object.entries(DECOS)) {
    const t = allTiles[idx];
    if (t) {
      console.log(`  ${name.padEnd(14)}=${idx} -> col=${t.col} row=${t.row} pixels=${t.pixels} ${t.pixels > 0 ? 'FILLED' : 'EMPTY'}`);
    } else {
      console.log(`  ${name.padEnd(14)}=${idx} -> OUT OF RANGE (max=${allTiles.length-1})`);
    }
  }
  
  console.log('\n=== BASE TILE INDEX CHECK ===');
  const BASE = { WATER:54, GRASS:1, SAND:29, DIRT:38, STONE:33, LAVA:367, CORRUPTED:2512 };
  for (const [name, idx] of Object.entries(BASE)) {
    const t = allTiles[idx];
    if (t) {
      console.log(`  ${name.padEnd(14)}=${idx} -> col=${t.col} row=${t.row} pixels=${t.pixels} ${t.pixels > 0 ? 'FILLED' : 'EMPTY'} ${t.color ? `rgb(${t.color.join(',')})` : ''}`);
    } else {
      console.log(`  ${name.padEnd(14)}=${idx} -> OUT OF RANGE`);
    }
  }
  
  console.log('\n=== SHRINE 3x3 CHECK ===');
  const SHRINE = [307,308,309,368,369,370,429,430,431];
  for (const idx of SHRINE) {
    const t = allTiles[idx];
    if (t) {
      console.log(`  #${idx} -> col=${t.col} row=${t.row} pixels=${t.pixels} ${t.pixels > 0 ? 'FILLED' : 'EMPTY'}`);
    }
  }
  
  // Find which tiles have the most content (likely important sprites)
  console.log('\n=== TOP 50 TILES BY PIXEL COUNT (likely sprites/objects) ===');
  const sorted = [...filled].sort((a,b) => b.pixels - a.pixels);
  sorted.slice(0, 50).forEach((t, i) => {
    const c = t.color ? `rgb(${t.color.join(',')})` : 'null';
    console.log(`  ${String(i+1).padStart(2)}. #${t.idx} col=${t.col} row=${t.row} pixels=${t.pixels} ${c}`);
  });
  
  // Map out density by row ranges
  console.log('\n=== TILE DENSITY BY ROW RANGES (20-row blocks) ===');
  for (let r = 0; r < rows; r += 20) {
    let count = 0;
    for (let rr = r; rr < Math.min(r + 20, rows); rr++) {
      for (let c = 0; c < cols; c++) {
        if (allTiles[rr * cols + c]?.pixels > 0) count++;
      }
    }
    console.log(`  Rows ${String(r).padStart(3)}-${String(Math.min(r+19, rows-1)).padStart(3)}: ${count} filled tiles`);
  }
}

main();
