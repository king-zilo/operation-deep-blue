// Tiny synthesized sound effects (Web Audio API) — no audio files, and nothing plays until the
// player explicitly unmutes. Volume is deliberately low.
let ctx = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(ac, { type = 'sine', from, to, start = 0, duration, gain = 0.12 }) {
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + duration);
  amp.gain.setValueAtTime(gain, t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noise(ac, { start = 0, duration, gain = 0.15, filter = 'lowpass', frequency = 800 }) {
  const t0 = ac.currentTime + start;
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * duration), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const biquad = ac.createBiquadFilter();
  biquad.type = filter;
  biquad.frequency.value = frequency;
  const amp = ac.createGain();
  amp.gain.setValueAtTime(gain, t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(biquad).connect(amp).connect(ac.destination);
  src.start(t0);
}

const SOUNDS = {
  miss: (ac) => {
    noise(ac, { duration: 0.35, gain: 0.08, filter: 'bandpass', frequency: 1400 });
    tone(ac, { from: 900, to: 300, duration: 0.25, gain: 0.04 });
  },
  hit: (ac) => {
    noise(ac, { duration: 0.45, gain: 0.18, frequency: 600 });
    tone(ac, { from: 140, to: 50, duration: 0.4, gain: 0.15 });
  },
  sunk: (ac) => {
    noise(ac, { duration: 0.9, gain: 0.2, frequency: 400 });
    tone(ac, { from: 110, to: 35, duration: 0.9, gain: 0.18 });
    tone(ac, { type: 'square', from: 440, to: 220, start: 0.15, duration: 0.3, gain: 0.03 });
  },
  victory: (ac) => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(ac, { type: 'triangle', from: f, start: i * 0.14, duration: 0.3, gain: 0.07 }),
    );
  },
  defeat: (ac) => {
    [392, 330, 262, 196].forEach((f, i) =>
      tone(ac, { type: 'sawtooth', from: f, start: i * 0.2, duration: 0.35, gain: 0.04 }),
    );
  },
  click: (ac) => tone(ac, { type: 'square', from: 1200, to: 800, duration: 0.05, gain: 0.025 }),
};

export function playSound(name) {
  const ac = getContext();
  if (!ac || !SOUNDS[name]) return;
  try {
    SOUNDS[name](ac);
  } catch {
    // Audio is decorative; never let it break the game.
  }
}
