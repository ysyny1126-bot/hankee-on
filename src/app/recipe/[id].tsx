import { Image } from 'expo-image';
import { router, Stack as RStack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { youtubeSearchUrl } from '@/ai/gemini';
import { notify } from '@/components/dialog';
import { Badge, Button, Chip, Empty, Row, Screen, T } from '@/components/ui';
import { clay, color, radius, space } from '@/constants/tokens';
import { actions, findRecipe, useAppState } from '@/data/store';
import { formatAmount, matchRecipe, type IngredientMatch } from '@/logic/inventory';
import { euro } from '@/logic/dates';
import { checkRecipe, restrictionsOf, safeSubstitutes, type Restrictions } from '@/logic/safety';

/** 레시피: 큰 그림 + 재료 체크 → [부족한 것 장보기] [요리 시작] */
export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useAppState();
  const recipe = findRecipe(s, id);
  // 함께 먹는 사람 수를 기본 인분으로 (1~3)
  const [scale, setScale] = useState(Math.min(3, Math.max(1, s.preferences.householdSize || 1)));
  if (!recipe) return <Screen><Empty emoji="🤔" title="레시피를 찾을 수 없어요" /></Screen>;

  const m = matchRecipe(recipe, s.ingredients, s.preferences.allergies, scale);
  const rs = restrictionsOf(s.preferences);
  const check = checkRecipe(recipe, rs);
  const need = m.matches.filter((x) => (x.status === 'missing' && !x.need.optional) || x.status === 'low');

  const addToShopping = () => {
    const n = actions.addShopping(
      need.map((x) => ({
        name: x.need.name,
        amount: x.status === 'low' && x.stock ? Math.max(0, x.need.amount - x.stock.quantity) : x.need.amount,
        unit: x.need.unit,
        reason: recipe.name,
        recipeId: recipe.id,
      })),
    );
    notify(n ? `장보기에 ${n}개 담았어요 🛒` : '이미 담겨 있어요');
  };

  return (
    <Screen
      edges={['bottom']}
      footer={
        <Row gap={space.sm}>
          {need.length > 0 && <Button title={`🛒 ${need.length}개 담기`} kind="secondary" style={{ flex: 1 }} onPress={addToShopping} />}
          <Button title="요리 시작" icon="🔥" style={{ flex: 2 }} onPress={() => router.push(`/cook-mode/${recipe.id}?scale=${scale}`)} />
        </Row>
      }>
      <RStack.Screen options={{ title: '' }} />

      {/* 큰 그림 */}
      <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.md, backgroundColor: color.brandSoft, borderRadius: radius.xl }}>
        {recipe.imageUri ? (
          <Image source={{ uri: recipe.imageUri }} style={{ width: 140, height: 140, borderRadius: 70 }} contentFit="cover" />
        ) : (
          <Text style={{ fontSize: 84, lineHeight: 100 }}>{recipe.emoji}</Text>
        )}
        <T v="h1">{recipe.name}</T>
        <Row gap={4} wrap style={{ justifyContent: 'center' }}>
          <Badge label={`⏱ ${recipe.timeMinutes}분`} />
          <Badge label={recipe.difficulty} />
          {recipe.nutrition ? <Badge label={`약 ${Math.round(recipe.nutrition.calories * scale)}kcal · 단백질 ${Math.round(recipe.nutrition.protein * scale)}g (추정)`} /> : null}
          {recipe.origin !== 'builtin' && <Badge label="AI 추정 레시피" tone="info" />}
        </Row>
      </View>

      {check.allergy.length > 0 && (
        <View style={{ backgroundColor: color.dangerSoft, borderRadius: radius.md, padding: space.md, gap: 2 }}>
          <T v="bodyBold" c={color.danger}>⚠️ 알레르기 성분: {check.allergy.join(', ')}</T>
          <T v="tiny" c={color.danger}>설정한 알레르기가 들어 있어 추천·식단에서는 뺐어요. 만들기 전에 꼭 확인해 주세요.</T>
        </View>
      )}
      {check.disliked.length > 0 && (
        <View style={{ backgroundColor: color.warnSoft, borderRadius: radius.md, padding: space.md }}>
          <T v="small">🙅 피하는 음식({check.disliked.join(', ')})이 들어가는 메뉴예요. 추천에서는 빼 두었어요.</T>
        </View>
      )}
      {check.omit.length > 0 && (
        <T v="small" c={color.textSub}>💡 선택 재료({check.omit.join(', ')})는 빼고 만들어도 돼요.</T>
      )}
      {recipe.origin !== 'builtin' && (
        <T v="tiny" c={color.textMuted}>AI가 만든 레시피예요. 재료·분량·영양값은 추정이라 실제와 다를 수 있어요. 요리 완료 화면에서 쓴 양을 고칠 수 있어요.</T>
      )}

      {/* 재료 체크 */}
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h3">재료</T>
        <Row gap={4}>{[1, 2, 3].map((n) => <Chip key={n} label={`${n}인분`} selected={scale === n} onPress={() => setScale(n)} />)}</Row>
      </Row>
      <View style={{ ...clay, paddingVertical: space.xs }}>
        {m.matches.map((x, i) => <IngredientRow key={i} x={x} rs={rs} />)}
      </View>

      <Pressable onPress={() => WebBrowser.openBrowserAsync(youtubeSearchUrl(recipe.videoQuery || `${recipe.name} 레시피`))} style={{ alignSelf: 'center', padding: space.sm }}>
        <T v="small" c={color.textSub}>▶️ 조리 영상 찾아보기</T>
      </Pressable>
    </Screen>
  );
}

function IngredientRow({ x, rs }: { x: IngredientMatch; rs: Restrictions }) {
  // 없거나 부족한 재료에만 '대체 재료'를 보여 준다. 알레르기·기피에 걸리는 대체 재료는 보여 주지 않는다.
  const subs = x.status === 'missing' || x.status === 'low' ? safeSubstitutes(x.need.substitute, rs) : [];
  const mark =
    x.status === 'have' || x.status === 'unknown_amount' ? { t: '✓', c: color.fresh } :
    x.status === 'low' ? { t: '△', c: color.warnDark } :
    x.status === 'staple' || x.need.optional ? { t: '·', c: color.textMuted } :
    { t: '✕', c: color.danger };
  return (
    <Row style={{ paddingHorizontal: space.md, paddingVertical: 8 }}>
      <Text style={{ width: 20, fontSize: 16, fontWeight: '800', color: mark.c, textAlign: 'center' }}>{mark.t}</Text>
      <View style={{ flex: 1 }}>
        <T c={x.status === 'missing' && x.need.optional ? color.textMuted : color.text}>
          {x.need.name}{x.need.optional ? ' (선택)' : ''}
        </T>
        {subs.length > 0 && <T v="tiny" c={color.brandDark}>없으면 {euro(subs.join(' 또는 '))} 대체</T>}
      </View>
      <T v="small" c={color.textSub}>{formatAmount(x.need.amount, x.need.unit)}</T>
    </Row>
  );
}
