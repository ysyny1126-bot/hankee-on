import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Character } from '@/components/character';
import { FridgeArt } from '@/components/fridge-art';
import { Icon } from '@/components/icon';
import { T, tx } from '@/components/ui';
import { color, shadow, space } from '@/constants/tokens';
import type { Ingredient } from '@/data/types';
import type { RecipeMatch } from '@/logic/inventory';
import { topReasons } from '@/logic/recommend';

/**
 * 홈 히어로(후보 A) — "부엌 장면 + 큰 숫자"
 * 1 왼쪽 위: 오늘 먼저 쓸 재료 수를 크게(걸음 수처럼 한눈에)
 * 2 가운데: 냉장고(누르면 메뉴 카드 화면)와 캐릭터가 부엌에 서 있다
 * 3 아래: 이번 주 집밥 진행(1·3·5회 이정표)
 * 4 오늘의 한 끼 제안 한 줄 + 버튼 2개
 * 숫자는 모두 실제 저장 데이터에서만 나온다.
 */
export function KitchenHero({
  characterId,
  dateLabel,
  stock,
  firstUse,
  m,
  chosen,
  when,
  bubble,
  homeCount,
  homeGoal,
  canSwap,
  onChoose,
  onCook,
  onAnother,
  intentBar,
  cardOverride,
}: {
  characterId?: string;
  dateLabel: string;
  stock: Ingredient[];
  firstUse: Ingredient[];
  m: RecipeMatch | null;
  chosen: boolean;
  when: string;
  bubble: string;
  homeCount: number;
  homeGoal: number;
  canSwap: boolean;
  onChoose: () => void;
  onCook: () => void;
  onAnother: () => void;
  /** 카드 맨 위: 끼니 전 '집밥·외식·간단히' 고르기 */
  intentBar?: ReactNode;
  /** 외식·간단히를 골랐을 때 레시피 대신 보여 줄 내용 */
  cardOverride?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const ingredients = stock.filter((i) => i.kind !== 'leftover');
  const empty = ingredients.length === 0;
  const r = m?.recipe;
  // 이 메뉴가 쓰는 내 재료(먼저 쓸 재료를 앞에, 최대 3개)
  const firstIds = new Set(firstUse.map((i) => i.id));
  const using = (m?.matches ?? [])
    .filter((x) => x.stock && x.status !== 'missing' && x.status !== 'staple')
    .map((x) => ({ id: x.stock!.id, name: x.stock!.name, emoji: x.stock!.emoji, first: firstIds.has(x.stock!.id) }))
    .sort((a, b) => Number(b.first) - Number(a.first))
    .slice(0, 3);
  const reason = m ? topReasons(m, 1)[0] : '';

  // 냉장고를 살짝 흔들어 '눌러 보세요'를 알린다(처음 한 번)
  const [wiggle] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.sequence([
      Animated.delay(600),
      Animated.timing(wiggle, { toValue: 1, duration: 120, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(wiggle, { toValue: -1, duration: 160, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(wiggle, { toValue: 0, duration: 120, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
  }, [wiggle]);
  const rotate = wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-3deg', '3deg'] });

  // 큰 숫자: 먼저 쓸 재료 → 없으면 냉장고 재료 수
  const big = firstUse.length > 0 ? { label: '오늘 먼저 쓸 재료', n: firstUse.length } : { label: '냉장고 속 재료', n: ingredients.length };
  const peek = [...firstUse, ...ingredients.filter((i) => !firstUse.includes(i))].slice(0, 6);

  const marks = homeGoal >= 5 ? [1, 3, homeGoal] : [1, Math.max(2, Math.ceil(homeGoal / 2)), Math.max(3, homeGoal)];
  const max = marks[marks.length - 1];
  const ratio = Math.min(1, homeCount / max);

  const openFridge = () => router.push(empty ? '/scan/fridge' : '/menu-deck');

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + space.sm }]}>
      {/* 1. 큰 숫자 */}
      <View style={styles.head}>
        <T v="small" c={color.textSub} style={{ fontWeight: '700' }}>{dateLabel}</T>
        <T v="small" c={color.textSub} style={{ marginTop: space.sm }}>{empty ? '냉장고가 비어 있어요' : big.label}</T>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
          <Text allowFontScaling={false} style={styles.bigNum} accessibilityLabel={empty ? '재료 0개' : `${big.label} ${big.n}개`}>{empty ? 0 : big.n}</Text>
          <T v="bodyBold" style={{ marginBottom: 10 }}>개</T>
        </View>
      </View>

      {/* 2. 부엌: 냉장고 + 캐릭터 */}
      <View style={styles.kitchen}>
        <View style={styles.wall} />
        <View style={styles.counter} />
        <View style={styles.floor} />

        <Animated.View style={[styles.fridgeSpot, { transform: [{ rotate }] }]}>
          <Pressable
            onPress={openFridge}
            accessibilityRole="button"
            accessibilityLabel={empty ? '냉장고가 비어 있어요. 재료 넣기' : `냉장고 열기. 재료 ${ingredients.length}개, 만들 수 있는 메뉴 보기`}
            style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
            <FridgeArt width={112} items={empty ? [] : peek.map((i) => i.emoji)} badge={firstUse.length} />
          </Pressable>
          <View style={styles.tapHint}><T v="tiny" c={color.textSub} style={{ fontWeight: '700' }}>{empty ? '눌러서 채우기' : '눌러서 열기'}</T></View>
        </Animated.View>

        <View style={styles.charSpot}>
          <View style={styles.speech}>
            <T v="small" style={{ fontWeight: '700' }} numberOfLines={2}>{bubble}</T>
            <View style={styles.speechTail} />
          </View>
          <Character id={characterId} size={118} mood={r ? 'happy' : 'idle'} holding={r ? r.emoji : null} />
        </View>
      </View>

      {/* 3. 이번 주 집밥 진행 */}
      <View style={styles.progress}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T v="bodyBold">이번 주 집밥</T>
          <T v="small" c={color.brandDark} style={{ fontWeight: '800' }}>{homeCount}회</T>
        </View>
        <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: Math.min(homeCount, max) }}>
          <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
          {marks.map((mk) => (
            <View key={mk} style={[styles.dot, { left: `${(mk / max) * 100}%` }, homeCount >= mk && styles.dotOn]} />
          ))}
        </View>
        <View style={{ height: 16 }}>
          {marks.map((mk) => (
            <T key={mk} fixed v="tiny" c={homeCount >= mk ? color.brandDark : color.textMuted} style={[styles.markLabel, { left: `${(mk / max) * 100}%` }]}>
              {mk}회
            </T>
          ))}
        </View>
      </View>

      {/* 4. 오늘의 한 끼 */}
      <View style={styles.menuCard}>
        {intentBar}
        {cardOverride ? cardOverride : r ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={styles.menuArt}><Text allowFontScaling={false} style={{ fontSize: 30 }}>{r.emoji}</Text></View>
              <View style={{ flex: 1 }}>
                <T v="small" c={color.textSub}>{when}</T>
                <Text allowFontScaling={false} style={styles.menuName} numberOfLines={1}>{r.name}{chosen ? '' : ' 어때요?'}</Text>
                <T v="tiny" c={color.textSub}>
                  {r.timeMinutes}분 · {m!.missingRequired.length ? `${m!.missingRequired.length}개 더 필요` : '재료 다 있어요'}
                </T>
              </View>
            </View>
            {/* 활용할 내 재료 + 추천 이유(한 줄씩) */}
            <View style={{ gap: 6 }}>
              {using.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }} accessibilityLabel={`활용할 재료: ${using.map((u) => u.name).join(', ')}`}>
                  {using.map((u) => (
                    <View key={u.id} style={[styles.useChip, u.first && styles.useChipFirst]}>
                      <Text allowFontScaling={false} style={{ fontSize: 13 }}>{u.emoji}</Text>
                      <T v="tiny" c={u.first ? color.warnDark : color.text} style={{ fontWeight: '700' }}>{u.name}{u.first ? ' · 먼저' : ''}</T>
                    </View>
                  ))}
                </View>
              )}
              {reason ? <T v="tiny" c={color.textSub}>💡 {reason}</T> : null}
            </View>
            <View style={styles.actions}>
              <Pressable onPress={chosen ? onCook : onChoose} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
                <T v="bodyBold" c={color.onBrand}>{chosen ? '요리하러 가기' : '이걸로 할래요'}</T>
              </Pressable>
              {canSwap && (
                <Pressable onPress={onAnother} accessibilityRole="button" accessibilityLabel="다른 메뉴 보기" style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                  <Icon name="refresh" size={16} c={color.brandDark} />
                  <T v="small" c={color.brandDark} style={{ fontWeight: '700' }}>{chosen ? '바꾸기' : '다른 거'}</T>
                </Pressable>
              )}
            </View>
          </>
        ) : (
          <View style={styles.actions}>
            <Pressable onPress={() => router.push('/scan/fridge')} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Icon name="camera" size={18} c={color.onBrand} />
              <T v="bodyBold" c={color.onBrand}>냉장고 재료 넣기</T>
            </Pressable>
            <Pressable onPress={() => router.push('/cook')} accessibilityRole="button" style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <T v="small" style={{ fontWeight: '700' }}>메뉴 찾기</T>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const SCENE = '#FCEBD3';
const WALL = '#F8DDBB';

const styles = StyleSheet.create({
  wrap: { backgroundColor: SCENE, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingBottom: space.lg, marginHorizontal: -space.lg, marginTop: -space.md, overflow: 'hidden' },
  head: { paddingHorizontal: space.lg },
  bigNum: { ...tx({ fontSize: 64, lineHeight: 72, fontWeight: '800', letterSpacing: -2, color: color.text }) },
  kitchen: { height: 230, marginTop: -8 },
  wall: { position: 'absolute', left: 0, right: 0, top: 0, height: 170, backgroundColor: SCENE },
  counter: { position: 'absolute', left: 0, right: 0, top: 168, height: 8, backgroundColor: '#E9CFA9' },
  floor: { position: 'absolute', left: 0, right: 0, top: 176, bottom: 0, backgroundColor: WALL },
  fridgeSpot: { position: 'absolute', left: '10%', bottom: 18, alignItems: 'center' },
  tapHint: { marginTop: 6, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  charSpot: { position: 'absolute', right: '6%', bottom: 14, alignItems: 'center', width: 170 },
  speech: { backgroundColor: color.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 4, maxWidth: 170, ...shadow.soft },
  speechTail: { position: 'absolute', bottom: -5, left: '45%', width: 10, height: 10, backgroundColor: color.surface, transform: [{ rotate: '45deg' }] },
  progress: { paddingHorizontal: space.lg, marginTop: space.md, gap: 8 },
  track: { height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.75)', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 6, backgroundColor: color.brand },
  dot: { position: 'absolute', width: 12, height: 12, marginLeft: -12, borderRadius: 6, backgroundColor: '#fff', borderWidth: 2, borderColor: '#E9CFA9' },
  dotOn: { borderColor: color.brandDark },
  markLabel: { position: 'absolute', width: 40, marginLeft: -26, textAlign: 'center', fontWeight: '700' },
  menuCard: { marginHorizontal: space.lg, marginTop: space.md, backgroundColor: color.surface, borderRadius: 22, padding: space.md, gap: space.md, ...shadow.soft },
  useChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color.surfaceAlt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  useChipFirst: { backgroundColor: color.warnSoft },
  menuArt: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#FFF4E2', alignItems: 'center', justifyContent: 'center' },
  menuName: { ...tx({ fontSize: 20, lineHeight: 27, fontWeight: '800', letterSpacing: -0.6, color: color.text }) },
  actions: { flexDirection: 'row', gap: space.sm },
  primary: { flex: 1, minHeight: 50, borderRadius: 999, backgroundColor: color.brandDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16 },
  secondary: { minHeight: 50, borderRadius: 999, backgroundColor: color.surface, borderWidth: 1, borderColor: color.borderStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 18 },
  pressed: { opacity: 0.8 },
});
