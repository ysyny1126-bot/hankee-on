import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Badge, Button, Card, Emoji, Empty, ListItem, Row, Screen, SectionHeader, Stack, T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
import { actions, findRecipe, useAppState } from '@/data/store';
import { MEAL_LABEL, SOURCE_LABEL } from '@/logic/analysis';
import { dDayLabel, daysUntil, formatKoreanDate, toDateKey } from '@/logic/dates';
import { buildSuggestions, expiringIngredients } from '@/logic/suggestions';

export default function Home() {
  const s = useAppState();
  const today = toDateKey();
  const suggestions = useMemo(() => buildSuggestions(s), [s]);
  const [showAll, setShowAll] = useState(false);
  const expiring = expiringIngredients(s, 3);
  const todayMeals = s.meals.filter((m) => m.mealDate === today);
  const todayKcal = todayMeals.flatMap((m) => m.items).reduce((a, i) => a + (i.nutrition?.calories ?? 0) * (i.quantity || 1), 0);
  const todayVeg = todayMeals.flatMap((m) => m.items).reduce((a, i) => a + (i.vegetableServings ?? 0), 0);
  const plan = s.mealPlan.filter((p) => p.date === today);

  return (
    <Screen>
      <View style={{ gap: 2, marginTop: space.sm }}>
        <T v="small" c={color.textSub}>{formatKoreanDate(today)}</T>
        <T v="h1">{s.preferences.nickname}님, 오늘 한 끼도 켜 볼까요?</T>
      </View>

      {/* 1. 오늘의 식생활 요약 */}
      <Card tone="brand">
        <T v="small" c={color.brandDark} style={{ fontWeight: '700' }}>오늘의 식생활</T>
        <Row style={{ justifyContent: 'space-between' }}>
          <Stat label="기록한 끼니" value={`${todayMeals.length}끼`} />
          <Stat label="에너지(추정)" value={todayKcal ? `${Math.round(todayKcal)}kcal` : '—'} />
          <Stat label="채소·과일" value={`${Math.round(todayVeg * 10) / 10}접시`} />
          <Stat label="냉장고" value={`${s.ingredients.length}개`} />
        </Row>
        <T v="tiny" c={color.textSub}>영양값은 사진·음식명 기반 추정치예요.</T>
      </Card>

      {/* 빠른 실행 */}
      <Row gap={space.sm}>
        <Quick emoji="🧊" label="냉장고 찍기" href="/scan/fridge" />
        <Quick emoji="📸" label="식사 기록" href="/meal-record/edit" />
        <Quick emoji="🍜" label="음식→레시피" href="/scan/food" />
      </Row>

      {/* 6. 한끼온이 먼저 건네는 제안 */}
      <SectionHeader title="한끼온의 제안" />
      {suggestions.length === 0 ? (
        <Empty emoji="🌱" title="아직 제안할 게 없어요" body="냉장고 재료나 식사를 기록하면 맞춤 제안이 시작돼요." />
      ) : (
        suggestions.slice(0, showAll ? 99 : 3).map((sg) => (
          <Card key={sg.id}>
            <Row style={{ alignItems: 'flex-start' }}>
              <Emoji size={22} bg={color.brandSoft}>{sg.emoji}</Emoji>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyBold">{sg.title}</T>
                <T v="small" c={color.textSub}>{sg.body}</T>
                <Row gap={4} wrap style={{ marginTop: 4 }}>
                  <Badge label={`이유: ${sg.reason}`} tone="muted" />
                  {sg.usesHistory && <Badge label="내 기록 기반" tone="brand" />}
                </Row>
              </View>
            </Row>
            <Row style={{ justifyContent: 'flex-end' }}>
              <Button title="오늘은 그만" kind="ghost" small onPress={() => actions.dismissSuggestion(sg.id)} />
              {sg.action && <Button title={sg.action.label} small onPress={() => router.push(sg.action!.href as never)} />}
            </Row>
          </Card>
        ))
      )}

      {suggestions.length > 3 && (
        <Button title={showAll ? '접기' : `제안 ${suggestions.length - 3}개 더 보기`} kind="ghost" small onPress={() => setShowAll(!showAll)} />
      )}

      {/* 2. 오늘 추천 메뉴(식단 계획) */}
      <SectionHeader title="오늘의 식단" action="식단 짜기" href="/meal" />
      {plan.length ? (
        <Card>
          {plan.map((p) => {
            const r = findRecipe(s, p.recipeId);
            return r ? (
              <ListItem key={p.id} href={`/recipe/${r.id}`} left={<Emoji>{r.emoji}</Emoji>} title={`${MEAL_LABEL[p.mealType]} · ${r.name}`} sub={p.reason} right={<T c={color.textMuted}>›</T>} />
            ) : null;
          })}
        </Card>
      ) : (
        <Card>
          <T v="small" c={color.textSub}>오늘 식단이 비어 있어요. 냉장고 재료로 하루 식단을 만들어 드릴게요.</T>
          <Button title="오늘 식단 만들기" kind="secondary" small href="/meal" />
        </Card>
      )}

      {/* 3. 소비기한 임박 */}
      <SectionHeader title="소비기한이 가까운 재료" action="냉장고" href="/fridge" />
      {expiring.length ? (
        <Card>
          {expiring.slice(0, 5).map((i) => {
            const d = daysUntil(i.expiryDate!);
            return (
              <ListItem key={i.id} href={`/ingredient/edit?id=${i.id}`} left={<Emoji size={22}>{i.emoji}</Emoji>} title={i.name} sub={`${i.quantity}${i.unit} · ${i.expiryDate}`}
                right={<Badge label={dDayLabel(i.expiryDate!)} tone={d < 0 ? 'danger' : d <= 1 ? 'warn' : 'muted'} />} />
            );
          })}
        </Card>
      ) : (
        <Card><T v="small" c={color.textSub}>3일 안에 소비기한이 끝나는 재료가 없어요 👍</T></Card>
      )}

      {/* 5. 최근 식사 */}
      <SectionHeader title="최근 식사" action="전체" href="/meals" />
      {s.meals.length ? (
        <Card>
          {s.meals.slice().sort((a, b) => (b.mealDate + b.mealTime).localeCompare(a.mealDate + a.mealTime)).slice(0, 3).map((m) => (
            <ListItem key={m.id} href={`/meal-record/edit?id=${m.id}`} left={<Emoji size={22}>{m.sourceType === 'home' ? '🍚' : m.sourceType === 'delivery' ? '🛵' : m.sourceType === 'eat_out' ? '🍽️' : '🏪'}</Emoji>}
              title={m.items.map((i) => i.foodName).join(', ') || '(음식 없음)'} sub={`${m.mealDate.slice(5).replace('-', '/')} ${MEAL_LABEL[m.mealType]} · ${SOURCE_LABEL[m.sourceType]}`} />
          ))}
        </Card>
      ) : (
        <Empty emoji="📸" title="첫 식사를 기록해 보세요" body="사진 한 장이나 음식 이름만 적어도 돼요.">
          <Button title="식사 기록하기" small href="/meal-record/edit" />
        </Empty>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <T v="h3">{value}</T>
      <T v="tiny" c={color.textSub}>{label}</T>
    </View>
  );
}

function Quick({ emoji, label, href }: { emoji: string; label: string; href: '/scan/fridge' | '/meal-record/edit' | '/scan/food' }) {
  return (
      <Pressable onPress={() => router.push(href)} style={{ flex: 1, backgroundColor: color.surface, borderRadius: radius.lg, paddingVertical: space.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: color.border }}>
        <T v="h2">{emoji}</T>
        <T v="small" style={{ fontWeight: '700' }}>{label}</T>
      </Pressable>
  );
}
