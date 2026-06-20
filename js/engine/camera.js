// 2D Camera viewport scroll tracker

export class Camera {
  constructor(width, height, mapWidth, mapHeight, tileSize) {
    this.x = 0;
    this.y = 0;
    this.width = width;       // Viewport width in pixels
    this.height = height;     // Viewport height in pixels
    this.mapWidth = mapWidth;   // Map width in tiles
    this.mapHeight = mapHeight; // Map height in tiles
    this.tileSize = tileSize;   // Tile size in pixels (e.g. 16)
    
    this.mapWidthPx = mapWidth * tileSize;
    this.mapHeightPx = mapHeight * tileSize;
  }

  follow(playerX, playerY, lerpFactor = 0.1) {
    // Center of player (pixel space)
    const targetX = playerX * this.tileSize - this.width / 2;
    const targetY = playerY * this.tileSize - this.height / 2;

    // Linear interpolation
    this.x += (targetX - this.x) * lerpFactor;
    this.y += (targetY - this.y) * lerpFactor;

    // Constrain camera bounds to map boundaries
    this.x = Math.max(0, Math.min(this.mapWidthPx - this.width, this.x));
    this.y = Math.max(0, Math.min(this.mapHeightPx - this.height, this.y));
  }

  // Convert map coordinates to screen drawing coordinates
  toScreenSpace(mapX, mapY) {
    return {
      x: mapX * this.tileSize - this.x,
      y: mapY * this.tileSize - this.y
    };
  }

  // Check if a box is inside the camera view (culling)
  isVisible(mapX, mapY) {
    const screenPos = this.toScreenSpace(mapX, mapY);
    return (
      screenPos.x >= -this.tileSize &&
      screenPos.x <= this.width &&
      screenPos.y >= -this.tileSize &&
      screenPos.y <= this.height
    );
  }
}
