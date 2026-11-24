import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Row, T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
import { actions } from '@/data/store';
import type { AppState, MealType } from '@/data/types';
import { MEAL_LABEL } from '@/logic/analysis';
import { INTENTS, outsideAdvice, type Intent } from '@/logic/meal-intent';

/** 끼니 전 '어떻게 먹을까요?' — 집밥 · 외식 · 간단히(편의점). 고르면 아래 카드의 추천 방향이 바뀐다 */
export function IntentBar({ date, slot, value }: { date: string; slot: MealType; value: Intent }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <T v="small" c={color.textSub}>{MEAL_LABEL[slot]}은 어떻게 먹을까요?</T>
      <Row gap={4}>
        {INTENTS.map((o) => {
          const on = value === o.key;
          return (
            <Pressable
              key={o.key}
              onPress={() => actions.setMealIntent(date, slot, o.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${MEAL_LABEL[slot]} ${o.label}`}
              hitSlop={4}
              style={{ minHeight: 34, paddingHorizontal: 10, borderRadius: 999, justifyContent: 'center', borderWidth: 1, borderColor: on ? color.brandDark : color.borderStrong, backgroundColor: on ? color.brandSoft : color.surface }}>
              <T v="tiny" c={on ? color.brandDark : color.textSub} style={{ fontWeight: '700' }}>{o.emoji} {o.label}</T>
            </Pressable>
          );
        })}
      </Row>
    </Row>
  );
}

/** 외식·간단히를 골랐을 때의 카드: 고르는 기준 몇 줄 + 곧 상할 재료는 내일 집밥으로 + 다녀와서 기록 */
export function OutsideCard({ s, slot, kind }: { s: AppState; slot: MealType; kind: Intent }) {
  const a = outsideAdvice(s, kind);
  const title = kind === 'eat_out' ? '밖에서 먹을 땐 이렇게 골라요' : '편의점에서 간단히 먹을 땐';
  return (
    <View style={{ gap: space.sm }}>
      <Row>
        <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: color.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 28 }}>{kind === 'eat_out' ? '🍽️' : '🏪'}</Text>
        </View>
        <T v="h3" style={{ flex: 1 }}>{title}</T>
      </Row>
      {a.lines.map((l) => (
        <Row key={l} style={{ alignItems: 'flex-start' }}>
          <T v="small" c={color.brandDark}>✓</T>
          <T v="small" style={{ flex: 1 }}>{l}</T>
        </Row>
      ))}
      {a.tomorrow ? (
        <View style={{ backgroundColor: color.warnSoft, borderRadius: radius.md, padding: space.sm, gap: 6 }}>
          <T v="small">🥬 {a.tomorrow.line}</T>
          <Pressable
            onPress={() => actions.chooseMeal(a.tomorrow!.date, a.tomorrow!.slot, a.tomorrow!.recipe.id, `${a.tomorrow!.ingredient} 기한 전에 쓰기`)}
            accessibilityRole="button"
            style={{ alignSelf: 'flex-start', minHeight: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: color.borderStrong, backgroundColor: color.surface, justifyContent: 'center' }}>
            <T v="tiny" c={color.brandDark} style={{ fontWeight: '700' }}>내일 식단에 넣기</T>
          </Pressable>
        </View>
      ) : null}
      <Pressable
        onPress={() => router.push(`/meal-record/edit?type=${slot}&source=${kind}`)}
        accessibilityRole="button"
        style={({ pressed }) => ({ minHeight: 50, borderRadius: 999, backgroundColor: color.brandDark, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.9 : 1 })}>
        <T v="bodyBold" c={color.onBrand}>먹고 나서 기록하기</T>
      </Pressable>
    </View>
  );
}
