import { router } from 'expo-router';

/** Back to the previous screen, or Home when the app was opened straight on this one (e.g. from a link). */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
