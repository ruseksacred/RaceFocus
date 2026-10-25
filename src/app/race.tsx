import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Board, StartLights } from '@/components/board';
import { FlagBanner, type FlagKind } from '@/components/flag';
import {
  addLap,
  applyTap,
  createLap,
  createSession,
  currentLapNumber,
  deltaMs,
  elapsedMs,
  formatClock,
  formatDelta,
  formatLapTime,
  getTrack,
  isComplete,
  isFinalLap,
  lapTimeMs,
  liveDeltaMs,
  MODES,
  nextTarget,
  lapsLength,
  MINUTE_MS,
  parseLapCount,
  parseMinutes,
  randomSeed,
  timeLeft,
  timeLength,
  type RaceLength,
  sessionBest,
  sessionBestIndex,
  totalTime,
  type LapState,
  type Mode,
  type Session,
  type Track,
} from '@/game';
import { MODE_SHORT } from '@/labels';
import { usePractice } from '@/store/practice';
import { recordKey, useRecords } from '@/store/records';
import { colors, fonts, label, tabular } from '@/theme';

/**
 * countdown → green → running → finish → summary.
 * Lights only before the first lap: three red, then all green, then the clock starts. Each next lap starts the instant the previous
 * one ends, with no pause, like a real race.
 */
type Phase = 'countdown' | 'green' | 'running' | 'finish' | 'summary';

/** Reference laps for the live delta, fixed when a lap starts. */
interface References {
  session: number[] | null;
  personal: number[] | null;
}

interface LapResult {
  lapMs: number;
  deltaSession: number | null;
  deltaPersonal: number | null;
  personalBest: boolean;
  sessionBest: boolean;
  firstLap: boolean;
}

const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 700;
/** How long all lights stay green before the board appears and the clock starts. */
const GREEN_MS = 500;
const FINISH_MS = 2600;
const YELLOW_FLAG_MS = 2000;
const DEFAULT_LAPS = 5;

export default function RaceScreen() {
  const params = useLocalSearchParams<{ track?: string; mode?: string; laps?: string; minutes?: string }>();
  const track = getTrack(params.track ?? '') ?? getTrack('circuit')!;
  const mode: Mode = MODES.includes(params.mode as Mode) ? (params.mode as Mode) : 'ascending';
  const minutes = parseMinutes(params.minutes ?? '');
  const length =
    minutes !== null ? timeLength(minutes) : lapsLength(parseLapCount(params.laps ?? '') ?? DEFAULT_LAPS);
  return <Race track={track} mode={mode} length={length} />;
}

