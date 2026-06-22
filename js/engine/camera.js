// Fixed-screen Camera - Inspired by Pokemon Emerald
// Screen only shifts when player reaches boundaries

export class Camera {
  constructor(width, height, mapWidth, mapHeight, tileSize) {
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.tileSize = tileSize;

    this.mapWidthPx = mapWidth * tileSize;
    this.mapHeightPx = mapHeight * tileSize;

    this.screenWidthTiles = Math.ceil(width / tileSize);
    this.screenHeightTiles = Math.ceil(height / tileSize);
    this._centered = false;
  }

  update(playerX, playerY) {
    let targetX = playerX * this.tileSize - this.width / 2;
    let targetY = playerY * this.tileSize - this.height / 2;

    targetX = Math.max(0, Math.min(this.mapWidthPx - this.width, targetX));
    targetY = Math.max(0, Math.min(this.mapHeightPx - this.height, targetY));

    if (!this._centered) {
      this._centered = true;
      this.x = targetX;
      this.y = targetY;
      return;
    }

    this.x = targetX;
    this.y = targetY;
  }

  follow(playerX, playerY, lerpFactor) {
    this.update(playerX, playerY);
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

  // Get current screen tile boundaries
  getScreenBounds() {
    const startX = Math.floor(this.x / this.tileSize);
    const startY = Math.floor(this.y / this.tileSize);
    const endX = startX + this.screenWidthTiles;
    const endY = startY + this.screenHeightTiles;

    return {
      startX, startY, endX, endY
    };
  }
}