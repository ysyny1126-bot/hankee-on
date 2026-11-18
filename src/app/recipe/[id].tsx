import { Image } from 'expo-image';
import { router, Stack as RStack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { View } from 'react-native';

import { youtubeSearchUrl } from '@/ai/gemini';
import { notify } from '@/components/dialog';
import { Badge, Button, Card, Chip, Empty, EstimateBadge, Row, Screen, Stack, T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
import { actions, findRecipe, useAppState } from '@/data/store';
import { guessMealType, newId, toDateKey } from '@/logic/dates';
import { formatAmount, matchRecipe, type IngredientMatch } from '@/logic/inventory';

const STATUS: Record<IngredientMatch['status'], { label: string; tone: 'fresh' | 'warn' | 'danger' | 'muted' | 'info' }> = {
  have: { label: '있어요', tone: 'fresh' },
  low: { label: '조금 부족', tone: 'warn' },
  unknown_amount: { label: '있음(양 확인)', tone: 'info' },
  missing: { label: '없어요', tone: 'danger' },
  staple: { label: '기본 양념', tone: 'muted' },
};

export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useAppState();
  const recipe = findRecipe(s, id);
  const [scale, setScale] = useState(1);
  if (!recipe) return <Screen><Empty emoji="🤔" title="레시피를 찾을 수 없어요" /></Screen>;

  const m = matchRecipe(recipe, s.ingredients, s.preferences.allergies, scale);
  const toBuy = m.matches.filter((x) => x.status === 'missing' && !x.need.optional);
  const lowItems = m.matches.filter((x) => x.status === 'low');

  const addToShopping = () => {
    const items = [...toBuy, ...lowItems].map((x) => ({
      name: x.need.name,
      amount: x.status === 'low' && x.stock ? Math.max(0, x.need.amount - x.stock.quantity) : x.need.amount,
      unit: x.need.unit,
      reason: `${recipe.name} ${x.status === 'low' ? '부족분' : '재료'}`,
      recipeId: recipe.id,
    }));
    const n = actions.addShopping(items);
    notify(n ? `장보기 목록에 ${n}개 담았어요` : '이미 장보기 목록에 있어요', n < items.length ? '이미 담긴 재료는 중복으로 넣지 않았어요.' : '');
  };

  const addToPlan = () => {
    const date = toDateKey();
    const type = guessMealType();
    actions.setMealPlan([{ id: newId('plan_'), date, mealType: type === 'snack' ? 'dinner' : type, recipeId: recipe.id, reason: '직접 고른 메뉴' }], []);
    notify('오늘 식단에 추가했어요');
  };

  return (
    <Screen
      edges={['bottom']}
      footer={
        <Row gap={space.sm}>
          <Button title="식단에 추가" kind="secondary" style={{ flex: 1 }} onPress={addToPlan} />
          <Button title="요리 완료" icon="✅" kind="fresh" style={{ flex: 2 }} onPress={() => router.push(`/cook/${recipe.id}?scale=${scale}`)} />
        </Row>
      }>
      <RStack.Screen options={{ title: recipe.name }} />
      {recipe.imageUri ? <Image source={{ uri: recipe.imageUri }} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg }} contentFit="cover" /> : null}
      <Row style={{ alignItems: 'flex-start' }}>
        <T style={{ fontSize: 44, lineHeight: 52 }}>{recipe.emoji}</T>
        <View style={{ flex: 1, gap: 4 }}>
          <T v="h1">{recipe.name}</T>
          <Row wrap gap={4}>
            <Badge label={`⏱ ${recipe.timeMinutes}분`} />
            <Badge label={recipe.difficulty} />
            {recipe.origin !== 'builtin' && <Badge label={`AI 생성${recipe.aiConfidence === 'low' ? ' · 확신 낮음' : ''}`} tone="info" />}
          </Row>
        </View>
      </Row>
      {recipe.features ? <T c={color.textSub}>{recipe.features}</T> : null}

      {m.blockedByAllergy.length > 0 && (
        <Card tone="danger">
          <T v="bodyBold" c={color.danger}>⚠️ 알레르기 주의: {m.blockedByAllergy.join(', ')}</T>
          <T v="small">설정하신 알레르기 성분이 들어 있어요. 대체 재료를 쓰거나 다른 메뉴를 골라 주세요.</T>
        </Card>
      )}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h3">재료</T>
          <Row gap={4}>
            {[1, 2, 3].map((n) => <Chip key={n} label={`${n}인분`} selected={scale === n} onPress={() => setScale(n)} />)}
          </Row>
        </Row>
        {recipe.origin !== 'builtin' && <T v="tiny" c={color.textMuted}>사진으로 추정한 분량이에요. 입맛에 맞게 조절하세요.</T>}
        {m.matches.map((x, i) => (
          <Row key={i} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
            <View style={{ flex: 1 }}>
              <T v="bodyBold">{x.need.name}{x.need.optional ? <T v="small" c={color.textMuted}> (선택)</T> : null}</T>
              <T v="small" c={color.textSub}>
                {formatAmount(x.need.amount, x.need.unit)}
                {x.stock ? ` · 보유 ${formatAmount(x.stock.quantity, x.stock.unit)}` : ''}
                {x.need.substitute ? ` · 대체: ${x.need.substitute}` : ''}
              </T>
            </View>
            {x.status === 'missing' && x.need.optional ? <Badge label="없어도 OK" /> : <Badge label={STATUS[x.status].label} tone={STATUS[x.status].tone} />}
          </Row>
        ))}
        {toBuy.length + lowItems.length > 0 ? (
          <Button title={`부족한 재료 ${toBuy.length + lowItems.length}개 장보기에 담기`} icon="🛒" kind="secondary" small onPress={addToShopping} />
        ) : (
          <T v="small" c={color.fresh} style={{ fontWeight: '700' }}>필요한 재료가 모두 있어요!</T>
        )}
      </Card>

      <Card>
        <T v="h3">만드는 법</T>
        <Stack gap={space.sm}>
          {recipe.steps.map((st, i) => (
            <Row key={i} style={{ alignItems: 'flex-start' }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
                <T v="tiny" c={color.brandDark}>{i + 1}</T>
              </View>
              <T style={{ flex: 1 }}>{st}</T>
            </Row>
          ))}
        </Stack>
        <Button
          title="조리 영상 찾아보기 (YouTube)"
          icon="▶️"
          kind="secondary"
          small
          onPress={() => WebBrowser.openBrowserAsync(youtubeSearchUrl(recipe.videoQuery || `${recipe.name} 레시피`))}
        />
        <T v="tiny" c={color.textMuted}>유튜브 검색 결과로 연결돼요.</T>
      </Card>

      {recipe.nutrition && (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="h3">1인분 영양(참고)</T>
            <EstimateBadge source={recipe.origin === 'builtin' ? 'reference_estimated' : 'ai_estimated'} />
          </Row>
          <Row wrap gap={space.md}>
            <Nut label="에너지" v={`${Math.round(recipe.nutrition.calories * scale)}kcal`} />
            <Nut label="단백질" v={`${Math.round(recipe.nutrition.protein * scale)}g`} />
            <Nut label="탄수화물" v={`${Math.round(recipe.nutrition.carbohydrates * scale)}g`} />
            <Nut label="지방" v={`${Math.round(recipe.nutrition.fat * scale)}g`} />
            <Nut label="나트륨" v={`${Math.round(recipe.nutrition.sodium * scale)}mg`} />
          </Row>
          <T v="tiny" c={color.textMuted}>재료 양과 조리법에 따라 달라지는 대략치예요.</T>
        </Card>
      )}
    </Screen>
  );
}

function Nut({ label, v }: { label: string; v: string }) {
  return (
    <View>
      <T v="bodyBold">{v}</T>
      <T v="tiny" c={color.textSub}>{label}</T>
    </View>
  );
}
