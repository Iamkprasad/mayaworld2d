// NPC Entities: Sages, Civilians, Mayasur, and the Wanderer - GBA Sprites

// Tint cache: maps "id_src tint" → offscreen canvas with color overlay
const _tintCache = new Map();

export class NPC {
  constructor(id, type, name, x, y, options = {}) {
    this.id = id;
    this.type = type; 
    this.name = name;
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    
    this.movingProgress = 0;
    this.speed = 0.04; 
    this.direction = 0; // 0=down, 1=up, 2=left, 3=right

    this.profession = options.profession || null; 
    this.schedule = options.schedule || null; 
    this.state = 'idle'; 
    this.dialogueKey = options.dialogueKey || '';
    
    // Sages bonds
    this.bond = 0; 
    
    // GBA Spritesheet Position Configuration (x, y coordinates on the grid of sheet)
    this.imagePoss = options.imagePoss || { x: 0, y: 0 };
    
    // Per-NPC color tint to visually distinguish sprites sharing the same slot
    this.tint = options.tint || null;
    
    this.spriteSheet = new Image();
    this.spriteSheet.onerror = () => {
      console.warn('Failed to load NPC sprite: assets/images/npc.png');
    };
    this.spriteSheet.src = 'assets/images/npc.png';
    this.spriteWidth = 16;
    this.spriteHeight = 21;
    this.walkFrame = 0;
    this._npcWalkTimer = 0;
  }

  isMoving() {
    return this.x !== this.targetX || this.y !== this.targetY;
  }

  updateSpriteSheet(epochId, mayasurAttackActive) {
    if (this.type === 'mayasur' || this.type === 'wanderer') return;

    let targetSrc = 'assets/images/npc.png';
    if (mayasurAttackActive && this.type === 'civilian') {
      targetSrc = 'assets/images/npc_corrupted.png';
    } else if (epochId >= 6) {
      targetSrc = 'assets/images/npc_old.png';
    }

    if (this.spriteSheet.src.indexOf(targetSrc) === -1) {
      this.spriteSheet.src = targetSrc;
      // Invalidate tint cache when source changes
      if (this.tint) {
        for (const key of _tintCache.keys()) {
          if (key.startsWith(this.id + '_')) _tintCache.delete(key);
        }
      }
    }
  }

