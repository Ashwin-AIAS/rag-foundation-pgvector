let audioCtx = null;
let loopInterval = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

export function stopProcessingSound() {
  if (loopInterval) { clearInterval(loopInterval); loopInterval = null; }
}

// ── UTILITY BUILDERS ──────────────────────────────────────────

function masterGain(ctx, vol = 0.8) {
  const g = ctx.createGain();
  g.gain.value = vol;
  g.connect(ctx.destination);
  return g;
}

function osc(ctx, type, freq, start, stop, dest) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.connect(dest);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + stop);
  return o;
}

function envGain(ctx, dest, peak, atk, sus, rel, offset = 0) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, ctx.currentTime + offset);
  g.gain.linearRampToValueAtTime(peak, ctx.currentTime + offset + atk);
  g.gain.setValueAtTime(peak, ctx.currentTime + offset + atk + sus);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + atk + sus + rel);
  g.connect(dest);
  return g;
}

function noise(ctx, duration, dest) {
  const bufSize = ctx.sampleRate * duration;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(dest);
  src.start(ctx.currentTime);
  src.stop(ctx.currentTime + duration);
  return src;
}

function distort(ctx, amount = 200) {
  const ws = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i * 2) / 256 - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  ws.curve = curve;
  return ws;
}

function bpf(ctx, freq, q) {
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  return f;
}

function lpf(ctx, freq) {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = freq;
  return f;
}

function hpf(ctx, freq) {
  const f = ctx.createBiquadFilter();
  f.type = 'highpass'; f.frequency.value = freq;
  return f;
}

// simple delay-based reverb tail
function reverb(ctx, dest, delayTime = 0.06, feedback = 0.4, wet = 0.35) {
  const delay = ctx.createDelay(1);
  delay.delayTime.value = delayTime;
  const fbGain = ctx.createGain();
  fbGain.gain.value = feedback;
  const wetGain = ctx.createGain();
  wetGain.gain.value = wet;
  delay.connect(fbGain);
  fbGain.connect(delay);
  delay.connect(wetGain);
  wetGain.connect(dest);
  return delay; // connect source → delay to use
}

// ══════════════════════════════════════════════════════════════
// STARK — Arc Reactor hum (processing loop)
// Signature: electrical 60Hz hum with buzzing harmonics, slight
// crackle — the chest piece powering up
// ══════════════════════════════════════════════════════════════
function starkProcessing(ctx) {
  stopProcessingSound();
  const master = masterGain(ctx, 0.5);

  // Base reactor hum — continuous
  const baseOsc = ctx.createOscillator();
  baseOsc.type = 'sawtooth';
  baseOsc.frequency.value = 60;
  const baseFilter = lpf(ctx, 400);
  const baseGain = ctx.createGain();
  baseGain.gain.value = 0.3;
  baseOsc.connect(baseFilter);
  baseFilter.connect(baseGain);
  baseGain.connect(master);
  baseOsc.start();

  // Harmonic buzz at 180Hz
  const harmOsc = ctx.createOscillator();
  harmOsc.type = 'square';
  harmOsc.frequency.value = 180;
  const harmGain = ctx.createGain();
  harmGain.gain.value = 0.08;
  harmOsc.connect(harmGain);
  harmGain.connect(master);
  harmOsc.start();

  // Pulsing electrical crackle every 300ms
  loopInterval = setInterval(() => {
    if (!audioCtx) return;
    const crackleCtx = audioCtx;
    const cg = crackleCtx.createGain();
    cg.gain.setValueAtTime(0.15, crackleCtx.currentTime);
    cg.gain.exponentialRampToValueAtTime(0.001, crackleCtx.currentTime + 0.04);
    cg.connect(master);
    const n = noise(crackleCtx, 0.04, bpf(crackleCtx, 3000 + Math.random() * 2000, 8));
    const f = bpf(crackleCtx, 3000 + Math.random() * 2000, 8);
    f.connect(cg);
    noise(crackleCtx, 0.04, f);
  }, 300 + Math.random() * 100);

  // Store refs to stop
  audioCtx._starkOscs = [baseOsc, harmOsc];
}

