import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Pattern, Rect, Stop } from 'react-native-svg';

import { Character } from '@/components/character';
import { FoodPic, IngPic } from '@/components/pics';
import { T, tx } from '@/components/ui';
import { art, color, holo, pastel, space } from '@/constants/tokens';
import { findCatalog } from '@/data/catalog';
import type { Recipe } from '@/data/types';
import { formatAmount } from '@/logic/inventory';
import { handyMeasure } from '@/logic/units';

/**
 * 요리 모드의 단계 한 장을 '레시피 카드'로(docs/디자인_레시피카드.md).
 * 무지갯빛 테두리 → 그림 창(음식 그림 + STEP 스티커 + 캐릭터) → 큰 문장 + 넣을 재료·양 → 이름표.
 * 그림 창은 '음식이 주인공, 캐릭터는 조수': 음식은 크게 왼쪽, 고른 캐릭터가 오른쪽 아래에서 냄비 쪽으로 몸을 기울이고
 * '어떤 재료를 + 조리 소리'(두부 넣고 보글보글 …)를 말풍선으로 말한다. 마지막 단계에서는 웃는 얼굴.
 */

/** 이 단계 문장에 나오는 재료(이름·별칭으로 찾기, 최대 3개) */
function stepIngredients(r: Recipe, step: string) {
  return r.ingredients
    .filter((ing) => {
      const c = findCatalog(ing.name);
      const keys = [ing.name, c?.name, ...(c?.aliases ?? [])].filter((k): k is string => !!k && k.length >= 1).map((k) => k.replace(/캔$/, ''));
      return keys.some((k) => step.includes(k));
    })
    .slice(0, 3)
    .map((ing) => ({ name: ing.name, emoji: findCatalog(ing.name)?.emoji ?? '🥄', amount: ing.amount, unit: ing.unit }));
}

/** 세는 단위(개·봉·모 …)는 0.3개 대신 1/3개처럼 — 요리할 때 감이 오게 */
const COUNT_UNITS = ['개', '봉', '모', '대', '쪽', '장', '줌', '통', '마리', '알', '컵', '공기'];
const FRACTIONS: [number, string][] = [[0.25, '1/4'], [0.33, '1/3'], [0.5, '1/2'], [0.67, '2/3'], [0.75, '3/4']];
function amountLabel(amount: number, unit: string) {
  if (!COUNT_UNITS.includes(unit)) return formatAmount(amount, unit);
  const whole = Math.floor(amount + 0.02);
  const rest = amount - whole;
  if (rest < 0.08) return `${whole}${unit}`;
  const f = FRACTIONS.find(([v]) => Math.abs(v - rest) < 0.05);
  if (!f) return formatAmount(amount, unit);
  return whole ? `${whole}과 ${f[1]}${unit}` : `${f[1]}${unit}`;
}

/** 받침(을/를)·(이/가) 고르기 */
const hasBatchim = (w: string) => {
  const c = w.charCodeAt(w.length - 1) - 0xac00;
  return c >= 0 && c <= 11171 && c % 28 !== 0;
};

/**
 * 캐릭터 멘트: '어떤 재료를' + 조리 소리. 예) 애호박·양파·버섯을 쓱싹쓱싹 / 두부 넣고 보글보글 / 청양고추 넣으면 완성!
 * 양은 아래 '넣을 재료' 줄이 크게 보여 주므로 멘트에는 이름만(짧게).
 */
