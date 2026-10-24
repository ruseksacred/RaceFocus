import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, Screen, SectionLabel, ui } from '@/components/ui';
import {
  DEFAULT_RULES,
  MAX_LAPS,
  MAX_PLAYERS,
  MIN_LAPS,
  MIN_PLAYERS,
  MODES,
  NICK_MAX_LENGTH,
  normalizeNick,
  normalizeRoomCode,
  PENALTY_OPTIONS_MS,
  ROOM_CODE_LENGTH,
  TRACKS,
  type RoomRules,
} from '@/game';
import { MODE_SHORT } from '@/labels';
import { firebaseConfigured } from '@/net/firebase';
import { createRoom, joinRoom, RoomError } from '@/net/rooms';
import { useProfile } from '@/store/profile';
import { colors, fonts, label } from '@/theme';

export default function Rooms() {
  const nick = useProfile((state) => state.nick);
  const setNick = useProfile((state) => state.setNick);
  const [rules, setRules] = useState<RoomRules>(DEFAULT_RULES);
  const [codeText, setCodeText] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validNick = normalizeNick(nick);
  const code = normalizeRoomCode(codeText);
  const change = (patch: Partial<RoomRules>) => setRules((r) => ({ ...r, ...patch }));

  const run = async (kind: 'create' | 'join') => {
    if (!validNick) return;
    setBusy(kind);
    setError(null);
    try {
      const roomCode = kind === 'create' ? await createRoom(validNick, rules) : code!;
      if (kind === 'join') await joinRoom(roomCode, validNick);
      router.push({ pathname: '/room/[code]', params: { code: roomCode } });
    } catch (e) {
      setError(
        e instanceof RoomError
          ? e.message
          : 'No connection to the race server. Check your internet and try again.',
      );
    } finally {
      setBusy(null);
    }
  };

  if (!firebaseConfigured) {
    return (
      <Screen>
        <Text style={label}>Race</Text>
        <Text style={ui.title}>Private rooms</Text>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Race server not set up</Text>
          <Text style={ui.body}>
            Private rooms need Firebase. Add your project config to a .env file (see .env.example), or run the
            local emulators with npm run emulators and set EXPO_PUBLIC_FIREBASE_EMULATOR_HOST.
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={label}>Race</Text>
      <Text style={ui.title}>Private rooms</Text>
      <Text style={[ui.body, styles.intro]}>
        Race friends live on the same boards. Create a room, share the code, start when everyone is in.
      </Text>

      <SectionLabel>Your nick</SectionLabel>
      <TextInput
        value={nick}
        onChangeText={setNick}
        placeholder="e.g. Max"
        placeholderTextColor={colors.muted}
        maxLength={NICK_MAX_LENGTH}
        autoCorrect={false}
        accessibilityLabel="Your nick"
        style={[styles.input, !validNick && nick.length > 0 && styles.inputInvalid]}
      />

      <SectionLabel>Join a room</SectionLabel>
      <View style={styles.joinRow}>
        <TextInput
          value={codeText}
          onChangeText={(t) => setCodeText(t.toUpperCase())}
          placeholder="CODE"
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={ROOM_CODE_LENGTH + 2}
          accessibilityLabel="Room code"
          style={[styles.input, styles.codeInput]}
        />
        <Pressable
          onPress={() => run('join')}
          disabled={!validNick || !code || busy !== null}
          accessibilityRole="button"
          accessibilityState={{ disabled: !validNick || !code || busy !== null }}
          style={[styles.secondary, (!validNick || !code) && styles.disabled]}>
          {busy === 'join' ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.secondaryText}>Join</Text>
          )}
        </Pressable>
      </View>

      <SectionLabel>Create a room</SectionLabel>
      <Card style={styles.card}>
        <Text style={[label, styles.small]}>Track</Text>
        <View style={styles.chips}>
          {TRACKS.map((t) => (
            <Chip
              key={t.id}
              text={`${t.size}×${t.size}`}
              sub={t.name}
              selected={rules.track === t.id}
              onPress={() => change({ track: t.id })}
            />
          ))}
        </View>

        <Text style={[label, styles.small]}>Mode</Text>
        <View style={styles.chips}>
          {MODES.map((m) => (
            <Chip
              key={m}
              text={MODE_SHORT[m]}
              selected={rules.mode === m}
              onPress={() => change({ mode: m })}
            />
          ))}
        </View>

        <View style={styles.steppers}>
          <Stepper
            title="Laps"
            value={rules.laps}
            min={MIN_LAPS}
            max={MAX_LAPS}
            onChange={(laps) => change({ laps })}
          />
          <Stepper
            title="Max drivers"
            value={rules.maxPlayers}
            min={MIN_PLAYERS}
            max={MAX_PLAYERS}
            onChange={(maxPlayers) => change({ maxPlayers })}
          />
        </View>

        <Text style={[label, styles.small]}>Penalty per wrong tap</Text>
        <View style={styles.chips}>
          {PENALTY_OPTIONS_MS.map((ms) => (
            <Chip
              key={ms}
              text={`+${ms / 1000} s`}
              selected={rules.penaltyMs === ms}
              onPress={() => change({ penaltyMs: ms })}
            />
          ))}
        </View>

        <Pressable
          onPress={() => run('create')}
          disabled={!validNick || busy !== null}
          accessibilityRole="button"
          accessibilityState={{ disabled: !validNick || busy !== null }}
          style={({ pressed }) => [styles.primary, !validNick && styles.disabled, pressed && styles.pressed]}>
          {busy === 'create' ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryText}>CREATE ROOM</Text>
          )}
        </Pressable>
      </Card>

      {!validNick && <Text style={styles.hint}>Enter a nick to create or join a room.</Text>}
      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </Screen>
  );
}

