// All-maps reachability test.
// Builds every TileMap and BFS-floods from its defaultSpawn over non-collidable
// tiles. Asserts: (1) every warp tile is reachable from spawn (no soft-locks),
// (2) every warp's target lands in-bounds AND on a walkable tile of the
// destination map. This is the safety net for the map shrink/densify work.
import { describe, it, expect, beforeAll } from 'vitest';

let MAPS_CONFIG, TileMap;

beforeAll(async () => {
  // Minimal stubs so map.js (which does `new Image()` at module load and
  // createElement('canvas') in draw — not in generateMap) imports cleanly.
  globalThis.Image = class {
    constructor() { this.complete = true; }
    set src(v) { this._src = v; if (this.onload) this.onload(); }
    get src() { return this._src; }
  };
  globalThis.document = {
    createElement: () => ({ getContext: () => ({}), width: 0, height: 0 })
  };
  ({ MAPS_CONFIG } = await import('../data/maps.js'));
  ({ TileMap } = await import('../engine/map.js'));
});

function bfsReachable(map, sx, sy) {
  const W = map.width, H = map.height;
  const seen = new Uint8Array(W * H);
  if (map.isCollidable(sx, sy)) return seen; // spawn itself blocked → nothing reachable
  const stack = [[sx, sy]];
  seen[sy * W + sx] = 1;
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const i = ny * W + nx;
      if (seen[i] || map.isCollidable(nx, ny)) continue;
      seen[i] = 1;
      stack.push([nx, ny]);
    }
  }
  return seen;
}

describe('all maps are traversable', () => {
  it('every warp is reachable from spawn, and every target is walkable & in-bounds', () => {
    const TS = 64;
    const maps = {};
    for (const id of Object.keys(MAPS_CONFIG)) {
      maps[id] = new TileMap(Number(id), TS);
    }

    const failures = [];
    for (const id of Object.keys(MAPS_CONFIG)) {
      const cfg = MAPS_CONFIG[id];
      const map = maps[id];
      const spawn = cfg.defaultSpawn;
      const W = map.width;
      const seen = bfsReachable(map, spawn.x, spawn.y);

      for (const w of (cfg.warps || [])) {
        // (1) the warp tile must be reachable on foot from the spawn
        if (!seen[w.y * W + w.x]) {
          failures.push(`map ${id} (${cfg.type}): warp (${w.x},${w.y}) UNREACHABLE from spawn (${spawn.x},${spawn.y})`);
        }
        // (2) the destination must exist, be in-bounds, and be walkable
        const dest = maps[w.targetMapId];
        if (!dest) {
          failures.push(`map ${id}: warp targets missing map ${w.targetMapId}`);
          continue;
        }
        if (w.targetX < 0 || w.targetX >= dest.width || w.targetY < 0 || w.targetY >= dest.height) {
          failures.push(`map ${id}: warp target (${w.targetX},${w.targetY}) OUT OF BOUNDS on map ${w.targetMapId} (${dest.width}x${dest.height})`);
        } else if (dest.isCollidable(w.targetX, w.targetY)) {
          failures.push(`map ${id}: warp target (${w.targetX},${w.targetY}) is BLOCKED on map ${w.targetMapId}`);
        }
      }
    }

    expect(failures, '\n' + failures.join('\n')).toEqual([]);
  });
});
