import { Redirect, router, type Href } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { T } from '@/components/ui';
import { color, radius, shadow, space } from '@/constants/tokens';
import { useAppState } from '@/data/store';

const TAB_ICON: Record<string, IconName> = { index: 'home', cook: 'pot', log: 'book', my: 'user' };

/**
 * 하단 탭: 바닥에 붙은 흰 막대. 아이콘+이름을 항상 보여 주고, 지금 탭만 초록으로.
 * 가운데 + 는 '만들기'(냉장고 찍기·식사 기록 등) — 기존 구조를 그대로 쓴다.
 */
function BottomBar({ state, descriptors, emitter, navigateToTab, onAdd }: BottomTabBarProps & { onAdd: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: color.surface, borderTopWidth: 1, borderTopColor: color.border, paddingBottom: Math.max(8, insets.bottom), shadowColor: '#3B2A14', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 8 }}>
      <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center', height: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}>
        {state.routes.map((route, i) => {
          if (route.name === 'add') {
            return (
              <View key={route.key} style={{ flex: 1, alignItems: 'center' }}>
                <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel="추가하기: 냉장고 찍기, 먹은 음식 기록" style={({ pressed }) => ({ width: 56, height: 56, marginTop: -26, borderRadius: 28, backgroundColor: color.brandDark, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: color.surface, opacity: pressed ? 0.85 : 1, ...shadow.button })}>
                  <Icon name="plus" c={color.onBrand} size={24} stroke={2.4} />
                </Pressable>
                <T v="tiny" c={color.textSub} style={{ fontWeight: '700', marginTop: 2 }}>추가</T>
              </View>
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
              style={{ flex: 1, height: 66, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
              {/* 선택된 탭: 옅은 초록 알약 + 진한 아이콘 + 굵은 라벨(색만으로 구분하지 않음) */}
              <View style={{ width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? color.brandSoft : 'transparent' }}>
                <Icon name={TAB_ICON[route.name] ?? 'home'} size={22} c={focused ? color.brandDark : color.textMuted} stroke={focused ? 2.4 : 1.9} />
              </View>
              <T v="tiny" c={focused ? color.brandDark : color.textMuted} style={{ fontWeight: focused ? '800' : '600' }}>{label}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const ADD_ITEMS: { icon: IconName; label: string; sub: string; href: Href }[] = [
  { icon: 'fridge', label: '냉장고 찍기', sub: '사진으로 재료 등록', href: '/scan/fridge' },
  { icon: 'camera', label: '먹은 음식 기록', sub: '사진이나 메모로', href: '/meal-record/edit' },
  { icon: 'utensils', label: '음식 → 레시피', sub: '사진 속 음식 만들기', href: '/scan/food' },
  { icon: 'pencil', label: '재료 직접 추가', sub: '이름·수량·기한', href: '/ingredient/edit' },
];

/** 하단 탭: 홈 · 요리 · ⊕ · 기록 · 나 */
export default function TabLayout() {
  const { onboarded } = useAppState();
  const [addOpen, setAddOpen] = useState(false);
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <>
      <Tabs
        tabBar={(props) => <BottomBar {...props} onAdd={() => setAddOpen(true)} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bg } }}>
        <Tabs.Screen name="index" options={{ title: '홈' }} />
        <Tabs.Screen name="cook" options={{ title: '메뉴' }} />
        <Tabs.Screen name="add" options={{ title: '추가' }} />
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
              style={({ pressed }) => ({ width: '48%', flexGrow: 1, alignItems: 'flex-start', gap: 6, padding: space.lg, minHeight: 110, borderRadius: radius.lg, backgroundColor: color.surfaceAlt, opacity: pressed ? 0.85 : 1 })}>
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={it.icon} size={21} c={color.brandDark} />
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
