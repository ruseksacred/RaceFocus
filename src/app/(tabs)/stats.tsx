import { StyleSheet, Text, View } from 'react-native';

import { Card, Screen, SectionLabel, ui } from '@/components/ui';
import { usePractice } from '@/store/practice';
import { colors, fonts, label, tabular } from '@/theme';

export default function Stats() {
  const recent = usePractice((state) => state.recent);
  const laps = recent.reduce((sum, s) => sum + s.lapsDriven, 0);
  const mistakes = recent.reduce((sum, s) => sum + s.mistakes, 0);

  return (
    <Screen>
      <Text style={label}>Stats</Text>
      <Text style={ui.title}>Your driving</Text>

      <SectionLabel>Since the app opened</SectionLabel>
      <Card style={styles.numbers}>
        <Number title="Sessions" value={recent.length} />
        <Number title="Laps" value={laps} />
        <Number title="Mistakes" value={mistakes} color={mistakes > 0 ? colors.yellow : colors.text} />
      </Card>

      <SectionLabel>Coming next</SectionLabel>
      <Card style={styles.soon}>
        {['Lap-time trend per track', 'Accuracy and consistency', 'Heat map of where you lose time'].map(
          (item) => (
            <Text key={item} style={styles.soonItem}>
              · {item}
            </Text>
          ),
        )}
        <Text style={[ui.body, styles.note]}>
          Stats are kept in memory for now and reset when the app closes.
        </Text>
      </Card>
    </Screen>
  );
}

function Number({ title, value, color = colors.text }: { title: string; value: number; color?: string }) {
  return (
    <View style={styles.number}>
      <Text style={[label, styles.numberLabel]}>{title}</Text>
      <Text style={[styles.numberValue, tabular, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  numbers: { flexDirection: 'row', padding: 16 },
  number: { flex: 1, gap: 2 },
  numberLabel: { fontSize: 11 },
  numberValue: { fontFamily: fonts.heading, fontSize: 34 },
  soon: { padding: 16, gap: 6 },
  soonItem: { fontFamily: fonts.body, fontSize: 15, color: colors.text },
  note: { marginTop: 8, fontSize: 13 },
});
