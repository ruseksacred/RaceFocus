import { StyleSheet, Text, View } from 'react-native';

import { Card, Screen, SectionLabel, ui } from '@/components/ui';
import { formatLapTime, getTrack, licenceFor, MODES, trackLabel, TRACKS } from '@/game';
import { formatWhen, MODE_SHORT } from '@/labels';
import { useAccount } from '@/net/account';
import { useCareer } from '@/store/career';
import { usePractice } from '@/store/practice';
import { recordKey, useRecords } from '@/store/records';
import { colors, fonts, label, tabular } from '@/theme';

export default function Stats() {
  const isGuest = useAccount((state) => state.isGuest);
  const totals = usePractice((state) => state.totals);
  const bestLaps = useRecords((state) => state.bestLaps);
  const career = useCareer();
  const winRate = career.races > 0 ? Math.round((career.wins / career.races) * 100) : 0;

  return (
    <Screen>
      <Text style={label}>Stats</Text>
      <Text style={ui.title}>Your driving</Text>
      <Text style={[ui.body, styles.intro]}>
        {isGuest
          ? 'Saved on this device. Create an account in Profile to keep it in the cloud.'
          : 'Saved to your account.'}
      </Text>

      <SectionLabel right={<Text style={styles.beta}>β beta</Text>}>Races in rooms</SectionLabel>
      <Card style={styles.grid}>
        <Number title="Rating" value={String(Math.round(career.rating))} />
        <Number title="Licence" value={licenceFor(career.rating, career.ratedRaces)} />
        <Number title="Races" value={String(career.races)} />
        <Number
          title="Wins"
          value={String(career.wins)}
          color={career.wins > 0 ? colors.green : colors.text}
        />
        <Number title="Podiums" value={String(career.podiums)} />
        <Number title="Win rate" value={`${winRate}%`} />
        <Number
          title="DNF"
          value={String(career.dnfs)}
          color={career.dnfs > 0 ? colors.yellow : colors.text}
        />
      </Card>

      {career.history.length > 0 && (
        <Card style={styles.list}>
          {career.history.slice(0, 5).map((race, i) => {
            const track = getTrack(race.track)!;
            const delta = race.ratingDelta;
            return (
              <View key={race.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <Text style={[styles.pos, tabular]}>
                  {race.position === null ? 'DNF' : `P${race.position}`}
                </Text>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>
                    {trackLabel(track)} · {race.laps} {race.laps === 1 ? 'lap' : 'laps'} · {race.drivers}{' '}
                    drivers
                  </Text>
                  <Text style={styles.rowMeta}>
                    {formatWhen(race.finishedAt)}
                    {race.bestLapMs !== null ? ` · best ${formatLapTime(race.bestLapMs)}` : ''}
                  </Text>
                </View>
                <Text style={[styles.delta, tabular, { color: delta >= 0 ? colors.green : colors.red }]}>
                  {delta >= 0 ? '+' : '−'}
                  {Math.abs(delta)}
                </Text>
              </View>
            );
          })}
        </Card>
      )}

      <SectionLabel>Solo practice</SectionLabel>
      <Card style={styles.grid}>
        <Number title="Sessions" value={String(totals.sessions)} />
        <Number title="Laps" value={String(totals.laps)} />
        <Number
          title="Mistakes"
          value={String(totals.mistakes)}
          color={totals.mistakes > 0 ? colors.yellow : colors.text}
        />
      </Card>

      <SectionLabel>Best laps</SectionLabel>
      <Card style={styles.list}>
        <View style={[styles.row, styles.head]}>
          <Text style={[styles.headText, styles.trackCol]}>Track</Text>
          {MODES.map((m) => (
            <Text key={m} style={[styles.headText, styles.timeCol]}>
              {MODE_SHORT[m]}
            </Text>
          ))}
        </View>
        {TRACKS.map((t) => (
          <View key={t.id} style={[styles.row, styles.rowBorder]}>
            <Text style={[styles.rowTitle, styles.trackCol]}>{trackLabel(t)}</Text>
            {MODES.map((m) => {
              const best = bestLaps[recordKey(t.id, m)]?.ms;
              return (
                <Text
                  key={m}
                  style={[styles.time, tabular, styles.timeCol, best === undefined && styles.empty]}>
                  {best === undefined ? '—' : formatLapTime(best)}
                </Text>
              );
            })}
          </View>
        ))}
      </Card>

      <SectionLabel>Coming next</SectionLabel>
      <Card style={styles.soon}>
        {['Lap-time trend per track', 'Consistency', 'Heat map of where you lose time'].map((item) => (
          <Text key={item} style={styles.soonItem}>
            · {item}
          </Text>
        ))}
      </Card>
    </Screen>
  );
}

function Number({ title, value, color = colors.text }: { title: string; value: string; color?: string }) {
  return (
    <View style={styles.number}>
      <Text style={[label, styles.numberLabel]}>{title}</Text>
      <Text style={[styles.numberValue, tabular, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: 4 },
  beta: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.purple },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, rowGap: 14 },
  number: { width: '33.33%', gap: 2 },
  numberLabel: { fontSize: 11 },
  numberValue: { fontFamily: fonts.heading, fontSize: 28 },
  list: { marginTop: 10, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  head: { paddingVertical: 8 },
  headText: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.muted, textTransform: 'uppercase' },
  pos: { width: 40, fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  rowMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  delta: { fontFamily: fonts.heading, fontSize: 20 },
  trackCol: { flex: 1 },
  timeCol: { width: 92, textAlign: 'right' },
  time: { fontFamily: fonts.heading, fontSize: 18, color: colors.green },
  empty: { color: colors.muted },
  soon: { padding: 16, gap: 6 },
  soonItem: { fontFamily: fonts.body, fontSize: 15, color: colors.text },
});
