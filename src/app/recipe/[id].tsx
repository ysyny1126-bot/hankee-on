import { Image } from 'expo-image';
import { router, Stack as RStack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { youtubeSearchUrl } from '@/ai/gemini';
import { notify } from '@/components/dialog';
import { Badge, Button, Chip, Empty, Row, Screen, T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
import { actions, findRecipe, useAppState } from '@/data/store';
import { formatAmount, matchRecipe, type IngredientMatch } from '@/logic/inventory';

/** 레시피: 큰 그림 + 재료 체크 → [부족한 것 장보기] [요리 시작] */
export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useAppState();
  const recipe = findRecipe(s, id);
  const [scale, setScale] = useState(1);
  if (!recipe) return <Screen><Empty emoji="🤔" title="레시피를 찾을 수 없어요" /></Screen>;

  const m = matchRecipe(recipe, s.ingredients, s.preferences.allergies, scale);
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

      {m.blockedByAllergy.length > 0 && (
        <View style={{ backgroundColor: color.dangerSoft, borderRadius: radius.md, padding: space.md }}>
          <T v="bodyBold" c={color.danger}>⚠️ 알레르기: {m.blockedByAllergy.join(', ')}</T>
        </View>
      )}

      {/* 재료 체크 */}
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h3">재료</T>
        <Row gap={4}>{[1, 2, 3].map((n) => <Chip key={n} label={`${n}인분`} selected={scale === n} onPress={() => setScale(n)} />)}</Row>
      </Row>
      <View style={{ backgroundColor: color.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: color.border, paddingVertical: space.xs }}>
        {m.matches.map((x, i) => <IngredientRow key={i} x={x} />)}
      </View>

      <Pressable onPress={() => WebBrowser.openBrowserAsync(youtubeSearchUrl(recipe.videoQuery || `${recipe.name} 레시피`))} style={{ alignSelf: 'center', padding: space.sm }}>
        <T v="small" c={color.textSub}>▶️ 조리 영상 찾아보기</T>
      </Pressable>
    </Screen>
  );
}

function IngredientRow({ x }: { x: IngredientMatch }) {
  const mark =
    x.status === 'have' || x.status === 'unknown_amount' ? { t: '✓', c: color.fresh } :
    x.status === 'low' ? { t: '△', c: '#B07A00' } :
    x.status === 'staple' || x.need.optional ? { t: '·', c: color.textMuted } :
    { t: '✕', c: color.danger };
  return (
    <Row style={{ paddingHorizontal: space.md, paddingVertical: 8 }}>
      <Text style={{ width: 20, fontSize: 16, fontWeight: '800', color: mark.c, textAlign: 'center' }}>{mark.t}</Text>
      <T style={{ flex: 1 }} c={x.status === 'missing' && x.need.optional ? color.textMuted : color.text}>
        {x.need.name}{x.need.optional ? ' (선택)' : ''}
      </T>
      <T v="small" c={color.textSub}>{formatAmount(x.need.amount, x.need.unit)}</T>
    </Row>
  );
}