  _getTintedSheet() {
    if (!this.tint) return null;
    const src = this.spriteSheet.src;
    const cacheKey = this.id + '_' + src + ' ' + this.tint;
    const cached = _tintCache.get(cacheKey);
    if (cached) return cached;
    if (!this.spriteSheet.complete || this.spriteSheet.naturalWidth === 0) return null;
    const w = this.spriteSheet.naturalWidth;
    const h = this.spriteSheet.naturalHeight;
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const octx = off.getContext('2d');
    octx.drawImage(this.spriteSheet, 0, 0);
    // Multiply blends the tint color with the sprite's grayscale,
    // preserving internal shading while adding color
    octx.globalCompositeOperation = 'multiply';
    octx.fillStyle = this.tint.replace(/[\d.]+\)$/, '1)');
    octx.fillRect(0, 0, w, h);
    octx.globalCompositeOperation = 'source-over';
    _tintCache.set(cacheKey, off);
    return off;
  }

  update(deltaTime, clock, mayasurAttackActive, epochId = 1, map = null) {
    this.updateSpriteSheet(epochId, mayasurAttackActive);
    const dtScale = deltaTime / 16.67;
    if (this.isMoving()) {
      this.movingProgress += this.speed * dtScale;
      this._npcWalkTimer += deltaTime;
      if (this._npcWalkTimer >= 150) {
        this._npcWalkTimer = 0;
        this.walkFrame = this.walkFrame === 1 ? 2 : 1;
      }
      
      if (this.movingProgress >= 1.0) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.movingProgress = 0;
        this.walkFrame = 0; // standing still

        // Reset state after reaching destination
        if (this.state === 'idle_moving') {
          this.state = 'idle';
        } else if (this.state === 'moving') {
          this.state = 'idle';
        }
      }
      return;
    } else {
      this.walkFrame = 0;
    }

    // Mayasur Flee Behavior
    if (mayasurAttackActive && this.type === 'civilian') {
      this.state = 'fleeing';
      const targetShrineX = 40;
      const targetShrineY = 70;
      
      const dx = Math.sign(targetShrineX - this.x);
      const dy = Math.sign(targetShrineY - this.y);
      
      if (dx !== 0 || dy !== 0) {
        const moveAxisX = Math.random() < 0.5;
        const tx = this.x + (moveAxisX ? dx : 0);
        const ty = this.y + (!moveAxisX ? dy : 0);
        if (!map || !map.isCollidable(tx, ty)) {
          this.targetX = tx;
          this.targetY = ty;
        }
      }
      return;
    }

    // Schedule check
    if (this.type === 'civilian' && this.schedule) {
      const hour = clock.hours;
      let waypoint = this.schedule[hour];
      if (!waypoint) {
        for (let h = hour; h >= 0; h--) {
          if (this.schedule[h]) {
            waypoint = this.schedule[h];
            break;
          }
        }
      }

      if (waypoint) {
        this.state = waypoint.state;
        if (this.state === 'sleeping') {
          this.targetX = this.x;
          this.targetY = this.y;
          this.speed = 0;
        } else if (waypoint.x !== undefined && waypoint.y !== undefined) {
          // Path towards scheduled waypoint position
          const dx = Math.sign(waypoint.x - this.x);
          const dy = Math.sign(waypoint.y - this.y);
          if (dx !== 0 || dy !== 0) {
            const tx = this.x + dx;
            const ty = this.y + dy;
            if (!map || !map.isCollidable(tx, ty)) {
              this.targetX = tx;
              this.targetY = ty;
              this.speed = 0.04;
            }
          }
        } else {
          // Idle without fixed position
          if (Math.random() < 0.001) {
            const idleDirections = [[0,1], [0,-1], [-1,0], [1,0]];
            const [idleDx, idleDy] = idleDirections[Math.floor(Math.random() * idleDirections.length)];
            const idleDistance = 2 + Math.floor(Math.random() * 3);
            const tx = this.x + (idleDx * idleDistance);
            const ty = this.y + (idleDy * idleDistance);
            if (!map || !map.isCollidable(tx, ty)) {
              this.targetX = tx;
              this.targetY = ty;
              this.state = 'idle_moving';
            }
          }
        }
      }
    } else if (this.type === 'sage') {
      // Sages have slight movement too - they meditate, pace slightly, etc.
      if (this.state !== 'moving' && Math.random() < 0.0005) { // Very rare spontaneous movement
        const directions = [[0,1], [0,-1], [-1,0], [1,0]];
        const [dx, dy] = directions[Math.floor(Math.random() * directions.length)];
        const distance = 1 + Math.floor(Math.random() * 2); // 1-2 tiles

        const newTargetX = this.x + (dx * distance);
        const newTargetY = this.y + (dy * distance);

        if (!map || !map.isCollidable(newTargetX, newTargetY)) {
          this.targetX = newTargetX;
          this.targetY = newTargetY;
          this.state = 'moving';
        }
      }
    }
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
    if (this.state === 'sleeping') return; 

    const { pxX, pxY } = this.getInterpolatedPosition();
    if (!camera.isVisible(pxX, pxY)) return;

    const screenPos = camera.toScreenSpace(pxX, pxY);
    const ts = camera.tileSize;

    if (this.type === 'mayasur') {
      // Large dark purple shadow vortex with red glowing eyes
      ctx.fillStyle = 'rgba(11, 4, 18, 0.85)';
      ctx.beginPath();
      ctx.arc(screenPos.x + ts/2, screenPos.y + ts/2 - 4, ts * 1.6, 0, Math.PI * 2);
      ctx.fill();
      
      // Secondary shockwave ring
      ctx.strokeStyle = '#800080';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(screenPos.x + ts/2, screenPos.y + ts/2 - 4, ts * (1.6 + Math.sin(Date.now() * 0.007) * 0.3), 0, Math.PI * 2);
      ctx.stroke();

      // Red eyes
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(screenPos.x + 3, screenPos.y + 4, 2, 2);
      ctx.fillRect(screenPos.x + ts - 5, screenPos.y + 4, 2, 2);
      return;
    }

    if (this.type === 'wanderer') {
      // Draw the Wanderer using unique dark colors or standard sprite
      ctx.fillStyle = '#11112b';
      ctx.fillRect(screenPos.x + 3, screenPos.y + 3, ts - 6, ts - 4);
      ctx.fillStyle = '#fce4c8';
      ctx.fillRect(screenPos.x + 6, screenPos.y + 2, ts - 12, 3);
      return;
    }

    // Draw Sage / Civilian from sheet using coordinates
    const srcX = (this.spriteWidth * this.direction) + (this.imagePoss.x * 64);
    const srcY = (this.spriteHeight * this.walkFrame) + (this.imagePoss.y * 84);
    const sheet = this._getTintedSheet() || this.spriteSheet;
    const sheetW = sheet.naturalWidth || sheet.width || 0;
    const sheetH = sheet.naturalHeight || sheet.height || 0;

    if (srcX + this.spriteWidth <= sheetW && srcY + this.spriteHeight <= sheetH) {
      const drawHeight = Math.floor(ts * (21 / 16));
      const drawYOffset = Math.floor(ts * 0.3);

      ctx.drawImage(
        sheet,
        srcX, srcY,
        this.spriteWidth, this.spriteHeight,
        screenPos.x, screenPos.y - drawYOffset,
        ts, drawHeight
      );
    } else {
      ctx.fillStyle = '#1a2e27';
      ctx.fillRect(screenPos.x, screenPos.y, ts, ts);
    }
  }
}

