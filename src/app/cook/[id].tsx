import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { confirmAsync, notify } from '@/components/dialog';
import { isRough } from '@/logic/amount';
import { Badge, Button, Card, Chip, Empty, Field, OnOff, Row, Screen, Segmented, Stepper, T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
import { findFoodReference } from '@/data/catalog';
import { actions, findRecipe, getState, useAppState } from '@/data/store';
import { nextUse } from '@/logic/bridge';
import type { CookRating, MealType } from '@/data/types';
import { addDays, guessMealType, newId, nowTime, toDateKey } from '@/logic/dates';
import { matchRecipe, planDeduction, round } from '@/logic/inventory';

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
/** 저울 없이 고르는 '쓴 양': 레시피 양을 기준으로 덜·그대로·더·다 */
function roughUses(base: number, have: number) {
  const r = (n: number) => Math.min(have, Math.round(n * 100) / 100);
  const opts = [
    { label: '덜 씀', amount: r(base * 0.5) },
    { label: '레시피만큼', amount: r(base) },
    { label: '더 씀', amount: r(base * 1.5) },
    { label: '다 씀', amount: have },
  ];
  return opts.filter((o, i) => o.amount > 0 && opts.findIndex((x) => x.amount === o.amount) === i);
}

export default function CookComplete() {
  const { id, scale: scaleParam } = useLocalSearchParams<{ id: string; scale?: string }>();
  const s = useAppState();
  const recipe = findRecipe(s, id);
  const made = Number(scaleParam) || 1;
  const m = recipe ? matchRecipe(recipe, s.ingredients, s.preferences.allergies, made, true) : null;
  // 같은 재료가 여러 묶음이면 소비기한이 가까운 묶음부터 빼도록 미리 채운다(R1)
  const usable = (m?.matches.filter((x) => x.stocks.length) ?? []).map((x) => ({ x, plan: planDeduction(x) }));

  const [amounts, setAmounts] = useState<Record<string, number>>(() => Object.fromEntries(usable.flatMap((u) => u.plan.map((d) => [d.ingredient.id, d.amount]))));
  const [rating, setRating] = useState<CookRating | null>(null);
  const [note, setNote] = useState(s.recipeNotes[id]?.note ?? '');
  const [saveMeal, setSaveMeal] = useState(true);
  const [mealType, setMealType] = useState<MealType>(guessMealType());
  const [eaten, setEaten] = useState(made > 1 ? 1 : made);
  const [leftoverExpiry, setLeftoverExpiry] = useState<string | null>(null);
  const left = round(made - eaten);

  if (!recipe || !m) return <Screen><Empty emoji="🤔" title="레시피를 찾을 수 없어요" /></Screen>;

  const done = () => {
    const ded = Object.entries(amounts).map(([ingredientId, amount]) => ({ ingredientId, amount }));
    const rec = actions.completeCooking(recipe, ded, { rating: rating ?? undefined, servingsMade: made, servingsEaten: eaten, leftoverExpiry });
    if (note.trim() !== (s.recipeNotes[recipe.id]?.note ?? '')) actions.setRecipeNote(recipe.id, note);
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
    // 남은 재료 이어주기: 반 이하로 남은 재료로 내일 만들 메뉴 하나(없으면 기존 알림만)
    const bridge = nextUse(getState(), rec.usedIngredients.map((u) => u.name), recipe.id);
    router.dismissAll();
    // 식사 기록을 남겼으면 기록 탭에서 바로 확인
    router.replace(saveMeal && eaten > 0 ? '/log' : '/');
    if (bridge) {
      confirmAsync('맛있게 드세요! 🍽️', `${lines.join('\n')}\n\n${bridge.line}`, '내일 식단에 넣기', '괜찮아요', false).then((ok) => {
        if (ok) actions.chooseMeal(bridge.date, bridge.mealType, bridge.recipe.id, '남은 재료 이어 쓰기');
      });
    } else notify('맛있게 드세요! 🍽️', lines.join('\n'));
  };

  return (
    <Screen edges={['bottom']} footer={<Button title="완료하고 저장" onPress={done} />}>
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
        <Field placeholder="다음에 기억할 것 (예: 간장 덜, 불 약하게)" value={note} onChangeText={setNote} accessibilityLabel="레시피 메모" />
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
        {usable.map(({ x, plan }) => (
          <View key={x.need.name} style={{ gap: 4, paddingVertical: 4 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="bodyBold">{x.stock!.emoji} {x.need.name}</T>
              <T v="tiny" c={color.textSub}>레시피 {x.need.amount}{x.need.unit}{x.have != null ? ` · 보유 ${x.have}${x.need.unit}` : ''}</T>
            </Row>
            {x.status === 'unknown_amount' && <Badge label="단위가 달라 직접 입력" tone="info" />}
            {plan.map(({ ingredient: b, amount: base }) => (
              <View key={b.id} style={{ gap: 4 }}>
              <Row style={{ justifyContent: 'space-between', paddingLeft: space.md }}>
                <View style={{ flex: 1 }}>
                  <T v="small">{b.quantity}{b.unit} 묶음</T>
                  <T v="tiny" c={color.textSub}>{b.expiryDate ? `소비기한 ${b.expiryDate.slice(5).replace('-', '/')}` : '소비기한 미입력'}{plan.length > 1 && b.id === plan[0].ingredient.id ? ' · 먼저 쓰기' : ''}</T>
                </View>
                <Row gap={4}>
                  <Stepper value={amounts[b.id] ?? 0} onChange={(n) => setAmounts((a) => ({ ...a, [b.id]: Math.min(n, b.quantity) }))} step={b.unit === 'g' || b.unit === 'ml' ? 10 : 0.5} />
                  <T v="small">{b.unit}</T>
                </Row>
              </Row>
              {isRough(b) && (
                <Row gap={4} wrap style={{ paddingLeft: space.md }}>
                  {roughUses(base, b.quantity).map((o) => (
                    <Chip key={o.label} label={o.label} selected={Math.abs((amounts[b.id] ?? 0) - o.amount) < 0.01} onPress={() => setAmounts((a) => ({ ...a, [b.id]: o.amount }))} />
                  ))}
                </Row>
              )}
              </View>
            ))}
          </View>
        ))}
      </Card>
      <View style={{ height: space.sm }} />
    </Screen>
  );
}
