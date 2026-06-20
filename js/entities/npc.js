// NPC Entities: Sages, Civilians, Mayasur, and the Wanderer - GBA Sprites

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
    
    this.spriteSheet = new Image();
    this.spriteSheet.src = 'assets/images/npc.png';
    this.spriteWidth = 16;
    this.spriteHeight = 21;
    this.walkFrame = 0;
  }

  isMoving() {
    return this.x !== this.targetX || this.y !== this.targetY;
  }

  updateSpriteSheet(epochId, mayasurAttackActive) {
    if (this.type === 'mayasur' || this.type === 'wanderer') return;

    let targetSrc = '';
    const isCivilian = this.type === 'civilian';

    if (mayasurAttackActive && isCivilian) {
      targetSrc = this.profession ? 'assets/images/characterSprites_corrupted.png' : 'assets/images/npc_corrupted.png';
    } else if (epochId >= 6) {
      targetSrc = this.profession ? 'assets/images/characterSprites_old.png' : 'assets/images/npc_old.png';
    } else {
      targetSrc = this.profession ? 'assets/images/characterSprites_normal.png' : 'assets/images/npc_normal.png';
    }

    if (!this.spriteSheet.src.endsWith(targetSrc)) {
      this.spriteSheet.src = targetSrc;
    }
  }

  update(deltaTime, clock, mayasurAttackActive, epochId = 1) {
    this.updateSpriteSheet(epochId, mayasurAttackActive);
    if (this.isMoving()) {
      this.movingProgress += this.speed;
      this.walkFrame = Math.floor(Date.now() / 150) % 2 + 1; // Oscillates between 1 and 2

      
      if (this.movingProgress >= 1.0) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.movingProgress = 0;
        this.walkFrame = 0; // standing still
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
        this.targetX = this.x + (moveAxisX ? dx : 0);
        this.targetY = this.y + (!moveAxisX ? dy : 0);
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
        } else {
          const dx = Math.sign(waypoint.x - this.x);
          const dy = Math.sign(waypoint.y - this.y);
          if (dx !== 0 || dy !== 0) {
            const moveX = Math.random() < 0.5;
            this.targetX = this.x + (moveX ? dx : 0);
            this.targetY = this.y + (!moveX ? dy : 0);
            
            if (dy > 0) this.direction = 0;
            else if (dy < 0) this.direction = 1;
            else if (dx < 0) this.direction = 2;
            else if (dx > 0) this.direction = 3;
          }
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
    // Source width = 16px, height = 21px
    const drawHeight = Math.floor(ts * (21 / 16));
    const drawYOffset = Math.floor(ts * 0.3);

    ctx.drawImage(
      this.spriteSheet,
      (this.spriteWidth * this.direction) + (this.imagePoss.x * 64),
      (this.spriteHeight * this.walkFrame) + (this.imagePoss.y * 84),
      this.spriteWidth,
      this.spriteHeight,
      screenPos.x,
      screenPos.y - drawYOffset, // offset up proportionally
      ts,
      drawHeight
    );
  }
}

// Sage profiles mapped to imagePoss grid positions (adapted for 128x128 map)
export function createSages() {
  return [
    new NPC(101, 'sage', 'Bhrigu', 96, 30, { dialogueKey: 'bhrigu', imagePoss: { x: 0, y: 0 } }),
    new NPC(102, 'sage', 'Pulastya', 26, 80, { dialogueKey: 'pulastya', imagePoss: { x: 1, y: 0 } }),
    new NPC(103, 'sage', 'Pulaha', 48, 14, { dialogueKey: 'pulaha', imagePoss: { x: 2, y: 0 } }),
    new NPC(104, 'sage', 'Kratu', 76, 22, { dialogueKey: 'kratu', imagePoss: { x: 3, y: 0 } }),
    new NPC(105, 'sage', 'Angiras', 64, 50, { dialogueKey: 'angiras', imagePoss: { x: 0, y: 1 } }),
    new NPC(106, 'sage', 'Marichi', 20, 26, { dialogueKey: 'marichi', imagePoss: { x: 1, y: 1 } }),
    new NPC(107, 'sage', 'Atri', 22, 60, { dialogueKey: 'atri', imagePoss: { x: 2, y: 1 } }),
    new NPC(108, 'sage', 'Vashistha', 64, 84, { dialogueKey: 'vashistha', imagePoss: { x: 3, y: 1 } }),
    new NPC(109, 'sage', 'Daksha', 105, 36, { dialogueKey: 'daksha', imagePoss: { x: 0, y: 2 } })
  ];
}

