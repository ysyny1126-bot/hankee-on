import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { hasAIKey, recipeFromName } from '@/ai/gemini';
import { notify } from '@/components/dialog';
import { Badge, Button, Card, Chip, Emoji, Empty, Field, ListItem, ProgressBar, Row, Screen, SectionHeader, T } from '@/components/ui';
import { color, space } from '@/constants/tokens';
import { actions, useAppState } from '@/data/store';
import { aiRecipeToRecipe } from '@/logic/recipe-convert';
import { rankForUser } from '@/logic/suggestions';
import type { RecipeMatch } from '@/logic/inventory';

export default function Cook() {
  const s = useAppState();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'now' | 'expiring' | 'quick'>('all');
  const [aiLoading, setAiLoading] = useState(false);
  const aiOn = hasAIKey() && s.consents.externalAI;

  const ranked = useMemo(() => rankForUser(s), [s]);
  const shown = ranked.filter((m) => {
    if (q.trim() && !m.recipe.name.includes(q.trim()) && !m.recipe.ingredients.some((i) => i.name.includes(q.trim()))) return false;
    if (filter === 'now') return m.missingRequired.length === 0;
    if (filter === 'expiring') return m.usesExpiring.length > 0;
    if (filter === 'quick') return m.recipe.timeMinutes <= 15;
    return true;
  });

  const searchAI = async () => {
    if (!q.trim()) return;
    setAiLoading(true);
    try {
      const r = await recipeFromName(q.trim(), { allergies: s.preferences.allergies, skill: s.preferences.cookingSkill, maxMinutes: s.preferences.maxCookMinutes });
      if (!r.name) return notify('레시피를 찾지 못했어요', '음식 이름을 다시 확인해 주세요.');
      const recipe = aiRecipeToRecipe(r, 'user');
      actions.saveRecipe(recipe);
      router.push(`/recipe/${recipe.id}`);
    } catch (e) {
      notify('AI 레시피 생성 실패', (e as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Screen>
      <T v="h1" style={{ marginTop: space.sm }}>COOK</T>

      <Card tone="brand">
        <Row>
          <T v="h1">📸</T>
          <View style={{ flex: 1 }}>
            <T v="bodyBold">먹고 싶은 음식 사진 한 장으로</T>
            <T v="small" c={color.textSub}>레시피 → 내 냉장고와 비교 → 부족한 재료 장보기 → 요리 후 기록까지</T>
          </View>
        </Row>
        <Button title="음식 사진 올리기" href="/scan/food" />
      </Card>

      <Field placeholder="요리·재료 검색 (예: 김치, 파스타)" value={q} onChangeText={setQ} returnKeyType="search" />
      <Row wrap>
        <Chip label="전체" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="지금 바로 가능" selected={filter === 'now'} onPress={() => setFilter('now')} />
        <Chip label="⏰ 냉장고 파먹기" selected={filter === 'expiring'} onPress={() => setFilter('expiring')} />
        <Chip label="15분 이내" selected={filter === 'quick'} onPress={() => setFilter('quick')} />
      </Row>
      {s.preferences.allergies.length > 0 && (
        <T v="tiny" c={color.textMuted}>알레르기({s.preferences.allergies.join(', ')})가 들어간 레시피는 목록에서 뺐어요.</T>
      )}

      <SectionHeader title={q.trim() ? `‘${q.trim()}’ 검색 결과` : '내 냉장고로 만들 수 있는 요리'} />
      {shown.length === 0 ? (
        <Empty emoji="🔍" title="맞는 레시피가 없어요" body={q.trim() ? (aiOn ? 'HANKEE AI에게 레시피를 만들어 달라고 해 보세요.' : 'AI가 연결되면 없는 레시피도 만들어 드려요.') : '냉장고에 재료를 등록해 보세요.'}>
          {q.trim() && aiOn ? <Button title={`AI로 ‘${q.trim()}’ 레시피 만들기`} small onPress={searchAI} loading={aiLoading} /> : null}
        </Empty>
      ) : (
        <Card>
          {shown.slice(0, 20).map((m) => <RecipeRow key={m.recipe.id} m={m} />)}
        </Card>
      )}
      {!!q.trim() && aiOn && shown.length > 0 && <Button title={`AI로 ‘${q.trim()}’ 새 레시피 만들기`} kind="secondary" small onPress={searchAI} loading={aiLoading} />}
    </Screen>
  );
}

function RecipeRow({ m }: { m: RecipeMatch }) {
  const r = m.recipe;
  return (
    <View style={{ paddingVertical: 4 }}>
      <ListItem
        href={`/recipe/${r.id}`}
        left={<Emoji>{r.emoji}</Emoji>}
        title={r.name}
        sub={`${r.timeMinutes}분 · ${r.difficulty}${m.missingRequired.length ? ` · 부족: ${m.missingRequired.map((i) => i.name).join(', ')}` : ' · 재료 다 있어요'}`}
        right={
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {m.usesExpiring.length > 0 && <Badge label="임박 재료 활용" tone="warn" />}
            {r.origin !== 'builtin' && <Badge label="AI 레시피" tone="info" />}
          </View>
        }
      />
      <Row>
        <View style={{ flex: 1 }}><ProgressBar ratio={m.coverage} tone={m.coverage >= 1 ? 'fresh' : 'brand'} /></View>
        <T v="tiny" c={color.textSub}>재료 {m.haveCount}/{m.requiredCount}</T>
      </Row>
    </View>
  );
}
