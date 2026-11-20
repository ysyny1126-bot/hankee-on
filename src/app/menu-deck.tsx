import { router, Stack as RStack } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FridgeArt } from '@/components/fridge-art';
import { Icon } from '@/components/icon';
import { T, tx } from '@/components/ui';
import { color, MAX_WIDTH, shadow, space } from '@/constants/tokens';
import { actions, useAppState } from '@/data/store';
import type { MealType } from '@/data/types';
import { dDayLabel, euro, toDateKey } from '@/logic/dates';
import type { RecipeMatch } from '@/logic/inventory';
import { topReasons } from '@/logic/recommend';
import { expiringIngredients, rankForUser } from '@/logic/suggestions';
import { isUsable } from '@/logic/tidy';
import { nextMealSlot } from '@/logic/planner';

/** 카드 윗부분 색: 메뉴마다 번갈아(정보가 아니라 구분용) */
const TINTS = ['#FFF1DC', '#FDE9E2', '#E8F4EA', '#EAF1FA', '#F6ECF6'];

/**
 * 냉장고를 누르면 나오는 화면(후보 2) — "한 장씩 넘기는 메뉴 카드"
 * 위: 숫자 3개(재료 · 먼저 쓰기 · 바로 만들 수 있음)
 * 가운데: 큰 메뉴 카드를 옆으로 넘김. 카드에는 이름·시간·먼저 쓸 재료 칩 2개·상태 한 줄만.
 * 아래: 버튼 2개(재료 보기 · 이걸로 할래요). 글을 줄여 고르기만 하면 되게.
 */
export default function MenuDeck() {
  const s = useAppState();
  const { width, height } = useWindowDimensions();
  const ART = Math.round(Math.min(280, Math.max(170, height * 0.3))); // 화면이 길면 그림을 크게
  const W = Math.min(width, MAX_WIDTH);
  const CARD = W - 64;
  const GAP = 12;
  const [idx, setIdx] = useState(0);

  const stock = s.ingredients.filter((i) => i.kind !== 'leftover');
  const firstUse = expiringIngredients(s).filter((i) => i.kind !== 'leftover' && isUsable(i));
  const ranked = useMemo(() => rankForUser(s), [s]);
  const leftoverRecipes = new Set(s.ingredients.filter((i) => i.kind === 'leftover').map((l) => l.recipeId));
  const deck = ranked.filter((m) => m.coverage >= 0.5 && !leftoverRecipes.has(m.recipe.id)).slice(0, 12);
  const ready = ranked.filter((m) => m.missingRequired.length === 0).length;

  const slot: MealType = nextMealSlot(s);
  const current = deck[Math.min(idx, deck.length - 1)];

  const pick = (m: RecipeMatch) => {
    actions.chooseMeal(toDateKey(), slot, m.recipe.id, topReasons(m, 2).join(' · '));
    router.replace(`/recipe/${m.recipe.id}?prep=1`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }} edges={['top', 'bottom']}>
      <RStack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
        {/* 머리: 뒤로 · 제목 */}
        <View style={styles.top}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="button" accessibilityLabel="뒤로" hitSlop={10} style={styles.back}>
            <View style={{ transform: [{ scaleX: -1 }] }}><Icon name="chevron" size={22} c={color.text} /></View>
          </Pressable>
          <T v="bodyBold">내 냉장고</T>
          <View style={{ width: 40 }} />
        </View>

        {/* 숫자 3개 */}
        <View style={styles.stats}>
          <Stat n={stock.length} label="재료" />
          <View style={styles.sep} />
          <Stat n={firstUse.length} label="먼저 쓰기" tone={firstUse.length ? color.warnDark : undefined} />
          <View style={styles.sep} />
          <Stat n={ready} label="바로 가능" tone={ready ? color.brandDark : undefined} />
        </View>

        {deck.length === 0 ? (
          <View style={styles.empty}>
            <FridgeArt width={96} />
            <T v="h3" style={{ textAlign: 'center' }}>{stock.length ? '지금 재료로는 고를 메뉴가 적어요' : '냉장고가 비어 있어요'}</T>
            <Pressable onPress={() => router.replace(stock.length ? '/cook' : '/scan/fridge')} style={({ pressed }) => [styles.primary, { alignSelf: 'stretch' }, pressed && styles.pressed]}>
              <T v="bodyBold" c={color.onBrand}>{stock.length ? '메뉴 둘러보기' : '재료 넣기'}</T>
            </Pressable>
          </View>
        ) : (
          <>
            {/* 넘기는 카드 */}
            <FlatList
              data={deck}
              keyExtractor={(m) => m.recipe.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD + GAP}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: (W - CARD) / 2, gap: GAP, alignItems: 'center' }}
              onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / (CARD + GAP)))}
              onScroll={(e) => {
                const n = Math.round(e.nativeEvent.contentOffset.x / (CARD + GAP));
                if (n !== idx) setIdx(n);
              }}
              scrollEventThrottle={64}
              style={{ flexGrow: 0, marginTop: space.lg }}
              renderItem={({ item, index }) => <MenuCard m={item} width={CARD} art={ART} tint={TINTS[index % TINTS.length]} onPress={() => router.push(`/recipe/${item.recipe.id}`)} />}
            />

            {/* 몇 번째 카드인지 */}
            <View style={styles.dots} accessibilityLabel={`${deck.length}개 중 ${idx + 1}번째 메뉴`}>
              {deck.map((m, i) => <View key={m.recipe.id} style={[styles.dot, i === idx && styles.dotOn]} />)}
            </View>
            <T v="tiny" c={color.textMuted} style={{ textAlign: 'center' }}>옆으로 넘겨 보세요</T>

            <View style={{ flex: 1 }} />

            {/* 버튼 2개 */}
            <View style={styles.actions}>
              <Pressable onPress={() => router.push('/fridge')} accessibilityRole="button" style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                <T v="bodyBold">재료 보기</T>
              </Pressable>
              {current ? (
                <Pressable onPress={() => pick(current)} accessibilityRole="button" accessibilityLabel={`${euro(current.recipe.name)} 정하기`} style={({ pressed }) => [styles.primary, { flex: 1 }, pressed && styles.pressed]}>
                  <T v="bodyBold" c={color.onBrand}>이걸로 할래요</T>
                </Pressable>
              ) : null}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }} accessible accessibilityLabel={`${label} ${n}개`}>
      <Text style={[styles.statNum, tone ? { color: tone } : null]}>{n}</Text>
      <T v="tiny" c={color.textSub} style={{ fontWeight: '700' }}>{label}</T>
    </View>
  );
}

