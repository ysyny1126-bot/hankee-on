import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { notify } from '@/components/dialog';
import { Button, Card, Chip, Emoji, Empty, ListItem, Row, Screen, Segmented, T } from '@/components/ui';
import { color, space } from '@/constants/tokens';
import { actions, findRecipe, useAppState } from '@/data/store';
import type { MealType } from '@/data/types';
import { MEAL_LABEL } from '@/logic/analysis';
import { addDays, formatKoreanDate, toDateKey } from '@/logic/dates';
import { matchRecipe } from '@/logic/inventory';
import { generatePlan } from '@/logic/planner';

export default function Meal() {
  const s = useAppState();
  const today = toDateKey();
  const params = useLocalSearchParams<{ view?: 'today' | 'week' }>();
  // 오늘 한 끼부터. 주간 계획 습관이면 일주일 보기로 시작(언제든 바꿀 수 있음)
  const [view, setView] = useState<'today' | 'week'>(params.view ?? s.preferences.planHabit ?? 'today');
  const [withBreakfast, setWithBreakfast] = useState(false);
  const dates = view === 'today' ? [today] : Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const types: MealType[] = withBreakfast ? ['breakfast', 'lunch', 'dinner'] : ['lunch', 'dinner'];

  const generate = () => {
    if (!s.ingredients.length) notify('냉장고가 비어 있어요', '재료를 등록하면 보유 재료 위주로 짜 드려요. 지금은 기본 레시피로 만들게요.');
    actions.setMealPlan(generatePlan(s, today, dates.length, types), dates);
  };

  const planned = s.mealPlan.filter((p) => dates.includes(p.date));

  const shopAll = () => {
    const items = planned.flatMap((p) => {
      const r = findRecipe(s, p.recipeId);
      if (!r) return [];
      return matchRecipe(r, s.ingredients, s.preferences.allergies).missingRequired.map((i) => ({ name: i.name, amount: i.amount, unit: i.unit, reason: `식단: ${r.name}`, recipeId: r.id }));
    });
    const n = actions.addShopping(items);
    notify(n ? `장보기 목록에 ${n}개 담았어요` : '더 살 재료가 없어요', '같은 재료는 한 번만 담았어요.');
  };

  return (
    <Screen edges={['bottom']}>
      <Segmented options={[{ key: 'today', label: '오늘' }, { key: 'week', label: '이번 주(7일)' }]} value={view} onChange={setView} />
      <Row>
        <Chip label="아침 포함" selected={withBreakfast} onPress={() => setWithBreakfast(!withBreakfast)} />
        <T v="tiny" c={color.textMuted} style={{ flex: 1 }}>알레르기·기피 음식 제외 · 임박 재료 우선 · {s.preferences.maxCookMinutes}분 기준</T>
      </Row>
      <Row gap={space.sm}>
        <Button title={planned.length ? '다시 짜기' : `${view === 'today' ? '오늘' : '7일'} 식단 만들기`} icon="✨" style={{ flex: 1 }} onPress={generate} />
        {planned.length > 0 && <Button title="부족 재료 담기" icon="🛒" kind="secondary" style={{ flex: 1 }} onPress={shopAll} />}
      </Row>

      {planned.length === 0 ? (
        <Empty emoji="🗓️" title="아직 식단이 없어요" body="냉장고 재료와 취향을 바탕으로 한 번에 짜 드려요. 마음에 안 드는 끼니는 빼면 돼요." />
      ) : (
        dates.map((d) => {
          const entries = planned.filter((p) => p.date === d).sort((a, b) => ['breakfast', 'lunch', 'dinner', 'snack'].indexOf(a.mealType) - ['breakfast', 'lunch', 'dinner', 'snack'].indexOf(b.mealType));
          if (!entries.length) return null;
          return (
            <Card key={d}>
              <T v="bodyBold" c={d === today ? color.brandDark : color.text}>{d === today ? '오늘 · ' : ''}{formatKoreanDate(d)}</T>
              {entries.map((p) => {
                const r = findRecipe(s, p.recipeId);
                if (!r) return null;
                return (
                  <View key={p.id}>
                    <ListItem href={`/recipe/${r.id}`} left={<Emoji size={22}>{r.emoji}</Emoji>} title={`${MEAL_LABEL[p.mealType]} · ${r.name}`} sub={p.reason}
                      right={<Pressable onPress={() => actions.removeMealPlan(p.id)} hitSlop={8}><T v="small" c={color.textMuted}>빼기</T></Pressable>} />
                  </View>
                );
              })}
            </Card>
          );
        })
      )}
    </Screen>
  );
}
