import Constants from 'expo-constants';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Card, Screen, SectionLabel, ui } from '@/components/ui';
import { deviceLanguage, LANGUAGES, useMessages } from '@/i18n';
import { goBack } from '@/navigation';
import { useSettings, type LanguageSetting } from '@/store/settings';
import { colors, fonts, label } from '@/theme';

/** App settings, opened from the Profile tab. */
export default function SettingsScreen() {
  const m = useMessages();
  const language = useSettings((state) => state.language);
  const setLanguage = useSettings((state) => state.setLanguage);
  const sounds = useSettings((state) => state.sounds);
  const setSounds = useSettings((state) => state.setSounds);
  const vibration = useSettings((state) => state.vibration);
  const setVibration = useSettings((state) => state.setVibration);
  // Safari on iPhone has no vibration in web pages.
  const isIosWeb =
    Platform.OS === 'web' && typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
  const phoneLanguage = LANGUAGES.find((l) => l.id === deviceLanguage())!.name;

  const options: { id: LanguageSetting; title: string; note?: string }[] = [
    { id: 'system', title: m.settings.system, note: m.settings.systemNote(phoneLanguage) },
    ...LANGUAGES.map((l) => ({ id: l.id, title: l.name })),
  ];

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={goBack} accessibilityRole="button" hitSlop={12}>
          <Text style={styles.back}>{m.settings.back}</Text>
        </Pressable>
        <Text style={label}>{m.settings.label}</Text>
      </View>
      <Text style={[ui.title, styles.title]}>{m.settings.title}</Text>

      <SectionLabel>{m.settings.language}</SectionLabel>
      <Card style={styles.list}>
        <View accessibilityRole="radiogroup">
          {options.map((option, i) => {
            const selected = option.id === language;
            return (
              <Pressable
                key={option.id}
                onPress={() => setLanguage(option.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.row, i > 0 && styles.rowBorder]}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{option.title}</Text>
                  {option.note && <Text style={styles.rowNote}>{option.note}</Text>}
                </View>
                <View style={[styles.radio, selected && styles.radioOn]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <SectionLabel>{m.settings.feedback}</SectionLabel>
      <Card style={styles.list}>
        <Toggle title={m.settings.sounds} note={m.settings.soundsNote} value={sounds} onChange={setSounds} />
        <Toggle
          title={m.settings.vibration}
          note={isIosWeb ? m.settings.vibrationWebNote : m.settings.vibrationNote}
          value={vibration}
          onChange={setVibration}
          border
        />
      </Card>

      <SectionLabel>{m.settings.about}</SectionLabel>
      <Card style={styles.about}>
        <Text style={ui.body}>{m.settings.version(Constants.expoConfig?.version ?? '1.0.0')}</Text>
      </Card>
    </Screen>
  );
}

function Toggle({
  title,
  note,
  value,
  onChange,
  border,
}: {
  title: string;
  note: string;
  value: boolean;
  onChange: (value: boolean) => void;
  border?: boolean;
}) {
  return (
    <View style={[styles.row, border && styles.rowBorder]}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowNote}>{note}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={title}
        trackColor={{ false: colors.line, true: colors.red }}
        thumbColor={colors.white}
        {...(Platform.OS === 'web' ? { activeThumbColor: colors.white } : {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.muted },
  title: { marginTop: 8 },
  list: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text },
  rowNote: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.red },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red },
  about: { padding: 16 },
});