// ══════════════════════════════════════════════════════════════
// STARK — Repulsor charge (completion)
// Signature: rising electronic whine → power charge peak → 
// blast discharge with metallic click
// ══════════════════════════════════════════════════════════════
function starkCompletion(ctx) {
  stopProcessingSound();
  if (audioCtx._starkOscs) {
    audioCtx._starkOscs.forEach(o => { try { o.stop(); } catch {} });
  }
  const master = masterGain(ctx, 0.9);
  const rev = reverb(ctx, master, 0.04, 0.3, 0.2);

  // Rising whine — 200Hz → 2800Hz over 0.6s (repulsor charging)
  const whine = ctx.createOscillator();
  whine.type = 'sawtooth';
  whine.frequency.setValueAtTime(200, ctx.currentTime);
  whine.frequency.exponentialRampToValueAtTime(2800, ctx.currentTime + 0.6);
  const whineGain = ctx.createGain();
  whineGain.gain.setValueAtTime(0, ctx.currentTime);
  whineGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
  whineGain.gain.setValueAtTime(0.5, ctx.currentTime + 0.55);
  whineGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
  whine.connect(whineGain); whineGain.connect(master);
  whine.start(); whine.stop(ctx.currentTime + 0.7);

  // Harmonic layer — adds the Iron Man electronic character
  const harm = ctx.createOscillator();
  harm.type = 'square';
  harm.frequency.setValueAtTime(400, ctx.currentTime);
  harm.frequency.exponentialRampToValueAtTime(5600, ctx.currentTime + 0.6);
  const harmGain = ctx.createGain();
  harmGain.gain.setValueAtTime(0.15, ctx.currentTime);
  harmGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.62);
  harm.connect(harmGain); harmGain.connect(master);
  harm.start(); harm.stop(ctx.currentTime + 0.65);

  // Blast discharge at t=0.65 — noise burst + metallic click
  setTimeout(() => {
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.8, ctx.currentTime);
    bg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    const nf = hpf(ctx, 1000);
    nf.connect(bg); bg.connect(rev); bg.connect(master);
    noise(ctx, 0.25, nf);

    // Metallic click
    const click = ctx.createOscillator();
    click.type = 'sine';
    click.frequency.setValueAtTime(3500, ctx.currentTime);
    click.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.6, ctx.currentTime);
    cg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    click.connect(cg); cg.connect(master);
    click.start(); click.stop(ctx.currentTime + 0.12);
  }, 640);
}

// ══════════════════════════════════════════════════════════════
// ROGERS — Tactical ping (processing loop)
// Signature: rhythmic sonar-style pulse with tail — SHIELD radar
// ══════════════════════════════════════════════════════════════
function rogersProcessing(ctx) {
  stopProcessingSound();
  const master = masterGain(ctx, 0.6);
  const rev = reverb(ctx, master, 0.08, 0.5, 0.4);

  loopInterval = setInterval(() => {
    const ping = audioCtx.createOscillator();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(880, audioCtx.currentTime);
    ping.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 0.4);
    const pg = envGain(audioCtx, rev, 0.5, 0.005, 0.01, 0.5);
    ping.connect(pg);
    ping.start(audioCtx.currentTime);
    ping.stop(audioCtx.currentTime + 0.55);
  }, 900);
}

