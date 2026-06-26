// Headless harness: runs the REAL map.js generation (with a stubbed Image)
// and dumps the grids + tile lookups to JSON so we can render a verification PNG.
globalThis.Image = class {
  constructor() { this._src = ''; this.complete = true; }
  set src(v) { this._src = v; } get src() { return this._src; }
  set onload(f) {} set onerror(f) {}
};

const { TileMap } = await import('../js/engine/map.js');
const fs = await import('fs');

const mapId = parseInt(process.argv[2] || '1', 10);
const m = new TileMap(mapId, 16);

// Resolve base logical types -> sheet indices via the real method
const baseIdx = m.baseGrid.map(t => m.getTileIndexForType(t));

const out = {
  id: m.id, name: m.name, width: m.width, height: m.height,
  base: baseIdx,        // sheet indices for ground
  deco: m.decoGrid,     // sheet indices for decorations
  ruins: m.ruinsGrid,   // sheet indices for structures
  shrine: m.DECOS.SHRINE
};
fs.writeFileSync(`scratch/_map_${mapId}.json`, JSON.stringify(out));
console.log(`dumped map ${mapId} (${m.name}) ${m.width}x${m.height}`);