// Sage profiles mapped to imagePoss grid positions (npc.png: 256x84, 4 slots)
export function createSages() {
  return [
    new NPC(101, 'sage', 'Bhrigu', 96, 30, { dialogueKey: 'bhrigu', imagePoss: { x: 0, y: 0 }, tint: 'rgba(210,160,60,0.28)' }),
    new NPC(102, 'sage', 'Pulastya', 26, 80, { dialogueKey: 'pulastya', imagePoss: { x: 1, y: 0 }, tint: 'rgba(80,130,200,0.28)' }),
    new NPC(103, 'sage', 'Pulaha', 48, 14, { dialogueKey: 'pulaha', imagePoss: { x: 2, y: 0 }, tint: 'rgba(60,160,120,0.28)' }),
    new NPC(104, 'sage', 'Kratu', 76, 22, { dialogueKey: 'kratu', imagePoss: { x: 3, y: 0 }, tint: 'rgba(160,110,70,0.28)' }),
    new NPC(105, 'sage', 'Angiras', 64, 50, { dialogueKey: 'angiras', imagePoss: { x: 0, y: 0 }, tint: 'rgba(220,90,60,0.28)' }),
    new NPC(106, 'sage', 'Marichi', 20, 26, { dialogueKey: 'marichi', imagePoss: { x: 1, y: 0 }, tint: 'rgba(220,200,80,0.28)' }),
    new NPC(107, 'sage', 'Atri', 22, 60, { dialogueKey: 'atri', imagePoss: { x: 2, y: 0 }, tint: 'rgba(130,80,180,0.28)' }),
    new NPC(108, 'sage', 'Vashistha', 64, 84, { dialogueKey: 'vashistha', imagePoss: { x: 3, y: 0 }, tint: 'rgba(60,160,160,0.28)' }),
    new NPC(109, 'sage', 'Daksha', 105, 36, { dialogueKey: 'daksha', imagePoss: { x: 0, y: 0 }, tint: 'rgba(200,110,40,0.28)' })
  ];
}

