import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, Screen, SectionLabel } from '@/components/ui';
import { formatLapTime, getTrack, MAX_LAPS, MIN_LAPS, MODES, parseLapCount, TRACKS } from '@/game';
import { usePractice } from '@/store/practice';
import { recordKey, useRecords } from '@/store/records';
import { MODE_LABELS } from '@/labels';
import { colors, fonts, label, tabular } from '@/theme';

export default function Practice() {
  const setup = usePractice((state) => state.setup);
  const updateSetup = usePractice((state) => state.updateSetup);
  const bestLaps = useRecords((state) => state.bestLaps);
  const [lapsText, setLapsText] = useState(String(setup.laps));
  const laps = parseLapCount(lapsText);

  const changeLaps = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    setLapsText(digits);
    const parsed = parseLapCount(digits);
    if (parsed !== null) updateSetup({ laps: parsed });
  };
  const stepLaps = (step: number) => {
    const next = Math.min(MAX_LAPS, Math.max(MIN_LAPS, (laps ?? setup.laps) + step));
    changeLaps(String(next));
  };

  const track = getTrack(setup.track)!;
  const best = bestLaps[recordKey(setup.track, setup.mode)]?.ms;

  return (
    <Screen>
      <Text style={label}>Practice</Text>
      <Text style={styles.title}>Solo session</Text>

      <SectionLabel>Track</SectionLabel>
      <View style={styles.tracks} accessibilityRole="radiogroup">
        {TRACKS.map((t) => {
          const selected = t.id === setup.track;
          const pb = bestLaps[recordKey(t.id, setup.mode)]?.ms;
          return (
            <Pressable
              key={t.id}
              onPress={() => updateSetup({ track: t.id })}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${t.name}, ${t.size} by ${t.size}`}
              style={[styles.trackRow, selected && styles.trackRowSelected]}>
              <Text style={styles.trackSize}>
                {t.size}×{t.size}
              </Text>
              <View style={styles.trackText}>
                <Text style={styles.trackName}>{t.name}</Text>
                <Text style={styles.trackMeta}>{t.size * t.size} numbers</Text>
              </View>
              <Text style={[styles.trackBest, tabular, pb === undefined && styles.muted]}>
                {pb === undefined ? 'no lap yet' : formatLapTime(pb)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>Mode</SectionLabel>
      <View style={styles.modes} accessibilityRole="radiogroup">
        {MODES.map((m) => {
          const selected = m === setup.mode;
          return (
            <Pressable
              key={m}
              onPress={() => updateSetup({ mode: m })}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.modeButton, selected && styles.modeButtonSelected]}>
              <Text style={[styles.modeText, selected && styles.modeTextSelected]}>{MODE_LABELS[m]}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>Laps</SectionLabel>
      <View style={styles.lapsRow}>
        <StepButton text="−" label="One lap less" onPress={() => stepLaps(-1)} />
        <TextInput
          value={lapsText}
          onChangeText={changeLaps}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={2}
          selectTextOnFocus
          accessibilityLabel="Number of laps"
          style={[styles.lapsInput, laps === null && styles.lapsInputInvalid]}
        />
        <StepButton text="+" label="One lap more" onPress={() => stepLaps(1)} />
        <Text style={[styles.lapsHint, laps === null && styles.lapsHintInvalid]}>
          {laps === null ? `Enter ${MIN_LAPS}–${MAX_LAPS}` : `Type ${MIN_LAPS}–${MAX_LAPS}\nor use − / +`}
        </Text>
      </View>

      <Card style={styles.target}>
        <View style={styles.targetText}>
          <Text style={[label, styles.small]}>Target race time</Text>
          <Text style={styles.targetMeta}>
            {best === undefined
              ? `Set a lap on ${track.name} to get a target`
              : `${laps ?? '–'} ${laps === 1 ? 'lap' : 'laps'} × your best lap`}
          </Text>
        </View>
        <Text style={[styles.targetTime, tabular]}>
          {best === undefined || laps === null ? '—' : formatLapTime(best * laps)}
        </Text>
      </Card>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: laps === null }}
        disabled={laps === null}
        onPress={() =>
          router.push({
            pathname: '/race',
            params: { track: setup.track, mode: setup.mode, laps: String(laps) },
          })
        }
        style={({ pressed }) => [styles.start, laps === null && styles.disabled, pressed && styles.pressed]}>
        <Text style={styles.startText}>
          START · {laps ?? '–'} {laps === 1 ? 'LAP' : 'LAPS'}
        </Text>
      </Pressable>
      <Text style={styles.hint}>Tap the numbers in order as fast as you can. A wrong tap adds 1 second.</Text>
    </Screen>
  );
}

function StepButton({ text, label: a11y, onPress }: { text: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={styles.step}>
      <Text style={styles.stepText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.heading, fontSize: 40, lineHeight: 44, color: colors.text, marginTop: 2 },
  tracks: { gap: 8 },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    height: 58,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  trackRowSelected: {
    backgroundColor: colors.surface2,
    borderColor: colors.red,
    borderWidth: 2,
    paddingHorizontal: 13,
  },
  trackSize: { fontFamily: fonts.heading, fontSize: 28, color: colors.text, width: 52 },
  trackText: { flex: 1 },
  trackName: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  trackMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  trackBest: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.green },
  muted: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  modes: { flexDirection: 'row', gap: 8 },
  modeButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonSelected: { backgroundColor: colors.surface2, borderColor: colors.muted },
  modeText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted },
  modeTextSelected: { color: colors.text },
  lapsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  step: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontFamily: fonts.bodySemi, fontSize: 24, color: colors.text },
  lapsInput: {
    width: 80,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.muted,
    backgroundColor: colors.surface2,
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 30,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  lapsInputInvalid: { borderColor: colors.red },
  lapsHint: { flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted },
  lapsHintInvalid: { color: colors.text },
  target: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  targetText: { flex: 1, gap: 2 },
  small: { fontSize: 11 },
  targetMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  targetTime: { fontFamily: fonts.heading, fontSize: 28, color: colors.text },
  start: {
    marginTop: 16,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
  startText: { fontFamily: fonts.heading, fontSize: 24, letterSpacing: 1.5, color: colors.white },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 14 },
});
