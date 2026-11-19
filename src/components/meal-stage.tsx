import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Character } from '@/components/character';
import { Icon } from '@/components/icon';
import { T, tx } from '@/components/ui';
import { color, shadow, space } from '@/constants/tokens';
import type { Ingredient } from '@/data/types';
import { daysUntil, eul } from '@/logic/dates';
import type { RecipeMatch } from '@/logic/inventory';

/**
 * 홈 맨 위 '오늘의 한 끼 무대'.
 * 이야기: 냉장고 속 재료들이 반원을 따라 하나씩 나타나고 → 캐릭터가 그 재료로 만든 요리를 들고
 * "오늘은 이거 어때요?" 하고 제안한다. 아래에는 '재료 ＋ 재료 → 요리' 식으로 정리한다.
 *
 * 숫자(칼로리)는 쓰지 않는다. 재료·요리 모두 실제 저장 데이터에서만 나온다.
 */
export interface StageItem {
  key: string;
  emoji: string;
  name: string;
  /** 냉장고에 있음 / 먼저 쓰면 좋음 / 없어서 필요함 */
  kind: 'have' | 'first' | 'need';
}

export function stageItems(m: RecipeMatch): StageItem[] {
  const first = new Set(m.usesExpiring.map((i) => i.id));
  const have = m.matches
    .filter((x) => x.stock && x.status !== 'staple')
    .map((x) => ({ key: x.stock!.id, emoji: x.stock!.emoji, name: x.stock!.name, kind: first.has(x.stock!.id) ? ('first' as const) : ('have' as const) }));
  // 먼저 쓸 재료를 앞에
  have.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'first' ? -1 : 1));
  const need = m.missingRequired.map((i) => ({ key: `need_${i.name}`, emoji: '', name: i.name, kind: 'need' as const }));
  return [...have, ...need].slice(0, 5);
}