// ══════════════════════════════════════════════════════════════
// ROGERS — Shield ring (completion)
// Signature: metallic bell strike — the vibranium shield impact
// rich harmonics, long resonant tail
// ══════════════════════════════════════════════════════════════
function rogersCompletion(ctx) {
  stopProcessingSound();
  const master = masterGain(ctx, 0.9);
  const rev = reverb(ctx, master, 0.12, 0.6, 0.5);

  // Bell partials — metallic shield character
  // Ratios based on a struck metal disc
  const partials = [
    { freq: 1020, vol: 0.7, decay: 2.5 },
    { freq: 2756, vol: 0.4, decay: 1.8 },
    { freq: 4200, vol: 0.25, decay: 1.2 },
    { freq: 5800, vol: 0.15, decay: 0.8 },
    { freq: 8100, vol: 0.08, decay: 0.5 },
  ];

  partials.forEach(({ freq, vol, decay }, i) => {
    const o = ctx.createOscillator();
    o.type = i === 0 ? 'sine' : 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + decay);
    o.connect(g);
    g.connect(master);
    g.connect(rev);
    o.start(); o.stop(ctx.currentTime + decay + 0.1);
  });

  // Initial metallic strike transient — noise click
  const nf = bpf(ctx, 8000, 2);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.9, ctx.currentTime);
  ng.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
  nf.connect(ng); ng.connect(master);
  noise(ctx, 0.03, nf);
}

// ══════════════════════════════════════════════════════════════
// GOINDOR — Dimensional hum (processing loop)
// Signature: detuned chorus of sine waves, slow LFO modulation —
// the Mirror Dimension spinning
// ══════════════════════════════════════════════════════════════
function goindorProcessing(ctx) {
  stopProcessingSound();
  const master = masterGain(ctx, 0.4);

  // Three detuned oscillators create the Doctor Strange chorus
  const freqs = [528, 531, 525];
  const oscs = freqs.map(f => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain(); g.gain.value = 0.25;
    o.connect(g); g.connect(master);
    o.start();
    return o;
  });

  // LFO for slow tremolo — dimensional instability
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.5;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.15;
  lfo.connect(lfoGain);
  oscs.forEach(o => lfoGain.connect(o.frequency));
  lfo.start();

  // Sparkle — random high freq pings
  loopInterval = setInterval(() => {
    const sp = audioCtx.createOscillator();
    sp.type = 'sine';
    sp.frequency.value = 2000 + Math.random() * 3000;
    const sg = audioCtx.createGain();
    sg.gain.setValueAtTime(0.12, audioCtx.currentTime);
    sg.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    sp.connect(sg); sg.connect(master);
    sp.start(audioCtx.currentTime); sp.stop(audioCtx.currentTime + 0.18);
  }, 200 + Math.random() * 300);

  audioCtx._goindorOscs = [...oscs, lfo];
}

// ══════════════════════════════════════════════════════════════
// GOINDOR — Sling Ring open (completion)
// Signature: crackling spark burst → orange portal whoosh →
// dimensional shimmer shimmer at the end
// ══════════════════════════════════════════════════════════════
function goindorCompletion(ctx) {
  stopProcessingSound();
  if (audioCtx._goindorOscs) {
    audioCtx._goindorOscs.forEach(o => { try { o.stop(); } catch {} });
  }
  const master = masterGain(ctx, 0.85);
  const rev = reverb(ctx, master, 0.1, 0.55, 0.45);

  // Crackling sparks — filtered noise bursts in rapid succession
  for (let i = 0; i < 18; i++) {
    setTimeout(() => {
      const f = bpf(ctx, 3000 + Math.random() * 5000, 4 + Math.random() * 6);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.4 + Math.random() * 0.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      f.connect(g); g.connect(master);
      noise(ctx, 0.05, f);
    }, i * 40 + Math.random() * 20);
  }

  // Whoosh — rising filtered noise (portal opening)
  setTimeout(() => {
    const wf = ctx.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.setValueAtTime(300, ctx.currentTime);
    wf.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + 0.5);
    wf.Q.value = 3;
    const wg = ctx.createGain();
    wg.gain.setValueAtTime(0, ctx.currentTime);
    wg.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.15);
    wg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    wf.connect(wg); wg.connect(rev); wg.connect(master);
    noise(ctx, 0.6, wf);
  }, 300);

  // Shimmer tail — high harmonic ring
  setTimeout(() => {
    [2093, 4186, 6279].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.6);
      o.connect(g); g.connect(rev);
      o.start(ctx.currentTime + i * 0.06); o.stop(ctx.currentTime + i * 0.06 + 0.7);
    });
  }, 700);
}