// Civilians mapped to imagePoss grid positions (npc.png: 256x84, 4 slots)
export function createCivilians() {
  const c = [];
  
  c.push(new NPC(201, 'civilian', 'Reva', 56, 110, {
    profession: 'farmer',
    dialogueKey: 'farmer',
    imagePoss: { x: 1, y: 0 },
    tint: 'rgba(100,180,80,0.32)',
    schedule: {
      6: { x: 51, y: 115, state: 'working' },
      17: { x: 56, y: 110, state: 'idle' },
      19: { x: 56, y: 110, state: 'sleeping' }
    }
  }));

  c.push(new NPC(202, 'civilian', 'Deva', 64, 110, {
    profession: 'potter',
    dialogueKey: 'potter',
    imagePoss: { x: 2, y: 0 },
    tint: 'rgba(210,100,130,0.32)',
    schedule: {
      6: { x: 67, y: 118, state: 'working' },
      17: { x: 64, y: 110, state: 'idle' },
      19: { x: 64, y: 110, state: 'sleeping' }
    }
  }));

  c.push(new NPC(203, 'civilian', 'Kala', 72, 110, {
    profession: 'weaver',
    dialogueKey: 'weaver',
    imagePoss: { x: 3, y: 0 },
    tint: 'rgba(90,90,180,0.32)',
    schedule: {
      6: { x: 70, y: 112, state: 'working' },
      17: { x: 72, y: 110, state: 'idle' },
      19: { x: 72, y: 110, state: 'sleeping' }
    }
  }));

  c.push(new NPC(204, 'civilian', 'Hari', 60, 106, {
    profession: 'trader',
    dialogueKey: 'trader',
    imagePoss: { x: 0, y: 0 },
    tint: 'rgba(200,170,50,0.32)',
    schedule: {
      8: { x: 64, y: 112, state: 'working' },
      17: { x: 60, y: 106, state: 'idle' },
      19: { x: 60, y: 106, state: 'sleeping' }
    }
  }));

  return c;
}

// Map-relative Sages Spawner
export function createSagesForMap(mapId) {
  const list = [];
  
  if (mapId === 1) { // First-life guide beside the village spawn
    list.push(new NPC(101, 'sage', 'Bhrigu', 40, 67, { dialogueKey: 'bhrigu', imagePoss: { x: 0, y: 0 }, tint: 'rgba(210,160,60,0.28)' }));
  }
  else if (mapId === 2) { // Bhrigu's Ashram
    list.push(new NPC(101, 'sage', 'Bhrigu', 10, 10, { dialogueKey: 'bhrigu', imagePoss: { x: 0, y: 0 }, tint: 'rgba(210,160,60,0.28)' }));
  }
  else if (mapId === 19) { // Mahameru Hermitage (Pulastya)
    list.push(new NPC(102, 'sage', 'Pulastya', 8, 8, { dialogueKey: 'pulastya', imagePoss: { x: 1, y: 0 }, tint: 'rgba(80,130,200,0.28)' }));
  }
  else if (mapId === 15) { // Sanctuary of Time (Pulaha)
    list.push(new NPC(103, 'sage', 'Pulaha', 16, 16, { dialogueKey: 'pulaha', imagePoss: { x: 2, y: 0 }, tint: 'rgba(60,160,120,0.28)' }));
  }
  else if (mapId === 6) { // Sacred Grove Entrance (Kratu)
    list.push(new NPC(104, 'sage', 'Kratu', 40, 42, { dialogueKey: 'kratu', imagePoss: { x: 3, y: 0 }, tint: 'rgba(160,110,70,0.28)' }));
  }
  else if (mapId === 13) { // Crag Heights (Angiras)
    list.push(new NPC(105, 'sage', 'Angiras', 20, 20, { dialogueKey: 'angiras', imagePoss: { x: 0, y: 0 }, tint: 'rgba(220,90,60,0.28)' }));
  }
  else if (mapId === 20) { // Silent Peak Summit (Marichi)
    list.push(new NPC(106, 'sage', 'Marichi', 20, 20, { dialogueKey: 'marichi', imagePoss: { x: 1, y: 0 }, tint: 'rgba(220,200,80,0.28)' }));
  }
  else if (mapId === 21) { // Temple of Vows Altar (Atri)
    list.push(new NPC(107, 'sage', 'Atri', 40, 45, { dialogueKey: 'atri', imagePoss: { x: 2, y: 0 }, tint: 'rgba(130,80,180,0.28)' }));
  }
  else if (mapId === 7) { // Vashistha's Hermitage
    list.push(new NPC(108, 'sage', 'Vashistha', 10, 10, { dialogueKey: 'vashistha', imagePoss: { x: 3, y: 0 }, tint: 'rgba(60,160,160,0.28)' }));
  }
  else if (mapId === 11) { // Volcanic Forge (Daksha)
    list.push(new NPC(109, 'sage', 'Daksha', 12, 12, { dialogueKey: 'daksha', imagePoss: { x: 0, y: 0 }, tint: 'rgba(200,110,40,0.28)' }));
  }
  
  return list;
}

