import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Pattern, Rect, Stop } from 'react-native-svg';

import { Character } from '@/components/character';
import { FoodPic, IngPic } from '@/components/pics';
import { STEP_ILLUSTRATIONS } from '@/data/images';
import { T, tx } from '@/components/ui';
import { art, color, holo, pastel, space } from '@/constants/tokens';
import { findCatalog, INGREDIENT_CATALOG } from '@/data/catalog';
import type { Recipe } from '@/data/types';
import { formatAmount } from '@/logic/inventory';
import { handyMeasure } from '@/logic/units';

/**
 * 요리 모드의 단계 한 장을 '레시피 카드'로(docs/디자인_레시피카드.md).
 * 무지갯빛 테두리 → 그림 창(음식 그림 + STEP 스티커 + 캐릭터) → 큰 문장 + 넣을 재료·양 → 이름표.
 * 그림 창은 모든 레시피·단계 공통: 이 레시피의 완성 음식 그림이 주인공(크게), 고른 캐릭터는 오른쪽 아래 고정 자리의 작은 안내자로
 * '어떤 재료를 + 조리 소리'(두부 넣고 보글보글 …)를 말풍선으로 말한다. 마지막 단계에서는 웃는 얼굴.
 */

/** 한글 음절인지 */
const isHangul = (ch: string | undefined) => !!ch && ch >= '가' && ch <= '힣';
/** 한 글자 재료(파·깨·김·무 …) 뒤에 와도 되는 말(조사·구분점). 이 밖의 한글이 붙으면 다른 낱말(깨끗이·무쳐 …)로 본다 */
const PARTICLE = /^(을|를|이|가|은|는|과|와|도|만|에|의|로|으로|랑|·|,|\s|\)|$)/;

let NAMES: { n: string; c: string }[] | null = null;
/** 재료 사전의 이름·별칭(긴 것부터) — '양파'를 먼저 지워야 그 안의 '파'를 대파로 잘못 읽지 않는다 */
function catalogNames() {
  if (!NAMES) {
    NAMES = [];
    for (const c of INGREDIENT_CATALOG) for (const n of [c.name, ...(c.aliases ?? [])]) for (const v of new Set([n, n.replace(/캔$/, '')])) if (v) NAMES.push({ n: v, c: c.name });
    NAMES.sort((a, b) => b.n.length - a.n.length);
  }
  return NAMES;
}

/** 문장에 실제로 나온 재료(사전 이름 기준)와 그 첫 위치 */
export function mentionedIngredients(step: string): Map<string, number> {
  const found = new Map<string, number>();
  let rest = step;
  for (const { n, c } of catalogNames()) {
    let from = 0;
    for (;;) {
      const i = rest.indexOf(n, from);
      if (i < 0) break;
      from = i + 1;
      // 한 글자 이름은 앞이 한글이 아니고 뒤가 조사·구분점일 때만(깨끗이의 '깨', 무쳐의 '무'는 빼기)
      if (n.length === 1 && (isHangul(rest[i - 1]) || !PARTICLE.test(rest.slice(i + 1)))) continue;
      if (!found.has(c)) found.set(c, i);
      rest = rest.slice(0, i) + ' '.repeat(n.length) + rest.slice(i + n.length);
    }
  }
  return found;
}

