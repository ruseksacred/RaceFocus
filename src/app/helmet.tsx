import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { HelmetArt, HelmetAvatar } from '@/components/helmet';
import { Card, Screen, SectionLabel, ui } from '@/components/ui';
import {
  encodeHelmet,
  HELMET_COLOR_IDS,
  HELMET_COLORS,
  HELMET_PATTERNS,
  helmetOf,
  MAX_HELMET_NUMBER,
  type Helmet,
  type HelmetColor,
} from '@/game';
import { useMessages } from '@/i18n';
import { goBack } from '@/navigation';
import { refreshMyRecords } from '@/net/leaderboard';
import { useProfile } from '@/store/profile';
import { colors, fonts, label } from '@/theme';

/** Helmet designer, opened from the Profile tab. The helmet is the driver's avatar. */
export default function HelmetScreen() {
  const m = useMessages();
  const nick = useProfile((state) => state.nick);
  const saved = useProfile((state) => state.helmet);
  const setHelmet = useProfile((state) => state.setHelmet);
  const [helmet, setDraft] = useState<Helmet>(() => helmetOf(saved, nick));
  const [numberText, setNumberText] = useState(String(helmet.number));

  const change = (patch: Partial<Helmet>) => setDraft((h) => ({ ...h, ...patch }));
  const setNumber = (value: number) => {
    const number = Math.min(MAX_HELMET_NUMBER, Math.max(0, value));
    change({ number });
    setNumberText(String(number));
  };
  const typeNumber = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 2);
    setNumberText(digits);
    if (digits) change({ number: Number(digits) });
  };
  const random = () => {
    const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
    const color = pick(HELMET_COLOR_IDS);
    const accent = pick(HELMET_COLOR_IDS.filter((c) => c !== color));
    setDraft((h) => ({ ...h, color, accent, pattern: pick(HELMET_PATTERNS) }));
  };
  const save = () => {
    setHelmet(encodeHelmet(helmet));
    refreshMyRecords();
    goBack();
  };

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={goBack} accessibilityRole="button" hitSlop={12}>
          <Text style={styles.back}>{m.helmet.back}</Text>
        </Pressable>
        <Text style={label}>{m.helmet.label}</Text>
      </View>
      <Text style={[ui.title, styles.title]}>{m.helmet.title}</Text>
      <Text style={[ui.body, styles.intro]}>{m.helmet.intro}</Text>

      <Card style={styles.preview}>
        <HelmetArt helmet={helmet} size={168} />
        <Pressable onPress={random} accessibilityRole="button" style={styles.random}>
          <Text style={styles.randomText}>{m.helmet.random} ›</Text>
        </Pressable>
      </Card>

      <SectionLabel>{m.helmet.color}</SectionLabel>
      <Swatches value={helmet.color} onChange={(color) => change({ color })} />

      <SectionLabel>{m.helmet.pattern}</SectionLabel>
      <View style={styles.patterns} accessibilityRole="radiogroup">
        {HELMET_PATTERNS.map((pattern) => {
          const selected = pattern === helmet.pattern;
          return (
            <Pressable
              key={pattern}
              onPress={() => change({ pattern })}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={m.helmet.patterns[pattern]}
              style={[styles.pattern, selected && styles.selected]}>
              <HelmetAvatar helmet={{ ...helmet, pattern }} size={30} />
              <Text style={[styles.patternText, selected && styles.patternTextSelected]}>
                {m.helmet.patterns[pattern]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {helmet.pattern !== 'solid' && (
        <>
          <SectionLabel>{m.helmet.accent}</SectionLabel>
          <Swatches value={helmet.accent} onChange={(accent) => change({ accent })} />
        </>
      )}

      <SectionLabel>{m.helmet.number}</SectionLabel>
      <View style={styles.numberRow}>
        <Step text="−" label={m.helmet.lower} onPress={() => setNumber(helmet.number - 1)} />
        <TextInput
          value={numberText}
          onChangeText={typeNumber}
          onBlur={() => setNumberText(String(helmet.number))}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={2}
          selectTextOnFocus
          accessibilityLabel={m.helmet.numberA11y}
          style={styles.numberInput}
        />
        <Step text="+" label={m.helmet.higher} onPress={() => setNumber(helmet.number + 1)} />
      </View>

      <Pressable
        onPress={save}
        accessibilityRole="button"
        style={({ pressed }) => [styles.save, pressed && styles.pressed]}>
        <Text style={styles.saveText}>{m.helmet.save}</Text>
      </Pressable>
    </Screen>
  );
}

function Swatches({ value, onChange }: { value: HelmetColor; onChange: (color: HelmetColor) => void }) {
  const m = useMessages();
  return (
    <View style={styles.swatches} accessibilityRole="radiogroup">
      {HELMET_COLOR_IDS.map((color) => {
        const selected = color === value;
        return (
          <Pressable
            key={color}
            onPress={() => onChange(color)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={m.helmet.colors[color]}
            hitSlop={4}
            style={[styles.swatchRing, selected && styles.swatchRingSelected]}>
            <View style={[styles.swatch, { backgroundColor: HELMET_COLORS[color] }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

function Step({ text, label: a11y, onPress }: { text: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={styles.step}>
      <Text style={styles.stepText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.muted },
  title: { marginTop: 8 },
  intro: { marginTop: 4 },
  preview: { marginTop: 16, alignItems: 'center', paddingVertical: 12, gap: 4 },
  random: { paddingHorizontal: 14, paddingVertical: 8 },
  randomText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatchRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchRingSelected: { borderColor: colors.text },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.line },
  patterns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pattern: {
    width: '23%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  selected: { backgroundColor: colors.surface2, borderColor: colors.red },
  patternText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.muted },
  patternTextSelected: { color: colors.text },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  step: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontFamily: fonts.bodySemi, fontSize: 24, color: colors.text },
  numberInput: {
    width: 80,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.muted,
    backgroundColor: colors.surface2,
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 30,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  save: {
    marginTop: 24,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  saveText: { fontFamily: fonts.heading, fontSize: 24, letterSpacing: 1.5, color: colors.white },
});
