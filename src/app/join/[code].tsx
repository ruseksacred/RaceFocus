import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, Screen, SectionLabel, ui } from '@/components/ui';
import { Wordmark } from '@/components/wordmark';
import { getTrack, NICK_MAX_LENGTH, normalizeNick, normalizeRoomCode, roomLength, trackLabel } from '@/game';
import { describeError, errorText, useMessages } from '@/i18n';
import { describeLength, seconds } from '@/labels';
import { useAccount } from '@/net/account';
import { firebaseConfigured, signIn } from '@/net/firebase';
import { joinRoom, watchRoom, type Room } from '@/net/rooms';
import { useProfile } from '@/store/profile';
import { colors, fonts, label } from '@/theme';

/** Opened from an invite link (/join/ABCDE): pick a nick and join the room in one tap. */
export default function JoinScreen() {
  const m = useMessages();
  const params = useLocalSearchParams<{ code: string }>();
  const code = normalizeRoomCode(params.code ?? '');
  const nick = useProfile((state) => state.nick);
  const setNick = useProfile((state) => state.setNick);
  const accountNick = useAccount((state) => !state.isGuest && !state.needsNick);
  const [uid, setUid] = useState<string | null>(null);
  // undefined while loading, null when there is no such room.
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rooms can only be read when signed in (a guest is signed in anonymously).
  useEffect(() => {
    if (!code || !firebaseConfigured) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    signIn()
      .then((id) => {
        if (cancelled) return;
        setUid(id);
        unsubscribe = watchRoom(code, setRoom);
      })
      .catch(() => !cancelled && setError(m.errors.noServer));
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [code, m]);

  // Already in this room (e.g. the host opened their own link): go straight there.
  const inRoom = !!(uid && room?.players?.[uid]);
  useEffect(() => {
    if (inRoom && code) router.replace({ pathname: '/room/[code]', params: { code } });
  }, [inRoom, code]);

  const validNick = normalizeNick(nick);
  const join = async () => {
    if (!code || !validNick) return;
    setBusy(true);
    setError(null);
    try {
      await joinRoom(code, validNick);
      router.replace({ pathname: '/room/[code]', params: { code } });
    } catch (e) {
      setError(describeError(m, e, 'noServer'));
      setBusy(false);
    }
  };

  const goHome = () => router.replace('/');

  if (!code) {
    return (
      <Screen>
        <Wordmark />
        <Card style={styles.card}>
          <Text style={ui.body}>{m.join.badCode}</Text>
        </Card>
        <HomeButton onPress={goHome} />
      </Screen>
    );
  }

  const host = room?.players?.[room.hostId]?.name;
  const players = Object.keys(room?.players ?? {}).length;
  const blocked =
    room === null
      ? errorText(m, 'roomNotFound', code)
      : room && room.status !== 'lobby'
        ? m.errors.roomStarted
        : room && players >= room.rules.maxPlayers
          ? m.errors.roomFull
          : null;
  const canJoin = !!validNick && !busy && room !== undefined && blocked === null;

  return (
    <Screen>
      <Wordmark />
      <Text style={[label, styles.top]}>{m.join.label}</Text>
      <Text style={ui.title}>{m.join.title}</Text>
      <Text style={[ui.body, styles.intro]}>{m.join.body}</Text>

      <Card style={styles.card}>
        <Text style={[label, styles.small]}>{m.join.roomCode}</Text>
        <Text style={styles.code}>{code}</Text>
        {room === undefined && !error && <ActivityIndicator color={colors.text} />}
        {room && (
          <>
            {host && <Text style={styles.host}>{m.join.host(host)}</Text>}
            <Text style={ui.body}>
              {trackLabel(getTrack(room.rules.track)!)} · {m.modesShort[room.rules.mode]} ·{' '}
              {describeLength(m, roomLength(room.rules))} ·{' '}
              {m.common.penaltyPerWrongTap(seconds(room.rules.penaltyMs))}
            </Text>
            <Text style={ui.body}>{m.room.drivers(players, room.rules.maxPlayers)}</Text>
          </>
        )}
      </Card>

      <SectionLabel>{m.join.yourNick}</SectionLabel>
      {accountNick ? (
        <View style={[styles.input, styles.accountNick]}>
          <Text style={styles.accountNickText}>{nick}</Text>
          <Text style={styles.accountNickNote}>{m.join.fromAccount}</Text>
        </View>
      ) : (
        <TextInput
          value={nick}
          onChangeText={setNick}
          placeholder={m.common.nickPlaceholder}
          placeholderTextColor={colors.muted}
          maxLength={NICK_MAX_LENGTH}
          autoCorrect={false}
          accessibilityLabel={m.join.yourNick}
          style={styles.input}
        />
      )}

      <Pressable
        onPress={join}
        disabled={!canJoin}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canJoin, busy }}
        style={({ pressed }) => [styles.primary, !canJoin && styles.disabled, pressed && styles.pressed]}>
        {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>{m.join.join}</Text>}
      </Pressable>
      {!validNick && blocked === null && <Text style={styles.hint}>{m.join.enterNick}</Text>}
      {(blocked ?? error) && (
        <Text style={styles.error} accessibilityRole="alert">
          {blocked ?? error}
        </Text>
      )}
      <HomeButton onPress={goHome} />
    </Screen>
  );
}

function HomeButton({ onPress }: { onPress: () => void }) {
  const m = useMessages();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.link}>
      <Text style={styles.linkText}>{m.join.home}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { marginTop: 24 },
  intro: { marginTop: 6 },
  card: { marginTop: 18, padding: 16, gap: 6, alignItems: 'center' },
  small: { fontSize: 11 },
  code: { fontFamily: fonts.heading, fontSize: 48, lineHeight: 54, letterSpacing: 8, color: colors.text },
  host: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
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
  accountNick: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accountNickText: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text },
  accountNickNote: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  primary: {
    marginTop: 16,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontFamily: fonts.heading, fontSize: 24, letterSpacing: 1.5, color: colors.white },
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
  link: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  linkText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted },
});
