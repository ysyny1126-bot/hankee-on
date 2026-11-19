import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { hasAIKey, recipeFromName } from '@/ai/gemini';
import { notify } from '@/components/dialog';
import { Icon } from '@/components/icon';
import { Button, Chip, Field, Row, Screen, SectionHeader, T } from '@/components/ui';
import { clay, color, radius, space } from '@/constants/tokens';
import { actions, findRecipe, useAppState } from '@/data/store';
import { MEAL_LABEL } from '@/logic/analysis';
import { addDays, toDateKey } from '@/logic/dates';
import type { RecipeMatch } from '@/logic/inventory';
import { generatePlan } from '@/logic/planner';
import { aiRecipeToRecipe } from '@/logic/recipe-convert';
import { rankForUser } from '@/logic/suggestions';

const ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

/** 요리: "오늘 뭐 먹지?" 추천 3개 + 이번 주 식단 */
export default function Cook() {
  const s = useAppState();
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<'all' | 'expiring' | 'quick'>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiOn = hasAIKey() && s.consents.externalAI;
  const today = toDateKey();
  // 홈의 '먼저 활용하면 좋은 재료'를 누르면 그 재료로 만들 수 있는 메뉴를 바로 보여 준다
  const { ingredient } = useLocalSearchParams<{ ingredient?: string }>();
  useEffect(() => {
    if (ingredient) {
      setSearchOpen(true);
      setQ(ingredient);
      setPage(0);
    }
  }, [ingredient]);

  const ranked = useMemo(() => rankForUser(s), [s]);
  const pool = ranked.filter((m) => {
    if (q.trim()) return m.recipe.name.includes(q.trim()) || m.recipe.ingredients.some((i) => i.name.includes(q.trim()));
    if (filter === 'expiring') return m.usesExpiring.length > 0;
    if (filter === 'quick') return m.recipe.timeMinutes <= 15;
    return true;
  });
  const pages = Math.max(1, Math.ceil(pool.length / 3));
  const three = pool.slice((page % pages) * 3, (page % pages) * 3 + 3);

  const plan = s.mealPlan.filter((p) => p.date === today || p.date === addDays(today, 1)).sort((a, b) => a.date.localeCompare(b.date) || ORDER.indexOf(a.mealType) - ORDER.indexOf(b.mealType));

  const searchAI = async () => {
    setAiLoading(true);
    try {
      const r = await recipeFromName(q.trim(), { allergies: s.preferences.allergies, disliked: s.preferences.dislikedFoods, skill: s.preferences.cookingSkill, maxMinutes: s.preferences.maxCookMinutes });
      if (!r.name) return notify('레시피를 찾지 못했어요');
      const recipe = aiRecipeToRecipe(r, 'user');
      actions.saveRecipe(recipe);
      router.push(`/recipe/${recipe.id}`);
    } catch (e) {
      notify('AI 레시피 실패', (e as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
        <T v="h1">오늘 뭐 먹지?</T>
        <Pressable onPress={() => { setSearchOpen(!searchOpen); setQ(''); if (ingredient) router.setParams({ ingredient: undefined }); }} hitSlop={10} accessibilityLabel={searchOpen ? '검색 닫기' : '검색'}>
          <Icon name={searchOpen ? 'x' : 'search'} size={22} c={color.text} />
        </Pressable>
      </Row>

      {searchOpen ? (
        <Field placeholder="요리·재료 이름" value={q} onChangeText={(t) => { setQ(t); setPage(0); }} autoFocus />
      ) : (
        <Row>
          <Chip label="전체" selected={filter === 'all'} onPress={() => { setFilter('all'); setPage(0); }} />
          <Chip label="⏰ 임박 재료" selected={filter === 'expiring'} onPress={() => { setFilter('expiring'); setPage(0); }} />
          <Chip label="⚡ 15분" selected={filter === 'quick'} onPress={() => { setFilter('quick'); setPage(0); }} />
        </Row>
      )}

      {three.length ? (
        <Row gap={space.sm} style={{ alignItems: 'stretch' }}>
          {three.map((m) => <MenuCard key={m.recipe.id} m={m} />)}
          {three.length < 3 && Array.from({ length: 3 - three.length }).map((_, i) => <View key={i} style={{ flex: 1 }} />)}
        </Row>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: space.xl, gap: space.sm }}>
          <Text style={{ fontSize: 36 }}>🔍</Text>
          <T c={color.textSub}>{q.trim() ? `‘${q.trim()}’로 만들 수 있는 기본 메뉴가 없어요` : '맞는 메뉴가 없어요'}</T>
        </View>
      )}

      {pool.length > 3 && <Button title="다른 추천 보기 ↻" kind="secondary" onPress={() => setPage(page + 1)} />}
      {q.trim() && aiOn ? <Button title={`AI로 ‘${q.trim()}’ 만들기`} kind="ghost" small onPress={searchAI} loading={aiLoading} /> : null}

      <SectionHeader title="이번 주 식단" action="전체" href="/plan" />
      {plan.length ? (
        <View style={{ ...clay, padding: space.sm }}>
          {plan.map((p) => {
            const r = findRecipe(s, p.recipeId);
            if (!r) return null;
            return (
              <Pressable key={p.id} onPress={() => router.push(`/recipe/${r.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm }}>
                <Text style={{ fontSize: 24 }}>{r.emoji}</Text>
                <T v="small" c={color.textMuted} style={{ width: 64 }}>{p.date === today ? '오늘' : '내일'} {MEAL_LABEL[p.mealType]}</T>
                <T v="bodyBold" style={{ flex: 1 }}>{r.name}</T>
                <T c={color.textMuted}>›</T>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Button title="7일 식단 짜기 ✨" kind="secondary" onPress={() => { actions.setMealPlan(generatePlan(s, today, 7), Array.from({ length: 7 }, (_, i) => addDays(today, i))); }} />
      )}
    </Screen>
  );
}

function MenuCard({ m }: { m: RecipeMatch }) {
  const why = m.reasons.find((r) => r.text && ['liked', 'preferred', 'fresh', 'skill'].includes(r.key))?.text;
  const ok = m.missingRequired.length === 0;
  return (
    <Pressable onPress={() => router.push(`/recipe/${m.recipe.id}`)} style={({ pressed }) => ({ flex: 1, ...clay, paddingVertical: space.lg, paddingHorizontal: 6, alignItems: 'center', gap: 4, opacity: pressed ? 0.7 : 1 })}>
      {m.usesExpiring.length > 0 && <View style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: color.warn }} />}
      <Text style={{ fontSize: 40 }}>{m.recipe.emoji}</Text>
      <T v="bodyBold" numberOfLines={1} style={{ textAlign: 'center' }}>{m.recipe.name}</T>
      <T v="tiny" c={color.textSub}>⏱ {m.recipe.timeMinutes}분</T>
      <T v="tiny" c={ok ? color.fresh : color.textMuted} style={{ fontWeight: '700' }}>{ok ? '✓ 재료 있음' : `${m.missingRequired.length}개 부족`}</T>
      {why ? <T v="tiny" c={color.brandDark} numberOfLines={1}>{why}</T> : null}
    </Pressable>
  );
}
