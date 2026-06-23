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
  return { width, height, pixels, colorType, buf, chunks };
}

function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }

function buildPNG(width, height, pixels, colorType, origBuf, origChunks) {
  const channels = colorType === 2 ? 3 : colorType === 6 ? 4 : 4;

  // Build raw pixel data with filter byte
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter: None
    for (let x = 0; x < width; x++) {
      const p = pixels[y][x];
      rawData.push(p.r, p.g, p.b);
      if (channels === 4) rawData.push(p.a);
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(rawData), { level: 9 });

  // Rebuild PNG with new IDAT
  const newBuf = Buffer.from(origBuf);

  // Find and replace IDAT chunks
  // Simpler: write fresh PNG from IHDR + new IDAT + IEND
  const ihdrChunk = origChunks.find(c => c.type === 'IHDR');
  const paletteChunks = origChunks.filter(c => c.type === 'PLTE' || c.type === 'tRNS');

  const parts = [];
  // PNG signature
  parts.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  // IHDR
  const ihdrBuf = Buffer.alloc(13);
  ihdrBuf.writeUInt32BE(width, 0);
  ihdrBuf.writeUInt32BE(height, 4);
  ihdrBuf[8] = 8; // bit depth
  ihdrBuf[9] = colorType;
  ihdrBuf[10] = 0; // compression
  ihdrBuf[11] = 0; // filter
  ihdrBuf[12] = 0; // interlace
  parts.push(writeChunk('IHDR', ihdrBuf));
  // IDAT
  parts.push(writeChunk('IDAT', compressed));
  // IEND
  parts.push(writeChunk('IEND', Buffer.alloc(0)));

  return Buffer.concat(parts);
}

function writeChunk(type, data) {
  const buf = Buffer.alloc(12 + data.length);
  buf.writeUInt32BE(data.length, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, 'ascii'), data]));
  buf.writeInt32BE(crc, 8 + data.length);
  return buf;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) | 0;
}

function main() {
  const bgPath = path.join(__dirname, '..', 'assets', 'images', 'backgrounds.png');
  console.log('Extracting backgrounds.png pixels...');
  const { width, height, pixels, colorType, buf, chunks } = extractPNGPixels(bgPath);

  // Analyze brightness distribution
  let maxBright = 0;
  let totalBright = 0;
  let count = 0;
  for (const row of pixels) {
    for (const p of row) {
      if (p.a > 128) {
        const b = (p.r + p.g + p.b) / 3;
        maxBright = Math.max(maxBright, b);
        totalBright += b;
        count++;
      }
    }
  }
  console.log(`Original: ${width}x${height}, avg brightness=${Math.round(totalBright/count)}/255, max=${Math.round(maxBright)}/255`);

  // Brighten: linear 6x multiplier
  // Original avg=12 → new avg=72 (visible alongside sprites at avg ~120)
  // Tiles with brightness >42 will clip to 255 — acceptable for visibility
  const MULT = 6;

  for (const row of pixels) {
    for (const p of row) {
      if (p.a > 128) {
        p.r = clamp(p.r * MULT);
        p.g = clamp(p.g * MULT);
        p.b = clamp(p.b * MULT);
      }
    }
  }

  // Analyze new brightness
  let newMax = 0, newTotal = 0, newCount = 0;
  for (const row of pixels) {
    for (const p of row) {
      if (p.a > 128) {
        const b = (p.r + p.g + p.b) / 3;
        newMax = Math.max(newMax, b);
        newTotal += b;
        newCount++;
      }
    }
  }
  console.log(`Brightened: avg brightness=${Math.round(newTotal/newCount)}/255, max=${Math.round(newMax)}/255`);

  console.log('Building new PNG...');
  const newPNG = buildPNG(width, height, pixels, colorType, buf, chunks);

  const outPath = path.join(__dirname, '..', 'assets', 'images', 'backgrounds_bright.png');
  fs.writeFileSync(outPath, newPNG);
  console.log(`Saved: ${outPath} (${newPNG.length} bytes)`);

  // Also brighten the epoch variants
  for (const name of ['backgrounds_autumn.png', 'backgrounds_corrupted.png']) {
    const epPath = path.join(__dirname, '..', 'assets', 'images', name);
    if (!fs.existsSync(epPath)) { console.log(`Skipping ${name} (not found)`); continue; }
    console.log(`Processing ${name}...`);
    const ep = extractPNGPixels(epPath);
    for (const row of ep.pixels) {
      for (const p of row) {
        if (p.a > 128) {
          p.r = clamp(p.r * MULT);
          p.g = clamp(p.g * MULT);
          p.b = clamp(p.b * MULT);
        }
      }
    }
    const epPNG = buildPNG(ep.width, ep.height, ep.pixels, ep.colorType, ep.buf, ep.chunks);
    const epOut = path.join(__dirname, '..', 'assets', 'images', name.replace('.png', '_bright.png'));
    fs.writeFileSync(epOut, epPNG);
    console.log(`Saved: ${epOut} (${epPNG.length} bytes)`);
  }
}

main();
