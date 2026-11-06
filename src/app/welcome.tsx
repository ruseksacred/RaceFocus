import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Card, ui } from '@/components/ui';
import { Wordmark } from '@/components/wordmark';
import { GAMES } from '@/game';
import { useMessages } from '@/i18n';
import { goBack } from '@/navigation';
import { useOnboarding } from '@/store/onboarding';
import { colors, fonts, label } from '@/theme';

/** First launch: what the app is, then the practice lap. */
export default function Welcome() {
  const m = useMessages();
  const w = m.welcome;
  const seeWelcome = useOnboarding((state) => state.seeWelcome);

  const start = () => {
    seeWelcome();
    router.replace({ pathname: '/race', params: { trial: '1' } });
  };
  const skip = () => {
    seeWelcome();
    goBack();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <Wordmark />
          <Text style={[label, styles.tagline]}>{w.tagline}</Text>
        </View>

        <DemoBoard />

        <Text style={[ui.title, styles.title]}>{w.title}</Text>
        <Text style={[ui.body, styles.body]}>{w.body}</Text>

        <Card style={styles.pillars}>
          <Pillar icon={<StopwatchIcon />} title={w.lapsTitle} text={w.lapsText} />
          <Pillar icon={<FlagIcon />} title={w.racesTitle} text={w.racesText} />
          <Pillar icon={<ChartIcon />} title={w.progressTitle} text={w.progressText} />
        </Card>

        <Text style={[label, styles.gamesLabel]}>{m.games.title}</Text>
        <View style={styles.games}>
          {GAMES.map((game) => (
            <View key={game.id} style={[styles.chip, game.available && styles.chipOn]}>
              <Text style={[styles.chipText, !game.available && styles.chipTextSoon]}>
                {m.games[game.id].name}
                {game.available ? '' : ` · ${m.games.soon}`}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* The way forward stays on screen however small the phone. */}
      <View style={styles.footer}>
        <Pressable
          onPress={start}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
          <Text style={styles.primaryText}>{w.start}</Text>
        </Pressable>
        <Text style={[ui.body, styles.note]}>{w.startNote}</Text>
        <Pressable onPress={skip} accessibilityRole="button" style={styles.skip}>
          <Text style={styles.skipText}>{w.skip}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const DEMO_LAYOUT = [5, 1, 7, 3, 9, 2, 6, 8, 4];
const DEMO_STEP_MS = 420;

/** A small board that taps itself from 1 to 9, over and over. */
function DemoBoard() {
  const m = useMessages();
  const [step, setStep] = useState(0);
  useEffect(() => {
    // Nine taps, then a short pause with the board cleared before it starts again.
    const id = setInterval(() => setStep((s) => (s + 1) % 11), DEMO_STEP_MS);
    return () => clearInterval(id);
  }, []);
  const cleared = Math.min(step, 9);
  return (
    <View style={styles.demo} accessible accessibilityLabel={m.welcome.demoA11y}>
      {DEMO_LAYOUT.map((value) => {
        const done = value <= cleared;
        const next = value === cleared + 1;
        return (
          <View key={value} style={[styles.demoTile, done && styles.demoDone, next && styles.demoNext]}>
            <Text style={[styles.demoText, done && styles.demoTextDone]}>{value}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Pillar({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <View style={styles.pillar}>
      {icon}
      <View style={styles.pillarText}>
        <Text style={styles.pillarTitle}>{title}</Text>
        <Text style={ui.body}>{text}</Text>
      </View>
    </View>
  );
}

function StopwatchIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28" accessibilityElementsHidden>
      <Circle cx={14} cy={16} r={9} fill="none" stroke={colors.green} strokeWidth={2.2} />
      <Path d="M14 16 L18 12 M11 3 H17 M14 3 V7" fill="none" stroke={colors.green} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

function FlagIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28" accessibilityElementsHidden>
      <Path d="M6 25 V4" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M6 5 H22 V15 H6 Z" fill="none" stroke={colors.text} strokeWidth={2.2} strokeLinejoin="round" />
      <Path d="M6 5 H10 V10 H6 Z M14 5 H18 V10 H14 Z M10 10 H14 V15 H10 Z M18 10 H22 V15 H18 Z" fill={colors.text} />
    </Svg>
  );
}

function ChartIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28" accessibilityElementsHidden>
      <Path d="M4 23 H24" fill="none" stroke={colors.purple} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M7 19 V14 M12 19 V10 M17 19 V12 M22 19 V6" fill="none" stroke={colors.purple} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.carbon },
  content: { padding: 20, paddingTop: 8, maxWidth: 480, width: '100%', alignSelf: 'center' },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  top: { alignItems: 'center', gap: 8, marginTop: 16 },
  tagline: { fontSize: 12, letterSpacing: 1.6 },
  demo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    width: 3 * 52 + 2 * 6,
    alignSelf: 'center',
    marginTop: 22,
  },
  demoTile: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoDone: { backgroundColor: colors.carbon },
  demoNext: { borderWidth: 2, borderColor: colors.green },
  demoText: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
  demoTextDone: { color: colors.muted, opacity: 0.5 },
  title: { textAlign: 'center', marginTop: 22 },
  body: { textAlign: 'center', marginTop: 8, fontSize: 15, lineHeight: 22 },
  pillars: { marginTop: 18, padding: 16, gap: 14 },
  pillar: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  pillarText: { flex: 1, gap: 2 },
  pillarTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  gamesLabel: { marginTop: 18 },
  games: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
  },
  chipOn: { borderColor: colors.red, backgroundColor: colors.surface2 },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  chipTextSoon: { fontFamily: fonts.body, color: colors.muted },
  primary: {
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  primaryText: { fontFamily: fonts.heading, fontSize: 22, letterSpacing: 1.5, color: colors.white },
  note: { textAlign: 'center', marginTop: 6, fontSize: 13 },
  skip: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20 },
  skipText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.muted },
});
