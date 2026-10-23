import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  accuracy,
  applyTap,
  createLap,
  deltaKind,
  deltaMs,
  elapsedMs,
  formatDelta,
  formatLapTime,
  getTrack,
  isCleared,
  lapTimeMs,
  MODES,
  nextTarget,
  randomSeed,
  type LapState,
  type Mode,
  type Track,
} from '@/game';
import { recordKey, useRecords } from '@/store/records';
import { colors, fonts, label, tabular } from '@/theme';

type Phase = 'countdown' | 'running' | 'finished';

interface LapResult {
  lapMs: number;
  /** Best lap before this one. */
  previousBest: number | null;
  personalBest: boolean;
  mistakes: number;
  accuracy: number;
}

const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 700;

/**
 * react-native-web waits 50 ms before firing onPressIn, so quick taps are lost.
 * Native fires it right away. The prop is web-only and missing from RN types.
 */
const instantPressIn = (Platform.OS === 'web' ? { delayPressIn: 0 } : {}) as object;

export default function RaceScreen() {
  const params = useLocalSearchParams<{ track?: string; mode?: string }>();
  const track = getTrack(params.track ?? '') ?? getTrack('circuit')!;
  const mode: Mode = MODES.includes(params.mode as Mode) ? (params.mode as Mode) : 'ascending';
  return <Race track={track} mode={mode} />;
}

function Race({ track, mode }: { track: Track; mode: Mode }) {
  const key = recordKey(track.id, mode);
  const best = useRecords((state) => state.bestLaps[key] ?? null);
  const submitLap = useRecords((state) => state.submitLap);

  const [lapNumber, setLapNumber] = useState(1);
  const [lap, setLap] = useState<LapState>(() => createLap({ size: track.size, seed: randomSeed(), mode }));
  const [phase, setPhase] = useState<Phase>('countdown');
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [now, setNow] = useState(0);
  const [wrongValue, setWrongValue] = useState<number | null>(null);
  const [result, setResult] = useState<LapResult | null>(null);
  const [lastLap, setLastLap] = useState<number | null>(null);

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
        const personalBest = submitLap(key, lapMs);
        setNow(at);
        setResult({
          lapMs,
          previousBest: best,
          personalBest,
          mistakes: outcome.state.mistakes,
          accuracy: accuracy(outcome.state),
        });
        setPhase('finished');
      }
    },
    [phase, key, best, submitLap],
  );

  const nextLap = () => {
    const fresh = createLap({ size: track.size, seed: randomSeed(), mode });
    lapRef.current = fresh;
    setLap(fresh);
    setLastLap(result?.lapMs ?? null);
    setResult(null);
    setLapNumber((n) => n + 1);
    setCountdown(COUNTDOWN_FROM);
    setPhase('countdown');
  };

  const { width } = useWindowDimensions();
  const gap = track.size >= 7 ? 6 : 8;
  const boardWidth = Math.min(width, 480) - 48;
  const tileSize = Math.floor((boardWidth - gap * (track.size - 1)) / track.size);

  const time = phase === 'countdown' ? 0 : elapsedMs(lap, now);
  const total = lap.targets.length;
  const target = nextTarget(lap);

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
            Lap {lapNumber} · {track.size}×{track.size} {track.name}
          </Text>
        </View>

        <Text style={[styles.timer, tabular]} accessibilityLabel={`Lap time ${formatLapTime(time)}`}>
          {formatLapTime(time)}
        </Text>

        <View style={styles.stats}>
          <Stat title="Best lap" value={best === null ? '—' : formatLapTime(best)} />
          <Stat
            title="Penalties"
            value={lap.mistakes === 0 ? '0' : `+${lap.mistakes}.0 s`}
            color={lap.mistakes > 0 ? colors.red : colors.muted}
          />
        </View>

        {phase === 'finished' && result ? (
          <ResultCard result={result} onNext={nextLap} />
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
              {lastLap !== null && (
                <Text style={[styles.small, tabular]}>
                  L{lapNumber - 1} {formatLapTime(lastLap)}
                </Text>
              )}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Stat({ title, value, color = colors.muted }: { title: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={label}>{title}</Text>
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

function ResultCard({ result, onNext }: { result: LapResult; onNext: () => void }) {
  const delta = deltaMs(result.lapMs, result.previousBest);
  const kind = deltaKind(delta);
  const deltaColor = kind === 'improvement' ? colors.green : colors.muted;

  return (
    <View style={styles.result}>
      {result.personalBest && (
        <Text style={[label, styles.pb]}>{result.previousBest === null ? 'First lap set' : 'Personal best'}</Text>
      )}
      <Text style={label}>Lap time</Text>
      <Text style={[styles.resultTime, tabular, result.personalBest && { color: colors.green }]}>
        {formatLapTime(result.lapMs)}
      </Text>
      <View style={styles.stats}>
        <Stat title="Δ best lap" value={delta === null ? '—' : formatDelta(delta)} color={deltaColor} />
        <Stat title="Accuracy" value={`${Math.round(result.accuracy * 100)}%`} />
        <Stat title="Mistakes" value={`${result.mistakes}`} />
      </View>
      <Pressable
        onPress={onNext}
        accessibilityRole="button"
        style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}>
        <Text style={styles.primaryText}>NEXT LAP</Text>
      </Pressable>
      <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.secondary}>
        <Text style={styles.secondaryText}>Back to menu</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.carbon },
  content: { flex: 1, padding: 24, paddingTop: 16, maxWidth: 480, width: '100%', alignSelf: 'center' },
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
  stats: { flexDirection: 'row', justifyContent: 'center', gap: 28, marginTop: 6 },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { fontFamily: fonts.heading, fontSize: 26, color: colors.muted },
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
    marginTop: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  pb: { color: colors.green, marginBottom: 6 },
  resultTime: { fontFamily: fonts.heading, fontSize: 56, lineHeight: 62, color: colors.text },
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
    marginTop: 4,
  },
  secondaryText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
});
