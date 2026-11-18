import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { HomeScene } from '@/components/home-scene';
import { Badge, Button, Card, Emoji, Row, Screen, SectionHeader, T } from '@/components/ui';
import { clay, color, radius, space } from '@/constants/tokens';
import { actions, useAllRecipes, useAppState } from '@/data/store';
import { MEAL_LABEL } from '@/logic/analysis';
import type { MealType } from '@/data/types';
import { coachState } from '@/logic/coach';
import { addDays, dDayLabel, daysUntil, formatKoreanDate, toDateKey } from '@/logic/dates';
import { mealEmoji } from '@/logic/food-emoji';
import type { RecipeMatch } from '@/logic/inventory';
import { topReasons } from '@/logic/recommend';
import { buildSuggestions, expiringIngredients, rankForUser } from '@/logic/suggestions';

/**
 * HOME — 시각적 우선순위
 * 1 인사 → 2 캐릭터(코치)+냉장고 장면 → 3 오늘 메뉴(주간 계획 습관이면 이번 주 식단도)
 * → 4 임박 재료 → 5 오늘 식사 칸 → 6 제안 2개 → 7 빠른 실행
 */
export default function Home() {
  const s = useAppState();
  const recipes = useAllRecipes();
  const today = toDateKey();
  const warnDays = s.notifications.expiryDaysBefore;
  const p = s.preferences;

  const expiring = expiringIngredients(s, warnDays).filter((i) => i.kind !== 'leftover');
  const todayMeals = s.meals.filter((m) => m.mealDate === today).sort((a, b) => b.mealTime.localeCompare(a.mealTime));
  // 오늘의 메뉴·임박 재료는 위에서 따로 보여 주므로 제안 목록에서는 뺀다
  const suggestions = useMemo(() => buildSuggestions(s).filter((x) => x.kind !== 'today_menu' && x.kind !== 'expiring'), [s]);

  // 오늘의 메뉴 후보: 오늘 식단에 넣은 메뉴 → 냉장고 기반 추천 순
  const ranked = useMemo(() => rankForUser(s), [s]);
  const candidates = useMemo(() => {
    const planned = s.mealPlan
      .filter((x) => x.date === today)
      .map((x) => ranked.find((m) => m.recipe.id === x.recipeId))
      .filter((m): m is RecipeMatch => !!m);
    const rest = ranked.filter((m) => m.coverage >= 0.5 && !planned.some((x) => x.recipe.id === m.recipe.id));
    return [...planned, ...rest];
  }, [ranked, s.mealPlan, today]);
  const [pick, setPick] = useState(0);
  const menu = candidates.length ? candidates[pick % candidates.length] : null;

  const coach = coachState(s, menu?.recipe.name);
  const holdingMeal = coach.moment === 'ate_today' ? todayMeals[0] : null;

  const hour = new Date().getHours();
  const when = hour < 10 ? '아침' : hour < 15 ? '점심' : hour < 21 ? '저녁' : '야식';
  const photoUri = p.showFridgePhoto ? p.fridgePhotoUri : null;
  const weekMode = p.planHabit === 'week';
  const weekPlan = s.mealPlan
    .filter((x) => x.date >= today && x.date <= addDays(today, 6))
    .sort((a, b) => (a.date + ORDER.indexOf(a.mealType)).localeCompare(b.date + ORDER.indexOf(b.mealType)));

  return (
    <Screen>
      {/* 1. 날짜 · 인사 */}
      <View style={{ marginTop: space.sm, gap: 2 }}>
        <T v="small" c={color.textSub}>{formatKoreanDate(today)}</T>
        <T v="h2">{p.nickname}님, {todayMeals.length ? `오늘 ${todayMeals.length}끼 챙겼어요` : `${when} 뭐 먹을까요?`}</T>
      </View>

      {/* 2. 캐릭터(코치) + 냉장고 — 실제 기록에 따라 말과 표정이 바뀐다 */}
      <HomeScene
        characterId={p.characterId}
        ingredients={s.ingredients}
        warnDays={warnDays}
        holding={holdingMeal ? mealEmoji(holdingMeal, recipes) : null}
        mood={coach.mood}
        bubble={coach.text}
        photoUri={photoUri}
        onPressFridge={() => router.push('/fridge')}
        onPressCharacter={() => router.push('/settings')}
      />

      {/* 3. 오늘 메뉴 (또는 이번 주 식단) */}
      {weekMode && (
        <>
          <SectionHeader title="이번 주 식단" action={weekPlan.length ? '전체' : undefined} href="/plan" />
          {weekPlan.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {weekPlan.slice(0, 6).map((x) => {
                const r = recipes.find((y) => y.id === x.recipeId);
                if (!r) return null;
                return (
                  <Pressable key={x.id} onPress={() => router.push(`/recipe/${r.id}`)} style={{ width: 92, alignItems: 'center', gap: 2, paddingVertical: space.sm, ...clay, borderColor: x.date === today ? color.brand : color.border }}>
                    <T v="tiny" c={x.date === today ? color.brandDark : color.textMuted}>{x.date === today ? '오늘' : x.date.slice(5).replace('-', '/')} {MEAL_LABEL[x.mealType]}</T>
                    <T v="h2">{r.emoji}</T>
                    <T v="tiny" numberOfLines={1} style={{ fontWeight: '700' }}>{r.name}</T>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Card>
              <T v="small" c={color.textSub}>냉장고 재료로 일주일 식단을 한 번에 짜 드려요.</T>
              <Button title="이번 주 식단 짜기" kind="secondary" small onPress={() => router.push('/plan?view=week')} />
            </Card>
          )}
        </>
      )}

      <SectionHeader title={`오늘 ${when} 메뉴`} action={weekMode ? undefined : '식단'} href="/plan" />
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
          <T v="small" c={color.textSub}>💡 {menuReason(menu, s.mealPlan.some((x) => x.date === today && x.recipeId === menu.recipe.id))}</T>
          <Row gap={space.sm}>
            <Button title="다른 메뉴" kind="secondary" style={{ flex: 1 }} onPress={() => setPick((n) => n + 1)} disabled={candidates.length < 2} />
            <Button title="요리하기" style={{ flex: 2 }} onPress={() => router.push(`/recipe/${menu.recipe.id}`)} />
          </Row>
        </Card>
      ) : (
        <Card>
          <T v="small" c={color.textSub}>냉장고에 재료를 넣으면 오늘 메뉴를 골라 드려요.</T>
          <Button title="📷 냉장고 사진으로 넣기" kind="secondary" small onPress={() => router.push('/scan/fridge')} />
        </Card>
      )}

      {/* 4. 소비기한 임박 재료 (있을 때만, 한 줄) */}
      {expiring.length > 0 && (
        <>
          <SectionHeader title="먼저 쓰면 좋은 재료" action="냉장고" href="/fridge" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {expiring.map((i) => {
              const d = daysUntil(i.expiryDate!);
              return (
                <Pressable key={i.id} onPress={() => router.push(`/ingredient/edit?id=${i.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: space.sm, paddingHorizontal: space.md, ...clay }}>
                  <T v="h3">{i.emoji}</T>
                  <T v="small" numberOfLines={1} style={{ fontWeight: '600' }}>{i.name}</T>
                  <Badge label={dDayLabel(i.expiryDate!)} tone={d < 0 ? 'danger' : 'warn'} />
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* 5. 오늘 식사 기록: 아침·점심·저녁 칸 */}
      <SectionHeader title="오늘 식사" action="전체 기록" href="/meals" />
      <Row gap={space.sm}>
        {SLOTS.map((t) => {
          const m = todayMeals.find((x) => x.mealType === t);
          return (
            <Pressable
              key={t}
              onPress={() => router.push(m ? `/meal-record/edit?id=${m.id}` : `/meal-record/edit?type=${t}`)}
              accessibilityLabel={m ? `${MEAL_LABEL[t]} ${m.items[0]?.foodName ?? ''}` : `${MEAL_LABEL[t]} 기록하기`}
              style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.md, paddingHorizontal: 4, ...clay, backgroundColor: m ? color.surface : color.surfaceAlt }}>
              <T v="tiny" c={color.textMuted}>{MEAL_LABEL[t]}</T>
              <T v="h2" c={m ? color.text : color.textMuted}>{m ? mealEmoji(m, recipes) : '＋'}</T>
              <T v="tiny" numberOfLines={1} style={{ fontWeight: '600' }} c={m ? color.text : color.textMuted}>{m ? m.items[0]?.foodName ?? '식사' : '기록'}</T>
            </Pressable>
          );
        })}
      </Row>

      {/* 6. 한끼온의 제안 */}
      {suggestions.length > 0 && (
        <>
          <SectionHeader title="한끼온의 제안" />
          <Card>
            {suggestions.slice(0, 2).map((sg) => (
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

      {/* 7. 빠른 실행 */}
      <Row gap={space.sm}>
        <Quick emoji="🧊" label="재료 넣기" onPress={() => router.push('/scan/fridge')} />
        <Quick emoji="📸" label="식사 기록" onPress={() => router.push('/meal-record/edit')} />
        <Quick emoji="🔍" label="메뉴 찾기" onPress={() => router.push('/cook')} />
      </Row>
    </Screen>
  );
}

const SLOTS: MealType[] = ['breakfast', 'lunch', 'dinner'];
const ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** 추천 이유 한 줄 — recommend.ts의 공통 이유를 그대로 쓴다 */
function menuReason(m: RecipeMatch, planned: boolean): string {
  return [planned ? '오늘 식단에 넣은 메뉴' : null, ...topReasons(m, planned ? 1 : 2)].filter(Boolean).join(' · ');
}

function Quick({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 4, paddingVertical: space.md, ...clay, opacity: pressed ? 0.7 : 1 })}>
      <T v="h2">{emoji}</T>
      <T v="small" style={{ fontWeight: '700' }}>{label}</T>
    </Pressable>
  );
}
