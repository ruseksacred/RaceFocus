import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Wordmark } from '@/components/wordmark';
import { formatLapTime, TRACKS, type Mode, type TrackId } from '@/game';
import { recordKey, useRecords } from '@/store/records';
import { colors, fonts, label, tabular } from '@/theme';

const MODE_LABELS: Record<Mode, string> = {
  ascending: '1 → N',
  descending: 'Countdown',
};

export default function Home() {
  const [track, setTrack] = useState<TrackId>('circuit');
  const [mode, setMode] = useState<Mode>('ascending');
  const bestLaps = useRecords((state) => state.bestLaps);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Wordmark />

        <View style={styles.section}>
          <Text style={label}>Solo practice</Text>
          <Text style={styles.title}>Choose your track</Text>
        </View>

        <View style={styles.tracks}>
          {TRACKS.map((t) => {
            const selected = t.id === track;
            const best = bestLaps[recordKey(t.id, mode)];
            return (
              <Pressable
                key={t.id}
                onPress={() => setTrack(t.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${t.name}, ${t.size} by ${t.size}`}
                style={[styles.trackCard, selected && styles.trackCardSelected]}>
                <Text style={styles.trackSize}>
                  {t.size}×{t.size}
                </Text>
                <Text style={styles.trackName}>{t.name}</Text>
                <Text style={[styles.trackBest, tabular, best === undefined && styles.trackBestEmpty]}>
                  {best === undefined ? '--:--.--' : formatLapTime(best)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={label}>Mode</Text>
        </View>
        <View style={styles.modes} accessibilityRole="radiogroup">
          {(Object.keys(MODE_LABELS) as Mode[]).map((m) => {
            const selected = m === mode;
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.modeButton, selected && styles.modeButtonSelected]}>
                <Text style={[styles.modeText, selected && styles.modeTextSelected]}>{MODE_LABELS[m]}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/race', params: { track, mode } })}
          style={({ pressed }) => [styles.start, pressed && styles.startPressed]}>
          <Text style={styles.startText}>START</Text>
        </Pressable>

        <Text style={styles.hint}>
          Tap the numbers in order as fast as you can. A wrong tap adds 1 second.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.carbon },
  content: { padding: 24, paddingTop: 32, maxWidth: 480, width: '100%', alignSelf: 'center' },
  section: { marginTop: 32, gap: 6 },
  title: { fontFamily: fonts.heading, fontSize: 36, color: colors.text, lineHeight: 40 },
  tracks: { flexDirection: 'row', gap: 10, marginTop: 14 },
  trackCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  trackCardSelected: { borderColor: colors.red, borderWidth: 2, paddingVertical: 13, paddingHorizontal: 11 },
  trackSize: { fontFamily: fonts.heading, fontSize: 32, color: colors.text, lineHeight: 34 },
  trackName: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  trackBest: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.green, marginTop: 10 },
  trackBestEmpty: { color: colors.muted },
  modes: { flexDirection: 'row', gap: 10, marginTop: 12 },
  modeButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonSelected: { backgroundColor: colors.surface2, borderColor: colors.muted },
  modeText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted },
  modeTextSelected: { color: colors.text },
  start: {
    marginTop: 36,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startPressed: { opacity: 0.85 },
  startText: { fontFamily: fonts.heading, fontSize: 24, letterSpacing: 1.5, color: colors.white },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 16 },
});