// Map-relative Civilians Spawner
export function createCiviliansForMap(mapId) {
  const c = [];
  
  if (mapId === 1) { // Suryanagar Village Square
    c.push(new NPC(201, 'civilian', 'Reva', 30, 70, {
      profession: 'farmer',
      dialogueKey: 'farmer',
      imagePoss: { x: 1, y: 0 },
      tint: 'rgba(100,180,80,0.32)',
      schedule: {
        6: { x: 30, y: 70, state: 'working' },  // farmland
        12: { state: 'idle' },                   // afternoon wandering
        17: { x: 40, y: 40, state: 'idle' },    // village centre
        19: { x: 33, y: 72, state: 'sleeping' },
        22: { x: 33, y: 72, state: 'sleeping' }
      }
    }));

    c.push(new NPC(202, 'civilian', 'Deva', 55, 55, {
      profession: 'potter',
      dialogueKey: 'potter',
      imagePoss: { x: 2, y: 0 },
      tint: 'rgba(210,100,130,0.32)',
      schedule: {
        6: { x: 55, y: 55, state: 'working' },
        12: { state: 'idle' },
        17: { x: 40, y: 40, state: 'idle' },
        19: { x: 53, y: 57, state: 'sleeping' },
        22: { x: 53, y: 57, state: 'sleeping' }
      }
    }));

    c.push(new NPC(203, 'civilian', 'Kala', 20, 30, {
      profession: 'weaver',
      dialogueKey: 'weaver',
      imagePoss: { x: 3, y: 0 },
      tint: 'rgba(90,90,180,0.32)',
      schedule: {
        6: { x: 20, y: 30, state: 'working' },
        12: { state: 'idle' },
        17: { x: 40, y: 40, state: 'idle' },
        19: { x: 18, y: 32, state: 'sleeping' },
        22: { x: 18, y: 32, state: 'sleeping' }
      }
    }));

    c.push(new NPC(204, 'civilian', 'Hari', 60, 20, {
      profession: 'trader',
      dialogueKey: 'trader',
      imagePoss: { x: 0, y: 0 },
      tint: 'rgba(200,170,50,0.32)',
      schedule: {
        8: { x: 60, y: 20, state: 'working' },
        12: { state: 'idle' },
        17: { x: 40, y: 40, state: 'idle' },
        19: { x: 58, y: 22, state: 'sleeping' },
        22: { x: 58, y: 22, state: 'sleeping' }
      }
    }));
  }

  return c;
}
