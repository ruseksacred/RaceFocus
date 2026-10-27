import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { HelmetAvatar } from '@/components/helmet';
import { Card, Screen, ui } from '@/components/ui';
import {
  BOT_OFFER_MS,
  formatClock,
  helmetOf,
  licenceFor,
  matchRange,
  pickOpponent,
  type QueueEntry,
} from '@/game';
import { useMessages } from '@/i18n';
import { goBack } from '@/navigation';
import { useAccount } from '@/net/account';
import { serverNow } from '@/net/firebase';
import { claimOpponent, clearMatch, joinQueue, leaveQueue, watchQueue } from '@/net/quick';
import { joinRoom } from '@/net/rooms';
import { useCareer } from '@/store/career';
import { useProfile } from '@/store/profile';
import { colors, fonts, label, tabular } from '@/theme';

/** How long a matched driver waits for the other side's room before searching again. */
const JOIN_TIMEOUT_MS = 10_000;

/** Quick race 1v1: queue up, get matched with a driver of similar rating, race. */
export default function QuickRace() {
  const m = useMessages();
  const q = m.quick;
  const isAccount = useAccount((state) => !state.isGuest && !state.needsNick);
  const nick = useProfile((state) => state.nick);
  const rating = useCareer((state) => state.rating);
  const ratedRaces = useCareer((state) => state.ratedRaces);

  const [uid, setUid] = useState<string | null>(null);
  const [searchStart, setSearchStart] = useState(0);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [now, setNow] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [rival, setRival] = useState<QueueEntry | null>(null);
  const [busy, setBusy] = useState(false);

  const uidRef = useRef<string | null>(null);
  const claimingRef = useRef(false);
  const handledMatchRef = useRef<string | null>(null);
  const leftRef = useRef(false);

  const go = (code: string) => {
    leftRef.current = true;
    router.replace({ pathname: '/room/[code]', params: { code } });
  };

  const start = async () => {
    setBusy(true);
    setNote(null);
    try {
      const id = await joinQueue();
      uidRef.current = id;
      leftRef.current = false;
      setSearchStart(serverNow());
      setNow(serverNow());
      setUid(id);
    } catch {
      setNote(m.errors.noServer);
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    if (uidRef.current) leaveQueue(uidRef.current);
    uidRef.current = null;
    setUid(null);
    setQueue([]);
    setRival(null);
  };

  // While searching: the queue, and a clock so the rating range keeps widening.
  useEffect(() => {
    if (!uid) return;
    const stop = watchQueue(setQueue, () => setNote(m.errors.noServer));
    const id = setInterval(() => setNow(serverNow()), 1000);
    return () => {
      stop();
      clearInterval(id);
    };
  }, [uid, m]);

  // Leaving the screen without a match takes the driver out of the queue.
  useEffect(
    () => () => {
      if (uidRef.current && !leftRef.current) leaveQueue(uidRef.current);
    },
    [],
  );

  // Matching: claim an opponent, or join the room someone else made for us.
  useEffect(() => {
    if (!uid || claimingRef.current || leftRef.current) return;
    const me = queue.find((e) => e.id === uid);
    if (!me) return;

    if (me.match) {
      if (handledMatchRef.current === me.match) return;
      const code = me.match;
      handledMatchRef.current = code;
      const deadline = serverNow() + JOIN_TIMEOUT_MS;
      const tryJoin = async (): Promise<void> => {
        try {
          await joinRoom(code, nick);
          await leaveQueue(uid);
          go(code);
        } catch {
          if (leftRef.current) return;
          if (serverNow() < deadline) {
            setTimeout(tryJoin, 1000);
          } else {
            setNote(q.dropped);
            await clearMatch(uid).catch(() => {});
          }
        }
      };
      tryJoin();
      return;
    }

    const opponent = pickOpponent(me, queue, now);
    if (!opponent) return;
    claimingRef.current = true;
    claimOpponent(uid, opponent)
      .then(async (code) => {
        if (code) {
          setRival(opponent);
          await leaveQueue(uid);
          go(code);
        }
      })
      .catch(() => {})
      .finally(() => {
        claimingRef.current = false;
      });
    // `go` and texts are stable enough; re-running on queue and clock is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, now, uid]);

  const searching = uid !== null;
  const waited = Math.max(0, now - searchStart);
  const others = queue.filter((e) => e.id !== uid).length;
  const matchedEntry = queue.find((e) => e.id === uid)?.match;

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={goBack} accessibilityRole="button" hitSlop={12}>
          <Text style={styles.back}>{q.back}</Text>
        </Pressable>
        <Text style={label}>{q.label}</Text>
      </View>
      <Text style={ui.title}>{q.title}</Text>
      <Text style={[ui.body, styles.intro]}>{q.intro}</Text>

      <Card style={styles.card}>
        <Text style={[label, styles.small]}>{q.rules}</Text>
        <Text style={styles.rules}>{q.rulesText}</Text>
      </Card>

      {!isAccount ? (
        <Card style={styles.card}>
          <Text style={ui.body}>{q.accountNeeded}</Text>
          <Pressable
            onPress={() => router.navigate('/profile')}
            accessibilityRole="button"
            style={styles.secondary}>
            <Text style={styles.secondaryText}>{q.toProfile}</Text>
          </Pressable>
        </Card>
      ) : (
        <>
          <Card style={[styles.card, styles.me]}>
            <Avatar size={56} />
            <View style={styles.meText}>
              <Text style={styles.nick}>{nick}</Text>
              <Text style={ui.body}>
                {q.yourRating}: <Text style={[styles.strong, tabular]}>{Math.round(rating)}</Text> · {q.licence}{' '}
                {licenceFor(rating, ratedRaces)}
              </Text>
            </View>
          </Card>

          {searching ? (
            <Card style={[styles.card, styles.searching]}>
              {rival || matchedEntry ? (
                <>
                  <Text style={styles.found}>{q.found}</Text>
                  {rival && (
                    <View style={styles.rival}>
                      <HelmetAvatar helmet={helmetOf(rival.helmet, rival.nick)} size={44} />
                      <Text style={styles.nick}>
                        {rival.nick} <Text style={[ui.body, tabular]}>· {rival.rating}</Text>
                      </Text>
                    </View>
                  )}
                  <ActivityIndicator color={colors.text} />
                </>
              ) : (
                <>
                  <ActivityIndicator color={colors.text} />
                  <Text style={styles.searchingText}>{q.searching}</Text>
                  <Text style={[ui.body, tabular]}>
                    {q.waited(formatClock(waited))} · {q.range(matchRange(waited))}
                  </Text>
                  <Text style={ui.body}>{q.inQueue(others)}</Text>
                  <Pressable onPress={cancel} accessibilityRole="button" style={styles.secondary}>
                    <Text style={styles.secondaryText}>{q.cancel}</Text>
                  </Pressable>
                </>
              )}
            </Card>
          ) : (
            <Pressable
              onPress={start}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              style={({ pressed }) => [styles.primary, busy && styles.disabled, pressed && styles.pressed]}>
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>{q.search}</Text>}
            </Pressable>
          )}

          {searching && !matchedEntry && waited >= BOT_OFFER_MS && (
            <Card style={styles.card}>
              <Text style={ui.body}>{q.botOffer}</Text>
              <Pressable
                onPress={() => {
                  // Racing a bot ends the search, so a match cannot pull the driver out mid-race.
                  cancel();
                  router.push({ pathname: '/bot-race', params: { preset: 'quick' } });
                }}
                accessibilityRole="button"
                style={styles.primarySmall}>
                <Text style={styles.primaryText}>{q.botButton}</Text>
              </Pressable>
            </Card>
          )}
        </>
      )}
      {note && (
        <Text style={styles.note} accessibilityRole="alert">
          {note}
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  back: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.muted },
  intro: { marginTop: 6 },
  card: { marginTop: 16, padding: 16, gap: 8 },
  small: { fontSize: 11 },
  rules: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text, lineHeight: 21 },
  me: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  meText: { flex: 1, gap: 2 },
  nick: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
  strong: { fontFamily: fonts.bodySemi, color: colors.text },
  searching: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  searchingText: { fontFamily: fonts.heading, fontSize: 26, color: colors.text },
  found: { fontFamily: fonts.heading, fontSize: 28, color: colors.green },
  rival: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  primary: {
    marginTop: 18,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primarySmall: {
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontFamily: fonts.heading, fontSize: 22, letterSpacing: 1.5, color: colors.white },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  secondary: {
    alignSelf: 'stretch',
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textAlign: 'center' },
  note: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.yellow, marginTop: 12, textAlign: 'center' },
});
