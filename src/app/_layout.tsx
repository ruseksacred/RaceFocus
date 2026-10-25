import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { prepareSounds } from '@/feedback';
import { useLanguage } from '@/i18n';
import { startAccountSync } from '@/net/account';
import { colors } from '@/theme';

/** Links that open a screen directly (e.g. an invite) still get the tabs underneath for Back. */
export const unstable_settings = { anchor: '(tabs)' };

SplashScreen.preventAutoHideAsync();
startAccountSync();
prepareSounds();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
  });
  const ready = loaded || error !== null;
  const language = useLanguage();

  // Screen readers and browser translation use the page language.
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.carbon },
          animation: 'fade',
        }}
      />
    </>
  );
}
