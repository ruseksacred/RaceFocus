import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Board, StartLights } from '@/components/board';
import { FlagBanner, type FlagKind } from '@/components/flag';
import {
  applyTap,
  describeLength,
  formatClock,
  raceStandings,
  roomLength,
  createLap,
  formatDelta,
  formatLapTime,
  getTrack,
  lapSeed,
  lapTimesFromCrossings,
  MIN_PLAYERS,
  penaltyMs,
  trackLabel,
  type LapState,
  type RoomRules,
  type Standing,
} from '@/game';
import { MODE_SHORT } from '@/labels';
import { currentUid, serverNow } from '@/net/firebase';
import {
  armRetireOnDisconnect,
  backToLobby,
  driversOf,
  leaveRoom,
  markFinished,
  reportCrossing,
  reportMistakes,
  RoomError,
  startRace,
  watchRoom,
  type Room,
} from '@/net/rooms';
import { buildRaceRecord } from '@/net/race-record';
import { useCareer } from '@/store/career';
import { colors, fonts, label, tabular } from '@/theme';

const YELLOW_FLAG_MS = 2000;
/** Light timings before lights out, matching solo practice: three red, then green. */
const RED_STEP_MS = 700;
const GREEN_MS = 500;

export default function RoomScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const uid = currentUid();

  useEffect(() => watchRoom(code, setRoom), [code]);

  if (room === undefined) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator color={colors.text} />
      </SafeAreaView>
    );
  }
  if (room === null || !uid || !room.players?.[uid]) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Text style={styles.title}>{room === null ? 'Room closed' : 'Not in this room'}</Text>
        <Text style={[styles.body, styles.centerText]}>
          {room === null ? 'The host closed this room.' : 'Join with the room code from the Race tab.'}
        </Text>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.secondary}>
          <Text style={styles.secondaryText}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (room.status === 'lobby') return <Lobby code={code} room={room} uid={uid} />;
  return <RoomRace key={room.startAt} code={code} room={room} uid={uid} />;
}

function RulesLine({ rules }: { rules: RoomRules }) {
  const track = getTrack(rules.track)!;
  return (
    <Text style={styles.body}>
      {trackLabel(track)} · {MODE_SHORT[rules.mode]} · {describeLength(roomLength(rules))} · +
      {rules.penaltyMs / 1000} s per wrong tap
    </Text>
  );
}