/** 메뉴 카드: 그림 · 이름 · 시간 · 먼저 쓸 재료 칩(최대 2) · 상태 한 줄 */
function MenuCard({ m, width, art, tint, onPress }: { m: RecipeMatch; width: number; art: number; tint: string; onPress: () => void }) {
  const r = m.recipe;
  const first = m.usesExpiring.slice(0, 2);
  const missing = m.missingRequired;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${r.name}, ${r.timeMinutes}분, ${missing.length ? `${missing.length}개 더 필요` : '재료 다 있어요'}. 눌러서 레시피 보기`} style={({ pressed }) => [styles.card, { width }, pressed && { transform: [{ scale: 0.99 }] }]}>
      <View style={[styles.art, { backgroundColor: tint, height: art }]}>
        <View style={styles.plate}><Text style={{ fontSize: 64, lineHeight: 76 }}>{r.emoji}</Text></View>
        <View style={styles.time}><T v="tiny" style={{ fontWeight: '800' }}>{r.timeMinutes}분 · {r.difficulty}</T></View>
      </View>
      <View style={{ padding: space.lg, gap: 10 }}>
        <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
        {first.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {first.map((i) => (
              <View key={i.id} style={styles.chip}>
                <Text style={{ fontSize: 13 }}>{i.emoji}</Text>
                <T v="tiny" c={color.warnDark} style={{ fontWeight: '800' }}>{i.name} {dDayLabel(i.expiryDate!)}</T>
              </View>
            ))}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.statusDot, { backgroundColor: missing.length ? color.warn : color.brand }]} />
          <T v="small" c={missing.length ? color.textSub : color.brandDark} style={{ fontWeight: '700' }} numberOfLines={1}>
            {missing.length ? `${missing.slice(0, 2).map((x) => x.name).join('·')}${missing.length > 2 ? ` 외 ${missing.length - 2}개` : ''}만 더 있으면 돼요` : '재료가 다 있어요'}
          </T>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.md, minHeight: 48 },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', alignItems: 'center', marginHorizontal: space.lg, marginTop: space.sm, backgroundColor: color.surface, borderRadius: 20, paddingVertical: space.md },
  sep: { width: 1, height: 28, backgroundColor: color.border },
  statNum: { ...tx({ fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.8, color: color.text }) },
  card: { backgroundColor: color.surface, borderRadius: 28, overflow: 'hidden', ...shadow.card },
  art: { height: 210, alignItems: 'center', justifyContent: 'center' },
  plate: { width: 124, height: 124, borderRadius: 62, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' },
  time: { position: 'absolute', left: 14, top: 14, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  name: { ...tx({ fontSize: 26, lineHeight: 34, fontWeight: '800', letterSpacing: -0.9, color: color.text }) },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color.warnSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: space.md, marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.border },
  dotOn: { width: 18, backgroundColor: color.brandDark },
  actions: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.sm },
  primary: { minHeight: 54, borderRadius: 999, backgroundColor: color.brandDark, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  secondary: { minHeight: 54, borderRadius: 999, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingHorizontal: space.xl },
});
