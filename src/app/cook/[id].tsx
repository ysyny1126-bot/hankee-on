import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { notify } from '@/components/dialog';
import { Badge, Button, Card, Chip, Empty, OnOff, Row, Screen, Segmented, Stepper, T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
import { findFoodReference } from '@/data/catalog';
import { actions, findRecipe, useAppState } from '@/data/store';
import type { CookRating, MealType } from '@/data/types';
import { addDays, guessMealType, newId, nowTime, toDateKey } from '@/logic/dates';
import { matchRecipe, proposeDeduction, round } from '@/logic/inventory';

const RATINGS: { key: CookRating; emoji: string; label: string }[] = [
  { key: 'good', emoji: '😋', label: '맛있어요' },
  { key: 'ok', emoji: '🙂', label: '괜찮아요' },
  { key: 'bad', emoji: '😕', label: '별로' },
];

/**
 * 요리 완료
 * (1) 맛 평가 → 다음 추천에 기억  (2) 쓴 재료 차감
 * (3) 먹은 양 → 식사 기록  (4) 남은 양 → '남은 음식'으로 냉장고에
 */
export default function CookComplete() {
  const { id, scale: scaleParam } = useLocalSearchParams<{ id: string; scale?: string }>();
  const s = useAppState();
  const recipe = findRecipe(s, id);
  const made = Number(scaleParam) || 1;
  const m = recipe ? matchRecipe(recipe, s.ingredients, s.preferences.allergies, made) : null;
  const usable = m?.matches.filter((x) => x.stock) ?? [];

  const [amounts, setAmounts] = useState<Record<string, number>>(() => Object.fromEntries(usable.map((x) => [x.stock!.id, proposeDeduction(x)])));
  const [rating, setRating] = useState<CookRating | null>(null);
  const [saveMeal, setSaveMeal] = useState(true);
  const [mealType, setMealType] = useState<MealType>(guessMealType());
  const [eaten, setEaten] = useState(made > 1 ? 1 : made);
  const [leftoverExpiry, setLeftoverExpiry] = useState<string | null>(null);
  const left = round(made - eaten);

  if (!recipe || !m) return <Screen><Empty emoji="🤔" title="레시피를 찾을 수 없어요" /></Screen>;

  const done = () => {
    const ded = Object.entries(amounts).map(([ingredientId, amount]) => ({ ingredientId, amount }));
    const rec = actions.completeCooking(recipe, ded, { rating: rating ?? undefined, servingsMade: made, servingsEaten: eaten, leftoverExpiry });
    if (saveMeal && eaten > 0) {
      const ref = findFoodReference(recipe.name);
      actions.addMeal({
        mealDate: toDateKey(),
        mealType,
        mealTime: nowTime(),
        imageUri: recipe.imageUri ?? null,
        description: '한끼온 레시피로 직접 요리',
        sourceType: 'home',
        recipeId: recipe.id,
        items: [
          {
            id: newId('item_'),
            foodName: recipe.name,
            quantity: eaten,
            unit: '인분',
            nutrition: recipe.nutrition ?? null,
            dataConfidence: recipe.nutrition ? 'medium' : 'none',
            nutritionSource: recipe.nutrition ? (recipe.origin === 'builtin' ? 'reference_estimated' : 'ai_estimated') : null,
            vegetableServings: ref?.vegetableServings,
            ingredients: recipe.ingredients.filter((i) => !i.optional || rec.usedIngredients.some((u) => u.name === i.name)).map((i) => i.name),
          },
        ],
      });
    }
    const lines = [`재료 ${rec.usedIngredients.length}개 차감`];
    if (saveMeal && eaten > 0) lines.push('식사 기록 저장');
    if (left > 0) lines.push(`남은 ${recipe.name} ${left}인분 냉장고에`);
    if (rating) lines.push('맛 평가 기억');
    notify('맛있게 드세요! 🍽️', lines.join('\n'));
    router.dismissAll();
    // 식사 기록을 남겼으면 기록 탭에서 바로 확인
    router.replace(saveMeal && eaten > 0 ? '/log' : '/');
  };

  return (
    <Screen edges={['bottom']} footer={<Button title="완료하고 저장" kind="fresh" onPress={done} />}>
      <T v="h2">{recipe.emoji} {recipe.name} 완성!</T>

      {/* 1. 맛 평가 */}
      <Card>
        <T v="h3">어땠어요?</T>
        <Row gap={space.sm}>
          {RATINGS.map((r) => {
            const on = rating === r.key;
            return (
              <Pressable key={r.key} onPress={() => setRating(on ? null : r.key)} style={{ flex: 1, alignItems: 'center', paddingVertical: space.md, borderRadius: radius.lg, borderWidth: 2, borderColor: on ? color.brand : color.border, backgroundColor: on ? color.brandSoft : color.surface }}>
                <Text style={{ fontSize: 30 }}>{r.emoji}</Text>
                <T v="small" c={on ? color.brandDark : color.textSub} style={{ fontWeight: '700' }}>{r.label}</T>
              </Pressable>
            );
          })}
        </Row>
        {!s.consents.personalization && <T v="tiny" c={color.textMuted}>‘식생활 기억하기’를 켜면 평가가 다음 추천에 반영돼요.</T>}
      </Card>

      {/* 2. 먹은 양 · 남은 양 */}
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h3">먹은 양</T>
          <Row gap={4}><Stepper value={eaten} onChange={(n) => setEaten(Math.min(n, made))} step={0.5} /><T v="small">/ {made}인분</T></Row>
        </Row>
        {left > 0 && (
          <View style={{ backgroundColor: color.surfaceAlt, borderRadius: radius.md, padding: space.md, gap: space.sm }}>
            <T v="bodyBold">🥡 남은 {left}인분은 냉장고에 넣을게요</T>
            <T v="tiny" c={color.textSub}>언제까지 드실 건가요? (고르지 않으면 기한 없이 넣어요)</T>
            <Row wrap>
              {[0, 1, 2, 3].map((n) => {
                const d = addDays(toDateKey(), n);
                return <Chip key={n} label={n === 0 ? '오늘' : n === 1 ? '내일' : `${n}일 뒤`} selected={leftoverExpiry === d} onPress={() => setLeftoverExpiry(leftoverExpiry === d ? null : d)} />;
              })}
            </Row>
          </View>
        )}
        <Row style={{ justifyContent: 'space-between' }}>
          <T c={color.textSub}>식사 기록에 남기기</T>
          <OnOff value={saveMeal} onValueChange={setSaveMeal} />
        </Row>
        {saveMeal && <Segmented options={[{ key: 'breakfast', label: '아침' }, { key: 'lunch', label: '점심' }, { key: 'dinner', label: '저녁' }, { key: 'snack', label: '간식' }]} value={mealType} onChange={setMealType} />}
      </Card>

      {/* 3. 쓴 재료 */}
      <Card>
        <T v="h3">냉장고에서 뺄 양</T>
        {usable.length === 0 && <T v="small" c={color.textMuted}>냉장고 재료를 쓰지 않았어요.</T>}
        {usable.map((x) => (
          <Row key={x.stock!.id} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
            <View style={{ flex: 1 }}>
              <T v="bodyBold">{x.stock!.emoji} {x.stock!.name}</T>
              <T v="tiny" c={color.textSub}>보유 {x.stock!.quantity}{x.stock!.unit} · 레시피 {x.need.amount}{x.need.unit}</T>
              {x.status === 'unknown_amount' && <Badge label="단위가 달라 직접 입력" tone="info" />}
            </View>
            <Row gap={4}>
              <Stepper value={amounts[x.stock!.id] ?? 0} onChange={(n) => setAmounts((a) => ({ ...a, [x.stock!.id]: Math.min(n, x.stock!.quantity) }))} step={x.stock!.unit === 'g' || x.stock!.unit === 'ml' ? 10 : 0.5} />
              <T v="small">{x.stock!.unit}</T>
            </Row>
          </Row>
        ))}
      </Card>
      <View style={{ height: space.sm }} />
    </Screen>
  );
}