// ══════════════════════════════════════════════════════════════
// PANTHER — Kimoyo bead sync (processing loop)
// Signature: short crystalline high-freq ticks — Wakandan tech
// communicating, precise and rhythmic
// ══════════════════════════════════════════════════════════════
function pantherProcessing(ctx) {
  stopProcessingSound();
  const master = masterGain(ctx, 0.55);
  const rev = reverb(ctx, master, 0.05, 0.3, 0.25);

  loopInterval = setInterval(() => {
    const o = audioCtx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(3200, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1800, audioCtx.currentTime + 0.06);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.5, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    o.connect(g); g.connect(rev); g.connect(master);
    o.start(audioCtx.currentTime); o.stop(audioCtx.currentTime + 0.1);
  }, 110);
}

// ══════════════════════════════════════════════════════════════
// PANTHER — Vibranium pulse (completion)
// Signature: massive sub-bass thud (vibranium impact) + 
// crystalline ringing overtone floating above it
// ══════════════════════════════════════════════════════════════
function pantherCompletion(ctx) {
  stopProcessingSound();
  const master = masterGain(ctx, 1.0);
  const rev = reverb(ctx, master, 0.08, 0.5, 0.4);

  // Sub-bass vibranium thud
  const sub = ctx.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(80, ctx.currentTime);
  sub.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.4);
  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0, ctx.currentTime);
  subGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.01);
  subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  sub.connect(subGain); subGain.connect(master);
  sub.start(); sub.stop(ctx.currentTime + 0.55);

  // Vibranium body thump — distorted low mid
  const thump = ctx.createOscillator();
  thump.type = 'sawtooth';
  thump.frequency.setValueAtTime(120, ctx.currentTime);
  thump.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.3);
  const dist = distort(ctx, 80);
  const thumpFilter = lpf(ctx, 500);
  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(0.7, ctx.currentTime);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  thump.connect(dist); dist.connect(thumpFilter);
  thumpFilter.connect(thumpGain); thumpGain.connect(master);
  thump.start(); thump.stop(ctx.currentTime + 0.4);

  // Crystalline ring — floats above the thud
  setTimeout(() => {
    [3400, 5100, 6800].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.25 - i * 0.06, ctx.currentTime + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.04 + 1.2);
      o.connect(g); g.connect(rev);
      o.start(ctx.currentTime + i * 0.04); o.stop(ctx.currentTime + i * 0.04 + 1.3);
    });
  }, 50);
}

// ══════════════════════════════════════════════════════════════
// BANNER — Heartbeat (processing loop)
// Signature: lub-dub double thump, realistic cardiac rhythm,
// slightly elevated pace — Banner keeping it together
// ══════════════════════════════════════════════════════════════
function bannerProcessing(ctx) {
  stopProcessingSound();
  const master = masterGain(ctx, 0.6);

  function lubDub() {
    if (!loopInterval) return;

    // LUB — first thump (louder)
    const lub = audioCtx.createOscillator();
    lub.type = 'sine';
    lub.frequency.setValueAtTime(70, audioCtx.currentTime);
    lub.frequency.exponentialRampToValueAtTime(35, audioCtx.currentTime + 0.12);
    const lg = audioCtx.createGain();
    lg.gain.setValueAtTime(0.9, audioCtx.currentTime);
    lg.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    lub.connect(lg); lg.connect(master);
    lub.start(audioCtx.currentTime); lub.stop(audioCtx.currentTime + 0.18);

    // DUB — second thump (softer, 150ms later)
    setTimeout(() => {
      if (!audioCtx) return;
      const dub = audioCtx.createOscillator();
      dub.type = 'sine';
      dub.frequency.setValueAtTime(55, audioCtx.currentTime);
      dub.frequency.exponentialRampToValueAtTime(28, audioCtx.currentTime + 0.1);
      const dg = audioCtx.createGain();
      dg.gain.setValueAtTime(0.55, audioCtx.currentTime);
      dg.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      dub.connect(dg); dg.connect(master);
      dub.start(audioCtx.currentTime); dub.stop(audioCtx.currentTime + 0.15);
    }, 150);
  }

  lubDub();
  loopInterval = setInterval(lubDub, 750);
}

