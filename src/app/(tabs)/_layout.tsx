import { Redirect, router, type Href } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { T } from '@/components/ui';
import { color, radius, shadow, space } from '@/constants/tokens';
import { useAppState } from '@/data/store';

const icon = (e: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{e}</Text>;
  };

const ADD_ITEMS: { emoji: string; label: string; href: Href }[] = [
  { emoji: '🧊', label: '냉장고 찍기', href: '/scan/fridge' },
  { emoji: '🍽️', label: '식사 찍기', href: '/meal-record/edit' },
  { emoji: '🍜', label: '음식 → 레시피', href: '/scan/food' },
  { emoji: '✏️', label: '재료 직접 추가', href: '/ingredient/edit' },
];

/** 하단 탭: 홈 · 요리 · ⊕ · 기록 · 나 */
export default function TabLayout() {
  const { onboarded } = useAppState();
  const [addOpen, setAddOpen] = useState(false);
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: color.brandDark,
          tabBarInactiveTintColor: color.textMuted,
          tabBarStyle: { backgroundColor: color.surface, borderTopWidth: 0, height: 66, paddingTop: 6, ...shadow.card },
          tabBarLabelStyle: { fontSize: 11, fontFamily: 'Pretendard-Bold' },
          sceneStyle: { backgroundColor: color.bg },
        }}>
        <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: icon('🏠') }} />
        <Tabs.Screen name="cook" options={{ title: '요리', tabBarIcon: icon('🍳') }} />
        <Tabs.Screen
          name="add"
          options={{
            title: '',
            tabBarAccessibilityLabel: '만들기',
            tabBarButton: () => (
              <Pressable onPress={() => setAddOpen(true)} accessibilityRole="button" accessibilityLabel="만들기" style={{ flex: 1, alignItems: 'center' }}>
                <View style={{ width: 54, height: 54, marginTop: -14, borderRadius: 27, backgroundColor: color.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: color.surface, ...shadow.button }}>
                  <Text style={{ color: color.onBrand, fontSize: 28, lineHeight: 30, fontWeight: '600' }}>+</Text>
                </View>
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen name="log" options={{ title: '기록', tabBarIcon: icon('📒') }} />
        <Tabs.Screen name="my" options={{ title: '나', tabBarIcon: icon('🙂') }} />
      </Tabs>

      <Sheet visible={addOpen} onClose={() => setAddOpen(false)}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {ADD_ITEMS.map((it) => (
            <Pressable
              key={it.label}
              onPress={() => {
                setAddOpen(false);
                router.push(it.href);
              }}
              style={({ pressed }) => ({ width: '48%', flexGrow: 1, alignItems: 'center', gap: 6, paddingVertical: space.lg, borderRadius: radius.lg, backgroundColor: pressed ? color.brandSoft : color.surfaceAlt })}>
              <Text style={{ fontSize: 30 }}>{it.emoji}</Text>
              <T v="bodyBold">{it.label}</T>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </>
  );
}
