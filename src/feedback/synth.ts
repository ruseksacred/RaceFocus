/**
 * Game sound effects, described as short note lists and rendered to samples.
 * The web plays the rendered samples through Web Audio; the phone app plays WAV files
 * made from the same descriptions (`npm run sounds`).
 */

export type SoundId = 'light' | 'go' | 'tap' | 'wrong' | 'lap' | 'best' | 'finish';
export const SOUND_IDS: readonly SoundId[] = ['light', 'go', 'tap', 'wrong', 'lap', 'best', 'finish'];

type Wave = 'sine' | 'triangle' | 'square';

interface Note {
  /** Start, seconds from the beginning of the sound. */
  at: number;
  /** Length in seconds. */
  length: number;
  freq: number;
  /** Frequency at the end of the note, for a slide. */
  toFreq?: number;
  wave: Wave;
  /** 0–1. */
  gain: number;
}

const ATTACK_S = 0.004;
const RELEASE_S = 0.03;

export const SOUNDS: Record<SoundId, readonly Note[]> = {
  // Start lights: a beep for each red light, a higher, longer one for lights out.
  light: [{ at: 0, length: 0.13, freq: 660, wave: 'sine', gain: 0.5 }],
  go: [{ at: 0, length: 0.38, freq: 1320, wave: 'sine', gain: 0.55 }],
  // Correct tap: a very short, quiet click.
  tap: [{ at: 0, length: 0.028, freq: 1800, toFreq: 1400, wave: 'triangle', gain: 0.22 }],
  // Wrong tap (yellow flag): a low buzz.
  wrong: [{ at: 0, length: 0.2, freq: 150, toFreq: 105, wave: 'square', gain: 0.22 }],
  // Lap done: two rising notes.
  lap: [
    { at: 0, length: 0.08, freq: 880, wave: 'sine', gain: 0.4 },
    { at: 0.085, length: 0.12, freq: 1320, wave: 'sine', gain: 0.4 },
  ],
  // Session or personal best: a quick arpeggio.
  best: [
    { at: 0, length: 0.08, freq: 784, wave: 'triangle', gain: 0.45 },
    { at: 0.08, length: 0.08, freq: 988, wave: 'triangle', gain: 0.45 },
    { at: 0.16, length: 0.22, freq: 1568, wave: 'triangle', gain: 0.45 },
  ],
  // Chequered flag.
  finish: [
    { at: 0, length: 0.12, freq: 523, wave: 'triangle', gain: 0.45 },
    { at: 0.12, length: 0.12, freq: 659, wave: 'triangle', gain: 0.45 },
    { at: 0.24, length: 0.12, freq: 784, wave: 'triangle', gain: 0.45 },
    { at: 0.36, length: 0.45, freq: 1047, wave: 'triangle', gain: 0.5 },
  ],
};

function oscillator(wave: Wave, phase: number): number {
  const p = phase - Math.floor(phase);
  switch (wave) {
    case 'sine':
      return Math.sin(2 * Math.PI * p);
    case 'triangle':
      return 1 - 4 * Math.abs(p - 0.5);
    case 'square':
      return p < 0.5 ? 1 : -1;
  }
}

/** Length of a sound in seconds, including the release of its last note. */
export function soundLength(id: SoundId): number {
  return Math.max(...SOUNDS[id].map((n) => n.at + n.length)) + RELEASE_S;
}

/** Renders a sound to mono samples in -1..1. */
export function renderSound(id: SoundId, sampleRate: number): Float32Array {
  const samples = new Float32Array(Math.ceil(soundLength(id) * sampleRate));
  for (const note of SOUNDS[id]) {
    const start = Math.round(note.at * sampleRate);
    const count = Math.round((note.length + RELEASE_S) * sampleRate);
    let phase = 0;
    for (let i = 0; i < count && start + i < samples.length; i++) {
      const t = i / sampleRate;
      const progress = Math.min(1, t / note.length);
      const freq = note.freq + ((note.toFreq ?? note.freq) - note.freq) * progress;
      phase += freq / sampleRate;
      // Short fade in and out so notes do not click.
      const envelope =
        t < ATTACK_S ? t / ATTACK_S : t > note.length ? Math.max(0, 1 - (t - note.length) / RELEASE_S) : 1;
      samples[start + i] += oscillator(note.wave, phase) * note.gain * envelope;
    }
  }
  for (let i = 0; i < samples.length; i++) samples[i] = Math.max(-1, Math.min(1, samples[i]));
  return samples;
}

/** 16-bit mono PCM WAV file. */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => view.setInt16(44 + i * 2, Math.round(s * 32767), true));
  return bytes;
}
