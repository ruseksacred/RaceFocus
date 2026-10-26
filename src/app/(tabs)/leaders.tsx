import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { HelmetAvatar } from '@/components/helmet';
import { Card, Screen, ui } from '@/components/ui';
import {
  boardKey,
  formatDelta,
  formatLapTime,
  helmetOf,
  MODES,
  rankEntries,
  SOLO_LAPS_COUNT_FOR_RECORDS,
  testEntries,
  TRACKS,
  type Mode,
  type RankedEntry,
  type TrackId,
} from '@/game';
import { useMessages } from '@/i18n';
import { useAccount } from '@/net/account';
import { currentUid, firebaseConfigured } from '@/net/firebase';
import { LEADERBOARD_SIZE, watchBoard, type BoardView } from '@/net/leaderboard';
import { usePractice } from '@/store/practice';
import { useSettings } from '@/store/settings';
import { colors, fonts, label, tabular } from '@/theme';

type Status = 'loading' | 'ready' | 'offline';

const EMPTY: BoardView = { top: [], mine: null };

/** Track records from online races: a podium for the top three, then the list. */
export default function Leaders() {
  const m = useMessages();
  const [track, setTrack] = useState<TrackId>(() => usePractice.getState().setup.track);
  const [mode, setMode] = useState<Mode>('ascending');
  const key = boardKey(track, mode);
  // The last data received, tagged with its board so a switch shows "loading" until new data comes.
  const [board, setBoard] = useState<{ key: string; view: BoardView; status: Status } | null>(null);
  const testData = useSettings((state) => state.testData);
  const setTestData = useSettings((state) => state.setTestData);
  const isGuest = useAccount((state) => state.isGuest);
  const uid = currentUid();

  useEffect(() => {
    if (!firebaseConfigured) return;
    const boardId = boardKey(track, mode);
    return watchBoard(
      track,
      mode,
      (view) => setBoard({ key: boardId, view, status: 'ready' }),
      () => setBoard({ key: boardId, view: EMPTY, status: 'offline' }),
    );
  }, [track, mode]);
  const current =
    board?.key === key
      ? board
      : { view: EMPTY, status: (firebaseConfigured ? 'loading' : 'offline') as Status };
  const { view, status } = current;

  const ranked = useMemo(
    () => rankEntries([...view.top, ...(testData ? testEntries(track, mode) : [])]).slice(0, LEADERBOARD_SIZE),
    [view.top, testData, track, mode],
  );
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const mineShown = ranked.some((e) => e.id === uid);

  return (
    <Screen>
      <Text style={label}>{m.leaders.label}</Text>
      <Text style={ui.title}>{m.leaders.title}</Text>
      <Text style={[ui.body, styles.intro]}>{m.leaders.intro(SOLO_LAPS_COUNT_FOR_RECORDS)}</Text>

      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={m.leaders.track}>
        {TRACKS.map((t) => (
          <Chip
            key={t.id}
            text={`${t.size}×${t.size}`}
            sub={t.name}
            selected={t.id === track}
            onPress={() => setTrack(t.id)}
          />
        ))}
      </View>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={m.leaders.mode}>
        {MODES.map((x) => (
          <Chip key={x} text={m.modesShort[x]} selected={x === mode} onPress={() => setMode(x)} wide />
        ))}
      </View>

      <View style={styles.testRow}>
        <View style={styles.testText}>
          <Text style={styles.testTitle}>{m.leaders.testData}</Text>
          <Text style={styles.note}>{m.leaders.testNote}</Text>
        </View>
        <Switch
          value={testData}
          onValueChange={setTestData}
          accessibilityLabel={m.leaders.testData}
          trackColor={{ false: colors.line, true: colors.red }}
          thumbColor={colors.white}
          {...(Platform.OS === 'web' ? { activeThumbColor: colors.white } : {})}
        />
      </View>

      {status === 'loading' && ranked.length === 0 ? (
        <ActivityIndicator color={colors.text} style={styles.loading} />
      ) : ranked.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={ui.body}>{status === 'offline' ? m.errors.noServer : m.leaders.empty}</Text>
        </Card>
      ) : (
        <>
          <Podium entries={podium} uid={uid} />
          {rest.length > 0 && (
            <Card style={styles.list}>
              {rest.map((entry, i) => (
                <Row key={entry.id} entry={entry} me={entry.id === uid} border={i > 0} />
              ))}
            </Card>
          )}
          {status === 'offline' && <Text style={styles.warning}>{m.errors.noServer}</Text>}
        </>
      )}

      {isGuest ? (
        <Text style={styles.footer}>{m.leaders.guestNote}</Text>
      ) : (
        !mineShown &&
        status === 'ready' && (
          <Card style={styles.mine}>
            <Text style={[label, styles.small]}>{m.leaders.yourRecord}</Text>
            <Text style={[styles.mineTime, tabular]}>
              {view.mine ? formatLapTime(view.mine.ms) : m.leaders.noRecord}
            </Text>
          </Card>
        )
      )}
      <Text style={styles.footer}>{m.leaders.beta}</Text>
    </Screen>
  );
}

