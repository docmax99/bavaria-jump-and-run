// Web Audio API — procedural Oompah music + SFX
const Audio = (() => {
  let ctx = null;
  let muted = false;
  let musicNodes = [];
  let musicTimeout = null;
  let musicPlaying = false;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function masterGain() {
    const g = getCtx().createGain();
    g.gain.value = muted ? 0 : 0.4;
    g.connect(getCtx().destination);
    return g;
  }

  // ── Utility ──────────────────────────────────────────────────────────────
  function playTone(freq, type, duration, vol = 0.3, delay = 0) {
    if (muted) return;
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ac.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol, ac.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime + delay);
    osc.stop(ac.currentTime + delay + duration + 0.05);
  }

  // ── Sound Effects ─────────────────────────────────────────────────────────
  function sfxJump() {
    playTone(300, 'sine', 0.12, 0.25);
    playTone(500, 'sine', 0.08, 0.15, 0.05);
  }

  function sfxCoin() {
    playTone(880, 'sine', 0.08, 0.3);
    playTone(1320, 'sine', 0.12, 0.3, 0.08);
    playTone(1760, 'sine', 0.1, 0.2, 0.16);
  }

  function sfxHit() {
    const ac = getCtx();
    const buf = ac.createBuffer(1, ac.sampleRate * 0.15, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ac.createBufferSource();
    const gain = ac.createGain();
    gain.gain.value = muted ? 0 : 0.4;
    src.buffer = buf;
    src.connect(gain);
    gain.connect(ac.destination);
    src.start();
  }

  function sfxEnemyDie() {
    playTone(400, 'sawtooth', 0.05, 0.2);
    playTone(200, 'sawtooth', 0.08, 0.2, 0.05);
    playTone(100, 'sawtooth', 0.10, 0.15, 0.10);
  }

  function sfxLevelComplete() {
    const notes = [523, 659, 784, 1047]; // C E G C
    notes.forEach((f, i) => playTone(f, 'sine', 0.25, 0.35, i * 0.15));
  }

  function sfxGameOver() {
    const notes = [440, 370, 311, 220];
    notes.forEach((f, i) => playTone(f, 'sawtooth', 0.3, 0.3, i * 0.2));
  }

  // ── Oompah Music ──────────────────────────────────────────────────────────
  // C major Oompah: bass on beat 1, chord on beats 2-3
  const OOMPAH_PATTERNS = [
    // [freq, type, duration, vol, delay]
    // Bar 1 – C chord
    [130.8, 'sawtooth', 0.35, 0.3, 0.0],   // C2 bass
    [261.6, 'square',   0.25, 0.15, 0.5],   // C3 chord
    [329.6, 'square',   0.25, 0.15, 0.5],
    [392.0, 'square',   0.25, 0.15, 0.5],
    [261.6, 'square',   0.25, 0.15, 1.0],
    [329.6, 'square',   0.25, 0.15, 1.0],
    [392.0, 'square',   0.25, 0.15, 1.0],
    // Bar 2 – G chord
    [98.0,  'sawtooth', 0.35, 0.3, 1.5],    // G1 bass
    [196.0, 'square',   0.25, 0.15, 2.0],
    [246.9, 'square',   0.25, 0.15, 2.0],
    [293.7, 'square',   0.25, 0.15, 2.0],
    [196.0, 'square',   0.25, 0.15, 2.5],
    [246.9, 'square',   0.25, 0.15, 2.5],
    [293.7, 'square',   0.25, 0.15, 2.5],
    // Bar 3 – F chord
    [174.6, 'sawtooth', 0.35, 0.3, 3.0],
    [261.6, 'square',   0.25, 0.15, 3.5],
    [349.2, 'square',   0.25, 0.15, 3.5],
    [392.0, 'square',   0.25, 0.15, 3.5],
    [261.6, 'square',   0.25, 0.15, 4.0],
    [349.2, 'square',   0.25, 0.15, 4.0],
    [392.0, 'square',   0.25, 0.15, 4.0],
    // Bar 4 – G → C resolve
    [98.0,  'sawtooth', 0.35, 0.3, 4.5],
    [196.0, 'square',   0.25, 0.15, 5.0],
    [246.9, 'square',   0.25, 0.15, 5.0],
    [293.7, 'square',   0.25, 0.15, 5.0],
    [130.8, 'sawtooth', 0.35, 0.3, 5.5],
    [261.6, 'square',   0.25, 0.15, 6.0],
    [329.6, 'square',   0.25, 0.15, 6.0],
    [392.0, 'square',   0.25, 0.15, 6.0],
  ];
  const BAR_DURATION = 6.5; // seconds per full pattern loop

  // Melody notes (clarinet-ish via triangle)
  const MELODY = [
    [523.3, 0.0],  // C5
    [587.3, 0.5],  // D5
    [659.3, 1.0],  // E5
    [698.5, 1.5],  // F5
    [784.0, 2.0],  // G5
    [698.5, 2.5],  // F5
    [659.3, 3.0],  // E5
    [587.3, 3.5],  // D5
    [523.3, 4.0],  // C5
    [523.3, 4.5],
    [659.3, 5.0],
    [784.0, 5.5],
    [1046.5,6.0],  // C6 finish
  ];

  function scheduleLoop() {
    if (!musicPlaying || muted) return;
    const ac = getCtx();
    const now = ac.currentTime;

    OOMPAH_PATTERNS.forEach(([f, type, dur, vol, delay]) => {
      playTone(f, type, dur, vol, delay);
    });
    MELODY.forEach(([f, delay]) => {
      playTone(f, 'triangle', 0.35, 0.18, delay);
    });

    musicTimeout = setTimeout(scheduleLoop, BAR_DURATION * 1000 - 100);
  }

  function startMusic() {
    if (musicPlaying) return;
    musicPlaying = true;
    scheduleLoop();
  }

  function stopMusic() {
    musicPlaying = false;
    clearTimeout(musicTimeout);
  }

  function toggleMute() {
    muted = !muted;
    document.getElementById('mute-btn').textContent = muted ? '🔇' : '🔊';
    if (muted) stopMusic();
    else if (musicPlaying === false) { musicPlaying = true; scheduleLoop(); }
  }

  // Mute button
  document.getElementById('mute-btn').addEventListener('click', toggleMute);

  return {
    startMusic,
    stopMusic,
    sfxJump,
    sfxCoin,
    sfxHit,
    sfxEnemyDie,
    sfxLevelComplete,
    sfxGameOver,
    isMuted() { return muted; },
    resume() { if (ctx) ctx.resume(); },
  };
})();
