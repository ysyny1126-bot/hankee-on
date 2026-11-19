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
import { formatAmount, matchRecipe, planDeduction, round, type IngredientMatch } from '@/logic/inventory';
import { euro } from '@/logic/dates';
import { checkRecipe, restrictionsOf, safeSubstitutes, type Restrictions } from '@/logic/safety';

/** 레시피: 큰 그림 + 재료 체크 → [부족한 것 장보기] [요리 시작] */
export default function RecipeDetail() {
  const { id, prep: prepParam } = useLocalSearchParams<{ id: string; prep?: string }>();
  const s = useAppState();
  const recipe = findRecipe(s, id);
  // 함께 먹는 사람 수를 기본 인분으로 (1~3)
  const [scale, setScale] = useState(Math.min(3, Math.max(1, s.preferences.householdSize || 1)));
  // 홈에서 '이걸로 할래요'를 누르고 왔으면 '재료 꺼내기' 단계부터
  const [prep, setPrep] = useState(prepParam === '1');
  const [taken, setTaken] = useState<Set<string>>(new Set());
  if (!recipe) return <Screen><Empty emoji="🤔" title="레시피를 찾을 수 없어요" /></Screen>;

  const m = matchRecipe(recipe, s.ingredients, s.preferences.allergies, scale);
  const rs = restrictionsOf(s.preferences);
  const check = checkRecipe(recipe, rs);
  const need = m.matches.filter((x) => (x.status === 'missing' && !x.need.optional) || x.status === 'low');

  // 꺼낼 것: 재료마다 소비기한이 가까운 묶음부터(선입선출). 단위를 못 바꾼 묶음은 '양 확인'
  const pulls = m.matches.flatMap((x) =>
    x.stocks.length && !(x.need.optional && x.status === 'missing')
      ? planDeduction(x)
          .filter((d, i) => d.amount > 0 || (x.status === 'unknown_amount' && i === 0))
          .map((d) => ({ x, b: d.ingredient, amount: d.amount }))
      : [],
  );
  const toggle = (bid: string) => setTaken((t) => { const n = new Set(t); n.has(bid) ? n.delete(bid) : n.add(bid); return n; });

  const addToShopping = () => {
    const n = actions.addShopping(
      need.map((x) => ({
        name: x.need.name,
        amount: x.status === 'low' && x.have != null ? round(Math.max(0, x.need.amount - x.have)) : x.need.amount,
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
          {need.length > 0 && <Button title={`장보기 ${need.length}개 담기`} kind="secondary" style={{ flex: 1 }} onPress={addToShopping} />}
          <Button title={prep && pulls.length && taken.size >= pulls.length ? '다 꺼냈어요 · 요리 시작' : '요리 시작'} style={{ flex: 2 }} onPress={() => router.push(`/cook-mode/${recipe.id}?scale=${scale}`)} />
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

      {/* 인분 */}
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="h3">{prep ? '재료 꺼내기' : '재료'}</T>
        <Row gap={4}>{[1, 2, 3].map((n) => <Chip key={n} label={`${n}인분`} selected={scale === n} onPress={() => { setScale(n); setTaken(new Set()); }} />)}</Row>
      </Row>

      {prep ? (
        <>
          {/* 재료 꺼내기: 어디서(냉장·냉동·실온) 무엇을 얼마나 꺼낼지, 꺼내면서 체크 */}
          <View style={{ ...clay, padding: space.md, gap: space.sm }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="small" c={color.textSub}>꺼내면서 하나씩 눌러 체크해요</T>
              <T v="bodyBold" c={color.brandDark}>{taken.size}/{pulls.length} 꺼냄</T>
            </Row>
            {(['fridge', 'freezer', 'pantry'] as const).map((where) => {
              const list = pulls.filter((p) => p.b.storage === where);
              if (!list.length) return null;
              return (
                <View key={where} style={{ gap: 4 }}>
                  <T v="tiny" c={color.textMuted} style={{ fontWeight: '800' }}>{where === 'fridge' ? '냉장실' : where === 'freezer' ? '냉동실' : '실온(찬장)'}</T>
                  {list.map(({ x, b, amount }) => {
                    const on = taken.has(b.id);
                    const first = m.usesExpiring.some((e) => e.id === b.id);
                    return (
                      <Pressable key={b.id} onPress={() => toggle(b.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${b.name} ${amount ? `${amount}${b.unit}` : '양 확인'} 꺼내기`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48, paddingVertical: 4 }}>
                        <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: on ? color.brandDark : color.borderStrong, backgroundColor: on ? color.brandDark : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                          {on ? <T v="small" c="#fff" style={{ fontWeight: '900' }}>✓</T> : null}
                        </View>
                        <Text style={{ fontSize: 22 }}>{b.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <T v="bodyBold" c={on ? color.textMuted : color.text} style={on ? { textDecorationLine: 'line-through' } : undefined}>{b.name}</T>
                          <T v="tiny" c={first ? color.warnDark : color.textSub}>
                            {b.expiryDate ? `소비기한 ${b.expiryDate.slice(5).replace('-', '/')}` : '소비기한 미입력'}{first ? ' · 먼저 쓰기' : ''}{x.stocks.length > 1 ? ` · ${x.stocks.length}묶음 중` : ''}
                          </T>
                        </View>
                        <T v="small" style={{ fontWeight: '700' }}>{amount ? `${formatAmount(amount, b.unit)}` : '양 확인'}</T>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
            {pulls.length === 0 && <T v="small" c={color.textSub}>냉장고에서 꺼낼 재료가 없어요. 아래 부족한 재료를 확인해 주세요.</T>}
          </View>

          {/* 없는 재료·부족한 재료: 대체 재료와 함께 */}
          {need.length > 0 && (
            <View style={{ ...clay, padding: space.md, gap: 6 }}>
              <T v="bodyBold">없거나 모자란 재료</T>
              {need.map((x) => {
                const subs = safeSubstitutes(x.need.substitute, rs);
                return (
                  <View key={x.need.name}>
                    <T v="small">{x.need.name} {x.status === 'low' && x.have != null ? `${round(x.need.amount - x.have)}${x.need.unit} 더 필요` : formatAmount(x.need.amount, x.need.unit)}</T>
                    {subs.length > 0 && <T v="tiny" c={color.brandDark}>없으면 {euro(subs.join(' 또는 '))} 대체할 수 있어요</T>}
                  </View>
                );
              })}
            </View>
          )}
          <Pressable onPress={() => setPrep(false)} accessibilityRole="button" style={{ alignSelf: 'center', padding: space.sm }}>
            <T v="small" c={color.textSub}>전체 재료 목록 보기</T>
          </Pressable>
        </>
      ) : (
        <>
          <View style={{ ...clay, paddingVertical: space.xs }}>
            {m.matches.map((x, i) => <IngredientRow key={i} x={x} rs={rs} />)}
          </View>
          {pulls.length > 0 && (
            <Button title="냉장고에서 재료 꺼내기" kind="secondary" onPress={() => setPrep(true)} />
          )}
        </>
      )}

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
        {x.stocks.length > 0 && x.status !== 'staple' && (
          <T v="tiny" c={color.textSub}>냉장고 {x.have != null ? formatAmount(x.have, x.need.unit) : `${x.stocks[0].quantity}${x.stocks[0].unit}(단위 다름)`}{x.stocks.length > 1 ? ` · ${x.stocks.length}묶음` : ''}</T>
        )}
        {subs.length > 0 && <T v="tiny" c={color.brandDark}>없으면 {euro(subs.join(' 또는 '))} 대체</T>}
      </View>
      <T v="small" c={color.textSub}>{formatAmount(x.need.amount, x.need.unit)}</T>
    </Row>
  );
}
