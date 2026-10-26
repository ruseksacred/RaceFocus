import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMessages } from '@/i18n';
import { colors, fonts, label } from '@/theme';

/** A selectable option in a row of choices (track, mode, penalty…). */
export function Chip({
  text,
  sub,
  selected,
  onPress,
}: {
  text: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={sub ? `${text} ${sub}` : text}
      style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{text}</Text>
      {sub && <Text style={styles.chipSub}>{sub}</Text>}
    </Pressable>
  );
}

/** A number with − and + buttons, kept between min and max. */
export function Stepper({
  title,
  value,
  min,
  max,
  onChange,
}: {
  title: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const m = useMessages();
  return (
    <View style={styles.stepper}>
      <Text style={[label, styles.small]}>{title}</Text>
      <View style={styles.stepperRow}>
        <Pressable
          onPress={() => onChange(Math.max(min, value - 1))}
          accessibilityRole="button"
          accessibilityLabel={m.rooms.fewer(title)}
          style={styles.stepButton}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue} accessibilityLabel={`${title} ${value}`}>
          {value}
        </Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          accessibilityRole="button"
          accessibilityLabel={m.rooms.more(title)}
          style={styles.stepButton}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  small: { fontSize: 11 },
  chip: {
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  chipSelected: { backgroundColor: colors.surface2, borderColor: colors.red },
  chipText: { fontFamily: fonts.heading, fontSize: 18, color: colors.muted },
  chipTextSelected: { color: colors.text },
  chipSub: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  stepper: { flex: 1, gap: 6 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontFamily: fonts.bodySemi, fontSize: 22, color: colors.text },
  stepValue: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.text,
    minWidth: 36,
    textAlign: 'center',
  },
});
