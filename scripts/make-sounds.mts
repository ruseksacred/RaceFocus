// Writes assets/sounds/*.wav for the phone app from src/feedback/synth.ts.
// Run: npm run sounds
import { writeFileSync } from 'node:fs';

import { encodeWav, renderSound, SOUND_IDS } from '../src/feedback/synth.ts';

const SAMPLE_RATE = 22050;
for (const id of SOUND_IDS) {
  const file = new URL(`../assets/sounds/${id}.wav`, import.meta.url);
  writeFileSync(file, encodeWav(renderSound(id, SAMPLE_RATE), SAMPLE_RATE));
  console.log(`assets/sounds/${id}.wav`);
}
