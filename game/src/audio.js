// Solara Bay — audio. One job: every sound is synthesized with the Web Audio
// API: engine hum, sirens, gunshots, pickups, stingers, and a bass-and-hats
// music loop that quickens with the wanted level.
export function createAudio() {
  const audio = {
    ctx: null, muted: false, musicTimer: 0, beat: 0,
    ensure() {
      if (!audio.ctx) {
        try { audio.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { audio.ctx = null; }
      }
      if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
      return audio.ctx;
    },
    tone(freq, dur, type, vol, slideTo) {
      if (audio.muted) return;
      const ctx = audio.ensure(); if (!ctx) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + dur);
    },
    noise(dur, vol, lowpass) {
      if (audio.muted) return;
      const ctx = audio.ensure(); if (!ctx) return;
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g = ctx.createGain(); g.gain.value = vol || 0.2;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass || 1200;
      src.connect(f); f.connect(g); g.connect(ctx.destination);
      src.start();
    },
    coin() { audio.tone(880, 0.09, 'square', 0.08); setTimeout(() => audio.tone(1320, 0.12, 'square', 0.08), 70); },
    gunshot() { audio.noise(0.14, 0.3, 900); },
    punch() { audio.noise(0.08, 0.2, 500); },
    carDoor() { audio.noise(0.08, 0.12, 700); audio.tone(180, 0.08, 'triangle', 0.1); },
    engine(level) { if (!audio.muted) audio.tone(60 + level * 90, 0.12, 'sawtooth', 0.03); },
    explosion() { audio.noise(0.7, 0.4, 400); audio.tone(70, 0.6, 'sine', 0.25, 30); },
    stinger() { audio.tone(523, 0.14, 'triangle', 0.12); setTimeout(() => audio.tone(659, 0.14, 'triangle', 0.12), 120); setTimeout(() => audio.tone(784, 0.3, 'triangle', 0.12), 240); },
    missionComplete() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => audio.tone(f, 0.22, 'triangle', 0.12), i * 130)); },
    busted() { audio.tone(330, 0.4, 'sawtooth', 0.12, 220); },
    wasted() { audio.tone(220, 0.8, 'sawtooth', 0.14, 55); },
    ending() { [392, 523, 659, 784, 1047].forEach((f, i) => setTimeout(() => audio.tone(f, 0.4, 'triangle', 0.12), i * 180)); },
    siren(wanted) {
      if (audio.muted || wanted === 0) return;
      const ctx = audio.ensure(); if (!ctx) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(700, ctx.currentTime);
      o.frequency.linearRampToValueAtTime(1100, ctx.currentTime + 0.4);
      o.frequency.linearRampToValueAtTime(700, ctx.currentTime + 0.8);
      g.gain.setValueAtTime(0.035, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.8);
    },
    updateMusic(dt, wanted) {
      // Simple bass-and-hats loop; the tempo rises with the wanted level.
      audio.musicTimer -= dt;
      if (audio.musicTimer > 0) return;
      const bpm = wanted > 0 ? 132 + wanted * 8 : 96;
      audio.musicTimer = 60 / bpm / 2;
      audio.beat += 1;
      if (audio.muted) return;
      const bassNotes = [55, 55, 65.4, 49];
      const note = bassNotes[Math.floor(audio.beat / 2) % bassNotes.length];
      if (audio.beat % 2 === 0) audio.tone(note, 0.22, 'triangle', 0.07);
      if (audio.beat % 2 === 1) audio.noise(0.03, 0.03, 6000);
    },
  };
  return audio;
}
