import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  accuracy,
  addLap,
  applyTap,
  createLap,
  createSession,
  currentLapNumber,
  deltaKind,
  deltaMs,
  elapsedMs,
  formatDelta,
  formatLapTime,
  getTrack,
  isCleared,
  isComplete,
  lapTimeMs,
  MODES,
  nextTarget,
  randomSeed,
  sessionBest,
  sessionBestIndex,
  totalTime,
  type LapState,
  type Mode,
  type Session,
  type Track,
} from '@/game';
import { recordKey, useRecords } from '@/store/records';
import { colors, fonts, label, tabular } from '@/theme';

type Phase = 'countdown' | 'running' | 'finished' | 'summary';

interface LapResult {
  lapMs: number;
  /** Personal best before this lap. */
  previousPersonalBest: number | null;
  /** Fastest lap of this session before this lap. */
  previousSessionBest: number | null;
  personalBest: boolean;
  sessionBest: boolean;
  mistakes: number;
  accuracy: number;
}

const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 700;
const MODE_NAMES: Record<Mode, string> = { ascending: '1 → N', descending: 'Countdown' };

/**
 * react-native-web waits 50 ms before firing onPressIn, so quick taps are lost.
 * Native fires it right away. The prop is web-only and missing from RN types.
 */
const instantPressIn = (Platform.OS === 'web' ? { delayPressIn: 0 } : {}) as object;

export default function RaceScreen() {
  const params = useLocalSearchParams<{ track?: string; mode?: string; laps?: string }>();
  const track = getTrack(params.track ?? '') ?? getTrack('circuit')!;
  const mode: Mode = MODES.includes(params.mode as Mode) ? (params.mode as Mode) : 'ascending';
  const lapCount = Number(params.laps);
  const targetLaps = Number.isInteger(lapCount) && lapCount > 0 ? lapCount : null;
  return <Race track={track} mode={mode} targetLaps={targetLaps} />;
}

