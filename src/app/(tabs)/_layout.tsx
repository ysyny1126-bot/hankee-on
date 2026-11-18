import { Redirect, router, type Href } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { T } from '@/components/ui';
import { color, pastel, radius, shadow, space } from '@/constants/tokens';
import { useAppState } from '@/data/store';

const TAB_ICON: Record<string, IconName> = { index: 'home', cook: 'pot', log: 'book', my: 'user' };

/**
 * 떠 있는 알약형 하단 탭(캠퍼스메이트 스타일).
 * 반투명 흰 유리 바탕, 선택된 탭만 보라 알약으로 커지며 이름이 보인다. 가운데는 만들기(+).
 */
function PillTabBar({ state, descriptors, emitter, navigateToTab, onAdd }: BottomTabBarProps & { onAdd: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingBottom: Math.max(14, insets.bottom + 6) }}>
      <View
        style={{
          width: '100%',
          maxWidth: 480,
          alignSelf: 'center',
          height: 66,
          borderRadius: radius.pill,
          backgroundColor: 'rgba(255,255,255,0.78)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.9)',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 7,
          ...shadow.float,
          ...(Platform.OS === 'web' ? ({ backdropFilter: 'saturate(1.8) blur(18px)' } as object) : null),
        }}>
        {state.routes.map((route, i) => {
          if (route.name === 'add') {
            return (
              <Pressable key={route.key} onPress={onAdd} accessibilityRole="button" accessibilityLabel="만들기" style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: color.navy, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="plus" c={color.onBrand} size={24} stroke={2.4} />
              </Pressable>
            );
          }
          const focused = state.index === i;
          const label = descriptors[route.key].options.title ?? route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigateToTab(route.key);
              }}
              style={{
                height: 52,
                minWidth: 52,
                paddingHorizontal: focused ? 16 : 0,
                borderRadius: radius.pill,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: focused ? color.brand : 'transparent',
                ...(focused ? shadow.button : null),
              }}>
              <Icon name={TAB_ICON[route.name] ?? 'home'} size={22} c={focused ? color.onBrand : '#6E7290'} />
              {focused ? <T v="small" c={color.onBrand} style={{ fontWeight: '800' }}>{label}</T> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const ADD_ITEMS: { icon: IconName; label: string; sub: string; href: Href; bg: string }[] = [
  { icon: 'fridge', label: '냉장고 찍기', sub: '사진으로 재료 등록', href: '/scan/fridge', bg: pastel.sky },
  { icon: 'camera', label: '식사 찍기', sub: '먹은 음식 기록', href: '/meal-record/edit', bg: pastel.peach },
  { icon: 'utensils', label: '음식 → 레시피', sub: '사진 속 음식 만들기', href: '/scan/food', bg: pastel.pink },
  { icon: 'pencil', label: '재료 직접 추가', sub: '이름·수량·기한', href: '/ingredient/edit', bg: pastel.mint },
];

/** 하단 탭: 홈 · 요리 · ⊕ · 기록 · 나 */
export default function TabLayout() {
  const { onboarded } = useAppState();
  const [addOpen, setAddOpen] = useState(false);
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <>
      <Tabs
        tabBar={(props) => <PillTabBar {...props} onAdd={() => setAddOpen(true)} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bg } }}>
        <Tabs.Screen name="index" options={{ title: '홈' }} />
        <Tabs.Screen name="cook" options={{ title: '요리' }} />
        <Tabs.Screen name="add" options={{ title: '만들기' }} />
        <Tabs.Screen name="log" options={{ title: '기록' }} />
        <Tabs.Screen name="my" options={{ title: '나' }} />
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
              style={({ pressed }) => ({ width: '48%', flexGrow: 1, alignItems: 'flex-start', gap: 6, padding: space.lg, minHeight: 110, borderRadius: radius.lg, backgroundColor: it.bg, opacity: pressed ? 0.85 : 1 })}>
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={it.icon} size={21} />
              </View>
              <T v="bodyBold" style={{ marginTop: 'auto' }}>{it.label}</T>
              <T v="tiny" c="rgba(21,23,42,0.7)">{it.sub}</T>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </>
  );
}
