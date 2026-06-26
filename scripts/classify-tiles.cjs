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
  let r=0, g=0, b=0, a=0, c=0;
  let maxR=0, maxG=0, maxB=0;
  let uniqueColors = new Set();
  
  for (let y = sy; y < sy + tileSize && y < pixels.length; y++) {
    for (let x = sx; x < sx + tileSize && x < pixels[0].length; x++) {
      const px = pixels[y][x];
      if (px.a > 128) {
        r += px.r; g += px.g; b += px.b; a += px.a; c++;
        maxR = Math.max(maxR, px.r);
        maxG = Math.max(maxG, px.g);
        maxB = Math.max(maxB, px.b);
        uniqueColors.add(`${px.r},${px.g},${px.b}`);
      }
    }
  }
  if (!c) return null;
  return {
    avgR: Math.round(r/c), avgG: Math.round(g/c), avgB: Math.round(b/c),
    maxR, maxG, maxB,
    uniqueColors: uniqueColors.size,
    pixels: c
  };
}

function classifyTile(stats) {
  if (!stats) return 'EMPTY';
  const { avgR, avgG, avgB, maxR, maxG, maxB, uniqueColors } = stats;
  
  // Very dark / black tiles
  if (avgR < 15 && avgG < 15 && avgB < 15) return 'BLACK';
  
  // Blue-ish tiles (water)
  if (avgB > avgR + 20 && avgB > avgG + 10) return 'WATER_LIKE';
  
  // Green-ish tiles (grass/trees)
  if (avgG > avgR + 15 && avgG > avgB + 10) return 'GREEN_LIKE';
  
  // Yellow-ish tiles (sand)
  if (avgR > 100 && avgG > 80 && avgB < 80) return 'SAND_LIKE';
  
  // Red/orange tiles (lava/fire)
  if (avgR > avgG + 30 && avgR > avgB + 30) return 'RED_LIKE';
  
  // Gray tiles (stone)
  if (Math.abs(avgR - avgG) < 20 && Math.abs(avgG - avgB) < 20 && avgR > 30 && avgR < 150) return 'GRAY_LIKE';
  
  // High color variance = complex sprite
  if (uniqueColors > 50) return 'COMPLEX_SPRITE';
  
  return 'OTHER';
}

function main() {
  const baseDir = path.join(__dirname, '..', 'assets', 'images');
  
  // Analyze backgrounds.png tile sheet
  console.log('=== BACKGROUNDS.PNG TILE CLASSIFICATION ===\n');
  const bg = extractPNGPixels(path.join(baseDir, 'backgrounds.png'));
  const STRIDE = 17, TILE = 16;
  const cols = Math.floor((bg.width - TILE) / STRIDE) + 1;
  const rows = Math.floor((bg.height - TILE) / STRIDE) + 1;
  
  console.log(`Grid: ${cols}x${rows} = ${cols * rows} tiles\n`);
  
  // Classify ALL tiles
  const classifications = {};
  const categoryCounts = {};
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const sx = col * STRIDE;
      const sy = row * STRIDE;
      const stats = tileStats(bg.pixels, sx, sy, TILE);
      const cat = classifyTile(stats);
      classifications[idx] = { cat, stats, col, row };
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  }
  
  console.log('Category distribution:');
  Object.entries(categoryCounts).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => {
    console.log(`  ${k.padEnd(20)}: ${v} tiles`);
  });
  
  // Show tiles in each category
  console.log('\n=== GREEN_LIKE TILES (likely trees/grass) ===');
  Object.entries(classifications).filter(([,v]) => v.cat === 'GREEN_LIKE').slice(0, 30).forEach(([idx, v]) => {
    const s = v.stats;
    console.log(`  #${idx} col=${v.col} row=${v.row} avg=rgb(${s.avgR},${s.avgG},${s.avgB}) colors=${s.uniqueColors}`);
  });
  
  console.log('\n=== GRAY_LIKE TILES (likely stone/walls) ===');
  Object.entries(classifications).filter(([,v]) => v.cat === 'GRAY_LIKE').slice(0, 30).forEach(([idx, v]) => {
    const s = v.stats;
    console.log(`  #${idx} col=${v.col} row=${v.row} avg=rgb(${s.avgR},${s.avgG},${s.avgB}) colors=${s.uniqueColors}`);
  });
  
  console.log('\n=== RED_LIKE TILES (likely lava/fire) ===');
  Object.entries(classifications).filter(([,v]) => v.cat === 'RED_LIKE').slice(0, 20).forEach(([idx, v]) => {
    const s = v.stats;
    console.log(`  #${idx} col=${v.col} row=${v.row} avg=rgb(${s.avgR},${s.avgG},${s.avgB}) colors=${s.uniqueColors}`);
  });
  
  console.log('\n=== COMPLEX_SPRITE TILES (high color variance, likely objects) ===');
  Object.entries(classifications).filter(([,v]) => v.cat === 'COMPLEX_SPRITE').slice(0, 40).forEach(([idx, v]) => {
    const s = v.stats;
    console.log(`  #${idx} col=${v.col} row=${v.row} avg=rgb(${s.avgR},${s.avgG},${s.avgB}) colors=${s.uniqueColors}`);
  });
  
  // Check characterSprites.png
  console.log('\n\n=== CHARACTERSPRITES.PNG ANALYSIS ===');
  const cs = extractPNGPixels(path.join(baseDir, 'characterSprites.png'));
  console.log(`Size: ${cs.width}x${cs.height}`);
  console.log(`Pixel channels: ${cs.pixels[0]?.length}`);
  
  // Analyze rows to find character boundaries
  const frameH = 22; // assumed player height
  const frameW = 15; // assumed player width
  const csCols = Math.floor(cs.width / frameW);
  const csRows = Math.floor(cs.height / frameH);
  console.log(`As ${frameW}x${frameH} frames: ${csCols}x${csRows} = ${csCols * csRows} frames`);
  
  // Check what's in the first few rows
  for (let row = 0; row < Math.min(5, csRows); row++) {
    let hasContent = 0;
    for (let col = 0; col < csCols; col++) {
      const sx = col * frameW;
      const sy = row * frameH;
      const stats = tileStats(cs.pixels, sx, sy, frameW);
      if (stats && stats.pixels > 10) hasContent++;
    }
    console.log(`  Row ${row}: ${hasContent}/${csCols} frames with content`);
  }
  
  // Check sprites.png
  console.log('\n=== SPRITES.PNG ANALYSIS ===');
  const sp = extractPNGPixels(path.join(baseDir, 'sprites.png'));
  console.log(`Size: ${sp.width}x${sp.height}`);
  
  // Try 16x16 grid
  const sp16 = Math.floor((sp.width - 16) / 17) + 1;
  const sp16r = Math.floor((sp.height - 16) / 17) + 1;
  console.log(`As 16x16 tiles (17px stride): ${sp16}x${sp16r} = ${sp16 * sp16r} tiles`);
  
  // Check a few tiles
  for (let row = 0; row < Math.min(3, sp16r); row++) {
    for (let col = 0; col < Math.min(5, sp16); col++) {
      const idx = row * sp16 + col;
      const sx = col * 17;
      const sy = row * 17;
      const stats = tileStats(sp.pixels, sx, sy, 16);
      if (stats) {
        const cat = classifyTile(stats);
        console.log(`  #${idx} col=${col} row=${row} cat=${cat} avg=rgb(${stats.avgR},${stats.avgG},${stats.avgB}) colors=${stats.uniqueColors}`);
      }
    }
  }
}

main();
