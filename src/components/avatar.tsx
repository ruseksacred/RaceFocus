import { StyleSheet, Text, View } from 'react-native';

import { useProfile } from '@/store/profile';
import { colors, fonts } from '@/theme';

/** Up to two letters from the nick: "Max Verstappen" → "MV", "Ala" → "AL". */
export function initialsOf(nick: string): string {
  const words = nick.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const letters = words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2);
  return letters.toUpperCase();
}

export function Avatar({ size = 40 }: { size?: number }) {
  const nick = useProfile((state) => state.nick);
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.text, { fontSize: Math.round(size * 0.42) }]}>{initialsOf(nick)}</Text>
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
