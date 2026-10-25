import { StyleSheet, Text, View } from 'react-native';

import { useMessages } from '@/i18n';
import { seconds } from '@/labels';
import { colors, fonts } from '@/theme';

export type FlagKind = 'yellow' | 'white' | 'chequered';

const FLAGS: Record<FlagKind, { background: string; color: string }> = {
  yellow: { background: colors.yellow, color: colors.carbon },
  white: { background: colors.white, color: colors.carbon },
  chequered: { background: colors.surface2, color: colors.text },
};

/** Race flag banner. Renders an empty slot of the same height when there is no flag. */
export function FlagBanner({ flag, penaltyMs = 1000 }: { flag: FlagKind | null; penaltyMs?: number }) {
  const m = useMessages();
  if (flag === null) return <View style={styles.slot} />;
  const { background, color } = FLAGS[flag];
  const text = flag === 'yellow' ? m.flags.yellow(seconds(penaltyMs)) : m.flags[flag];
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
