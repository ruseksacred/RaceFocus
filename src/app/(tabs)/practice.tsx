import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, Screen, SectionLabel } from '@/components/ui';
import {
  formatLapTime,
  getTrack,
  MAX_LAPS,
  MAX_MINUTES,
  MIN_LAPS,
  MIN_MINUTES,
  MINUTE_MS,
  MODES,
  parseLapCount,
  parseMinutes,
  TRACKS,
} from '@/game';
import { usePractice } from '@/store/practice';
import { recordKey, useRecords } from '@/store/records';
import { useMessages } from '@/i18n';
import { colors, fonts, label, tabular } from '@/theme';

export default function Practice() {
  const m = useMessages();
  const setup = usePractice((state) => state.setup);
  const updateSetup = usePractice((state) => state.updateSetup);
  const bestLaps = useRecords((state) => state.bestLaps);
  const [lapsText, setLapsText] = useState(String(setup.laps));
  const [minutesText, setMinutesText] = useState(String(setup.minutes));
  const timed = setup.lengthKind === 'time';
  const laps = parseLapCount(lapsText);
  const minutes = parseMinutes(minutesText);
  // The value being edited: laps for a lap race, minutes for a timed race.
  const value = timed ? minutes : laps;
  const [min, max] = timed ? [MIN_MINUTES, MAX_MINUTES] : [MIN_LAPS, MAX_LAPS];

  const changeValue = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    if (timed) {
      setMinutesText(digits);
      const parsed = parseMinutes(digits);
      if (parsed !== null) updateSetup({ minutes: parsed });
    } else {
      setLapsText(digits);
      const parsed = parseLapCount(digits);
      if (parsed !== null) updateSetup({ laps: parsed });
    }
  };
  const step = (by: number) => {
    const current = value ?? (timed ? setup.minutes : setup.laps);
    changeValue(String(Math.min(max, Math.max(min, current + by))));
  };
  const unit = timed ? m.practice.unitMin : m.practice.unitLaps(value ?? 0);

  const track = getTrack(setup.track)!;
  const best = bestLaps[recordKey(setup.track, setup.mode)]?.ms;

  return (
    <Screen>
      <Text style={label}>{m.practice.label}</Text>
      <Text style={styles.title}>{m.practice.title}</Text>

      <SectionLabel>{m.practice.track}</SectionLabel>
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
              accessibilityLabel={m.practice.trackA11y(t.name, t.size)}
              style={[styles.trackRow, selected && styles.trackRowSelected]}>
              <Text style={styles.trackSize}>
                {t.size}×{t.size}
              </Text>
              <View style={styles.trackText}>
                <Text style={styles.trackName}>{t.name}</Text>
                <Text style={styles.trackMeta}>{m.practice.numbers(t.size * t.size)}</Text>
              </View>
              <Text style={[styles.trackBest, tabular, pb === undefined && styles.muted]}>
                {pb === undefined ? m.practice.noLapYet : formatLapTime(pb)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>{m.practice.mode}</SectionLabel>
      <View style={styles.modes} accessibilityRole="radiogroup">
        {MODES.map((mode) => {
          const selected = mode === setup.mode;
          return (
            <Pressable
              key={mode}
              onPress={() => updateSetup({ mode })}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.modeButton, selected && styles.modeButtonSelected]}>
              <Text style={[styles.modeText, selected && styles.modeTextSelected]}>{m.modes[mode]}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>{m.practice.raceLength}</SectionLabel>
      <View style={styles.modes} accessibilityRole="radiogroup">
        {(['laps', 'time'] as const).map((kind) => {
          const selected = kind === setup.lengthKind;
          return (
            <Pressable
              key={kind}
              onPress={() => updateSetup({ lengthKind: kind })}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.modeButton, selected && styles.modeButtonSelected]}>
              <Text style={[styles.modeText, selected && styles.modeTextSelected]}>
                {kind === 'laps' ? m.practice.lengthLaps : m.practice.lengthTime}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.lapsRow, styles.lengthRow]}>
        <StepButton text="−" label={timed ? m.practice.lessMinute : m.practice.lessLap} onPress={() => step(-1)} />
        <TextInput
          value={timed ? minutesText : lapsText}
          onChangeText={changeValue}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={2}
          selectTextOnFocus
          accessibilityLabel={timed ? m.practice.minutesA11y : m.practice.lapsA11y}
          style={[styles.lapsInput, value === null && styles.lapsInputInvalid]}
        />
        <StepButton text="+" label={timed ? m.practice.moreMinute : m.practice.moreLap} onPress={() => step(1)} />
        <Text style={[styles.lapsHint, value === null && styles.lapsHintInvalid]}>
          {value === null ? m.practice.enterRange(min, max, timed) : m.practice.typeRange(min, max)}
        </Text>
      </View>
      {timed && <Text style={styles.lengthNote}>{m.practice.timedNote}</Text>}

      <Card style={styles.target}>
        <View style={styles.targetText}>
          <Text style={[label, styles.small]}>{timed ? m.practice.lapsAtPace : m.practice.targetTime}</Text>
          <Text style={styles.targetMeta}>
            {best === undefined
              ? m.practice.setLapFirst(track.name)
              : timed
                ? m.practice.minutesOverBest(minutes === null ? '–' : String(minutes))
                : m.practice.lapsTimesBest(laps === null ? '–' : m.common.laps(laps))}
          </Text>
        </View>
        <Text style={[styles.targetTime, tabular]}>
          {best === undefined || value === null
            ? '—'
            : timed
              ? `≈ ${Math.floor((value * MINUTE_MS) / best) + 1}`
              : formatLapTime(best * value)}
        </Text>
      </Card>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: value === null }}
        disabled={value === null}
        onPress={() =>
          router.push({
            pathname: '/race',
            params: timed
              ? { track: setup.track, mode: setup.mode, minutes: String(minutes) }
              : { track: setup.track, mode: setup.mode, laps: String(laps) },
          })
        }
        style={({ pressed }) => [styles.start, value === null && styles.disabled, pressed && styles.pressed]}>
        <Text style={styles.startText}>
          {m.practice.start(value === null ? '–' : String(value), unit)}
        </Text>
      </Pressable>
      <Text style={styles.hint}>{m.practice.hint}</Text>
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
  lengthRow: { marginTop: 10 },
  lengthNote: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 8 },
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
