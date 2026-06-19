// lib/audio.ts
// Procedural sound effects using Web Audio API — no external files needed.

type SoundType = "causal_ripple" | "discovery" | "secret" | "breakthrough" | "loop_reset" | "loop_break" | "npc_awakening";

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.15, rampDown = true) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  if (rampDown) {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  }
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration: number, volume = 0.05) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export function playEventSound(type: SoundType) {
  try {
    switch (type) {
      case "causal_ripple":
        playTone(80, 1.5, "sine", 0.12);
        setTimeout(() => playTone(120, 0.8, "sine", 0.08), 300);
        break;
      case "discovery":
        playTone(880, 0.15, "sine", 0.1);
        setTimeout(() => playTone(1320, 0.1, "sine", 0.06), 100);
        break;
      case "secret":
        playTone(55, 0.4, "triangle", 0.08);
        setTimeout(() => playTone(55, 0.4, "triangle", 0.08), 600);
        break;
      case "breakthrough":
        playTone(523, 0.1, "sine", 0.1);
        playTone(659, 0.1, "sine", 0.08);
        playTone(784, 0.15, "sine", 0.08);
        setTimeout(() => {
          playTone(1047, 0.2, "sine", 0.12);
        }, 200);
        break;
      case "loop_reset":
        playNoise(1.5, 0.06);
        playTone(200, 1.5, "sawtooth", 0.04, true);
        break;
      case "loop_break":
        playTone(523, 0.1, "sine", 0.1);
        playTone(659, 0.1, "sine", 0.08);
        playTone(784, 0.1, "sine", 0.08);
        setTimeout(() => {
          playTone(1047, 0.4, "sine", 0.15);
          playTone(1319, 0.4, "sine", 0.1);
        }, 300);
        break;
      case "npc_awakening":
        playNoise(0.3, 0.03);
        playTone(440, 0.2, "square", 0.04);
        setTimeout(() => playTone(660, 0.3, "sine", 0.06), 200);
        break;
    }
  } catch {
    // Audio not available — silently ignore
  }
}
