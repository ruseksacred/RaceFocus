import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

export type FlagKind = 'yellow' | 'white' | 'chequered';

const FLAGS: Record<FlagKind, { text: string; background: string; color: string }> = {
  yellow: { text: 'Yellow flag · +1.0 s', background: colors.yellow, color: colors.carbon },
  white: { text: 'Final lap', background: colors.white, color: colors.carbon },
  chequered: { text: 'Chequered flag', background: colors.surface2, color: colors.text },
};

/** Race flag banner. Renders an empty slot of the same height when there is no flag. */
export function FlagBanner({ flag }: { flag: FlagKind | null }) {
  if (flag === null) return <View style={styles.slot} />;
  const { text, background, color } = FLAGS[flag];
  return (
    <View
      style={[styles.slot, styles.banner, { backgroundColor: background }]}
      accessibilityRole="alert"
      accessibilityLabel={text}>
      {flag === 'chequered' && <ChequeredIcon />}
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );
}

function ChequeredIcon() {
  return (
    <View style={styles.icon}>
      {Array.from({ length: 12 }, (_, i) => {
        const row = Math.floor(i / 4);
        const dark = (i + row) % 2 === 1;
        return (
          <View key={i} style={[styles.square, { backgroundColor: dark ? colors.carbon : colors.white }]} />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { height: 36, marginTop: 10 },
  banner: {
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  icon: {
    width: 24,
    height: 18,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  square: { width: 5.5, height: 5.33 },
  text: { fontFamily: fonts.heading, fontSize: 18, letterSpacing: 1.5, textTransform: 'uppercase' },
});
