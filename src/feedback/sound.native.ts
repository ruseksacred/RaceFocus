import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import type { SoundId } from './synth';

// Phone app: WAV files made from src/feedback/synth.ts (npm run sounds).
const FILES: Record<SoundId, number> = {
  light: require('../../assets/sounds/light.wav'),
  go: require('../../assets/sounds/go.wav'),
  tap: require('../../assets/sounds/tap.wav'),
  wrong: require('../../assets/sounds/wrong.wav'),
  lap: require('../../assets/sounds/lap.wav'),
  best: require('../../assets/sounds/best.wav'),
  finish: require('../../assets/sounds/finish.wav'),
};

const players = new Map<SoundId, AudioPlayer>();

export function prepareSounds() {
  // Mix with music the player may have on, and stay quiet when the phone is on silent.
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  for (const id of Object.keys(FILES) as SoundId[]) {
    try {
      players.set(id, createAudioPlayer(FILES[id]));
    } catch {
      // No sound for this one; the game works without it.
    }
  }
}

export function playSound(id: SoundId) {
  const player = players.get(id);
  if (!player) return;
  try {
    player.seekTo(0);
    player.play();
  } catch {
    // Ignore: a sound effect must never interrupt the race.
  }
}
