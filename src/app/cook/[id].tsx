import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { notify } from '@/components/dialog';
import { Badge, Button, Card, Empty, Row, Screen, Segmented, Stepper, T } from '@/components/ui';
import { color, space } from '@/constants/tokens';
import { actions, findRecipe, useAppState } from '@/data/store';
import type { MealType } from '@/data/types';
import { findFoodReference } from '@/data/catalog';
import { guessMealType, nowTime, toDateKey, newId } from '@/logic/dates';
import { matchRecipe, proposeDeduction } from '@/logic/inventory';

/**
 * 요리 완료 → (1) 사용한 재료를 재고에서 차감 (2) 완성한 음식을 식사 기록으로 저장.
 * 단위가 달라 자동 계산이 안 되는 재료는 사용자가 직접 양을 정한다.
 */
export default function CookComplete() {
  const { id, scale: scaleParam } = useLocalSearchParams<{ id: string; scale?: string }>();
  const s = useAppState();
  const recipe = findRecipe(s, id);
  const scale = Number(scaleParam) || 1;
  const m = recipe ? matchRecipe(recipe, s.ingredients, s.preferences.allergies, scale) : null;
  const usable = m?.matches.filter((x) => x.stock) ?? [];

  const [amounts, setAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(usable.map((x) => [x.stock!.id, proposeDeduction(x)])),
  );
  const [saveMeal, setSaveMeal] = useState(true);
  const [mealType, setMealType] = useState<MealType>(guessMealType());
  const [eaten, setEaten] = useState(scale);

  if (!recipe || !m) return <Screen><Empty emoji="🤔" title="레시피를 찾을 수 없어요" /></Screen>;

  const done = () => {
    const ded = Object.entries(amounts).map(([ingredientId, amount]) => ({ ingredientId, amount }));
    const rec = actions.completeCooking(recipe, ded);
    if (saveMeal) {
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
    notify('맛있게 드세요! 🍽️', `재고 ${rec.usedIngredients.length}개를 차감했어요.${saveMeal ? '\n식사 기록에도 저장했어요.' : ''}`);
    router.dismissAll();
    router.replace('/');
  };

  return (
    <Screen edges={['bottom']} footer={<Button title="완료하고 저장" kind="fresh" onPress={done} />}>
      <T v="h2">{recipe.emoji} {recipe.name} 완성!</T>
      <Card>
        <T v="h3">냉장고에서 뺄 양</T>
        <T v="small" c={color.textSub}>실제로 쓴 만큼 고쳐 주세요. 0이면 빼지 않아요.</T>
        {usable.length === 0 && <T v="small" c={color.textMuted}>냉장고에 등록된 재료를 쓰지 않았어요.</T>}
        {usable.map((x) => (
          <Row key={x.stock!.id} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
            <View style={{ flex: 1 }}>
              <T v="bodyBold">{x.stock!.emoji} {x.stock!.name}</T>
              <T v="small" c={color.textSub}>보유 {x.stock!.quantity}{x.stock!.unit} · 레시피 {x.need.amount}{x.need.unit}</T>
              {x.status === 'unknown_amount' && <Badge label="단위가 달라 직접 입력" tone="info" />}
            </View>
            <Row gap={4}>
              <Stepper value={amounts[x.stock!.id] ?? 0} onChange={(n) => setAmounts((a) => ({ ...a, [x.stock!.id]: Math.min(n, x.stock!.quantity) }))} step={x.stock!.unit === 'g' || x.stock!.unit === 'ml' ? 10 : 0.5} />
              <T v="small">{x.stock!.unit}</T>
            </Row>
          </Row>
        ))}
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h3">식사 기록에도 저장</T>
          <Switch value={saveMeal} onValueChange={setSaveMeal} trackColor={{ true: color.brand, false: color.border }} />
        </Row>
        {saveMeal && (
          <>
            <Segmented options={[{ key: 'breakfast', label: '아침' }, { key: 'lunch', label: '점심' }, { key: 'dinner', label: '저녁' }, { key: 'snack', label: '간식' }]} value={mealType} onChange={setMealType} />
            <Row style={{ justifyContent: 'space-between' }}>
              <T c={color.textSub}>먹은 양</T>
              <Row gap={4}><Stepper value={eaten} onChange={setEaten} step={0.5} /><T v="small">인분</T></Row>
            </Row>
          </>
        )}
      </Card>
      <View style={{ height: space.sm }} />
    </Screen>
  );
}
