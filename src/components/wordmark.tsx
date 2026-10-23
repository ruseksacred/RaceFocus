import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

/** Temporary wordmark until a logo concept is chosen. */
export function Wordmark() {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="RaceFocus">
      <View style={styles.flag}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.square, { backgroundColor: i === 0 || i === 3 ? colors.white : colors.carbon }]}
          />
        ))}
      </View>
      <Text style={styles.text}>RACEFOCUS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flag: {
    width: 20,
    height: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  square: { width: 9, height: 9 },
  text: {
    fontFamily: fonts.heading,
    fontSize: 32,
    letterSpacing: 2.5,
    color: colors.text,
    transform: [{ skewX: '-10deg' }],
  },
});
