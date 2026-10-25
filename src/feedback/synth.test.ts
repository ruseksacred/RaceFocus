import { describe, expect, it } from 'vitest';

import { encodeWav, renderSound, SOUND_IDS, soundLength } from './synth';

describe('sound synth', () => {
  it('renders every sound within -1..1 and starts and ends quietly', () => {
    for (const id of SOUND_IDS) {
      const samples = renderSound(id, 22050);
      expect(samples.length).toBe(Math.ceil(soundLength(id) * 22050));
      expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(1);
      expect(Math.max(...samples.map(Math.abs))).toBeGreaterThan(0.1);
      expect(Math.abs(samples[0])).toBeLessThan(0.01);
      expect(Math.abs(samples.at(-1)!)).toBeLessThan(0.01);
    }
  });

  it('keeps sounds short so they never get in the way', () => {
    expect(soundLength('tap')).toBeLessThan(0.1);
    for (const id of SOUND_IDS) expect(soundLength(id)).toBeLessThan(1);
  });

  it('writes a valid WAV header', () => {
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5, 1]), 22050);
    const view = new DataView(wav.buffer);
    const text = (offset: number) => String.fromCharCode(...wav.slice(offset, offset + 4));
    expect(text(0)).toBe('RIFF');
    expect(text(8)).toBe('WAVE');
    expect(view.getUint32(24, true)).toBe(22050);
    expect(view.getUint32(40, true)).toBe(8);
    expect(view.getInt16(44 + 2 * 3, true)).toBe(32767);
    expect(wav.length).toBe(44 + 8);
  });
});
