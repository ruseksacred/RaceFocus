import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Board, StartLights } from '@/components/board';
import { DeltaBar } from '@/components/delta';
import { FlagBanner, type FlagKind } from '@/components/flag';
import { HelmetAvatar } from '@/components/helmet';
import { StandingsGrid } from '@/components/standings-grid';
import { feedback } from '@/feedback';
import {
  applyTap,
  botsAt,
  createLap,
  elapsedMs,
  formatClock,
  formatDelta,
  formatLapTime,
  getTrack,
  helmetOf,
  lapSeed,
  lapTimeMs,
  lapTimesFromCrossings,
  liveDeltaMs,
  makeBots,
  penaltyMs,
  raceStandings,
  randomSeed,
  roomLength,
  trackLabel,
  WRONG_TAP_PENALTY_MS,
  type Bot,
  type LapState,
  type Standing,
} from '@/game';
import { useMessages } from '@/i18n';
import { describeLength } from '@/labels';
import { goBack } from '@/navigation';
import { useBotSetup, type BotSetup } from '@/store/bots';
import { useProfile } from '@/store/profile';
import { recordKey, useRecords, type BestLap } from '@/store/records';
import { colors, fonts, label, tabular } from '@/theme';

const ME = 'me';
const YELLOW_FLAG_MS = 2000;
/** Light timings, as in rooms: three red one by one, then green, then go. */
const RED_STEP_MS = 700;
const GREEN_MS = 500;
/** From opening the screen to lights out. */
const START_DELAY_MS = 3600;

/** The race clock: a steady millisecond timer, unaffected by changes to the phone's clock. */
const clock = () => performance.now();

/** Offline race against bots, with the setup from the bot setup screen. */
export default function BotRaceScreen() {
  // Each run gets a new key, so "Race again" starts from a clean state with new boards and bots.
  const [run, setRun] = useState(0);
  return <BotRace key={run} onRestart={() => setRun((r) => r + 1)} />;
}

interface Driving {
  lapIndex: number;
  lap: LapState;
  /** Race time (no penalties) when this lap started. */
  lapStartReal: number;
  prevPenaltyMs: number;
  prevMistakes: number;
  crossings: number[];
  finished: boolean;
  raceBest: BestLap | null;
  refRace: number[] | null;
}

