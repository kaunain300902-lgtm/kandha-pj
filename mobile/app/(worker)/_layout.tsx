import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useApp } from '../../src/store';
import { t } from '../../src/i18n';
import { C } from '../../src/theme';

const icon = (glyph: string) => ({ color }: { color: string }) => (
  <Text style={{ fontSize: 18, color }}>{glyph}</Text>
);

export default function WorkerTabs() {
  const { lang } = useApp();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: C.ink3,
        tabBarStyle: { backgroundColor: C.paper, borderTopColor: C.line, height: 64, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        headerStyle: { backgroundColor: C.paper },
        headerTitleStyle: { fontWeight: '800', color: C.ink },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="board" options={{ title: t(lang, 'work'), tabBarIcon: icon('▤') }} />
      <Tabs.Screen name="running" options={{ title: t(lang, 'running'), tabBarIcon: icon('▶') }} />
      <Tabs.Screen name="earnings" options={{ title: t(lang, 'earnings'), tabBarIcon: icon('₹') }} />
    </Tabs>
  );
}
