/* Shardfall – synthetische Soundeffekte (WebAudio, keine Dateien nötig) */
(function () {
  "use strict";
  let ctx = null;
  let master = null;
  const lastPlayed = {};

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    SF.audio.setVolume(SF.save.settings.volume);
    return ctx;
  }

  function tone({ freq = 440, to = null, type = "sine", dur = 0.1, vol = 0.2, delay = 0 }) {
    const c = ensure();
    if (!c || !master) return;
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  function noise({ dur = 0.2, vol = 0.25, filter = 800 }) {
    const c = ensure();
    if (!c || !master) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = filter;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
  }

  const sounds = {
    click:   () => tone({ freq: 660, to: 880, type: "triangle", dur: 0.06, vol: 0.12 }),
    build:   () => { tone({ freq: 220, to: 440, type: "square", dur: 0.12, vol: 0.08 }); tone({ freq: 440, to: 660, type: "triangle", dur: 0.12, vol: 0.1, delay: 0.08 }); },
    upgrade: () => { [523, 659, 784].forEach((f, i) => tone({ freq: f, type: "triangle", dur: 0.12, vol: 0.1, delay: i * 0.07 })); },
    sell:    () => tone({ freq: 880, to: 330, type: "triangle", dur: 0.18, vol: 0.1 }),
    error:   () => tone({ freq: 160, to: 110, type: "square", dur: 0.15, vol: 0.07 }),
    bolt:    () => tone({ freq: 1200, to: 500, type: "triangle", dur: 0.05, vol: 0.04 }),
    cannon:  () => noise({ dur: 0.18, vol: 0.18, filter: 500 }),
    frost:   () => tone({ freq: 1800, to: 1200, type: "sine", dur: 0.08, vol: 0.04 }),
    tesla:   () => noise({ dur: 0.09, vol: 0.1, filter: 4000 }),
    mortar:  () => tone({ freq: 140, to: 60, type: "sine", dur: 0.2, vol: 0.18 }),
    boom:    () => noise({ dur: 0.35, vol: 0.22, filter: 350 }),
    leak:    () => tone({ freq: 300, to: 120, type: "sawtooth", dur: 0.25, vol: 0.09 }),
    wave:    () => { tone({ freq: 196, type: "sawtooth", dur: 0.35, vol: 0.06 }); tone({ freq: 294, type: "sawtooth", dur: 0.35, vol: 0.05, delay: 0.12 }); },
    boss:    () => { tone({ freq: 90, to: 60, type: "sawtooth", dur: 0.9, vol: 0.12 }); noise({ dur: 0.8, vol: 0.12, filter: 200 }); },
    win:     () => { [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, type: "triangle", dur: 0.25, vol: 0.12, delay: i * 0.12 })); },
    lose:    () => { [392, 330, 262, 196].forEach((f, i) => tone({ freq: f, type: "sawtooth", dur: 0.3, vol: 0.08, delay: i * 0.15 })); }
  };

  SF.audio = {
    unlock() { const c = ensure(); if (c && c.state === "suspended") c.resume(); },
    setVolume(v) { if (master) master.gain.value = Math.max(0, Math.min(1, v)) * 0.8; },
    play(name, minGap = 0.04) {
      if (!ctx || SF.save.settings.volume <= 0) return;
      const now = performance.now() / 1000;
      if (lastPlayed[name] && now - lastPlayed[name] < minGap) return; // nicht 50x gleichzeitig
      lastPlayed[name] = now;
      try { sounds[name] && sounds[name](); } catch (e) { /* ignorieren */ }
    }
  };
})();
