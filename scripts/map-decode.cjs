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

const STRIDE = 17;
const BG_COLS = 61;

function tileAvgColor(pixels, sx, sy) {
  let r=0,g=0,b=0,a=0,c=0;
  for (let y = sy+2; y < sy+14 && y < pixels.length; y++) {
    for (let x = sx+2; x < sx+14 && x < pixels[0].length; x++) {
      const px = pixels[y][x];
      if (px.a > 128) { r+=px.r; g+=px.g; b+=px.b; a+=px.a; c++; }
    }
  }
  if (!c) return null;
  return { r: Math.round(r/c), g: Math.round(g/c), b: Math.round(b/c), coverage: Math.round(c/144*100)/100 };
}

function tileColorType(avg) {
  if (!avg) return 'EMPTY';
  const {r,g,b,coverage} = avg;
  if (coverage < 0.1) return 'EMPTY';
  const brightness = (r+g+b)/3;
  if (brightness < 15) return 'NEAR_BLACK';
  if (brightness > 200) return 'NEAR_WHITE';
  const bBias = b - (r+g)/2;
  const gBias = g - (r+b)/2;
  const rBias = r - (g+b)/2;
  if (bBias > 20 && b > r && b > g) return 'BLUE';
  if (gBias > 15 && g > r) return 'GREEN';
  if (rBias > 15 && r > g && r > b) return 'RED';
  if (r > g && g > b && brightness < 60) return 'BROWN_DARK';
  if (r > g && g > b) return 'BROWN';
  if (Math.abs(r-g) < 12 && Math.abs(g-b) < 12 && brightness > 20) return 'GRAY';
  if (Math.abs(r-g) < 20 && Math.abs(g-b) < 20) return 'GRAY_DARK';
  return 'MIXED';
}

function classify(imgPath, label) {
  console.log(`\nLoading ${label}...`);
  const { width, height, pixels } = extractPNGPixels(imgPath);
  console.log(`  Size: ${width}x${height}`);
  const tiles = [];
  const totalRows = Math.floor((height - 16) / STRIDE) + 1;
  for (let row = 0; row < totalRows; row++) {
    for (let col = 0; col < BG_COLS; col++) {
      const idx = row * BG_COLS + col;
      const sx = col * STRIDE;
      const sy = row * STRIDE;
      if (sx + 16 > width || sy + 16 > height) continue;
      const avg = tileAvgColor(pixels, sx, sy);
      const ct = tileColorType(avg);
      const brightness = avg ? Math.round((avg.r+avg.g+avg.b)/3) : 0;
      tiles.push({ index: idx, col, row, avg, colorType: ct, brightness });
    }
  }
  return tiles;
}

function tileToGrid(tileIndex) {
  const z = tileIndex - 1;
  return { col: z % BG_COLS, row: Math.floor(z / BG_COLS) };
}

function findTile(tiles, tileIndex) {
  const g = tileToGrid(tileIndex);
  return tiles.find(t => t.col === g.col && t.row === g.row);
}

