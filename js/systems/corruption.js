// Corruption and Purification System

export class CorruptionSystem {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    
    // Coordinates of active corruption spread nodes
    this.nodes = [];
    this.spreadTimer = 0;
    this.spreadIntervalMs = 3000; // Tick every 3 real seconds (~30 in-game minutes)
  }

  spawnNode(x, y) {
    // Prevent duplicates
    if (!this.nodes.some(n => n.x === x && n.y === y)) {
      this.nodes.push({ x, y });
    }
  }

  clearAllNodes() {
    this.nodes = [];
  }

  update(deltaTime, clockSpeedMultiplier, map) {
    if (this.nodes.length === 0) return;

    this.spreadTimer += deltaTime * clockSpeedMultiplier;
    if (this.spreadTimer >= this.spreadIntervalMs) {
      this.spreadTimer = 0;
      this.spreadCorruption(map);
    }
  }

  spreadCorruption(map) {
    // Choose a random node to spread from
    if (this.nodes.length === 0) return;
    const node = this.nodes[Math.floor(Math.random() * this.nodes.length)];
    
    // Search adjacent tile within 2 steps
    let dx, dy;
    do {
      dx = Math.floor(Math.random() * 5) - 2;
      dy = Math.floor(Math.random() * 5) - 2;
    } while (dx === 0 && dy === 0);
    
    const tx = node.x + dx;
    const ty = node.y + dy;

    if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
      const idx = ty * this.width + tx;
      if (map.baseGrid[idx] !== map.TILES.WATER && map.baseGrid[idx] !== map.TILES.CORRUPTED) {
        map.baseGrid[idx] = map.TILES.CORRUPTED;
      }
    }
    if (map.invalidateCache) map.invalidateCache();
  }

  _distSq(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  }

  // Purifies a circular radius around coordinates
  purify(cx, cy, radius, map) {
    let tilesCleaned = 0;
    
    const rSq = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > rSq) continue;
        
        const tx = cx + dx;
        const ty = cy + dy;
        
        if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
          const idx = ty * this.width + tx;
          if (map.baseGrid[idx] === map.TILES.CORRUPTED) {
            map.baseGrid[idx] = map.TILES.GRASS;
            tilesCleaned += 1;
          }
        }
      }
    }

    if (tilesCleaned > 0 && map.invalidateCache) map.invalidateCache();

    this.nodes = this.nodes.filter(n => this._distSq(n.x, n.y, cx, cy) > rSq);

    return tilesCleaned;
  }
}
export default CorruptionSystem;