function Race({ track, mode, targetLaps }: { track: Track; mode: Mode; targetLaps: number | null }) {
  const key = recordKey(track.id, mode);
  const personalBest = useRecords((state) => state.bestLaps[key] ?? null);
  const submitLap = useRecords((state) => state.submitLap);

  const [session, setSession] = useState<Session>(() => createSession(targetLaps));
  const [lap, setLap] = useState<LapState>(() => newLap(track, mode));
  const [phase, setPhase] = useState<Phase>('countdown');
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [now, setNow] = useState(0);
  const [wrongValue, setWrongValue] = useState<number | null>(null);
  const [result, setResult] = useState<LapResult | null>(null);

  const lapRef = useRef(lap);
  const startRef = useRef(0);

  // Lights countdown, then start the clock.
  useEffect(() => {
    if (phase !== 'countdown') return;
    const id = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1);
        return;
      }
      startRef.current = performance.now();
      setNow(0);
      setPhase('running');
    }, COUNTDOWN_STEP_MS);
    return () => clearTimeout(id);
  }, [phase, countdown]);

  // Running clock.
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => setNow(performance.now() - startRef.current), 31);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (wrongValue === null) return;
    const id = setTimeout(() => setWrongValue(null), 250);
    return () => clearTimeout(id);
  }, [wrongValue]);

  const onTap = useCallback(
    (value: number) => {
      if (phase !== 'running') return;
      const at = performance.now() - startRef.current;
      const outcome = applyTap(lapRef.current, { value, at });
      lapRef.current = outcome.state;
      setLap(outcome.state);

      if (outcome.result === 'wrong') setWrongValue(value);
      if (outcome.result === 'finished') {
        const lapMs = lapTimeMs(outcome.state)!;
        const previousSessionBest = sessionBest(session);
        const isPersonalBest = submitLap(key, lapMs);
        setSession(addLap(session, lapMs));
        setNow(at);
        setResult({
          lapMs,
          previousPersonalBest: personalBest,
          previousSessionBest,
          personalBest: isPersonalBest,
          sessionBest: previousSessionBest === null || lapMs < previousSessionBest,
          mistakes: outcome.state.mistakes,
          accuracy: accuracy(outcome.state),
        });
        setPhase('finished');
      }
    },
    [phase, key, personalBest, session, submitLap],
  );

  const startLap = () => {
    const fresh = newLap(track, mode);
    lapRef.current = fresh;
    setLap(fresh);
    setResult(null);
    setNow(0);
    setCountdown(COUNTDOWN_FROM);
    setPhase('countdown');
  };

  const restart = () => {
    setSession(createSession(targetLaps));
    startLap();
  };

  const { width } = useWindowDimensions();
  const gap = track.size >= 7 ? 6 : 8;
  const boardWidth = Math.min(width, 480) - 48;
  const tileSize = Math.floor((boardWidth - gap * (track.size - 1)) / track.size);

  if (phase === 'summary') {
    return (
      <SafeAreaView style={styles.safe}>
        <Summary
          session={session}
          track={track}
          mode={mode}
          personalBest={personalBest}
          onRestart={restart}
        />
      </SafeAreaView>
    );
  }

  // After a finish the session already holds the lap just driven.
  const lapNumber = phase === 'finished' ? session.laps.length : currentLapNumber(session);
  const lapLabel = targetLaps === null ? `Lap ${lapNumber}` : `Lap ${lapNumber} / ${targetLaps}`;
  const time = phase === 'countdown' ? 0 : elapsedMs(lap, now);
  const total = lap.targets.length;
  const target = nextTarget(lap);
  const best = sessionBest(session);
  const lastLap = session.laps.at(-1);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Exit to menu"
            hitSlop={12}>
            <Text style={styles.exit}>‹ Exit</Text>
          </Pressable>
          <Text style={label}>
            {lapLabel} · {track.size}×{track.size} {track.name}
          </Text>
        </View>

        <Text style={[styles.timer, tabular]} accessibilityLabel={`Lap time ${formatLapTime(time)}`}>
          {formatLapTime(time)}
        </Text>

        <View style={styles.stats}>
          <Stat title="Session best" value={best === null ? '—' : formatLapTime(best)} color={colors.purple} />
          <Stat title="Personal best" value={personalBest === null ? '—' : formatLapTime(personalBest)} />
          <Stat
            title="Penalties"
            value={lap.mistakes === 0 ? '0' : `+${lap.mistakes}.0 s`}
            color={lap.mistakes > 0 ? colors.red : colors.muted}
          />
        </View>

        {phase === 'finished' && result ? (
          <ResultCard
            result={result}
            sessionDone={isComplete(session)}
            onNext={startLap}
            onEnd={() => setPhase('summary')}
          />
        ) : (
          <>
            <View style={styles.next}>
              <Text style={label}>Next</Text>
              <Text style={[styles.nextValue, tabular]}>{phase === 'countdown' ? '–' : target}</Text>
            </View>

            <View style={[styles.board, { width: boardWidth, gap }]}>
              {phase === 'countdown' ? (
                <View style={[styles.countdown, { height: boardWidth }]}>
                  <Lights lit={COUNTDOWN_FROM - countdown + 1} />
                  <Text style={styles.countdownText}>{countdown}</Text>
                </View>
              ) : (
                lap.board.map((value) => {
                  const cleared = isCleared(lap, value);
                  const wrong = value === wrongValue;
                  return (
                    <Pressable
                      key={value}
                      {...instantPressIn}
                      onPressIn={() => onTap(value)}
                      accessibilityRole="button"
                      accessibilityLabel={`${value}`}
                      accessibilityState={{ disabled: cleared }}
                      style={[
                        styles.tile,
                        { width: tileSize, height: tileSize },
                        cleared && styles.tileCleared,
                        wrong && styles.tileWrong,
                      ]}>
                      <Text
                        style={[
                          styles.tileText,
                          { fontSize: Math.round(tileSize * 0.45) },
                          cleared && styles.tileTextCleared,
                        ]}>
                        {value}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${(lap.nextIndex / total) * 100}%` }]} />
            </View>
            <View style={styles.progressRow}>
              <Text style={[styles.small, tabular]}>
                {lap.nextIndex} / {total}
              </Text>
              {lastLap !== undefined && (
                <Text style={[styles.small, tabular]}>
                  L{session.laps.length} {formatLapTime(lastLap)}
                </Text>
              )}
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

function Stat({ title, value, color = colors.muted }: { title: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[label, styles.statLabel]}>{title}</Text>
      <Text style={[styles.statValue, tabular, { color }]}>{value}</Text>
    </View>
  );
}

function Lights({ lit }: { lit: number }) {
  return (
    <View style={styles.lights} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: COUNTDOWN_FROM }, (_, i) => (
        <View key={i} style={[styles.light, i < lit && styles.lightOn]} />
      ))}
    </View>
  );
}

/** Delta text and color: purple for a session best, green for a personal best. */
function deltaDisplay(delta: number | null, improvedColor: string) {
  if (delta === null) return { text: '—', color: colors.muted };
  return { text: formatDelta(delta), color: deltaKind(delta) === 'improvement' ? improvedColor : colors.muted };
}

function ResultCard({
  result,
  sessionDone,
  onNext,
  onEnd,
}: {
  result: LapResult;
  sessionDone: boolean;
  onNext: () => void;
  onEnd: () => void;
}) {
  const vsSession = deltaDisplay(deltaMs(result.lapMs, result.previousSessionBest), colors.purple);
  const vsPersonal = deltaDisplay(deltaMs(result.lapMs, result.previousPersonalBest), colors.green);
  const timeColor = result.personalBest ? colors.green : result.sessionBest ? colors.purple : colors.text;

  const badge = result.personalBest
    ? { text: result.previousPersonalBest === null ? 'First lap set' : 'Personal best', color: colors.green }
    : result.sessionBest && result.previousSessionBest !== null
      ? { text: 'Session best', color: colors.purple }
      : null;

  return (
    <View style={styles.result}>
      {badge && <Text style={[label, styles.badge, { color: badge.color }]}>{badge.text}</Text>}
      <Text style={label}>Lap time</Text>
      <Text style={[styles.resultTime, tabular, { color: timeColor }]}>{formatLapTime(result.lapMs)}</Text>
      <View style={styles.resultGrid}>
        <Stat title="Δ session best" value={vsSession.text} color={vsSession.color} />
        <Stat title="Δ personal best" value={vsPersonal.text} color={vsPersonal.color} />
        <Stat title="Accuracy" value={`${Math.round(result.accuracy * 100)}%`} />
        <Stat title="Mistakes" value={`${result.mistakes}`} />
      </View>
      <Pressable
        onPress={sessionDone ? onEnd : onNext}
        accessibilityRole="button"
        style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}>
        <Text style={styles.primaryText}>{sessionDone ? 'SEE RESULTS' : 'NEXT LAP'}</Text>
      </Pressable>
      {!sessionDone && (
        <Pressable onPress={onEnd} accessibilityRole="button" style={styles.secondary}>
          <Text style={styles.secondaryText}>End session</Text>
        </Pressable>
      )}
    </View>
  );
}

function Summary({
  session,
  track,
  mode,
  personalBest,
  onRestart,
}: {
  session: Session;
  track: Track;
  mode: Mode;
  personalBest: number | null;
  onRestart: () => void;
}) {
  const best = sessionBest(session);
  const bestIndex = sessionBestIndex(session);
  const complete = isComplete(session);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={label}>
        {track.size}×{track.size} {track.name} · {MODE_NAMES[mode]}
      </Text>
      <Text style={styles.summaryTitle}>{complete ? 'Session complete' : 'Session ended'}</Text>

      <View style={styles.summaryStats}>
        <Stat title="Laps" value={`${session.laps.length}`} color={colors.text} />
        <Stat title="Total" value={formatLapTime(totalTime(session))} color={colors.text} />
        <Stat title="Best lap" value={best === null ? '—' : formatLapTime(best)} color={colors.purple} />
      </View>

      {session.laps.length > 0 && (
        <View style={styles.lapList}>
          {session.laps.map((lapMs, i) => {
            const isBest = i === bestIndex;
            const isPersonal = personalBest !== null && lapMs === personalBest;
            const delta = best === null ? null : lapMs - best;
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
                  {formatLapTime(lapMs)}
                </Text>
                <Text style={[styles.lapDelta, tabular, isBest && { color: colors.purple }]}>
                  {isBest ? 'Best' : delta === null ? '' : formatDelta(delta)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <Text style={styles.legend}>Purple: fastest lap of this session. Green: personal best.</Text>

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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.carbon },
  content: { flexGrow: 1, padding: 24, paddingTop: 16, maxWidth: 480, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exit: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.muted },
  timer: {
    fontFamily: fonts.heading,
    fontSize: 76,
    lineHeight: 84,
    color: colors.text,
    textAlign: 'center',
    marginTop: 12,
  },
  stats: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 6 },
  stat: { alignItems: 'center', gap: 2, minWidth: 90 },
  statLabel: { fontSize: 11, letterSpacing: 1.1 },
  statValue: { fontFamily: fonts.heading, fontSize: 24, color: colors.muted },
  next: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: 12, marginTop: 12 },
  nextValue: { fontFamily: fonts.heading, fontSize: 56, lineHeight: 60, color: colors.red, minWidth: 60 },
  board: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, alignSelf: 'center' },
  tile: {
    borderRadius: 12,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileCleared: { backgroundColor: colors.carbon },
  tileWrong: { borderColor: colors.red, borderWidth: 2, backgroundColor: '#3A1A20' },
  tileText: { fontFamily: fonts.heading, color: colors.text },
  tileTextCleared: { color: colors.dim },
  countdown: { width: '100%', alignItems: 'center', justifyContent: 'center', gap: 24 },
  countdownText: { fontFamily: fonts.heading, fontSize: 64, color: colors.text },
  lights: { flexDirection: 'row', gap: 14 },
  light: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  lightOn: { backgroundColor: colors.red, borderColor: colors.red },
  progressTrack: { marginTop: 16, height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' },
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
  badge: { marginBottom: 6 },
  resultTime: { fontFamily: fonts.heading, fontSize: 56, lineHeight: 62, color: colors.text },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: 12, columnGap: 24 },
  primary: {
    alignSelf: 'stretch',
    marginTop: 18,
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
  summaryTitle: { fontFamily: fonts.heading, fontSize: 40, lineHeight: 44, color: colors.text, marginTop: 6 },
  summaryStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
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
  lapDelta: { fontFamily: fonts.heading, fontSize: 20, color: colors.muted },
  legend: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 12 },
});
