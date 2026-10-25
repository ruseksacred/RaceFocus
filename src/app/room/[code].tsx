import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Board, StartLights } from '@/components/board';
import { LiveDelta } from '@/components/delta';
import { HelmetAvatar } from '@/components/helmet';
import { FlagBanner, type FlagKind } from '@/components/flag';
import {
  applyTap,
  formatClock,
  raceStandings,
  roomLength,
  createLap,
  elapsedMs,
  lapTimeMs,
  liveDeltaMs,
  WRONG_TAP_PENALTY_MS,
  formatDelta,
  formatLapTime,
  getTrack,
  helmetOf,
  lapSeed,
  lapTimesFromCrossings,
  MIN_PLAYERS,
  penaltyMs,
  trackLabel,
  type LapState,
  type RoomRules,
  type Standing,
} from '@/game';
import { describeError, useMessages, type Messages } from '@/i18n';
import { describeLength, seconds } from '@/labels';
import { goBack } from '@/navigation';
import { inviteUrl, shareInvite, type ShareOutcome } from '@/net/invite';
import { currentUid, serverNow } from '@/net/firebase';
import {
  armRetireOnDisconnect,
  backToLobby,
  driversOf,
  leaveRoom,
  markFinished,
  reportCrossing,
  reportMistakes,
  startRace,
  watchRoom,
  type Room,
} from '@/net/rooms';
import { buildRaceRecord } from '@/net/race-record';
import { useCareer } from '@/store/career';
import { recordKey, useRecords, type BestLap } from '@/store/records';
import { colors, fonts, label, tabular } from '@/theme';

const YELLOW_FLAG_MS = 2000;
/** Light timings before lights out, matching solo practice: three red, then green. */
const RED_STEP_MS = 700;
const GREEN_MS = 500;

export default function RoomScreen() {
  const m = useMessages();
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
        <Text style={styles.title}>{room === null ? m.room.closed : m.room.notIn}</Text>
        <Text style={[styles.body, styles.centerText]}>
          {room === null ? m.room.closedBody : m.room.notInBody}
        </Text>
        <Pressable onPress={goBack} accessibilityRole="button" style={styles.secondary}>
          <Text style={styles.secondaryText}>{m.common.back}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (room.status === 'lobby') return <Lobby code={code} room={room} uid={uid} />;
  return <RoomRace key={room.startAt} code={code} room={room} uid={uid} />;
}

function RulesLine({ rules }: { rules: RoomRules }) {
  const m = useMessages();
  const track = getTrack(rules.track)!;
  return (
    <Text style={styles.body}>
      {trackLabel(track)} · {m.modesShort[rules.mode]} · {describeLength(m, roomLength(rules))} ·{' '}
      {m.common.penaltyPerWrongTap(seconds(rules.penaltyMs))}
    </Text>
  );
}

