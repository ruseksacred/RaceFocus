import { renderSound, SOUND_IDS, type SoundId } from './synth';

// Web: sounds are rendered once and played through Web Audio, which starts with almost no delay.

type AudioContextClass = typeof AudioContext;

let context: AudioContext | null = null;
const buffers = new Map<SoundId, AudioBuffer>();

function audioContext(): AudioContext | null {
  if (context) return context;
  if (typeof window === 'undefined') return null;
  const Ctor: AudioContextClass | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextClass }).webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  for (const id of SOUND_IDS) {
    const samples = renderSound(id, context.sampleRate);
    const buffer = context.createBuffer(1, samples.length, context.sampleRate);
    buffer.getChannelData(0).set(samples);
    buffers.set(id, buffer);
  }
  return context;
}

/**
 * Browsers only allow sound after the player has touched the page, so the audio is switched on
 * at the first touch or key press (for example on the START button).
 */
export function prepareSounds() {
  if (typeof document === 'undefined') return;
  const unlock = () => {
    const ctx = audioContext();
    if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  };
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('keydown', unlock, { capture: true });
}

export function playSound(id: SoundId) {
  const ctx = context;
  const buffer = buffers.get(id);
  if (!ctx || !buffer || ctx.state !== 'running') return;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
}
