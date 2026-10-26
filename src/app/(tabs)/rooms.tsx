import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/icons';
import { Screen, ui } from '@/components/ui';
import { useMessages } from '@/i18n';
import { colors, fonts, label } from '@/theme';

/** Race tab: picks the kind of race. Each mode is a tile; new modes get a tile here. */
export default function RaceHub() {
  const m = useMessages();
  const h = m.raceHub;
  return (
    <Screen>
      <Text style={label}>{h.label}</Text>
      <Text style={ui.title}>{h.title}</Text>
      <Text style={[ui.body, styles.intro]}>{h.intro}</Text>

      <View style={styles.tiles}>
        <Tile icon="friends" title={h.friendsTitle} body={h.friendsBody} href="/friends" featured />
        <Tile icon="calendar" title={h.dailyTitle} body={h.dailyBody} soon={h.soon} />
        <Tile icon="bolt" title={h.quickTitle} body={h.quickBody} soon={h.soon} />
        <Tile icon="trophy" title={h.championshipTitle} body={h.championshipBody} soon={h.soon} />
      </View>
    </Screen>
  );
}

function Tile({
  icon,
  title,
  body,
  href,
  soon,
  featured,
}: {
  icon: IconName;
  title: string;
  body: string;
  /** Where the tile leads; tiles without one are not available yet. */
  href?: '/friends';
  /** "Soon" tag for modes that are not built yet. */
  soon?: string;
  featured?: boolean;
}) {
  const content = (
    <>
      <View style={[styles.iconBox, featured && styles.iconBoxFeatured]}>
        <Icon name={icon} color={featured ? colors.white : colors.muted} size={26} />
      </View>
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, !href && styles.muted]}>{title}</Text>
          {soon && <Text style={styles.soon}>{soon}</Text>}
        </View>
        <Text style={styles.body}>{body}</Text>
      </View>
      {href && <Text style={styles.chevron}>›</Text>}
    </>
  );

  if (!href) {
    return (
      <View style={[styles.tile, styles.tileSoon]} accessible accessibilityLabel={`${title}. ${soon ?? ''}`}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.tile, featured && styles.tileFeatured, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: 4 },
  tiles: { gap: 12, marginTop: 20 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tileFeatured: { borderColor: colors.red, borderWidth: 2, padding: 15 },
  tileSoon: { borderStyle: 'dashed' },
  pressed: { opacity: 0.85 },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxFeatured: { backgroundColor: colors.red },
  text: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 28, color: colors.text },
  muted: { color: colors.muted },
  soon: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.muted,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  body: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
  chevron: { fontFamily: fonts.bodySemi, fontSize: 28, color: colors.text },
});
