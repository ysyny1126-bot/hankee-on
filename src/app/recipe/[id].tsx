import { Image } from 'expo-image';
import { router, Stack as RStack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { youtubeSearchUrl } from '@/ai/gemini';
import { notify } from '@/components/dialog';
import { Badge, Button, Chip, Empty, Field, Row, Screen, T } from '@/components/ui';
import { clay, color, radius, space } from '@/constants/tokens';
import { actions, findRecipe, useAppState } from '@/data/store';
import { handyMeasure } from '@/logic/units';
import { formatAmount, matchRecipe, planDeduction, round, type IngredientMatch } from '@/logic/inventory';
import { euro } from '@/logic/dates';
import type { Recipe } from '@/data/types';
import { auditRecipe } from '@/logic/recipe-check';
import { checkRecipe, restrictionsOf, safeSubstitutes, type Restrictions } from '@/logic/safety';

/** 레시피: 큰 그림 + 재료 체크 → [부족한 것 장보기] [요리 시작] */
export default function RecipeDetail() {
  const { id, prep: prepParam } = useLocalSearchParams<{ id: string; prep?: string }>();
  const s = useAppState();
  const fav = s.favorites.includes(id);
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
  const issues = recipe.origin === 'builtin' ? [] : auditRecipe(recipe);
  const need = m.matches.filter((x) => (x.status === 'missing' && !x.need.optional) || x.status === 'low');

  // 꺼낼 것: 재료마다 소비기한이 가까운 묶음부터(선입선출). 단위를 못 바꾼 묶음은 '양 확인'
  const pulls = m.matches.flatMap((x) =>
    x.stocks.length && !(x.need.optional && x.status === 'missing')
      ? planDeduction(x)
          .filter((d, i) => d.amount > 0 || (x.status === 'unknown_amount' && i === 0))
          .map((d) => ({ x, b: d.ingredient, amount: d.amount }))
      : [],
  );
  const toggle = (bid: string) => setTaken((t) => { const n = new Set(t); if (n.has(bid)) n.delete(bid); else n.add(bid); return n; });

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
        <Row gap={6}>
          <T v="h1">{recipe.name}</T>
          <Pressable
            onPress={() => actions.toggleFavorite(recipe.id)}
            accessibilityRole="button"
            accessibilityLabel={fav ? '즐겨찾기에서 빼기' : '즐겨찾기에 넣기'}
            hitSlop={10}>
            <Text style={{ fontSize: 24, color: fav ? '#F2A900' : color.textMuted }}>{fav ? '★' : '☆'}</Text>
          </Pressable>
        </Row>
        <Row gap={4} wrap style={{ justifyContent: 'center' }}>
          <Badge label={`⏱ ${recipe.timeMinutes}분`} />
          <Badge label={recipe.difficulty} />
          {recipe.nutrition ? (
            <Badge
              label={`${recipe.nutritionSource?.kind === 'mfds' ? '' : '약 '}${Math.round(recipe.nutrition.calories * scale)}kcal · 단백질 ${Math.round(recipe.nutrition.protein * scale)}g${recipe.nutritionSource?.kind === 'mfds' ? '' : ' (추정)'}`}
            />
          ) : null}
          {recipe.origin !== 'builtin' && <Badge label="AI 추정 레시피" tone="info" />}
        </Row>
      </View>

      <RecipeNote recipeId={recipe.id} />

      {recipe.prep ? (
        <View style={{ backgroundColor: color.infoSoft, borderRadius: radius.md, padding: space.md, gap: 2 }}>
          <T v="bodyBold">⏳ 미리 해 두세요</T>
          <T v="small" c={color.textSub}>{recipe.prep} (요리 시간 {recipe.timeMinutes}분에는 빠져 있어요)</T>
        </View>
      ) : null}

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
      {recipe.origin !== 'builtin' && issues.length > 0 && (
        <View style={{ backgroundColor: color.warnSoft, borderRadius: radius.md, padding: space.md, gap: 4 }}>
          <T v="bodyBold">🔎 확인 필요 {issues.length}가지</T>
          {issues.slice(0, 4).map((x) => <T key={x} v="small">· {x}</T>)}
          <T v="tiny" c={color.textSub}>한끼온 기본 레시피와 같은 규칙으로 자동 점검했어요. 만들기 전에 한 번 더 봐 주세요.</T>
        </View>
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

      <KeepCard recipe={recipe} />

      <SourceCard recipe={recipe} scale={scale} />
      <ReportRow recipeId={recipe.id} reported={(s.recipeReports ?? []).filter((x) => x.recipeId === recipe.id).map((x) => x.kind)} />

      <Pressable hitSlop={6} accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(youtubeSearchUrl(recipe.videoQuery || `${recipe.name} 레시피`))} style={{ alignSelf: 'center', padding: space.sm }}>
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
      <View style={{ alignItems: 'flex-end' }}>
        <T v="small" c={color.textSub}>{formatAmount(x.need.amount, x.need.unit)}</T>
        {handyMeasure(x.need.amount, x.need.unit) ? <T v="tiny" c={color.textMuted}>{handyMeasure(x.need.amount, x.need.unit)}</T> : null}
      </View>
    </Row>
  );
}

/** 남은 음식 보관 · 다시 데우기 · 안전 팁 (식약처 조리 음식 보관 기준) */
function KeepCard({ recipe }: { recipe: Recipe }) {
  if (!recipe.leftover && !recipe.safety?.length) return null;
  const rows: { icon: string; label: string; text: string }[] = [];
  recipe.safety?.forEach((t) => rows.push({ icon: '🔥', label: '안전', text: t }));
  if (recipe.leftover) rows.push({ icon: '🧊', label: '남으면', text: recipe.leftover });
  if (recipe.reheat) rows.push({ icon: '♨️', label: '데우기', text: recipe.reheat });
  return (
    <View style={{ ...clay, padding: space.md, gap: space.sm }}>
      <T v="h3">보관 · 안전</T>
      {rows.map((r, i) => (
        <Row key={i} gap={space.sm} style={{ alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{r.icon}</Text>
          <View style={{ flex: 1, gap: 1 }}>
            <T v="tiny" c={color.textMuted} style={{ fontWeight: '800' }}>{r.label}</T>
            <T v="small">{r.text}</T>
          </View>
        </Row>
      ))}
      <T v="tiny" c={color.textMuted}>식약처 조리 음식 보관 기준을 참고한 일반 안내예요.</T>
    </View>
  );
}

/** E11 내 레시피 노트: 지난번 만들고 남긴 메모를 보여 주고 고칠 수 있게 */
function RecipeNote({ recipeId }: { recipeId: string }) {
  const s = useAppState();
  const saved = s.recipeNotes[recipeId]?.note ?? '';
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(saved);
  if (!editing)
    return saved ? (
      <Pressable onPress={() => { setText(saved); setEditing(true); }} style={{ backgroundColor: color.warnSoft, borderRadius: radius.md, padding: space.md, gap: 2 }} accessibilityRole="button" accessibilityLabel={`내 메모: ${saved}. 눌러서 고치기`}>
        <T v="small" style={{ fontWeight: '700' }}>📝 지난번 내 메모</T>
        <T v="small">{saved}</T>
      </Pressable>
    ) : (
      <Pressable onPress={() => setEditing(true)} hitSlop={12} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
        <T v="small" c={color.textSub}>📝 이 레시피에 메모 남기기</T>
      </Pressable>
    );
  return (
    <View style={{ gap: space.sm }}>
      <Field label="내 메모" placeholder="예: 다음엔 간장 반만, 물 조금 더" value={text} onChangeText={setText} multiline autoFocus />
      <Row gap={space.sm}>
        <Button small title="저장" onPress={() => { actions.setRecipeNote(recipeId, text); setEditing(false); }} />
        <Button small kind="ghost" title="취소" onPress={() => setEditing(false)} />
      </Row>
    </View>
  );
}

/** R6: 이 레시피를 믿어도 되는 근거 — 레시피·영양·보관 각각 어디서 왔는지 한 줄씩 */
function SourceCard({ recipe, scale }: { recipe: Recipe; scale: number }) {
  const issues = recipe.origin === 'builtin' ? [] : auditRecipe(recipe);
  const lines = [
    recipe.origin === 'builtin'
      ? '레시피: 한끼온이 1인분으로 정리 · 자동 점검(재료↔순서·시간·양) 통과'
      : `레시피: AI가 만든 추정 레시피 · 자동 점검 ${issues.length ? `확인 필요 ${issues.length}가지` : '통과'}`,
    recipe.nutrition
      ? recipe.nutritionSource?.kind === 'mfds'
        ? `영양: 식약처 식품영양성분 DB '${recipe.nutritionSource.dbName.replace(/_/g, ' ')}' 1인분 ${recipe.nutritionSource.servingGram}g 기준 · 나트륨 ${Math.round(recipe.nutrition.sodium * scale)}mg`
        : '영양: 비슷한 음식으로 낸 추정값'
      : '영양: 근거 자료가 없어 표시하지 않아요',
    '보관·안전: 식약처 조리 음식 보관 기준(2시간 안에 냉장, 속까지 75℃)',
  ];
  return (
    <View style={{ gap: 2, paddingHorizontal: space.sm }}>
      <T v="tiny" c={color.textSub} style={{ fontWeight: '700' }}>근거</T>
      {lines.map((l) => <T key={l} v="tiny" c={color.textMuted}>{l}</T>)}
    </View>
  );
}

const REPORT_KINDS = ['양이 이상해요', '순서가 빠졌어요', '시간이 달라요', '재료가 달라요'];

/** R8: 이상한 점 알려 주기 — 기기에만 기록하고, 다음에 이 레시피를 열면 보여 준다 */
function ReportRow({ recipeId, reported }: { recipeId: string; reported: string[] }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <Pressable hitSlop={6} accessibilityRole="button" onPress={() => setOpen(true)} style={{ alignSelf: 'center', padding: space.sm }}>
        <T v="small" c={color.textSub}>{reported.length ? `🚩 알려 주신 점: ${reported.join(', ')}` : '🚩 이상한 점 알려 주기'}</T>
      </Pressable>
    );
  return (
    <View style={{ gap: space.sm, alignItems: 'center' }}>
      <T v="small" c={color.textSub}>어떤 점이 이상했나요?</T>
      <Row wrap style={{ justifyContent: 'center' }}>
        {REPORT_KINDS.map((k) => (
          <Chip
            key={k}
            label={k}
            selected={reported.includes(k)}
            onPress={() => { actions.reportRecipe(recipeId, k); setOpen(false); notify('알려 주셔서 고마워요', '이 기기에 기록했어요. 다음에 이 레시피를 열면 함께 보여 드려요.'); }}
          />
        ))}
      </Row>
    </View>
  );
}
