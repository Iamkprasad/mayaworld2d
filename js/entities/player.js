// Player Character Entity - Spritesheet Rendering

export class Player {
  constructor(startX, startY) {
    this.x = startX;
    this.y = startY;
    
    this.targetX = startX;
    this.targetY = startY;
    this.movingProgress = 0;
    this.speed = 0.125; 
    this.direction = 0; // 0=down, 1=up, 2=left, 3=right

    // Narrative & Stats
    this.name = "Samat-Seeker";
    this.age = 0;
    this.breathMax = 260;
    this.breath = 260;
    this.karmaLight = 0;
    this.karmaShadow = 0;
    this.karmaBalance = 0;
    this.smriti = 0;
    
    this.profession = null; 
    this.curiosity = "None"; 

    // Vidyas (1 to 3)
    this.vidyas = {
      agni: 0, niti: 0, vaidya: 0, dhanur: 0, jyotish: 0,
      yoga: 0, bhu: 0, brahma: 0, shilpa: 0, mauna: 0
    };

    // Affinities
    this.affinities = {
      agni: 1.0, niti: 1.0, vaidya: 1.0, dhanur: 1.0, jyotish: 1.0,
      yoga: 1.0, bhu: 1.0, brahma: 1.0, shilpa: 1.0
    };

    this.hasAsthra = false;
    this.relics = { rage: false, pride: false, desire: false };

    this.isMeditating = false;
    this.isAstral = false;
    this.meditationTimer = 0;
    this._cachedTotalVidyaLevels = 0;
    this.trueNameKnown = false;
    
    // Kenney 16x16 sprite — 4 directions (cols) x 4 walk frames (rows)
    this.spriteSheet = new Image();
    this.spriteSheet.onerror = () => {
      console.warn('Failed to load player sprite: assets/images/kenney_player.png');
    };
    this.spriteSheet.src = 'assets/images/kenney_player.png';
    this.spriteWidth = 16;
    this.spriteHeight = 16;
    this.walkFrame = 0;
    this._walkTimer = 0;
  }

  isMoving() {
    return this.x !== this.targetX || this.y !== this.targetY;
  }

  requestMove(dx, dy, map) {
    if (this.isMoving()) return;
    if (this.isMeditating) return;

    if (dy > 0) this.direction = 0;     // down
    else if (dy < 0) this.direction = 1; // up
    else if (dx < 0) this.direction = 2; // left
    else if (dx > 0) this.direction = 3; // right

    const nextX = this.x + dx;
    const nextY = this.y + dy;

    if (!map.isCollidable(nextX, nextY)) {
      this.targetX = nextX;
      this.targetY = nextY;
      this.movingProgress = 0;
    }
  }

  updateSpriteSheet() {
    let targetSrc = 'assets/images/kenney_player.png';
    
    if (this.spriteSheet.src.indexOf(targetSrc) === -1) {
      this.spriteSheet.src = targetSrc;
    }
  }

  update(deltaTime, clockSpeedMultiplier = 1.0) {
    this.updateSpriteSheet();
    const dtScale = deltaTime / 16.67;
    if (this.isMoving()) {
      const step = this.speed * clockSpeedMultiplier * dtScale;
      this.movingProgress += step;
      
      // Cycle walking frames (0-3) using deltaTime
      this._walkTimer += deltaTime;
      if (this._walkTimer >= 100) {
        this._walkTimer = 0;
        this.walkFrame = (this.walkFrame + 1) % 4;
      }
      
      if (this.movingProgress >= 1.0) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.movingProgress = 0;
        this.walkFrame = 0; // Standing still
        
        // Deduct breath
        this.deductBreath(1.0);
      }
    } else {
      this.walkFrame = 0;
    }


    // Meditation progression
    if (this.isMeditating) {
      this.meditationTimer += deltaTime * clockSpeedMultiplier;
      if (this.meditationTimer >= 5000) {
        this.meditationTimer = 0;
        this.healBreath(5);
        this.gainKarmaLight(1);
      }
    }
  }

  deductBreath(amount) {
    this.breath = Math.max(0, this.breath - amount);
  }

  healBreath(amount) {
    this.breath = Math.min(this.breathMax, this.breath + amount);
  }

  gainKarmaLight(amount) {
    this.karmaLight += amount;
    this.updateKarmaBalance();
  }

  gainKarmaShadow(amount) {
    this.karmaShadow += amount;
    this.updateKarmaBalance();
  }

  updateKarmaBalance() {
    this.karmaBalance = this.karmaLight - this.karmaShadow;
  }

  updateTotalVidyaLevels() {
    this._cachedTotalVidyaLevels = Object.values(this.vidyas).reduce((a, b) => a + b, 0);
  }

  getInterpolatedPosition() {
    if (!this.isMoving()) {
      return { pxX: this.x, pxY: this.y };
    }
    const t = this.movingProgress;
    return {
      pxX: this.x + (this.targetX - this.x) * t,
      pxY: this.y + (this.targetY - this.y) * t
    };
  }

  draw(ctx, camera) {
    const { pxX, pxY } = this.getInterpolatedPosition();
    if (!camera.isVisible(pxX, pxY)) return;
    
    const screenPos = camera.toScreenSpace(pxX, pxY);
    const ts = camera.tileSize;

    // Draw shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(screenPos.x + ts/2, screenPos.y + ts - 4, ts*0.35, ts*0.15, 0, 0, Math.PI*2);
    ctx.fill();

    // Walk bob animation
    let bobOffset = 0;
    if (this.isMoving()) {
      bobOffset = Math.sin(this.movingProgress * Math.PI * 2) * 5;
    }

    // Draw spiritual aura based on Vidya levels
    if (this._cachedTotalVidyaLevels > 0) {
      ctx.fillStyle = `rgba(235, 208, 155, ${Math.min(0.25, this._cachedTotalVidyaLevels * 0.025)})`;
      ctx.beginPath();
      ctx.arc(screenPos.x + ts/2, screenPos.y + ts/2 + bobOffset, ts * (1 + this._cachedTotalVidyaLevels * 0.1), 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = `rgba(235, 208, 155, ${Math.min(0.4, this._cachedTotalVidyaLevels * 0.04)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw Kenney sprite (16x16, scaled to tile)
    ctx.drawImage(
      this.spriteSheet, 
      this.spriteWidth * this.direction, 
      this.spriteHeight * this.walkFrame, 
      this.spriteWidth, 
      this.spriteHeight, 
      screenPos.x, 
      screenPos.y + bobOffset,
      ts, 
      ts
    );

    // Draw active meditation aura
    if (this.isMeditating) {
      ctx.strokeStyle = '#ebd09b';
      ctx.lineWidth = 1;
      ctx.strokeRect(screenPos.x - 2, screenPos.y - 8 + bobOffset, ts + 4, 26);
    }
  }
}
export default Player;
