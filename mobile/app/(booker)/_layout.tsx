import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { C } from '../../src/theme';

const icon = (glyph: string) => ({ color }: { color: string }) => (
  <Text style={{ fontSize: 18, color }}>{glyph}</Text>
);

export default function BookerTabs() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: C.ink3,
        tabBarStyle: { backgroundColor: C.paper, borderTopColor: C.line, height: 62, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        headerStyle: { backgroundColor: C.paper },
        headerTitleStyle: { fontWeight: '800', color: C.ink },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="book" options={{ title: 'Book', tabBarIcon: icon('▣') }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips', tabBarIcon: icon('▤') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon('◍') }} />
    </Tabs>
  );
}