function Lobby({ code, room, uid }: { code: string; room: Room; uid: string }) {
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const players = Object.entries(room.players ?? {}).sort((a, b) => a[1].joinedAt - b[1].joinedAt);
  const isHost = room.hostId === uid;
  const enough = players.length >= MIN_PLAYERS;

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      await startRace(code, room);
    } catch (e) {
      setError(e instanceof RoomError ? e.message : 'Could not start the race. Try again.');
      setStarting(false);
    }
  };

  const leave = async () => {
    await leaveRoom(code, uid, room).catch(() => {});
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={leave} accessibilityRole="button" hitSlop={12}>
            <Text style={styles.exit}>‹ Leave</Text>
          </Pressable>
          <Text style={label}>Private room</Text>
        </View>

        <View style={styles.codeBox}>
          <Text style={label}>Room code</Text>
          <Text
            style={[styles.code, tabular]}
            selectable
            accessibilityLabel={`Room code ${code.split('').join(' ')}`}>
            {code}
          </Text>
          <Text style={styles.body}>Share this code with your friends. They join from the Race tab.</Text>
        </View>

        <View style={styles.section}>
          <Text style={label}>Rules</Text>
          <RulesLine rules={room.rules} />
        </View>

        <View style={styles.section}>
          <Text style={label}>
            Drivers {players.length} / {room.rules.maxPlayers}
          </Text>
          <View style={styles.list}>
            {players.map(([id, p], i) => (
              <View key={id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <Text style={[styles.rowPos, tabular]}>{i + 1}</Text>
                <Text style={styles.rowName} numberOfLines={1}>
                  {p.name}
                </Text>
                {id === room.hostId && <Text style={styles.tag}>Host</Text>}
                {id === uid && <Text style={[styles.tag, styles.tagYou]}>You</Text>}
              </View>
            ))}
          </View>
        </View>

        {isHost ? (
          <>
            <Pressable
              onPress={start}
              disabled={!enough || starting}
              accessibilityRole="button"
              accessibilityState={{ disabled: !enough || starting }}
              style={({ pressed }) => [
                styles.primary,
                (!enough || starting) && styles.disabled,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.primaryText}>START RACE</Text>
            </Pressable>
            {!enough && <Text style={styles.hint}>Waiting for at least one more driver.</Text>}
          </>
        ) : (
          <Text style={styles.hint}>Waiting for the host to start the race…</Text>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

interface Driving {
  lapIndex: number;
  lap: LapState;
  /** Race time (no penalties) when this lap started. */
  lapStartReal: number;
  /** Penalties from earlier laps. */
  prevPenaltyMs: number;
  prevMistakes: number;
  crossings: number[];
  finished: boolean;
}

function RoomRace({ code, room, uid }: { code: string; room: Room; uid: string }) {
  const rules = room.rules;
  const track = getTrack(rules.track)!;
  const numbersPerLap = track.size * track.size;
  const seed = room.seed ?? 'race';
  const startAt = room.startAt ?? serverNow();
  const isHost = room.hostId === uid;

  const newLap = (index: number) =>
    createLap({ size: track.size, seed: lapSeed(seed, index), mode: rules.mode, penaltyMs: rules.penaltyMs });

  const [driving, setDriving] = useState<Driving>(() => ({
    lapIndex: 0,
    lap: newLap(0),
    lapStartReal: 0,
    prevPenaltyMs: 0,
    prevMistakes: 0,
    crossings: [],
    finished: false,
  }));
  const drivingRef = useRef(driving);
  const [now, setNow] = useState(() => serverNow());
  const [wrongValue, setWrongValue] = useState<number | null>(null);
  const [yellowAt, setYellowAt] = useState<number | null>(null);

  // A lost connection from here on marks the driver as retired.
  useEffect(() => {
    if (room.status === 'racing') armRetireOnDisconnect(code, uid).catch(() => {});
  }, [code, uid, room.status]);

  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), 31);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (wrongValue === null) return;
    const id = setTimeout(() => setWrongValue(null), 250);
    return () => clearTimeout(id);
  }, [wrongValue]);

  useEffect(() => {
    if (yellowAt === null) return;
    const id = setTimeout(() => setYellowAt(null), YELLOW_FLAG_MS);
    return () => clearTimeout(id);
  }, [yellowAt]);

  const raceReal = now - startAt;
  const started = raceReal >= 0;

  // Standings use the server data for everyone, with this driver's own taps applied right away.
  const drivers = driversOf(room).map((d) => (d.id === uid ? { ...d, crossings: driving.crossings } : d));
  const length = roomLength(rules);
  const { standings, flagTime } = raceStandings(
    drivers,
    numbersPerLap,
    length,
    started ? raceReal : undefined,
  );
  const me = standings.find((s) => s.id === uid)!;
  // Timed races: this driver may be finished by the leader's flag even before their own check below.
  const done = driving.finished || me.finished;
  const active = standings.filter((s) => !s.retired);
  const allDone = active.length > 0 && active.every((s) => s.finished);

  // The host closes the race once every driver still in it has finished.
  useEffect(() => {
    if (isHost && room.status === 'racing' && allDone) markFinished(code).catch(() => {});
  }, [isHost, room.status, allDone, code]);

  const onTap = (value: number) => {
    const d = drivingRef.current;
    if (d.finished) return;
    const real = serverNow() - startAt;
    if (real < 0) return;
    const outcome = applyTap(d.lap, { value, at: real - d.lapStartReal });
    let next: Driving = { ...d, lap: outcome.state };

    if (outcome.result === 'wrong') {
      setWrongValue(value);
      setYellowAt(real);
      reportMistakes(code, uid, d.prevMistakes + outcome.state.mistakes).catch(() => {});
    }
    if (outcome.result === 'correct' || outcome.result === 'finished') {
      const crossing = real + d.prevPenaltyMs + penaltyMs(outcome.state);
      const index = d.lapIndex * numbersPerLap + outcome.state.nextIndex - 1;
      next = { ...next, crossings: [...d.crossings, crossing] };
      reportCrossing(code, uid, index, crossing).catch(() => {});
    }
    if (outcome.result === 'finished') {
      // Lap race: the set number of laps. Timed race: this lap ended after the chequered flag.
      const withMine = driversOf(room).map((x) => (x.id === uid ? { ...x, crossings: next.crossings } : x));
      const lastLap =
        length.kind === 'laps'
          ? d.lapIndex + 1 >= rules.laps
          : !!raceStandings(withMine, numbersPerLap, length).standings.find((s) => s.id === uid)?.finished;
      next = lastLap
        ? { ...next, finished: true }
        : {
            ...next,
            lapIndex: d.lapIndex + 1,
            // No pause between laps: the next lap starts at this tap.
            lap: newLap(d.lapIndex + 1),
            lapStartReal: real,
            prevPenaltyMs: d.prevPenaltyMs + penaltyMs(outcome.state),
            prevMistakes: d.prevMistakes + outcome.state.mistakes,
          };
    }
    drivingRef.current = next;
    setDriving(next);
  };

  // Once everyone still racing has finished, this driver's race goes into their career (with Elo).
  const addRace = useCareer((state) => state.addRace);
  const raceId = `${code}:${room.startAt ?? 0}`;
  const savedRace = useCareer((state) => state.history.find((r) => r.id === raceId));
  const rating = useCareer((state) => state.rating);
  const raceClosed = done && (allDone || room.status === 'finished');
  useEffect(() => {
    if (raceClosed) addRace(buildRaceRecord(code, room, uid, standings));
  }, [raceClosed, room, code, uid, standings, addRace]);

  const leave = async () => {
    // Leaving mid-race counts as a retirement.
    if (room.status === 'racing' && !done) addRace(buildRaceRecord(code, room, uid, standings, true));
    await leaveRoom(code, uid, room).catch(() => {});
    router.back();
  };

  const mistakes = driving.prevMistakes + driving.lap.mistakes;
  const raceTime = done
    ? (me.totalMs ?? driving.crossings.at(-1) ?? 0)
    : Math.max(0, raceReal) + driving.prevPenaltyMs + penaltyMs(driving.lap);
  const lapNumber =
    length.kind === 'laps' ? Math.min(driving.lapIndex + 1, rules.laps) : driving.lapIndex + 1;
  const timeUp = length.kind === 'time' && raceTime >= length.ms;
  const lapText =
    length.kind === 'laps'
      ? `Lap ${lapNumber} / ${rules.laps}`
      : `Lap ${lapNumber} · ${timeUp ? (flagTime !== null ? 'Last lap' : 'Time up') : `${formatClock(length.ms - raceTime)} left`}`;

  let flag: FlagKind | null = null;
  if (done) flag = 'chequered';
  else if (yellowAt !== null) flag = 'yellow';
  else if (length.kind === 'laps' ? lapNumber === rules.laps : timeUp || flagTime !== null) flag = 'white';

  if (done || me.retired) {
    return (
      <Results
        code={code}
        room={room}
        uid={uid}
        standings={standings}
        numbersPerLap={numbersPerLap}
        allDone={allDone}
        rating={savedRace ? { value: rating, change: savedRace.ratingDelta } : null}
        onLeave={leave}
      />
    );
  }

  // Lights: three red one by one, then green, then go at startAt.
  const toGo = -raceReal;
  const green = toGo > 0 && toGo <= GREEN_MS;
  const lit = green
    ? 3
    : Math.max(0, Math.min(3, Math.ceil((GREEN_MS + 3 * RED_STEP_MS - toGo) / RED_STEP_MS)));
  const lightsText = green ? 'GO' : lit === 0 ? 'Get ready' : String(4 - lit);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            onPress={leave}
            accessibilityRole="button"
            accessibilityLabel="Retire and leave"
            hitSlop={12}>
            <Text style={styles.exit}>‹ Retire</Text>
          </Pressable>
          <Text style={label}>
            {lapText} · {trackLabel(track)}
          </Text>
        </View>

        <FlagBanner flag={flag} />

        <View style={styles.raceTop}>
          <View>
            <Text style={[label, styles.small]}>Position</Text>
            <Text style={[styles.position, tabular]}>
              P{me.position}
              <Text style={styles.positionOf}> / {active.length}</Text>
            </Text>
          </View>
          <View style={styles.raceTimer}>
            <Text style={[label, styles.small]}>Race time</Text>
            <Text style={[styles.timer, tabular]}>{formatLapTime(raceTime)}</Text>
          </View>
        </View>

        <View style={styles.gaps}>
          <Gap title="Gap to P1" value={me.position === 1 ? 'Leader' : me.gapToLeader} />
          <Gap title="Gap ahead" value={me.position === 1 ? '—' : me.gapToAhead} />
          <View style={styles.gap}>
            <Text style={[label, styles.small]}>Penalties</Text>
            <Text style={[styles.gapValue, tabular, mistakes > 0 && { color: colors.yellow }]}>
              {mistakes === 0 ? '0' : `+${((mistakes * rules.penaltyMs) / 1000).toFixed(1)} s`}
            </Text>
          </View>
        </View>

        {started ? (
          <>
            <View style={styles.next}>
              <Text style={label}>Next</Text>
              <Text style={[styles.nextValue, tabular]}>{driving.lap.targets[driving.lap.nextIndex]}</Text>
            </View>
            <Board lap={driving.lap} wrongValue={wrongValue} onTap={onTap} />
          </>
        ) : (
          <StartLights size={track.size} lit={lit} green={green} text={lightsText} />
        )}

        <LiveTable
          standings={standings}
          uid={uid}
          numbersPerLap={numbersPerLap}
          laps={length.kind === 'laps' ? rules.laps : null}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Gap({ title, value }: { title: string; value: number | null | string }) {
  const text = typeof value === 'string' ? value : value === null ? '—' : formatDelta(value);
  return (
    <View style={styles.gap}>
      <Text style={[label, styles.small]}>{title}</Text>
      <Text
        style={[styles.gapValue, tabular, typeof value === 'number' && value > 0 && { color: colors.red }]}>
        {text}
      </Text>
    </View>
  );
}

function progressText(s: Standing, numbersPerLap: number, laps: number | null): string {
  if (s.retired) return 'Retired';
  if (s.finished) return 'Finished';
  return `L${s.lap}${laps === null ? '' : `/${laps}`} · ${s.cleared % numbersPerLap}/${numbersPerLap}`;
}

function LiveTable({
  standings,
  uid,
  numbersPerLap,
  laps,
}: {
  standings: Standing[];
  uid: string;
  numbersPerLap: number;
  laps: number | null;
}) {
  return (
    <View style={[styles.list, styles.liveTable]} accessibilityLabel="Live standings">
      {standings.map((s, i) => (
        <View key={s.id} style={[styles.liveRow, i > 0 && styles.rowBorder, s.id === uid && styles.meRow]}>
          <Text style={[styles.livePos, tabular]}>P{s.position}</Text>
          <Text style={[styles.liveName, s.retired && styles.retired]} numberOfLines={1}>
            {s.name}
          </Text>
          <Text style={[styles.liveProgress, tabular]}>{progressText(s, numbersPerLap, laps)}</Text>
          <Text style={[styles.liveGap, tabular]}>
            {s.position === 1 ? 'Leader' : s.gapToLeader === null ? '—' : formatDelta(s.gapToLeader)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Results({
  code,
  room,
  uid,
  standings,
  numbersPerLap,
  allDone,
  rating,
  onLeave,
}: {
  code: string;
  room: Room;
  uid: string;
  standings: Standing[];
  numbersPerLap: number;
  allDone: boolean;
  rating: { value: number; change: number } | null;
  onLeave: () => void;
}) {
  const drivers = driversOf(room);
  const lapsById = new Map(drivers.map((d) => [d.id, lapTimesFromCrossings(d.crossings, numbersPerLap)]));
  const bestById = new Map([...lapsById].map(([id, laps]) => [id, laps.length ? Math.min(...laps) : null]));
  const fastest = Math.min(...[...bestById.values()].filter((v): v is number => v !== null));
  const winner = standings.find((s) => s.finished);
  const me = standings.find((s) => s.id === uid)!;
  const myLaps = lapsById.get(uid) ?? [];
  const accuracy = me.cleared + me.mistakes === 0 ? 1 : me.cleared / (me.cleared + me.mistakes);
  const isHost = room.hostId === uid;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <FlagBanner flag={allDone ? 'chequered' : me.retired ? null : 'chequered'} />
        <Text style={[label, styles.resultsMeta]}>
          Room {code} · {trackLabel(getTrack(room.rules.track)!)} · {describeLength(roomLength(room.rules))}
        </Text>
        <Text style={styles.title}>
          {me.retired
            ? 'You retired'
            : allDone
              ? `You finished P${me.position}`
              : 'Finished · others still racing'}
        </Text>

        <View style={[styles.list, styles.resultsTable]}>
          <View style={[styles.resultRow, styles.resultHead]}>
            <Text style={[styles.resPos, styles.headText]}>Pos</Text>
            <Text style={[styles.resName, styles.headText]}>Driver</Text>
            <Text style={[styles.resTime, styles.headText]}>Time</Text>
            <Text style={[styles.resBest, styles.headText]}>Best lap</Text>
          </View>
          {standings.map((s) => {
            const best = bestById.get(s.id) ?? null;
            const gap =
              s.finished && winner && s.id !== winner.id && s.lapsDown === 0
                ? s.totalMs! - winner.totalMs!
                : null;
            const behind = s.lapsDown > 0 ? `+${s.lapsDown} ${s.lapsDown === 1 ? 'lap' : 'laps'}` : null;
            return (
              <View key={s.id} style={[styles.resultRow, styles.rowBorder, s.id === uid && styles.meRow]}>
                <Text style={[styles.resPos, tabular]}>{s.retired ? 'DNF' : `P${s.position}`}</Text>
                <View style={styles.resName}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={styles.resMeta}>
                    {s.mistakes} {s.mistakes === 1 ? 'mistake' : 'mistakes'}
                  </Text>
                </View>
                <View style={styles.resTime}>
                  <Text style={[styles.resValue, tabular]}>
                    {s.finished ? formatLapTime(s.totalMs!) : s.retired ? '—' : `L${s.lap}`}
                  </Text>
                  <Text style={[styles.resMeta, tabular]}>
                    {behind ??
                      (gap !== null ? formatDelta(gap) : s.finished ? 'Winner' : s.retired ? '' : 'racing')}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.resBest,
                    styles.resValue,
                    tabular,
                    best !== null && best === fastest && styles.fastest,
                  ]}>
                  {best === null ? '—' : formatLapTime(best)}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.legend}>Purple: fastest lap of the race.</Text>

        <View style={styles.section}>
          <Text style={label}>Your race</Text>
          <View style={styles.myStats}>
            <MyStat title="Best lap" value={myLaps.length ? formatLapTime(Math.min(...myLaps)) : '—'} />
            <MyStat title="Accuracy" value={`${Math.round(accuracy * 100)}%`} />
            <MyStat title="Mistakes" value={String(me.mistakes)} />
            <MyStat
              title="Rating"
              value={rating ? `${Math.round(rating.value)}` : '…'}
              note={
                rating
                  ? `${rating.change >= 0 ? '+' : '−'}${Math.abs(rating.change)} · beta`
                  : 'after the finish'
              }
              noteColor={rating ? (rating.change >= 0 ? colors.green : colors.red) : colors.muted}
            />
          </View>
          {myLaps.length > 0 && (
            <Text style={[styles.body, tabular]}>
              {myLaps.length <= 10
                ? // Non-breaking spaces keep each "L3 00:01.44" on one line.
                  myLaps.map((ms, i) => `L${i + 1}\u00A0${formatLapTime(ms)}`).join('   ')
                : `${myLaps.length} laps · average ${formatLapTime(myLaps.reduce((a, b) => a + b, 0) / myLaps.length)}`}
            </Text>
          )}
        </View>

        {isHost && (allDone || room.status === 'finished') && (
          <Pressable
            onPress={() => backToLobby(code, room).catch(() => {})}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>NEW RACE</Text>
          </Pressable>
        )}
        {!isHost && allDone && <Text style={styles.hint}>The host can start a new race in this room.</Text>}
        <Pressable onPress={onLeave} accessibilityRole="button" style={styles.secondary}>
          <Text style={styles.secondaryText}>Leave room</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function MyStat({
  title,
  value,
  note,
  noteColor = colors.muted,
}: {
  title: string;
  value: string;
  note?: string;
  noteColor?: string;
}) {
  return (
    <View style={styles.gap}>
      <Text style={[label, styles.small]}>{title}</Text>
      <Text style={[styles.gapValue, tabular, { color: colors.text }]}>{value}</Text>
      {note && <Text style={[styles.resMeta, tabular, { color: noteColor }]}>{note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.carbon },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  centerText: { textAlign: 'center' },
  content: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exit: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.muted },
  title: { fontFamily: fonts.heading, fontSize: 34, lineHeight: 38, color: colors.text, marginTop: 4 },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted },
  small: { fontSize: 11 },
  section: { marginTop: 20, gap: 8 },
  codeBox: {
    marginTop: 20,
    padding: 18,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    gap: 6,
  },
  code: { fontFamily: fonts.heading, fontSize: 64, lineHeight: 70, letterSpacing: 10, color: colors.text },
  list: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  rowPos: { fontFamily: fonts.heading, fontSize: 18, color: colors.muted, width: 22 },
  rowName: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  tag: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.muted,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  tagYou: { color: colors.text, borderColor: colors.red },
  primary: {
    marginTop: 20,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontFamily: fonts.heading, fontSize: 24, letterSpacing: 1.5, color: colors.white },
  secondary: {
    marginTop: 10,
    height: 48,
    alignSelf: 'stretch',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  secondaryText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
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
  raceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  position: { fontFamily: fonts.heading, fontSize: 56, lineHeight: 60, color: colors.text },
  positionOf: { fontSize: 26, color: colors.muted },
  raceTimer: { alignItems: 'flex-end' },
  timer: { fontFamily: fonts.heading, fontSize: 48, lineHeight: 54, color: colors.text },
  gaps: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  gap: { gap: 1 },
  gapValue: { fontFamily: fonts.heading, fontSize: 24, color: colors.muted },
  next: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: 12, marginTop: 6 },
  nextValue: { fontFamily: fonts.heading, fontSize: 44, lineHeight: 48, color: colors.red, minWidth: 50 },
  liveTable: { marginTop: 14 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  meRow: { backgroundColor: colors.surface2 },
  livePos: { fontFamily: fonts.heading, fontSize: 18, color: colors.text, width: 32 },
  liveName: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  retired: { color: colors.muted, textDecorationLine: 'line-through' },
  liveProgress: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  liveGap: { fontFamily: fonts.heading, fontSize: 18, color: colors.muted, width: 64, textAlign: 'right' },
  resultsMeta: { marginTop: 16 },
  resultsTable: { marginTop: 16 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resultHead: { paddingVertical: 8 },
  headText: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.muted, textTransform: 'uppercase' },
  resPos: { width: 36, fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  resName: { flex: 1 },
  resTime: { width: 84, alignItems: 'flex-end' },
  resBest: { width: 72, textAlign: 'right' },
  resValue: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  resMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  fastest: { color: colors.purple },
  legend: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 8 },
  myStats: { flexDirection: 'row', justifyContent: 'space-between' },
});
