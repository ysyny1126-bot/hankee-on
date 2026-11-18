import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { HomeScene } from '@/components/home-scene';
import { Badge, Button, Card, Emoji, Row, Screen, SectionHeader, T } from '@/components/ui';
import { clay, color, radius, space } from '@/constants/tokens';
import { actions, useAllRecipes, useAppState } from '@/data/store';
import { MEAL_LABEL } from '@/logic/analysis';
import { dDayLabel, daysUntil, formatKoreanDate, toDateKey } from '@/logic/dates';
import { mealEmoji } from '@/logic/food-emoji';
import type { RecipeMatch } from '@/logic/inventory';
import { buildSuggestions, expiringIngredients, rankForUser, recentMealNames } from '@/logic/suggestions';

/**
 * HOME
 * 1 날짜·인사 → 2 캐릭터+냉장고 장면 → 3 오늘 요약 → 4 오늘의 메뉴(이유·요리하기·다른 메뉴)
 * → 5 빠른 실행 → 6 먼저 쓸 재료 · 최근 식사 · 한끼온의 제안
 */
export default function Home() {
  const s = useAppState();
  const recipes = useAllRecipes();
  const today = toDateKey();
  const warnDays = s.notifications.expiryDaysBefore;

  const expiring = expiringIngredients(s, warnDays);
  const todayMeals = s.meals.filter((m) => m.mealDate === today).sort((a, b) => b.mealTime.localeCompare(a.mealTime));
  const recent = s.meals.slice().sort((a, b) => (b.mealDate + b.mealTime).localeCompare(a.mealDate + a.mealTime)).slice(0, 3);
  // 오늘의 메뉴·임박 재료는 위에서 따로 보여 주므로 제안 목록에서는 뺀다
  const suggestions = useMemo(() => buildSuggestions(s).filter((x) => x.kind !== 'today_menu' && x.kind !== 'expiring'), [s]);

  // 오늘의 메뉴 후보: 오늘 식단에 넣은 메뉴 → 냉장고 기반 추천 순
  const ranked = useMemo(() => rankForUser(s), [s]);
  const candidates = useMemo(() => {
    const planned = s.mealPlan
      .filter((p) => p.date === today)
      .map((p) => ranked.find((m) => m.recipe.id === p.recipeId))
      .filter((m): m is RecipeMatch => !!m);
    const rest = ranked.filter((m) => m.coverage >= 0.5 && !planned.some((p) => p.recipe.id === m.recipe.id));
    return [...planned, ...rest];
  }, [ranked, s.mealPlan, today]);
  const [pick, setPick] = useState(0);
  const menu = candidates.length ? candidates[pick % candidates.length] : null;
  const recentNames = s.consents.personalization ? recentMealNames(s, 7) : [];

  const hour = new Date().getHours();
  const when = hour < 10 ? '아침' : hour < 15 ? '점심' : hour < 21 ? '저녁' : '야식';
  const greeting = todayMeals.length
    ? `${s.preferences.nickname}님, 오늘 ${todayMeals.length}끼 챙겼어요`
    : `${s.preferences.nickname}님, ${when} 뭐 먹을까요?`;
  const bubble = expiring.length
    ? `${expiring[0].name} ${dDayLabel(expiring[0].expiryDate!)}! 먼저 써요`
    : todayMeals.length
      ? `${todayMeals[0].items[0]?.foodName ?? '식사'} 잘 먹었어요`
      : s.ingredients.length
        ? '냉장고에 재료가 있어요'
        : '냉장고를 채워 볼까요?';

  return (
    <Screen>
      {/* 1. 날짜 · 인사 */}
      <View style={{ marginTop: space.sm, gap: 2 }}>
        <T v="small" c={color.textSub}>{formatKoreanDate(today)}</T>
        <T v="h2">{greeting}</T>
      </View>

      {/* 2. 캐릭터 + 냉장고 */}
      <HomeScene
        characterId={s.preferences.characterId}
        ingredients={s.ingredients}
        warnDays={warnDays}
        holding={todayMeals[0] ? mealEmoji(todayMeals[0], recipes) : null}
        bubble={bubble}
        onPressFridge={() => router.push('/fridge')}
        onPressCharacter={() => router.push('/settings')}
      />

      {/* 3. 오늘 요약 */}
      <Row gap={space.sm}>
        <Stat value={s.ingredients.length} label="냉장고 재료" onPress={() => router.push('/fridge')} />
        <Stat value={todayMeals.length} label="오늘 기록" unit="끼" onPress={() => router.push('/log')} />
        <Stat value={expiring.length} label="먼저 쓸 재료" tone={expiring.length ? 'warn' : undefined} onPress={() => router.push('/fridge')} />
      </Row>

      {/* 4. 오늘의 메뉴 */}
      <SectionHeader title={`오늘 ${when} 메뉴`} />
      {menu ? (
        <Card>
          <Row gap={space.md}>
            <Emoji size={34} bg={color.brandSoft}>{menu.recipe.emoji}</Emoji>
            <View style={{ flex: 1, gap: 4 }}>
              <T v="h3">{menu.recipe.name}</T>
              <Row gap={4} wrap>
                <Badge label={`⏱ ${menu.recipe.timeMinutes}분`} />
                <Badge label={menu.missingRequired.length ? `재료 ${menu.haveCount}/${menu.requiredCount}` : '재료 다 있어요'} tone={menu.missingRequired.length ? 'muted' : 'fresh'} />
              </Row>
            </View>
          </Row>
          <T v="small" c={color.textSub}>💡 {menuReason(menu, recentNames, s.mealPlan.some((p) => p.date === today && p.recipeId === menu.recipe.id))}</T>
          <Row gap={space.sm}>
            <Button title="다른 메뉴" kind="secondary" style={{ flex: 1 }} onPress={() => setPick((p) => p + 1)} disabled={candidates.length < 2} />
            <Button title="요리하기" style={{ flex: 2 }} onPress={() => router.push(`/recipe/${menu.recipe.id}`)} />
          </Row>
        </Card>
      ) : (
        <Card>
          <T v="small" c={color.textSub}>냉장고에 재료를 넣으면 오늘 메뉴를 골라 드려요.</T>
          <Button title="재료 넣기" kind="secondary" small onPress={() => router.push('/scan/fridge')} />
        </Card>
      )}

      {/* 5. 빠른 실행 */}
      <Row gap={space.sm}>
        <Quick emoji="🧊" label="냉장고 등록" onPress={() => router.push('/scan/fridge')} />
        <Quick emoji="📸" label="식사 기록" onPress={() => router.push('/meal-record/edit')} />
        <Quick emoji="🔍" label="메뉴 찾기" onPress={() => router.push('/cook')} />
      </Row>

      {/* 6-1. 먼저 쓰면 좋은 재료 */}
      {expiring.length > 0 && (
        <>
          <SectionHeader title="먼저 쓰면 좋은 재료" action="냉장고" href="/fridge" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {expiring.map((i) => {
              const d = daysUntil(i.expiryDate!);
              return (
                <Pressable key={i.id} onPress={() => router.push(`/ingredient/edit?id=${i.id}`)} style={{ width: 84, alignItems: 'center', gap: 4, paddingVertical: space.md, ...clay }}>
                  <T v="h2">{i.emoji}</T>
                  <T v="small" numberOfLines={1} style={{ fontWeight: '600' }}>{i.name}</T>
                  <Badge label={dDayLabel(i.expiryDate!)} tone={d < 0 ? 'danger' : 'warn'} center />
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* 6-2. 최근 식사 */}
      <SectionHeader title="최근 식사" action={recent.length ? '전체' : undefined} href="/meals" />
      {recent.length ? (
        <Row gap={space.sm}>
          {recent.map((m) => (
            <Pressable key={m.id} onPress={() => router.push(`/meal-record/edit?id=${m.id}`)} style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.md, paddingHorizontal: 4, ...clay }}>
              <T v="h2">{mealEmoji(m, recipes)}</T>
              <T v="small" numberOfLines={1} style={{ fontWeight: '600' }}>{m.items[0]?.foodName ?? '식사'}</T>
              <T v="tiny" c={color.textMuted}>{m.mealDate === today ? '오늘' : m.mealDate.slice(5).replace('-', '/')} {MEAL_LABEL[m.mealType]}</T>
            </Pressable>
          ))}
        </Row>
      ) : (
        <Card><T v="small" c={color.textSub}>아직 기록이 없어요. 사진 한 장이면 돼요.</T></Card>
      )}

      {/* 6-3. 한끼온의 제안 */}
      {suggestions.length > 0 && (
        <>
          <SectionHeader title="한끼온의 제안" />
          <Card>
            {suggestions.slice(0, 3).map((sg) => (
              <Row key={sg.id} style={{ paddingVertical: 4 }}>
                <T v="h3">{sg.emoji}</T>
                <Pressable style={{ flex: 1 }} onPress={() => sg.action && router.push(sg.action.href as never)}>
                  <T v="bodyBold" numberOfLines={1}>{sg.title}</T>
                  <T v="tiny" c={color.textMuted} numberOfLines={1}>{sg.reason}</T>
                </Pressable>
                <Pressable onPress={() => actions.dismissSuggestion(sg.id)} hitSlop={10} accessibilityLabel="오늘은 숨기기">
                  <T v="small" c={color.textMuted}>✕</T>
                </Pressable>
              </Row>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

/** 추천 이유 한 줄(실제 데이터 기준) */
function menuReason(m: RecipeMatch, recentNames: string[], planned: boolean): string {
  const r: string[] = [];
  if (planned) r.push('오늘 식단에 넣은 메뉴');
  if (m.usesExpiring.length) r.push(`${m.usesExpiring.map((i) => i.name).join('·')} 먼저 쓰기`);
  if (!m.missingRequired.length) r.push('냉장고 재료로 바로');
  else r.push(`${m.missingRequired.map((i) => i.name).join('·')}만 있으면 돼요`);
  if (recentNames.length && !recentNames.includes(m.recipe.name)) r.push('최근 안 먹은 메뉴');
  return r.slice(0, 2).join(' · ');
}

function Stat({ value, label, unit = '개', tone, onPress }: { value: number; label: string; unit?: string; tone?: 'warn'; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ ...clay, flex: 1, alignItems: 'center', paddingVertical: space.md, backgroundColor: tone === 'warn' ? color.warnSoft : color.surface, borderBottomColor: tone === 'warn' ? '#F3DFA9' : color.border }}>
      <T v="h2">{value}<T v="small" c={color.textSub}>{unit}</T></T>
      <T v="tiny" c={color.textSub}>{label}</T>
    </Pressable>
  );
}

function Quick({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 4, paddingVertical: space.md, ...clay, opacity: pressed ? 0.7 : 1 })}>
      <T v="h2">{emoji}</T>
      <T v="small" style={{ fontWeight: '700' }}>{label}</T>
    </Pressable>
  );
}