/** P2 on the left, P1 in the middle and highest, P3 on the right. */
function Podium({ entries, uid }: { entries: RankedEntry[]; uid: string | null }) {
  const order = [entries[1], entries[0], entries[2]];
  return (
    <View style={styles.podium}>
      {order.map((entry, i) =>
        entry ? <Step key={entry.id} entry={entry} me={entry.id === uid} /> : <View key={i} style={styles.step} />,
      )}
    </View>
  );
}

const STEP_HEIGHT = { 1: 92, 2: 68, 3: 52 } as const;

function Step({ entry, me }: { entry: RankedEntry; me: boolean }) {
  const m = useMessages();
  const first = entry.position === 1;
  const time = formatLapTime(entry.ms);
  return (
    <View
      style={styles.step}
      accessible
      accessibilityLabel={m.leaders.leaderA11y(entry.position, entry.name, time)}>
      <HelmetAvatar helmet={helmetOf(entry.helmet, entry.name)} size={first ? 60 : 46} />
      <Text style={[styles.stepName, me && styles.meText]} numberOfLines={1}>
        {entry.name}
      </Text>
      {entry.test && <Text style={styles.testTag}>{m.leaders.testTag}</Text>}
      <Text style={[styles.stepTime, tabular, first && styles.fastest]}>{time}</Text>
      {!first && <Text style={[styles.gap, tabular]}>{formatDelta(entry.gap)}</Text>}
      <View
        style={[
          styles.block,
          { height: STEP_HEIGHT[entry.position as 1 | 2 | 3] },
          first && styles.blockFirst,
          me && styles.blockMe,
        ]}>
        <Text style={styles.blockNumber}>{entry.position}</Text>
      </View>
    </View>
  );
}

function Row({ entry, me, border }: { entry: RankedEntry; me: boolean; border: boolean }) {
  const m = useMessages();
  return (
    <View style={[styles.row, border && styles.rowBorder, me && styles.meRow]}>
      <Text style={[styles.pos, tabular]}>{entry.position}</Text>
      <HelmetAvatar helmet={helmetOf(entry.helmet, entry.name)} size={30} />
      <View style={styles.nameCol}>
        <Text style={[styles.name, me && styles.meText]} numberOfLines={1}>
          {entry.name}
        </Text>
        {(entry.test || me) && (
          <Text style={entry.test ? styles.testTag : styles.youTag}>
            {entry.test ? m.leaders.testTag : m.leaders.you}
          </Text>
        )}
      </View>
      <View style={styles.timeCol}>
        <Text style={[styles.time, tabular]}>{formatLapTime(entry.ms)}</Text>
        <Text style={[styles.gap, tabular]}>{formatDelta(entry.gap)}</Text>
      </View>
    </View>
  );
}

function Chip({
  text,
  sub,
  selected,
  onPress,
  wide,
}: {
  text: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
  wide?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={sub ? `${text} ${sub}` : text}
      style={[styles.chip, wide && styles.chipWide, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{text}</Text>
      {sub && <Text style={styles.chipSub}>{sub}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: 4 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 14 },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  chipWide: { paddingVertical: 10 },
  chipSelected: { backgroundColor: colors.surface2, borderColor: colors.red },
  chipText: { fontFamily: fonts.heading, fontSize: 18, color: colors.muted },
  chipTextSelected: { color: colors.text },
  chipSub: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  testText: { flex: 1, gap: 2 },
  testTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: colors.muted },
  loading: { marginTop: 40 },
  emptyCard: { marginTop: 20, padding: 16 },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 22 },
  step: { flex: 1, alignItems: 'center', gap: 3 },
  stepName: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text, maxWidth: '100%', marginTop: 4 },
  stepTime: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  fastest: { color: colors.purple },
  block: {
    alignSelf: 'stretch',
    marginTop: 6,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockFirst: { borderColor: colors.red, borderTopWidth: 3 },
  blockMe: { backgroundColor: colors.surface },
  blockNumber: { fontFamily: fonts.heading, fontSize: 34, color: colors.text },
  list: { paddingHorizontal: 12, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  meRow: { backgroundColor: colors.surface2, marginHorizontal: -12, paddingHorizontal: 12 },
  pos: { width: 26, fontFamily: fonts.heading, fontSize: 18, color: colors.muted, textAlign: 'right' },
  nameCol: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  meText: { color: colors.green },
  testTag: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.muted,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  youTag: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.green,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  timeCol: { alignItems: 'flex-end' },
  time: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  gap: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  warning: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.yellow, marginTop: 10, textAlign: 'center' },
  mine: { marginTop: 14, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  small: { fontSize: 11 },
  mineTime: { fontFamily: fonts.heading, fontSize: 22, color: colors.text },
  footer: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 14, textAlign: 'center' },
});
