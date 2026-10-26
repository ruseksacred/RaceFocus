import { StyleSheet, Text, View } from 'react-native';

import { formatDelta, helmetOf, type Standing } from '@/game';
import { useMessages } from '@/i18n';
import { colors, fonts, tabular } from '@/theme';

import { HelmetAvatar } from './helmet';

/**
 * Small live standings in two columns, so a full field (up to 12) fits under the board:
 * P1–P6 on the left, P7–P12 on the right.
 */
export function StandingsGrid({
  standings,
  helmets,
  meId,
}: {
  standings: readonly Standing[];
  /** Helmet string per driver id. */
  helmets: Record<string, string | undefined>;
  meId: string;
}) {
  const m = useMessages();
  const half = Math.ceil(standings.length / 2);
  const columns = [standings.slice(0, half), standings.slice(half)];
  return (
    <View style={styles.grid} accessibilityLabel={m.room.liveStandings}>
      {columns.map((column, c) => (
        <View key={c} style={styles.column}>
          {column.map((s) => {
            const me = s.id === meId;
            const gap = s.position === 1 ? m.common.leader : s.gapToLeader === null ? '—' : formatDelta(s.gapToLeader);
            return (
              <View key={s.id} style={[styles.row, me && styles.meRow]}>
                <Text style={[styles.pos, tabular]}>P{s.position}</Text>
                <HelmetAvatar helmet={helmetOf(helmets[s.id], s.name)} size={18} />
                <Text style={[styles.name, me && styles.meName]} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={[styles.gap, tabular, s.finished && styles.finished]} numberOfLines={1}>
                  {gap}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  column: { flex: 1, minWidth: 0, gap: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 22,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  meRow: { backgroundColor: colors.surface2 },
  pos: { width: 24, fontFamily: fonts.heading, fontSize: 14, color: colors.muted },
  name: { flex: 1, minWidth: 0, fontFamily: fonts.bodySemi, fontSize: 12, color: colors.text },
  meName: { color: colors.green },
  gap: { fontFamily: fonts.heading, fontSize: 14, color: colors.muted },
  finished: { color: colors.text },
});