function stepSpeech(step: string, names: string[], last: boolean) {
  const hit = SOUNDS.find(([re]) => re.test(step))?.[1];
  if (!names.length) return last ? '거의 다 됐어요!' : hit ?? '좋아요!';
  const n = names.join('·');
  const eul = hasBatchim(n) ? '을' : '를';
  // [문장에서 찾을 말, ~고, ~면, ~요]
  const v = ([[/넣/, '넣고', '넣으면', '넣어요!'], [/풀/, '풀고', '풀면', '풀어요'], [/올려|올리/, '올리고', '올리면', '올려요'], [/뿌려|뿌리/, '뿌리고', '뿌리면', '뿌려요']] as const).find(([re]) => re.test(step));
  const verb = v?.[1];
  if (last) return v ? `${n} ${v[2]} 완성!` : `${n}${eul} 마무리!`;
  if (!hit) return v ? `${n} ${v[3]}` : `${n} 준비!`;
  if (hit === '쓱싹쓱싹' || hit === '쓱쓱') return `${n}${eul} ${hit}`;
  if (hit === '퐁당!' && verb === '넣고') return `${n} 퐁당!`;
  return verb ? `${n} ${verb} ${hit}` : `${n}${eul} ${hit}`;
}

/** 단계 문장에서 조리 소리 하나 고르기(앞에 있는 규칙이 먼저) */
const SOUNDS: [RegExp, string][] = [
  [/끓/, '보글보글'],
  [/볶/, '달달달'],
  [/굽|구워|구운|부치|부쳐|튀기|튀겨/, '지글지글'],
  [/삶|데치|데쳐/, '퐁당!'],
  [/썰|다지|다져|자르|잘라|찢/, '쓱싹쓱싹'],
  [/섞|비비|비벼|버무|무치|무쳐|풀어/, '쓱쓱'],
  [/전자레인지|돌려/, '띵!'],
  [/식혀|두어|재워|불려/, '잠깐 기다려요'],
  [/담|올리|올려|뿌리|뿌려|곁들/, '짠!'],
  [/넣/, '퐁당!'],
];

/** 이만큼(px) 넘게 밀면 다음·이전 단계로 */
const SWIPE = 70;

