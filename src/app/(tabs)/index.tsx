import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Character } from '@/components/character';
import { KitchenHero } from '@/components/kitchen-hero';
import { WeekStrip } from '@/components/week-strip';
import { TidyCard } from '@/components/tidy-card';
import { BackupNudge } from '@/components/backup-nudge';
import { FirstWeekGuide } from '@/components/first-week';
import { PlanCatchUp } from '@/components/plan-catch-up';
import { notify } from '@/components/dialog';
import { Icon, type IconName } from '@/components/icon';
import { Button, Row, Screen, T } from '@/components/ui';
import { color, radius, space } from '@/constants/tokens';
import { actions, useAllRecipes, useAppState } from '@/data/store';
import type { Ingredient, MealRecord, MealType, Recipe } from '@/data/types';
import { MEAL_LABEL } from '@/logic/analysis';
import { coachState } from '@/logic/coach';
import { addDays, daysUntil, fromDateKey, toDateKey, weekStart } from '@/logic/dates';
import { mealEmoji } from '@/logic/food-emoji';
import type { RecipeMatch } from '@/logic/inventory';
import { topReasons } from '@/logic/recommend';
import { expiringIngredients, rankForUser } from '@/logic/suggestions';
import { isUsable } from '@/logic/tidy';

const SLOTS: MealType[] = ['breakfast', 'lunch', 'dinner'];
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * HOME — "캐릭터가 냉장고 재료로 오늘 한 끼를 제안하는 무대"
 * 1 인사·날짜(작게) → 2 캐릭터+냉장고 장면(냉장고를 누르면 재료 화면)
 * → 3 오늘의 한 끼(가장 큰 카드) + 바로 아래 '먹은 음식 기록하기'
 * → 4 먼저 활용하면 좋은 재료 → 5 오늘 식사(아침·점심·저녁 줄) → 6 보조 진입점(작게)
 *
 * 모든 숫자는 실제 저장 데이터에서만 나온다. 없으면 0이나 가짜 값을 꾸미지 않고 '시작 안내'를 보여 준다.
 */
