import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip, Stepper } from '@/components/controls';
import { Card, Screen, ui } from '@/components/ui';
import {
  BOT_LEVELS,
  MAX_BOTS,
  MAX_LAPS,
  MAX_MINUTES,
  MIN_BOTS,
  MIN_LAPS,
  MIN_MINUTES,
  MODES,
  PENALTY_OPTIONS_MS,
  TRACKS,
} from '@/game';
import { useMessages } from '@/i18n';
import { seconds } from '@/labels';
import { goBack } from '@/navigation';
import { useBotSetup } from '@/store/bots';
import { recordKey, useRecords } from '@/store/records';
import { colors, fonts, label } from '@/theme';

/** Setup for an offline race against bots. Opened from the Race tab. */
export default function BotsSetup() {
  const m = useMessages();
  const b = m.bots;
  const setup = useBotSetup((state) => state.setup);
  const change = useBotSetup((state) => state.updateSetup);
  const hasPb = useRecords((state) => !!state.bestLaps[recordKey(setup.track, setup.mode)]);
  const timed = setup.lengthKind === 'time';

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={goBack} accessibilityRole="button" hitSlop={12}>
          <Text style={styles.back}>{b.back}</Text>
        </Pressable>
        <Text style={label}>{b.label}</Text>
      </View>
      <Text style={ui.title}>{b.title}</Text>
      <Text style={[ui.body, styles.intro]}>{b.intro}</Text>

      <Card style={styles.card}>
        <Text style={[label, styles.small]}>{b.level}</Text>
        <View style={styles.chips}>
          {BOT_LEVELS.map((level) => (
            <Chip
              key={level}
              text={b.levels[level]}
              selected={setup.level === level}
              onPress={() => change({ level })}
            />
          ))}
        </View>
        <Text style={styles.note}>
          {setup.level === 'matched' && !hasPb ? b.matchedNoPb : b.levelNotes[setup.level]}
        </Text>

        <Text style={[label, styles.small]}>{b.track}</Text>
        <View style={styles.chips}>
          {TRACKS.map((t) => (
            <Chip
              key={t.id}
              text={`${t.size}×${t.size}`}
              sub={t.name}
              selected={setup.track === t.id}
              onPress={() => change({ track: t.id })}
            />
          ))}
        </View>

        <Text style={[label, styles.small]}>{b.mode}</Text>
        <View style={styles.chips}>
          {MODES.map((mode) => (
            <Chip key={mode} text={m.modesShort[mode]} selected={setup.mode === mode} onPress={() => change({ mode })} />
          ))}
        </View>

        <Text style={[label, styles.small]}>{m.rooms.raceLength}</Text>
        <View style={styles.chips}>
          <Chip text={m.rooms.lengthLaps} selected={!timed} onPress={() => change({ lengthKind: 'laps' })} />
          <Chip text={m.rooms.lengthTime} selected={timed} onPress={() => change({ lengthKind: 'time' })} />
        </View>
        {timed && <Text style={styles.note}>{m.rooms.timedNote}</Text>}

        <View style={styles.steppers}>
          {timed ? (
            <Stepper
              title={m.rooms.minutes}
              value={setup.minutes}
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              onChange={(minutes) => change({ minutes })}
            />
          ) : (
            <Stepper
              title={m.rooms.laps}
              value={setup.laps}
              min={MIN_LAPS}
              max={MAX_LAPS}
              onChange={(laps) => change({ laps })}
            />
          )}
          <Stepper title={b.bots} value={setup.bots} min={MIN_BOTS} max={MAX_BOTS} onChange={(bots) => change({ bots })} />
        </View>

        <Text style={[label, styles.small]}>{m.rooms.penalty}</Text>
        <View style={styles.chips}>
          {PENALTY_OPTIONS_MS.map((ms) => (
            <Chip
              key={ms}
              text={`+${seconds(ms)} s`}
              selected={setup.penaltyMs === ms}
              onPress={() => change({ penaltyMs: ms })}
            />
          ))}
        </View>

        <Pressable
          onPress={() => router.push('/bot-race')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
          <Text style={styles.primaryText}>{b.start(setup.bots)}</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  back: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.muted },
  intro: { marginTop: 6 },
  card: { marginTop: 18, padding: 16, gap: 10 },
  small: { fontSize: 11 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted },
  steppers: { flexDirection: 'row', gap: 16 },
  primary: {
    marginTop: 6,
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  primaryText: { fontFamily: fonts.heading, fontSize: 22, letterSpacing: 1.5, color: colors.white },
});
