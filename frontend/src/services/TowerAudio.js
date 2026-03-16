class TowerAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.gain = 0.06;
  }

  _init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  _tone(freq, duration, type='sine', fadeOut=true) {
    if (!this.enabled) return;
    try {
      this._init();
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gainNode.gain.setValueAtTime(this.gain, this.ctx.currentTime);
      if (fadeOut) {
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      }
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + duration);
    } catch(e) { /* audio blocked — silent fail */ }
  }

  /* JARVIS execute — two quick ascending beeps */
  onExecute() {
    this._tone(440, 0.08, 'square');
    setTimeout(() => this._tone(660, 0.1, 'square'), 100);
  }

  /* Answer arrived — three ascending chime tones */
  onAnswer() {
    this._tone(523, 0.15, 'sine');
    setTimeout(() => this._tone(659, 0.15, 'sine'), 150);
    setTimeout(() => this._tone(784, 0.25, 'sine'), 300);
  }

  /* Error — low descending */
  onError() {
    this._tone(220, 0.2, 'sawtooth');
    setTimeout(() => this._tone(165, 0.3, 'sawtooth'), 180);
  }

  /* Upload complete — single soft chime */
  onUpload() {
    this._tone(880, 0.12, 'sine');
    setTimeout(() => this._tone(1047, 0.18, 'sine'), 120);
  }

  toggle() { this.enabled = !this.enabled; return this.enabled; }
}

export const towerAudio = new TowerAudio();
