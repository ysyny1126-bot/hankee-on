import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Row, T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
import { useAppState } from '@/data/store';
import { daysSince } from '@/logic/dates';

/**
 * E16 첫 주 안내: 가입 후 7일 동안, 부담 없는 3단계(재료 넣기 → 한 끼 요리 → 식사 기록).
 * 실제 기록으로 완료를 판단하고, 셋 다 하면 사라진다.
 */
export function FirstWeekGuide() {
  const s = useAppState();
  const start = s.consents.agreedAt;
  if (!start || daysSince(start) >= 7) return null;
  const steps = [
    { done: s.ingredients.filter((i) => i.kind !== 'leftover').length >= 3 || (s.spend?.length ?? 0) >= 3, label: '냉장고 재료 3개 넣기', sub: '사진 한 장이나 직접 입력', href: '/scan/fridge' as const },
    { done: s.cooks.length > 0, label: '한 끼 요리해 보기', sub: '홈의 오늘 메뉴로 시작', href: '/cook' as const },
    { done: s.meals.length > 0, label: '먹은 것 하나 기록하기', sub: '이름만 적어도 돼요', href: '/meal-record/edit' as const },
  ];
  const n = steps.filter((x) => x.done).length;
  if (n === steps.length) return null;
  return (
    <View style={{ backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, gap: 8, borderWidth: 1, borderColor: color.border }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="bodyBold">첫 주 가볍게 시작하기</T>
        <T v="small" c={color.brandDark} style={{ fontWeight: '700' }}>{n}/{steps.length}</T>
      </Row>
      {steps.map((x) => (
        <Pressable
          key={x.label}
          disabled={x.done}
          onPress={() => router.push(x.href)}
          accessibilityRole="button"
          accessibilityState={{ checked: x.done }}
          accessibilityLabel={`${x.label}${x.done ? ', 완료' : ''}`}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, opacity: pressed ? 0.7 : 1 })}>
          <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: x.done ? color.brandDark : color.surfaceAlt }}>
            {x.done ? <T v="tiny" c="#fff" style={{ fontWeight: '800' }}>✓</T> : null}
          </View>
          <View style={{ flex: 1 }}>
            <T v="bodyBold" c={x.done ? color.textMuted : color.text} style={x.done ? { textDecorationLine: 'line-through' } : undefined}>{x.label}</T>
            {!x.done ? <T v="tiny" c={color.textSub}>{x.sub}</T> : null}
          </View>
          {!x.done ? <Icon name="chevron" size={16} c={color.textMuted} /> : null}
        </Pressable>
      ))}
    </View>
  );
}