function Lobby({ code, room, uid }: { code: string; room: Room; uid: string }) {
  const m = useMessages();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [shared, setShared] = useState<ShareOutcome | null>(null);
  const link = inviteUrl(code);
  const players = Object.entries(room.players ?? {}).sort((a, b) => a[1].joinedAt - b[1].joinedAt);
  const isHost = room.hostId === uid;
  const enough = players.length >= MIN_PLAYERS;

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      await startRace(code, room);
    } catch (e) {
      setError(describeError(m, e, 'startFailed'));
      setStarting(false);
    }
  };

  const leave = async () => {
    await leaveRoom(code, uid, room).catch(() => {});
    goBack();
  };

  const invite = async () => {
    const me = room.players?.[uid]?.name ?? '';
    setShared(await shareInvite(link, m.room.inviteTitle, m.room.inviteText(me, code)));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={leave} accessibilityRole="button" hitSlop={12}>
            <Text style={styles.exit}>{m.room.leave}</Text>
          </Pressable>
          <Text style={label}>{m.room.privateRoom}</Text>
        </View>

        <View style={styles.codeBox}>
          <Text style={label}>{m.room.roomCode}</Text>
          <Text
            style={[styles.code, tabular]}
            selectable
            accessibilityLabel={m.room.roomCodeA11y(code.split('').join(' '))}>
            {code}
          </Text>
          <Text style={[styles.body, styles.centerText]}>{m.room.shareBody}</Text>
          <Pressable
            onPress={invite}
            accessibilityRole="button"
            style={({ pressed }) => [styles.invite, pressed && styles.pressed]}>
            <Text style={styles.inviteText}>{m.room.invite}</Text>
          </Pressable>
          {shared === 'shared' && <Text style={styles.shareNote}>{m.room.inviteShared}</Text>}
          {shared === 'copied' && <Text style={styles.shareNote}>{m.room.inviteCopied}</Text>}
          {shared === 'failed' && (
            <Text style={[styles.body, styles.centerText]} selectable>
              {m.room.inviteFailed(link)}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={label}>{m.room.rules}</Text>
          <RulesLine rules={room.rules} />
        </View>

        <View style={styles.section}>
          <Text style={label}>{m.room.drivers(players.length, room.rules.maxPlayers)}</Text>
          <View style={styles.list}>
            {players.map(([id, p], i) => (
              <View key={id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <Text style={[styles.rowPos, tabular]}>{i + 1}</Text>
                <HelmetAvatar helmet={helmetOf(p.helmet, p.name)} size={36} />
                <Text style={styles.rowName} numberOfLines={1}>
                  {p.name}
                </Text>
                {id === room.hostId && <Text style={styles.tag}>{m.room.host}</Text>}
                {id === uid && <Text style={[styles.tag, styles.tagYou]}>{m.room.you}</Text>}
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
              <Text style={styles.primaryText}>{m.room.startRace}</Text>
            </Pressable>
            {!enough && <Text style={styles.hint}>{m.room.waitingForDriver}</Text>}
          </>
        ) : (
          <Text style={styles.hint}>{m.room.waitingForHost}</Text>
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
  /** This driver's fastest lap so far in this race. */
  raceBest: BestLap | null;
  /** Reference laps for the live delta, fixed when a lap starts. */
  refRace: number[] | null;
  refPersonal: number[] | null;
}

function RoomRace({ code, room, uid }: { code: string; room: Room; uid: string }) {
  const m = useMessages();
  const rules = room.rules;
  const track = getTrack(rules.track)!;
  const numbersPerLap = track.size * track.size;
  const seed = room.seed ?? 'race';
  const startAt = room.startAt ?? serverNow();
  const isHost = room.hostId === uid;

  const key = recordKey(rules.track, rules.mode);
  // Room laps count as personal bests unless the penalty is lighter than in solo practice.
  const lapsCountForRecords = rules.penaltyMs >= WRONG_TAP_PENALTY_MS;
  const submitLap = useRecords((state) => state.submitLap);

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
    raceBest: null,
    refRace: null,
    refPersonal: useRecords.getState().bestLaps[key]?.splits ?? null,
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
      const lapMs = lapTimeMs(outcome.state)!;
      const thisLap: BestLap = { ms: lapMs, splits: outcome.state.splits };
      if (lapsCountForRecords || outcome.state.mistakes === 0) submitLap(key, thisLap);
      const raceBest = d.raceBest === null || lapMs < d.raceBest.ms ? thisLap : d.raceBest;
      next = {
        ...next,
        raceBest,
        refRace: raceBest.splits,
        refPersonal: useRecords.getState().bestLaps[key]?.splits ?? null,
      };
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
    goBack();
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
      ? m.room.lapOf(lapNumber, rules.laps)
      : m.room.lapTimed(
          lapNumber,
          timeUp
            ? flagTime !== null
              ? m.room.lastLap
              : m.room.timeUp
            : m.room.left(formatClock(length.ms - raceTime)),
        );

  // This driver's current lap: its clock, and the live delta to their race best and personal best.
  const lapNow = started ? elapsedMs(driving.lap, raceReal - driving.lapStartReal) : 0;
  const liveRace = started ? liveDeltaMs(driving.lap.splits, driving.refRace, lapNow) : null;
  const livePersonal = started ? liveDeltaMs(driving.lap.splits, driving.refPersonal, lapNow) : null;

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
  const lightsText = green ? m.lights.go : lit === 0 ? m.lights.getReady : String(4 - lit);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            onPress={leave}
            accessibilityRole="button"
            accessibilityLabel={m.room.retireA11y}
            hitSlop={12}>
            <Text style={styles.exit}>{m.room.retire}</Text>
          </Pressable>
          <Text style={label}>
            {lapText} · {trackLabel(track)}
          </Text>
        </View>

        <FlagBanner flag={flag} penaltyMs={rules.penaltyMs} />

        <View style={styles.raceTop}>
          <View>
            <Text style={[label, styles.small]}>{m.room.position}</Text>
            <Text style={[styles.position, tabular]}>
              P{me.position}
              <Text style={styles.positionOf}> / {active.length}</Text>
            </Text>
          </View>
          <View style={styles.raceTimer}>
            <Text style={[label, styles.small]}>{m.room.raceTime}</Text>
            <Text style={[styles.timer, tabular]}>{formatLapTime(raceTime)}</Text>
          </View>
        </View>

        <View style={styles.deltas}>
          <View style={styles.gap}>
            <Text style={[label, styles.small]}>{m.room.lapTime}</Text>
            <Text style={[styles.lapTime, tabular]}>{formatLapTime(lapNow)}</Text>
          </View>
          <LiveDelta title={m.room.deltaRaceBest} delta={liveRace} reference={driving.refRace} />
          <LiveDelta title={m.room.deltaPersonalBest} delta={livePersonal} reference={driving.refPersonal} />
        </View>

        <View style={styles.gaps}>
          <Gap title={m.room.gapToP1} value={me.position === 1 ? m.common.leader : me.gapToLeader} />
          <Gap title={m.room.gapAhead} value={me.position === 1 ? '—' : me.gapToAhead} />
          <View style={styles.gap}>
            <Text style={[label, styles.small]}>{m.room.penalties}</Text>
            <Text style={[styles.gapValue, tabular, mistakes > 0 && { color: colors.yellow }]}>
              {mistakes === 0 ? '0' : `+${((mistakes * rules.penaltyMs) / 1000).toFixed(1)} s`}
            </Text>
          </View>
        </View>

        {started ? (
          <>
            <View style={styles.next}>
              <Text style={label}>{m.room.next}</Text>
              <Text style={[styles.nextValue, tabular]}>{driving.lap.targets[driving.lap.nextIndex]}</Text>
            </View>
            <Board lap={driving.lap} wrongValue={wrongValue} onTap={onTap} />
          </>
        ) : (
          <StartLights size={track.size} lit={lit} green={green} text={lightsText} />
        )}

        <LiveTable
          room={room}
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

function progressText(m: Messages, s: Standing, numbersPerLap: number, laps: number | null): string {
  if (s.retired) return m.room.retired;
  if (s.finished) return m.room.finished;
  return `L${s.lap}${laps === null ? '' : `/${laps}`} · ${s.cleared % numbersPerLap}/${numbersPerLap}`;
}

/** A driver's helmet in this room (their own design, or the default for their name). */
function helmetIn(room: Room, id: string, name: string) {
  return helmetOf(room.players?.[id]?.helmet, name);
}

function LiveTable({
  room,
  standings,
  uid,
  numbersPerLap,
  laps,
}: {
  room: Room;
  standings: Standing[];
  uid: string;
  numbersPerLap: number;
  laps: number | null;
}) {
  const m = useMessages();
  return (
    <View style={[styles.list, styles.liveTable]} accessibilityLabel={m.room.liveStandings}>
      {standings.map((s, i) => (
        <View key={s.id} style={[styles.liveRow, i > 0 && styles.rowBorder, s.id === uid && styles.meRow]}>
          <Text style={[styles.livePos, tabular]}>P{s.position}</Text>
          <HelmetAvatar helmet={helmetIn(room, s.id, s.name)} size={24} />
          <Text style={[styles.liveName, s.retired && styles.retired]} numberOfLines={1}>
            {s.name}
          </Text>
          <Text style={[styles.liveProgress, tabular]}>{progressText(m, s, numbersPerLap, laps)}</Text>
          <Text style={[styles.liveGap, tabular]}>
            {s.position === 1 ? m.common.leader : s.gapToLeader === null ? '—' : formatDelta(s.gapToLeader)}
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
  const m = useMessages();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <FlagBanner flag={allDone ? 'chequered' : me.retired ? null : 'chequered'} />
        <Text style={[label, styles.resultsMeta]}>
          {m.room.resultsMeta(
            code,
            trackLabel(getTrack(room.rules.track)!),
            describeLength(m, roomLength(room.rules)),
          )}
        </Text>
        <Text style={styles.title}>
          {me.retired ? m.room.youRetired : allDone ? m.room.youFinished(me.position) : m.room.othersRacing}
        </Text>

        <View style={[styles.list, styles.resultsTable]}>
          <View style={[styles.resultRow, styles.resultHead]}>
            <Text style={[styles.resPos, styles.headText]}>{m.room.pos}</Text>
            <Text style={[styles.resName, styles.headText]}>{m.room.driver}</Text>
            <Text style={[styles.resTime, styles.headText]}>{m.room.time}</Text>
            <Text style={[styles.resBest, styles.headText]}>{m.room.bestLap}</Text>
          </View>
          {standings.map((s) => {
            const best = bestById.get(s.id) ?? null;
            const gap =
              s.finished && winner && s.id !== winner.id && s.lapsDown === 0
                ? s.totalMs! - winner.totalMs!
                : null;
            const behind = s.lapsDown > 0 ? m.common.lapsDown(s.lapsDown) : null;
            return (
              <View key={s.id} style={[styles.resultRow, styles.rowBorder, s.id === uid && styles.meRow]}>
                <Text style={[styles.resPos, tabular]}>{s.retired ? 'DNF' : `P${s.position}`}</Text>
                <HelmetAvatar helmet={helmetIn(room, s.id, s.name)} size={32} />
                <View style={styles.resName}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={styles.resMeta}>{m.common.mistakes(s.mistakes)}</Text>
                </View>
                <View style={styles.resTime}>
                  <Text style={[styles.resValue, tabular]}>
                    {s.finished ? formatLapTime(s.totalMs!) : s.retired ? '—' : `L${s.lap}`}
                  </Text>
                  <Text style={[styles.resMeta, tabular]}>
                    {behind ??
                      (gap !== null
                        ? formatDelta(gap)
                        : s.finished
                          ? m.common.winner
                          : s.retired
                            ? ''
                            : m.room.racing)}
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
        <Text style={styles.legend}>{m.room.fastestLegend}</Text>

        <View style={styles.section}>
          <Text style={label}>{m.room.yourRace}</Text>
          <View style={styles.myStats}>
            <MyStat title={m.room.bestLap} value={myLaps.length ? formatLapTime(Math.min(...myLaps)) : '—'} />
            <MyStat title={m.room.accuracy} value={`${Math.round(accuracy * 100)}%`} />
            <MyStat title={m.room.mistakes} value={String(me.mistakes)} />
            <MyStat
              title={m.room.rating}
              value={rating ? `${Math.round(rating.value)}` : '…'}
              note={
                rating
                  ? `${rating.change >= 0 ? '+' : '−'}${Math.abs(rating.change)} · ${m.room.beta}`
                  : m.room.afterFinish
              }
              noteColor={rating ? (rating.change >= 0 ? colors.green : colors.red) : colors.muted}
            />
          </View>
          {myLaps.length > 0 && (
            <Text style={[styles.body, tabular]}>
              {myLaps.length <= 10
                ? // Non-breaking spaces keep each "L3 00:01.44" on one line.
                  myLaps.map((ms, i) => `L${i + 1}\u00A0${formatLapTime(ms)}`).join('   ')
                : m.room.lapsAverage(
                    myLaps.length,
                    formatLapTime(myLaps.reduce((a, b) => a + b, 0) / myLaps.length),
                  )}
            </Text>
          )}
        </View>

        {isHost && (allDone || room.status === 'finished') && (
          <Pressable
            onPress={() => backToLobby(code, room).catch(() => {})}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>{m.room.newRace}</Text>
          </Pressable>
        )}
        {!isHost && allDone && <Text style={styles.hint}>{m.room.hostCanRestart}</Text>}
        <Pressable onPress={onLeave} accessibilityRole="button" style={styles.secondary}>
          <Text style={styles.secondaryText}>{m.room.leaveRoom}</Text>
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
  invite: {
    marginTop: 8,
    alignSelf: 'stretch',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteText: { fontFamily: fonts.heading, fontSize: 20, letterSpacing: 1.5, color: colors.text },
  shareNote: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.green, textAlign: 'center' },
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
  deltas: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 6 },
  lapTime: { fontFamily: fonts.heading, fontSize: 26, color: colors.text },
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