export function MealStage({
  characterId,
  kicker,
  m,
  chosen,
  stock,
  firstUse,
  dateLabel,
  onChoose,
  onCook,
  onAnother,
  canSwap,
  mood,
}: {
  characterId?: string;
  kicker: string;
  m: RecipeMatch | null;
  chosen: boolean;
  stock: Ingredient[];
  firstUse: Ingredient[];
  dateLabel: string;
  onChoose: () => void;
  onCook: () => void;
  onAnother: () => void;
  canSwap: boolean;
  mood: 'happy' | 'idle';
}) {
  const insets = useSafeAreaInsets();
  const [w, setW] = useState(0);
  const items = m ? stageItems(m) : [];
  const r = m?.recipe;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + space.sm }]}>
      {/* 맨 위: 날짜 · 냉장고 바로가기(재료 수 + 먼저 쓸 재료) */}
      <View style={styles.topRow}>
        <T v="small" c={color.textSub} style={{ fontWeight: '700' }}>{dateLabel}</T>
        <Pressable
          onPress={() => router.push(stock.length ? '/fridge' : '/scan/fridge')}
          accessibilityRole="button"
          accessibilityLabel={stock.length ? `냉장고 열기. 재료 ${stock.length}개${firstUse.length ? `, 먼저 쓰면 좋은 재료 ${firstUse.length}개` : ''}` : '냉장고가 비어 있어요. 재료 추가하기'}
          style={({ pressed }) => [styles.fridgeBtn, pressed && { opacity: 0.85 }]}>
          <Icon name="fridge" size={18} c={color.brandDark} />
          <T v="small" style={{ fontWeight: '800' }}>{stock.length ? `냉장고 ${stock.length}` : '냉장고 채우기'}</T>
          {firstUse.length > 0 && (
            <View style={styles.firstPill}><T v="tiny" c={color.warnDark} style={{ fontWeight: '800' }}>먼저 {firstUse.length}</T></View>
          )}
        </Pressable>
      </View>

      {/* 제안 문장 */}
      <View style={{ alignItems: 'center', gap: 4, marginTop: space.md, paddingHorizontal: space.lg }}>
        <T v="small" c={color.textSub} style={{ fontWeight: '700', textAlign: 'center' }}>{kicker}</T>
        {r ? (
          <Text style={styles.headline} accessibilityRole="header">
            {chosen ? '오늘은 ' : '오늘은 '}
            <Text style={{ color: color.brandDark }}>{r.name}</Text>
            {chosen ? ' 만들어요!' : ' 어때요?'}
          </Text>
        ) : (
          <Text style={styles.headline} accessibilityRole="header">냉장고를 채우면{'\n'}오늘 메뉴를 골라 드려요</Text>
        )}
      </View>

      {/* 무대: 반원 + 재료 + 캐릭터 */}
      <View style={styles.stage} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <View style={[styles.arc, w ? { width: w * 0.86, height: w * 0.86, borderRadius: w * 0.43, left: w * 0.07 } : null]} />
        {w > 0 && (r ? items : PLACEHOLDERS).map((it, i, arr) => (
          <Bubble key={`${r?.id ?? 'empty'}_${it.key}`} item={it} index={i} total={arr.length} width={w} empty={!r} />
        ))}
        <View style={styles.charSpot}>
          <Character id={characterId} size={150} mood={mood} holding={r ? r.emoji : null} />
        </View>
      </View>

      {/* 재료 ＋ 재료 → 요리 */}
      {r ? (
        <View style={styles.equation} accessibilityLabel={`${items.filter((x) => x.kind !== 'need').map((x) => x.name).join(', ')}로 ${r.name}, 약 ${r.timeMinutes}분`}>
          <Text style={{ fontSize: 18 }} numberOfLines={1}>
            {items.filter((x) => x.kind !== 'need').map((x) => x.emoji).join(' ＋ ') || '🧂'} <Text style={{ color: color.textMuted }}>→</Text> {r.emoji}
          </Text>
          <T v="small" c={color.textSub} style={{ fontWeight: '600' }}>약 {r.timeMinutes}분 · {r.difficulty}{m!.missingRequired.length ? ` · ${eul(m!.missingRequired.map((i) => i.name).join('·'))} 더 사면 돼요` : ' · 지금 있는 재료로 충분해요'}</T>
        </View>
      ) : (
        <View style={styles.equation}>
          <T v="small" c={color.textSub} style={{ textAlign: 'center' }}>사진 한 장이면 재료가 무대에 올라와요. 먼저 메뉴를 둘러봐도 좋아요.</T>
        </View>
      )}

      {/* 행동 */}
      <View style={styles.actions}>
        {r ? (
          <>
            <Pressable onPress={chosen ? onCook : onChoose} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              {chosen ? <Icon name="pot" size={18} c={color.onBrand} /> : null}
              <T v="bodyBold" c={color.onBrand}>{chosen ? '레시피 보고 요리하기' : '좋아요, 이걸로 할래요'}</T>
            </Pressable>
            {canSwap && (
              <Pressable onPress={onAnother} accessibilityRole="button" accessibilityLabel={chosen ? '다른 메뉴로 바꾸기' : '다른 메뉴 보기'} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                <Icon name="refresh" size={16} c={color.text} />
                <T v="small" style={{ fontWeight: '700' }}>{chosen ? '바꾸기' : '다른 거'}</T>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <Pressable onPress={() => router.push('/scan/fridge')} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <Icon name="camera" size={18} c={color.onBrand} />
              <T v="bodyBold" c={color.onBrand}>냉장고 재료 넣기</T>
            </Pressable>
            <Pressable onPress={() => router.push('/cook')} accessibilityRole="button" style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <Icon name="search" size={16} c={color.text} />
              <T v="small" style={{ fontWeight: '700' }}>메뉴 찾기</T>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

/** 재료가 없을 때 무대에 보여 줄 빈 자리(가짜 재료 아님 — '여기 재료가 올라와요' 표시) */
const PLACEHOLDERS: StageItem[] = [0, 1, 2].map((i) => ({ key: `ph${i}`, emoji: '', name: '', kind: 'need' }));

/** 반원을 따라 놓이는 재료 동그라미. 메뉴가 바뀔 때마다 하나씩 톡톡 나타난다. */
function Bubble({ item, index, total, width, empty }: { item: StageItem; index: number; total: number; width: number; empty: boolean }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 360, delay: 120 + index * 110, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }).start();
  }, [a, index]);

  // 왼쪽(155°) → 위 → 오른쪽(25°)으로 고르게(가장자리에 붙지 않게)
  const start = 155;
  const end = 25;
  const deg = total === 1 ? 90 : start - ((start - end) * index) / (total - 1);
  const rad = (deg * Math.PI) / 180;
  const R = Math.min(width * 0.4, 190);
  const cx = width / 2;
  const cy = 18 + width * 0.43; // 반원 중심(배경 반원과 같은 중심)
  const size = 58;
  const left = cx + R * Math.cos(rad) - size / 2;
  const top = cy - R * Math.sin(rad) - size / 2 + 6;

  const need = item.kind === 'need';
  const first = item.kind === 'first';
  return (
    <Animated.View style={{ position: 'absolute', left, top, width: size, alignItems: 'center', opacity: a, transform: [{ scale: a }] }}>
      <View style={[styles.bubble, need && styles.bubbleNeed, first && styles.bubbleFirst]}>
        {empty ? <Icon name="plus" size={18} c={color.textMuted} /> : need ? <T v="tiny" c={color.textSub} style={{ fontWeight: '800' }}>필요</T> : <Text style={{ fontSize: 26 }}>{item.emoji}</Text>}
      </View>
      {!empty && (
        <View style={[styles.label, first && { backgroundColor: color.warnSoft }]}>
          <T v="tiny" c={first ? color.warnDark : need ? color.textSub : color.text} style={{ fontWeight: '800' }} numberOfLines={1}>
            {item.name}{first ? ' · 먼저' : ''}
          </T>
        </View>
      )}
    </Animated.View>
  );
}

