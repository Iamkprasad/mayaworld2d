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

function tileStats(pixels, sx, sy, tileSize) {
  let r=0, g=0, b=0, c=0;
  let uniqueColors = new Set();
  for (let y = sy; y < sy + tileSize && y < pixels.length; y++) {
    for (let x = sx; x < sx + tileSize && x < pixels[0].length; x++) {
      const px = pixels[y][x];
      if (px.a > 128) {
        r += px.r; g += px.g; b += px.b; c++;
        uniqueColors.add(`${px.r},${px.g},${px.b}`);
      }
    }
  }
  if (!c) return null;
  return { avgR: Math.round(r/c), avgG: Math.round(g/c), avgB: Math.round(b/c), colors: uniqueColors.size, pixels: c };
}

function main() {
  const baseDir = path.join(__dirname, '..', 'assets', 'images');
  
  console.log('=== SPRITES.PNG DECOS INDEX CHECK ===');
  const sp = extractPNGPixels(path.join(baseDir, 'sprites.png'));
  console.log(`Size: ${sp.width}x${sp.height}`);
  
  // Try multiple grid configurations
  const configs = [
    { name: '61-col (17px stride)', cols: 61, stride: 17 },
    { name: '121-col (16px stride)', cols: 121, stride: 16 },
    { name: '122-col (16px stride)', cols: 122, stride: 16 },
  ];
  
  for (const cfg of configs) {
    const rows = Math.floor((sp.height - 16) / cfg.stride) + 1;
    console.log(`\n  Grid: ${cfg.name} = ${cfg.cols}x${rows} = ${cfg.cols * rows} tiles`);
    
    const DECOS = { TREE:24, WALL:74, TEMPLE_WALL:342, BRIDGE:140, ALTAR:275, SHRINE:624, RUINED_COL:323, PORTAL:1254, CROPS:63, FORGE:368, BOOKSHELF:101, SIGNBOARD:25, CHEST:324 };
    const BASE = { WATER:54, GRASS:1, SAND:29, DIRT:38, STONE:33, LAVA:367 };
    
    for (const [name, idx] of Object.entries({...BASE, ...DECOS})) {
      const col = idx % cfg.cols;
      const row = Math.floor(idx / cfg.cols);
      const sx = col * cfg.stride;
      const sy = row * cfg.stride;
      const stats = tileStats(sp.pixels, sx, sy, 16);
      if (stats) {
        console.log(`    ${name.padEnd(14)}=${idx} col=${col} row=${row} avg=rgb(${stats.avgR},${stats.avgG},${stats.avgB}) colors=${stats.colors}`);
      }
    }
  }
  
  // Also check backgrounds_vibrant.png
  console.log('\n\n=== BACKGROUNDS_VIBRANT.PNG ===');
  try {
    const bv = extractPNGPixels(path.join(baseDir, 'backgrounds_vibrant.png'));
    console.log(`Size: ${bv.width}x${bv.height}`);
    const cols = Math.floor((bv.width - 16) / 17) + 1;
    
    const DECOS = { TREE:24, WALL:74, TEMPLE_WALL:342, BRIDGE:140, ALTAR:275, SHRINE:624, RUINED_COL:323, PORTAL:1254, CROPS:63, FORGE:368, BOOKSHELF:101, SIGNBOARD:25, CHEST:324 };
    const BASE = { WATER:54, GRASS:1, SAND:29, DIRT:38, STONE:33, LAVA:367 };
    
    for (const [name, idx] of Object.entries({...BASE, ...DECOS})) {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const sx = col * 17;
      const sy = row * 17;
      const stats = tileStats(bv.pixels, sx, sy, 16);
      if (stats) {
        console.log(`  ${name.padEnd(14)}=${idx} col=${col} row=${row} avg=rgb(${stats.avgR},${stats.avgG},${stats.avgB}) colors=${stats.colors}`);
      }
    }
  } catch(e) {
    console.log(`  ERROR: ${e.message}`);
  }
  
  // Analyze characterSprites.png structure
  console.log('\n\n=== CHARACTERSPRITES.PNG DEEP ANALYSIS ===');
  const cs = extractPNGPixels(path.join(baseDir, 'characterSprites.png'));
  console.log(`Size: ${cs.width}x${cs.height}`);
  
  const frameW = 15, frameH = 22;
  const csCols = Math.floor(cs.width / frameW);
  const csRows = Math.floor(cs.height / frameH);
  console.log(`Grid: ${csCols}x${csRows} = ${csCols * csRows} frames`);
  
  // Check each row for content
  let contentRows = 0;
  for (let row = 0; row < csRows; row++) {
    let hasContent = 0;
    for (let col = 0; col < csCols; col++) {
      const sx = col * frameW;
      const sy = row * frameH;
      const stats = tileStats(cs.pixels, sx, sy, frameW);
      if (stats && stats.pixels > 10) hasContent++;
    }
    if (hasContent > 0) contentRows++;
  }
  console.log(`Rows with content: ${contentRows}/${csRows}`);
  
  // Check column distribution
  for (let col = 0; col < csCols; col++) {
    let hasContent = 0;
    for (let row = 0; row < csRows; row++) {
      const sx = col * frameW;
      const sy = row * frameH;
      const stats = tileStats(cs.pixels, sx, sy, frameW);
      if (stats && stats.pixels > 10) hasContent++;
    }
    console.log(`  Col ${col}: ${hasContent} frames with content`);
  }
  
  // Check NPC sheets
  console.log('\n\n=== NPC SHEET DEEP ANALYSIS ===');
  for (const fname of ['npc.png', 'npc_normal.png', 'npc_corrupted.png', 'npc_old.png']) {
    try {
      const npc = extractPNGPixels(path.join(baseDir, fname));
      console.log(`\n${fname}: ${npc.width}x${npc.height}`);
      
      // Check each character slot
      for (let slotY = 0; slotY < Math.floor(npc.height / 84); slotY++) {
        for (let slotX = 0; slotX < Math.floor(npc.width / 64); slotX++) {
          const sx = slotX * 64;
          const sy = slotY * 84;
          const stats = tileStats(npc.pixels, sx, sy, 64);
          if (stats) {
            console.log(`  Slot (${slotX},${slotY}): avg=rgb(${stats.avgR},${stats.avgG},${stats.avgB}) colors=${stats.colors}`);
          }
        }
      }
    } catch(e) {
      console.log(`  ${fname}: ERROR ${e.message}`);
    }
  }
}

main();
