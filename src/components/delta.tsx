import { StyleSheet, Text, View } from 'react-native';

import { formatDelta, formatLapTime } from '@/game';
import { colors, fonts, label, tabular } from '@/theme';

/** Green when faster than the reference, red when slower. */
export function deltaColor(delta: number | null) {
  if (delta === null || delta === 0) return colors.muted;
  return delta < 0 ? colors.green : colors.red;
}

/**
 * Live delta of the lap being driven against a reference lap (its split times).
 * Shows the reference lap time underneath, or "no lap yet".
 */
export function LiveDelta({
  title,
  delta,
  reference,
}: {
  title: string;
  delta: number | null;
  reference: readonly number[] | null;
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

export const deltaStyles = StyleSheet.create({
  stat: { alignItems: 'center', gap: 1, minWidth: 96 },
  statLabel: { fontSize: 11, letterSpacing: 1.1 },
  statValue: { fontFamily: fonts.heading, fontSize: 26, color: colors.muted },
  statCaption: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
});

const styles = deltaStyles;