function Race({ track, mode, length }: { track: Track; mode: Mode; length: RaceLength }) {
  const key = recordKey(track.id, mode);
  const personalBest = useRecords((state) => state.bestLaps[key] ?? null);
  const submitLap = useRecords((state) => state.submitLap);

  const [session, setSession] = useState<Session>(() => createSession(length));
  const [lap, setLap] = useState<LapState>(() => newLap(track, mode));
  const [refs, setRefs] = useState<References>({ session: null, personal: null });
  const [phase, setPhase] = useState<Phase>('countdown');
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [now, setNow] = useState(0);
  const [wrongValue, setWrongValue] = useState<number | null>(null);
  const [yellowAt, setYellowAt] = useState<number | null>(null);
  const [result, setResult] = useState<LapResult | null>(null);

  const lapRef = useRef(lap);
  const sessionRef = useRef(session);
  /** Set when any lap of this session was a personal best. */
  const personalBestRef = useRef(false);
  const loggedRef = useRef<Session | null>(null);
  const addSession = usePractice((state) => state.addSession);
  const startRef = useRef(0);

  /** Starts a lap whose clock began at `startTime` (a performance.now() value). */
  const startLap = useCallback(
    (startTime: number) => {
      const current = sessionRef.current;
      const best = useRecords.getState().bestLaps[key];
      setRefs({ session: sessionBest(current)?.splits ?? null, personal: best?.splits ?? null });
      const fresh = newLap(track, mode);
      lapRef.current = fresh;
      setLap(fresh);
      startRef.current = startTime;
      setNow(Math.max(0, performance.now() - startTime));
      setPhase('running');
    },
    [key, track, mode],
  );

  // Lights before the first lap.
  useEffect(() => {
    if (phase !== 'countdown') return;
    const id = setTimeout(() => {
      if (countdown > 1) setCountdown(countdown - 1);
      else setPhase('green');
    }, COUNTDOWN_STEP_MS);
    return () => clearTimeout(id);
  }, [phase, countdown]);

  // All lights green, then go.
  useEffect(() => {
    if (phase !== 'green') return;
    const id = setTimeout(() => startLap(performance.now()), GREEN_MS);
    return () => clearTimeout(id);
  }, [phase, startLap]);

  // Running clock.
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => setNow(performance.now() - startRef.current), 31);
    return () => clearInterval(id);
  }, [phase]);

  // Chequered flag, then the results.
  useEffect(() => {
    if (phase !== 'finish') return;
    const id = setTimeout(() => setPhase('summary'), FINISH_MS);
    return () => clearTimeout(id);
  }, [phase]);

  // Log the session for Home and Stats once it reaches the summary.
  useEffect(() => {
    if (phase !== 'summary' || session.laps.length === 0 || loggedRef.current === session) return;
    loggedRef.current = session;
    const best = sessionBest(session)!;
    addSession({
      id: `${Date.now()}`,
      track: track.id,
      mode,
      lapsDriven: session.laps.length,
      targetLaps: session.length.kind === 'laps' ? session.length.laps : session.laps.length,
      minutes: session.length.kind === 'time' ? session.length.ms / MINUTE_MS : undefined,
      bestMs: best.ms,
      totalMs: totalTime(session),
      mistakes: session.laps.reduce((sum, l) => sum + l.mistakes, 0),
      personalBest: personalBestRef.current,
      finishedAt: Date.now(),
    });
  }, [phase, session, track.id, mode, addSession]);

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

  const onTap = useCallback(
    (value: number) => {
      if (phase !== 'running') return;
      const at = performance.now() - startRef.current;
      const outcome = applyTap(lapRef.current, { value, at });
      lapRef.current = outcome.state;
      setLap(outcome.state);

      if (outcome.result === 'wrong') {
        setWrongValue(value);
        setYellowAt(at);
      }
      if (outcome.result === 'finished') {
        const lapMs = lapTimeMs(outcome.state)!;
        const previous = sessionRef.current;
        const previousBest = sessionBest(previous);
        const previousPersonal = useRecords.getState().bestLaps[key] ?? null;
        const isPersonalBest = submitLap(key, { ms: lapMs, splits: outcome.state.splits });
        if (isPersonalBest) personalBestRef.current = true;
        const updated = addLap(previous, {
          ms: lapMs,
          splits: outcome.state.splits,
          mistakes: outcome.state.mistakes,
        });
        sessionRef.current = updated;
        setSession(updated);
        setResult({
          lapMs,
          deltaSession: deltaMs(lapMs, previousBest?.ms),
          deltaPersonal: deltaMs(lapMs, previousPersonal?.ms),
          personalBest: isPersonalBest,
          sessionBest: previousBest === null || lapMs < previousBest.ms,
          firstLap: previousBest === null,
        });
        if (isComplete(updated)) {
          setNow(at);
          setPhase('finish');
        } else {
          // No pause: the next lap's clock starts at the exact moment this one ended.
          startLap(startRef.current + at);
        }
      }
    },
    [phase, key, submitLap, startLap],
  );

  const restart = () => {
    const fresh = createSession(length);
    sessionRef.current = fresh;
    personalBestRef.current = false;
    setSession(fresh);
    setResult(null);
    setYellowAt(null);
    setWrongValue(null);
    setCountdown(COUNTDOWN_FROM);
    setPhase('countdown');
  };

  const endOrExit = () => {
    if (session.laps.length > 0) setPhase('summary');
    else router.back();
  };

  if (phase === 'summary') {
    return (
      <SafeAreaView style={styles.safe}>
        <Summary
          session={session}
          track={track}
          mode={mode}
          personalBestMs={personalBest?.ms ?? null}
          onRestart={restart}
        />
      </SafeAreaView>
    );
  }

  // At the finish the session already holds the lap just driven.
  const lapNumber = phase === 'finish' ? session.laps.length : currentLapNumber(session);
  const beforeStart = phase === 'countdown' || phase === 'green';
  const time = beforeStart ? 0 : elapsedMs(lap, now);
  const total = lap.targets.length;
  const target = nextTarget(lap);

  // Race clock: laps run back to back, so it is the finished laps plus the lap being driven.
  const raceNow = totalTime(session) + (phase === 'running' ? time : 0);
  const left = timeLeft(session, raceNow);
  const lapText =
    length.kind === 'laps'
      ? `Lap ${lapNumber} / ${length.laps}`
      : `Lap ${lapNumber} · ${left === null || left > 0 ? `${formatClock(left ?? 0)} left` : 'Time up'}`;

  const liveSession = beforeStart ? null : liveDeltaMs(lap.splits, refs.session, time);
  const livePersonal = beforeStart ? null : liveDeltaMs(lap.splits, refs.personal, time);

  let flag: FlagKind | null = null;
  if (phase === 'finish') flag = 'chequered';
  else if (yellowAt !== null && phase === 'running') flag = 'yellow';
  else if (isFinalLap(session, raceNow)) flag = 'white';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable
            onPress={endOrExit}
            accessibilityRole="button"
            accessibilityLabel={session.laps.length > 0 ? 'End session' : 'Exit to menu'}
            hitSlop={12}>
            <Text style={styles.exit}>{session.laps.length > 0 ? '‹ End' : '‹ Exit'}</Text>
          </Pressable>
          <Text style={label}>
            {lapText} · {track.size}×{track.size} {track.name}
          </Text>
        </View>

        <FlagBanner flag={flag} />

        <Text style={[styles.timer, tabular]} accessibilityLabel={`Lap time ${formatLapTime(time)}`}>
          {formatLapTime(time)}
        </Text>

        <View style={styles.stats}>
          <Delta title="Δ session best" delta={liveSession} reference={refs.session} />
          <Delta title="Δ personal best" delta={livePersonal} reference={refs.personal} />
          <View style={styles.stat}>
            <Text style={[label, styles.statLabel]}>Penalties</Text>
            <Text style={[styles.statValue, tabular, lap.mistakes > 0 && { color: colors.yellow }]}>
              {lap.mistakes === 0 ? '0' : `+${lap.mistakes}.0 s`}
            </Text>
          </View>
        </View>

        {phase === 'finish' && result ? (
          <LapCard result={result} lapNumber={lapNumber} footer="Session complete" />
        ) : (
          <>
            <LastLap result={phase === 'running' ? result : null} lapNumber={session.laps.length} />
            <View style={styles.next}>
              <Text style={label}>Next</Text>
              <Text style={[styles.nextValue, tabular]}>{beforeStart ? '–' : target}</Text>
            </View>

            {beforeStart ? (
              <StartLights
                size={track.size}
                lit={COUNTDOWN_FROM - countdown + 1}
                green={phase === 'green'}
                text={phase === 'green' ? 'GO' : String(countdown)}
              />
            ) : (
              <Board lap={lap} wrongValue={wrongValue} onTap={onTap} />
            )}

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${(lap.nextIndex / total) * 100}%` }]} />
            </View>
            <View style={styles.progressRow}>
              <Text style={[styles.small, tabular]}>
                {lap.nextIndex} / {total}
              </Text>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function newLap(track: Track, mode: Mode) {
  return createLap({ size: track.size, seed: randomSeed(), mode });
}

/** Green when faster than the reference, red when slower. */
function deltaColor(delta: number | null) {
  if (delta === null || delta === 0) return colors.muted;
  return delta < 0 ? colors.green : colors.red;
}

function Delta({
  title,
  delta,
  reference,
}: {
  title: string;
  delta: number | null;
  reference: number[] | null;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[label, styles.statLabel]}>{title}</Text>
      <Text style={[styles.statValue, tabular, { color: deltaColor(delta) }]}>
        {delta === null ? (reference ? '±0.00' : '—') : formatDelta(delta)}
      </Text>
      <Text style={[styles.statCaption, tabular]}>
        {reference ? formatLapTime(reference.at(-1)!) : 'no lap yet'}
      </Text>
    </View>
  );
}

/** Result of the previous lap, shown while the next one is already running. Keeps its height when empty. */
function LastLap({ result, lapNumber }: { result: LapResult | null; lapNumber: number }) {
  if (result === null) return <View style={styles.lastLap} />;
  const timeColor = result.personalBest ? colors.green : result.sessionBest ? colors.purple : colors.text;
  const tag = result.personalBest ? 'PB' : result.sessionBest && !result.firstLap ? 'Session best' : null;
  return (
    <View style={[styles.lastLap, styles.lastLapFilled]} accessibilityLiveRegion="polite">
      <Text style={[label, styles.statLabel]}>L{lapNumber}</Text>
      <Text style={[styles.lastLapTime, tabular, { color: timeColor }]}>{formatLapTime(result.lapMs)}</Text>
      {result.deltaSession !== null && (
        <Text style={[styles.lastLapDelta, tabular, { color: deltaColor(result.deltaSession) }]}>
          {formatDelta(result.deltaSession)}
        </Text>
      )}
      {tag && <Text style={[label, styles.statLabel, { color: timeColor }]}>{tag}</Text>}
    </View>
  );
}

function LapCard({ result, lapNumber, footer }: { result: LapResult; lapNumber: number; footer: string }) {
  const timeColor = result.personalBest ? colors.green : result.sessionBest ? colors.purple : colors.text;
  const badge = result.personalBest
    ? { text: result.deltaPersonal === null ? 'First lap set' : 'Personal best', color: colors.green }
    : result.sessionBest && !result.firstLap
      ? { text: 'Session best', color: colors.purple }
      : null;

  return (
    <View style={styles.result}>
      <Text style={label}>Lap {lapNumber}</Text>
      <Text style={[styles.resultTime, tabular, { color: timeColor }]}>{formatLapTime(result.lapMs)}</Text>
      {badge && <Text style={[label, { color: badge.color }]}>{badge.text}</Text>}
      <View style={styles.resultRow}>
        <ResultDelta title="Δ session best" delta={result.deltaSession} />
        <ResultDelta title="Δ personal best" delta={result.deltaPersonal} />
      </View>
      <Text style={styles.footer}>{footer}</Text>
    </View>
  );
}

function ResultDelta({ title, delta }: { title: string; delta: number | null }) {
  return (
    <View style={styles.stat}>
      <Text style={[label, styles.statLabel]}>{title}</Text>
      <Text style={[styles.statValue, tabular, { color: deltaColor(delta) }]}>
        {delta === null ? '—' : formatDelta(delta)}
      </Text>
    </View>
  );
}

function Summary({
  session,
  track,
  mode,
  personalBestMs,
  onRestart,
}: {
  session: Session;
  track: Track;
  mode: Mode;
  personalBestMs: number | null;
  onRestart: () => void;
}) {
  const best = sessionBest(session);
  const bestIndex = sessionBestIndex(session);
  const complete = isComplete(session);
  const mistakes = session.laps.reduce((sum, l) => sum + l.mistakes, 0);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {complete && <FlagBanner flag="chequered" />}
      <Text style={[label, styles.summaryMeta]}>
        {track.size}×{track.size} {track.name} · {MODE_SHORT[mode]}
      </Text>
      <Text style={styles.summaryTitle}>{complete ? 'Session complete' : 'Session ended'}</Text>

      <View style={styles.summaryStats}>
        <SummaryStat
          title="Laps"
          value={
            session.length.kind === 'laps'
              ? `${session.laps.length} / ${session.length.laps}`
              : `${session.laps.length} in ${Math.round(session.length.ms / MINUTE_MS)} min`
          }
        />
        <SummaryStat title="Total" value={formatLapTime(totalTime(session))} />
        <SummaryStat title="Best lap" value={best ? formatLapTime(best.ms) : '—'} color={colors.purple} />
        <SummaryStat
          title="Mistakes"
          value={`${mistakes}`}
          color={mistakes > 0 ? colors.yellow : colors.text}
        />
      </View>

      <View style={styles.lapList}>
        {session.laps.map((l, i) => {
          const isBest = i === bestIndex;
          const isPersonal = personalBestMs !== null && l.ms === personalBestMs;
          return (
            <View key={i} style={[styles.lapRow, i > 0 && styles.lapRowBorder]}>
              <Text style={[styles.lapIndex, tabular]}>L{i + 1}</Text>
              <Text
                style={[
                  styles.lapTime,
                  tabular,
                  isBest && { color: colors.purple },
                  isPersonal && { color: colors.green },
                ]}>
                {formatLapTime(l.ms)}
              </Text>
              <Text style={[styles.lapMistakes, tabular]}>{l.mistakes > 0 ? `${l.mistakes}×` : ''}</Text>
              <Text style={[styles.lapDelta, tabular, isBest && { color: colors.purple }]}>
                {isBest ? 'Best' : best ? formatDelta(l.ms - best.ms) : ''}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.legend}>
        Purple: fastest lap of this session. Green: personal best. Yellow: wrong taps in the lap.
      </Text>

      <Pressable
        onPress={onRestart}
        accessibilityRole="button"
        style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}>
        <Text style={styles.primaryText}>RACE AGAIN</Text>
      </Pressable>
      <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.secondary}>
        <Text style={styles.secondaryText}>Back to menu</Text>
      </Pressable>
    </ScrollView>
  );
}

function SummaryStat({
  title,
  value,
  color = colors.text,
}: {
  title: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.summaryStat}>
      <Text style={[label, styles.statLabel]}>{title}</Text>
      <Text style={[styles.statValue, tabular, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.carbon },
  content: { flexGrow: 1, padding: 24, paddingTop: 16, maxWidth: 480, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exit: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.muted },
  timer: {
    fontFamily: fonts.heading,
    fontSize: 72,
    lineHeight: 80,
    color: colors.text,
    textAlign: 'center',
    marginTop: 4,
  },
  stats: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  stat: { alignItems: 'center', gap: 1, minWidth: 96 },
  statLabel: { fontSize: 11, letterSpacing: 1.1 },
  statValue: { fontFamily: fonts.heading, fontSize: 26, color: colors.muted },
  statCaption: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  next: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: 12, marginTop: 6 },
  nextValue: { fontFamily: fonts.heading, fontSize: 52, lineHeight: 56, color: colors.red, minWidth: 60 },
  progressTrack: {
    marginTop: 14,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.red },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  small: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  result: {
    marginTop: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  lastLap: {
    height: 34,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  lastLapFilled: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  lastLapTime: { fontFamily: fonts.heading, fontSize: 22 },
  lastLapDelta: { fontFamily: fonts.heading, fontSize: 20 },
  resultTime: { fontFamily: fonts.heading, fontSize: 56, lineHeight: 62, color: colors.text },
  resultRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 8 },
  footer: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted, marginTop: 12 },
  primary: {
    alignSelf: 'stretch',
    marginTop: 20,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontFamily: fonts.heading, fontSize: 22, letterSpacing: 1.2, color: colors.white },
  secondary: {
    alignSelf: 'stretch',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  secondaryText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  summaryMeta: { marginTop: 16 },
  summaryTitle: { fontFamily: fonts.heading, fontSize: 40, lineHeight: 44, color: colors.text, marginTop: 6 },
  summaryStats: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 20, rowGap: 14 },
  summaryStat: { width: '50%', gap: 2 },
  lapList: {
    marginTop: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  lapRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  lapRowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  lapIndex: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted, width: 44 },
  lapTime: { fontFamily: fonts.heading, fontSize: 24, color: colors.text, flex: 1 },
  lapMistakes: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.yellow,
    width: 40,
    textAlign: 'right',
  },
  lapDelta: { fontFamily: fonts.heading, fontSize: 20, color: colors.muted, width: 72, textAlign: 'right' },
  legend: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 12 },
});
