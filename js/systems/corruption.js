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
    const dx = Math.floor(Math.random() * 5) - 2;
    const dy = Math.floor(Math.random() * 5) - 2;
    
    const tx = node.x + dx;
    const ty = node.y + dy;

    if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
      const idx = ty * this.width + tx;
      // Do not corrupt water or existing decorations that collide
      if (map.baseGrid[idx] !== map.TILES.WATER && map.baseGrid[idx] !== map.TILES.CORRUPTED) {
        map.baseGrid[idx] = map.TILES.CORRUPTED;
      }
    }
  }

  // Purifies a circular radius around coordinates
  purify(cx, cy, radius, map) {
    let tilesCleaned = 0;
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.hypot(dx, dy) > radius) continue;
        
        const tx = cx + dx;
        const ty = cy + dy;
        
        if (tx >= 0 && tx < this.width && ty >= 0 && ty < this.height) {
          const idx = ty * this.width + tx;
          if (map.baseGrid[idx] === map.TILES.CORRUPTED) {
            // Restore back to grass
            map.baseGrid[idx] = map.TILES.GRASS;
            tilesCleaned += 1;
          }
        }
      }
    }

    // Remove any corruption nodes inside this purified area
    this.nodes = this.nodes.filter(n => Math.hypot(n.x - cx, n.y - cy) > radius);

    return tilesCleaned;
  }
}
export default CorruptionSystem;
