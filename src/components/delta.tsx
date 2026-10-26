import { StyleSheet, Text, View } from 'react-native';

import { deltaBarFill, formatDelta, formatLapTime } from '@/game';
import { colors, fonts, label, tabular } from '@/theme';

/** Green when faster than the reference, red when slower. */
export function deltaColor(delta: number | null) {
  if (delta === null || delta === 0) return colors.muted;
  return delta < 0 ? colors.green : colors.red;
}

/**
 * Live delta of the lap being driven against a reference lap (its split times).
 * Shows the reference lap time underneath, or `noLap` before there is one.
 */
export function LiveDelta({
  title,
  delta,
  reference,
  noLap,
}: {
  title: string;
  delta: number | null;
  reference: readonly number[] | null;
  /** Shown instead of the reference time before there is one. */
  noLap: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[label, styles.statLabel]}>{title}</Text>
      <Text style={[styles.statValue, tabular, { color: deltaColor(delta) }]}>
        {delta === null ? (reference ? '±0.00' : '—') : formatDelta(delta)}
      </Text>
      <Text style={[styles.statCaption, tabular]}>
        {reference ? formatLapTime(reference.at(-1)!) : noLap}
      </Text>
    </View>
  );
}

/**
 * Sim-racing style delta bar: from the centre it fills right in green while the lap is faster
 * than the reference and left in red while it is slower, with the delta in big numbers on top.
 */
export function DeltaBar({
  title,
  delta,
  reference,
  noLap,
}: {
  title: string;
  delta: number | null;
  reference: readonly number[] | null;
  /** Shown instead of the reference time before there is one. */
  noLap: string;
}) {
  const referenceMs = reference?.at(-1) ?? null;
  const fill = deltaBarFill(delta, referenceMs);
  const text = delta === null ? (reference ? '±0.00' : '—') : formatDelta(delta);
  return (
    <View style={styles.bar}>
      <View style={styles.barHead}>
        <Text style={[label, styles.statLabel]}>{title}</Text>
        <Text style={[styles.statCaption, tabular]}>
          {referenceMs !== null ? formatLapTime(referenceMs) : noLap}
        </Text>
      </View>
      <View style={styles.track} accessible accessibilityLabel={`${title} ${text}`}>
        {fill !== 0 && (
          <View
            style={[
              styles.fill,
              fill > 0
                ? { left: '50%', width: `${fill * 50}%`, backgroundColor: colors.green }
                : { right: '50%', width: `${-fill * 50}%`, backgroundColor: colors.red },
            ]}
          />
        )}
        <View style={styles.centre} />
        <Text style={[styles.barValue, tabular, delta === null && { color: colors.muted }]}>{text}</Text>
      </View>
    </View>
  );
}

export const deltaStyles = StyleSheet.create({
  stat: { alignItems: 'center', gap: 1, minWidth: 96 },
  statLabel: { fontSize: 11, letterSpacing: 1.1 },
  statValue: { fontFamily: fonts.heading, fontSize: 26, color: colors.muted },
  statCaption: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  bar: { alignSelf: 'stretch', gap: 4, marginTop: 4 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: {
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { position: 'absolute', top: 0, bottom: 0, opacity: 0.9 },
  centre: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    marginLeft: -1,
    backgroundColor: colors.text,
    opacity: 0.5,
  },
  barValue: {
    fontFamily: fonts.heading,
    fontSize: 34,
    lineHeight: 38,
    color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
});

const styles = deltaStyles;
