import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { notify } from '@/components/dialog';
import { Button, Row, T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
import { actions, findRecipe, useAppState } from '@/data/store';
import type { AppState, MealPlanEntry, MealType } from '@/data/types';
import { MEAL_LABEL } from '@/logic/analysis';
import { addDays, formatKoreanDate, newId, toDateKey } from '@/logic/dates';

/** 끼니 시간이 지났다고 볼 시각(이후에도 기록이 없으면 '못 먹은 끼니'로 묻는다) */
const SLOT_END: Record<MealType, number> = { breakfast: 11, lunch: 16, dinner: 23, snack: 24 };

/** A3: 계획했지만 아직 기록이 없는 지난 끼니(최근 3일) */
export function missedPlans(s: AppState, now = new Date()): MealPlanEntry[] {
  const today = toDateKey(now);
  const from = addDays(today, -3);
  return s.mealPlan
    .filter((e) => e.status !== 'done' && e.date >= from && (e.date < today || (e.date === today && now.getHours() >= SLOT_END[e.mealType])))
    .filter((e) => !e.leftoverId || s.ingredients.some((i) => i.id === e.leftoverId))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function whenLabel(e: MealPlanEntry) {
  const today = toDateKey();
  const day = e.date === today ? '오늘' : e.date === addDays(today, -1) ? '어제' : formatKoreanDate(e.date);
  return `${day} ${MEAL_LABEL[e.mealType]}`;
}

/**
 * 계획과 실제 연결: 지난 끼니 중 기록이 없는 것을 모아
 * "먹었어요(기록) / 미루기 / 빼기" 중에 고르게 한다.
 */
export function PlanCatchUp({ max = 3, wrapStyle }: { max?: number; wrapStyle?: StyleProp<ViewStyle> }) {
  const s = useAppState();
  const list = missedPlans(s);
  if (!list.length) return null;

  const ate = (e: MealPlanEntry) => {
    const r = findRecipe(s, e.recipeId);
    const lo = e.leftoverId ? s.ingredients.find((i) => i.id === e.leftoverId) : undefined;
    if (lo) {
      actions.eatLeftover(lo.id, 1, e.mealType);
      return;
    }
    if (!r) return;
    actions.addMeal({
      mealDate: e.date,
      mealType: e.mealType,
      mealTime: `${String(Math.min(SLOT_END[e.mealType] - 2, 21)).padStart(2, '0')}:00`,
      imageUri: null,
      description: '계획한 메뉴로 먹음',
      sourceType: 'home',
      recipeId: r.id,
      items: [{
        id: newId('item_'),
        foodName: r.name,
        quantity: 1,
        unit: '인분',
        nutrition: r.nutrition ?? null,
        dataConfidence: r.nutrition ? 'medium' : 'none',
        nutritionSource: r.nutrition ? (r.origin === 'builtin' ? 'reference_estimated' : 'ai_estimated') : null,
        ingredients: r.ingredients.filter((i) => !i.optional).map((i) => i.name),
      }],
    });
    notify('기록했어요', '재료를 실제로 썼다면 냉장고에서 양을 맞춰 주세요.');
  };

  return (
    <View style={[{ backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, gap: space.sm, borderWidth: 1, borderColor: color.border }, wrapStyle]}>
      <T v="bodyBold">지난 끼니 확인</T>
      <T v="small" c={color.textSub}>계획했지만 기록이 없어요. 어떻게 됐는지 알려 주시면 식단이 맞춰져요.</T>
      {list.slice(0, max).map((e) => {
        const r = findRecipe(s, e.recipeId);
        const lo = e.leftoverId ? s.ingredients.find((i) => i.id === e.leftoverId) : undefined;
        const name = lo ? `남은 ${lo.name}` : r?.name ?? '메뉴';
        return (
          <View key={e.id} style={{ gap: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: color.border }}>
            <Row>
              <Text style={{ fontSize: 20 }}>{lo ? '🥡' : r?.emoji ?? '🍽️'}</Text>
              <T style={{ flex: 1 }}><T v="small" c={color.textSub}>{whenLabel(e)} · </T><T v="bodyBold">{name}</T></T>
            </Row>
            <Row gap={6} wrap>
              <Button small kind="secondary" title="먹었어요" onPress={() => ate(e)} />
              <Button
                small
                kind="ghost"
                title="다음으로 미루기"
                onPress={() => {
                  const to = actions.postponePlan(e.id);
                  if (to) notify('옮겼어요', `${formatKoreanDate(to)} ${MEAL_LABEL[e.mealType]}으로 옮겼어요.`);
                }}
              />
              <Button small kind="ghost" title="빼기" onPress={() => actions.removeMealPlan(e.id)} />
            </Row>
          </View>
        );
      })}
      {list.length > max ? <T v="tiny" c={color.textMuted}>그 밖에 {list.length - max}끼 더 있어요.</T> : null}
    </View>
  );
}
