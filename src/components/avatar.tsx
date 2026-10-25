import { helmetOf } from '@/game';
import { useProfile } from '@/store/profile';

import { HelmetAvatar } from './helmet';

/** The player's own helmet in a circle. */
export function Avatar({ size = 40 }: { size?: number }) {
  const nick = useProfile((state) => state.nick);
  const helmet = useProfile((state) => state.helmet);
  return <HelmetAvatar helmet={helmetOf(helmet, nick)} size={size} />;
}