// ══════════════════════════════════════════════════════════════
// BANNER — Gamma pulse (completion)
// Signature: heartbeat suddenly deepens + gamma radiation rumble
// builds — the moment before transformation
// ══════════════════════════════════════════════════════════════
function bannerCompletion(ctx) {
  stopProcessingSound();
  const master = masterGain(ctx, 0.95);
  const dist = distort(ctx, 150);
  dist.connect(master);
  const rev = reverb(ctx, master, 0.15, 0.5, 0.4);

  // Final accelerating heartbeats (3 beats, getting faster)
  [0, 0.55, 0.95].forEach((t, i) => {
    setTimeout(() => {
      const o = audioCtx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(65 - i * 5, audioCtx.currentTime);
      o.frequency.exponentialRampToValueAtTime(28, audioCtx.currentTime + 0.18);
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.8 + i * 0.1, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
      o.connect(g); g.connect(dist);
      o.start(audioCtx.currentTime); o.stop(audioCtx.currentTime + 0.25);
    }, t * 1000);
  });

  // Gamma radiation build — rising distorted rumble after the beats
  setTimeout(() => {
    const gamma = ctx.createOscillator();
    gamma.type = 'sawtooth';
    gamma.frequency.setValueAtTime(40, ctx.currentTime);
    gamma.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.6);
    const gammaFilter = lpf(ctx, 300);
    const gammaGain = ctx.createGain();
    gammaGain.gain.setValueAtTime(0, ctx.currentTime);
    gammaGain.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 0.4);
    gammaGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    gamma.connect(gammaFilter); gammaFilter.connect(gammaGain);
    gammaGain.connect(dist); gammaGain.connect(rev);
    gamma.start(); gamma.stop(ctx.currentTime + 0.75);

    // Gamma crackle overlay
    const gcf = hpf(ctx, 800);
    const gcg = ctx.createGain();
    gcg.gain.setValueAtTime(0.5, ctx.currentTime);
    gcg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    gcf.connect(gcg); gcg.connect(master);
    noise(ctx, 0.6, gcf);
  }, 1100);
}

// ══════════════════════════════════════════════════════════════
// DISPATCHER
// ══════════════════════════════════════════════════════════════
const SOUND_MAP = {
  arc_reactor_hum:    (ctx) => starkProcessing(ctx),
  repulsor_charge:    (ctx) => starkCompletion(ctx),
  tactical_ping:      (ctx) => rogersProcessing(ctx),
  shield_ring:        (ctx) => rogersCompletion(ctx),
  dimensional_hum:    (ctx) => goindorProcessing(ctx),
  sling_ring_open:    (ctx) => goindorCompletion(ctx),
  kimoyo_bead_sync:   (ctx) => pantherProcessing(ctx),
  vibranium_pulse:    (ctx) => pantherCompletion(ctx),
  heartbeat_monitor:  (ctx) => bannerProcessing(ctx),
  gamma_pulse:        (ctx) => bannerCompletion(ctx),
};

export function triggerAudioCue(soundName) {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
  const fn = SOUND_MAP[soundName];
  if (fn) fn(ctx);
}
