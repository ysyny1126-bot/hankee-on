import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { Text } from 'react-native';

import { color } from '@/constants/tokens';
import { useAppState } from '@/data/store';

const icon = (e: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{e}</Text>;
  };

export default function TabLayout() {
  const { onboarded } = useAppState();
  if (!onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.brandDark,
        tabBarInactiveTintColor: color.textMuted,
        tabBarStyle: { backgroundColor: color.surface, borderTopColor: color.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        sceneStyle: { backgroundColor: color.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: 'HOME', tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="fridge" options={{ title: '냉장고', tabBarIcon: icon('🧊') }} />
      <Tabs.Screen name="cook" options={{ title: 'COOK', tabBarIcon: icon('🍳') }} />
      <Tabs.Screen name="meal" options={{ title: '식단', tabBarIcon: icon('🗓️') }} />
      <Tabs.Screen name="my" options={{ title: 'MY', tabBarIcon: icon('🙂') }} />
    </Tabs>
  );
}
