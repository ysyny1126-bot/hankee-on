import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { hasAIKey, recipeFromName } from '@/ai/gemini';
import { notify } from '@/components/dialog';
import { Icon } from '@/components/icon';
import { Button, Chip, Field, IconButton, PageHeader, Row, Screen, SectionHeader, T } from '@/components/ui';
import { clay, color, space } from '@/constants/tokens';
import { actions, findRecipe, useAppState } from '@/data/store';
import { MEAL_LABEL } from '@/logic/analysis';
import { addDays, eul, iga, toDateKey } from '@/logic/dates';
import type { RecipeMatch } from '@/logic/inventory';
import { generatePlan } from '@/logic/planner';
import { aiRecipeToRecipe } from '@/logic/recipe-convert';
import { rankForUser } from '@/logic/suggestions';
import { isUsable } from '@/logic/tidy';
import { sameIngredient } from '@/data/catalog';

const ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

/** 요리: "오늘 뭐 먹지?" 추천 3개 + 이번 주 식단 */
export default function Cook() {
  const s = useAppState();
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<'all' | 'expiring' | 'quick' | 'clear' | 'fav'>('all');
  const [picked, setPicked] = useState<string[]>([]); // 냉장고 털기: 고른 재료
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
  // C3: '두부 애호박', '두부+애호박'처럼 여러 단어를 쓰면 모두 들어간 메뉴만
  const tokens = q.split(/[\s,+·]+/).map((t) => t.trim()).filter(Boolean);
  const uses = (m: RecipeMatch, word: string) =>
    m.recipe.name.includes(word) || m.recipe.ingredients.some((i) => i.name.includes(word) || sameIngredient(i.name, word));
  // E1 냉장고 털기에 쓸 재료 후보: 실제로 있는 재료(남은 음식·양념 제외), 기한 가까운 순
  const clearable = useMemo(() => {
    const seen = new Set<string>();
    return s.ingredients
      .filter((i) => i.kind !== 'leftover' && i.category !== '양념' && isUsable(i))
      .sort((a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999'))
      .filter((i) => (seen.has(i.name) ? false : (seen.add(i.name), true)));
  }, [s.ingredients]);
  const pool = ranked
    .filter((m) => {
      if (tokens.length) return tokens.every((w) => uses(m, w));
      if (filter === 'clear') return picked.length > 0 && picked.every((w) => uses(m, w));
      if (filter === 'fav') return s.favorites.includes(m.recipe.id);
      if (filter === 'expiring') return m.usesExpiring.length > 0;
      if (filter === 'quick') return m.recipe.timeMinutes <= 15;
      return true;
    })
    // 냉장고 털기는 '부족한 재료가 적은 순'이 먼저
    .sort((a, b) => (filter === 'clear' && !tokens.length ? a.missingRequired.length - b.missingRequired.length : 0));
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
      <PageHeader
        eyebrow="메뉴"
        title="오늘 뭐 먹지?"
        right={
          <IconButton label={searchOpen ? '검색 닫기' : '메뉴·재료 검색'} onPress={() => { setSearchOpen(!searchOpen); setQ(''); if (ingredient) router.setParams({ ingredient: undefined }); }}>
            <Icon name={searchOpen ? 'x' : 'search'} size={20} c={color.text} />
          </IconButton>
        }
      />

      {searchOpen ? (
        <Field placeholder="요리·재료 이름" value={q} onChangeText={(t) => { setQ(t); setPage(0); }} autoFocus />
      ) : (
        <Row wrap>
          <Chip label="전체" selected={filter === 'all'} onPress={() => { setFilter('all'); setPage(0); }} />
          <Chip label="먼저 쓸 재료" selected={filter === 'expiring'} onPress={() => { setFilter('expiring'); setPage(0); }} />
          <Chip label="15분 이내" selected={filter === 'quick'} onPress={() => { setFilter('quick'); setPage(0); }} />
          <Chip label="🧺 냉장고 털기" selected={filter === 'clear'} onPress={() => { setFilter('clear'); setPage(0); }} />
          {s.favorites.length > 0 && <Chip label={`★ 즐겨찾기 ${s.favorites.length}`} selected={filter === 'fav'} onPress={() => { setFilter('fav'); setPage(0); }} />}
        </Row>
      )}
      {searchOpen && tokens.length > 1 ? <T v="tiny" c={color.textSub}>{iga(tokens.join(' + '))} 모두 들어간 메뉴</T> : null}

      {!searchOpen && filter === 'clear' && (
        <View style={{ gap: 6 }}>
          <T v="bodyBold">남은 재료 2~3개를 골라 보세요</T>
          <T v="tiny" c={color.textSub}>고른 재료가 모두 들어가는 메뉴를, 더 살 게 적은 순으로 보여 줘요.</T>
          {clearable.length ? (
            <Row wrap>
              {clearable.slice(0, 18).map((i) => {
                const on = picked.includes(i.name);
                return (
                  <Chip
                    key={i.id}
                    label={`${i.emoji} ${i.name}`}
                    selected={on}
                    onPress={() => { setPicked(on ? picked.filter((x) => x !== i.name) : [...picked, i.name].slice(-4)); setPage(0); }}
                  />
                );
              })}
            </Row>
          ) : (
            <T v="small" c={color.textMuted}>냉장고에 쓸 수 있는 재료가 없어요.</T>
          )}
        </View>
      )}

      {three.length ? (
        <Row gap={space.sm} style={{ alignItems: 'stretch' }}>
          {three.map((m) => <MenuCard key={m.recipe.id} m={m} />)}
          {three.length < 3 && Array.from({ length: 3 - three.length }).map((_, i) => <View key={i} style={{ flex: 1 }} />)}
        </Row>
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: space.xl, gap: space.sm }}>
          <Text style={{ fontSize: 36 }}>🔍</Text>
          <T c={color.textSub}>
            {q.trim()
              ? `‘${q.trim()}’로 만들 수 있는 기본 메뉴가 없어요`
              : filter === 'clear' && !picked.length
                ? '위에서 재료를 골라 주세요'
                : filter === 'clear'
                  ? `${eul(picked.join('·'))} 한 번에 쓰는 메뉴가 없어요. 하나를 빼 보세요`
                  : '맞는 메뉴가 없어요'}
          </T>
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
