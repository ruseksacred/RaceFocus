import * as Haptics from 'expo-haptics';

import type { Buzz } from './haptics';

export type { Buzz };

export function vibrate(buzz: Buzz) {
  const run =
    buzz === 'wrong'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      : buzz === 'go'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  run.catch(() => {});
}
