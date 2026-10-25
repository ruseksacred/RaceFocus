import { Platform, Share } from 'react-native';

/** Public address of the web app. The phone app shares links to it too, so anyone can open them. */
const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? 'https://soft-rugelach-50516d.netlify.app';

function siteOrigin(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.origin;
  return SITE_URL.replace(/\/+$/, '');
}

/** Link that opens the join screen for a room, e.g. https://…/join/ABCDE */
export function inviteUrl(code: string): string {
  return `${siteOrigin()}/join/${code}`;
}

/** 'dismissed': the player closed the share sheet; nothing to report. */
export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'failed';

/**
 * Opens the system share sheet with the invite link. Where there is none (most desktop browsers),
 * copies the link instead.
 */
export async function shareInvite(url: string, title: string, text: string): Promise<ShareOutcome> {
  if (Platform.OS !== 'web') {
    try {
      const result = await Share.share({ title, message: `${text} ${url}`, url });
      return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
    } catch {
      return 'failed';
    }
  }

  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (nav?.share) {
    try {
      await nav.share({ title, text, url });
      return 'shared';
    } catch (error) {
      // Closing the share sheet is not an error worth falling back from.
      if (error instanceof Error && error.name === 'AbortError') return 'dismissed';
    }
  }
  try {
    await nav?.clipboard?.writeText(url);
    return nav?.clipboard ? 'copied' : 'failed';
  } catch {
    return 'failed';
  }
}