/** 이 단계 문장에 나오는 재료(레시피 재료 목록 순서, 최대 3개) */
function stepIngredients(r: Recipe, step: string) {
  const found = mentionedIngredients(step);
  return r.ingredients
    .filter((ing) => {
      const c = findCatalog(ing.name);
      return c ? found.has(c.name) : step.includes(ing.name);
    })
    .slice(0, 3)
    .map((ing) => ({ name: ing.name, emoji: findCatalog(ing.name)?.emoji ?? '🥄', amount: ing.amount, unit: ing.unit, at: found.get(findCatalog(ing.name)?.name ?? '') ?? step.indexOf(ing.name) }));
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

/**
 * 단계 문장 속 '양' 숫자를 인분에 맞게 바꾼다(물 300ml → 2인분이면 600ml).
 * 시간(분·초)·길이(cm)·불 세기 같은 숫자는 그대로. 구멍·등분처럼 개수가 양이 아닌 말도 그대로.
 * scaled 조각은 화면에서 초록 굵은 글씨로 보여 '바뀐 숫자'임을 알린다.
 */
const AMOUNT_RE = /(\d+(?:\.\d+)?)(?:\s*~\s*(\d+(?:\.\d+)?))?\s*(ml|kg|g|L|큰술|작은술|컵|개|장|모|봉|쪽|알|줌)/g;
const NOT_AMOUNT = /구멍|등분|조각|덩이|토막|번|분량/;
export function scaleStepParts(step: string, scale: number): { t: string; scaled?: boolean }[] {
  if (scale === 1) return [{ t: step }];
  const out: { t: string; scaled?: boolean }[] = [];
  let at = 0;
  for (const m of step.matchAll(AMOUNT_RE)) {
    const i = m.index ?? 0;
    const near = step.slice(Math.max(0, i - 6), i + m[0].length + 14);
    if (NOT_AMOUNT.test(near)) continue;
    const unit = m[3];
    const lo = amountLabel(Number(m[1]) * scale, unit);
    const text = m[2] ? `${lo.replace(unit, '')}~${amountLabel(Number(m[2]) * scale, unit)}` : lo;
    out.push({ t: step.slice(at, i) }, { t: text, scaled: true });
    at = i + m[0].length;
  }
  out.push({ t: step.slice(at) });
  return out.filter((x) => x.t);
}
export const scaleStepText = (step: string, scale: number) => scaleStepParts(step, scale).map((x) => x.t).join('');

/** 받침(을/를)·(이/가) 고르기 */
const hasBatchim = (w: string) => {
  const c = w.charCodeAt(w.length - 1) - 0xac00;
  return c >= 0 && c <= 11171 && c % 28 !== 0;
};

/** (으)로 고르기: 받침이 있으면 '으로'(ㄹ 받침은 '로') */
const euro = (w: string) => {
  const c = w.charCodeAt(w.length - 1) - 0xac00;
  return c >= 0 && c <= 11171 && c % 28 !== 0 && c % 28 !== 8 ? '으로' : '로';
};

/** 단계 문장에서 조리 소리 하나 고르기(앞에 있는 규칙이 먼저). 'add'는 재료를 더하는 동작(넣기·올리기·뿌리기 …) */
const SOUNDS: { re: RegExp; sound: string; add?: boolean }[] = [
  { re: /끓/, sound: '보글보글' },
  { re: /볶/, sound: '달달달' },
  { re: /굽|구워|구운|부치|부쳐|튀기|튀겨/, sound: '지글지글' },
  { re: /삶|데치|데쳐/, sound: '퐁당!' },
  { re: /썰|다지|다져|자르|잘라|찢/, sound: '쓱싹쓱싹' },
  { re: /섞|비비|비벼|버무|무치|무쳐|풀어/, sound: '쓱쓱' },
  { re: /전자레인지|돌려/, sound: '띵!' },
  { re: /재워/, sound: '재우는 중' },
  { re: /불려|불린/, sound: '불리는 중' },
  { re: /식혀|두어/, sound: '잠깐 기다려요' },
  { re: /뿌려|뿌리고|뿌리면/, sound: '솔솔', add: true },
  { re: /담아|담고|올려|올리고(?!당)|곁들/, sound: '짠!', add: true },
  { re: /넣/, sound: '넣어요!', add: true },
];
// 재료를 더하는 동사: [찾을 말, ~고, ~면]
const VERBS: [RegExp, string, string][] = [
  [/넣/, '넣고', '넣으면'],
  [/풀어|풀고/, '풀고', '풀면'],
  [/올려|올리고(?!당)/, '올리고', '올리면'],
  [/뿌려|뿌리고|뿌리면/, '뿌리고', '뿌리면'],
];

/**
 * 캐릭터 멘트: '어떤 재료를' + 조리 소리. 예) 애호박·양파·버섯을 쓱싹쓱싹 / 두부 넣고 보글보글 / 청양고추 넣으면 완성!
 * 동사(넣고·뿌리고 …)는 바로 앞에 그 재료가 있을 때만 붙인다 — '새우 물기를 닦고 소금을 뿌려요'에서 뿌리는 건 새우가 아니다.
 * 양은 아래 '넣을 재료' 줄이 크게 보여 주므로 멘트에는 이름만(짧게).
 */
function stepSpeech(step: string, used: { name: string; at: number }[], last: boolean) {
  const hit = SOUNDS.find((x) => x.re.test(step));
  if (!used.length) return last ? '거의 다 됐어요!' : hit?.add ? '좋아요!' : hit?.sound ?? '좋아요!';
  const n = used.map((u) => u.name).join('·');
  const eul = hasBatchim(n) ? '을' : '를';
  // 동사 앞 10글자 안에 재료가 있고, 그 사이에 소금·후추 같은 다른 대상이 없을 때만 동사를 붙인다
  // (재료 이름 '뒤'부터 동사까지만 본다 — '콩나물을' 속 '물을'을 다른 대상으로 오해하지 않게)
  const attachedTo = (x: (typeof VERBS)[number]) => {
    const i = step.search(x[0]);
    return i >= 0 && used.some((u) => u.at >= 0 && u.at < i && i - u.at <= 14 && !/소금|후추|물에|물을/.test(step.slice(u.at + u.name.length, i)));
  };
  const verb = VERBS.find(attachedTo) ?? null;
  if (last) return verb ? `${n} ${verb[2]} 완성!` : `${n}${euro(n)} 마무리!`;
  if (!hit) return `${n} 준비!`;
  if (hit.add) {
    if (!verb) return `${n} 준비!`;
    if (hit.sound === '넣어요!') return /끓는|국물|물에/.test(step) ? `${n} 퐁당!` : `${n} 넣어요!`;
    return `${n} ${verb[1]} ${hit.sound}`;
  }
  if (hit.sound === '재우는 중' || hit.sound === '불리는 중') return `${n} ${hit.sound}!`;
  if (hit.sound === '잠깐 기다려요') return `${n}, 잠깐 기다려요`;
  if (hit.sound === '띵!') return `${n} 띵!`;
  if (hit.sound === '쓱싹쓱싹' || hit.sound === '쓱쓱') return `${n}${eul} ${hit.sound}`;
  return verb ? `${n} ${verb[1]} ${hit.sound}` : `${n}${eul} ${hit.sound}`;
}

/** 담기·마무리 단계인지(캐릭터가 웃는 얼굴) */
function isServing(step: string, last: boolean) {
  return last || /담아|담고|곁들|올려|올리고(?!당)|얹|함께 먹/.test(step);
}

/** 문장이 길면 글씨를 조금 줄인다(카드 한 장에 다 들어가게) */
const stepSize = (t: string) => (t.length > 60 ? { fontSize: 20, lineHeight: 30 } : t.length > 38 ? { fontSize: 22, lineHeight: 33 } : null);

/** 이만큼(px) 넘게 밀면 다음·이전 단계로 */
const SWIPE = 70;

export function StepCard({ recipe, index, scale = 1, characterId, onPress, onNext, onPrev }: { recipe: Recipe; index: number; scale?: number; characterId?: string; onPress?: () => void; onNext?: () => void; onPrev?: () => void }) {
  const step = recipe.steps[index];
  const total = recipe.steps.length;
  const used = stepIngredients(recipe, step);
  const last = index === total - 1;
  const speech = stepSpeech(step, used, last);
  const scene = STEP_ILLUSTRATIONS[recipe.id]?.[index];
  // 단계 전용 삽화를 못 불러오면(파일 없음·오류) 공통 장면으로 대신
  const [failedSrc, setFailedSrc] = useState<number | null>(null);
  // 같은 재료가 앞 단계에도 나왔으면(썰기 → 넣기) 양은 처음 단계에만 — 두 번 넣는 것으로 오해하지 않게
  const again = (name: string) => recipe.steps.slice(0, index).some((st) => stepIngredients(recipe, st).some((u) => u.name === name));
  const [winH, setWinH] = useState(0);
  const [winW, setWinW] = useState(0);
  const comboScale = winH && winW ? Math.min(1.3, (winW - 12) / 300, (winH - 8) / 250) : 1;
  // 카드의 실제 크기(픽셀)로 무지갯빛 테두리를 그린다(웹·아이폰 모두 크기가 바뀌어도 끊기지 않게)
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  // 카드가 낮으면(작은 화면·타이머가 함께 있을 때) 재료 칩을 작게
  const compact = frame.h > 0 && frame.h < 480;

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
        accessibilityLabel={`${index + 1}단계. ${scaleStepText(step, scale)}${onPress ? ' 눌러서 다음 단계' : ''}`}
        accessibilityHint="옆으로 밀어서 이전·다음 단계로 넘길 수 있어요"
        onLayout={(e) => setFrame({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })}
        style={({ pressed }) => [styles.frame, pressed && { transform: [{ scale: 0.99 }] }]}>
        {/* 무지갯빛 테두리 */}
        <Svg style={StyleSheet.absoluteFill} width={frame.w || "100%"} height={frame.h || "100%"} preserveAspectRatio="none" viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="holo" x1="0" y1="0" x2="1" y2="1">
              {holo.map((c, k) => <Stop key={c} offset={k / (holo.length - 1)} stopColor={c} />)}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#holo)" />
        </Svg>

        <View style={styles.inner}>
          {/* 그림 창 */}
          <View style={styles.window} onLayout={(e) => { setWinH(Math.round(e.nativeEvent.layout.height)); setWinW(Math.round(e.nativeEvent.layout.width)); }}>
            {/* 창의 실제 크기로 배경을 그린다(타이머가 생기고 사라져 창 크기가 바뀌어도 꽉 차게) */}
            <Svg style={StyleSheet.absoluteFill} width={winW || "100%"} height={winH || "100%"}>
              <Defs>
                <LinearGradient id="win" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={pastel.peach} />
                  <Stop offset="1" stopColor={pastel.mint} />
                </LinearGradient>
                <Pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
                  <Circle cx="7" cy="7" r="1.2" fill={art.ink} opacity={0.04} />
                </Pattern>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#win)" />
              <Rect width="100%" height="100%" fill="url(#dots)" />
            </Svg>
            {scene && failedSrc !== scene.src ? (
              /* 단계 삽화: 캐릭터가 음식과 함께 있는 한 장(비율 그대로, 잘리지 않게 창 안에 맞춤). 말풍선은 캐릭터 머리 왼쪽 빈자리에 */
              <View style={[styles.scene, { aspectRatio: scene.ratio }]} accessible={false}>
                <Image source={scene.src} style={StyleSheet.absoluteFill} contentFit="contain" onError={() => setFailedSrc(scene.src)} />
                <View style={styles.sceneBubble}>
                  <Text allowFontScaling={false} style={styles.bubbleText} numberOfLines={2} lineBreakStrategyIOS="hangul-word">{speech}</Text>
                  <View style={styles.sceneTail} />
                </View>
              </View>
            ) : (
              /* 300×250 장면 하나로 묶어 창 크기에 맞춰 통째로 줄인다(작은 화면에서도 캐릭터·음식이 잘리지 않게) */
              <View style={[styles.combo, { transform: [{ scale: comboScale }] }]}>
                {/* 같은 식탁: 냄비와 캐릭터 발밑을 그림자 하나로 묶는다 */}
                <View style={styles.tableShadow} />
                {/* 음식(주인공): 이 레시피의 완성 그림을 크게. 뒤에 은은한 복숭아색 원으로 자리를 잡아 준다 */}
                <View style={styles.dishBackdrop} />
                <View style={styles.dish} accessible={false}>
                  <FoodPic id={recipe.id} name={recipe.name} emoji={recipe.emoji} size={190} />
                </View>

                {/* 캐릭터(조수): 냄비 쪽으로 몸을 기울이고 단계 소리를 말한다 */}
                <View style={styles.helper} accessible={false}>
                  <View style={styles.bubble}>
                    <Text allowFontScaling={false} style={styles.bubbleText} numberOfLines={2} lineBreakStrategyIOS="hangul-word">{speech}</Text>
                    <View style={styles.bubbleTail} />
                  </View>
                  <View style={{ transform: [{ rotate: '-10deg' }] }}>
                    <Character id={characterId} size={74} mood={isServing(step, last) ? 'happy' : 'idle'} />
                  </View>
                </View>
              </View>
            )}

            {/* 단계 표시: 보조 정보라 작고 옅게(말풍선·그림보다 앞서지 않게) */}
            <View style={styles.stepTag} accessible={false}>
              <Text allowFontScaling={false} style={styles.stepTagText}>STEP {index + 1}</Text>
            </View>

          </View>

          {/* 문장 */}
          <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} bounces={false}>
            <Text style={[styles.step, stepSize(step), compact && styles.stepCompact]} lineBreakStrategyIOS="hangul-word">
              {scaleStepParts(step, scale).map((p, k) => (p.scaled ? <Text key={k} style={styles.stepScaled}>{p.t}</Text> : p.t))}
            </Text>
            {/* 이 단계에 넣을 재료와 양(요리 시작 전 고른 인분 기준) */}
            {used.length > 0 && (
              <View style={styles.useRow} accessibilityLabel={`넣을 재료: ${used.map((u) => `${u.name} ${again(u.name) ? '앞에서 준비한 것' : amountLabel(u.amount * scale, u.unit)}`).join(', ')}`}>
                {used.map((u) => {
                  const prev = again(u.name);
                  const handy = prev || compact ? null : handyMeasure(u.amount * scale, u.unit);
                  return (
                    <View key={u.name} style={[styles.useChip, compact && styles.useChipCompact]}>
                      <IngPic name={u.name} emoji={u.emoji} size={compact ? 22 : 30} />
                      <View style={{ flexShrink: 1 }}>
                        <Text allowFontScaling={false} style={[styles.useName, compact && styles.useNameCompact]}>{u.name} {prev ? <Text style={styles.usePrev}>준비한 것</Text> : <Text style={styles.useAmt}>{amountLabel(u.amount * scale, u.unit)}</Text>}</Text>
                        {handy ? <Text allowFontScaling={false} style={styles.useHandy}>{handy}</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

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
  // 그림 창: 남는 높이를 차지하되(설명 아래 큰 공백 없이) 너무 커지지 않게, 문장·재료가 길면 먼저 줄어든다
  window: { backgroundColor: pastel.mint, flexGrow: 1, flexShrink: 1, flexBasis: 220, minHeight: 120, maxHeight: 390, alignItems: 'center', justifyContent: 'center', margin: 10, marginBottom: 0, borderRadius: 18, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(58,46,38,0.28)' },
  stepTag: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.85)' },
  stepTagText: { ...tx({ fontSize: 11, lineHeight: 14, fontWeight: '800', color: color.brandDark, letterSpacing: 0.5 }) },
  // 단계 삽화 자리: 창 높이의 92%, 비율은 그림 그대로(가로가 모자라면 가로에 맞춤)
  scene: { height: '92%', maxWidth: '96%' },
  // 말풍선: 삽화 속 캐릭터 머리(오른쪽 위) 왼쪽 빈자리에, 꼬리는 머리 쪽(오른쪽)으로
  sceneBubble: { position: 'absolute', top: '13%', right: '57%', maxWidth: '44%', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: art.ink },
  sceneTail: { position: 'absolute', right: -6, top: '50%', marginTop: -5, width: 10, height: 10, backgroundColor: '#fff', borderRightWidth: 1.5, borderTopWidth: 1.5, borderColor: art.ink, transform: [{ rotate: '45deg' }] },
  // 설명: 그림 창 바로 아래 간격 토큰 하나로 이어지고, 제목(문장) → 양(재료 칩) 순
  // 문장·재료가 카드보다 길면(작은 화면) 이 부분만 위아래로 밀어 본다
  bodyScroll: { flexGrow: 0, flexShrink: 1 },
  body: { gap: space.md, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  combo: { width: 300, height: 250 },
  // (300×250 장면) 음식은 왼쪽~가운데에 크게, 캐릭터는 오른쪽 아래 고정 자리 — 음식을 가리지 않게
  dish: { position: 'absolute', left: 4, top: 22 },
  dishBackdrop: { position: 'absolute', left: 20, top: 40, width: 158, height: 158, borderRadius: 79, backgroundColor: 'rgba(252,239,220,0.9)' },
  // (300×250 장면 안의 위치) 냄비 바닥 높이(약 200)에 맞춘 식탁 그림자
  tableShadow: { position: 'absolute', top: 196, left: 22, right: 6, height: 18, borderRadius: 999, backgroundColor: 'rgba(154,91,54,0.09)' },
  // 캐릭터 발(위 104 + 키 약 101)이 냄비 바닥·그림자와 같은 높이에 오게
  // 너비를 넉넉히(말풍선이 이 안에서 한 줄로 펼쳐지게), 캐릭터는 오른쪽 끝에
  helper: { position: 'absolute', right: 0, top: 118, width: 230, alignItems: 'flex-end' },
  // 말풍선은 캐릭터 머리 위에 떠 있다(길어지면 위로 자라고, 캐릭터 발 높이는 그대로)
  bubble: { position: 'absolute', bottom: '100%', right: 4, marginBottom: 14, maxWidth: 140, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: art.ink },
  bubbleText: { ...tx({ fontSize: 12, lineHeight: 16, fontWeight: '700', color: art.ink }) },
  bubbleTail: { position: 'absolute', bottom: -6, right: 30, width: 10, height: 10, backgroundColor: '#fff', borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: art.ink, transform: [{ rotate: '45deg' }] },
  stepCompact: { fontSize: 19, lineHeight: 27 },
  stepScaled: { color: color.brandDark, fontWeight: '800' },
  useRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  useChip: { maxWidth: '100%', flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6, paddingRight: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: color.surfaceAlt },
  useChipCompact: { paddingVertical: 3, paddingLeft: 4, paddingRight: 10, borderRadius: 12 },
  useNameCompact: { fontSize: 13, lineHeight: 17 },
  useName: { ...tx({ fontSize: 15, lineHeight: 20, fontWeight: '700', color: color.text }) },
  useAmt: { color: color.brandDark, fontWeight: '800' },
  usePrev: { color: color.textSub, fontWeight: '600', fontSize: 13 },
  useHandy: { ...tx({ fontSize: 11, lineHeight: 14, color: color.textSub }) },
  step: { ...tx({ fontSize: 26, lineHeight: 38, fontWeight: '700', color: color.text }) },
  plate: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.md, paddingTop: 4 },
  namePill: { maxWidth: '70%', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: color.surfaceAlt },
});
