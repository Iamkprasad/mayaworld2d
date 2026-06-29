export class BattleSystem {
  constructor(game) {
    this.game = game;
    this.state = null;
  }

  get player() { return this.game.player; }
  get ctx() { return this.game.ctx; }
  get canvas() { return this.game.canvas; }
  get clock() { return this.game.clock; }
  get preloadedImages() { return this.game.preloadedImages; }
  get journal() { return this.game.journal; }

  triggerMayasurBattle() {
    this.game.state = 'battle';
    this.player.isMeditating = false;
    this.state = {
      phase: 'menu',
      menuIndex: 0,
      subMenu: null,
      subIndex: 0,
      text: 'Mayasur blocks your path! The atmosphere grows heavy.',
      text2: null,
      damage: 0,
      maunaTurns: 0,
      shieldActive: false,
      dodgedTurn: false,
      timer: 0
    };
  }

  update(_deltaTime) {
  }

  handleInput(code) {
    const s = this.state;
    if (!s) return;

    if (s.phase === 'menu') {
      if (s.subMenu === null) {
        if (code === 'ArrowDown' || code === 'KeyS') {
          s.menuIndex = (s.menuIndex + 2) % 4;
        } else if (code === 'ArrowUp' || code === 'KeyW') {
          s.menuIndex = (s.menuIndex - 2 + 4) % 4;
        } else if (code === 'ArrowRight' || code === 'KeyD') {
          s.menuIndex = s.menuIndex % 2 === 0 ? s.menuIndex + 1 : s.menuIndex - 1;
        } else if (code === 'ArrowLeft' || code === 'KeyA') {
          s.menuIndex = s.menuIndex % 2 === 1 ? s.menuIndex - 1 : s.menuIndex + 1;
        } else if (code === 'KeyZ') {
          this.confirmMenuOption();
        }
      } else if (s.subMenu === 'fight') {
        const vidyas = this.getBattleVidyas();
        if (vidyas.length === 0) {
          s.subMenu = null;
          return;
        }
        if (code === 'ArrowDown' || code === 'KeyS') {
          s.subIndex = (s.subIndex + 2) % vidyas.length;
        } else if (code === 'ArrowUp' || code === 'KeyW') {
          s.subIndex = (s.subIndex - 2 + vidyas.length) % vidyas.length;
        } else if (code === 'ArrowRight' || code === 'KeyD') {
          s.subIndex = Math.min(vidyas.length - 1, s.subIndex + 1);
        } else if (code === 'ArrowLeft' || code === 'KeyA') {
          s.subIndex = Math.max(0, s.subIndex - 1);
        } else if (code === 'KeyX') {
          s.subMenu = null;
        } else if (code === 'KeyZ') {
          this.executeVidyaAction(vidyas[s.subIndex]);
        }
      }
    } else {
      if (code === 'KeyZ' || code === 'KeyX') {
        this.advancePhase();
      }
    }
  }

  getBattleVidyas() {
    const list = [];
    for (const key in this.player.vidyas) {
      if (this.player.vidyas[key] > 0 && key !== 'mauna') {
        list.push(key);
      }
    }
    return list;
  }

  confirmMenuOption() {
    const s = this.state;
    if (s.menuIndex === 0) {
      const vidyas = this.getBattleVidyas();
      if (vidyas.length === 0) {
        s.text = 'You know no combat Vidyas! You stand defenseless. (Press Z)';
        s.phase = 'player-action';
      } else {
        s.subMenu = 'fight';
        s.subIndex = 0;
      }
    } else if (s.menuIndex === 1) {
      s.phase = 'player-action';
      s.maunaTurns += 1;
      s.text = 'You sit in silent contemplation, observing the thought patterns of fear. (Press Z)';
      s.text2 = `Your inner stillness expands. Mayasur is confused by your passivity (Silence Step ${s.maunaTurns}/3). (Press Z)`;
      this.game.triggerVisualVFX('yoga');
      if (s.maunaTurns >= 3) {
        s.phase = 'resolved';
      }
    } else if (s.menuIndex === 2) {
      s.phase = 'player-action';
      s.text = `Seeker Stats: Age ${this.player.age} | Breath ${Math.ceil(this.player.breath)} | Light Karma ${this.player.karmaLight} (Press Z)`;
      s.text2 = null;
    } else if (s.menuIndex === 3) {
      s.phase = 'player-action';
      s.text = 'You retreat to the village shrine, gasping for breath. (Press Z)';
      s.timer = -1;
      s.text2 = null;
    }
  }

  executeVidyaAction(vidyaKey) {
    const s = this.state;
    s.subMenu = null;
    s.phase = 'player-action';
    this.game.triggerVisualVFX(vidyaKey);

    if (vidyaKey === 'agni') {
      s.text = "You trace the Agni Seal! Red fire waves spin outward. (Press Z)";
      s.text2 = "Mayasur counters! 'Fire is consumed by my void.' Drains 30 breath! (Press Z)";
      s.damage = 30;
    } else if (vidyaKey === 'dhanur') {
      s.text = "You loose a piercing Dhanur arrow of light! (Press Z)";
      s.text2 = "Mayasur deflects it into the void. Drains 25 breath! (Press Z)";
      s.damage = 25;
    } else if (vidyaKey === 'brahma') {
      s.text = "You chant Brahma Vidya, erecting a protective golden dome. (Press Z)";
      s.text2 = "Mayasur strikes! The golden dome glows bright, absorbing the shadow strike. (Press Z)";
      s.shieldActive = true;
      s.damage = 10;
    } else if (vidyaKey === 'yoga') {
      s.text = "You control your breath with Yoga, slowing down perception. (Press Z)";
      s.text2 = "Mayasur strikes, but you gracefully step aside, taking no damage! (Press Z)";
      s.dodgedTurn = true;
      s.damage = 0;
    } else {
      s.text = `You attempt to use ${vidyaKey.toUpperCase()} Vidya to reason with the shadow. (Press Z)`;
      s.text2 = "Mayasur ignores your arguments and lashes out! Drains 20 breath. (Press Z)";
      s.damage = 20;
    }
  }

  advancePhase() {
    const s = this.state;
    if (s.phase === 'player-action') {
      if (s.timer === -1) {
        this.player.deductBreath(40);
        this.game.state = 'playing';
        this.game.stopMayasurAttack();
        return;
      }
      if (s.text2) {
        s.text = s.text2;
        s.text2 = null;
        let dmg = s.damage || 0;
        if (s.shieldActive) {
          dmg = Math.floor(dmg / 2);
          s.shieldActive = false;
        }
        if (s.dodgedTurn) {
          dmg = 0;
          s.dodgedTurn = false;
        }
        this.player.deductBreath(dmg);
        if (this.player.breath <= 0) {
          s.phase = 'resolved';
          s.text = 'Your breath fades... The shadow consumes your physical body. (Press Z)';
        }
      } else {
        s.phase = 'menu';
        s.text = 'What will you do?';
      }
    } else if (s.phase === 'resolved') {
      if (this.player.breath <= 0) {
        this.game.state = 'playing';
        this.game.triggerDeath(true);
      } else {
        this.game.state = 'playing';
        this.game.stopMayasurAttack();
        this.journal.data.maunaMeditationDone = true;
        this.journal.collectDreamFragment(2);
        this.journal.data.karmaLight += 50;
        this.journal.saveToStorage();
        this.game.queueDialogue("Mayasur's Retreat", [
          "Mayasur hesitates. Your complete stillness has mirrored the void back onto itself.",
          'A whisper fills your ears: \'I am Tamas... the Tenth Sage who desired to conquer Rta...\'',
          'The shadow dissolves. The eclipse lifts. You have survived, Seeker.'
        ]);
      }
    }
  }

  drawWrappedText(text, x, y, maxWidth, lineHeight, maxLines = 4) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = '';

    words.forEach(word => {
      const test = line ? `${line} ${word}` : word;
      if (this.ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);

    lines.slice(0, maxLines).forEach((wrappedLine, index) => {
      this.ctx.fillText(wrappedLine, x, y + index * lineHeight);
    });
  }

  render() {
    this.ctx.fillStyle = '#090a12';
    this.ctx.fillRect(0, 0, 960, 640);

    const bg = this.preloadedImages['assets/images/mayasur_battle_backdrop.png'];
    if (bg && bg.complete) {
      this.ctx.drawImage(bg, 12, 12, 936, 426);
    }

    this.ctx.strokeStyle = '#ae905d';
    this.ctx.lineWidth = 6;
    this.ctx.strokeRect(12, 12, 936, 616);

    this.ctx.fillStyle = 'rgba(233, 196, 130, 0.08)';
    this.ctx.beginPath();
    this.ctx.ellipse(480, 380, 320, 90, 0, 0, Math.PI * 2);
    this.ctx.fill();

    const portrait = this.preloadedImages['assets/images/player_portrait.png'];
    if (portrait && portrait.complete) {
      this.ctx.strokeStyle = '#ae905d';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(40, 275, 54, 54);
      this.ctx.drawImage(portrait, 42, 277, 50, 50);

      this.ctx.fillStyle = '#e0f2ed';
      this.ctx.font = 'bold 20px "Outfit"';
      this.ctx.fillText(this.player.name, 108, 295);
      this.ctx.font = '15px "Outfit"';
      this.ctx.fillText(`Age: ${this.player.age} Years`, 108, 318);

      this.ctx.fillStyle = '#1e382d';
      this.ctx.fillRect(108, 330, 130, 12);
      const breathPct = Math.max(0, this.player.breath / this.player.breathMax);
      this.ctx.fillStyle = breathPct > 0.4 ? '#47cc82' : '#d23d3d';
      this.ctx.fillRect(108, 330, 130 * breathPct, 12);
      this.ctx.strokeStyle = '#ebd09b';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(108, 330, 130, 12);
    } else {
      this.ctx.fillStyle = '#e0f2ed';
      this.ctx.font = 'bold 22px "Outfit"';
      this.ctx.fillText(this.player.name, 100, 290);
      this.ctx.font = '16px "Outfit"';
      this.ctx.fillText(`Age: ${this.player.age} Years`, 100, 315);

      this.ctx.fillStyle = '#1e382d';
      this.ctx.fillRect(100, 330, 200, 16);
      const breathPct = Math.max(0, this.player.breath / this.player.breathMax);
      this.ctx.fillStyle = breathPct > 0.4 ? '#47cc82' : '#d23d3d';
      this.ctx.fillRect(100, 330, 200 * breathPct, 16);
      this.ctx.strokeStyle = '#ebd09b';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(100, 330, 200, 16);
    }

    const pX = 180;
    const pY = 360;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(
      this.player.spriteSheet,
      this.player.spriteWidth * this.player.direction,
      this.player.spriteHeight * this.player.walkFrame,
      this.player.spriteWidth, this.player.spriteHeight,
      pX, pY, 64, 64
    );

    this.ctx.fillStyle = '#d23d3d';
    this.ctx.font = 'bold 24px "Outfit"';
    this.ctx.fillText('MAYASUR', 650, 100);
    this.ctx.font = '16px "Outfit"';
    this.ctx.fillStyle = '#ebd09b';
    this.ctx.fillText('Demonic Shadow of Tamas', 650, 125);

    const mX = 720;
    const mY = 240;
    this.ctx.fillStyle = 'rgba(28, 10, 42, 0.9)';
    this.ctx.beginPath();
    this.ctx.arc(mX, mY, 150 + Math.sin(Date.now() * 0.005) * 15, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#9636c7';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(mX, mY, 160 + Math.sin(Date.now() * 0.008) * 25, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.fillStyle = '#ff0000';
    this.ctx.fillRect(mX - 25, mY - 15, 16, 16);
    this.ctx.fillRect(mX + 10, mY - 15, 16, 16);

    this.game.renderVFX({ pX: pX + 40, pY: pY + 60, mX, mY });

    this.ctx.fillStyle = 'rgba(11, 26, 21, 0.98)';
    this.ctx.strokeStyle = '#ebd09b';
    this.ctx.lineWidth = 3;
    this.ctx.fillRect(40, 450, 520, 140);
    this.ctx.strokeRect(40, 450, 520, 140);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '18px "Outfit"';

    const text = this.state.text;
    const lines = text.split('(Press Z)');
    this.drawWrappedText(lines[0] || '', 60, 490, 470, 24, 3);
    if (lines.length > 1) {
      this.ctx.fillStyle = '#75d1ba';
      this.ctx.font = 'italic 16px "Outfit"';
      this.ctx.fillText('[Press Z to confirm]', 60, 565);
    }

    this.ctx.fillStyle = 'rgba(11, 26, 21, 0.98)';
    this.ctx.fillRect(580, 450, 340, 140);
    this.ctx.strokeRect(580, 450, 340, 140);

    const s = this.state;
    if (s.subMenu === null) {
      const options = ['FIGHT', 'OBSERVE', 'STATUS', 'FLEE'];
      this.ctx.font = 'bold 20px "Outfit"';
      options.forEach((opt, idx) => {
        const x = 620 + (idx % 2) * 150;
        const y = 495 + Math.floor(idx / 2) * 60;
        this.ctx.fillStyle = s.menuIndex === idx ? '#ebd09b' : '#8fa39e';
        this.ctx.fillText((s.menuIndex === idx ? '\u25b6 ' : '') + opt, x, y);
      });
    } else if (s.subMenu === 'fight') {
      const vidyas = this.getBattleVidyas();
      this.ctx.font = 'bold 16px "Outfit"';
      vidyas.forEach((v, idx) => {
        if (idx < 4) {
          const x = 620 + (idx % 2) * 150;
          const y = 495 + Math.floor(idx / 2) * 60;
          this.ctx.fillStyle = s.subIndex === idx ? '#ebd09b' : '#8fa39e';
          this.ctx.fillText((s.subIndex === idx ? '\u25b6 ' : '') + v.toUpperCase(), x, y);
        }
      });
      this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
      this.ctx.font = '12px "Outfit"';
      this.ctx.fillText('Press X to return', 700, 575);
    }
  }
}
