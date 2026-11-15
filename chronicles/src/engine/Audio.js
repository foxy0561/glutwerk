// Klangerzeugung komplett per Web Audio API (keine Audiodateien nötig):
// UI-Sounds, Effekte, Umgebungsgeräusche und eine generative Musik.
export class AudioSys {
  constructor() {
    this.ctx = null; this.vol = { master: 0.8, music: 0.5, sfx: 0.8 };
    this.musicOn = false; this.ambient = { fire: 0, water: 0, night: 0, day: 1, magic: 0 };
    this._noiseBuf = null; this._nextNote = 0; this._chord = 0; this.mood = 'forest';
  }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain(); this.musicBus.connect(this.master);
      this.ambBus = this.ctx.createGain(); this.ambBus.connect(this.master);
      // Hall für Musik
      this.reverb = this.ctx.createConvolver(); this.reverb.buffer = this.impulse(2.4); this.reverb.connect(this.musicBus);
      this.applyVolume();
      const len = this.ctx.sampleRate * 2; this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this._noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.startAmbient();
    } catch (e) { this.ctx = null; }
  }
  impulse(sec) {
    const r = this.ctx.sampleRate, len = r * sec, b = this.ctx.createBuffer(2, len, r);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    return b;
  }
  setVolume(v) { Object.assign(this.vol, v); this.applyVolume(); }
  applyVolume() {
    if (!this.ctx) return;
    this.master.gain.value = this.vol.master;
    this.sfxBus.gain.value = this.vol.sfx;
    this.musicBus.gain.value = this.vol.music * 0.5;
    this.ambBus.gain.value = this.vol.sfx * 0.6;
  }
  tone(freq, dur, { type = 'sine', vol = 0.2, attack = 0.005, bus = null, slide = 0, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, { vol = 0.2, freq = 1200, q = 1, type = 'bandpass', bus = null, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this._noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || this.sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  sfx(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'click': this.tone(880, 0.06, { type: 'triangle', vol: 0.08 }); break;
      case 'hover': this.tone(1320, 0.03, { type: 'sine', vol: 0.025 }); break;
      case 'open': this.tone(440, 0.09, { type: 'triangle', vol: 0.08 }); this.tone(660, 0.12, { type: 'triangle', vol: 0.06, delay: 0.05 }); break;
      case 'close': this.tone(660, 0.07, { type: 'triangle', vol: 0.06 }); this.tone(440, 0.1, { type: 'triangle', vol: 0.05, delay: 0.04 }); break;
      case 'pickup': [784, 988, 1318].forEach((f, i) => this.tone(f, 0.14, { type: 'triangle', vol: 0.07, delay: i * 0.05 })); break;
      case 'coin': this.tone(1568, 0.08, { type: 'square', vol: 0.03 }); this.tone(2093, 0.15, { type: 'square', vol: 0.03, delay: 0.06 }); break;
      case 'step': this.noise(0.05, { vol: 0.05, freq: 500 + Math.random() * 300, q: 0.8 }); break;
      case 'swing': this.noise(0.16, { vol: 0.12, freq: 2200, q: 0.6, type: 'highpass' }); this.tone(300, 0.12, { type: 'sine', vol: 0.04, slide: 0.5 }); break;
      case 'cut': this.noise(0.18, { vol: 0.16, freq: 1500, q: 0.7 }); break;
      case 'dodge': this.noise(0.22, { vol: 0.1, freq: 900, q: 0.5, type: 'lowpass' }); break;
      case 'quest': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.5, { type: 'triangle', vol: 0.07, delay: i * 0.11 })); break;
      case 'questDone': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.7, { type: 'triangle', vol: 0.08, delay: i * 0.1 })); this.tone(1568, 1.2, { type: 'sine', vol: 0.04, delay: 0.5 }); break;
      case 'magic': [659, 830, 987, 1318, 1661].forEach((f, i) => this.tone(f, 0.9, { type: 'sine', vol: 0.05, delay: i * 0.07, bus: this.reverb })); break;
      case 'chest': this.tone(196, 0.2, { type: 'square', vol: 0.04 }); this.noise(0.3, { vol: 0.08, freq: 400 }); [784, 1046, 1318].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.06, delay: 0.2 + i * 0.07 })); break;
      case 'talk': this.tone(520 + Math.random() * 120, 0.04, { type: 'square', vol: 0.02 }); break;
      case 'error': this.tone(180, 0.18, { type: 'square', vol: 0.05 }); break;
      case 'save': [659, 880].forEach((f, i) => this.tone(f, 0.25, { type: 'sine', vol: 0.06, delay: i * 0.08 })); break;
      case 'level': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.5, { type: 'square', vol: 0.03, delay: i * 0.08 })); break;
      case 'memory': this.tone(220, 3, { type: 'sine', vol: 0.12, attack: 0.8, bus: this.reverb }); [440, 554, 659, 880].forEach((f, i) => this.tone(f, 2.5, { type: 'sine', vol: 0.04, delay: 0.3 + i * 0.25, attack: 0.3, bus: this.reverb })); break;
    }
  }
  startAmbient() {
    // Ambient-Ticker: Vögel tagsüber, Grillen nachts, Feuerknistern, Wasser
    const tick = () => {
      if (!this.ctx) return;
      const a = this.ambient;
      if (a.day > 0.3 && Math.random() < 0.12 * a.day) {
        const f = 2200 + Math.random() * 1600, n = 2 + (Math.random() * 3 | 0);
        for (let i = 0; i < n; i++) this.tone(f * (1 + (Math.random() - 0.5) * 0.15), 0.07, { type: 'sine', vol: 0.025 * a.day, delay: i * 0.09, slide: 1.25, bus: this.ambBus });
      }
      if (a.night > 0.3 && Math.random() < 0.5) for (let i = 0; i < 3; i++) this.tone(4200, 0.03, { type: 'square', vol: 0.006 * a.night, delay: i * 0.05, bus: this.ambBus });
      if (a.fire > 0.05 && Math.random() < 0.6) this.noise(0.04 + Math.random() * 0.05, { vol: 0.12 * a.fire, freq: 1800 + Math.random() * 2500, q: 2, bus: this.ambBus });
      if (a.water > 0.05) this.noise(0.5, { vol: 0.05 * a.water, freq: 700 + Math.random() * 400, q: 0.4, type: 'lowpass', bus: this.ambBus });
      if (a.magic > 0.05 && Math.random() < 0.15) this.tone(880 * (Math.random() < 0.5 ? 1 : 1.5), 1.2, { type: 'sine', vol: 0.015 * a.magic, attack: 0.4, bus: this.reverb });
      this.musicTick();
    };
    this._amb = setInterval(tick, 220);
  }
  // Generative Musik: ruhige Laute-Arpeggien in a-Moll/dorisch
  musicTick() {
    if (!this.musicOn || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (now < this._nextNote) return;
    const prog = this.mood === 'menu'
      ? [[57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67], [52, 55, 59, 64]]
      : this.mood === 'memory' ? [[62, 66, 69, 74], [59, 62, 66, 71], [55, 59, 62, 67], [57, 61, 64, 69]]
      : [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 60], [55, 59, 62, 66]];
    const chord = prog[this._chord % prog.length];
    const step = (this._step || 0);
    const beat = this.mood === 'menu' ? 0.42 : 0.5;
    const pattern = [0, 2, 1, 3, 2, 1, 3, 2];
    const note = chord[pattern[step % 8]] + (step % 8 === 3 ? 12 : 0);
    const f = 440 * Math.pow(2, (note - 69) / 12);
    this.tone(f, 1.6, { type: 'triangle', vol: 0.05, attack: 0.01, bus: this.reverb });
    if (step % 8 === 0) { this.tone(f / 2, 3.5, { type: 'sine', vol: 0.07, attack: 0.3, bus: this.reverb }); }
    if (step % 16 === 6 && Math.random() < 0.6) this.tone(f * 2, 0.9, { type: 'sine', vol: 0.03, attack: 0.05, bus: this.reverb });
    this._step = step + 1;
    if (this._step % 8 === 0) this._chord++;
    this._nextNote = now + beat;
  }
  setMusic(on, mood) { this.musicOn = on; if (mood && mood !== this.mood) { this.mood = mood; this._chord = 0; this._step = 0; } }
}

export const audio = new AudioSys();
