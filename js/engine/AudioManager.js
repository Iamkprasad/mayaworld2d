export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this._muted = false;
    this._volume = 0.5;
    this._initialized = false;
    this.buffers = {};
  }

  init() {
    if (this._initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._volume;
      this.masterGain.connect(this.ctx.destination);
      this._initialized = true;
    } catch (e) {
      console.warn('Web Audio API not available:', e);
    }
  }

  ensureResumed() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBeep(frequency = 440, duration = 150, type = 'sine') {
    if (!this._initialized || this._muted) return;
    this.ensureResumed();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(this._volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration / 1000);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + duration / 1000);
    } catch (e) {
      // silently fail
    }
  }

  playHit() { this.playBeep(200, 100, 'square'); }
  playHeal() { this.playBeep(523, 200, 'sine'); }
  playInteract() { this.playBeep(380, 80, 'triangle'); }
  playStep() { this.playBeep(100, 40, 'square'); }

  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) {
      this.masterGain.gain.value = this._volume;
    }
  }

  getVolume() { return this._volume; }

  toggleMute() {
    this._muted = !this._muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this._muted ? 0 : this._volume;
    }
    return this._muted;
  }

  isMuted() { return this._muted; }
}

export default AudioManager;
