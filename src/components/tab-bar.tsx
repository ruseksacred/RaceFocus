import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMessages, type Messages } from '@/i18n';
import { colors, fonts } from '@/theme';

import { Icon, type IconName } from './icons';

const TABS: Record<string, { label: keyof Messages['tabs']; icon: IconName }> = {
  index: { label: 'home', icon: 'home' },
  practice: { label: 'practice', icon: 'practice' },
  rooms: { label: 'race', icon: 'race' },
  leaders: { label: 'leaders', icon: 'leaders' },
  profile: { label: 'profile', icon: 'profile' },
};

/** Bottom tab bar: icon over label, red bar on top of the active tab. */
export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const m = useMessages();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const color = focused ? colors.white : colors.muted;
        const onPress = () => {
          if (!focused) navigateToTab(route.key);
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={m.tabs[tab.label]}
            style={[styles.tab, focused && styles.tabActive]}>
            <Icon name={tab.icon} color={color} />
            <Text style={[styles.label, { color }]}>{m.tabs[tab.label]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: 'transparent',
  },
  tabActive: { borderTopColor: colors.red },
  label: { fontFamily: fonts.bodySemi, fontSize: 12 },
});