export default function Home() {
  const s = useAppState();
  const recipes = useAllRecipes();
  const p = s.preferences;
  const today = toDateKey();
  const hour = new Date().getHours();
  // 지금 끼니를 이미 먹고 기록했으면 다음 끼니를 제안한다(점심 먹은 뒤엔 저녁 메뉴)
  const nowSlot: MealType = hour < 10 ? 'breakfast' : hour < 15 ? 'lunch' : 'dinner';
  const eaten = (t: MealType) => s.meals.some((m) => m.mealDate === today && m.mealType === t);
  const slot: MealType = SLOTS.slice(SLOTS.indexOf(nowSlot)).find((t) => !eaten(t)) ?? nowSlot;
  const when = slot === nowSlot && !eaten(slot) ? '오늘은' : eaten(slot) ? '다음 끼니는' : `${MEAL_LABEL[slot]}은`;

  const firstUse = expiringIngredients(s).filter((i) => i.kind !== 'leftover' && isUsable(i));
  const todayMeals = s.meals.filter((m) => m.mealDate === today).sort((a, b) => a.mealTime.localeCompare(b.mealTime));

  // 오늘의 한 끼 후보: 이미 고른 메뉴 → 냉장고 재료로 할 수 있는 순(알레르기·기피는 rankForUser에서 이미 제외)
  const ranked = useMemo(() => rankForUser(s), [s]);
  const chosenEntry = s.mealPlan.find((e) => e.date === today && e.mealType === slot && e.status !== 'done' && !e.leftoverId);
  // A5: 남은 음식이 있으면 같은 메뉴를 또 만들자고 하지 않고, 남은 음식을 먼저 권한다
  const leftovers = s.ingredients.filter((i) => i.kind === 'leftover' && isUsable(i));
  const leftoverRecipes = new Set(leftovers.map((l) => l.recipeId).filter(Boolean));
  const candidates = ranked.filter((m) => m.coverage >= 0.5 && !leftoverRecipes.has(m.recipe.id));
  const [pick, setPick] = useState(0);
  const chosen = chosenEntry ? ranked.find((m) => m.recipe.id === chosenEntry.recipeId) ?? null : null;
  const menu: RecipeMatch | null = chosen ?? (candidates.length ? candidates[pick % candidates.length] : null);

  const coach = coachState(s, menu?.recipe.name);
  const weekPlanned = s.mealPlan.filter((e) => e.date > today && e.date <= addDays(today, 6)).length;
  const shoppingLeft = s.shopping.filter((x) => !x.done).length;

  const d = fromDateKey(today);
  const dateLabel = `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAY[d.getDay()]}요일`;

  // 캐릭터 말풍선은 짧게(두 줄 이내)
  const bubble = !menu
    ? '냉장고부터 채워 볼까요?'
    : coach.moment === 'next_menu' || coach.moment === 'start'
      ? '냉장고 열어 볼래요?'
      : coach.text;
  // 이번 주 집밥 횟수(월요일부터) · 집밥 목표가 있으면 그 값, 없으면 5회
  const wk = weekStart(today);
  const homeThisWeek = s.meals.filter((x) => x.mealDate >= wk && x.mealDate <= today && x.sourceType === 'home').length;
  const homeGoal = s.goals.find((g) => g.goalType === 'home_cooking' && g.status === 'active')?.targetValue ?? 5;

  const choose = (m: RecipeMatch) => {
    actions.chooseMeal(today, slot, m.recipe.id, topReasons(m, 2).join(' · '));
    router.push(`/recipe/${m.recipe.id}?prep=1`); // 다음 단계: 냉장고에서 재료 꺼내기
  };
  const another = () => {
    if (menu && !chosen) actions.skipRecipe(menu.recipe.id);
    if (chosenEntry) actions.removeMealPlan(chosenEntry.id);
    setPick((n) => n + 1);
  };

  return (
    <Screen edges={[]}>
      {/* 1~3. 오늘의 한 끼 무대: 코치 한마디 → 냉장고 재료가 캐릭터 주위로 → 캐릭터가 요리를 들고 제안 */}
      <KitchenHero
        characterId={p.characterId}
        dateLabel={dateLabel}
        stock={s.ingredients}
        firstUse={firstUse}
        m={menu}
        chosen={!!chosen}
        when={when}
        bubble={bubble}
        homeCount={homeThisWeek}
        homeGoal={homeGoal}
        canSwap={candidates.length > 1 || !!chosen}
        onChoose={() => menu && choose(menu)}
        onCook={() => menu && router.push(`/recipe/${menu.recipe.id}?prep=1`)}
        onAnother={another}
      />

      {/* 메뉴 카드 바로 아래: 먹은 음식 기록하기 */}
      <View style={[styles.recordBar, { marginTop: space.md }]}>
        <T v="bodyBold" style={{ flex: 1 }}>먹은 음식 기록하기</T>
        <SmallAction icon="camera" label="사진" onPress={() => router.push(`/meal-record/edit?type=${slot}&mode=photo`)} />
        <SmallAction icon="pencil" label="메모" onPress={() => router.push(`/meal-record/edit?type=${slot}`)} />
      </View>

      {/* 첫 주 안내(가입 7일 동안, 셋 다 하면 사라짐) */}
      <FirstWeekGuide wrapStyle={{ marginTop: space.sm }} />

      {/* 남은 음식 먼저: 다시 요리하지 않고 바로 한 끼 */}
      {leftovers.slice(0, 2).map((lo) => (
        <View key={lo.id} style={[styles.recordBar, { marginTop: space.sm }]}>
          <Text style={{ fontSize: 22 }}>{lo.emoji}</Text>
          <View style={{ flex: 1 }}>
            <T v="bodyBold">남은 {lo.name} {lo.quantity}인분</T>
            <T v="tiny" c={color.textSub}>{lo.expiryDate ? `${whenLabel(lo)} · ` : ''}다시 요리하지 않아도 돼요</T>
          </View>
          <Pressable
            onPress={() => { actions.eatLeftover(lo.id, 1, slot); notify('맛있게 드세요!', '식사 기록에 남겼어요.'); }}
            accessibilityRole="button"
            accessibilityLabel={`남은 ${lo.name} 한 끼 먹기`}
            style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}>
            <T v="small" c={color.brandDark} style={{ fontWeight: '700' }}>한 끼 먹기</T>
          </Pressable>
        </View>
      ))}

      {/* 정리가 필요한 재료(기한 지남·아주 조금 남음) — 답하면 추천이 바로 정확해진다 */}
      <PlanCatchUp max={1} wrapStyle={{ marginTop: space.md }} />
      <TidyCard stock={s.ingredients} wrapStyle={{ marginTop: space.md }} lastCheckAt={s.preferences.lastCheckAt} />
      <BackupNudge />

      {/* 4. 먼저 활용하면 좋은 재료 */}
      {firstUse.length > 0 && (
        <View style={{ gap: space.sm, marginTop: space.md }}>
          <T v="h3">먼저 활용하면 좋은 재료</T>
          <T v="small" c={color.textSub}>눌러서 이 재료로 만들 수 있는 메뉴를 볼 수 있어요.</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {firstUse.slice(0, 6).map((i) => (
              <Pressable
                key={i.id}
                onPress={() => router.push(`/cook?ingredient=${encodeURIComponent(i.name)}`)}
                accessibilityRole="button"
                accessibilityLabel={`${i.name}, ${whenLabel(i)}, 이 재료로 만들 메뉴 보기`}
                style={({ pressed }) => [styles.ingChip, pressed && { opacity: 0.8 }]}>
                <Text style={{ fontSize: 20 }}>{i.emoji}</Text>
                <View>
                  <T v="bodyBold">{i.name}</T>
                  <T v="tiny" c={color.warnDark}>{whenLabel(i)}</T>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* 5. 오늘 식사 */}
      <View style={{ gap: space.sm, marginTop: space.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h3">오늘 식사</T>
          <Pressable onPress={() => router.push('/log')} hitSlop={8} accessibilityRole="link">
            <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>기록 전체 보기</T>
          </Pressable>
        </Row>
        <View style={[styles.listCard, { paddingVertical: space.md, paddingHorizontal: space.sm }]}>
          <WeekStrip meals={s.meals} plan={s.mealPlan} onSelect={(d) => router.push(d === today ? '/log' : `/log?date=${d}`)} />
        </View>
        <View style={styles.listCard}>
          {SLOTS.map((t, i) => (
            <MealRow key={t} type={t} meals={todayMeals.filter((m) => m.mealType === t)} recipes={recipes} first={i === 0} />
          ))}
        </View>
        {!todayMeals.length && <T v="small" c={color.textMuted}>지금 먹은 것부터 편하게 기록해요. 이름만 적어도 돼요.</T>}
      </View>

      {/* 6. 보조 진입점: 작게 한 줄씩 */}
      <View style={[styles.listCard, { marginTop: space.md }]}>
        <LinkRow icon="calendar" label="주간 식단" sub={weekPlanned ? `이번 주 ${weekPlanned}끼 계획` : '일주일 계획은 원할 때만'} onPress={() => router.push(p.planHabit === 'week' ? '/plan?view=week' : '/plan')} first />
        <LinkRow icon="cart" label="장보기 목록" sub={shoppingLeft ? `살 것 ${shoppingLeft}개` : '비어 있어요'} onPress={() => router.push('/shopping')} />
        <LinkRow icon="bulb" label="식생활 요약" sub="재료·집밥·장보기 흐름" onPress={() => router.push('/report')} />
      </View>
    </Screen>
  );
}

/** 냉장고 재료의 남은 기간을 글로도 보여 준다(색만으로 구분하지 않기) */
function whenLabel(i: Ingredient): string {
  if (!i.expiryDate) return '기한 미입력';
  const n = daysUntil(i.expiryDate);
  if (n < 0) return '기한이 지났어요 · 상태 확인';
  if (n === 0) return '오늘까지';
  if (n === 1) return '내일까지';
  return `${n}일 남음`;
}

// ───────── 5. 오늘 식사: 끼니 줄 ─────────
function MealRow({ type, meals, recipes, first }: { type: MealType; meals: MealRecord[]; recipes: Recipe[]; first?: boolean }) {
  const m = meals[0];
  const names = meals.flatMap((x) => x.items.map((i) => i.foodName)).filter(Boolean);
  return (
    <View style={[styles.row, !first && styles.rowLine]}>
      <View style={styles.rowIcon}>
        <Text style={{ fontSize: 18 }}>{m ? mealEmoji(m, recipes) : type === 'breakfast' ? '🌤️' : type === 'lunch' ? '☀️' : '🌙'}</Text>
      </View>
      <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => m && router.push(`/meal-record/edit?id=${m.id}`)} disabled={!m} accessibilityRole={m ? 'button' : undefined}>
        <T v="bodyBold">{MEAL_LABEL[type]}</T>
        <T v="small" c={m ? color.textSub : color.textMuted} numberOfLines={1}>{m ? names.join(', ') || m.description || '기록함' : '아직 기록 전이에요'}</T>
      </Pressable>
      <Pressable onPress={() => router.push(`/meal-record/edit?type=${type}`)} accessibilityRole="button" accessibilityLabel={`${MEAL_LABEL[type]} 기록 추가`} hitSlop={6} style={styles.plusBtn}>
        <Icon name="plus" size={18} c={color.text} />
      </Pressable>
    </View>
  );
}

// ───────── 작은 부품 ─────────
function SmallAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}으로 기록하기`} style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}>
      <Icon name={icon} size={16} c={color.brandDark} />
      <T v="small" c={color.brandDark} style={{ fontWeight: '700' }}>{label}</T>
    </Pressable>
  );
}

function LinkRow({ icon, label, sub, onPress, first }: { icon: IconName; label: string; sub: string; onPress: () => void; first?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}, ${sub}`} style={({ pressed }) => [styles.row, !first && styles.rowLine, pressed && { backgroundColor: color.surfaceAlt }]}>
      <Icon name={icon} size={20} c={color.textSub} />
      <T v="bodyBold" style={{ flex: 1 }}>{label}</T>
      <T v="small" c={color.textMuted}>{sub}</T>
      <Icon name="chevron" size={16} c={color.textMuted} />
    </Pressable>
  );
}

/** 홈에서 예상치 못한 오류가 나면: 탓하지 않는 말 + 다시 시도(Expo Router의 ErrorBoundary) */
export function ErrorBoundary({ retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: space.md, paddingTop: 80 }}>
        <Character size={110} mood="idle" />
        <T v="h2" style={{ textAlign: 'center' }}>잠깐 문제가 생겼어요</T>
        <T c={color.textSub} style={{ textAlign: 'center' }}>저장된 기록은 그대로예요. 다시 불러와 볼게요.</T>
        <Button title="다시 시도" onPress={retry} />
        <Button title="냉장고 보기" kind="secondary" onPress={() => router.push('/fridge')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  recordBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.surface, borderRadius: radius.md, paddingVertical: 10, paddingLeft: 16, paddingRight: 10 },
  smallAction: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color.surface, borderWidth: 1, borderColor: color.borderStrong, borderRadius: 999, paddingHorizontal: 12, minHeight: 40 },
  ingChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: color.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: color.border, minHeight: 48 },
  listCard: { backgroundColor: color.surface, borderRadius: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 60, paddingVertical: 10 },
  rowLine: { borderTopWidth: 1, borderTopColor: color.border },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: color.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  plusBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.border },
});
