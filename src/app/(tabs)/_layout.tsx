import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import { useMessages } from '@/i18n';
import { colors } from '@/theme';

export default function TabsLayout() {
  const m = useMessages();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.carbon } }}>
      <Tabs.Screen name="index" options={{ title: m.tabs.home }} />
      <Tabs.Screen name="practice" options={{ title: m.tabs.practice }} />
      <Tabs.Screen name="rooms" options={{ title: m.tabs.race }} />
      <Tabs.Screen name="stats" options={{ title: m.tabs.stats }} />
      <Tabs.Screen name="profile" options={{ title: m.tabs.profile }} />
    </Tabs>
  );
}
