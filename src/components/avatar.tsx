import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

/** Placeholder driver initials until accounts exist. */
export const DRIVER_INITIALS = 'BR';

export function Avatar({ size = 40 }: { size?: number }) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.text, { fontSize: Math.round(size * 0.45) }]}>{DRIVER_INITIALS}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontFamily: fonts.heading, color: colors.text },
});
