import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Character } from '@/components/character';
import { Icon, type IconName } from '@/components/icon';
import { Row, Screen, T, tx } from '@/components/ui';
import { getCharacter } from '@/constants/characters';
import { color, radius, shadow, space } from '@/constants/tokens';
import { actions, useAllRecipes, useAppState } from '@/data/store';
import type { Ingredient, MealRecord, MealType, Recipe } from '@/data/types';
import { MEAL_LABEL } from '@/logic/analysis';
import { coachState } from '@/logic/coach';
import { addDays, daysUntil, fromDateKey, toDateKey } from '@/logic/dates';
import { mealEmoji } from '@/logic/food-emoji';
import type { RecipeMatch } from '@/logic/inventory';
import { topReasons } from '@/logic/recommend';
import { expiringIngredients, rankForUser } from '@/logic/suggestions';

const SLOTS: MealType[] = ['breakfast', 'lunch', 'dinner'];
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * HOME — "캐릭터가 반겨 주는 냉장고"
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
  const slot: MealType = hour < 10 ? 'breakfast' : hour < 15 ? 'lunch' : 'dinner';

  const stock = s.ingredients;
  const firstUse = expiringIngredients(s).filter((i) => i.kind !== 'leftover');
  const todayMeals = s.meals.filter((m) => m.mealDate === today).sort((a, b) => a.mealTime.localeCompare(b.mealTime));

  // 오늘의 한 끼 후보: 이미 고른 메뉴 → 냉장고 재료로 할 수 있는 순(알레르기·기피는 rankForUser에서 이미 제외)
  const ranked = useMemo(() => rankForUser(s), [s]);
  const chosenEntry = s.mealPlan.find((e) => e.date === today && e.mealType === slot);
  const candidates = useMemo(() => ranked.filter((m) => m.coverage >= 0.5), [ranked]);
  const [pick, setPick] = useState(0);
  const chosen = chosenEntry ? ranked.find((m) => m.recipe.id === chosenEntry.recipeId) ?? null : null;
  const menu: RecipeMatch | null = chosen ?? (candidates.length ? candidates[pick % candidates.length] : null);

  const coach = coachState(s, menu?.recipe.name);
  const charName = getCharacter(p.characterId).name.replace(/\(가칭\)/, '');
  const weekPlanned = s.mealPlan.filter((e) => e.date > today && e.date <= addDays(today, 6)).length;
  const shoppingLeft = s.shopping.filter((x) => !x.done).length;

  const d = fromDateKey(today);
  const dateLabel = `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAY[d.getDay()]}요일`;
  const headline = !stock.length && !s.meals.length
    ? '반가워요'
    : todayMeals.length
      ? `오늘 ${todayMeals.length}끼 챙겼어요`
      : `${MEAL_LABEL[slot]}은 뭐 먹을까요?`;

  const choose = (m: RecipeMatch) => {
    actions.chooseMeal(today, slot, m.recipe.id, topReasons(m, 2).join(' · '));
    router.push(`/recipe/${m.recipe.id}`);
  };
  const another = () => {
    if (chosenEntry) actions.removeMealPlan(chosenEntry.id);
    setPick((n) => n + 1);
  };

  return (
    <Screen>
      {/* 1. 인사·날짜 (작게) */}
      <Row style={{ marginTop: space.xs, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="small" c={color.textMuted}>{dateLabel}</T>
          <T v="h2">{p.nickname}님, {headline}</T>
        </View>
        <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="설정" hitSlop={8} style={styles.iconBtn}>
          <Icon name="settings" size={20} c={color.textSub} />
        </Pressable>
      </Row>

      {/* 2. 캐릭터 + 냉장고 */}
      <FridgeScene
        characterId={p.characterId}
        charName={charName}
        mood={coach.mood}
        line={coach.text}
        holding={coach.moment === 'ate_today' && todayMeals.length ? mealEmoji(todayMeals[todayMeals.length - 1], recipes) : null}
        status={todayMeals.length ? `오늘 ${todayMeals.length}끼 함께했어요` : stock.length ? '같이 오늘 메뉴를 골라요' : '냉장고를 같이 채워 봐요'}
        stock={stock}
        firstUse={firstUse}
      />

      {/* 3. 오늘의 한 끼 */}
      {menu ? (
        <MenuCard
          m={menu}
          slot={slot}
          chosen={!!chosen}
          canSwap={candidates.length > 1 || !!chosen}
          onChoose={() => choose(menu)}
          onCook={() => router.push(`/recipe/${menu.recipe.id}`)}
          onAnother={another}
        />
      ) : (
        <StartCard hasStock={stock.length > 0} />
      )}

      {/* 메뉴 카드 바로 아래: 먹은 음식 기록하기 */}
      <View style={styles.recordBar}>
        <T v="bodyBold" style={{ flex: 1 }}>먹은 음식 기록하기</T>
        <SmallAction icon="camera" label="사진" onPress={() => router.push(`/meal-record/edit?type=${slot}&mode=photo`)} />
        <SmallAction icon="pencil" label="메모" onPress={() => router.push(`/meal-record/edit?type=${slot}`)} />
      </View>

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

// ───────── 2. 캐릭터 + 냉장고 장면 ─────────
function FridgeScene({ characterId, charName, mood, line, holding, status, stock, firstUse }: {
  characterId?: string;
  charName: string;
  mood: 'happy' | 'idle';
  line: string;
  holding: string | null;
  status: string;
  stock: Ingredient[];
  firstUse: Ingredient[];
}) {
  const shown = [...stock].sort((a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999')).slice(0, 6);
  const summary = stock.length
    ? `재료 ${stock.length}개${firstUse.length ? ` · 먼저 쓰면 좋은 재료 ${firstUse.length}개` : ''}`
    : '아직 비어 있어요 · 재료 추가하기';
  return (
    <View style={styles.scene}>
      {/* 말풍선 */}
      <View style={styles.bubble}>
        <T v="small" style={{ fontWeight: '600' }} numberOfLines={2}>{line}</T>
        <View style={styles.bubbleTail} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: space.md, marginTop: 4 }}>
        <View style={{ alignItems: 'center' }}>
          <Character id={characterId} size={118} mood={mood} holding={holding} />
        </View>

        {/* 냉장고: 누르면 보유 재료 화면 */}
        <Pressable
          onPress={() => router.push('/fridge')}
          accessibilityRole="button"
          accessibilityLabel={`냉장고 열기. ${summary}`}
          style={({ pressed }) => [styles.fridge, pressed && { transform: [{ scale: 0.98 }] }]}>
          <View style={styles.freezer}>
            <View style={styles.handle} />
          </View>
          <View style={styles.fridgeBody}>
            {shown.length ? (
              shown.map((i) => <Text key={i.id} style={{ fontSize: 20, width: '33%', textAlign: 'center' }}>{i.emoji}</Text>)
            ) : (
              <T v="tiny" c={color.textMuted} style={{ textAlign: 'center', width: '100%', marginTop: 30 }}>비어 있어요</T>
            )}
            <View style={[styles.handle, { top: 8 }]} />
          </View>
          {firstUse.length > 0 && (
            <View style={styles.fridgeBadge}>
              <T v="tiny" c={color.warnDark} style={{ fontWeight: '800' }}>먼저 {firstUse.length}</T>
            </View>
          )}
        </Pressable>
      </View>

      {/* 이름·상태 + 냉장고 열기 */}
      <View style={styles.sceneFoot}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="bodyBold" numberOfLines={1}>{charName} <T v="small" c={color.textSub}>· {status}</T></T>
        </View>
      </View>
      <Pressable onPress={() => router.push(stock.length ? '/fridge' : '/scan/fridge')} accessibilityRole="button" style={({ pressed }) => [styles.openFridge, pressed && { opacity: 0.85 }]}>
        <Icon name={stock.length ? 'fridge' : 'plus'} size={18} c={color.brandDark} />
        <T v="small" style={{ flex: 1, fontWeight: '700' }}>{summary}</T>
        <Icon name="chevron" size={16} c={color.textSub} />
      </Pressable>
    </View>
  );
}

// ───────── 3. 오늘의 한 끼 ─────────
function MenuCard({ m, slot, chosen, canSwap, onChoose, onCook, onAnother }: { m: RecipeMatch; slot: MealType; chosen: boolean; canSwap: boolean; onChoose: () => void; onCook: () => void; onAnother: () => void }) {
  const r = m.recipe;
  const using = m.matches.filter((x) => x.stock && x.status !== 'staple');
  const expiringIds = new Set(m.usesExpiring.map((i) => i.id));
  const desc = r.features ?? descOf(r);
  const reasons = topReasons(m, 2);
  return (
    <View style={styles.menuCard}>
      <View style={styles.menuArt}>
        {r.imageUri ? (
          <Image source={{ uri: r.imageUri }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel={`${r.name} 사진`} />
        ) : (
          <View style={styles.plate} accessibilityLabel={`${r.name} 그림`}>
            <Text style={{ fontSize: 64 }}>{r.emoji}</Text>
          </View>
        )}
        <View style={styles.menuKicker}>
          <T v="tiny" c={chosen ? color.brandDark : color.textSub} style={{ fontWeight: '800' }}>{chosen ? `✓ 오늘 ${MEAL_LABEL[slot]}으로 정했어요` : `오늘의 한 끼 · ${MEAL_LABEL[slot]}`}</T>
        </View>
      </View>

      <View style={{ padding: 20, gap: space.sm }}>
        <Text style={styles.menuTitle}>{r.name}</Text>
        <T v="small" c={color.textSub} numberOfLines={2}>{desc}</T>
        <Row gap={space.md} wrap>
          <Row gap={4}><Icon name="clock" size={15} c={color.textSub} /><T v="small" c={color.textSub}>약 {r.timeMinutes}분</T></Row>
          <T v="small" c={color.textSub}>{r.difficulty}</T>
          <T v="small" c={m.missingRequired.length ? color.textSub : color.brandDark} style={{ fontWeight: '700' }}>
            {m.missingRequired.length ? `${m.missingRequired.map((i) => i.name).join('·')}만 있으면 돼요` : '냉장고 재료로 바로 만들 수 있어요'}
          </T>
        </Row>

        {using.length > 0 && (
          <View style={{ gap: 6 }}>
            <T v="tiny" c={color.textMuted}>활용할 내 재료</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {using.map((x) => (
                <View key={x.stock!.id} style={[styles.useChip, expiringIds.has(x.stock!.id) && { backgroundColor: color.warnSoft }]}>
                  <Text style={{ fontSize: 14 }}>{x.stock!.emoji}</Text>
                  <T v="tiny" c={color.text} style={{ fontWeight: '700' }}>{x.stock!.name}{expiringIds.has(x.stock!.id) ? ' · 먼저' : ''}</T>
                </View>
              ))}
            </View>
          </View>
        )}
        {reasons.length > 0 && <T v="tiny" c={color.textMuted}>추천 이유: {reasons.join(' · ')}</T>}

        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
          {chosen ? (
            <Pressable onPress={onCook} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Icon name="pot" size={18} c={color.onBrand} />
              <T v="bodyBold" c={color.onBrand}>레시피 보고 요리하기</T>
            </Pressable>
          ) : (
            <Pressable onPress={onChoose} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <T v="bodyBold" c={color.onBrand}>이 메뉴로 할게요</T>
            </Pressable>
          )}
          {canSwap && (
            <Pressable onPress={onAnother} accessibilityRole="button" accessibilityLabel={chosen ? '다른 메뉴로 바꾸기' : '다른 메뉴 보기'} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <Icon name="refresh" size={16} c={color.text} />
              <T v="small" style={{ fontWeight: '700' }}>{chosen ? '바꾸기' : '다른 메뉴'}</T>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function descOf(r: Recipe): string {
  const tags = r.tags.filter((t) => t !== 'AI 생성').slice(0, 2).join(' · ');
  return tags ? `${tags} · ${r.servings}인분 기준` : `${r.servings}인분 기준`;
}

/** 추천할 메뉴가 없을 때(재료가 없거나 적을 때): 입력을 강요하지 않고 두 갈래 길을 보여 준다 */
function StartCard({ hasStock }: { hasStock: boolean }) {
  return (
    <View style={[styles.menuCard, { padding: 20, gap: space.sm }]}>
      <T v="tiny" c={color.textSub} style={{ fontWeight: '800' }}>오늘의 한 끼</T>
      <Text style={styles.menuTitle}>{hasStock ? '재료가 조금 더 있으면\n딱 맞는 메뉴를 골라 드려요' : '오늘은 한 끼부터\n가볍게 시작해요'}</Text>
      <T v="small" c={color.textSub}>냉장고 재료를 넣으면 그 재료로 만들 메뉴를 골라 드려요. 먼저 메뉴를 둘러봐도 좋아요.</T>
      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
        <Pressable onPress={() => router.push('/scan/fridge')} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
          <Icon name="plus" size={18} c={color.onBrand} />
          <T v="bodyBold" c={color.onBrand}>재료 추가하기</T>
        </Pressable>
        <Pressable onPress={() => router.push('/cook')} accessibilityRole="button" style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <Icon name="search" size={16} c={color.text} />
          <T v="small" style={{ fontWeight: '700' }}>메뉴 찾기</T>
        </Pressable>
      </View>
    </View>
  );
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

const styles = StyleSheet.create({
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scene: { backgroundColor: color.scene, borderRadius: 28, padding: 18, paddingBottom: 14, gap: 10 },
  bubble: { alignSelf: 'center', maxWidth: '88%', backgroundColor: color.surface, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, ...shadow.soft },
  bubbleTail: { position: 'absolute', bottom: -6, left: '38%', width: 12, height: 12, backgroundColor: color.surface, transform: [{ rotate: '45deg' }] },
  fridge: { width: 118, height: 156, borderRadius: 22, backgroundColor: '#FFFDF8', borderWidth: 2, borderColor: '#EAD9C0', padding: 6, gap: 5, ...shadow.card },
  freezer: { height: 34, borderRadius: 14, backgroundColor: '#EEF5F3' },
  fridgeBody: { flex: 1, borderRadius: 14, backgroundColor: '#FBF5EA', padding: 8, paddingRight: 14, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', rowGap: 4 },
  handle: { position: 'absolute', right: 5, top: 9, width: 4, height: 16, borderRadius: 2, backgroundColor: '#D9C9B2' },
  fridgeBadge: { position: 'absolute', top: -8, right: -8, backgroundColor: color.warnSoft, borderColor: color.surface, borderWidth: 2, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  sceneFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  openFridge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 16, paddingHorizontal: 14, minHeight: 48 },
  menuCard: { backgroundColor: color.surface, borderRadius: 28, overflow: 'hidden', ...shadow.card, marginTop: space.sm },
  menuArt: { height: 150, backgroundColor: '#FFF7EC', alignItems: 'center', justifyContent: 'center' },
  plate: { width: 116, height: 116, borderRadius: 58, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: '#F6EBDD' },
  menuKicker: { position: 'absolute', left: 14, top: 14, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  menuTitle: { ...tx({ fontSize: 24, lineHeight: 31, fontWeight: '800', letterSpacing: -0.8, color: color.text }) },
  useChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color.surfaceAlt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  primary: { flex: 1, minHeight: 50, borderRadius: 999, backgroundColor: color.brandDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16 },
  secondary: { minHeight: 50, borderRadius: 999, backgroundColor: color.surface, borderWidth: 1, borderColor: color.borderStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  recordBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.surface, borderRadius: radius.md, paddingVertical: 10, paddingLeft: 16, paddingRight: 10 },
  smallAction: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color.brandSoft, borderRadius: 999, paddingHorizontal: 12, minHeight: 40 },
  ingChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: color.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: color.border, minHeight: 48 },
  listCard: { backgroundColor: color.surface, borderRadius: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 60, paddingVertical: 10 },
  rowLine: { borderTopWidth: 1, borderTopColor: color.border },
  rowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: color.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  plusBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.border },
});
