import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Card, Screen, SectionLabel } from '@/components/ui';
import { Wordmark } from '@/components/wordmark';
import { formatLapTime, getTrack, trackLabel, TRACKS } from '@/game';
import { formatWhen, MODE_SHORT } from '@/labels';
import { usePractice } from '@/store/practice';
import { recordKey, useRecords } from '@/store/records';
import { colors, fonts, label, tabular } from '@/theme';

export default function Home() {
  const setup = usePractice((state) => state.setup);
  const recent = usePractice((state) => state.recent);
  const updateSetup = usePractice((state) => state.updateSetup);
  const bestLaps = useRecords((state) => state.bestLaps);

  const track = getTrack(setup.track)!;
  const best = bestLaps[recordKey(setup.track, setup.mode)]?.ms;
  const lastSession = recent.find((s) => s.track === setup.track && s.mode === setup.mode);

  const start = () =>
    router.push({
      pathname: '/race',
      params:
        setup.lengthKind === 'time'
          ? { track: setup.track, mode: setup.mode, minutes: String(setup.minutes) }
          : { track: setup.track, mode: setup.mode, laps: String(setup.laps) },
    });

  return (
    <Screen>
      <View style={styles.header}>
        <Wordmark />
        <Link href="/profile" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel="Profile">
            <Avatar />
          </Pressable>
        </Link>
      </View>

      <Card style={styles.quick}>
        <View style={styles.quickTop}>
          <Text style={label}>Quick start · last setup</Text>
          <Link href="/practice" style={styles.change}>
            Change ›
          </Link>
        </View>
        <Text style={styles.quickTitle}>
          {trackLabel(track)} ·{' '}
          {setup.lengthKind === 'time'
            ? `${setup.minutes} min`
            : `${setup.laps} ${setup.laps === 1 ? 'lap' : 'laps'}`}
        </Text>
        <View style={styles.quickStats}>
          <Stat title="Mode" value={MODE_SHORT[setup.mode]} />
          <Stat
            title="Personal best"
            value={best === undefined ? '—' : formatLapTime(best)}
            color={colors.green}
          />
          <Stat
            title="Last session"
            value={lastSession ? formatLapTime(lastSession.bestMs) : '—'}
            color={colors.purple}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={start}
          style={({ pressed }) => [styles.start, pressed && styles.pressed]}>
          <Text style={styles.startText}>START</Text>
        </Pressable>
      </Card>

      <SectionLabel right={<Text style={styles.small}>best lap · {MODE_SHORT[setup.mode]}</Text>}>
        Your tracks
      </SectionLabel>
      <View style={styles.tracks}>
        {TRACKS.map((t) => {
          const pb = bestLaps[recordKey(t.id, setup.mode)]?.ms;
          return (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={`${t.name}, ${t.size} by ${t.size}. Open in practice`}
              onPress={() => {
                updateSetup({ track: t.id });
                router.navigate('/practice');
              }}
              style={styles.trackCard}>
              <Text style={styles.trackSize}>
                {t.size}×{t.size}
              </Text>
              <Text style={styles.trackName} numberOfLines={1}>
                {t.name}
              </Text>
              <Text style={[styles.trackBest, tabular, pb === undefined && { color: colors.muted }]}>
                {pb === undefined ? '—' : formatLapTime(pb)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>Recent sessions</SectionLabel>
      <Card style={styles.list}>
        {recent.length === 0 ? (
          <Text style={styles.empty}>No sessions yet. Press START above to drive your first one.</Text>
        ) : (
          recent.slice(0, 3).map((s, i) => {
            const t = getTrack(s.track)!;
            const time = s.personalBest ? colors.green : colors.text;
            return (
              <View key={s.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>
                    {trackLabel(t)}
                    {s.mode === 'descending' ? ' · Countdown' : ''} · {s.lapsDriven}{' '}
                    {s.lapsDriven === 1 ? 'lap' : 'laps'}
                    {s.minutes ? ` in ${s.minutes} min` : ''}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {formatWhen(s.finishedAt)} · {s.mistakes === 1 ? '1 mistake' : `${s.mistakes} mistakes`}
                    {s.personalBest ? ' · PB' : ''}
                  </Text>
                </View>
                <Text style={[styles.rowTime, tabular, { color: time }]}>{formatLapTime(s.bestMs)}</Text>
              </View>
            );
          })
        )}
      </Card>

      <Link href="/rooms" asChild>
        <Pressable accessibilityRole="button" style={styles.roomCard}>
          <View style={styles.roomText}>
            <Text style={styles.roomTitle}>Private room</Text>
            <Text style={styles.roomMeta}>Race friends live with a room code</Text>
          </View>
          <Text style={styles.roomGo}>›</Text>
        </Pressable>
      </Link>

      <View style={styles.soon}>
        <Text style={styles.soonText}>
          <Text style={styles.soonStrong}>Daily race</Text> · same board for everyone
        </Text>
        <Text style={[label, styles.small]}>Soon</Text>
      </View>
    </Screen>
  );
}

function Stat({ title, value, color = colors.text }: { title: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[label, styles.statLabel]}>{title}</Text>
      <Text style={[styles.statValue, tabular, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quick: { marginTop: 22, padding: 18, gap: 12 },
  quickTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  change: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.muted },
  quickTitle: { fontFamily: fonts.heading, fontSize: 36, lineHeight: 40, color: colors.text },
  quickStats: { flexDirection: 'row', gap: 22 },
  stat: { gap: 2 },
  statLabel: { fontSize: 11, letterSpacing: 1.1 },
  statValue: { fontFamily: fonts.headingSemi, fontSize: 22, color: colors.text },
  start: {
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  startText: { fontFamily: fonts.heading, fontSize: 24, letterSpacing: 2, color: colors.white },
  small: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    textTransform: 'none',
    letterSpacing: 0,
  },
  tracks: { flexDirection: 'row', gap: 8 },
  trackCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 10,
  },
  trackSize: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 26, color: colors.text },
  trackName: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  trackBest: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.green, marginTop: 8 },
  list: { paddingHorizontal: 14 },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, paddingVertical: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  rowText: { flex: 1 },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  rowMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  rowTime: { fontFamily: fonts.heading, fontSize: 20 },
  roomCard: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  roomText: { flex: 1 },
  roomTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  roomMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  roomGo: { fontFamily: fonts.heading, fontSize: 28, color: colors.red },
  soon: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  soonText: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  soonStrong: { fontFamily: fonts.bodySemi, color: colors.text },
});