function main() {
  const bgPath = path.join(__dirname, '..', 'assets', 'images', 'backgrounds.png');
  const spPath = path.join(__dirname, '..', 'assets', 'images', 'sprites.png');

  const bgTiles = classify(bgPath, 'backgrounds.png');
  const spTiles = classify(spPath, 'sprites.png');

  const DECOS = {
    TREE: 24, WALL: 74, TEMPLE_WALL: 342, BRIDGE: 140,
    ALTAR: 275, SHRINE: 624, RUINED_COL: 323, PORTAL: 1254,
    CROPS: 63, FORGE: 368, BOOKSHELF: 101, SIGNBOARD: 25, CHEST: 324
  };
  const BASE = { WATER: 54, GRASS: 1, SAND: 29, DIRT: 38, STONE: 33, LAVA: 367, CORRUPTED: 2512 };

  console.log('\n=== DECOS (backgrounds.png) ===');
  for (const [name, idx] of Object.entries(DECOS)) {
    const t = findTile(bgTiles, idx);
    const s = findTile(spTiles, idx);
    if (!t) { console.log(`  ${name.padEnd(14)} #${idx}  OUT_OF_RANGE`); continue; }
    const rgb = t.avg ? `rgb(${t.avg.r},${t.avg.g},${t.avg.b})` : 'null';
    const srgb = s && s.avg ? `rgb(${s.avg.r},${s.avg.g},${s.avg.b})` : 'null';
    console.log(`  ${name.padEnd(14)} #${String(idx).padStart(4)}  (${t.col},${String(t.row).padStart(2)})  BG:${rgb.padEnd(22)} SP:${srgb.padEnd(22)} BG:${t.colorType.padEnd(10)} SP:${s ? s.colorType : '?'}`);
  }

  console.log('\n=== BASE TILES (backgrounds.png) ===');
  for (const [name, idx] of Object.entries(BASE)) {
    const t = findTile(bgTiles, idx);
    const s = findTile(spTiles, idx);
    if (!t) { console.log(`  ${name.padEnd(14)} #${idx}  OUT_OF_RANGE`); continue; }
    const rgb = t.avg ? `rgb(${t.avg.r},${t.avg.g},${t.avg.b})` : 'null';
    const srgb = s && s.avg ? `rgb(${s.avg.r},${s.avg.g},${s.avg.b})` : 'null';
    console.log(`  ${name.padEnd(14)} #${String(idx).padStart(4)}  (${t.col},${String(t.row).padStart(2)})  BG:${rgb.padEnd(22)} SP:${srgb.padEnd(22)} BG:${t.colorType.padEnd(10)} SP:${s ? s.colorType : '?'}`);
  }

  console.log('\n=== COLOR DISTRIBUTION (backgrounds.png) ===');
  const cc = {};
  bgTiles.forEach(t => { cc[t.colorType] = (cc[t.colorType]||0)+1; });
  Object.entries(cc).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`  ${k.padEnd(14)} ${v} tiles (${Math.round(v/bgTiles.length*100)}%)`));

  console.log('\n=== COLOR DISTRIBUTION (sprites.png) ===');
  const cc2 = {};
  spTiles.forEach(t => { cc2[t.colorType] = (cc2[t.colorType]||0)+1; });
  Object.entries(cc2).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`  ${k.padEnd(14)} ${v} tiles (${Math.round(v/spTiles.length*100)}%)`));

  console.log('\n=== BRIGHTNESS RANGE ===');
  const bgB = bgTiles.filter(t=>t.brightness>0).map(t=>t.brightness);
  const spB = spTiles.filter(t=>t.brightness>0).map(t=>t.brightness);
  console.log(`  backgrounds.png: ${bgB.length} lit tiles, min=${Math.min(...bgB)} max=${Math.max(...bgB)} avg=${Math.round(bgB.reduce((a,b)=>a+b,0)/bgB.length)}`);
  console.log(`  sprites.png: ${spB.length} lit tiles, min=${Math.min(...spB)} max=${Math.max(...spB)} avg=${Math.round(spB.reduce((a,b)=>a+b,0)/spB.length)}`);

  console.log('\n=== CROSS-SHEET COLOR DELTA (same index tiles) ===');
  const compare = [1, 29, 33, 38, 54, 63, 74, 101, 140, 275, 323, 324, 342, 367, 368, 624];
  for (const idx of compare) {
    const bg = findTile(bgTiles, idx);
    const sp = findTile(spTiles, idx);
    if (!bg || !sp || !bg.avg || !sp.avg) continue;
    const diff = Math.abs(bg.avg.r-sp.avg.r) + Math.abs(bg.avg.g-sp.avg.g) + Math.abs(bg.avg.b-sp.avg.b);
    console.log(`  #${String(idx).padStart(4)}  diff=${String(diff).padStart(4)}  BG:rgb(${bg.avg.r},${bg.avg.g},${bg.avg.b})=${bg.colorType.padEnd(10)} SP:rgb(${sp.avg.r},${sp.avg.g},${sp.avg.b})=${sp.colorType}`);
  }
}

main();
