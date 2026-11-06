import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Card } from '@/components/ui';
import { STEPS, type StepId, type StepsProgress } from '@/game';
import { useMessages } from '@/i18n';
import { useAccount } from '@/net/account';
import { useOnboarding } from '@/store/onboarding';
import { colors, fonts, label } from '@/theme';

/** Where each step takes the player. */
function openStep(id: StepId, isAccount: boolean) {
  switch (id) {
    case 'trial':
      return router.push({ pathname: '/race', params: { trial: '1' } });
    case 'sprint':
      return router.push({ pathname: '/race', params: { track: 'sprint', mode: 'ascending', laps: '3' } });
    case 'street':
      return router.push({ pathname: '/race', params: { track: 'street', mode: 'ascending', laps: '3' } });
    case 'bots':
      return router.push('/bots');
    case 'quick':
      return isAccount ? router.push('/quick') : router.navigate('/profile');
  }
}

/** Home for a new player: a checklist from the practice lap to online races. */
export function FirstSteps({ progress }: { progress: StepsProgress }) {
  const m = useMessages();
  const s = m.steps;
  const hideSteps = useOnboarding((state) => state.hideSteps);
  const isAccount = useAccount((state) => !state.isGuest && !state.needsNick);

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <Text style={label}>{s.label(progress.doneCount, progress.total)}</Text>
        <Pressable onPress={hideSteps} accessibilityRole="button" hitSlop={10}>
          <Text style={styles.hide}>{s.hide}</Text>
        </Pressable>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(progress.doneCount / progress.total) * 100}%` }]} />
      </View>

      {STEPS.map((id) => {
        const done = progress.isDone(id);
        const current = id === progress.current;
        const text = s[id];
        const body = (
          <>
            <View style={[styles.mark, done && styles.markDone, current && styles.markCurrent]}>
              {done && (
                <Svg width={14} height={14} viewBox="0 0 14 14">
                  <Path
                    d="M2 7.5 L5.5 11 L12 3.5"
                    fill="none"
                    stroke={colors.carbon}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              )}
            </View>
            <View style={styles.text}>
              <Text style={[styles.title, done && styles.titleDone, current && styles.titleCurrent]}>
                {text.title}
              </Text>
              {!done && <Text style={styles.meta}>{text.meta}</Text>}
            </View>
            {current && (
              <View style={styles.go}>
                <Text style={styles.goText}>{s.go}</Text>
              </View>
            )}
          </>
        );
        return (
          <Pressable
            key={id}
            onPress={() => openStep(id, isAccount)}
            accessibilityRole="button"
            accessibilityState={{ checked: done }}
            accessibilityLabel={`${text.title}${done ? `, ${s.doneA11y}` : ''}`}
            style={({ pressed }) => [styles.row, current && styles.rowCurrent, pressed && styles.pressed]}>
            {body}
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 22, padding: 16, gap: 8 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  hide: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.muted },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden', marginBottom: 4 },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.green },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 6, paddingHorizontal: 4 },
  rowCurrent: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  pressed: { opacity: 0.8 },
  mark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markDone: { backgroundColor: colors.green, borderColor: colors.green },
  markCurrent: { borderColor: colors.red },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.body, fontSize: 15, color: colors.text },
  titleDone: { color: colors.muted, textDecorationLine: 'line-through' },
  titleCurrent: { fontFamily: fonts.bodySemi },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  go: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goText: { fontFamily: fonts.heading, fontSize: 17, letterSpacing: 1, color: colors.white },
});
