import { useSettings } from '@/store/settings';

import { vibrate } from './haptics';
import { playSound, prepareSounds } from './sound';

export { prepareSounds };

/** Something in a race the player should hear or feel. */
export type RaceEvent = 'light' | 'go' | 'tap' | 'wrong' | 'lap' | 'best' | 'finish';

/** Plays the sound and vibration for a race event, as allowed in Settings. */
export function feedback(event: RaceEvent) {
  const { sounds, vibration } = useSettings.getState();
  if (sounds) playSound(event);
  if (vibration && (event === 'wrong' || event === 'go' || event === 'finish')) vibrate(event);
}