function Chip({
  text,
  sub,
  selected,
  onPress,
}: {
  text: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={sub ? `${text} ${sub}` : text}
      style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{text}</Text>
      {sub && <Text style={styles.chipSub}>{sub}</Text>}
    </Pressable>
  );
}

function Stepper({
  title,
  value,
  min,
  max,
  onChange,
}: {
  title: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={[label, styles.small]}>{title}</Text>
      <View style={styles.stepperRow}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          accessibilityRole="button"
          accessibilityLabel={`${title}: fewer`}
          style={styles.stepButton}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue} accessibilityLabel={`${title} ${value}`}>
          {value}
        </Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          accessibilityRole="button"
          accessibilityLabel={`${title}: more`}
          style={styles.stepButton}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: 6 },
  card: { padding: 16, gap: 10 },
  cardTitle: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text },
  small: { fontSize: 11 },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    color: colors.text,
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    paddingHorizontal: 14,
  },
  inputInvalid: { borderColor: colors.red },
  joinRow: { flexDirection: 'row', gap: 10 },
  codeInput: { flex: 1, minWidth: 0, fontFamily: fonts.heading, fontSize: 24, letterSpacing: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  chipSelected: { backgroundColor: colors.surface2, borderColor: colors.red },
  chipText: { fontFamily: fonts.heading, fontSize: 18, color: colors.muted },
  chipTextSelected: { color: colors.text },
  chipSub: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  steppers: { flexDirection: 'row', gap: 16 },
  stepper: { flex: 1, gap: 6 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontFamily: fonts.bodySemi, fontSize: 22, color: colors.text },
  stepValue: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.text,
    minWidth: 36,
    textAlign: 'center',
  },
  primary: {
    marginTop: 6,
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontFamily: fonts.heading, fontSize: 22, letterSpacing: 1.5, color: colors.white },
  secondary: {
    width: 96,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 12, textAlign: 'center' },
  error: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.yellow,
    marginTop: 12,
    textAlign: 'center',
  },
});
