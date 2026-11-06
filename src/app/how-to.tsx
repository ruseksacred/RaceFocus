import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Screen, ui } from '@/components/ui';
import { GAMES, TRACKS } from '@/game';
import { useMessages } from '@/i18n';
import { goBack } from '@/navigation';
import { colors, fonts, label, tabular } from '@/theme';

/** The rules in one place: laps, tracks, flags, lap colours, race modes and the games. */
export default function HowTo() {
  const m = useMessages();
  const h = m.howTo;

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={goBack} accessibilityRole="button" hitSlop={12}>
          <Text style={styles.back}>‹ {m.common.back}</Text>
        </Pressable>
        <Text style={label}>{h.label}</Text>
      </View>
      <Text style={ui.title}>{h.title}</Text>

      <Section title={h.lapTitle}>
        <Text style={ui.body}>{h.lapText}</Text>
      </Section>

      <Section title={h.tracksTitle}>
        <View style={styles.tracks}>
          {TRACKS.map((track) => (
            <Text key={track.id} style={[ui.body, styles.track]}>
              <Text style={styles.strong}>{track.name}</Text> {track.size}×{track.size}
            </Text>
          ))}
        </View>
      </Section>

      <Section title={h.flagsTitle}>
        <FlagRow swatch={<View style={[styles.swatch, { backgroundColor: colors.yellow }]} />} name={h.yellow} text={h.yellowText} />
        <FlagRow swatch={<View style={[styles.swatch, { backgroundColor: colors.white }]} />} name={h.white} text={h.whiteText} />
        <FlagRow swatch={<Chequered />} name={h.chequered} text={h.chequeredText} />
      </Section>

      <Section title={h.colorsTitle}>
        <View style={styles.colorRow}>
          <Text style={[styles.time, tabular, { color: colors.green }]}>00:06.21</Text>
          <Text style={[ui.body, styles.flex]}>{h.green}</Text>
        </View>
        <View style={styles.colorRow}>
          <Text style={[styles.time, tabular, { color: colors.purple }]}>00:05.87</Text>
          <Text style={[ui.body, styles.flex]}>{h.purple}</Text>
        </View>
        <Text style={ui.body}>{h.deltaText}</Text>
      </Section>

      <Section title={h.modesTitle}>
        <Text style={ui.body}>{h.modesText}</Text>
      </Section>

      <Section title={m.games.title}>
        {GAMES.map((game) => (
          <View key={game.id} style={styles.game}>
            <Text style={styles.strong}>
              {m.games[game.id].name}
              {game.available ? '' : <Text style={styles.soon}> · {m.games.soon}</Text>}
            </Text>
            <Text style={ui.body}>{m.games[game.id].about}</Text>
          </View>
        ))}
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card style={styles.card}>
      <Text style={styles.cardTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </Card>
  );
}

function FlagRow({ swatch, name, text }: { swatch: React.ReactNode; name: string; text: string }) {
  return (
    <View style={styles.flagRow}>
      {swatch}
      <Text style={[ui.body, styles.flex]}>
        <Text style={styles.strong}>{name}</Text>: {text}
      </Text>
    </View>
  );
}

function Chequered() {
  return (
    <View style={[styles.swatch, styles.chequered]}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={[styles.square, { backgroundColor: i % 2 === 0 ? colors.white : colors.carbon }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  back: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.muted },
  card: { marginTop: 14, padding: 16, gap: 10 },
  cardTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  strong: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  soon: { fontFamily: fonts.body, color: colors.muted },
  tracks: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 },
  track: { width: '50%' },
  flagRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swatch: { width: 34, height: 22, borderRadius: 4 },
  chequered: { flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  square: { flex: 1 },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  time: { width: 76, fontFamily: fonts.heading, fontSize: 20 },
  flex: { flex: 1 },
  game: { gap: 2 },
});
