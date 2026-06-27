/**
 * CinematicIntro — MayaWorld 2D
 * Canvas (atmosphere) + DOM (text) cinematic played before the title screen.
 *
 * Acts:
 *   0  3s  — Void: MAYAWORLD title builds letter-by-letter, particles drift
 *   1  6s  — Creation: island silhouette dissolves in, star field parallax
 *   2  7s  — Sages: golden particle arcs, "Nine Sages held the law of Rta"
 *   3  7s  — Fall: Tamas corrupts, dark red ripple wave
 *   4  6s  — Player: "You are Samat. The Seeker." — teal aura breathes
 *   5  ∞   — Title lock: existing intro-overlay shown; cinematic done
 *
 * Usage:
 *   const cin = new CinematicIntro();
 *   cin.start(canvas, ctx, onComplete);
 *   // in game loop:
 *   cin.update(deltaMs);
 *   cin.render();
 *   // skip:
 *   cin.skip();
 */
export class CinematicIntro {
  constructor() {
    this._canvas = null;
    this._ctx = null;
    this._onComplete = null;

    this._act = -1;           // -1 = not started
    this._actElapsed = 0;     // ms elapsed in current act
    this._totalElapsed = 0;   // ms elapsed overall
    this._done = false;

    // Act durations in ms
    this._ACT_DUR = [3000, 6000, 7000, 7000, 6000];

    // Particle systems — one per act
    this._particles = [];
    this._time = 0; // cumulative ms

    // Precomputed star positions (stable across frames)
    this._stars = this._makeStars(200);

    // Ripple rings (act 3)
    this._ripples = [];

    // DOM references
    this._domOverlay = null;
    this._actPanels = [];
    this._skipBtn = null;

    // Letter-by-letter title state (act 0)
    this._titleLetters = 'MAYAWORLD'.split('');
    this._letterReveal = 0;
    this._letterTimer = 0;
  }

  // -------------------------------------------------------
  //  PUBLIC API
  // -------------------------------------------------------

  start(canvas, ctx, onComplete) {
    this._canvas = canvas;
    this._ctx = ctx;
    this._onComplete = onComplete;
    this._done = false;
    this._time = 0;

    this._domOverlay = document.getElementById('cinematic-overlay');
    if (!this._domOverlay) {
      // Fallback: overlay missing — skip straight to title
      this._complete();
      return;
    }
    this._actPanels = Array.from(this._domOverlay.querySelectorAll('.cin-act'));
    this._skipBtn = this._domOverlay.querySelector('#cin-skip-btn');

    if (this._skipBtn) {
      this._skipBtn.addEventListener('click', () => this.skip(), { once: false });
    }
    document.addEventListener('keydown', this._keyHandler = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') this.skip();
    });