function BotRace({ onRestart }: { onRestart: () => void }) {
  const m = useMessages();
  // The setup is read once: changing it mid-race must not change the race.
  const [setup] = useState<BotSetup>(() => useBotSetup.getState().setup);
  const [seed] = useState(() => randomSeed());
  const track = getTrack(setup.track)!;
  const numbersPerLap = track.size * track.size;
  const length = roomLength({ ...setup, maxPlayers: setup.bots + 1 });
  const key = recordKey(setup.track, setup.mode);
  const nick = useProfile((state) => state.nick);
  const myHelmet = useProfile((state) => state.helmet);
  const myName = nick || m.room.you;

  const bots = useMemo<Bot[]>(
    () =>
      makeBots(
        seed,
        setup.bots,
        setup.level,
        track.size,
        length,
        setup.penaltyMs,
        useRecords.getState().bestLaps[key]?.ms,
      ),
    // Made once per race.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const helmets = useMemo(() => {
    const map: Record<string, string | undefined> = { [ME]: myHelmet ?? undefined };
    for (const bot of bots) map[bot.id] = bot.helmet;
    return map;
  }, [bots, myHelmet]);

  const newLap = (index: number) =>
    createLap({ size: track.size, seed: lapSeed(seed, index), mode: setup.mode, penaltyMs: setup.penaltyMs });

  const [startAt] = useState(() => clock() + START_DELAY_MS);
  const [now, setNow] = useState(() => clock());
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
  }));
  const drivingRef = useRef(driving);
  const [wrongValue, setWrongValue] = useState<number | null>(null);
  const [yellowAt, setYellowAt] = useState<number | null>(null);
  const submitLap = useRecords((state) => state.submitLap);

  useEffect(() => {
    const id = setInterval(() => setNow(clock()), 31);
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
  const me = { id: ME, name: myName, crossings: driving.crossings, mistakes: driving.prevMistakes + driving.lap.mistakes };
  const drivers = [me, ...botsAt(bots, Math.max(0, raceReal))];
  const { standings, flagTime } = raceStandings(drivers, numbersPerLap, length, started ? raceReal : undefined);
  const mine = standings.find((s) => s.id === ME)!;
  const done = driving.finished || mine.finished;
  const allDone = standings.every((s) => s.finished);

  const onTap = (value: number) => {
    const d = drivingRef.current;
    if (d.finished) return;
    const real = clock() - startAt;
    if (real < 0) return;
    const outcome = applyTap(d.lap, { value, at: real - d.lapStartReal });
    let next: Driving = { ...d, lap: outcome.state };

    if (outcome.result === 'wrong') {
      setWrongValue(value);
      setYellowAt(real);
      feedback('wrong');
    }
    if (outcome.result === 'correct') feedback('tap');
    if (outcome.result === 'correct' || outcome.result === 'finished') {
      next = { ...next, crossings: [...d.crossings, real + d.prevPenaltyMs + penaltyMs(outcome.state)] };
    }
    if (outcome.result === 'finished') {
      const lapMs = lapTimeMs(outcome.state)!;
      const thisLap: BestLap = { ms: lapMs, splits: outcome.state.splits };
      // Same rule as rooms: a lighter penalty than solo's does not set personal bests.
      if (setup.penaltyMs >= WRONG_TAP_PENALTY_MS || outcome.state.mistakes === 0) submitLap(key, thisLap);
      const raceBest = d.raceBest === null || lapMs < d.raceBest.ms ? thisLap : d.raceBest;
      const withMine = [{ ...me, crossings: next.crossings }, ...botsAt(bots, real)];
      const lastLap =
        length.kind === 'laps'
          ? d.lapIndex + 1 >= setup.laps
          : !!raceStandings(withMine, numbersPerLap, length).standings.find((s) => s.id === ME)?.finished;
      feedback(lastLap ? 'finish' : d.raceBest !== null && lapMs < d.raceBest.ms ? 'best' : 'lap');
      next = lastLap
        ? { ...next, finished: true, raceBest }
        : {
            ...next,
            raceBest,
            refRace: raceBest.splits,
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

  // Lights: three red one by one, then green, then go.
  const toGo = -raceReal;
  const green = toGo > 0 && toGo <= GREEN_MS;
  const lit = green ? 3 : Math.max(0, Math.min(3, Math.ceil((GREEN_MS + 3 * RED_STEP_MS - toGo) / RED_STEP_MS)));
  const lightSignal = started ? 'racing' : green ? 'green' : `red${lit}`;
  useEffect(() => {
    if (lightSignal === 'green') feedback('go');
    else if (lightSignal !== 'racing' && lightSignal !== 'red0') feedback('light');
  }, [lightSignal]);

  if (done) {
    return (
      <BotResults
        setup={setup}
        bots={bots}
        myCrossings={driving.crossings}
        standings={standings}
        helmets={helmets}
        allDone={allDone}
        onRestart={onRestart}
      />
    );
  }

  const mistakes = driving.prevMistakes + driving.lap.mistakes;
  const raceTime = Math.max(0, raceReal) + driving.prevPenaltyMs + penaltyMs(driving.lap);
  const lapNumber = length.kind === 'laps' ? Math.min(driving.lapIndex + 1, setup.laps) : driving.lapIndex + 1;
  const timeUp = length.kind === 'time' && raceTime >= length.ms;
  const lapText =
    length.kind === 'laps'
      ? m.room.lapOf(lapNumber, setup.laps)
      : m.room.lapTimed(
          lapNumber,
          timeUp ? (flagTime !== null ? m.room.lastLap : m.room.timeUp) : m.room.left(formatClock(length.ms - raceTime)),
        );
  let flag: FlagKind | null = null;
  if (yellowAt !== null) flag = 'yellow';
  else if (length.kind === 'laps' ? lapNumber === setup.laps : timeUp || flagTime !== null) flag = 'white';

  const lapNow = started ? elapsedMs(driving.lap, raceReal - driving.lapStartReal) : 0;
  const liveRace = started ? liveDeltaMs(driving.lap.splits, driving.refRace, lapNow) : null;
  const lightsText = green ? m.lights.go : lit === 0 ? m.lights.getReady : String(4 - lit);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel={m.bots.retireA11y} hitSlop={12}>
            <Text style={styles.exit}>{m.bots.retire}</Text>
          </Pressable>
          <Text style={label}>
            {lapText} · {trackLabel(track)}
          </Text>
        </View>

        <FlagBanner flag={flag} penaltyMs={setup.penaltyMs} />

        <View style={styles.raceTop}>
          <Text style={[styles.position, tabular]}>
            P{mine.position}
            <Text style={styles.positionOf}> / {standings.length}</Text>
          </Text>
          <Text style={[styles.timer, tabular]}>{formatLapTime(raceTime)}</Text>
        </View>

        <DeltaBar
          title={m.room.deltaRaceBar}
          delta={liveRace}
          reference={driving.refRace}
          noLap={m.practice.noLapYet}
        />

        <View style={styles.stats}>
          <Stat title={m.room.lapTime} value={formatLapTime(lapNow)} />
          <Stat
            title={m.room.gapToP1}
            value={mine.position === 1 ? m.common.leader : mine.gapToLeader === null ? '—' : formatDelta(mine.gapToLeader)}
            color={mine.position === 1 ? colors.text : colors.red}
          />
          <Stat
            title={m.room.gapAhead}
            value={mine.position === 1 || mine.gapToAhead === null ? '—' : formatDelta(mine.gapToAhead)}
            color={mine.position === 1 ? colors.muted : colors.red}
          />
          <Stat
            title={m.room.penalties}
            value={mistakes === 0 ? '0' : `+${((mistakes * setup.penaltyMs) / 1000).toFixed(1)} s`}
            color={mistakes > 0 ? colors.yellow : colors.text}
          />
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

        <StandingsGrid standings={standings} helmets={helmets} meId={ME} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ title, value, color = colors.text }: { title: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[label, styles.small]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.statValue, tabular, { color }]}>{value}</Text>
    </View>
  );
}

/** Finishing order; keeps updating while bots are still on track. */
function BotResults({
  setup,
  bots,
  myCrossings,
  standings,
  helmets,
  allDone,
  onRestart,
}: {
  setup: BotSetup;
  bots: readonly Bot[];
  myCrossings: number[];
  standings: Standing[];
  helmets: Record<string, string | undefined>;
  allDone: boolean;
  onRestart: () => void;
}) {
  const m = useMessages();
  const track = getTrack(setup.track)!;
  const numbersPerLap = track.size * track.size;
  const length = roomLength({ ...setup, maxPlayers: setup.bots + 1 });
  const crossingsById = new Map<string, number[]>([[ME, myCrossings], ...bots.map((b) => [b.id, b.crossings] as const)]);
  const bestById = new Map(
    standings.map((s) => {
      const laps = lapTimesFromCrossings((crossingsById.get(s.id) ?? []).slice(0, s.cleared), numbersPerLap);
      return [s.id, laps.length ? Math.min(...laps) : null] as const;
    }),
  );
  const fastest = Math.min(...[...bestById.values()].filter((v): v is number => v !== null));
  const winner = standings.find((s) => s.finished && s.position === 1);
  const mine = standings.find((s) => s.id === ME)!;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <FlagBanner flag="chequered" />
        <Text style={[label, styles.resultsMeta]}>
          {m.bots.resultsMeta(trackLabel(track), describeLength(m, length), m.bots.levels[setup.level])}
        </Text>
        <Text style={styles.title}>{allDone ? m.room.youFinished(mine.position) : m.room.othersRacing}</Text>

        <View style={styles.table}>
          {standings.map((s, i) => {
            const best = bestById.get(s.id) ?? null;
            const gap =
              s.finished && winner && s.id !== winner.id && s.lapsDown === 0 ? s.totalMs! - winner.totalMs! : null;
            return (
              <View key={s.id} style={[styles.row, i > 0 && styles.rowBorder, s.id === ME && styles.meRow]}>
                <Text style={[styles.rowPos, tabular]}>P{s.position}</Text>
                <HelmetAvatar helmet={helmetOf(helmets[s.id], s.name)} size={28} />
                <View style={styles.rowName}>
                  <Text style={[styles.name, s.id === ME && styles.meName]} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text style={styles.meta}>
                    {s.id === ME ? m.room.you : m.bots.bot} · {m.common.mistakes(s.mistakes)}
                  </Text>
                </View>
                <View style={styles.rowTime}>
                  <Text style={[styles.value, tabular]}>
                    {s.finished ? formatLapTime(s.totalMs!) : `L${s.lap}`}
                  </Text>
                  <Text style={[styles.meta, tabular]}>
                    {s.lapsDown > 0
                      ? m.common.lapsDown(s.lapsDown)
                      : gap !== null
                        ? formatDelta(gap)
                        : s.finished
                          ? m.common.winner
                          : m.room.racing}
                  </Text>
                </View>
                <Text style={[styles.best, tabular, best !== null && best === fastest && styles.fastest]}>
                  {best === null ? '—' : formatLapTime(best)}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.legend}>{m.room.fastestLegend}</Text>

        <Pressable
          onPress={onRestart}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
          <Text style={styles.primaryText}>{m.bots.raceAgain}</Text>
        </Pressable>
        <Pressable onPress={goBack} accessibilityRole="button" style={styles.secondary}>
          <Text style={styles.secondaryText}>{m.bots.changeSetup}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.carbon },
  content: { padding: 20, paddingTop: 12, paddingBottom: 24, maxWidth: 480, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exit: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.muted },
  raceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 },
  position: { fontFamily: fonts.heading, fontSize: 36, lineHeight: 40, color: colors.text },
  positionOf: { fontSize: 20, color: colors.muted },
  timer: { fontFamily: fonts.heading, fontSize: 36, lineHeight: 40, color: colors.text },
  stats: { flexDirection: 'row', gap: 6, marginTop: 8 },
  stat: { flex: 1, minWidth: 0, gap: 1 },
  small: { fontSize: 10, letterSpacing: 0.8 },
  statValue: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  next: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: 12, marginTop: 2, marginBottom: 2 },
  nextValue: { fontFamily: fonts.heading, fontSize: 32, lineHeight: 36, color: colors.red },
  resultsMeta: { marginTop: 12 },
  title: { fontFamily: fonts.heading, fontSize: 34, lineHeight: 38, color: colors.text, marginTop: 4 },
  table: {
    marginTop: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  meRow: { backgroundColor: colors.surface2 },
  rowPos: { width: 30, fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  rowName: { flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  meName: { color: colors.green },
  meta: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  rowTime: { alignItems: 'flex-end' },
  value: { fontFamily: fonts.heading, fontSize: 16, color: colors.text },
  best: { width: 64, textAlign: 'right', fontFamily: fonts.heading, fontSize: 15, color: colors.muted },
  fastest: { color: colors.purple },
  legend: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 8 },
  primary: {
    marginTop: 20,
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  primaryText: { fontFamily: fonts.heading, fontSize: 22, letterSpacing: 1.5, color: colors.white },
  secondary: {
    marginTop: 10,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
});