export function StepCard({ recipe, index, scale = 1, characterId, onPress, onNext, onPrev }: { recipe: Recipe; index: number; scale?: number; characterId?: string; onPress?: () => void; onNext?: () => void; onPrev?: () => void }) {
  const step = recipe.steps[index];
  const total = recipe.steps.length;
  const used = stepIngredients(recipe, step);
  const last = index === total - 1;
  const speech = stepSpeech(step, used.map((u) => u.name), last);
  const [winH, setWinH] = useState(0);

  // 단계가 바뀌면 살짝 아래에서 올라오며 나타남
  const [appear] = useState(() => new Animated.Value(0));
  // 손가락을 따라 옆으로 움직이는 거리
  const [drag] = useState(() => new Animated.Value(0));
  useEffect(() => {
    appear.setValue(0);
    drag.setValue(0);
    Animated.timing(appear, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [index, appear, drag]);

  // 손가락 동작은 화면이 다시 그려져도 같은 것을 쓰고, 넘길 함수만 최신으로 바꿔 둔다
  const navRef = useRef({ onNext, onPrev });
  useEffect(() => {
    navRef.current = { onNext, onPrev };
  }, [onNext, onPrev]);
  // navRef는 손가락을 움직일 때(그리는 중이 아닐 때)만 읽는다. 타이머가 0.5초마다 화면을 다시 그려도 같은 동작을 써야 밀던 중에 끊기지 않는다.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      // 옆으로 확실히 밀 때만 잡는다(살짝 누르는 건 '눌러서 다음'으로)
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => {
        const { onNext: n, onPrev: p } = navRef.current;
        // 더 갈 곳이 없으면 조금만 따라오고 되돌아온다
        const blocked = (g.dx < 0 && !n) || (g.dx > 0 && !p);
        drag.setValue(blocked ? g.dx * 0.25 : g.dx);
      },
      onPanResponderRelease: (_, g) => {
        const { onNext: n, onPrev: p } = navRef.current;
        const go = g.dx < -SWIPE || g.vx < -0.6 ? n : g.dx > SWIPE || g.vx > 0.6 ? p : undefined;
        if (go) {
          Animated.timing(drag, { toValue: g.dx < 0 ? -420 : 420, duration: 160, useNativeDriver: true }).start(() => go());
        } else {
          Animated.spring(drag, { toValue: 0, useNativeDriver: true, friction: 6 }).start();
        }
      },
      onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start(),
    }),
  );

  return (
    <Animated.View
      {...pan.panHandlers}
      accessibilityActions={[{ name: 'increment', label: '다음 단계' }, { name: 'decrement', label: '이전 단계' }]}
      onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'increment' ? onNext?.() : onPrev?.())}
      style={{
        flex: 1,
        opacity: appear,
        transform: [
          { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          { translateX: drag },
          { rotate: drag.interpolate({ inputRange: [-300, 0, 300], outputRange: ['-6deg', '0deg', '6deg'] }) },
        ],
      }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${index + 1}단계. ${step}${onPress ? ' 눌러서 다음 단계' : ''}`}
        accessibilityHint="옆으로 밀어서 이전·다음 단계로 넘길 수 있어요"
        style={({ pressed }) => [styles.frame, pressed && { transform: [{ scale: 0.99 }] }]}>
        {/* 무지갯빛 테두리 */}
        <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="holo" x1="0" y1="0" x2="1" y2="1">
              {holo.map((c, k) => <Stop key={c} offset={k / (holo.length - 1)} stopColor={c} />)}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#holo)" />
        </Svg>

        <View style={styles.inner}>
          {/* 그림 창 */}
          <View style={styles.window} onLayout={(e) => setWinH(Math.round(e.nativeEvent.layout.height))}>
            {/* 창 높이가 바뀌면(타이머가 생기고 사라질 때) 배경을 새로 그린다 */}
            <Svg key={winH} style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <LinearGradient id="win" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={pastel.peach} />
                  <Stop offset="1" stopColor={pastel.mint} />
                </LinearGradient>
                <Pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
                  <Circle cx="7" cy="7" r="1.3" fill={art.ink} opacity={0.08} />
                </Pattern>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#win)" />
              <Rect width="100%" height="100%" fill="url(#dots)" />
            </Svg>
            {/* 음식(주인공): 왼쪽으로 조금 비켜 캐릭터 자리를 만들고, 식탁 그림자 위에 */}
            {/* 같은 식탁: 냄비와 캐릭터 발밑을 그림자 하나로 묶는다 */}
            <View style={styles.tableShadow} />
            <View style={styles.dish} accessible={false}>
              <FoodPic id={recipe.id} name={recipe.name} emoji={recipe.emoji} size={176} />
            </View>

            {/* 캐릭터(조수): 냄비 쪽으로 몸을 기울이고 단계 소리를 말한다 */}
            <View style={styles.helper} accessible={false}>
              <View style={styles.bubble}>
                <Text allowFontScaling={false} style={styles.bubbleText} numberOfLines={2} lineBreakStrategyIOS="hangul-word">{speech}</Text>
                <View style={styles.bubbleTail} />
              </View>
              <View style={{ transform: [{ rotate: '-10deg' }] }}>
                <Character id={characterId} size={86} mood={last ? 'happy' : 'idle'} />
              </View>
            </View>

            {/* 단계 스티커 */}
            <View style={styles.sticker} accessible={false}>
              <Text allowFontScaling={false} style={styles.stickerSmall}>STEP</Text>
              <Text allowFontScaling={false} style={styles.stickerNum}>{index + 1}</Text>
            </View>

          </View>

          {/* 문장 */}
          <View style={{ flex: 1, justifyContent: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md }}>
            <Text style={styles.step} lineBreakStrategyIOS="hangul-word">{step}</Text>
            {/* 이 단계에 넣을 재료와 양(요리 시작 전 고른 인분 기준) */}
            {used.length > 0 && (
              <View style={styles.useRow} accessibilityLabel={`넣을 재료: ${used.map((u) => `${u.name} ${amountLabel(u.amount * scale, u.unit)}`).join(', ')}`}>
                {used.map((u) => {
                  const handy = handyMeasure(u.amount * scale, u.unit);
                  return (
                    <View key={u.name} style={styles.useChip}>
                      <IngPic name={u.name} emoji={u.emoji} size={30} />
                      <View>
                        <Text allowFontScaling={false} style={styles.useName}>{u.name} <Text style={styles.useAmt}>{amountLabel(u.amount * scale, u.unit)}</Text></Text>
                        {handy ? <Text allowFontScaling={false} style={styles.useHandy}>{handy}</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* 이름표 */}
          <View style={styles.plate}>
            <View style={styles.namePill}>
              <T v="tiny" c={color.textSub} style={{ fontWeight: '700' }} numberOfLines={1}>{recipe.name}</T>
            </View>
            <T v="small" style={{ fontWeight: '800' }}>{index + 1} / {total}</T>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, borderRadius: 28, overflow: 'hidden', padding: 6, shadowColor: '#3A2E26', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  inner: { flex: 1, borderRadius: 22, overflow: 'hidden', backgroundColor: art.paper },
  window: { backgroundColor: pastel.mint, height: '50%', minHeight: 180, alignItems: 'center', justifyContent: 'center', margin: 10, marginBottom: 0, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(58,46,38,0.08)' },
  sticker: { position: 'absolute', top: 10, left: 10, width: 54, height: 54, borderRadius: 27, backgroundColor: color.brandDark, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', transform: [{ rotate: '-8deg' }] },
  stickerSmall: { ...tx({ fontSize: 9, lineHeight: 11, fontWeight: '800', color: '#fff', letterSpacing: 1 }) },
  stickerNum: { ...tx({ fontSize: 20, lineHeight: 22, fontWeight: '800', color: '#fff' }) },
  dish: { position: 'absolute', left: 0, right: 70, top: 22, bottom: -22, alignItems: 'center', justifyContent: 'center' },
  // 냄비 바닥(가운데 + 22 내림 + 약 70px)에 맞춘 식탁 그림자
  tableShadow: { position: 'absolute', top: '50%', marginTop: 80, left: 40, right: 22, height: 20, borderRadius: 999, backgroundColor: 'rgba(154,91,54,0.09)' },
  // 캐릭터 발이 냄비 바닥과 같은 높이에 오게(캐릭터 약 101)
  // 너비를 넉넉히(말풍선이 이 안에서 한 줄로 펼쳐지게), 캐릭터는 오른쪽 끝에
  helper: { position: 'absolute', right: 12, top: '50%', marginTop: -4, width: 230, alignItems: 'flex-end' },
  // 말풍선은 캐릭터 머리 위에 떠 있다(길어지면 위로 자라고, 캐릭터 발 높이는 그대로)
  bubble: { position: 'absolute', bottom: '100%', right: 8, marginBottom: 18, maxWidth: 150, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: art.ink },
  bubbleText: { ...tx({ fontSize: 13, lineHeight: 17, fontWeight: '800', color: art.ink }) },
  bubbleTail: { position: 'absolute', bottom: -6, right: 30, width: 10, height: 10, backgroundColor: '#fff', borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: art.ink, transform: [{ rotate: '45deg' }] },
  useRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  useChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6, paddingRight: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: color.surfaceAlt },
  useName: { ...tx({ fontSize: 15, lineHeight: 20, fontWeight: '700', color: color.text }) },
  useAmt: { color: color.brandDark, fontWeight: '800' },
  useHandy: { ...tx({ fontSize: 11, lineHeight: 14, color: color.textSub }) },
  step: { ...tx({ fontSize: 26, lineHeight: 38, fontWeight: '700', color: color.text }) },
  plate: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: 4 },
  namePill: { maxWidth: '70%', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: color.surfaceAlt },
});