    this._domOverlay.classList.remove('hidden');
    this._initParticles();
    this._enterAct(0);
  }

  update(dt) {
    if (this._done || this._act < 0) return;
    this._time += dt;
    this._actElapsed += dt;
    this._totalElapsed += dt;

    // Letter reveal (act 0)
    if (this._act === 0) {
      this._letterTimer += dt;
      const speed = 220; // ms per letter
      const shouldReveal = Math.floor(this._letterTimer / speed);
      this._letterReveal = Math.min(shouldReveal, this._titleLetters.length);
    }

    // Ripple update (act 3)
    if (this._act === 3) {
      for (const r of this._ripples) {
        r.radius += r.speed * (dt / 16);
        r.alpha = Math.max(0, r.alpha - 0.008 * (dt / 16));
      }
      this._ripples = this._ripples.filter(r => r.alpha > 0);
      // Spawn new ripple occasionally
      if (Math.random() < 0.03) this._spawnRipple();
    }

    // Particle drift
    for (const p of this._particles) {
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.life -= p.decay * (dt / 16);
      // Wrap
      if (p.x < 0) p.x = this._canvas.width;
      if (p.x > this._canvas.width) p.x = 0;
      if (p.y < 0) p.y = this._canvas.height;
      if (p.y > this._canvas.height) p.y = 0;
      // Respawn dead
      if (p.life <= 0) this._resetParticle(p);
    }

    // Advance act when duration exceeded
    if (this._act < this._ACT_DUR.length && this._actElapsed >= this._ACT_DUR[this._act]) {
      const next = this._act + 1;
      if (next >= this._ACT_DUR.length) {
        // All acts done → show title
        this._complete();
      } else {
        this._enterAct(next);
      }
    }
  }

  render() {
    if (this._done || this._act < 0 || !this._ctx) return;
    const ctx = this._ctx;
    const W = this._canvas.width;
    const H = this._canvas.height;
    const t = this._time;
    const act = this._act;

    ctx.clearRect(0, 0, W, H);

    if (act === 0) this._renderAct0(ctx, W, H, t);
    else if (act === 1) this._renderAct1(ctx, W, H, t);
    else if (act === 2) this._renderAct2(ctx, W, H, t);
    else if (act === 3) this._renderAct3(ctx, W, H, t);
    else if (act === 4) this._renderAct4(ctx, W, H, t);
  }

  skip() {
    if (this._done) return;
    this._complete();
  }

  get isDone() { return this._done; }

  // -------------------------------------------------------
  //  ACT TRANSITIONS
  // -------------------------------------------------------

  _enterAct(n) {
    this._act = n;
    this._actElapsed = 0;
    this._letterTimer = 0;
    this._letterReveal = 0;

    // Hide all DOM panels, show the one for this act
    for (const el of this._actPanels) el.classList.remove('active');
    const panel = this._actPanels[n];
    if (panel) {
      // Tiny delay so CSS transition picks up the class add
      setTimeout(() => panel.classList.add('active'), 30);
    }

    if (n === 3) {
      // Pre-spawn ripple burst for act 3
      for (let i = 0; i < 4; i++) setTimeout(() => this._spawnRipple(), i * 400);
    }
  }

  _complete() {
    if (this._done) return;
    this._done = true;

    // Remove DOM cinematic overlay
    if (this._domOverlay) {
      this._domOverlay.classList.add('cin-fade-out');
      setTimeout(() => {
        this._domOverlay.classList.add('hidden');
        this._domOverlay.classList.remove('cin-fade-out');
      }, 600);
    }
    // Remove key handler
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (this._onComplete) this._onComplete();
  }

  // -------------------------------------------------------
  //  RENDERERS — one per act
  // -------------------------------------------------------

  /** Act 0 — Black void, drifting teal particles, letter-by-letter title */
  _renderAct0(ctx, W, H, t) {
    // Deep void
    ctx.fillStyle = '#03060a';
    ctx.fillRect(0, 0, W, H);

    // Faint particle field
    this._drawParticles(ctx, 'rgba(117, 209, 186, 0.4)', 1.5);

    // Letter-by-letter title
    const letters = this._titleLetters.slice(0, this._letterReveal);
    const totalWidth = letters.length * 72;
    const startX = (W - totalWidth) / 2;
    const y = H / 2 - 30;

    ctx.save();
    ctx.font = 'bold 72px "Cormorant Garamond", serif';
    ctx.textBaseline = 'middle';
    letters.forEach((ch, i) => {
      const progress = Math.min(1, (this._letterReveal - i) / 1);
      const alpha = progress;
      const grd = ctx.createLinearGradient(0, y - 36, 0, y + 36);
      grd.addColorStop(0, `rgba(245, 235, 200, ${alpha})`);
      grd.addColorStop(0.5, `rgba(196, 166, 79, ${alpha})`);
      grd.addColorStop(1, `rgba(117, 209, 186, ${alpha})`);
      ctx.fillStyle = grd;
      ctx.shadowColor = `rgba(196, 166, 79, ${alpha * 0.7})`;
      ctx.shadowBlur = 24;
      ctx.fillText(ch, startX + i * 72, y);
    });
    ctx.restore();

    // Subtitle fades in after title is complete
    if (this._letterReveal >= this._titleLetters.length) {
      const subAlpha = Math.min(1, (this._actElapsed - 1800) / 800);
      if (subAlpha > 0) {
        ctx.save();
        ctx.font = '13px "Press Start 2P", monospace';
        ctx.fillStyle = `rgba(196, 166, 79, ${subAlpha})`;
        ctx.textAlign = 'center';
        ctx.letterSpacing = '4px';
        ctx.fillText("SEEKER'S REBIRTH", W / 2, H / 2 + 40);
        ctx.restore();
      }
    }
  }

  /** Act 1 — Star field, island silhouette dissolves in */
  _renderAct1(ctx, W, H, t) {
    // Deep space gradient
    const bg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, H*0.8);
    bg.addColorStop(0, '#0d1e1a');
    bg.addColorStop(1, '#02060b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Parallax star layers
    const speed1 = t * 0.004, speed2 = t * 0.008;
    for (const s of this._stars) {
      const offset = s.layer === 0 ? speed1 : speed2;
      const sx = (s.x + offset * s.speed) % W;
      const sy = s.y;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fill();
    }

    // Teal particle drift
    this._drawParticles(ctx, 'rgba(117, 209, 186, 0.3)', 1.2);

    // Island silhouette fades in after 2s
    const islandAlpha = Math.max(0, Math.min(1, (this._actElapsed - 2000) / 2500));
    if (islandAlpha > 0) {
      this._drawIslandSilhouette(ctx, W, H, islandAlpha);
    }
  }

  /** Act 2 — Golden arc particles, sage glow rings */
  _renderAct2(ctx, W, H, t) {
    const bg = ctx.createRadialGradient(W/2, H*0.4, 0, W/2, H*0.4, H);
    bg.addColorStop(0, '#0f1e10');
    bg.addColorStop(1, '#040a06');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Stars faint
    for (const s of this._stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 0.8, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,255,255,${s.a * 0.4})`;
      ctx.fill();
    }

    // 9 golden glow rings in a semicircle — one per sage
    const cx = W / 2, cy = H * 0.52;
    const radius = Math.min(W, H) * 0.32;
    for (let i = 0; i < 9; i++) {
      const angle = (Math.PI / 8) * i - Math.PI * 0.5 + Math.PI / 16;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius * 0.55;
      const revealTime = i * 450; // stagger
      const ringAlpha = Math.max(0, Math.min(0.8, (this._actElapsed - revealTime) / 600));
      if (ringAlpha <= 0) continue;

      // Ring glow
      const pulse = 0.7 + 0.3 * Math.sin(t * 0.002 + i * 0.7);
      const grd = ctx.createRadialGradient(px, py, 0, px, py, 26);
      grd.addColorStop(0, `rgba(255, 220, 100, ${ringAlpha * pulse})`);
      grd.addColorStop(0.5, `rgba(196, 166, 79, ${ringAlpha * 0.6 * pulse})`);
      grd.addColorStop(1, 'rgba(196, 166, 79, 0)');
      ctx.beginPath();
      ctx.arc(px, py, 26, 0, Math.PI*2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Dot centre
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255, 240, 180, ${ringAlpha})`;
      ctx.fill();
    }

    // Golden arc particle shower
    this._drawParticles(ctx, `rgba(255, 210, 80, 0.5)`, 2);
  }

  /** Act 3 — Dark corruption, red ripple waves, screen flash */
  _renderAct3(ctx, W, H, t) {
    const flashPhase = Math.max(0, Math.sin(t * 0.0015));
    const bgR = Math.floor(8 + flashPhase * 25);
    ctx.fillStyle = `rgb(${bgR}, 4, 6)`;
    ctx.fillRect(0, 0, W, H);

    // Stars barely visible
    for (const s of this._stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 0.5, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,100,80,${s.a * 0.2})`;
      ctx.fill();
    }

    // Ripple rings
    for (const r of this._ripples) {
      ctx.beginPath();
      ctx.arc(r.cx, r.cy, r.radius, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(${r.color},${r.alpha})`;
      ctx.lineWidth = r.width;
      ctx.stroke();
    }

    // Dark particle cloud
    this._drawParticles(ctx, `rgba(180, 40, 30, 0.4)`, 2.5);

    // Centre corruption vortex
    const cx = W / 2, cy = H / 2;
    const vortexAlpha = Math.min(0.7, this._actElapsed / 3000);
    for (let ring = 0; ring < 4; ring++) {
      const r = 30 + ring * 35;
      const rot = t * (0.001 + ring * 0.0005) * (ring % 2 === 0 ? 1 : -1);
      const grd = ctx.createRadialGradient(cx, cy, r*0.3, cx, cy, r);
      grd.addColorStop(0, `rgba(200, 20, 20, ${vortexAlpha * 0.6})`);
      grd.addColorStop(1, 'rgba(200, 20, 20, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, r, rot, rot + Math.PI * 1.6);
      ctx.strokeStyle = `rgba(220, 60, 30, ${vortexAlpha * 0.5})`;
      ctx.lineWidth = 3 - ring * 0.4;
      ctx.stroke();
      ctx.fillStyle = grd;
      ctx.fill();
    }
  }

  /** Act 4 — Player teal aura breathe, "You are Samat" */
  _renderAct4(ctx, W, H, t) {
    const bg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, H*0.7);
    bg.addColorStop(0, '#081a18');
    bg.addColorStop(1, '#030b0a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Faint star recovery
    for (const s of this._stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(150,255,220,${s.a * 0.3})`;
      ctx.fill();
    }

    // Breathing aura rings
    const cx = W / 2, cy = H / 2 + 20;
    const breathPhase = Math.sin(t * 0.0018);
    const baseR = 80 + breathPhase * 18;

    for (let ring = 0; ring < 5; ring++) {
      const r = baseR + ring * 28;
      const alpha = (0.5 - ring * 0.08) * Math.max(0, Math.min(1, this._actElapsed / 1500));
      const grd = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r);
      grd.addColorStop(0, `rgba(117, 209, 186, ${alpha * 0.9})`);
      grd.addColorStop(0.6, `rgba(60, 180, 160, ${alpha * 0.4})`);
      grd.addColorStop(1, 'rgba(60, 180, 160, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }

    // Center dot — the seeker
    const dotAlpha = Math.min(1, this._actElapsed / 800);
    const dotR = 14 + breathPhase * 4;
    const dotGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR);
    dotGrd.addColorStop(0, `rgba(220, 255, 245, ${dotAlpha})`);
    dotGrd.addColorStop(0.6, `rgba(117, 209, 186, ${dotAlpha * 0.8})`);
    dotGrd.addColorStop(1, 'rgba(117, 209, 186, 0)');
    ctx.beginPath();
    ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
    ctx.fillStyle = dotGrd;
    ctx.fill();

    // Teal particles rising
    this._drawParticles(ctx, 'rgba(117, 209, 186, 0.55)', 1.8);
  }

  // -------------------------------------------------------
  //  HELPERS
  // -------------------------------------------------------

  _drawIslandSilhouette(ctx, W, H, alpha) {
    const cx = W / 2, cy = H * 0.58;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    // Rough island outline (organic path)
    const pts = [
      [0.30, 0.20], [0.38, 0.10], [0.50, 0.07], [0.62, 0.11],
      [0.72, 0.18], [0.76, 0.30], [0.72, 0.42], [0.65, 0.50],
      [0.68, 0.62], [0.62, 0.72], [0.50, 0.76], [0.38, 0.73],
      [0.32, 0.63], [0.26, 0.52], [0.24, 0.38], [0.28, 0.28]
    ];
    const isW = W * 0.55, isH = H * 0.50;
    const ox = cx - isW/2, oy = cy - isH/2;
    ctx.moveTo(ox + pts[0][0]*isW, oy + pts[0][1]*isH);
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i-1], curr = pts[i];
      const mx = ox + (prev[0]+curr[0])/2*isW;
      const my = oy + (prev[1]+curr[1])/2*isH;
      ctx.quadraticCurveTo(ox+prev[0]*isW, oy+prev[1]*isH, mx, my);
    }
    ctx.closePath();

    const fillGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, isW*0.5);
    fillGrd.addColorStop(0, 'rgba(25, 80, 55, 0.95)');
    fillGrd.addColorStop(0.6, 'rgba(10, 45, 30, 0.9)');
    fillGrd.addColorStop(1, 'rgba(5, 20, 15, 0.8)');
    ctx.fillStyle = fillGrd;
    ctx.fill();

    // Glow rim
    ctx.strokeStyle = 'rgba(117, 209, 186, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  _drawParticles(ctx, color, size) {
    ctx.save();
    for (const p of this._particles) {
      if (p.life <= 0) continue;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * p.size, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.restore();
  }

  _initParticles() {
    const W = this._canvas.width, H = this._canvas.height;
    this._particles = [];
    for (let i = 0; i < 120; i++) {
      const p = { x: 0, y: 0, vx: 0, vy: 0, life: 0, decay: 0, size: 0 };
      this._resetParticle(p, W, H, true);
      this._particles.push(p);
    }
  }

  _resetParticle(p, W, H, initial = false) {
    W = W || (this._canvas && this._canvas.width) || 960;
    H = H || (this._canvas && this._canvas.height) || 640;
    p.x = Math.random() * W;
    p.y = initial ? Math.random() * H : H + 5;
    const speed = 0.15 + Math.random() * 0.3;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.life = 0.4 + Math.random() * 0.6;
    p.decay = 0.003 + Math.random() * 0.004;
    p.size = 0.5 + Math.random() * 1.2;
  }

  _makeStars(n) {
    const stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * 960,
        y: Math.random() * 640,
        r: 0.5 + Math.random() * 1.5,
        a: 0.2 + Math.random() * 0.7,
        layer: Math.random() < 0.5 ? 0 : 1,
        speed: 0.2 + Math.random() * 0.6
      });
    }
    return stars;
  }

  _spawnRipple() {
    const W = this._canvas ? this._canvas.width : 960;
    const H = this._canvas ? this._canvas.height : 640;
    const isEdge = Math.random() < 0.4;
    const cx = isEdge ? (Math.random() < 0.5 ? 0 : W) : W * 0.2 + Math.random() * W * 0.6;
    const cy = isEdge ? Math.random() * H : H * 0.2 + Math.random() * H * 0.6;
    const isDark = Math.random() < 0.5;
    this._ripples.push({
      cx, cy,
      radius: 5 + Math.random() * 20,
      speed: 1.8 + Math.random() * 2.5,
      alpha: 0.7 + Math.random() * 0.3,
      width: 1.5 + Math.random() * 2,
      color: isDark ? '180, 20, 20' : '220, 80, 40'
    });
  }
}