// Civilians mapped to imagePoss grid positions (adapted for 128x128 map)
export function createCivilians() {
  const c = [];
  
  c.push(new NPC(201, 'civilian', 'Reva', 56, 110, {
    profession: 'farmer',
    dialogueKey: 'farmer',
    imagePoss: { x: 1, y: 2 },
    schedule: {
      6: { x: 51, y: 115, state: 'working' },
      17: { x: 56, y: 110, state: 'idle' },
      19: { x: 56, y: 110, state: 'sleeping' }
    }
  }));

  c.push(new NPC(202, 'civilian', 'Deva', 64, 110, {
    profession: 'potter',
    dialogueKey: 'potter',
    imagePoss: { x: 2, y: 2 },
    schedule: {
      6: { x: 67, y: 118, state: 'working' },
      17: { x: 64, y: 110, state: 'idle' },
      19: { x: 64, y: 110, state: 'sleeping' }
    }
  }));

  c.push(new NPC(203, 'civilian', 'Kala', 72, 110, {
    profession: 'weaver',
    dialogueKey: 'weaver',
    imagePoss: { x: 3, y: 2 },
    schedule: {
      6: { x: 70, y: 112, state: 'working' },
      17: { x: 72, y: 110, state: 'idle' },
      19: { x: 72, y: 110, state: 'sleeping' }
    }
  }));

  c.push(new NPC(204, 'civilian', 'Hari', 60, 106, {
    profession: 'trader',
    dialogueKey: 'trader',
    imagePoss: { x: 1, y: 3 },
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
  
  if (mapId === 2) { // Bhrigu's Ashram
    list.push(new NPC(101, 'sage', 'Bhrigu', 10, 10, { dialogueKey: 'bhrigu', imagePoss: { x: 0, y: 0 } }));
  }
  else if (mapId === 19) { // Mahameru Hermitage (Pulastya)
    list.push(new NPC(102, 'sage', 'Pulastya', 8, 8, { dialogueKey: 'pulastya', imagePoss: { x: 1, y: 0 } }));
  }
  else if (mapId === 15) { // Sanctuary of Time (Pulaha)
    list.push(new NPC(103, 'sage', 'Pulaha', 16, 16, { dialogueKey: 'pulaha', imagePoss: { x: 2, y: 0 } }));
  }
  else if (mapId === 6) { // Sacred Grove Entrance (Kratu)
    list.push(new NPC(104, 'sage', 'Kratu', 40, 42, { dialogueKey: 'kratu', imagePoss: { x: 3, y: 0 } }));
  }
  else if (mapId === 13) { // Crag Heights (Angiras)
    list.push(new NPC(105, 'sage', 'Angiras', 20, 20, { dialogueKey: 'angiras', imagePoss: { x: 0, y: 1 } }));
  }
  else if (mapId === 20) { // Silent Peak Summit (Marichi)
    list.push(new NPC(106, 'sage', 'Marichi', 20, 20, { dialogueKey: 'marichi', imagePoss: { x: 1, y: 1 } }));
  }
  else if (mapId === 21) { // Temple of Vows Altar (Atri)
    list.push(new NPC(107, 'sage', 'Atri', 40, 45, { dialogueKey: 'atri', imagePoss: { x: 2, y: 1 } }));
  }
  else if (mapId === 7) { // Vashistha's Hermitage
    list.push(new NPC(108, 'sage', 'Vashistha', 10, 10, { dialogueKey: 'vashistha', imagePoss: { x: 3, y: 1 } }));
  }
  else if (mapId === 11) { // Volcanic Forge (Daksha)
    list.push(new NPC(109, 'sage', 'Daksha', 12, 12, { dialogueKey: 'daksha', imagePoss: { x: 0, y: 2 } }));
  }
  
  return list;
}

// Map-relative Civilians Spawner
export function createCiviliansForMap(mapId) {
  const c = [];
  
  if (mapId === 1) { // Suryanagar Village Square
    c.push(new NPC(201, 'civilian', 'Reva', 34, 28, {
      profession: 'farmer',
      dialogueKey: 'farmer',
      imagePoss: { x: 1, y: 2 },
      schedule: {
        6: { x: 48, y: 15, state: 'working' },  // crop fields
        17: { x: 34, y: 28, state: 'idle' },
        19: { x: 34, y: 28, state: 'sleeping' }
      }
    }));

    c.push(new NPC(202, 'civilian', 'Deva', 40, 36, {
      profession: 'potter',
      dialogueKey: 'potter',
      imagePoss: { x: 2, y: 2 },
      schedule: {
        6: { x: 42, y: 35, state: 'working' },
        17: { x: 40, y: 36, state: 'idle' },
        19: { x: 40, y: 36, state: 'sleeping' }
      }
    }));

    c.push(new NPC(203, 'civilian', 'Kala', 56, 32, {
      profession: 'weaver',
      dialogueKey: 'weaver',
      imagePoss: { x: 3, y: 2 },
      schedule: {
        6: { x: 62, y: 34, state: 'working' },
        17: { x: 56, y: 32, state: 'idle' },
        19: { x: 56, y: 32, state: 'sleeping' }
      }
    }));

    c.push(new NPC(204, 'civilian', 'Hari', 43, 30, {
      profession: 'trader',
      dialogueKey: 'trader',
      imagePoss: { x: 1, y: 3 },
      schedule: {
        8: { x: 40, y: 38, state: 'working' },
        17: { x: 43, y: 30, state: 'idle' },
        19: { x: 43, y: 30, state: 'sleeping' }
      }
    }));
  }

  return c;
}
