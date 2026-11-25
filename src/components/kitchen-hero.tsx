import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Character } from '@/components/character';
import { FridgeArt } from '@/components/fridge-art';
import { Icon } from '@/components/icon';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { FoodPic, IngPic } from '@/components/pics';
import { IconButton, T, tx } from '@/components/ui';
import { color, pastel, shadow, space } from '@/constants/tokens';
import type { Ingredient } from '@/data/types';
import type { RecipeMatch } from '@/logic/inventory';
import { topReasons } from '@/logic/recommend';

/**
 * 홈 히어로 — 장면 연결형(홈화면_후보A 참고)
 * 1 헤더: 날짜 · 설정
 * 2 제목 + 개수 칩: '오늘 먼저 쓸 재료 n개'(재료 수는 이 한 곳에만, 냉장고 위 배지는 없음)
 * 3 장면 카드: 냉장고(누르면 열기)와 캐릭터가 같은 바닥에, 아래에 '냉장고 열기' 버튼(냉장고를 누른 것과 같은 동작)
 * 4 이번 주 집밥 진행 · 5 오늘의 한 끼 제안
 * 숫자·말풍선은 모두 실제 저장 데이터에서만 나온다.
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
  const [stageW, setStageW] = useState(0);
  const stageK = stageW ? Math.min(1, stageW / 340) : 1;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + space.sm }]}>
      {/* 1. 헤더: 날짜(왼쪽) · 설정(오른쪽, 가장자리 안전 여백) */}
      <View style={styles.header}>
        <T v="small" c={color.textSub} style={{ fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>{dateLabel}</T>
        <IconButton label="설정" onPress={() => router.push('/settings')}>
          <Icon name="settings" size={20} c={color.textSub} />
        </IconButton>
      </View>

      {/* 2. 제목 + 개수(재료 수는 화면에서 여기 한 곳에만) */}
      <View style={styles.titleRow} accessible accessibilityLabel={empty ? '냉장고가 비어 있어요' : `${big.label} ${big.n}개`}>
        <Text allowFontScaling={false} style={styles.title} numberOfLines={1}>{empty ? '냉장고가 비어 있어요' : big.label}</Text>
        {!empty && (
          <View style={styles.countChip}>
            <Text allowFontScaling={false} style={styles.countNum}>{big.n}</Text>
            <Text allowFontScaling={false} style={styles.countUnit}>개</Text>
          </View>
        )}
      </View>

      {/* 3. 장면 카드: 냉장고(왼쪽) + 캐릭터(오른쪽)를 같은 바닥에, 아래에 '냉장고 열기' */}
      <View style={styles.sceneCard}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="scene" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFF8EE" />
              <Stop offset="1" stopColor={pastel.mint} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#scene)" />
        </Svg>

        {/* 무대: 340×232 장면 하나를 카드 폭에 맞춰 통째로 줄인다(좁은 화면에서 말풍선·냉장고·캐릭터가 겹치지 않게) */}
        <View style={[styles.stageBox, { height: 232 * stageK }]} onLayout={(e) => setStageW(e.nativeEvent.layout.width)}>
        <View style={[styles.stage, { transform: [{ scale: stageK }] }]}>
          {/* 같은 바닥: 냉장고와 캐릭터 발밑을 그림자 하나로 */}
          <View style={styles.floorShadow} />
          <Animated.View style={[styles.fridgeSpot, { transform: [{ rotate }] }]}>
            <Pressable
              onPress={openFridge}
              accessibilityRole="button"
              accessibilityLabel={empty ? '냉장고가 비어 있어요. 재료 넣기' : `냉장고 열기. 재료 ${ingredients.length}개, 만들 수 있는 메뉴 보기`}
              style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
              <FridgeArt width={116} items={empty ? [] : peek.map((i) => i.emoji)} />
            </Pressable>
          </Animated.View>

          <View style={styles.charSpot}>
            {/* 말풍선: 캐릭터 머리 위, 꼬리가 캐릭터를 가리킨다 */}
            <View style={styles.speech}>
              <T v="small" style={{ fontWeight: '700' }} numberOfLines={2}>{bubble}</T>
              <View style={styles.speechTail} />
            </View>
            <Character id={characterId} size={112} mood={r ? 'happy' : 'idle'} holding={r ? r.emoji : null} />
          </View>
        </View>
        </View>

        {/* 주요 행동: 냉장고 그림을 누른 것과 같은 동작 */}
        <Pressable onPress={openFridge} accessibilityRole="button" style={({ pressed }) => [styles.openBtn, pressed && styles.pressed]}>
          <T v="bodyBold" c={color.brandDark}>{empty ? '냉장고 채우기' : '냉장고 열기'}</T>
        </Pressable>
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
              <View style={styles.menuArt}><FoodPic id={r.id} name={r.name} emoji={r.emoji} size={58} /></View>
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
                      <IngPic name={u.name} emoji={u.emoji} size={18} />
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

const styles = StyleSheet.create({
  wrap: { backgroundColor: SCENE, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingBottom: space.lg, marginHorizontal: -space.lg, marginTop: -space.md, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingHorizontal: space.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, marginTop: space.xs },
  title: { ...tx({ fontSize: 24, lineHeight: 32, fontWeight: '800', letterSpacing: -0.6, color: color.text }), flexShrink: 1 },
  countChip: { flexDirection: 'row', alignItems: 'baseline', gap: 2, paddingHorizontal: 12, paddingVertical: 2, borderRadius: 999, backgroundColor: '#F8D9A0' },
  countNum: { ...tx({ fontSize: 24, lineHeight: 32, fontWeight: '800', color: color.text }) },
  countUnit: { ...tx({ fontSize: 14, lineHeight: 20, fontWeight: '700', color: color.text }) },
  // 장면 카드: 크림 → 민트, 둥근 모서리. 안에 냉장고·캐릭터 무대와 '냉장고 열기' 버튼
  sceneCard: { marginHorizontal: space.lg, marginTop: space.md, borderRadius: 28, overflow: 'hidden', paddingBottom: space.md, ...shadow.soft },
  stageBox: { marginHorizontal: space.sm, alignItems: 'center', justifyContent: 'flex-start', overflow: 'visible' },
  stage: { width: 340, height: 232, transformOrigin: 'top center' },
  floorShadow: { position: 'absolute', left: 14, right: 14, bottom: 10, height: 16, borderRadius: 999, backgroundColor: 'rgba(95,140,110,0.16)' },
  // 냉장고(왼쪽)와 캐릭터(오른쪽)는 같은 바닥선(bottom 18)에 선다
  fridgeSpot: { position: 'absolute', left: 26, bottom: 18 },
  charSpot: { position: 'absolute', right: 6, bottom: 14, alignItems: 'center', width: 168 },
  speech: { backgroundColor: color.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8, maxWidth: 168, ...shadow.soft },
  speechTail: { position: 'absolute', bottom: -5, left: '50%', marginLeft: -5, width: 10, height: 10, backgroundColor: color.surface, transform: [{ rotate: '45deg' }] },
  // 보조 버튼: 반투명 흰 바탕 + 초록 글씨(진한 초록 채움은 아래 '요리하러 가기' 하나에만 — 화면당 주요 버튼 1개)
  openBtn: { marginHorizontal: space.lg, minHeight: 52, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(59,122,99,0.25)', alignItems: 'center', justifyContent: 'center' },
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
