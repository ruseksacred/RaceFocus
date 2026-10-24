import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

/** Logo concept A (double chevron) with the RACEFOCUS wordmark. */
export function Wordmark() {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="RaceFocus">
      <Image source={require('@/assets/images/logo-mark.png')} style={styles.mark} />
      <Text style={styles.text}>
        RACE<Text style={styles.accent}>FOCUS</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 40, height: 40 },
  text: {
    fontFamily: fonts.heading,
    fontSize: 32,
    letterSpacing: 2,
    color: colors.text,
    transform: [{ skewX: '-12deg' }],
  },
  accent: { color: colors.red },
});
