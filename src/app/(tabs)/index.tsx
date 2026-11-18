import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Character } from '@/components/character';
import { getCoach } from '@/constants/profile';

import { Row, Screen, SectionHeader, T, tx } from '@/components/ui';
import { clay, color, heroGradient, pastel, space } from '@/constants/tokens';
import { actions, useAllRecipes, useAppState } from '@/data/store';
import { MEAL_LABEL } from '@/logic/analysis';
import type { Ingredient, MealType } from '@/data/types';
import { coachState } from '@/logic/coach';
import { addDays, dDayLabel, daysUntil, formatKoreanDate, toDateKey } from '@/logic/dates';
import { mealEmoji } from '@/logic/food-emoji';
import type { RecipeMatch } from '@/logic/inventory';
import { topReasons } from '@/logic/recommend';
import { buildSuggestions, expiringIngredients, rankForUser } from '@/logic/suggestions';

/**
 * HOME (캠퍼스메이트 UX/UI 구성)
 * 1 인사 → 2 대표 카드: 오늘 메뉴 + 캐릭터 → 코치 한마디
 * → 3 파스텔 타일: 냉장고(사진/재료)·먼저 쓸 재료·오늘 식사·식단·장보기 → 4 아침·점심·저녁 칸 → 5 제안
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
  const nextSlot = SLOTS.find((t) => !todayMeals.some((m) => m.mealType === t));

  const leftCount = Math.max(0, 3 - SLOTS.filter((t) => todayMeals.some((m) => m.mealType === t)).length);
  const shoppingLeft = s.shopping.filter((x) => !x.done).length;
  const coachName = getCoach(p.coachId).name;

  return (
    <Screen>
      {/* 1. 인사 */}
      <Row gap={space.md} style={{ marginTop: space.xs }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <Character id={p.characterId} size={40} mood={coach.mood} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="h3" numberOfLines={1}>안녕하세요, {p.nickname}님</T>
          <T v="small" c={color.textSub}>{formatKoreanDate(today)} · {todayMeals.length ? `오늘 ${todayMeals.length}끼 챙겼어요` : `${when} 뭐 먹을까요?`}</T>
        </View>
        <Pressable onPress={() => router.push('/settings')} accessibilityLabel="설정" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' }}>
          <T v="h3">⚙︎</T>
        </Pressable>
      </Row>

      {/* 2. 대표 카드: 오늘 메뉴 */}
      <View style={[styles.hero]}>
        <View style={{ flex: 1, minWidth: 0, gap: 6, zIndex: 1 }}>
          <View style={styles.kicker}><T v="tiny" c={color.navy} style={{ fontWeight: '700' }}>{menu && s.mealPlan.some((x) => x.date === today && x.recipeId === menu.recipe.id) ? '오늘 식단' : `오늘 ${when} 메뉴`}</T></View>
          {menu ? (
            <>
              <Text style={styles.heroTitle}>{menu.recipe.emoji} {menu.recipe.name},{'\n'}어때요?</Text>
              <T v="small" c="rgba(255,255,255,0.92)" style={{ fontWeight: '600' }} numberOfLines={2}>⏱ {menu.recipe.timeMinutes}분 · {menuReason(menu, false)}</T>
              <Row gap={space.sm} style={{ marginTop: space.sm }}>
                <Pressable onPress={() => router.push(`/recipe/${menu.recipe.id}`)} style={styles.heroBtn} accessibilityRole="button">
                  <T v="small" c={color.navy} style={{ fontWeight: '800' }}>요리하기 ›</T>
                </Pressable>
                {candidates.length > 1 && (
                  <Pressable onPress={() => setPick((n) => n + 1)} hitSlop={8} accessibilityRole="button">
                    <T v="small" c="#fff" style={{ fontWeight: '700' }}>다른 메뉴 ↻</T>
                  </Pressable>
                )}
              </Row>
            </>
          ) : (
            <>
              <Text style={styles.heroTitle}>냉장고를 채우면{'\n'}메뉴를 골라 드려요</Text>
              <Pressable onPress={() => router.push('/scan/fridge')} style={[styles.heroBtn, { marginTop: space.sm }]} accessibilityRole="button">
                <T v="small" c={color.navy} style={{ fontWeight: '800' }}>📷 냉장고 찍기 ›</T>
              </Pressable>
            </>
          )}
        </View>
        <View style={styles.heroArt}>
          <Character id={p.characterId} size={92} mood={coach.mood} holding={holdingMeal ? mealEmoji(holdingMeal, recipes) : null} />
        </View>
      </View>

      {/* 코치 한마디 */}
      <Pressable onPress={() => router.push('/settings')} style={styles.notice} accessibilityLabel={`${coachName}: ${coach.text}`}>
        <T v="h3">{getCoach(p.coachId).emoji}</T>
        <T v="small" style={{ flex: 1, fontWeight: '600' }} numberOfLines={2}>{coach.text}</T>
        <T v="small" c={color.textMuted}>›</T>
      </Pressable>

      {/* 3. 냉장고 · 바로가기 (파스텔 타일) */}
      <T v="h2" style={{ marginTop: space.lg }}>내 냉장고</T>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Pressable onPress={() => router.push('/fridge')} style={[styles.tile, { flex: 1, backgroundColor: pastel.peach, minHeight: 284 }]} accessibilityLabel={`냉장고 재료 ${s.ingredients.length}개`}>
          <View style={styles.tag}><T v="tiny" style={{ fontWeight: '700' }}>{photoUri ? '내 냉장고 사진' : '냉장·냉동·실온'}</T></View>
          <Text style={styles.tileTitle}>재료 {s.ingredients.length}개</Text>
          <FridgeMini ingredients={s.ingredients} photoUri={photoUri} warnDays={warnDays} />
          <View style={styles.tileFoot}>
            <T v="small" style={{ fontWeight: '700', flex: 1 }}>{expiring.length ? `먼저 쓸 재료 ${expiring.length}개` : '임박한 재료 없어요'}</T>
            <T v="small">›</T>
          </View>
        </Pressable>
        <View style={{ flex: 1, gap: space.md }}>
          <Pressable onPress={() => router.push(expiring[0] ? `/ingredient/edit?id=${expiring[0].id}` : '/fridge')} style={[styles.tile, { backgroundColor: pastel.pink }]}>
            <View style={styles.tag}><T v="tiny" style={{ fontWeight: '700' }}>먼저 쓰기</T></View>
            <Text style={styles.tileTitle} numberOfLines={1}>{expiring[0] ? expiring[0].name : '여유 있어요'}</Text>
            <T v="small" c="rgba(21,23,42,0.75)" style={{ fontWeight: '600', paddingRight: 44 }}>{expiring[0] ? `${dDayLabel(expiring[0].expiryDate!)}${expiring.length > 1 ? ` · 외 ${expiring.length - 1}개` : ''}` : '기한 임박 재료 0개'}</T>
            <View style={styles.tileIc}><Text style={{ fontSize: 20 }}>{expiring[0]?.emoji ?? '⏰'}</Text></View>
          </Pressable>
          <Pressable onPress={() => router.push(nextSlot ? `/meal-record/edit?type=${nextSlot}` : '/log')} style={[styles.tile, { backgroundColor: pastel.lav }]}>
            <View style={styles.tag}><T v="tiny" style={{ fontWeight: '700' }}>오늘 식사</T></View>
            <Text style={styles.tileTitle}>{todayMeals.length}끼 기록</Text>
            <T v="small" c="rgba(21,23,42,0.75)" style={{ fontWeight: '600', paddingRight: 44 }}>{leftCount ? `${MEAL_LABEL[nextSlot ?? 'dinner']} 기록하기` : '오늘 세 끼 완료'}</T>
            <View style={styles.tileIc}><Text style={{ fontSize: 20 }}>📸</Text></View>
          </Pressable>
        </View>
      </View>
      <Pressable onPress={() => router.push(weekMode ? '/plan?view=week' : '/plan')} style={[styles.tile, styles.tileWide, { backgroundColor: pastel.mint }]}>
        <View style={styles.tileIcStatic}><Text style={{ fontSize: 20 }}>🗓️</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="bodyBold">{weekMode ? '이번 주 식단' : '오늘 식단'}</T>
          <T v="small" c="rgba(21,23,42,0.75)" numberOfLines={1}>{weekPlan.length ? weekPlan.slice(0, 3).map((x) => recipes.find((r) => r.id === x.recipeId)?.name).filter(Boolean).join(' · ') : '냉장고 재료로 한 번에 짜 드려요'}</T>
        </View>
        <T v="h3">›</T>
      </Pressable>
      <Pressable onPress={() => router.push('/shopping')} style={[styles.tile, styles.tileWide, { backgroundColor: pastel.yellow }]}>
        <View style={styles.tileIcStatic}><Text style={{ fontSize: 20 }}>🛒</Text></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="bodyBold">장보기 목록</T>
          <T v="small" c="rgba(21,23,42,0.75)" numberOfLines={1}>{shoppingLeft ? `살 것 ${shoppingLeft}개` : '부족한 재료를 담아 두면 여기서 봐요'}</T>
        </View>
        <T v="h3">›</T>
      </Pressable>

      {/* 4. 오늘 식사 기록: 아침·점심·저녁 칸 */}
      <SectionHeader title="오늘 식사" action="전체 기록" href="/meals" />
      <Row gap={space.sm}>
        {SLOTS.map((t) => {
          const m = todayMeals.find((x) => x.mealType === t);
          return (
            <Pressable
              key={t}
              onPress={() => router.push(m ? `/meal-record/edit?id=${m.id}` : `/meal-record/edit?type=${t}`)}
              accessibilityLabel={m ? `${MEAL_LABEL[t]} ${m.items[0]?.foodName ?? ''}` : `${MEAL_LABEL[t]} 기록하기`}
              style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.lg, paddingHorizontal: 4, ...clay, borderWidth: m ? 0 : 1.5, borderStyle: 'dashed', borderColor: color.borderStrong, backgroundColor: m ? color.surface : 'transparent' }}>
              <T v="tiny" c={color.textMuted}>{MEAL_LABEL[t]}</T>
              <T v="h2" c={m ? color.text : color.textMuted}>{m ? mealEmoji(m, recipes) : '＋'}</T>
              <T v="tiny" numberOfLines={1} c={m ? color.text : color.textMuted}>{m ? m.items[0]?.foodName ?? '식사' : '기록'}</T>
            </Pressable>
          );
        })}
      </Row>

      {/* 5. 한끼온의 제안 */}
      {suggestions.length > 0 && (
        <>
          <SectionHeader title="한끼온의 제안" />
          <View style={{ ...clay, paddingVertical: 4 }}>
            {suggestions.slice(0, 3).map((sg, i) => (
              <Row key={sg.id} style={{ paddingVertical: 14, paddingHorizontal: 18, borderTopWidth: i ? 1 : 0, borderTopColor: color.border }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: color.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 18 }}>{sg.emoji}</Text></View>
                <Pressable style={{ flex: 1 }} onPress={() => sg.action && router.push(sg.action.href as never)}>
                  <T v="bodyBold" numberOfLines={1}>{sg.title}</T>
                  <T v="tiny" c={color.textMuted} numberOfLines={1}>{sg.reason}</T>
                </Pressable>
                <Pressable onPress={() => actions.dismissSuggestion(sg.id)} hitSlop={10} accessibilityLabel="오늘은 숨기기">
                  <T v="small" c={color.textMuted}>✕</T>
                </Pressable>
              </Row>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

/** 냉장고 타일 속 작은 냉장고: 사진이 있으면 사진, 없으면 재료 이모지(임박 재료는 점 표시) */
function FridgeMini({ ingredients, photoUri, warnDays }: { ingredients: Ingredient[]; photoUri: string | null; warnDays: number }) {
  if (photoUri) {
    return <Image source={{ uri: photoUri }} style={{ width: '100%', flex: 1, minHeight: 110, borderRadius: 18 }} contentFit="cover" accessibilityLabel="내 냉장고 사진" />;
  }
  const sorted = [...ingredients].sort((a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999'));
  const shown = sorted.slice(0, 9);
  return (
    <View style={{ flex: 1, minHeight: 110, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.6)', padding: 10, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', gap: 4 }}>
      {shown.length === 0 ? (
        <T v="small" c={color.textSub} style={{ margin: 'auto' }}>비어 있어요</T>
      ) : (
        shown.map((i) => {
          const d = i.expiryDate ? daysUntil(i.expiryDate) : null;
          const dot = d === null ? null : d < 0 ? color.danger : d <= warnDays ? color.warn : null;
          return (
            <View key={i.id} style={{ width: '30%', height: 30, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20 }}>{i.emoji}</Text>
              {dot ? <View style={{ position: 'absolute', top: 1, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: dot, borderWidth: 1.5, borderColor: '#fff' }} /> : null}
            </View>
          );
        })
      )}
    </View>
  );
}

const SLOTS: MealType[] = ['breakfast', 'lunch', 'dinner'];
const ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** 추천 이유 한 줄 — recommend.ts의 공통 이유를 그대로 쓴다 */
function menuReason(m: RecipeMatch, planned: boolean): string {
  return [planned ? '오늘 식단에 넣은 메뉴' : null, ...topReasons(m, planned ? 1 : 2)].filter(Boolean).join(' · ');
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    padding: 22,
    minHeight: 200,
    overflow: 'hidden',
    backgroundColor: '#7B83F2',
    // 파랑→라벤더 그라데이션: 웹은 CSS 그대로, 휴대폰은 RN의 backgroundImage
    ...(Platform.OS === 'web' ? ({ backgroundImage: heroGradient } as object) : { experimental_backgroundImage: heroGradient }),
  },
  heroTitle: { ...tx({ fontSize: 25, lineHeight: 31, fontWeight: '800', letterSpacing: -1.1, color: '#fff' }) },
  heroBtn: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 18, height: 42, alignItems: 'center', justifyContent: 'center' },
  heroArt: { width: 118, height: 118, borderRadius: 59, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  kicker: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: color.surface, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 },
  tile: { position: 'relative', overflow: 'hidden', borderRadius: 24, padding: 18, gap: 4, minHeight: 136 },
  tileWide: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 0, paddingVertical: 14, paddingHorizontal: 16 },
  tileTitle: { ...tx({ fontSize: 20, lineHeight: 25, fontWeight: '800', letterSpacing: -0.8, color: color.navyDeep }), marginTop: 6 },
  tag: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  tileIc: { position: 'absolute', right: 14, bottom: 14, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  tileIcStatic: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  tileFoot: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 16, padding: 10, marginTop: 8 },
});