/** 재료 소비기한을 글로 */
export function dueText(i: Ingredient): string {
  if (!i.expiryDate) return '';
  const n = daysUntil(i.expiryDate);
  return n < 0 ? '기한 확인' : n === 0 ? '오늘까지' : n === 1 ? '내일까지' : `${n}일 남음`;
}

const STAGE_BG = '#F8DDBB';

const styles = StyleSheet.create({
  wrap: { backgroundColor: STAGE_BG, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingBottom: space.lg, marginHorizontal: -space.lg, marginTop: -space.md },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg },
  fridgeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 999, paddingLeft: 12, paddingRight: 8, minHeight: 40 },
  firstPill: { backgroundColor: color.warnSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  headline: { ...tx({ fontSize: 26, lineHeight: 34, fontWeight: '800', letterSpacing: -1, color: color.text, textAlign: 'center' }) },
  stage: { height: 250, marginTop: space.sm, overflow: 'hidden' },
  arc: { position: 'absolute', top: 18, backgroundColor: 'rgba(255,255,255,0.38)' },
  charSpot: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  bubble: { width: 58, height: 58, borderRadius: 29, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', ...shadow.soft },
  bubbleNeed: { backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(95,90,82,0.35)' },
  bubbleFirst: { borderWidth: 3, borderColor: color.warn },
  label: { marginTop: 4, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, maxWidth: 96 },
  equation: { alignItems: 'center', gap: 4, paddingHorizontal: space.lg, marginTop: space.sm },
  actions: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, marginTop: space.md },
  primary: { flex: 1, minHeight: 52, borderRadius: 999, backgroundColor: color.brandDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16 },
  secondary: { minHeight: 52, borderRadius: 999, backgroundColor: color.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 18 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
});
