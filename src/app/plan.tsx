import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { notify } from '@/components/dialog';
import { Badge, Button, Card, Chip, Emoji, Empty, ListItem, Row, Screen, Segmented, T } from '@/components/ui';
import { PlanCatchUp } from '@/components/plan-catch-up';
import { color, space } from '@/constants/tokens';
import { actions, findRecipe, useAppState } from '@/data/store';
import type { MealType } from '@/data/types';
import { MEAL_LABEL } from '@/logic/analysis';
import { addDays, formatKoreanDate, toDateKey } from '@/logic/dates';
import { consumeVirtual, matchRecipe, round } from '@/logic/inventory';
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

  /** 식단 순서대로 가상 재고에서 빼 가며, 모자라는 양을 재료별로 합쳐 장보기에 담는다(R4) */
  const shopAll = () => {
    const ORDER_T = ['breakfast', 'lunch', 'dinner', 'snack'];
    const sorted = [...planned].sort((a, b) => a.date.localeCompare(b.date) || ORDER_T.indexOf(a.mealType) - ORDER_T.indexOf(b.mealType));
    let stock = s.ingredients;
    const need = new Map<string, { name: string; amount: number; unit: string; recipes: string[]; recipeId: string }>();
    for (const p of sorted) {
      if (p.status === 'done' || p.leftoverId) continue; // 먹은 끼니·남은 음식 끼니는 장볼 필요 없음
      const r = findRecipe(s, p.recipeId);
      if (!r) continue;
      const m = matchRecipe(r, stock, s.preferences.allergies);
      for (const x of m.matches) {
        if (x.need.optional || x.status === 'staple' || x.status === 'have' || x.status === 'unknown_amount') continue;
        const short = x.status === 'low' && x.have != null ? x.need.amount - x.have : x.need.amount;
        const k = `${x.need.name}|${x.need.unit}`;
        const cur = need.get(k) ?? { name: x.need.name, amount: 0, unit: x.need.unit, recipes: [], recipeId: r.id };
        cur.amount = round(cur.amount + short);
        if (!cur.recipes.includes(r.name)) cur.recipes.push(r.name);
        need.set(k, cur);
      }
      stock = consumeVirtual(stock, r);
    }
    const items = [...need.values()].map((v) => ({ name: v.name, amount: v.amount, unit: v.unit, reason: `식단: ${v.recipes.join('·')}`, recipeId: v.recipeId }));
    const n = actions.addShopping(items);
    notify(n ? `장보기 목록에 ${n}개 담았어요` : '더 살 재료가 없어요', '앞 끼니에서 쓰는 양까지 계산해 재료별로 합쳤어요.');
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

      <PlanCatchUp />

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
                const lo = p.leftoverId ? s.ingredients.find((i) => i.id === p.leftoverId) : undefined;
                if (!r && !lo) return null;
                if (p.leftoverId && !lo && p.status !== 'done') return null; // 남은 음식을 이미 다 먹었거나 정리함
                const name = lo ? `남은 ${lo.name}` : r!.name;
                const done = p.status === 'done';
                return (
                  <View key={p.id} style={{ opacity: done ? 0.6 : 1 }}>
                    <ListItem
                      href={lo ? '/fridge' : `/recipe/${r!.id}`}
                      left={<Emoji size={22}>{lo ? '🥡' : r!.emoji}</Emoji>}
                      title={`${MEAL_LABEL[p.mealType]} · ${name}`}
                      sub={done ? '먹고 기록했어요' : p.reason}
                      right={
                        done ? <Badge label="먹음 ✓" tone="fresh" /> : (
                          <Row gap={10}>
                            {lo && d === today ? (
                              <Pressable onPress={() => { actions.eatLeftover(lo.id, 1, p.mealType); notify('맛있게 드세요!', '식사 기록에 남기고 이 끼니를 완료로 표시했어요.'); }} hitSlop={8}>
                                <T v="small" c={color.brandDark} style={{ fontWeight: '700' }}>먹기</T>
                              </Pressable>
                            ) : null}
                            <Pressable onPress={() => actions.removeMealPlan(p.id)} hitSlop={8}><T v="small" c={color.textMuted}>빼기</T></Pressable>
                          </Row>
                        )
                      }
                    />
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
