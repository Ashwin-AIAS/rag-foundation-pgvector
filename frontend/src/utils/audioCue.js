let audioCtx = null;
let loopInterval = null;

function getContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function stopProcessingSound() {
  if (loopInterval) {
    clearInterval(loopInterval);
    loopInterval = null;
  }
}

function playTone(type, freq, durationMs) {
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs/1000);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + durationMs/1000);
}

export function triggerAudioCue(soundName) {
  stopProcessingSound(); // Stop any existing loop before starting a new sound
  
  const ctx = getContext();
  let now = ctx.currentTime;
  
  switch(soundName) {
    // ---------------------------------------------------------
    // PROCESSING SOUNDS (Looping)
    // ---------------------------------------------------------
    case 'arc_reactor_hum':
      // looping square wave, 60Hz, every 120ms
      loopInterval = setInterval(() => {
         playTone('square', 60, 50);
      }, 120);
      break;
      
    case 'tactical_ping':
      // looping triangle wave, 440Hz, every 80ms
      loopInterval = setInterval(() => {
         playTone('triangle', 440, 40);
      }, 80);
      break;
      
    case 'dimensional_hum':
      // looping sine wave, 528Hz, every 200ms
      loopInterval = setInterval(() => {
         playTone('sine', 528, 100);
      }, 200);
      break;
      
    case 'kimoyo_bead_sync':
      // looping sine wave, 200Hz, every 100ms
      loopInterval = setInterval(() => {
         playTone('sine', 200, 30);
      }, 100);
      break;
      
    case 'heartbeat_monitor':
      // looping sine wave, 80Hz, every 1000ms
      loopInterval = setInterval(() => {
         playTone('sine', 80, 200);
      }, 1000);
      break;
      
    // ---------------------------------------------------------
    // COMPLETION SOUNDS (One-shot)
    // ---------------------------------------------------------
    case 'repulsor_charge':
      // 5 square wave bursts at [800,1200,1600,1500,2500]Hz, 70ms apart
      [800, 1200, 1600, 1500, 2500].forEach((freq, i) => {
        setTimeout(() => playTone('square', freq, 50), i * 70);
      });
      break;
      
    case 'shield_ring':
      // 3 triangle wave tones at [523,659,784]Hz, 150ms apart
      [523, 659, 784].forEach((freq, i) => {
        setTimeout(() => playTone('triangle', freq, 100), i * 150);
      });
      break;
      
    case 'sling_ring_open':
      // 5 sine tones at [396,528,660,792,1056]Hz, 120ms apart
      [396, 528, 660, 792, 1056].forEach((freq, i) => {
        setTimeout(() => playTone('sine', freq, 100), i * 120);
      });
      break;
      
    case 'vibranium_pulse':
      // sawtooth 40→200Hz sweep through bandpass filter + bass snap
      {
         const osc = ctx.createOscillator();
         const gain = ctx.createGain();
         const filter = ctx.createBiquadFilter();
         
         osc.type = 'sawtooth';
         osc.frequency.setValueAtTime(40, now);
         osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
         
         filter.type = 'bandpass';
         filter.frequency.setValueAtTime(100, now);
         
         gain.gain.setValueAtTime(0, now);
         gain.gain.linearRampToValueAtTime(0.3, now + 0.1);
         gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
         
         osc.connect(filter).connect(gain).connect(ctx.destination);
         osc.start(now);
         osc.stop(now + 0.4);
      }
      break;
      
    case 'gamma_pulse':
      // 3 sawtooth thuds at 60→40Hz each, 300ms apart
      [0, 1, 2].forEach(i => {
         setTimeout(() => {
           const n = getContext().currentTime;
           const osc = ctx.createOscillator();
           const gain = ctx.createGain();
           osc.type = 'sawtooth';
           osc.frequency.setValueAtTime(60, n);
           osc.frequency.exponentialRampToValueAtTime(40, n + 0.15);
           
           gain.gain.setValueAtTime(0, n);
           gain.gain.linearRampToValueAtTime(0.2, n + 0.02);
           gain.gain.exponentialRampToValueAtTime(0.001, n + 0.15);
           
           osc.connect(gain).connect(ctx.destination);
           osc.start(n);
           osc.stop(n + 0.15);
         }, i * 300);
      });
      break;
  }
}
