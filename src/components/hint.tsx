import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

/** A short tip in a card: a mark on the left, a title and one or two lines. Yellow for a penalty. */
export function Hint({ title, text, tone = 'info' }: { title: string; text: string; tone?: 'info' | 'yellow' }) {
  const yellow = tone === 'yellow';
  return (
    <View style={[styles.card, yellow && styles.cardYellow]} accessibilityLiveRegion="polite">
      <View style={[styles.mark, yellow && styles.markYellow]}>
        <Text style={[styles.markText, yellow && styles.markTextYellow]}>{yellow ? '!' : '?'}</Text>
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardYellow: { borderColor: colors.yellow },
  mark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markYellow: { borderRadius: 6, backgroundColor: colors.yellow },
  markText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.white },
  markTextYellow: { color: colors.carbon },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted },
});
